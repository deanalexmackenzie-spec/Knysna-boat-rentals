import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { BoatForm } from '@/components/dash/BoatForm';
import { SectionCard } from '@/components/dash/ui';

export const dynamic = 'force-dynamic';

export default async function NewBoatPage() {
  await requireOwner();

  return (
    <>
      <Link
        href="/dashboard/fleet"
        className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-navy-mute hover:text-gold"
      >
        ← Fleet
      </Link>

      <p className="eyebrow mt-6">New boat</p>
      <h1 className="rule-gold mt-3 text-3xl">Add a boat</h1>
      <p className="mt-6 max-w-2xl text-sm leading-7 text-navy-soft">
        Save the details first; photos can be uploaded on the next screen.
      </p>

      <div className="mt-8 max-w-3xl">
        <SectionCard eyebrow="Details" title="Boat details">
          <BoatForm
            boatId={null}
            initial={{
              name: '',
              slug: '',
              description: '',
              capacity: 6,
              power: '',
              length_m: 5.5,
              day_rate: 0,
              skipper_rate: 1450,
              sort_order: 0,
              active: true,
            }}
          />
        </SectionCard>
      </div>
    </>
  );
}
