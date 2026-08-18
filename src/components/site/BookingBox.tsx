'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvailabilityCalendar } from '@/components/site/AvailabilityCalendar';
import { IndemnityModal } from '@/components/site/IndemnityModal';
import { formatLongDate } from '@/lib/dates';
import { formatZar, quote } from '@/lib/pricing';
import type { PaymentMethod } from '@/lib/types';

interface Props {
  boat: { id: string; name: string; day_rate: number; skipper_rate: number };
  unavailable: string[];
  indemnityTitle: string;
  indemnityBody: string;
}

export function BookingBox({ boat, unavailable, indemnityTitle, indemnityBody }: Props) {
  const [date, setDate] = useState<string | null>(null);
  const [skipper, setSkipper] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const q = useMemo(
    () => quote(Number(boat.day_rate), Number(boat.skipper_rate), skipper),
    [boat.day_rate, boat.skipper_rate, skipper],
  );

  const ready =
    Boolean(date) && name.trim().length >= 2 && phone.trim().length >= 7 && isEmail(email) && accepted;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boat_id: boat.id,
          date,
          skipper,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          deposit_method: method,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'We could not submit that request.');

      router.push(`/booking/${payload.reference}?t=${payload.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not submit that request.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-7 sm:p-9">
      <p className="eyebrow">Check availability</p>
      <h2 className="rule-gold mt-3 text-2xl">Request a date</h2>

      <div className="mt-8">
        <AvailabilityCalendar unavailable={unavailable} selected={date} onSelect={setDate} />
      </div>

      {/* ─── Skipper toggle ─────────────────────────────────────────────── */}
      <fieldset className="mt-9 border-t border-rule pt-7">
        <legend className="field-label !mb-0">How would you like to go out?</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ToggleOption
            active={!skipper}
            onClick={() => setSkipper(false)}
            title="Self-drive"
            note="SAMSA skipper's licence required. Estuary only."
            price="Included"
          />
          <ToggleOption
            active={skipper}
            onClick={() => setSkipper(true)}
            title="With a skipper"
            note="Our skipper takes the helm. Sea passage possible."
            price={`+ ${formatZar(boat.skipper_rate)} / day`}
          />
        </div>
      </fieldset>

      {/* ─── Price summary ──────────────────────────────────────────────── */}
      <div className="mt-8 bg-gold-tint px-6 py-6">
        <dl className="space-y-2.5 text-sm">
          <Row label={`Full day — ${boat.name}`} value={formatZar(q.dayRate)} />
          {skipper && <Row label="Skipper (1 day)" value={formatZar(q.skipperRate)} />}
          <div className="border-t border-[#e6d6b4] pt-2.5">
            <Row label="Total" value={formatZar(q.total)} strong />
          </div>
          <Row label="Deposit to secure the date (50%)" value={formatZar(q.deposit)} strong />
          <Row label="Balance on collection" value={formatZar(q.balance)} />
        </dl>
        {date && (
          <p className="mt-5 border-t border-[#e6d6b4] pt-4 text-sm text-navy">
            <span className="text-navy-soft">Date requested:</span>{' '}
            <strong className="font-semibold">{formatLongDate(date)}</strong>
          </p>
        )}
      </div>

      {/* ─── Details ────────────────────────────────────────────────────── */}
      <div className="mt-9 grid gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="bk-name">
            Full name
          </label>
          <input
            id="bk-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="bk-phone">
            Mobile number
          </label>
          <input
            id="bk-phone"
            className="field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="082 000 0000"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="bk-email">
            Email
          </label>
          <input
            id="bk-email"
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
      </div>

      {/* ─── Deposit method ─────────────────────────────────────────────── */}
      <fieldset className="mt-8">
        <legend className="field-label !mb-0">How would you like to pay the deposit?</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ToggleOption
            active={method === 'card'}
            onClick={() => setMethod('card')}
            title="Card online"
            note="Secure checkout. The date is held the moment it clears."
            price=""
          />
          <ToggleOption
            active={method === 'eft'}
            onClick={() => setMethod('eft')}
            title="EFT"
            note="We send banking details and your reference."
            price=""
          />
        </div>
      </fieldset>

      <label className="mt-7 flex cursor-pointer items-start gap-3 text-sm leading-6 text-navy-soft">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#b07c2e]"
        />
        <span>
          I have read the rental terms and the indemnity, waiver &amp; release, and I understand
          that every person going aboard must sign it before departure.
        </span>
      </label>

      <div className="mt-3 pl-7">
        {/* Discreet indemnity link inside the booking box, as specified. */}
        <IndemnityModal
          title={indemnityTitle}
          body={indemnityBody}
          variant="inline"
          label="Read the indemnity, waiver & release"
        />
      </div>

      {error && (
        <p className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button type="submit" disabled={!ready || busy} className="btn-gold mt-8 w-full">
        {busy ? 'Sending…' : 'Request this date'}
      </button>

      <p className="mt-4 text-xs leading-5 text-navy-mute">
        Requesting a date does not charge you anything. We hold the date for 48 hours while the
        deposit is arranged.
      </p>
    </form>
  );
}

function ToggleOption({
  active,
  onClick,
  title,
  note,
  price,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  note: string;
  price: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`border px-5 py-4 text-left transition-colors ${
        active ? 'border-gold bg-gold-tint' : 'border-rule bg-white hover:border-gold/60'
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-navy">{title}</span>
        <span
          className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full border ${
            active ? 'border-gold-deep bg-gold' : 'border-rule bg-white'
          }`}
        />
      </span>
      <span className="mt-1.5 block text-xs leading-5 text-navy-soft">{note}</span>
      {price && (
        <span className="mt-2 block text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-gold">
          {price}
        </span>
      )}
    </button>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? 'font-semibold text-navy' : 'text-navy-soft'}>{label}</dt>
      <dd className={strong ? 'font-display text-lg text-navy' : 'text-navy-soft'}>{value}</dd>
    </div>
  );
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
