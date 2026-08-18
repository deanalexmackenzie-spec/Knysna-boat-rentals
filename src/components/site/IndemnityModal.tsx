'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Prose } from '@/components/Prose';

interface SigningContext {
  reference: string;
  token: string;
  customerName: string;
  signed: boolean;
  signedName: string | null;
}

interface Props {
  title: string;
  body: string;
  /** Link styling: discreet in the footer, inline elsewhere. */
  variant?: 'footer' | 'inline' | 'button';
  label?: string;
  /** Present only on a booking page, where the document can actually be signed. */
  signing?: SigningContext;
}

export function IndemnityModal({ title, body, variant = 'inline', label, signing }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const linkClass =
    variant === 'footer'
      ? 'text-[0.7rem] tracking-wide text-white/45 underline underline-offset-4 transition-colors hover:text-champagne'
      : variant === 'button'
        ? 'btn-outline'
        : 'text-sm text-gold underline underline-offset-4 hover:text-gold-deep';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={linkClass}>
        {label ?? 'Indemnity, waiver & release'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-deep/70 px-4 py-8 backdrop-blur-sm sm:py-12"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-3xl bg-white shadow-lift">
            <div className="flex items-start justify-between gap-6 border-b border-rule px-6 py-5 sm:px-10 sm:py-7">
              <div>
                <p className="eyebrow">Before you go aboard</p>
                <h2 className="mt-2.5 text-2xl sm:text-3xl">{title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 border border-rule px-3 py-1.5 text-xs text-navy-soft transition-colors hover:border-gold hover:text-gold"
              >
                Close
              </button>
            </div>

            <div className="max-h-[58vh] overflow-y-auto px-6 py-7 sm:px-10">
              <Prose body={body} />
            </div>

            <SignatureBlock signing={signing} onSigned={() => router.refresh()} />
          </div>
        </div>
      )}
    </>
  );
}

function SignatureBlock({
  signing,
  onSigned,
}: {
  signing?: SigningContext;
  onSigned: () => void;
}) {
  const [name, setName] = useState(signing?.customerName ?? '');
  const [agreed, setAgreed] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!signing) {
    return (
      <div className="border-t border-rule bg-page px-6 py-6 sm:px-10">
        <p className="eyebrow">Signature</p>
        <p className="mt-3 text-sm leading-6 text-navy-soft">
          This document is signed against a specific booking. Once you have requested a date you
          will receive a private link where you can read it again and sign it electronically. Every
          person going aboard must sign; where a person is under 18, a parent or legal guardian
          signs on their behalf.
        </p>
      </div>
    );
  }

  if (signing.signed || done) {
    return (
      <div className="border-t border-rule bg-gold-tint px-6 py-6 sm:px-10">
        <p className="eyebrow">Signature</p>
        <p className="mt-3 text-sm text-navy">
          Signed electronically by{' '}
          <strong className="font-semibold">{signing.signedName ?? name}</strong>. Thank you — a
          record has been stored against booking {signing.reference}.
        </p>
      </div>
    );
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/indemnity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: signing!.reference,
          token: signing!.token,
          name: name.trim(),
          guardian,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Could not record the signature.');
      setDone(true);
      onSigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the signature.');
    } finally {
      setBusy(false);
    }
  }

  const canSign = agreed && name.trim().length >= 3;

  return (
    <div className="border-t border-rule bg-page px-6 py-7 sm:px-10">
      <p className="eyebrow">Signature</p>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-navy-soft">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#b07c2e]"
        />
        <span>
          I have read and understood this document, I accept it, and I intend my typed name below
          to be my signature.
        </span>
      </label>

      <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm leading-6 text-navy-soft">
        <input
          type="checkbox"
          checked={guardian}
          onChange={(e) => setGuardian(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#b07c2e]"
        />
        <span>I am signing as the parent or legal guardian of a person under 18 going aboard.</span>
      </label>

      <div className="mt-5 sm:max-w-sm">
        <label className="field-label" htmlFor="signature-name">
          Full name
        </label>
        <input
          id="signature-name"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type your full name"
          autoComplete="name"
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSign || busy}
        className="btn-gold mt-6"
      >
        {busy ? 'Recording…' : 'Sign & submit'}
      </button>

      <p className="mt-4 text-xs leading-5 text-navy-mute">
        Your name, the date and time, and the network address you sign from are stored against
        booking {signing.reference} as the record of signature.
      </p>
    </div>
  );
}
