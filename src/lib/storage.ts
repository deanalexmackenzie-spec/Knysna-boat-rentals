export const BOAT_PHOTO_BUCKET = 'boat-photos';
export const DOCUMENT_BUCKET = 'documents';

/** Public URL for a photo stored in the public `boat-photos` bucket. */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${BOAT_PHOTO_BUCKET}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

export function firstPhotoUrl(paths: string[] | null | undefined): string | null {
  return photoUrl(paths?.[0]);
}
