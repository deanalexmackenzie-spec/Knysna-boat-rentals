import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBookingForCustomer } from '@/lib/bookingAccess';
import { refreshBookingStatus } from '@/lib/bookings';

export const runtime = 'nodejs';

/** Records the electronic signature (typed name + acceptance) on a booking. */
export async function POST(request: Request) {
  let body: { reference?: string; token?: string; name?: string; guardian?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  const reference = body.reference?.trim();
  const name = body.name?.trim();

  if (!reference || !body.token) {
    return NextResponse.json({ error: 'This link is not valid.' }, { status: 403 });
  }
  if (!name || name.length < 3) {
    return NextResponse.json({ error: 'Please type your full name.' }, { status: 400 });
  }

  const booking = await getBookingForCustomer(reference, body.token);
  if (!booking) return NextResponse.json({ error: 'This link is not valid.' }, { status: 403 });

  if (booking.indemnity_signed) {
    return NextResponse.json({ ok: true, alreadySigned: true });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bookings')
    .update({
      indemnity_signed: true,
      indemnity_name: body.guardian ? `${name} (parent/guardian)` : name,
      indemnity_signed_at: new Date().toISOString(),
      indemnity_ip: clientIp(request),
    })
    .eq('id', booking.id);

  if (error) {
    return NextResponse.json({ error: 'We could not record the signature.' }, { status: 500 });
  }

  await refreshBookingStatus(booking.id);
  return NextResponse.json({ ok: true });
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}
