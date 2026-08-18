'use client';

import { useState, useTransition } from 'react';
import { saveTemplate } from '@/app/dashboard/actions';
import { TEMPLATE_LABEL, type TemplateKey } from '@/lib/types';

const PLACEHOLDERS = [
  '{name}',
  '{boat}',
  '{date}',
  '{deposit}',
  '{balance}',
  '{total}',
  '{method}',
  '{reference}',
  '{link}',
  '{bank_details}',
];

export function TemplateEditor({
  templateKey,
  subject,
  body,
}: {
  templateKey: TemplateKey;
  subject: string;
  body: string;
}) {
  const [subjectValue, setSubject] = useState(subject);
  const [bodyValue, setBody] = useState(body);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <article className="card px-6 py-6">
      <p className="eyebrow">{TEMPLATE_LABEL[templateKey]}</p>

      <div className="mt-5">
        <label className="field-label" htmlFor={`subject-${templateKey}`}>
          Subject
        </label>
        <input
          id={`subject-${templateKey}`}
          className="field"
          value={subjectValue}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="mt-5">
        <label className="field-label" htmlFor={`body-${templateKey}`}>
          Message
        </label>
        <textarea
          id={`body-${templateKey}`}
          className="field min-h-64 font-mono text-[0.8rem] leading-6"
          value={bodyValue}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {PLACEHOLDERS.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => setBody((current) => `${current}${token}`)}
            className="border border-rule bg-page px-2 py-1 font-mono text-[0.7rem] text-navy-soft transition-colors hover:border-gold hover:text-gold"
          >
            {token}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-gold !py-3"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveTemplate(templateKey, subjectValue, bodyValue);
              setNote({ ok: result.ok, message: result.message ?? '' });
            })
          }
        >
          {pending ? 'Saving…' : 'Save template'}
        </button>
        {note?.message && (
          <span className={`text-sm ${note.ok ? 'text-[#2f6b45]' : 'text-red-700'}`}>
            {note.message}
          </span>
        )}
      </div>
    </article>
  );
}
