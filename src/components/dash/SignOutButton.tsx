'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push('/login');
        router.refresh();
      }}
      className="border border-white/20 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/60 transition-colors hover:border-champagne hover:text-champagne"
    >
      Sign out
    </button>
  );
}
