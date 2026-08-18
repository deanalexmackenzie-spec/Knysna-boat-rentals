import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ContentEditor } from '@/components/dash/ContentEditor';
import type { SiteContent } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SECTIONS: { key: string; description: string }[] = [
  {
    key: 'terms',
    description: 'Rental terms and conditions, shown on /terms. Have these reviewed by an attorney before going live.',
  },
  {
    key: 'indemnity',
    description:
      'Indemnity, waiver and release. Shown in the modal from the footer, the terms page and the booking box, and signed electronically on each booking page.',
  },
  {
    key: 'banking',
    description: 'EFT banking details. Included verbatim in the emails and on the booking page when the customer chooses EFT.',
  },
  { key: 'knysna', description: 'The “Knysna & the lagoon” copy on the home page and /knysna.' },
  { key: 'safety', description: 'Safety notes on the lagoon map page.' },
  { key: 'emergency', description: 'Emergency numbers in the dark panel on the safety page. Verify these regularly.' },
  { key: 'privacy', description: 'POPIA privacy notice, shown on /privacy.' },
];

export default async function ContentPage() {
  await requireOwner();
  const supabase = createAdminClient();

  const { data } = await supabase.from('site_content').select('*');
  const content = new Map(((data ?? []) as SiteContent[]).map((row) => [row.key, row] as const));

  return (
    <>
      <p className="eyebrow">Site copy</p>
      <h1 className="rule-gold mt-3 text-3xl">Terms, indemnity &amp; page copy</h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-navy-soft">
        Everything here is rendered straight onto the public site. Changes take effect immediately.
      </p>

      <div className="mt-9 space-y-6">
        {SECTIONS.map((section) => (
          <ContentEditor
            key={section.key}
            contentKey={section.key}
            title={content.get(section.key)?.title ?? ''}
            body={content.get(section.key)?.body ?? ''}
            description={section.description}
          />
        ))}
      </div>
    </>
  );
}
