'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setMonthBlocked, toggleBlockedDate } from '@/app/dashboard/actions';
import { formatMonth, monthGrid, todayIso, WEEKDAY_LABELS } from '@/lib/dates';

interface Props {
  boatId: string;
  blocked: string[];
  booked: Record<string, { reference: string; customer: string }>;
}

/**
 * Owner's openings calendar: click a date to open or close it. Closed dates
 * disappear from the customer calendar; booked dates are locked and can only be
 * freed by cancelling the booking.
 */
export function OpeningsCalendar({ boatId, blocked, booked }: Props) {
  const today = todayIso();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);
  const router = useRouter();

  const closed = useMemo(() => new Set(blocked), [blocked]);
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  const monthDates = weeks
    .flat()
    .filter((date): date is string => Boolean(date) && date! >= today);

  function shift(delta: number) {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await fn();
      setNote(result.message ? { ok: result.ok, message: result.message } : null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => shift(-1)} className="btn-ghost !px-3 !py-2">
            ←
          </button>
          <p className="font-display text-lg text-navy">
            {formatMonth(cursor.year, cursor.month)}
          </p>
          <button type="button" onClick={() => shift(1)} className="btn-ghost !px-3 !py-2">
            →
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost"
            disabled={pending || monthDates.length === 0}
            onClick={() => run(() => setMonthBlocked(boatId, monthDates, false))}
          >
            Open all
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={pending || monthDates.length === 0}
            onClick={() => run(() => setMonthBlocked(boatId, monthDates, true))}
          >
            Close all
          </button>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="pb-2 text-center text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-navy-mute"
          >
            {label}
          </div>
        ))}

        {weeks.flat().map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />;

          const day = Number(date.slice(8, 10));
          const isPast = date < today;
          const reservation = booked[date];
          const isClosed = closed.has(date);

          if (isPast) {
            return (
              <div
                key={date}
                className="flex h-16 flex-col items-center justify-center border border-rule bg-page text-xs text-navy-mute/40"
              >
                {day}
              </div>
            );
          }

          if (reservation) {
            return (
              <div
                key={date}
                title={`${reservation.reference} — ${reservation.customer}`}
                className="flex h-16 flex-col items-center justify-center border border-[#cfe0d3] bg-[#f2f8f3] px-1 text-center"
              >
                <span className="text-xs font-semibold text-[#2f6b45]">{day}</span>
                <span className="mt-0.5 truncate text-[0.55rem] uppercase tracking-[0.06em] text-[#2f6b45]">
                  Booked
                </span>
              </div>
            );
          }

          return (
            <button
              key={date}
              type="button"
              disabled={pending}
              onClick={() => run(() => toggleBlockedDate(boatId, date))}
              className={`flex h-16 flex-col items-center justify-center border text-xs transition-colors disabled:opacity-60 ${
                isClosed
                  ? 'border-rule bg-page text-navy-mute'
                  : 'border-[#e6d6b4] bg-gold-tint text-gold-deep hover:border-gold'
              }`}
            >
              <span className="font-semibold">{day}</span>
              <span className="mt-0.5 text-[0.55rem] uppercase tracking-[0.06em]">
                {isClosed ? 'Closed' : 'Open'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.62rem] uppercase tracking-[0.1em] text-navy-mute">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border border-[#e6d6b4] bg-gold-tint" /> Open to
          customers
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border border-rule bg-page" /> Closed
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border border-[#cfe0d3] bg-[#f2f8f3]" /> Booked
          (locked)
        </span>
      </div>

      {note && (
        <p className={`mt-4 text-sm ${note.ok ? 'text-[#2f6b45]' : 'text-red-700'}`}>
          {note.message}
        </p>
      )}
    </div>
  );
}
