import Link from 'next/link';
import type { Metadata } from 'next';
import { CtaBand } from '@/components/site/CtaBand';
import { BoatImage } from '@/components/site/BoatImage';
import { listBoats } from '@/lib/boats';
import { formatZar } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Fleet',
  description:
    'Six boats for full-day hire on the Knysna lagoon — capacities, power, length and day rates.',
};

export default async function FleetPage() {
  const boats = await listBoats();

  return (
    <>
      <section className="border-b border-rule bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="eyebrow">The fleet</p>
          <h1 className="rule-gold mt-4 text-4xl sm:text-5xl">Choose your boat</h1>
          <p className="mt-7 max-w-2xl text-[0.95rem] leading-7 text-navy-soft">
            All hire is by the full day. Add a skipper per day if you would rather not drive, or if
            you would like to go outside the Heads — self-drive hires stay inside the estuary.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        {boats.length === 0 ? (
          <p className="border border-dashed border-rule bg-white px-6 py-12 text-center text-sm text-navy-mute">
            The fleet is not published yet. Run <code>supabase/seed.sql</code> to load the boats.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {boats.map((boat) => (
              <Link
                key={boat.id}
                href={`/fleet/${boat.slug}`}
                className="group card flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lift"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <BoatImage paths={boat.photo_paths} name={boat.name} zoom className="h-full w-full" />
                </div>
                <div className="flex flex-1 flex-col px-6 py-6">
                  <h2 className="text-xl">{boat.name}</h2>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-navy-mute">
                    {boat.capacity} guests · {Number(boat.length_m).toFixed(1)} m
                  </p>
                  <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-navy-soft">
                    {boat.description}
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-rule pt-5">
                    <div>
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-navy-mute">
                        Full day
                      </p>
                      <p className="mt-1 font-display text-lg text-navy">
                        {formatZar(boat.day_rate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-navy-mute">
                        Skipper / day
                      </p>
                      <p className="mt-1 font-display text-lg text-navy">
                        {formatZar(boat.skipper_rate)}
                      </p>
                    </div>
                  </div>
                  <span className="mt-5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-gold">
                    Availability &amp; booking →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <CtaBand />
    </>
  );
}
