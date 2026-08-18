import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers';

/**
 * Request-scoped client that carries the owner's auth cookie. Subject to RLS —
 * anonymous callers see only the public policies (fleet, blocked dates, copy).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — the middleware refreshes the
            // session cookie instead, so this is safe to ignore.
          }
        },
      },
    },
  );
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
