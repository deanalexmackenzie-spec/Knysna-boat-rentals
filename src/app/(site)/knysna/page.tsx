import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaBand } from '@/components/site/CtaBand';
import { Prose } from '@/components/Prose';
import { getContent } from '@/lib/content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Knysna & the Lagoon',
  description:
    'The Knysna estuary — Featherbed, Leisure Isle, Thesen Islands, Belvidere and the Heads.',
};

export default async function KnysnaPage() {
  const knysna = await getContent('knysna');

  return (
    <>
      <section className="bg-navy-deep">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <p className="eyebrow eyebrow-light">The destination</p>
          <h1 className="mt-5 max-w-2xl font-display text-4xl leading-tight text-white sm:text-5xl">
            {knysna.title}
          </h1>
          <div className="mt-7 h-px w-14 bg-gradient-to-r from-champagne to-transparent" />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
        <Prose body={knysna.body} />

        <div className="mt-14 border-t border-rule pt-10">
          <p className="eyebrow">Before you go</p>
          <p className="mt-4 text-[0.95rem] leading-7 text-navy-soft">
            The estuary rewards a bit of planning — tides, wind and the Heads all matter. Read the
            safety notes and study the map before your day on the water.
          </p>
          <Link href="/safety" className="btn-outline mt-8">
            Lagoon map &amp; safety
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
