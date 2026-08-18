import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { DocumentUpload } from '@/components/site/DocumentUpload';
import { IndemnityModal } from '@/components/site/IndemnityModal';
import { Preformatted } from '@/components/Prose';
import { getBookingDocuments, getBookingForCustomer } from '@/lib/bookingAccess';
import { evaluateDocs } from '@/lib/bookings';
import { getContentMany } from '@/lib/content';
import { formatLongDate } from '@/lib/dates';
import { amountForGateway, formatZar } from '@/lib/pricing';
import { buildCheckoutFields, payfastConfigured, payfastProcessUrl } from '@/lib/payfast';
import { siteUrl } from '@/lib/notifications';
import { BOOKING_STATUS_LABEL, DOCUMENT_LABEL } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your booking',
  robots: { index: false, follow: false },
};

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ t?: string; paid?: string; cancelled?: string }>;
}) {
  const { reference } = await params;
  const query = await searchParams;

  const booking = await getBookingForCustomer(reference, query.t);
  if (!booking) notFound();

  const [documents, content] = await Promise.all([
    getBookingDocuments(booking.id),
    getContentMany(['indemnity', 'banking']),
  ]);

  const docs = evaluateDocs(booking, documents);
  const depositPaid = booking.deposit_status === 'paid';
  const token = query.t!;

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      <p className="eyebrow">Booking {booking.reference}</p>
      <h1 className="rule-gold mt-4 text-3xl sm:text-4xl">
        {depositPaid ? 'Your date is secured' : 'Thank you — we have your request'}
      </h1>

      {query.paid && !depositPaid && (
        <p className="mt-8 border border-[#e6d6b4] bg-gold-tint px-5 py-4 text-sm text-navy">
          Thank you. PayFast is confirming the payment with us now — this page will show the
          deposit as received within a minute or two.
        </p>
      )}
      {query.cancelled && (
        <p className="mt-8 border border-rule bg-white px-5 py-4 text-sm text-navy-soft">
          The card payment was cancelled. The date is still held for you — you can try again below
          or pay by EFT.
        </p>
      )}

      {/* ─── Summary ──────────────────────────────────────────────────────── */}
      <section className="card mt-10 px-7 py-7">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Item label="Boat" value={booking.boats?.name ?? '—'} />
          <Item label="Date" value={formatLongDate(booking.date)} />
          <Item label="Hire" value={booking.skipper ? 'With a skipper' : 'Self-drive'} />
          <Item label="Status" value={BOOKING_STATUS_LABEL[booking.status]} />
          <Item label="Day total" value={formatZar(booking.total_amount)} />
          <Item
            label="Deposit"
            value={`${formatZar(booking.deposit_amount)} — ${depositPaid ? 'received' : 'outstanding'}`}
          />
          <Item
            label="Balance on collection"
            value={`${formatZar(booking.balance_amount)} — ${
              booking.balance_status === 'paid' ? 'received' : 'due'
            }`}
          />
          <Item label="Guest" value={booking.customers?.name ?? '—'} />
        </dl>
      </section>

      {/* ─── Deposit ──────────────────────────────────────────────────────── */}
      <section className="mt-12">
        <p className="eyebrow">Step one</p>
        <h2 className="rule-gold mt-3 text-2xl">Pay the deposit</h2>

        {depositPaid ? (
          <p className="mt-7 border border-[#e6d6b4] bg-gold-tint px-5 py-4 text-sm text-navy">
            Deposit of {formatZar(booking.deposit_amount)} received — thank you. The balance of{' '}
            {formatZar(booking.balance_amount)} is payable on collection.
          </p>
        ) : (
          <div className="mt-7 space-y-8">
            {booking.deposit_method === 'card' || payfastConfigured() ? (
              <div className="card px-7 py-7">
                <p className="text-sm font-semibold text-navy">Card — online</p>
                <p className="mt-2 text-sm leading-6 text-navy-soft">
                  You will be taken to PayFast to pay {formatZar(booking.deposit_amount)}. We never
                  see or store your card details.
                </p>
                {payfastConfigured() ? (
                  <PayfastForm
                    reference={booking.reference}
                    token={token}
                    amount={amountForGateway(booking.deposit_amount)}
                    boatName={booking.boats?.name ?? 'Boat hire'}
                    date={booking.date}
                    customerName={booking.customers?.name ?? ''}
                    email={booking.customers?.email}
                  />
                ) : (
                  <p className="mt-5 border border-rule bg-page px-4 py-3 text-xs text-navy-mute">
                    Card payments are not configured on this deployment. Set the PayFast keys in the
                    environment, or pay by EFT below.
                  </p>
                )}
              </div>
            ) : null}

            <div className="card px-7 py-7">
              <p className="text-sm font-semibold text-navy">EFT — bank transfer</p>
              <p className="mt-2 text-sm leading-6 text-navy-soft">
                Use <strong className="font-semibold">{booking.reference}</strong> as your payment
                reference. We mark the deposit as received once it reflects.
              </p>
              <div className="mt-5 border-t border-rule pt-5">
                <Preformatted body={content.banking.body} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── Indemnity ────────────────────────────────────────────────────── */}
      <section className="mt-12">
        <p className="eyebrow">Step two</p>
        <h2 className="rule-gold mt-3 text-2xl">Sign the indemnity</h2>
        <p className="mt-6 text-sm leading-7 text-navy-soft">
          Every person going aboard must sign the indemnity, waiver and release. Where a person is
          under 18, a parent or legal guardian signs on their behalf. Without a signature we cannot
          release the boat, and the deposit is not refundable in that case.
        </p>
        <div className="mt-7">
          <IndemnityModal
            title={content.indemnity.title}
            body={content.indemnity.body}
            variant="button"
            label={booking.indemnity_signed ? 'View the signed indemnity' : 'Read & sign the indemnity'}
            signing={{
              reference: booking.reference,
              token,
              customerName: booking.customers?.name ?? '',
              signed: booking.indemnity_signed,
              signedName: booking.indemnity_name,
            }}
          />
        </div>
        {booking.indemnity_signed && (
          <p className="mt-4 text-sm text-gold">
            ✓ Signed by {booking.indemnity_name}
            {booking.indemnity_signed_at
              ? ` on ${formatLongDate(booking.indemnity_signed_at.slice(0, 10))}`
              : ''}
          </p>
        )}
      </section>

      {/* ─── Documents ────────────────────────────────────────────────────── */}
      <section className="mt-12">
        <p className="eyebrow">Step three</p>
        <h2 className="rule-gold mt-3 text-2xl">Upload your documents</h2>
        <p className="mt-6 text-sm leading-7 text-navy-soft">
          Only the operator can see these. They are stored in encrypted, private storage and
          deleted 30 days after your trip — see our{' '}
          <Link href="/privacy" className="text-gold underline underline-offset-4">
            privacy notice
          </Link>
          .
        </p>

        <div className="mt-7 space-y-4">
          <DocumentUpload
            reference={booking.reference}
            token={token}
            type="id"
            label={DOCUMENT_LABEL.id}
            hint="A clear photo or scan of the photo page."
            uploaded={findDoc(documents, 'id')}
          />
          {!booking.skipper && (
            <DocumentUpload
              reference={booking.reference}
              token={token}
              type="skipper_licence"
              label={DOCUMENT_LABEL.skipper_licence}
              hint="Required for every self-drive hire. Bring the original on the day."
              uploaded={findDoc(documents, 'skipper_licence')}
            />
          )}
          <DocumentUpload
            reference={booking.reference}
            token={token}
            type="drivers_licence"
            label={`${DOCUMENT_LABEL.drivers_licence} (optional)`}
            hint="Useful as a second form of identification."
            uploaded={findDoc(documents, 'drivers_licence')}
          />
        </div>

        {docs.complete ? (
          <p className="mt-7 border border-[#e6d6b4] bg-gold-tint px-5 py-4 text-sm text-navy">
            Everything we need is in. We will see you on {formatLongDate(booking.date)}.
          </p>
        ) : (
          <p className="mt-7 text-sm text-navy-soft">
            Still outstanding: {docs.missing.map((type) => DOCUMENT_LABEL[type]).join(', ')}.
          </p>
        )}
      </section>

      <p className="mt-14 border-t border-rule pt-8 text-xs leading-6 text-navy-mute">
        Keep this page — it is your private link to the booking. Questions? Reply to the email we
        sent you, or call us on the number in the footer.
      </p>
    </div>
  );
}

