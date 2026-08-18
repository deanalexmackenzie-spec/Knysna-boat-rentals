'use client';

import { useState, useTransition } from 'react';
import { setCustomerNotes } from '@/app/dashboard/actions';

export function CustomerNotes({
  customerId,
  notes,
}: {
  customerId: string;
  notes: string | null;
}) {
  const [value, setValue] = useState(notes ?? '');
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div>
      <label className="field-label">Notes</label>
      <textarea
        className="field min-h-20"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Regular, prefers the Belvidere run, always brings his own cooler…"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setCustomerNotes(customerId, value);
              setNote(result.message ?? null);
            })
          }
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {note && <span className="text-xs text-[#2f6b45]">{note}</span>}
      </div>
    </div>
  );
}
