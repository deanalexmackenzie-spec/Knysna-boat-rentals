'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeBoatPhoto, setBoatPhotos } from '@/app/dashboard/actions';
import { createClient } from '@/lib/supabase/client';
import { compressImage, photoStoragePath, MAX_DIMENSION } from '@/lib/images';
import { BOAT_PHOTO_BUCKET, photoUrl } from '@/lib/storage';

interface Props {
  boatId: string;
  slug: string;
  paths: string[];
}

/**
 * Photos are chosen from the device (picker or drag-and-drop) — there is no way
 * to paste a URL. Each file is resized and re-encoded in the browser, uploaded
 * to Supabase Storage, and only the storage path is written to the boat row.
 */
export function PhotoManager({ boatId, slug, paths }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (list.length === 0) {
      setError('Please choose image files.');
      return;
    }

    setError(null);
    setBusy(true);

    const supabase = createClient();
    const uploaded: string[] = [];

    try {
      for (const [index, file] of list.entries()) {
        setProgress(`Processing ${index + 1} of ${list.length}…`);
        const compressed = await compressImage(file);
        const path = photoStoragePath(slug);

        const { error: uploadError } = await supabase.storage
          .from(BOAT_PHOTO_BUCKET)
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: false });

        if (uploadError) throw new Error(uploadError.message);
        uploaded.push(path);
      }

      const result = await setBoatPhotos(boatId, [...paths, ...uploaded]);
      if (!result.ok) throw new Error(result.message ?? 'Could not save the photos.');

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= paths.length) return;
    const next = [...paths];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    startTransition(async () => {
      await setBoatPhotos(boatId, next);
      router.refresh();
    });
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? 'border-gold bg-gold-tint' : 'border-rule bg-page'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
          }}
        />
        <p className="text-sm text-navy-soft">
          Drag photos here, or choose them from your device.
        </p>
        <button
          type="button"
          className="btn-gold mt-5"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Uploading…' : 'Choose photos'}
        </button>
        <p className="mt-4 text-xs text-navy-mute">
          Resized to {MAX_DIMENSION}px and re-encoded as JPEG in your browser before uploading.
        </p>
        {progress && <p className="mt-2 text-xs text-gold">{progress}</p>}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      {paths.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((path, index) => (
            <figure key={path} className="border border-rule bg-white">
              <div className="aspect-[4/3] overflow-hidden bg-page">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(path) ?? ''}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-navy-mute">
                  {index === 0 ? 'Cover' : `Photo ${index + 1}`}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1"
                    disabled={pending || index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label="Move earlier"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1"
                    disabled={pending || index === paths.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label="Move later"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className="btn-ghost !px-2 !py-1"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm('Remove this photo?')) return;
                      startTransition(async () => {
                        await removeBoatPhoto(boatId, path);
                        router.refresh();
                      });
                    }}
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
