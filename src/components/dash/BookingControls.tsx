'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  setBookingNotes,
  setBookingStatus,
  setDocumentVerified,
  signedDocumentUrl,
} from '@/app/dashboard/actions';
import { formatDateTime } from '@/lib/dates';
import { BOOKING_STATUS_LABEL, DOCUMENT_LABEL } from '@/lib/types';
import type { BookingDocument, BookingStatus } from '@/lib/types';

const SELECTABLE: BookingStatus[] = [
  'request',
  'deposit_pending',
  'deposit_paid',
  'docs_received',
  'balance_due',
  'confirmed',
  'completed',
  'cancelled',
];

export function StatusSelect({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <label className="field-label" htmlFor="status-select">
        Status
      </label>
      <select
        id="status-select"
        className="field"
        defaultValue={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as BookingStatus;
          startTransition(async () => {
            const result = await setBookingStatus(bookingId, next);
            setNote(result.message ?? null);
            router.refresh();
          });
        }}
      >
        {SELECTABLE.map((option) => (
          <option key={option} value={option}>
            {BOOKING_STATUS_LABEL[option]}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-navy-mute">
        {note ??
          'Status normally follows the deposit and documents on its own. Set it by hand to cancel or to close off a completed trip.'}
      </p>
    </div>
  );
}

export function NotesEditor({
  bookingId,
  notes,
}: {
  bookingId: string;
  notes: string | null;
}) {
  const [value, setValue] = useState(notes ?? '');
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div>
      <textarea
        className="field min-h-28"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Anything worth remembering about this hire…"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setBookingNotes(bookingId, value);
              setNote(result.message ?? null);
            })
          }
        >
          {pending ? 'Saving…' : 'Save notes'}
        </button>
        {note && <span className="text-xs text-[#2f6b45]">{note}</span>}
      </div>
    </div>
  );
}

export function DocumentRow({ document }: { document: BookingDocument }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule py-3.5 last:border-b-0">
      <div>
        <p className="text-sm text-navy">{DOCUMENT_LABEL[document.type]}</p>
        <p className="mt-0.5 text-xs text-navy-mute">
          {document.file_name ?? 'file'} · uploaded {formatDateTime(document.uploaded_at)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const url = await signedDocumentUrl(document.file_path);
              if (url) window.open(url, '_blank', 'noopener,noreferrer');
              else setError('Could not open that file.');
            })
          }
        >
          {pending ? 'Opening…' : 'View'}
        </button>

        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setDocumentVerified(document.id, !document.verified);
              router.refresh();
            })
          }
        >
          {document.verified ? '✓ Verified' : 'Mark verified'}
        </button>

        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    </div>
  );
}
