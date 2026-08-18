import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { refreshBookingStatus } from '@/lib/bookings';
import { isPayfastSourceIp, validateItnWithPayfast, verifyItnSignature } from '@/lib/payfast';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PayFast ITN (Instant Transaction Notification).
 *
 * PayFast retries on any non-2xx response, so every outcome that is not worth
 * retrying — a replay, an unknown reference — returns 200 with no side effect.
 * Only genuinely transient failures return 500.
 *
 * Four checks before a payment is trusted: the signature, PayFast's own
 * server-side validation, the source IP, and the amount against our own record.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyItnSignature(rawBody)) {
    console.warn('[payfast] ITN rejected: bad signature');
    return NextResponse.json({ ok: true });
  }

  const params = new URLSearchParams(rawBody);
  const reference = params.get('m_payment_id')?.trim();
  const paymentId = params.get('pf_payment_id')?.trim();
  const status = params.get('payment_status')?.trim();
  const grossAmount = Number(params.get('amount_gross') ?? '0');

  if (!reference || !paymentId) {
    console.warn('[payfast] ITN rejected: missing reference or payment id');
    return NextResponse.json({ ok: true });
  }

  const [validated, sourceOk] = await Promise.all([
    validateItnWithPayfast(rawBody),
    isPayfastSourceIp(clientIp(request)),
  ]);

  if (!validated) {
    console.warn(`[payfast] ITN rejected: PayFast did not validate ${paymentId}`);
    return NextResponse.json({ ok: true });
  }

  if (!sourceOk) {
    console.warn(`[payfast] ITN rejected: source IP not PayFast for ${paymentId}`);
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, deposit_amount, deposit_status, status')
    .eq('reference', reference)
    .maybeSingle();

  if (!booking) {
    console.warn(`[payfast] ITN for unknown reference ${reference}`);
    return NextResponse.json({ ok: true });
  }

  if (status !== 'COMPLETE') {
    await supabase.from('payments').upsert(
      {
        booking_id: booking.id,
        amount: grossAmount,
        method: 'card',
        kind: 'deposit',
        gateway_ref: paymentId,
        status: status === 'CANCELLED' ? 'failed' : 'pending',
        raw: Object.fromEntries(params),
      },
      { onConflict: 'gateway_ref' },
    );
    return NextResponse.json({ ok: true });
  }

  // Guard against a short-payment: the gross must cover the deposit we quoted.
  const expected = Number(booking.deposit_amount);
  if (Math.abs(grossAmount - expected) > 0.01) {
    console.warn(
      `[payfast] amount mismatch for ${reference}: got ${grossAmount}, expected ${expected}`,
    );
    await supabase.from('payments').upsert(
      {
        booking_id: booking.id,
        amount: grossAmount,
        method: 'card',
        kind: 'deposit',
        gateway_ref: paymentId,
        status: 'failed',
        raw: Object.fromEntries(params),
      },
      { onConflict: 'gateway_ref' },
    );
    return NextResponse.json({ ok: true });
  }

  // Idempotent: PayFast may deliver the same ITN more than once.
  const { data: seen } = await supabase
    .from('payments')
    .select('id, status')
    .eq('gateway_ref', paymentId)
    .maybeSingle();

  if (seen?.status === 'paid') return NextResponse.json({ ok: true });

  const { error: paymentError } = await supabase.from('payments').upsert(
    {
      booking_id: booking.id,
      amount: grossAmount,
      method: 'card',
      kind: 'deposit',
      gateway_ref: paymentId,
      status: 'paid',
      raw: Object.fromEntries(params),
    },
    { onConflict: 'gateway_ref' },
  );

  if (paymentError) {
    console.error('[payfast] could not record payment', paymentError);
    return NextResponse.json({ error: 'could not record payment' }, { status: 500 });
  }

  const { error: bookingError } = await supabase
    .from('bookings')
    .update({ deposit_status: 'paid', deposit_method: 'card' })
    .eq('id', booking.id);

  if (bookingError) {
    console.error('[payfast] could not update booking', bookingError);
    return NextResponse.json({ error: 'could not update booking' }, { status: 500 });
  }

  await refreshBookingStatus(booking.id);
  return NextResponse.json({ ok: true });
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}
