import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/dash/LoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Owner login',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-deep px-5 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="font-display text-2xl text-white">
            Knysna Boat Rentals
          </Link>
          <p className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-champagne">
            Owner dashboard
          </p>
        </div>

        <div className="mt-10 bg-white px-8 py-9 shadow-lift">
          <LoginForm next={next ?? '/dashboard'} />
        </div>

        <p className="mt-8 text-center text-xs text-white/40">
          <Link href="/" className="hover:text-champagne">
            ← Back to the site
          </Link>
        </p>
      </div>
    </div>
  );
}
