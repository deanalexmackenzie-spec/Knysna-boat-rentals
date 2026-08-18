import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ActionButton, Pill } from '@/components/dash/ui';
import { setBoatActive } from '@/app/dashboard/actions';
import { BoatImage } from '@/components/site/BoatImage';
import { formatZar } from '@/lib/pricing';
import type { Boat } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FleetManagerPage() {
  await requireOwner();
  const supabase = createAdminClient();

  const { data } = await supabase.from('boats').select('*').order('sort_order');
  const boats = (data ?? []) as Boat[];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Fleet</p>
          <h1 className="rule-gold mt-3 text-3xl">Boats &amp; prices</h1>
        </div>
        <Link href="/dashboard/fleet/new" className="btn-gold">
          Add a boat
        </Link>
      </div>

      {boats.length === 0 ? (
        <p className="card mt-9 px-6 py-14 text-center text-sm text-navy-mute">
          No boats yet. Add one, or run <code>supabase/seed.sql</code> for the starting six.
        </p>
      ) : (
        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {boats.map((boat) => (
            <article key={boat.id} className="card overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <BoatImage paths={boat.photo_paths} name={boat.name} className="h-full w-full" />
              </div>
              <div className="px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg text-navy">{boat.name}</h2>
                  <Pill ok={boat.active}>{boat.active ? 'Live' : 'Hidden'}</Pill>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.1em] text-navy-mute">
                  {boat.capacity} guests · {Number(boat.length_m).toFixed(1)} m ·{' '}
                  {(boat.photo_paths ?? []).length} photo
                  {(boat.photo_paths ?? []).length === 1 ? '' : 's'}
                </p>
                <p className="mt-4 text-sm text-navy">
                  {formatZar(boat.day_rate)} / day · skipper {formatZar(boat.skipper_rate)}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
                  <Link href={`/dashboard/fleet/${boat.id}`} className="btn-ghost">
                    Edit
                  </Link>
                  <ActionButton
                    label={boat.active ? 'Hide' : 'Publish'}
                    action={async () => {
                      'use server';
                      return setBoatActive(boat.id, !boat.active);
                    }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
