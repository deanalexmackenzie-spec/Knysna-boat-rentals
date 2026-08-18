import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingEmail } from '@/lib/notifications';
import { evaluateDocs } from '@/lib/bookings';
import { addDays, todayIso } from '@/lib/dates';
import { DOCUMENT_BUCKET } from '@/lib/storage';
import type { BookingStatus, DocumentType, TemplateKey } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Scheduled job — see `vercel.json` for the schedule.
 *
 *   1. Deposit reminder   — deposit still unpaid N hours after the request.
 *   2. Documents reminder — anything missing N days before the trip.
 *   3. Close off trips that have been and gone.
 *   4. POPIA retention    — purge documents N days after the trip.
 *
 * Each reminder is sent at most once per booking; message_log is the ledger.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  const authorised =
    request.headers.get('authorization') === `Bearer ${secret}` ||
    new URL(request.url).searchParams.get('secret') === secret;

  if (!authorised) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const supabase = createAdminClient();
  const today = todayIso();

  const { data: settingsRow } = await supabase
    .from('settings')
    .select('deposit_reminder_hours, docs_reminder_days, doc_retention_days')
    .maybeSingle();

  const depositAfterHours = Number(settingsRow?.deposit_reminder_hours ?? 48);
  const docsBeforeDays = Number(settingsRow?.docs_reminder_days ?? 3);
  const retentionDays = Number(settingsRow?.doc_retention_days ?? 30);

  const summary = { depositReminders: 0, docsReminders: 0, completed: 0, purged: 0 };

  // ─── Live bookings from today onwards ─────────────────────────────────────
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, date, skipper, indemnity_signed, deposit_status, status, created_at')
    .gte('date', today)
    .not('status', 'in', '(cancelled,completed)');

  const live = (bookings ?? []) as {
    id: string;
    date: string;
    skipper: boolean;
    indemnity_signed: boolean;
    deposit_status: string;
    status: BookingStatus;
    created_at: string;
  }[];

  const docsCutoff = addDays(today, docsBeforeDays);
  const depositCutoff = Date.now() - depositAfterHours * 3600 * 1000;

  for (const booking of live) {
    if (
      booking.deposit_status !== 'paid' &&
      new Date(booking.created_at).getTime() <= depositCutoff &&
      !(await alreadySent(booking.id, 'deposit'))
    ) {
      const result = await sendBookingEmail(booking.id, 'deposit');
      if (result.sent) summary.depositReminders++;
    }

    if (booking.date <= docsCutoff && !(await alreadySent(booking.id, 'docs'))) {
      const { data: documents } = await supabase
        .from('documents')
        .select('type')
        .eq('booking_id', booking.id);

      const docs = evaluateDocs(booking, (documents ?? []) as { type: DocumentType }[]);
      if (!docs.complete) {
        const result = await sendBookingEmail(booking.id, 'docs');
        if (result.sent) summary.docsReminders++;
      }
    }
  }

  // ─── Close off trips that have passed ─────────────────────────────────────
  const { data: past } = await supabase
    .from('bookings')
    .select('id')
    .lt('date', today)
    .in('status', ['confirmed', 'balance_due', 'deposit_paid', 'docs_received']);

  for (const booking of (past ?? []) as { id: string }[]) {
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id);
    summary.completed++;
  }

  // ─── POPIA retention: purge documents after the hire ──────────────────────
  const purgeBefore = addDays(today, -retentionDays);

  const { data: expired } = await supabase
    .from('bookings')
    .select('id')
    .lt('date', purgeBefore)
    .is('docs_purged_at', null);

  for (const booking of (expired ?? []) as { id: string }[]) {
    const { data: documents } = await supabase
      .from('documents')
      .select('id, file_path')
      .eq('booking_id', booking.id);

    const rows = (documents ?? []) as { id: string; file_path: string }[];

    if (rows.length > 0) {
      await supabase.storage.from(DOCUMENT_BUCKET).remove(rows.map((row) => row.file_path));
      await supabase
        .from('documents')
        .delete()
        .in('id', rows.map((row) => row.id));
      summary.purged += rows.length;
    }

    await supabase
      .from('bookings')
      .update({ docs_purged_at: new Date().toISOString() })
      .eq('id', booking.id);
  }

  return NextResponse.json({ ok: true, ...summary });
}

async function alreadySent(bookingId: string, key: TemplateKey): Promise<boolean> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('message_log')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', bookingId)
    .eq('template_key', key)
    .eq('status', 'sent');

  return (count ?? 0) > 0;
}
