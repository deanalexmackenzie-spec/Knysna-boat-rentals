import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ActionButton, Pill, SectionCard, StatusBadge } from '@/components/dash/ui';
import { DocumentRow, NotesEditor, StatusSelect } from '@/components/dash/BookingControls';
import { deleteDocument, resendTemplate, setPaymentState } from '@/app/dashboard/actions';
import { evaluateDocs } from '@/lib/bookings';
import { bookingLink } from '@/lib/notifications';
import { formatDateTime, formatLongDate } from '@/lib/dates';
import { formatZar } from '@/lib/pricing';
import {
  DOCUMENT_LABEL,
  TEMPLATE_LABEL,
  type BookingDocument,
  type BookingStatus,
  type MessageLogEntry,
  type Payment,
  type TemplateKey,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Detail {
  id: string;
  reference: string;
  access_token: string;
  date: string;
  skipper: boolean;
  status: BookingStatus;
  day_rate: number;
  skipper_rate: number;
  total_amount: number;
  deposit_amount: number;
  balance_amount: number;
  deposit_method: string;
  deposit_status: string;
  balance_status: string;
  indemnity_signed: boolean;
  indemnity_name: string | null;
  indemnity_signed_at: string | null;
  indemnity_ip: string | null;
  notes: string | null;
  created_at: string;
  boats: { id: string; name: string } | null;
  customers: { id: string; name: string; phone: string; email: string | null } | null;
}

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOwner();
  const { id } = await params;

  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, boats(id, name), customers(id, name, phone, email)')
    .eq('id', id)
    .maybeSingle<Detail>();

  if (!booking) notFound();

  const [{ data: documents }, { data: payments }, { data: log }] = await Promise.all([
    supabase.from('documents').select('*').eq('booking_id', id).order('uploaded_at'),
    supabase.from('payments').select('*').eq('booking_id', id).order('created_at'),
    supabase
      .from('message_log')
      .select('*')
      .eq('booking_id', id)
      .order('sent_at', { ascending: false }),
  ]);

  const docs = evaluateDocs(booking, (documents ?? []) as BookingDocument[]);
  const depositPaid = booking.deposit_status === 'paid';
  const balancePaid = booking.balance_status === 'paid';

  return (
    <>
      <Link
        href="/dashboard"
        className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-navy-mute hover:text-gold"
      >
        ← All bookings
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">{booking.reference}</p>
          <h1 className="rule-gold mt-3 text-3xl">
            {booking.boats?.name ?? 'Boat'} — {formatLongDate(booking.date)}
          </h1>
          <p className="mt-5 text-sm text-navy-soft">
            Requested {formatDateTime(booking.created_at)} ·{' '}
            {booking.skipper ? 'With a skipper' : 'Self-drive'}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="mt-9 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-6">
          {/* ─── Money ──────────────────────────────────────────────────── */}
          <SectionCard eyebrow="Payments" title="Deposit &amp; balance">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Line label="Day rate" value={formatZar(booking.day_rate)} />
              <Line
                label="Skipper"
                value={booking.skipper ? formatZar(booking.skipper_rate) : '—'}
              />
              <Line label="Total" value={formatZar(booking.total_amount)} strong />
              <Line
                label={`Deposit (${booking.deposit_method === 'card' ? 'card' : 'EFT'})`}
                value={formatZar(booking.deposit_amount)}
                strong
              />
            </dl>

            <div className="mt-7 space-y-4 border-t border-rule pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-navy">
                  Deposit — <Pill ok={depositPaid}>{depositPaid ? 'Received' : 'Outstanding'}</Pill>
                </span>
                <ActionButton
                  label={depositPaid ? 'Mark outstanding' : 'Mark deposit received'}
                  action={async () => {
                    'use server';
                    return setPaymentState(booking.id, 'deposit', !depositPaid);
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-navy">
                  Balance {formatZar(booking.balance_amount)} —{' '}
                  <Pill ok={balancePaid}>{balancePaid ? 'Received' : 'Due on collection'}</Pill>
                </span>
                <ActionButton
                  label={balancePaid ? 'Mark outstanding' : 'Mark balance received'}
                  action={async () => {
                    'use server';
                    return setPaymentState(booking.id, 'balance', !balancePaid);
                  }}
                />
              </div>
            </div>

            {(payments ?? []).length > 0 && (
              <div className="mt-7 border-t border-rule pt-6">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-navy-mute">
                  Payment history
                </p>
                <ul className="mt-3 space-y-2 text-sm text-navy-soft">
                  {((payments ?? []) as Payment[]).map((payment) => (
                    <li key={payment.id} className="flex flex-wrap justify-between gap-3">
                      <span>
                        {formatZar(payment.amount)} · {payment.kind} · {payment.method}
                        {payment.gateway_ref ? ` · ${payment.gateway_ref}` : ''}
                      </span>
                      <span className="text-navy-mute">
                        {payment.status} · {formatDateTime(payment.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>

          {/* ─── Documents ──────────────────────────────────────────────── */}
          <SectionCard eyebrow="POPIA-protected" title="Documents &amp; indemnity">
            <div className="flex flex-wrap items-center gap-3">
              <Pill ok={booking.indemnity_signed}>
                {booking.indemnity_signed ? 'Indemnity signed' : 'Indemnity unsigned'}
              </Pill>
              {docs.complete ? (
                <Pill ok>Checklist complete</Pill>
              ) : (
                <span className="text-xs text-navy-mute">
                  Missing: {docs.missing.map((type) => DOCUMENT_LABEL[type]).join(', ')}
                </span>
              )}
            </div>

            {booking.indemnity_signed && (
              <p className="mt-4 text-sm text-navy-soft">
                Signed by <strong className="font-semibold text-navy">{booking.indemnity_name}</strong>
                {booking.indemnity_signed_at
                  ? ` on ${formatDateTime(booking.indemnity_signed_at)}`
                  : ''}
                {booking.indemnity_ip ? ` from ${booking.indemnity_ip}` : ''}.
              </p>
            )}

            <div className="mt-6">
              {(documents ?? []).length === 0 ? (
                <p className="text-sm text-navy-mute">Nothing uploaded yet.</p>
              ) : (
                ((documents ?? []) as BookingDocument[]).map((document) => (
                  <div key={document.id}>
                    <DocumentRow document={document} />
                    <div className="pb-3">
                      <ActionButton
                        label="Delete"
                        confirm="Delete this document permanently?"
                        action={async () => {
                          'use server';
                          return deleteDocument(document.id);
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="mt-6 border-t border-rule pt-5 text-xs leading-6 text-navy-mute">
              Documents live in a private bucket and are opened through signed links that expire
              after five minutes. They are purged automatically 30 days after the trip.
            </p>
          </SectionCard>

          <SectionCard eyebrow="Internal" title="Notes">
            <NotesEditor bookingId={booking.id} notes={booking.notes} />
          </SectionCard>
        </div>

        {/* ─── Sidebar ──────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <SectionCard eyebrow="Customer" title={booking.customers?.name ?? '—'}>
            <ul className="space-y-2 text-sm text-navy-soft">
              <li>{booking.customers?.phone}</li>
              <li>{booking.customers?.email ?? 'No email on file'}</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/dashboard/clients" className="btn-ghost">
                Client log
              </Link>
              <a
                className="btn-ghost"
                href={bookingLink(booking.reference, booking.access_token)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Customer link
              </a>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Workflow" title="Status">
            <StatusSelect bookingId={booking.id} status={booking.status} />
          </SectionCard>

          <SectionCard eyebrow="Follow-up" title="Resend a message">
            <div className="space-y-3">
              {(Object.keys(TEMPLATE_LABEL) as TemplateKey[]).map((key) => (
                <div key={key} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-navy-soft">{TEMPLATE_LABEL[key]}</span>
                  <ActionButton
                    label="Send"
                    pendingLabel="Sending…"
                    action={async () => {
                      'use server';
                      return resendTemplate(booking.id, key);
                    }}
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard eyebrow="History" title="Messages sent">
            {(log ?? []).length === 0 ? (
              <p className="text-sm text-navy-mute">Nothing sent yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {((log ?? []) as MessageLogEntry[]).map((entry) => (
                  <li key={entry.id} className="border-b border-rule pb-3 last:border-b-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-navy">
                        {entry.template_key ? TEMPLATE_LABEL[entry.template_key] : 'Owner notification'}
                      </span>
                      <span
                        className={`text-xs ${
                          entry.status === 'sent' ? 'text-[#2f6b45]' : 'text-navy-mute'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-navy-mute">
                      {entry.recipient} · {formatDateTime(entry.sent_at)}
                      {entry.error ? ` · ${entry.error}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-navy-mute">
        {label}
      </dt>
      <dd className={`mt-1.5 ${strong ? 'font-display text-lg text-navy' : 'text-sm text-navy'}`}>
        {value}
      </dd>
    </div>
  );
}
