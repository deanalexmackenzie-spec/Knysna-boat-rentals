'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { refreshBookingStatus } from '@/lib/bookings';
import { sendBookingEmail } from '@/lib/notifications';
import { DOCUMENT_BUCKET } from '@/lib/storage';
import type { BookingStatus, PaymentMethod, TemplateKey } from '@/lib/types';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export async function setBookingStatus(
  bookingId: string,
  status: BookingStatus,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
  if (error) return { ok: false, message: error.message };

  // Cancelling frees the date; everything else stays under the derived flow.
  if (status !== 'cancelled' && status !== 'completed') await refreshBookingStatus(bookingId);

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return { ok: true, message: 'Status updated.' };
}

export async function setPaymentState(
  bookingId: string,
  kind: 'deposit' | 'balance',
  paid: boolean,
  method: PaymentMethod = 'eft',
): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, deposit_amount, balance_amount')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) return { ok: false, message: 'Booking not found.' };

  const state = paid ? 'paid' : 'pending';
  const { error } = await supabase
    .from('bookings')
    .update(kind === 'deposit' ? { deposit_status: state } : { balance_status: state })
    .eq('id', bookingId);

  if (error) return { ok: false, message: error.message };

  if (paid) {
    // Manual receipts (EFT, card machine on collection) are recorded as
    // payments too, so the client log's lifetime spend stays honest.
    await supabase.from('payments').insert({
      booking_id: bookingId,
      amount: kind === 'deposit' ? booking.deposit_amount : booking.balance_amount,
      method,
      kind,
      status: 'paid',
      gateway_ref: null,
    });
  }

  await refreshBookingStatus(bookingId);
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return { ok: true, message: paid ? 'Marked as received.' : 'Marked as outstanding.' };
}

export async function setBookingNotes(bookingId: string, notes: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('bookings')
    .update({ notes: notes.slice(0, 4000) })
    .eq('id', bookingId);

  if (error) return { ok: false, message: error.message };
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return { ok: true, message: 'Notes saved.' };
}

export async function setDocumentVerified(
  documentId: string,
  verified: boolean,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .update({ verified })
    .eq('id', documentId)
    .select('booking_id')
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (data) revalidatePath(`/dashboard/bookings/${data.booking_id}`);
  return { ok: true };
}

export async function deleteDocument(documentId: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('documents')
    .select('id, booking_id, file_path')
    .eq('id', documentId)
    .maybeSingle();

  if (!data) return { ok: false, message: 'Document not found.' };

  await supabase.storage.from(DOCUMENT_BUCKET).remove([data.file_path as string]);
  await supabase.from('documents').delete().eq('id', documentId);
  await refreshBookingStatus(data.booking_id as string);

  revalidatePath(`/dashboard/bookings/${data.booking_id}`);
  return { ok: true, message: 'Document deleted.' };
}

/** Short-lived signed URL — the only way a private document is ever served. */
export async function signedDocumentUrl(path: string): Promise<string | null> {
  await requireOwner();
  const supabase = createAdminClient();

  const { data } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

export async function resendTemplate(
  bookingId: string,
  key: TemplateKey,
): Promise<ActionResult> {
  await requireOwner();
  const result = await sendBookingEmail(bookingId, key);
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  return result.sent
    ? { ok: true, message: 'Sent.' }
    : { ok: false, message: result.reason ?? 'Could not send.' };
}

// ─── Openings calendar ──────────────────────────────────────────────────────

export async function toggleBlockedDate(boatId: string, date: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('blocked_dates')
    .select('id')
    .eq('boat_id', boatId)
    .eq('date', date)
    .maybeSingle();

  if (existing) {
    await supabase.from('blocked_dates').delete().eq('id', existing.id as string);
  } else {
    // Never close a date that is already sold.
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('boat_id', boatId)
      .eq('date', date)
      .neq('status', 'cancelled');

    if ((count ?? 0) > 0) return { ok: false, message: 'That date is booked — cancel the booking first.' };

    await supabase.from('blocked_dates').insert({ boat_id: boatId, date });
  }

  revalidatePath('/dashboard/calendar');
  return { ok: true };
}

export async function setMonthBlocked(
  boatId: string,
  dates: string[],
  blocked: boolean,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  if (blocked) {
    const { data: booked } = await supabase
      .from('bookings')
      .select('date')
      .eq('boat_id', boatId)
      .in('date', dates)
      .neq('status', 'cancelled');

    const taken = new Set((booked ?? []).map((row) => row.date as string));
    const rows = dates
      .filter((date) => !taken.has(date))
      .map((date) => ({ boat_id: boatId, date }));

    if (rows.length) {
      await supabase.from('blocked_dates').upsert(rows, { onConflict: 'boat_id,date' });
    }
  } else {
    await supabase.from('blocked_dates').delete().eq('boat_id', boatId).in('date', dates);
  }

  revalidatePath('/dashboard/calendar');
  return { ok: true, message: blocked ? 'Dates closed.' : 'Dates opened.' };
}

// ─── Templates & copy ───────────────────────────────────────────────────────

export async function saveTemplate(
  key: TemplateKey,
  subject: string,
  body: string,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('message_templates')
    .upsert({ key, subject, body }, { onConflict: 'key' });

  if (error) return { ok: false, message: error.message };
  revalidatePath('/dashboard/templates');
  return { ok: true, message: 'Template saved.' };
}

export async function saveContent(
  key: string,
  title: string,
  body: string,
): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('site_content')
    .upsert({ key, title, body }, { onConflict: 'key' });

  if (error) return { ok: false, message: error.message };

  revalidatePath('/dashboard/content');
  revalidatePath('/terms');
  revalidatePath('/privacy');
  revalidatePath('/safety');
  revalidatePath('/knysna');
  return { ok: true, message: 'Saved.' };
}

