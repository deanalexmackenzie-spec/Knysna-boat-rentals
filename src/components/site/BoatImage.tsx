import { firstPhotoUrl } from '@/lib/storage';

/**
 * Boat photograph, or a navy/gold placeholder when the owner has not uploaded
 * one yet. Photos come from Supabase Storage, so the host is only known at
 * runtime — a plain <img> avoids build-time image-domain configuration.
 */
export function BoatImage({
  paths,
  name,
  className = '',
  zoom = false,
}: {
  paths: string[] | null | undefined;
  name: string;
  className?: string;
  zoom?: boolean;
}) {
  const url = firstPhotoUrl(paths);

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center bg-[linear-gradient(140deg,#1a3050_0%,#14273f_55%,#0e1c30_100%)] px-6 text-center ${className}`}
      >
        <span className="font-display text-2xl tracking-wide text-champagne/80">{name}</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      loading="lazy"
      className={`h-full w-full object-cover ${
        zoom ? 'transition-transform duration-700 ease-out group-hover:scale-105' : ''
      } ${className}`}
    />
  );
}
