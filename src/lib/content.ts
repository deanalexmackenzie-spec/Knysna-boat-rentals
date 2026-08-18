import { createClient } from '@/lib/supabase/server';
import type { SiteContent } from '@/lib/types';

/**
 * Fallbacks keep the site renderable before `supabase/seed.sql` has been run
 * (and if Supabase is briefly unreachable). The seeded copy is authoritative.
 */
const FALLBACKS: Record<string, { title: string; body: string }> = {
  terms: {
    title: 'Rental Terms & Conditions',
    body: 'The rental terms have not been published yet. Please contact us for a copy.',
  },
  indemnity: {
    title: 'Indemnity, Waiver & Release',
    body: 'The indemnity, waiver and release has not been published yet. Please contact us for a copy.',
  },
  banking: { title: 'EFT / Banking Details', body: 'Banking details available on request.' },
  privacy: { title: 'Privacy Notice', body: 'Privacy notice coming shortly.' },
  safety: { title: 'On the water — safety', body: 'Safety information coming shortly.' },
  emergency: { title: 'Emergency numbers', body: 'NSRI Knysna — 087 094 9774' },
  knysna: { title: 'Knysna & the lagoon', body: '' },
};

export async function getContent(key: string): Promise<{ title: string; body: string }> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('site_content')
      .select('title, body')
      .eq('key', key)
      .maybeSingle<Pick<SiteContent, 'title' | 'body'>>();

    if (data?.body) return { title: data.title || FALLBACKS[key]?.title || key, body: data.body };
  } catch {
    // fall through to the static copy
  }
  return FALLBACKS[key] ?? { title: key, body: '' };
}

export async function getContentMany(
  keys: string[],
): Promise<Record<string, { title: string; body: string }>> {
  const entries = await Promise.all(
    keys.map(async (key) => [key, await getContent(key)] as const),
  );
  return Object.fromEntries(entries);
}
