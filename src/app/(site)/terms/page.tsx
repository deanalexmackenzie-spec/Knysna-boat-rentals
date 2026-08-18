import type { Metadata } from 'next';
import { CtaBand } from '@/components/site/CtaBand';
import { IndemnityModal } from '@/components/site/IndemnityModal';
import { Prose } from '@/components/Prose';
import { getContentMany } from '@/lib/content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rental Terms',
  description: 'Rental terms and conditions for boat hire on the Knysna estuary.',
};

export default async function TermsPage() {
  const content = await getContentMany(['terms', 'indemnity']);

  return (
    <>
      <section className="border-b border-rule bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="eyebrow">The small print</p>
          <h1 className="rule-gold mt-4 text-4xl sm:text-5xl">{content.terms.title}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
        <Prose body={content.terms.body} />

        <div className="mt-14 border-t border-rule pt-9">
          {/* Discreet indemnity link on the terms page, as specified. */}
          <p className="eyebrow">Also required</p>
          <p className="mt-4 text-[0.95rem] leading-7 text-navy-soft">
            Every person going aboard signs the indemnity, waiver and release before departure. You
            can read it in full here, and you sign it electronically from your booking page.
          </p>
          <div className="mt-7">
            <IndemnityModal
              title={content.indemnity.title}
              body={content.indemnity.body}
              variant="button"
              label="Read the indemnity"
            />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
