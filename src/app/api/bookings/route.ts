import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateReference, isDateAvailable } from '@/lib/bookings';
import { notifyOwnerOfRequest, sendBookingEmail } from '@/lib/notifications';
import { quote } from '@/lib/pricing';
import { todayIso } from '@/lib/dates';
import type { PaymentMethod } from '@/lib/types';

export const runtime = 'nodejs';

interface Body {
  boat_id?: string;
  date?: string;
  skipper?: boolean;
  name?: string;
  phone?: string;
  email?: string;
  deposit_method?: PaymentMethod;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return bad('Malformed request.');
  }

  const boatId = body.boat_id?.trim();
  const date = body.date?.trim();
  const name = body.name?.trim();
  const phone = normalisePhone(body.phone ?? '');
  const email = body.email?.trim().toLowerCase();
  const skipper = Boolean(body.skipper);
  const method: PaymentMethod = body.deposit_method === 'card' ? 'card' : 'eft';

  if (!boatId || !isUuid(boatId)) return bad('Please choose a boat.');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad('Please choose a date.');
  if (date < todayIso()) return bad('That date has already passed.');
  if (!name || name.length < 2) return bad('Please give us your name.');
  if (!phone || phone.length < 7) return bad('Please give us a contact number.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad('Please give us a valid email address.');

  const supabase = createAdminClient();

  const { data: boat } = await supabase
    .from('boats')
    .select('id, name, day_rate, skipper_rate, active')
    .eq('id', boatId)
    .maybeSingle();

  if (!boat || !boat.active) return bad('That boat is not available for hire.');

  if (!(await isDateAvailable(boatId, date))) {
    return bad('Sorry — that date has just been taken. Please choose another.');
  }

  // Client log is keyed on phone: one customer record, many bookings.
  const { data: existing } = await supabase
    .from('customers')
    .select('id, name, email')
    .eq('phone', phone)
    .maybeSingle();

  let customerId: string;
  if (existing) {
    customerId = existing.id as string;
    await supabase.from('customers').update({ name, email }).eq('id', customerId);
  } else {
    const { data: created, error } = await supabase
      .from('customers')
      .insert({ name, phone, email })
      .select('id')
      .single();

    if (error || !created) return fail('We could not save your details. Please try again.');
    customerId = created.id as string;
  }

  const q = quote(Number(boat.day_rate), Number(boat.skipper_rate), skipper);

  // The unique index on (boat_id, date) for live bookings is the real guard
  // against two people requesting the same day at once; retry once on a
  // reference collision, and surface a clash as "date taken".
  let bookingId: string | null = null;
  let reference = '';
  let token = '';

  for (let attempt = 0; attempt < 3 && !bookingId; attempt++) {
    reference = generateReference();
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        reference,
        customer_id: customerId,
        boat_id: boatId,
        date,
        skipper,
        day_rate: q.dayRate,
        skipper_rate: q.skipperRate,
        total_amount: q.total,
        deposit_amount: q.deposit,
        balance_amount: q.balance,
        deposit_method: method,
        status: 'request',
      })
      .select('id, reference, access_token')
      .single();

    if (data) {
      bookingId = data.id as string;
      reference = data.reference as string;
      token = data.access_token as string;
      break;
    }

    if (error?.code === '23505' && error.message.includes('bookings_one_live_per_boat_day')) {
      return bad('Sorry — that date has just been taken. Please choose another.');
    }
    if (error?.code !== '23505') {
      return fail('We could not create the booking. Please try again.');
    }
    // else: reference collision — loop and generate another
  }

  if (!bookingId) return fail('We could not create the booking. Please try again.');

  // Request received → email the customer, notify the owner, advance the status.
  await sendBookingEmail(bookingId, 'received');
  await notifyOwnerOfRequest(bookingId);
  await supabase.from('bookings').update({ status: 'deposit_pending' }).eq('id', bookingId);

  return NextResponse.json({ reference, token });
}

/** Store phones in a comparable form so the client log keys reliably. */
function normalisePhone(input: string): string {
  const trimmed = input.replace(/[\s()-]/g, '');
  if (trimmed.startsWith('+')) return '+' + trimmed.slice(1).replace(/\D/g, '');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '+27' + digits.slice(1);
  if (digits.startsWith('27') && digits.length === 11) return '+' + digits;
  return digits;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function fail(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}
