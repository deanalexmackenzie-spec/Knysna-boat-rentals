import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BookingBox } from '@/components/site/BookingBox';
import { BoatImage } from '@/components/site/BoatImage';
import { getBoatBySlug } from '@/lib/boats';
import { getContent } from '@/lib/content';
import { unavailableDates } from '@/lib/bookings';
import { formatZar, quote } from '@/lib/pricing';
import { photoUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const boat = await getBoatBySlug(slug);
  if (!boat) return { title: 'Boat not found' };
  return {
    title: boat.name,
    description: boat.description.slice(0, 160),
  };
}

export default async function BoatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const boat = await getBoatBySlug(slug);
  if (!boat) notFound();

  const [unavailable, indemnity] = await Promise.all([
    unavailableDates(boat.id).catch(() => [] as string[]),
    getContent('indemnity'),
  ]);

  const selfDrive = quote(Number(boat.day_rate), Number(boat.skipper_rate), false);
  const skippered = quote(Number(boat.day_rate), Number(boat.skipper_rate), true);
  const gallery = (boat.photo_paths ?? []).slice(1, 5);

  return (
    <>
      <section className="border-b border-rule bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:pt-14">
          <Link
            href="/fleet"
            className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-navy-mute transition-colors hover:text-gold"
          >
            ← All boats
          </Link>

          <div className="mt-7 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-start">
            <div>
              <div className="aspect-[16/10] overflow-hidden">
                <BoatImage paths={boat.photo_paths} name={boat.name} className="h-full w-full" />
              </div>

              {gallery.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {gallery.map((path) => (
                    <div key={path} className="aspect-[4/3] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl(path) ?? ''}
                        alt={boat.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:pt-2">
              <p className="eyebrow">Knysna lagoon · full day</p>
              <h1 className="rule-gold mt-4 text-4xl sm:text-5xl">{boat.name}</h1>
              <p className="mt-7 text-[0.95rem] leading-7 text-navy-soft">{boat.description}</p>

              <dl className="mt-9 grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3">
                <Spec label="Guests" value={String(boat.capacity)} />
                <Spec label="Length" value={`${Number(boat.length_m).toFixed(1)} m`} />
                <Spec label="Power" value={boat.power} />
              </dl>

              <div className="mt-8 grid gap-px border border-rule bg-rule sm:grid-cols-2">
                <PriceCell
                  label="Self-drive, full day"
                  total={formatZar(selfDrive.total)}
                  deposit={formatZar(selfDrive.deposit)}
                />
                <PriceCell
                  label="With a skipper, full day"
                  total={formatZar(skippered.total)}
                  deposit={formatZar(skippered.deposit)}
                />
              </div>

              <p className="mt-6 text-xs leading-6 text-navy-mute">
                Day rate only — we do not hire by the hour or half day. A refundable security
                deposit and fuel are settled on collection; see the{' '}
                <Link href="/terms" className="text-gold underline underline-offset-4">
                  rental terms
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
        <BookingBox
          boat={{
            id: boat.id,
            name: boat.name,
            day_rate: Number(boat.day_rate),
            skipper_rate: Number(boat.skipper_rate),
          }}
          unavailable={unavailable}
          indemnityTitle={indemnity.title}
          indemnityBody={indemnity.body}
        />
      </section>
    </>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-navy-mute">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-navy">{value}</dd>
    </div>
  );
}

function PriceCell({
  label,
  total,
  deposit,
}: {
  label: string;
  total: string;
  deposit: string;
}) {
  return (
    <div className="bg-white px-5 py-5">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-navy-mute">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl text-navy">{total}</p>
      <p className="mt-1 text-xs text-navy-soft">{deposit} deposit secures the date</p>
    </div>
  );
}
