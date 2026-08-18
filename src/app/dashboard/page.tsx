import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { StatusBadge, Pill } from '@/components/dash/ui';
import { formatShortDate, todayIso } from '@/lib/dates';
import { formatZar } from '@/lib/pricing';
import type { BookingStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  reference: string;
  date: string;
  skipper: boolean;
  status: BookingStatus;
  deposit_amount: number;
  balance_amount: number;
  total_amount: number;
  deposit_status: string;
  balance_status: string;
  deposit_method: string;
  indemnity_signed: boolean;
  created_at: string;
  boats: { name: string } | null;
  customers: { name: string; phone: string; email: string | null } | null;
}

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'action', label: 'Needs action' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
] as const;

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireOwner();
  const { filter = 'upcoming' } = await searchParams;

  const supabase = createAdminClient();
  const today = todayIso();

  const { data } = await supabase
    .from('bookings')
    .select(
      'id, reference, date, skipper, status, deposit_amount, balance_amount, total_amount, deposit_status, balance_status, deposit_method, indemnity_signed, created_at, boats(name), customers(name, phone, email)',
    )
    .order('date', { ascending: true })
    .returns<Row[]>();

  const all = data ?? [];

  const rows = all.filter((row) => {
    switch (filter) {
      case 'action':
        return (
          row.status !== 'cancelled' &&
          row.date >= today &&
          (row.deposit_status !== 'paid' || !row.indemnity_signed)
        );
      case 'past':
        return row.date < today && row.status !== 'cancelled';
      case 'cancelled':
        return row.status === 'cancelled';
      case 'all':
        return true;
      default:
        return row.date >= today && row.status !== 'cancelled';
    }
  });

  const live = all.filter((row) => row.status !== 'cancelled');
  const upcoming = live.filter((row) => row.date >= today);
  const depositsOutstanding = upcoming.filter((row) => row.deposit_status !== 'paid');
  const takenThisYear = live
    .filter((row) => row.date.slice(0, 4) === today.slice(0, 4))
    .reduce(
      (sum, row) =>
        sum +
        (row.deposit_status === 'paid' ? Number(row.deposit_amount) : 0) +
        (row.balance_status === 'paid' ? Number(row.balance_amount) : 0),
      0,
    );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Bookings &amp; payments</p>
          <h1 className="rule-gold mt-3 text-3xl">The diary</h1>
        </div>
      </div>

      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Upcoming trips" value={String(upcoming.length)} />
        <Tile label="Deposits outstanding" value={String(depositsOutstanding.length)} />
        <Tile
          label="Docs outstanding"
          value={String(upcoming.filter((row) => !row.indemnity_signed).length)}
        />
        <Tile label={`Received in ${today.slice(0, 4)}`} value={formatZar(takenThisYear)} />
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option.key}
            href={`/dashboard?filter=${option.key}`}
            className={`border px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition-colors ${
              filter === option.key
                ? 'border-gold bg-gold-tint text-gold-deep'
                : 'border-rule bg-white text-navy-soft hover:border-gold/60'
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <div className="card mt-6 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-navy-mute">
            Nothing here yet.
          </p>
        ) : (
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left">
                {['Date', 'Boat', 'Customer', 'Status', 'Deposit', 'Balance', 'Docs', ''].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-navy-mute"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-rule last:border-b-0 hover:bg-page">
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="text-navy">{formatShortDate(row.date)}</span>
                    <span className="mt-0.5 block text-[0.65rem] uppercase tracking-[0.1em] text-navy-mute">
                      {row.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-navy">{row.boats?.name ?? '—'}</span>
                    <span className="mt-0.5 block text-[0.65rem] uppercase tracking-[0.1em] text-navy-mute">
                      {row.skipper ? 'Skippered' : 'Self-drive'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-navy">{row.customers?.name ?? '—'}</span>
                    <span className="mt-0.5 block text-[0.7rem] text-navy-mute">
                      {row.customers?.phone ?? ''}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill ok={row.deposit_status === 'paid'}>
                      {formatZar(row.deposit_amount)}
                    </Pill>
                    <span className="mt-1 block text-[0.62rem] uppercase tracking-[0.08em] text-navy-mute">
                      {row.deposit_method === 'card' ? 'Card' : 'EFT'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill ok={row.balance_status === 'paid'}>
                      {formatZar(row.balance_amount)}
                    </Pill>
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill ok={row.indemnity_signed}>
                      {row.indemnity_signed ? 'Signed' : 'Unsigned'}
                    </Pill>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/dashboard/bookings/${row.id}`}
                      className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-gold hover:text-gold-deep"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-5 py-5">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-navy-mute">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl text-navy">{value}</p>
    </div>
  );
}