function PayfastForm({
  reference,
  token,
  amount,
  boatName,
  date,
  customerName,
  email,
}: {
  reference: string;
  token: string;
  amount: string;
  boatName: string;
  date: string;
  customerName: string;
  email?: string | null;
}) {
  const base = siteUrl();
  const bookingUrl = `${base}/booking/${reference}?t=${token}`;
  const [firstName, ...rest] = customerName.split(' ');

  const fields = buildCheckoutFields({
    reference,
    amount,
    itemName: `${boatName} — ${date}`,
    itemDescription: `Deposit for booking ${reference}`,
    firstName: firstName || 'Guest',
    lastName: rest.join(' ') || '—',
    email,
    returnUrl: `${bookingUrl}&paid=1`,
    cancelUrl: `${bookingUrl}&cancelled=1`,
    notifyUrl: `${base}/api/payfast/notify`,
  });

  return (
    <form action={payfastProcessUrl()} method="post" className="mt-6">
      {fields.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className="btn-gold w-full sm:w-auto">
        Pay deposit by card
      </button>
    </form>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-navy-mute">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-navy">{value}</dd>
    </div>
  );
}

function findDoc(
  documents: { type: string; file_name: string | null; uploaded_at: string }[],
  type: string,
) {
  const match = documents.find((doc) => doc.type === type);
  return match ? { file_name: match.file_name, uploaded_at: match.uploaded_at } : null;
}
