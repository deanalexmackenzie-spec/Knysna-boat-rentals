'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { BOOKING_STATUS_LABEL, type BookingStatus } from '@/lib/types';

const STATUS_TONE: Record<BookingStatus, string> = {
  request: 'border-rule bg-white text-navy-soft',
  deposit_pending: 'border-[#e6d6b4] bg-gold-tint text-gold-deep',
  docs_received: 'border-[#e6d6b4] bg-gold-tint text-gold-deep',
  deposit_paid: 'border-[#cfe0d3] bg-[#f2f8f3] text-[#2f6b45]',
  balance_due: 'border-[#e6d6b4] bg-gold-tint text-gold-deep',
  confirmed: 'border-[#cfe0d3] bg-[#f2f8f3] text-[#2f6b45]',
  completed: 'border-rule bg-page text-navy-soft',
  cancelled: 'border-[#eccfcf] bg-[#fdf3f3] text-[#9c3434]',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] ${STATUS_TONE[status]}`}
    >
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}

export function Pill({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-block whitespace-nowrap border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] ${
        ok
          ? 'border-[#cfe0d3] bg-[#f2f8f3] text-[#2f6b45]'
          : 'border-rule bg-white text-navy-mute'
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Runs a server action, shows the result inline, and refreshes the route.
 * Every mutating control in the dashboard goes through this.
 */
export function ActionButton({
  action,
  label,
  pendingLabel = 'Working…',
  className = 'btn-ghost',
  confirm,
}: {
  action: () => Promise<{ ok: boolean; message?: string }>;
  label: string;
  pendingLabel?: string;
  className?: string;
  confirm?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);
  const router = useRouter();

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className={className}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          startTransition(async () => {
            const result = await action();
            if (result.message) setNote({ ok: result.ok, message: result.message });
            else setNote(null);
            router.refresh();
          });
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      {note && (
        <span className={`text-xs ${note.ok ? 'text-[#2f6b45]' : 'text-red-700'}`}>
          {note.message}
        </span>
      )}
    </span>
  );
}

export function SectionCard({
  title,
  eyebrow,
  children,
  actions,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="card px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="mt-1.5 font-display text-xl text-navy">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
