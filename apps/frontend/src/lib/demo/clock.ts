/**
 * Seed timestamps are generated relative to "now" at page load so the demo
 * always looks freshly active ("updated 2 hours ago"), never stale.
 */

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

let anchor = Date.now();

/** Re-anchor (called once by the boot sequence, before seeding). */
export function setSeedNow(ts: number) {
  anchor = ts;
}

/** The instant all seed data is relative to. */
export function seedNow(): number {
  return anchor;
}

/** ISO string `ms` milliseconds before the seed anchor. */
export function agoIso(ms: number): string {
  return new Date(anchor - ms).toISOString();
}

/** ISO string `ms` milliseconds after the seed anchor. */
export function fromNowIso(ms: number): string {
  return new Date(anchor + ms).toISOString();
}

export function iso(ts: number): string {
  return new Date(ts).toISOString();
}

/** Current wall-clock time as ISO (for records created at runtime). */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Start (00:00 UTC) of the seed day. */
export function seedDayStart(): number {
  const d = new Date(anchor);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** True if a business hour roughly 9-18 UTC, used to make timestamps look human. */
export function businessHourize(ts: number): number {
  const d = new Date(ts);
  const h = d.getUTCHours();
  if (h >= 8 && h <= 19) return ts;
  d.setUTCHours(9 + (h % 9), d.getUTCMinutes(), 0, 0);
  return d.getTime();
}
