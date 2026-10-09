/**
 * Uploads without a server. The real app does: presign → PUT bytes to S3 →
 * register the object. In the demo:
 *   • `presign()` mints `{ uploadUrl, publicUrl, s3Key }` using fake schemes;
 *   • the client's `uploadToPresigned` (demo branch) reads the file as a data
 *     URL and calls `putBlob(s3Key, …)`;
 *   • the register handler calls `resolveBlobUrl(s3Key)` and stores the
 *     returned data URL as the record's `url`, so the image/file really shows.
 * Blobs live in a normal table, so they persist in the visitor's overlay.
 */
import { tbl } from './db';
import { posterDataUri } from './assets';
import { newId } from './prng';

export interface BlobRec {
  id: string; // s3Key
  dataUrl: string;
  mime: string;
  bytes: number;
}

const blobs = () => tbl<BlobRec>('blobs');

/** Largest file we inline as a data URL (larger ones get a labelled placeholder). */
export const MAX_INLINE_BYTES = 6 * 1024 * 1024;

export const UPLOAD_SCHEME = 'demo-upload://';
export const BLOB_SCHEME = 'demo-blob://';

export interface Presigned {
  uploadUrl: string;
  expiresIn: number;
  s3Key: string;
  publicUrl: string;
  contentType: string;
}

export function presign(scope: string, filename: string, contentType: string): Presigned {
  const safe = filename.replace(/[^\w.\-]+/g, '_').slice(-60) || 'file';
  const s3Key = `${scope}/${newId('up')}/${safe}`;
  return {
    uploadUrl: `${UPLOAD_SCHEME}${s3Key}`,
    expiresIn: 900,
    s3Key,
    publicUrl: `${BLOB_SCHEME}${s3Key}`,
    contentType,
  };
}

export function s3KeyFromUrl(u: string): string | null {
  if (u.startsWith(UPLOAD_SCHEME)) return u.slice(UPLOAD_SCHEME.length);
  if (u.startsWith(BLOB_SCHEME)) return u.slice(BLOB_SCHEME.length);
  return null;
}

/** Called by the client after "uploading". */
export function putBlob(s3Key: string, dataUrl: string, mime: string, bytes: number): void {
  blobs().insert({ id: s3Key, dataUrl, mime, bytes });
}

/** The renderable URL for an uploaded object (data URL), or a placeholder if absent. */
export function resolveBlobUrl(s3KeyOrUrl: string, fallbackLabel = 'File'): string {
  const key = s3KeyFromUrl(s3KeyOrUrl) ?? s3KeyOrUrl;
  const b = blobs().get(key);
  return b ? b.dataUrl : posterDataUri(fallbackLabel, key);
}

export function blobBytes(s3Key: string): number | null {
  return blobs().get(s3Key)?.bytes ?? null;
}

/** Browser side: read a File into a data URL (or a placeholder when huge). */
export async function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_INLINE_BYTES) return posterDataUri(file.name.slice(0, 24), file.name);
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
