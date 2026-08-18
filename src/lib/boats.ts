import { createClient } from '@/lib/supabase/server';
import type { Boat } from '@/lib/types';

export async function listBoats(): Promise<Boat[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('boats')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    return (data ?? []) as Boat[];
  } catch {
    return [];
  }
}

export async function getBoatBySlug(slug: string): Promise<Boat | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('boats')
      .select('*')
      .eq('slug', slug)
      .eq('active', true)
      .maybeSingle<Boat>();
    return data ?? null;
  } catch {
    return null;
  }
}
