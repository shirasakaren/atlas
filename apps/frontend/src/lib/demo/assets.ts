/**
 * Self-contained imagery (SVG data URIs): avatars and project cover art are
 * generated, so the demo has no dependency on external image hosts.
 */
import { hashString, createRng } from './prng';

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const AVATAR_HUES = [212, 168, 28, 350, 262, 190, 140, 24, 310, 96];

export function initialsOf(name: string): string {
  const parts = name.replace(/[^\p{L}\s'-]/gu, '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Deterministic initials avatar (gradient disc). */
export function avatarDataUri(name: string, seed: string = name): string {
  const h = hashString(seed);
  const hue = AVATAR_HUES[h % AVATAR_HUES.length]!;
  const hue2 = (hue + 28 + (h % 24)) % 360;
  const text = initialsOf(name);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue} 62% 46%)"/><stop offset="1" stop-color="hsl(${hue2} 66% 36%)"/>` +
    `</linearGradient></defs><rect width="96" height="96" fill="url(#g)"/>` +
    `<text x="48" y="48" dy=".35em" text-anchor="middle" font-family="Inter,Segoe UI,Arial,sans-serif" ` +
    `font-size="38" font-weight="600" fill="#fff" fill-opacity=".95">${text}</text></svg>`;
  return svgDataUri(svg);
}

const PALETTES: [string, string, string][] = [
  ['#1d4ed8', '#38bdf8', '#e0f2fe'],
  ['#0f766e', '#34d399', '#d1fae5'],
  ['#b45309', '#fbbf24', '#fef3c7'],
  ['#be123c', '#fb7185', '#ffe4e6'],
  ['#4338ca', '#a78bfa', '#ede9fe'],
  ['#0e7490', '#22d3ee', '#cffafe'],
  ['#15803d', '#a3e635', '#ecfccb'],
  ['#9d174d', '#f472b6', '#fce7f3'],
  ['#1e293b', '#64748b', '#e2e8f0'],
  ['#c2410c', '#fb923c', '#ffedd5'],
];

/**
 * Abstract project cover art: layered gradient + geometric motif. `variant`
 * yields different compositions for gallery images of the same project.
 */
export function coverDataUri(seed: string, variant = 0, w = 1200, h = 675): string {
  const hs = hashString(`${seed}#${variant}`);
  const rng = createRng(hs);
  const [c1, c2, c3] = PALETTES[hs % PALETTES.length]!;
  const motif = (hs >>> 5) % 4;
  let shapes = '';
  if (motif === 0) {
    for (let i = 0; i < 9; i++) {
      const r = rng.int(40, 220);
      shapes += `<circle cx="${rng.int(0, w)}" cy="${rng.int(0, h)}" r="${r}" fill="#fff" fill-opacity="${(rng.range(0.05, 0.16)).toFixed(2)}"/>`;
    }
  } else if (motif === 1) {
    for (let i = 0; i < 14; i++) {
      const x = rng.int(-100, w);
      const s = rng.int(60, 260);
      shapes += `<rect x="${x}" y="${rng.int(-50, h)}" width="${s}" height="${s}" rx="${rng.int(0, 40)}" fill="#fff" fill-opacity="${rng.range(0.05, 0.14).toFixed(2)}" transform="rotate(${rng.int(0, 90)} ${x} ${h / 2})"/>`;
    }
  } else if (motif === 2) {
    for (let i = 0; i < 7; i++) {
      const y = (h / 7) * i + rng.int(-20, 20);
      shapes += `<path d="M0 ${y} C ${w * 0.3} ${y - rng.int(60, 180)}, ${w * 0.6} ${y + rng.int(60, 180)}, ${w} ${y}" stroke="#fff" stroke-opacity="${rng.range(0.12, 0.3).toFixed(2)}" stroke-width="${rng.int(10, 40)}" fill="none"/>`;
    }
  } else {
    const step = rng.int(60, 110);
    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        if (rng.chance(0.45)) {
          shapes += `<rect x="${x + 6}" y="${y + 6}" width="${step - 12}" height="${step - 12}" rx="10" fill="#fff" fill-opacity="${rng.range(0.06, 0.2).toFixed(2)}"/>`;
        }
      }
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">` +
    `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".62" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#a)"/>${shapes}</svg>`;
  return svgDataUri(svg);
}

/** Small placeholder "file thumbnail" / attachment poster. */
export function posterDataUri(label: string, seed: string, w = 640, h = 360): string {
  const hs = hashString(seed);
  const [c1, c2] = PALETTES[hs % PALETTES.length]!;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#a)"/>` +
    `<text x="${w / 2}" y="${h / 2}" dy=".35em" text-anchor="middle" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="${Math.round(h / 9)}" font-weight="600" fill="#fff" fill-opacity=".9">${label.replace(/[<&>]/g, '')}</text></svg>`;
  return svgDataUri(svg);
}
