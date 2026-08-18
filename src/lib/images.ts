/** Browser-only helpers for preparing boat photos before upload. */

export const MAX_DIMENSION = 1600;
export const JPEG_QUALITY = 0.82;

/**
 * Downscales to at most MAX_DIMENSION on the long edge and re-encodes as JPEG.
 * A 6 MB phone photo lands at a few hundred KB, which keeps the public bucket
 * small and the fleet pages fast.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.');
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('We could not read that image.');

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('We could not process that image.');

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new Error('We could not process that image.');

  const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
}

/** Storage path: <boat-slug>/<timestamp>-<random>.jpg */
export function photoStoragePath(slug: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${slug || 'boat'}/${Date.now()}-${random}.jpg`;
}
