import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Every dashboard page and server action calls this before touching data. The
 * proxy already redirects unauthenticated browsers, but server actions are
 * separately reachable, so the check is repeated here rather than assumed.
 */
export async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  return user;
}
