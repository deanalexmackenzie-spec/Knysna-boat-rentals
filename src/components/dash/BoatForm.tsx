'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveBoat, type BoatInput } from '@/app/dashboard/actions';

export function BoatForm({
  boatId,
  initial,
}: {
  boatId: string | null;
  initial: BoatInput;
}) {
  const [form, setForm] = useState<BoatInput>(initial);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);
  const router = useRouter();

  function update<K extends keyof BoatInput>(key: K, value: BoatInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="boat-name">
            Name
          </label>
          <input
            id="boat-name"
            className="field"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="boat-slug">
            URL slug
          </label>
          <input
            id="boat-slug"
            className="field"
            value={form.slug}
            placeholder="leave blank to generate from the name"
            onChange={(e) => update('slug', e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="boat-description">
            Description
          </label>
          <textarea
            id="boat-description"
            className="field min-h-32"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="boat-capacity">
            Capacity (guests)
          </label>
          <input
            id="boat-capacity"
            type="number"
            min={1}
            className="field"
            value={form.capacity}
            onChange={(e) => update('capacity', Number(e.target.value))}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="boat-length">
            Length (m)
          </label>
          <input
            id="boat-length"
            type="number"
            step="0.1"
            min={0}
            className="field"
            value={form.length_m}
            onChange={(e) => update('length_m', Number(e.target.value))}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="boat-power">
            Power
          </label>
          <input
            id="boat-power"
            className="field"
            value={form.power}
            placeholder="115 hp four-stroke outboard"
            onChange={(e) => update('power', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="boat-day-rate">
            Full-day rate (ZAR)
          </label>
          <input
            id="boat-day-rate"
            type="number"
            step="1"
            min={0}
            className="field"
            value={form.day_rate}
            onChange={(e) => update('day_rate', Number(e.target.value))}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="boat-skipper-rate">
            Skipper per day (ZAR)
          </label>
          <input
            id="boat-skipper-rate"
            type="number"
            step="1"
            min={0}
            className="field"
            value={form.skipper_rate}
            onChange={(e) => update('skipper_rate', Number(e.target.value))}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="boat-order">
            Sort order
          </label>
          <input
            id="boat-order"
            type="number"
            className="field"
            value={form.sort_order}
            onChange={(e) => update('sort_order', Number(e.target.value))}
          />
        </div>

        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-3 pb-3 text-sm text-navy-soft">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update('active', e.target.checked)}
              className="h-4 w-4 accent-[#b07c2e]"
            />
            Published on the site
          </label>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
        <button
          type="button"
          className="btn-gold !py-3"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveBoat(boatId, form);
              setNote({ ok: result.ok, message: result.message ?? '' });
              if (result.ok && !boatId && result.id) {
                router.push(`/dashboard/fleet/${result.id}`);
              } else {
                router.refresh();
              }
            })
          }
        >
          {pending ? 'Saving…' : boatId ? 'Save boat' : 'Add boat'}
        </button>
        {note?.message && (
          <span className={`text-sm ${note.ok ? 'text-[#2f6b45]' : 'text-red-700'}`}>
            {note.message}
          </span>
        )}
      </div>
    </div>
  );
}
