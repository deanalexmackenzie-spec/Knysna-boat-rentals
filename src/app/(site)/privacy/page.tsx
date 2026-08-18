import type { Metadata } from 'next';
import { Prose } from '@/components/Prose';
import { getContent } from '@/lib/content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Privacy Notice',
  description: 'How Knysna Boat Rentals collects, stores and deletes personal information (POPIA).',
};

export default async function PrivacyPage() {
  const privacy = await getContent('privacy');

  return (
    <>
      <section className="border-b border-rule bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="eyebrow">POPIA</p>
          <h1 className="rule-gold mt-4 text-4xl sm:text-5xl">{privacy.title}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
        <Prose body={privacy.body} />
      </section>
    </>
  );
}
