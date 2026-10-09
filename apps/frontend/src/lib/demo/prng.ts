/**
 * Deterministic pseudo-random helpers. Seed data must be identical on every
 * page load so ids that the visitor's saved edits point at stay valid.
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Uniformly pick one element. */
  pick<T>(arr: readonly T[]): T;
  /** Pick `n` distinct elements (order randomised). */
  sample<T>(arr: readonly T[], n: number): T[];
  /** Fisher-Yates copy. */
  shuffle<T>(arr: readonly T[]): T[];
  /** true with probability p. */
  chance(p: number): boolean;
  /** Weighted pick: `[value, weight][]`. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T;
  /** Float in [min, max). */
  range(min: number, max: number): number;
}

/** FNV-1a 32-bit string hash. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 */
export function createRng(seed: number | string): Rng {
  let a = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const rng: Rng = {
    next,
    int,
    range: (min, max) => min + next() * (max - min),
    pick: (arr) => arr[Math.floor(next() * arr.length)]!,
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    sample: (arr, n) => rng.shuffle(arr).slice(0, Math.min(n, arr.length)),
    weighted: (entries) => {
      let total = 0;
      for (const [, w] of entries) total += w;
      let r = next() * total;
      for (const [v, w] of entries) {
        r -= w;
        if (r <= 0) return v;
      }
      return entries[entries.length - 1]![0];
    },
  };
  return rng;
}

/** Zero-padded sequential id: `seqId('task', 42)` → `task_000042`. */
export function seqId(prefix: string, n: number, width = 5): string {
  return `${prefix}_${String(n).padStart(width, '0')}`;
}

/** Random id for records the visitor creates at runtime (never collides with seqIds). */
export function newId(prefix: string): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += b.toString(36).padStart(2, '0');
  return `${prefix}_x${s.slice(0, 14)}`;
}

/** Lowercase url slug. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
