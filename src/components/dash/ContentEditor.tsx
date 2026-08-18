'use client';

import { useState, useTransition } from 'react';
import { saveContent } from '@/app/dashboard/actions';
import { Prose } from '@/components/Prose';

export function ContentEditor({
  contentKey,
  title,
  body,
  description,
}: {
  contentKey: string;
  title: string;
  body: string;
  description: string;
}) {
  const [titleValue, setTitle] = useState(title);
  const [bodyValue, setBody] = useState(body);
  const [preview, setPreview] = useState(false);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <article className="card px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{contentKey}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-navy-soft">{description}</p>
        </div>
        <button type="button" className="btn-ghost" onClick={() => setPreview((v) => !v)}>
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div className="mt-6 border-t border-rule pt-6">
          <h3 className="font-display text-2xl text-navy">{titleValue}</h3>
          <div className="mt-5">
            <Prose body={bodyValue} />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <label className="field-label" htmlFor={`title-${contentKey}`}>
              Heading
            </label>
            <input
              id={`title-${contentKey}`}
              className="field"
              value={titleValue}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="mt-5">
            <label className="field-label" htmlFor={`body-${contentKey}`}>
              Body
            </label>
            <textarea
              id={`body-${contentKey}`}
              className="field min-h-80 font-mono text-[0.8rem] leading-6"
              value={bodyValue}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="mt-2 text-xs text-navy-mute">
              <code>## Heading</code>, <code>### Sub-heading</code>, <code>- bullet</code> and{' '}
              <code>**bold**</code> are rendered. Blank lines separate paragraphs.
            </p>
          </div>
        </>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-rule pt-5">
        <button
          type="button"
          className="btn-gold !py-3"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveContent(contentKey, titleValue, bodyValue);
              setNote({ ok: result.ok, message: result.message ?? '' });
            })
          }
        >
          {pending ? 'Saving…' : 'Save'}
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
