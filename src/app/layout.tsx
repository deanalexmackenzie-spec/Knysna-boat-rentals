import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Knysna Boat Rentals — full-day boat hire on the lagoon',
    template: '%s · Knysna Boat Rentals',
  },
  description:
    'Full-day boat hire on the Knysna estuary. Six boats, self-drive or with a skipper, from the moorings on the waterfront.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
