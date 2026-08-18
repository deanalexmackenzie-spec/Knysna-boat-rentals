import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatLongDate } from '@/lib/dates';
import { formatZar } from '@/lib/pricing';
import type { TemplateKey } from '@/lib/types';

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function bookingLink(reference: string, token: string): string {
  return `${siteUrl()}/booking/${reference}?t=${token}`;
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? vars[key] : match,
  );
}

interface BookingRow {
  id: string;
  reference: string;
  access_token: string;
  date: string;
  skipper: boolean;
  total_amount: number;
  deposit_amount: number;
  balance_amount: number;
  deposit_method: string;
  boats: { name: string } | null;
  customers: { name: string; email: string | null; phone: string } | null;
}

export const BOOKING_SELECT =
  'id, reference, access_token, date, skipper, total_amount, deposit_amount, balance_amount, deposit_method, boats(name), customers(name, email, phone)';

export async function templateVars(booking: BookingRow): Promise<Record<string, string>> {
  const supabase = createAdminClient();
  const { data: banking } = await supabase
    .from('site_content')
    .select('body')
    .eq('key', 'banking')
    .maybeSingle();

  const bankDetails =
    booking.deposit_method === 'eft' && banking?.body
      ? `Banking details for EFT:\n\n${banking.body as string}`
      : '';

  return {
    name: booking.customers?.name ?? 'there',
    boat: booking.boats?.name ?? 'your boat',
    date: formatLongDate(booking.date),
    deposit: formatAmount(booking.deposit_amount),
    balance: formatAmount(booking.balance_amount),
    total: formatAmount(booking.total_amount),
    method: booking.deposit_method === 'card' ? 'card online' : 'EFT',
    reference: booking.reference,
    link: bookingLink(booking.reference, booking.access_token),
    bank_details: bankDetails,
    skipper: booking.skipper ? 'with a skipper' : 'self-drive',
  };
}

function formatAmount(n: number): string {
  return formatZar(n).replace(/^R\s?/, '');
}

/**
 * Renders the owner's template for `key` and emails it to the customer,
 * recording the attempt in message_log either way.
 */
export async function sendBookingEmail(
  bookingId: string,
  key: TemplateKey,
): Promise<{ sent: boolean; reason?: string }> {
  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('id', bookingId)
    .maybeSingle<BookingRow>();

  if (!booking) return { sent: false, reason: 'booking not found' };

  const recipient = booking.customers?.email ?? null;
  if (!recipient) {
    await log(bookingId, key, null, 'skipped', 'no email address on file');
    return { sent: false, reason: 'no email address' };
  }

  const { data: template } = await supabase
    .from('message_templates')
    .select('subject, body')
    .eq('key', key)
    .maybeSingle();

  if (!template) {
    await log(bookingId, key, recipient, 'failed', 'template missing');
    return { sent: false, reason: 'template missing' };
  }

  const vars = await templateVars(booking);
  const subject = renderTemplate(template.subject as string, vars);
  const body = renderTemplate(template.body as string, vars);

  const result = await sendMail({ to: recipient, subject, text: body });
  await log(bookingId, key, recipient, result.ok ? 'sent' : 'failed', result.error);

  return { sent: result.ok, reason: result.error };
}

export async function notifyOwnerOfRequest(bookingId: string): Promise<void> {
  const owner = process.env.OWNER_EMAIL;
  if (!owner) return;

  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('id', bookingId)
    .maybeSingle<BookingRow>();

  if (!booking) return;

  const lines = [
    'New booking request',
    '',
    `Reference: ${booking.reference}`,
    `Boat:      ${booking.boats?.name ?? '—'}`,
    `Date:      ${formatLongDate(booking.date)}`,
    `Skipper:   ${booking.skipper ? 'Yes' : 'No (self-drive)'}`,
    `Customer:  ${booking.customers?.name ?? '—'}`,
    `Phone:     ${booking.customers?.phone ?? '—'}`,
    `Email:     ${booking.customers?.email ?? '—'}`,
    `Deposit:   ${formatZar(booking.deposit_amount)} by ${booking.deposit_method === 'card' ? 'card' : 'EFT'}`,
    `Total:     ${formatZar(booking.total_amount)}`,
    '',
    `${siteUrl()}/dashboard/bookings/${booking.id}`,
  ];

  const result = await sendMail({
    to: owner,
    subject: `New booking request — ${booking.boats?.name ?? 'boat'}, ${booking.date} (${booking.reference})`,
    text: lines.join('\n'),
  });

  await log(booking.id, null, owner, result.ok ? 'sent' : 'failed', result.error);
}

async function sendMail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    // Local development without mail credentials: log instead of failing the
    // booking flow.
    console.info(`[email skipped] to=${to} subject=${subject}\n${text}`);
    return { ok: false, error: 'RESEND_API_KEY or EMAIL_FROM not configured' };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' };
  }
}

async function log(
  bookingId: string | null,
  key: TemplateKey | null,
  recipient: string | null,
  status: string,
  error?: string,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('message_log').insert({
    booking_id: bookingId,
    template_key: key,
    channel: 'email',
    recipient,
    status,
    error: error ?? null,
  });
}
