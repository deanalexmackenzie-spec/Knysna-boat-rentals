import type { Metadata } from 'next';
import { CtaBand } from '@/components/site/CtaBand';
import { LagoonMap } from '@/components/site/LagoonMap';
import { Preformatted, Prose } from '@/components/Prose';
import { getContentMany } from '@/lib/content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lagoon Map & Safety',
  description:
    'Simplified map of the Knysna estuary, safety notes for the lagoon and the Heads, and emergency numbers.',
};

export default async function SafetyPage() {
  const content = await getContentMany(['safety', 'emergency']);

  return (
    <>
      <section className="border-b border-rule bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="eyebrow">On the water</p>
          <h1 className="rule-gold mt-4 text-4xl sm:text-5xl">Lagoon map &amp; safety</h1>
          <p className="mt-7 max-w-2xl text-[0.95rem] leading-7 text-navy-soft">
            The estuary is shallow, tidal and — at the Heads — genuinely dangerous. Everything below
            is covered again at handover, but it is worth reading before you arrive.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 sm:py-16">
        <LagoonMap />
      </section>

      <section className="mx-auto grid max-w-5xl gap-14 px-5 pb-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div>
          <h2 className="rule-gold text-2xl">{content.safety.title}</h2>
          <div className="mt-8">
            <Prose body={content.safety.body} />
          </div>
        </div>

        {/* Emergency panel — dark, as specified */}
        <aside className="bg-navy-deep px-7 py-8">
          <p className="eyebrow eyebrow-light">In an emergency</p>
          <h2 className="mt-3 font-display text-2xl text-white">{content.emergency.title}</h2>
          <div className="mt-6 border-t border-white/15 pt-6 [&_pre]:text-white/75">
            <Preformatted body={content.emergency.body} />
          </div>
          <p className="mt-6 text-xs leading-5 text-champagne/70">
            Call us first if you are on one of our boats — we are usually the closest help.
          </p>
        </aside>
      </section>

      <CtaBand />
    </>
  );
}
