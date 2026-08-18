import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBookingForCustomer } from '@/lib/bookingAccess';
import { refreshBookingStatus } from '@/lib/bookings';
import { DOCUMENT_BUCKET } from '@/lib/storage';
import type { DocumentType } from '@/lib/types';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const ALLOWED_TYPES: DocumentType[] = ['id', 'skipper_licence', 'drivers_licence'];

/**
 * Customer document upload. Files go straight into the private `documents`
 * bucket using the service-role key — they are never publicly readable, and are
 * only ever served to the owner through short-lived signed URLs.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return bad('Malformed upload.');

  const reference = String(form.get('reference') ?? '').trim();
  const token = String(form.get('token') ?? '').trim();
  const type = String(form.get('type') ?? '') as DocumentType;
  const file = form.get('file');

  if (!reference || !token) return forbidden();
  if (!ALLOWED_TYPES.includes(type)) return bad('Unknown document type.');
  if (!(file instanceof File)) return bad('Please choose a file.');
  if (file.size === 0) return bad('That file is empty.');
  if (file.size > MAX_BYTES) return bad('That file is larger than 10 MB.');
  if (!ALLOWED_MIME.includes(file.type)) {
    return bad('Please upload a JPG, PNG, WEBP or PDF.');
  }

  const booking = await getBookingForCustomer(reference, token);
  if (!booking) return forbidden();

  const supabase = createAdminClient();
  const extension = extensionFor(file);
  const path = `${booking.id}/${type}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (uploadError) return fail('We could not store that file. Please try again.');

  // One current file per document type — replace any earlier upload.
  const { data: previous } = await supabase
    .from('documents')
    .select('id, file_path')
    .eq('booking_id', booking.id)
    .eq('type', type);

  const { error: insertError } = await supabase.from('documents').insert({
    booking_id: booking.id,
    type,
    file_path: path,
    file_name: file.name.slice(0, 200),
  });

  if (insertError) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
    return fail('We could not record that file. Please try again.');
  }

  if (previous?.length) {
    await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove(previous.map((row) => row.file_path as string));
    await supabase
      .from('documents')
      .delete()
      .in('id', previous.map((row) => row.id as string));
  }

  await refreshBookingStatus(booking.id);
  return NextResponse.json({ ok: true });
}

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type === 'application/pdf' ? 'pdf' : 'jpg';
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function forbidden() {
  return NextResponse.json({ error: 'This link is not valid.' }, { status: 403 });
}

function fail(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}
