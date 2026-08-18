import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { TemplateEditor } from '@/components/dash/TemplateEditor';
import type { MessageTemplate, TemplateKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ORDER: TemplateKey[] = ['received', 'deposit', 'docs', 'confirmed'];

const DEFAULTS: Record<TemplateKey, { subject: string; body: string }> = {
  received: { subject: 'We have your booking request — {reference}', body: '' },
  deposit: { subject: 'Reminder: deposit outstanding for {reference}', body: '' },
  docs: { subject: 'Documents needed before your trip on {date}', body: '' },
  confirmed: { subject: 'Your booking is confirmed — {reference}', body: '' },
};

export default async function TemplatesPage() {
  await requireOwner();
  const supabase = createAdminClient();

  const { data } = await supabase.from('message_templates').select('*');
  const templates = new Map(
    ((data ?? []) as MessageTemplate[]).map((row) => [row.key, row] as const),
  );

  return (
    <>
      <p className="eyebrow">Auto-replies</p>
      <h1 className="rule-gold mt-3 text-3xl">Message templates</h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-navy-soft">
        These four messages are sent automatically. Placeholders in curly braces are filled in per
        booking. The deposit reminder goes out 48 hours after a request if the deposit has not
        arrived; the documents reminder goes out 3 days before the trip if anything is missing.
      </p>

      <div className="mt-9 space-y-6">
        {ORDER.map((key) => {
          const template = templates.get(key);
          return (
            <TemplateEditor
              key={key}
              templateKey={key}
              subject={template?.subject ?? DEFAULTS[key].subject}
              body={template?.body ?? DEFAULTS[key].body}
            />
          );
        })}
      </div>
    </>
  );
}
