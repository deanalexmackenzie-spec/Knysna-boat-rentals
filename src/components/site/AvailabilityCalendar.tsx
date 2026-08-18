'use client';

import { useMemo, useState } from 'react';
import { formatMonth, monthGrid, todayIso, WEEKDAY_LABELS } from '@/lib/dates';

interface Props {
  unavailable: string[];
  selected: string | null;
  onSelect: (date: string) => void;
  monthsAhead?: number;
}

/**
 * Public availability calendar. Dates that are booked or owner-blocked are not
 * offered, exactly as if they did not exist; past dates are likewise closed.
 */
export function AvailabilityCalendar({
  unavailable,
  selected,
  onSelect,
  monthsAhead = 18,
}: Props) {
  const today = todayIso();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const closed = useMemo(() => new Set(unavailable), [unavailable]);
  const weeks = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);

  const firstMonthIndex = now.getFullYear() * 12 + now.getMonth();
  const cursorIndex = cursor.year * 12 + cursor.month;
  const canGoBack = cursorIndex > firstMonthIndex;
  const canGoForward = cursorIndex < firstMonthIndex + monthsAhead;

  function shift(delta: number) {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="btn-ghost !px-3 !py-2"
        >
          ←
        </button>
        <p className="font-display text-lg text-navy">{formatMonth(cursor.year, cursor.month)}</p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canGoForward}
          aria-label="Next month"
          className="btn-ghost !px-3 !py-2"
        >
          →
        </button>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="pb-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-navy-mute"
          >
            {label.slice(0, 1)}
          </div>
        ))}

        {weeks.flat().map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />;

          const isPast = date < today;
          const isClosed = closed.has(date) || isPast;
          const isSelected = date === selected;
          const day = Number(date.slice(8, 10));

          if (isClosed) {
            return (
              <div
                key={date}
                aria-disabled="true"
                title={isPast ? 'Past' : 'Not available'}
                className="flex h-10 items-center justify-center text-sm text-navy-mute/35 line-through"
              >
                {day}
              </div>
            );
          }

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              className={`flex h-10 items-center justify-center border text-sm transition-colors ${
                isSelected
                  ? 'border-gold-deep bg-gradient-to-b from-gold to-gold-deep font-semibold text-white'
                  : 'border-rule bg-white text-navy hover:border-gold hover:bg-gold-tint'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.65rem] uppercase tracking-[0.1em] text-navy-mute">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border border-rule bg-white" /> Open
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border border-gold-deep bg-gold" /> Selected
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 bg-page" /> Unavailable
        </span>
      </div>
    </div>
  );
}
