import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { SignOutButton } from '@/components/dash/SignOutButton';
import { DashNav } from '@/components/dash/DashNav';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOwner();

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-rule bg-navy-deep">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/dashboard">
            <span className="block font-display text-lg text-white">Knysna Boat Rentals</span>
            <span className="mt-0.5 block text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-champagne">
              Owner dashboard
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <span className="hidden text-xs text-white/45 sm:inline">{user.email}</span>
            <Link
              href="/"
              className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-champagne"
            >
              View site
            </Link>
            <SignOutButton />
          </div>
        </div>
        <DashNav />
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10">{children}</main>
    </div>
  );
}
