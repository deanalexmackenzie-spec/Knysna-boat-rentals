import Link from 'next/link';

/** Light-gold band that sits directly above the footer on every public page. */
export function CtaBand() {
  return (
    <section className="border-y border-[#efe3c9] bg-gold-tint">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-5 py-16 text-center sm:py-20">
        <p className="eyebrow">A day on the water</p>
        <h2 className="rule-gold rule-gold-center mt-4 text-3xl sm:text-4xl">
          Pick your boat, pick your day
        </h2>
        <p className="mt-7 max-w-xl text-[0.95rem] leading-7 text-navy-soft">
          Full-day hire, self-drive or with one of our skippers. A 50% deposit holds the date —
          card or EFT — and the balance is settled when you collect.
        </p>
        <Link href="/fleet" className="btn-gold mt-9">
          See the fleet &amp; availability
        </Link>
      </div>
    </section>
  );
}
