'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard', label: 'Bookings' },
  { href: '/dashboard/calendar', label: 'Openings' },
  { href: '/dashboard/clients', label: 'Client log' },
  { href: '/dashboard/fleet', label: 'Fleet' },
  { href: '/dashboard/templates', label: 'Auto-replies' },
  { href: '/dashboard/content', label: 'Terms & copy' },
];

export function DashNav() {
  const pathname = usePathname();

  return (
    <nav className="border-t border-white/10">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3">
        {TABS.map((tab) => {
          const active =
            tab.href === '/dashboard'
              ? pathname === '/dashboard' || pathname.startsWith('/dashboard/bookings')
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                active
                  ? 'border-gold text-champagne'
                  : 'border-transparent text-white/45 hover:text-white/80'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
