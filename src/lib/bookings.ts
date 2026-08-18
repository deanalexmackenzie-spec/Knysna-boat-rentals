import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingEmail } from '@/lib/notifications';
import type { BookingStatus, DocumentType } from '@/lib/types';

/** KBR-7F3K2Q — short, unambiguous, safe to read over the phone. */
const REF_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY3479';

export function generateReference(): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  }
  return `KBR-${out}`;
}

/**
 * Dates a boat cannot be booked: owner-blocked plus already taken by a live
 * booking. Everything else on or after today is open.
 */
export async function unavailableDates(boatId: string): Promise<string[]> {
  const supabase = createAdminClient();

  const [blocked, booked] = await Promise.all([
    supabase.from('blocked_dates').select('date').eq('boat_id', boatId),
    supabase.from('bookings').select('date').eq('boat_id', boatId).neq('status', 'cancelled'),
  ]);

  const dates = new Set<string>();
  for (const row of blocked.data ?? []) dates.add(row.date as string);
  for (const row of booked.data ?? []) dates.add(row.date as string);
  return [...dates].sort();
}

export async function isDateAvailable(boatId: string, date: string): Promise<boolean> {
  const supabase = createAdminClient();

  const [{ count: blockedCount }, { count: bookedCount }] = await Promise.all([
    supabase
      .from('blocked_dates')
      .select('id', { count: 'exact', head: true })
      .eq('boat_id', boatId)
      .eq('date', date),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('boat_id', boatId)
      .eq('date', date)
      .neq('status', 'cancelled'),
  ]);

  return (blockedCount ?? 0) === 0 && (bookedCount ?? 0) === 0;
}

export interface DocsState {
  complete: boolean;
  missing: DocumentType[];
  present: DocumentType[];
}

/**
 * A booking is document-complete when the indemnity is signed, an ID is on
 * file, and — for a self-drive hire — a SAMSA skipper's licence too.
 */
export function evaluateDocs(
  booking: { skipper: boolean; indemnity_signed: boolean },
  documents: { type: DocumentType }[],
): DocsState {
  const present = documents.map((d) => d.type);
  const required: DocumentType[] = ['id'];
  if (!booking.skipper) required.push('skipper_licence');

  const missing = required.filter((type) => !present.includes(type));
  if (!booking.indemnity_signed) missing.push('indemnity');

  return { complete: missing.length === 0, missing, present };
}

interface DeriveInput {
  status: BookingStatus;
  deposit_status: string;
  balance_status: string;
  docsComplete: boolean;
}

/**
 * The status workflow, derived from the facts rather than stored by hand:
 *
 *   request            no email issued yet
 *   deposit_pending    awaiting the deposit, documents still outstanding
 *   docs_received      documents in, deposit still outstanding
 *   deposit_paid       deposit in, documents still outstanding
 *   balance_due        deposit and documents both done, balance owing
 *   confirmed          balance settled
 *   completed          set after the trip
 *   cancelled          set by the owner
 *
 * `completed` and `cancelled` are terminal and are never derived away.
 */
export function deriveStatus(input: DeriveInput): BookingStatus {
  if (input.status === 'cancelled' || input.status === 'completed') return input.status;

  const depositPaid = input.deposit_status === 'paid';
  const balancePaid = input.balance_status === 'paid';

  if (!depositPaid) {
    if (input.docsComplete) return 'docs_received';
    return input.status === 'request' ? 'request' : 'deposit_pending';
  }

  if (!input.docsComplete) return 'deposit_paid';
  return balancePaid ? 'confirmed' : 'balance_due';
}

/**
 * Recomputes and persists the status for a booking, and sends the "confirmed"
 * email the first time deposit and documents are both complete.
 */
export async function refreshBookingStatus(bookingId: string): Promise<BookingStatus | null> {
  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, skipper, indemnity_signed, deposit_status, balance_status')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) return null;

  const { data: documents } = await supabase
    .from('documents')
    .select('type')
    .eq('booking_id', bookingId);

  const docs = evaluateDocs(
    { skipper: booking.skipper as boolean, indemnity_signed: booking.indemnity_signed as boolean },
    (documents ?? []) as { type: DocumentType }[],
  );

  const next = deriveStatus({
    status: booking.status as BookingStatus,
    deposit_status: booking.deposit_status as string,
    balance_status: booking.balance_status as string,
    docsComplete: docs.complete,
  });

  if (next !== booking.status) {
    await supabase.from('bookings').update({ status: next }).eq('id', bookingId);
  }

  // Deposit and documents are both in — send the confirmation, once.
  if (next === 'balance_due' || next === 'confirmed') {
    const { count } = await supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', bookingId)
      .eq('template_key', 'confirmed')
      .eq('status', 'sent');

    if ((count ?? 0) === 0) await sendBookingEmail(bookingId, 'confirmed');
  }

  return next;
}
