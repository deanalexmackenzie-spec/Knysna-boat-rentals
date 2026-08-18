import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { OpeningsCalendar } from '@/components/dash/OpeningsCalendar';
import { SectionCard } from '@/components/dash/ui';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ boat?: string }>;
}) {
  await requireOwner();
  const { boat: boatParam } = await searchParams;

  const supabase = createAdminClient();
  const { data: boats } = await supabase
    .from('boats')
    .select('id, name, slug, active')
    .order('sort_order');

  const fleet = (boats ?? []) as { id: string; name: string; slug: string; active: boolean }[];

  if (fleet.length === 0) {
    return (
      <>
        <p className="eyebrow">Openings</p>
        <h1 className="rule-gold mt-3 text-3xl">Availability calendar</h1>
        <p className="mt-8 card px-6 py-12 text-center text-sm text-navy-mute">
          Add a boat first — the calendar works per boat.
        </p>
      </>
    );
  }

  const selected = fleet.find((b) => b.id === boatParam) ?? fleet[0];

  const [{ data: blocked }, { data: bookings }] = await Promise.all([
    supabase.from('blocked_dates').select('date').eq('boat_id', selected.id),
    supabase
      .from('bookings')
      .select('date, reference, customers(name)')
      .eq('boat_id', selected.id)
      .neq('status', 'cancelled')
      .returns<{ date: string; reference: string; customers: { name: string } | null }[]>(),
  ]);

  const bookedMap: Record<string, { reference: string; customer: string }> = {};
  for (const row of bookings ?? []) {
    bookedMap[row.date] = {
      reference: row.reference,
      customer: row.customers?.name ?? '—',
    };
  }

  return (
    <>
      <p className="eyebrow">Openings</p>
      <h1 className="rule-gold mt-3 text-3xl">Availability calendar</h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-navy-soft">
        Click a date to open or close it for hire. Closed dates disappear from the customer
        calendar entirely. Dates with a live booking are locked — cancel the booking to free them.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {fleet.map((option) => (
          <Link
            key={option.id}
            href={`/dashboard/calendar?boat=${option.id}`}
            className={`border px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] transition-colors ${
              option.id === selected.id
                ? 'border-gold bg-gold-tint text-gold-deep'
                : 'border-rule bg-white text-navy-soft hover:border-gold/60'
            }`}
          >
            {option.name}
            {!option.active && ' (hidden)'}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <SectionCard eyebrow="Per boat" title={selected.name}>
          <OpeningsCalendar
            boatId={selected.id}
            blocked={((blocked ?? []) as { date: string }[]).map((row) => row.date)}
            booked={bookedMap}
          />
        </SectionCard>
      </div>
    </>
  );
}
