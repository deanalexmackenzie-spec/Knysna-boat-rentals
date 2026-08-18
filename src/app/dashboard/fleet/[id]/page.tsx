import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { BoatForm } from '@/components/dash/BoatForm';
import { PhotoManager } from '@/components/dash/PhotoManager';
import { ActionButton, SectionCard } from '@/components/dash/ui';
import { deleteBoat } from '@/app/dashboard/actions';
import type { Boat } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditBoatPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  const supabase = createAdminClient();
  const { data } = await supabase.from('boats').select('*').eq('id', id).maybeSingle<Boat>();
  if (!data) notFound();

  const boat = data;

  return (
    <>
      <Link
        href="/dashboard/fleet"
        className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-navy-mute hover:text-gold"
      >
        ← Fleet
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Edit boat</p>
          <h1 className="rule-gold mt-3 text-3xl">{boat.name}</h1>
        </div>
        <Link
          href={`/fleet/${boat.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
        >
          View on the site
        </Link>
      </div>

      <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <SectionCard eyebrow="Details" title="Boat details">
          <BoatForm
            boatId={boat.id}
            initial={{
              name: boat.name,
              slug: boat.slug,
              description: boat.description,
              capacity: boat.capacity,
              power: boat.power,
              length_m: Number(boat.length_m),
              day_rate: Number(boat.day_rate),
              skipper_rate: Number(boat.skipper_rate),
              sort_order: boat.sort_order,
              active: boat.active,
            }}
          />
        </SectionCard>

        <div className="space-y-6">
          <SectionCard eyebrow="Gallery" title="Photos">
            <PhotoManager
              boatId={boat.id}
              slug={boat.slug}
              paths={boat.photo_paths ?? []}
            />
          </SectionCard>

          <SectionCard eyebrow="Careful" title="Remove this boat">
            <p className="text-sm leading-6 text-navy-soft">
              A boat with bookings against it cannot be deleted — hide it from the site instead, so
              the history stays intact.
            </p>
            <div className="mt-5">
              <ActionButton
                label="Delete boat"
                confirm={`Delete ${boat.name}? This cannot be undone.`}
                action={async () => {
                  'use server';
                  return deleteBoat(boat.id);
                }}
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
