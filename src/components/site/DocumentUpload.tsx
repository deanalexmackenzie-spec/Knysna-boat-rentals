'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DocumentType } from '@/lib/types';

interface Props {
  reference: string;
  token: string;
  type: DocumentType;
  label: string;
  hint: string;
  uploaded: { file_name: string | null; uploaded_at: string } | null;
}

/** Drag-and-drop / file-picker upload straight into the private bucket. */
export function DocumentUpload({ reference, token, type, label, hint, uploaded }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.set('reference', reference);
      form.set('token', token);
      form.set('type', type);
      form.set('file', file);

      const res = await fetch('/api/documents', { method: 'POST', body: form });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Upload failed.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void upload(file);
      }}
      className={`border px-5 py-5 transition-colors ${
        dragging ? 'border-gold bg-gold-tint' : uploaded ? 'border-rule bg-white' : 'border-dashed border-rule bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-navy">{label}</p>
          <p className="mt-1 text-xs leading-5 text-navy-soft">{hint}</p>
          {uploaded && (
            <p className="mt-2 text-xs text-gold">
              ✓ {uploaded.file_name ?? 'Uploaded'} — received
            </p>
          )}
        </div>

        <div className="shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Uploading…' : uploaded ? 'Replace' : 'Choose file'}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
      {!uploaded && (
        <p className="mt-3 text-[0.7rem] text-navy-mute">
          Drag a file here, or use the button. JPG, PNG, WEBP or PDF, up to 10 MB.
        </p>
      )}
    </div>
  );
}
