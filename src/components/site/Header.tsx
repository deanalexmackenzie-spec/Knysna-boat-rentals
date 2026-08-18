'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/fleet', label: 'The Fleet' },
  { href: '/knysna', label: 'Knysna & the Lagoon' },
  { href: '/safety', label: 'Safety' },
  { href: '/terms', label: 'Terms' },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="group" onClick={() => setOpen(false)}>
          <span className="block font-display text-lg leading-none tracking-wide text-navy sm:text-xl">
            Knysna Boat Rentals
          </span>
          <span className="mt-1 block text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-gold">
            Est. on the lagoon
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[0.7rem] font-semibold uppercase tracking-[0.16em] transition-colors ${
                pathname === item.href ? 'text-gold' : 'text-navy-soft hover:text-gold'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/fleet" className="btn-gold !px-6 !py-3">
            Book a boat
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle navigation"
          className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] border border-rule lg:hidden"
        >
          <span className="block h-px w-5 bg-navy" />
          <span className="block h-px w-5 bg-navy" />
          <span className="block h-px w-5 bg-navy" />
        </button>
      </div>

      {open && (
        <nav className="border-t border-rule bg-white px-5 pb-6 pt-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block border-b border-rule py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-navy-soft"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/fleet" onClick={() => setOpen(false)} className="btn-gold mt-5 w-full">
            Book a boat
          </Link>
        </nav>
      )}
    </header>
  );
}
