import Link from 'next/link';
import { CtaBand } from '@/components/site/CtaBand';
import { BoatImage } from '@/components/site/BoatImage';
import { listBoats } from '@/lib/boats';
import { getContent } from '@/lib/content';
import { formatZar } from '@/lib/pricing';
import { Prose } from '@/components/Prose';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [boats, knysna] = await Promise.all([listBoats(), getContent('knysna')]);

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-navy-deep">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(120% 90% at 72% 8%, rgba(236,215,166,0.14) 0%, transparent 58%), linear-gradient(160deg,#1a3050 0%,#14273f 50%,#0e1c30 100%)',
          }}
        />
        <div className="mx-auto max-w-6xl px-5 py-28 sm:py-36 lg:py-44">
          <p className="eyebrow eyebrow-light">Knysna · Western Cape</p>
          <h1 className="mt-6 max-w-3xl font-display text-4xl leading-[1.12] text-white sm:text-5xl lg:text-6xl">
            A boat, a full day, and the whole of the lagoon
          </h1>
          <p className="mt-8 max-w-xl text-[1.0625rem] leading-8 text-white/70">
            Six well-kept boats on the Knysna estuary, hired by the day. Take the helm yourself if
            you are licensed, or let one of our skippers show you the water they grew up on.
          </p>
          <div className="mt-11 flex flex-col gap-4 sm:flex-row">
            <Link href="/fleet" className="btn-gold">
              See the fleet
            </Link>
            <Link
              href="/knysna"
              className="btn-outline !border-white/35 !text-white hover:!bg-white hover:!text-navy"
            >
              About the lagoon
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Info strip ───────────────────────────────────────────────────── */}
      <section className="bg-navy">
        <div className="mx-auto grid max-w-6xl gap-px bg-white/10 px-0 sm:grid-cols-3">
          {[
            { k: 'Full day', v: 'Day rate only — the boat is yours from morning to sundown.' },
            { k: '50% deposit', v: 'Card online or EFT. The balance is settled on collection.' },
            { k: 'Skipper optional', v: 'Add a skipper per day, or self-drive with a SAMSA licence.' },
          ].map((item) => (
            <div key={item.k} className="bg-navy px-7 py-10">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-champagne">
                {item.k}
              </p>
              <p className="mt-3.5 text-sm leading-7 text-white/65">{item.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Fleet ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">The fleet</p>
          <h2 className="rule-gold mt-4 text-3xl sm:text-4xl">Six boats, one lagoon</h2>
          <p className="mt-7 text-[0.95rem] leading-7 text-navy-soft">
            Everything from a light four-seater for a lazy afternoon on the sandbanks to a deep-V
            hull capable of a settled-day run through the Heads with a skipper aboard.
          </p>
        </div>

        {boats.length === 0 ? (
          <p className="mt-12 border border-dashed border-rule bg-white px-6 py-10 text-center text-sm text-navy-mute">
            The fleet is not published yet. Run <code>supabase/seed.sql</code> to load the boats.
          </p>
        ) : (
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {boats.map((boat) => (
              <Link
                key={boat.id}
                href={`/fleet/${boat.slug}`}
                className="group card block overflow-hidden transition-shadow duration-300 hover:shadow-lift"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <BoatImage paths={boat.photo_paths} name={boat.name} zoom className="h-full w-full" />
                </div>
                <div className="px-6 py-6">
                  <h3 className="text-xl">{boat.name}</h3>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-navy-mute">
                    {boat.capacity} guests · {Number(boat.length_m).toFixed(1)} m · {boat.power}
                  </p>
                  <div className="mt-5 flex items-end justify-between border-t border-rule pt-5">
                    <div>
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-navy-mute">
                        Full day
                      </p>
                      <p className="mt-1 font-display text-xl text-navy">
                        {formatZar(boat.day_rate)}
                      </p>
                    </div>
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-gold transition-colors group-hover:text-gold-deep">
                      View &amp; book →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ─── Destination ──────────────────────────────────────────────────── */}
      <section className="bg-navy-deep">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 py-20 sm:py-28 lg:grid-cols-[0.85fr_1fr]">
          <div>
            <p className="eyebrow eyebrow-light">The destination</p>
            <h2 className="mt-4 font-display text-3xl leading-tight text-white sm:text-4xl">
              {knysna.title}
            </h2>
            <div className="mt-6 h-px w-12 bg-gradient-to-r from-champagne to-transparent" />
            <Link href="/safety" className="btn-outline mt-10 !border-champagne/50 !text-champagne hover:!bg-champagne hover:!text-navy-deep">
              Lagoon map &amp; safety
            </Link>
          </div>
          <div className="[&_p]:text-white/65 [&_h2]:text-white [&_h3]:text-white [&_strong]:text-champagne [&_li]:text-white/65">
            <Prose body={knysna.body} />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