// ─── Fleet ──────────────────────────────────────────────────────────────────

export interface BoatInput {
  name: string;
  slug: string;
  description: string;
  capacity: number;
  power: string;
  length_m: number;
  day_rate: number;
  skipper_rate: number;
  sort_order: number;
  active: boolean;
}

export async function saveBoat(
  boatId: string | null,
  input: BoatInput,
): Promise<ActionResult & { id?: string }> {
  await requireOwner();
  const supabase = createAdminClient();

  const slug = slugify(input.slug || input.name);
  if (!input.name.trim()) return { ok: false, message: 'The boat needs a name.' };
  if (!slug) return { ok: false, message: 'The boat needs a URL slug.' };

  const payload = { ...input, slug };

  if (boatId) {
    const { error } = await supabase.from('boats').update(payload).eq('id', boatId);
    if (error) return { ok: false, message: error.message };
    revalidatePath('/dashboard/fleet');
    revalidatePath(`/dashboard/fleet/${boatId}`);
    revalidatePath('/fleet');
    return { ok: true, message: 'Boat saved.', id: boatId };
  }

  const { data, error } = await supabase.from('boats').insert(payload).select('id').single();
  if (error) return { ok: false, message: error.message };

  revalidatePath('/dashboard/fleet');
  revalidatePath('/fleet');
  return { ok: true, message: 'Boat added.', id: data.id as string };
}

export async function setBoatActive(boatId: string, active: boolean): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { error } = await supabase.from('boats').update({ active }).eq('id', boatId);
  if (error) return { ok: false, message: error.message };

  revalidatePath('/dashboard/fleet');
  revalidatePath('/fleet');
  return { ok: true, message: active ? 'Boat published.' : 'Boat hidden from the site.' };
}

export async function deleteBoat(boatId: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('boat_id', boatId);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: 'This boat has bookings against it. Hide it from the site instead of deleting.',
    };
  }

  const { error } = await supabase.from('boats').delete().eq('id', boatId);
  if (error) return { ok: false, message: error.message };

  revalidatePath('/dashboard/fleet');
  revalidatePath('/fleet');
  return { ok: true, message: 'Boat deleted.' };
}

export async function setBoatPhotos(boatId: string, paths: string[]): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('boats')
    .update({ photo_paths: paths })
    .eq('id', boatId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/dashboard/fleet/${boatId}`);
  revalidatePath('/fleet');
  return { ok: true };
}

/** Removes a photo from the boat and from storage. */
export async function removeBoatPhoto(boatId: string, path: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { data: boat } = await supabase
    .from('boats')
    .select('photo_paths')
    .eq('id', boatId)
    .maybeSingle();

  if (!boat) return { ok: false, message: 'Boat not found.' };

  const remaining = ((boat.photo_paths ?? []) as string[]).filter((p) => p !== path);
  await supabase.from('boats').update({ photo_paths: remaining }).eq('id', boatId);
  await supabase.storage.from('boat-photos').remove([path]);

  revalidatePath(`/dashboard/fleet/${boatId}`);
  revalidatePath('/fleet');
  return { ok: true, message: 'Photo removed.' };
}

// ─── Client log ─────────────────────────────────────────────────────────────

export async function setCustomerNotes(customerId: string, notes: string): Promise<ActionResult> {
  await requireOwner();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('customers')
    .update({ notes: notes.slice(0, 4000) })
    .eq('id', customerId);

  if (error) return { ok: false, message: error.message };
  revalidatePath('/dashboard/clients');
  return { ok: true, message: 'Saved.' };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
