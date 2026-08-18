import Link from 'next/link';
import { IndemnityModal } from '@/components/site/IndemnityModal';

const LINKS = [
  { href: '/fleet', label: 'The fleet' },
  { href: '/knysna', label: 'Knysna & the lagoon' },
  { href: '/safety', label: 'Lagoon map & safety' },
  { href: '/terms', label: 'Rental terms' },
  { href: '/privacy', label: 'Privacy notice' },
];

export function Footer({
  indemnityTitle,
  indemnityBody,
}: {
  indemnityTitle: string;
  indemnityBody: string;
}) {
  return (
    <footer className="bg-navy-deep text-white/70">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <p className="font-display text-xl text-white">Knysna Boat Rentals</p>
          <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-champagne">
            Est. on the lagoon
          </p>
          <p className="mt-6 max-w-sm text-sm leading-7">
            Full-day boat hire on the Knysna estuary. Six boats, self-drive or skippered, from the
            moorings on the waterfront.
          </p>
        </div>

        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-champagne">
            Explore
          </p>
          <ul className="mt-5 space-y-3">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm transition-colors hover:text-champagne">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-champagne">
            Get in touch
          </p>
          <ul className="mt-5 space-y-3 text-sm">
            <li>Knysna Waterfront, Western Cape</li>
            <li>
              <a href="tel:+27000000000" className="transition-colors hover:text-champagne">
                +27 (0)00 000 0000
              </a>
            </li>
            <li>
              <a
                href="mailto:bookings@yourdomain.co.za"
                className="transition-colors hover:text-champagne"
              >
                bookings@yourdomain.co.za
              </a>
            </li>
            <li className="pt-2">
              <Link
                href="/login"
                className="text-[0.7rem] uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-champagne"
              >
                Owner login
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-[0.7rem] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/40">
            © {new Date().getFullYear()} Knysna Boat Rentals. All rights reserved.
          </p>
          {/* Discreet indemnity link, as specified. */}
          <IndemnityModal
            title={indemnityTitle}
            body={indemnityBody}
            variant="footer"
            label="Indemnity, waiver & release"
          />
        </div>
      </div>
    </footer>
  );
}
