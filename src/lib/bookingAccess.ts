import { createAdminClient } from '@/lib/supabase/admin';
import type { Booking, BookingDocument, DocumentType } from '@/lib/types';

export interface BookingView extends Booking {
  boats: { id: string; name: string; slug: string; day_rate: number; skipper_rate: number } | null;
  customers: { id: string; name: string; email: string | null; phone: string } | null;
}

const SELECT =
  '*, boats(id, name, slug, day_rate, skipper_rate), customers(id, name, email, phone)';

/**
 * Loads a booking from its reference, but only when the caller presents the
 * matching access token from their private link. Comparison is constant-time.
 */
export async function getBookingForCustomer(
  reference: string,
  token: string | undefined,
): Promise<BookingView | null> {
  if (!token) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('bookings')
    .select(SELECT)
    .eq('reference', reference.toUpperCase())
    .maybeSingle<BookingView>();

  if (!data) return null;
  if (!constantTimeEqual(data.access_token, token)) return null;
  return data;
}

export async function getBookingDocuments(bookingId: string): Promise<BookingDocument[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('booking_id', bookingId)
    .order('uploaded_at', { ascending: true });
  return (data ?? []) as BookingDocument[];
}

export function requiredDocumentTypes(skipper: boolean): DocumentType[] {
  return skipper ? ['id'] : ['id', 'skipper_licence'];
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
