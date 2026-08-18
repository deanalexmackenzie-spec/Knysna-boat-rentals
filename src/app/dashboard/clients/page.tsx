import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { StatusBadge } from '@/components/dash/ui';
import { CustomerNotes } from '@/components/dash/CustomerNotes';
import { formatShortDate } from '@/lib/dates';
import { formatZar } from '@/lib/pricing';
import type { BookingStatus, CustomerSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface BookingRow {
  id: string;
  reference: string;
  date: string;
  status: BookingStatus;
  customer_id: string;
  boats: { name: string } | null;
}

export default async function ClientsPage() {
  await requireOwner();
  const supabase = createAdminClient();

  const [{ data: customers }, { data: bookings }] = await Promise.all([
    supabase.from('customer_summary').select('*').order('created_at', { ascending: false }),
    supabase
      .from('bookings')
      .select('id, reference, date, status, customer_id, boats(name)')
      .order('date', { ascending: false })
      .returns<BookingRow[]>(),
  ]);

  const clients = (customers ?? []) as CustomerSummary[];
  const byCustomer = new Map<string, BookingRow[]>();
  for (const row of bookings ?? []) {
    const list = byCustomer.get(row.customer_id) ?? [];
    list.push(row);
    byCustomer.set(row.customer_id, list);
  }

  return (
    <>
      <p className="eyebrow">CRM</p>
      <h1 className="rule-gold mt-3 text-3xl">Client log</h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-navy-soft">
        One record per client, keyed on their mobile number and built automatically from booking
        requests. Personal information here is subject to POPIA — see the privacy notice for the
        retention policy.
      </p>

      {clients.length === 0 ? (
        <p className="card mt-9 px-6 py-14 text-center text-sm text-navy-mute">
          No clients yet. They appear the moment a booking request comes in.
        </p>
      ) : (
        <div className="mt-9 space-y-5">
          {clients.map((client) => {
            const history = byCustomer.get(client.id) ?? [];
            return (
              <article key={client.id} className="card px-6 py-6">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <h2 className="font-display text-xl text-navy">{client.name}</h2>
                    <p className="mt-1.5 text-sm text-navy-soft">
                      {client.phone}
                      {client.email ? ` · ${client.email}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-navy-mute">
                      Client since {formatShortDate(client.created_at.slice(0, 10))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-navy-mute">
                      Paid to date
                    </p>
                    <p className="mt-1 font-display text-2xl text-navy">
                      {formatZar(client.total_paid)}
                    </p>
                    <p className="mt-1 text-xs text-navy-mute">
                      {client.booking_count} booking{client.booking_count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {history.length > 0 && (
                  <ul className="mt-6 space-y-2 border-t border-rule pt-5">
                    {history.map((booking) => (
                      <li
                        key={booking.id}
                        className="flex flex-wrap items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-navy-soft">
                          {formatShortDate(booking.date)} · {booking.boats?.name ?? '—'} ·{' '}
                          <span className="text-navy-mute">{booking.reference}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <StatusBadge status={booking.status} />
                          <Link
                            href={`/dashboard/bookings/${booking.id}`}
                            className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-gold hover:text-gold-deep"
                          >
                            Open →
                          </Link>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-6 border-t border-rule pt-5">
                  <CustomerNotes customerId={client.id} notes={client.notes} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
