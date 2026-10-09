/**
 * Static export pre-renders every dynamic route ONCE with the placeholder
 * value `_` (see `ROUTE_PLACEHOLDER`). Real ids/slugs only ever exist in the
 * URL bar, so:
 *   • RSC fetches for `/projects/foo/lists/bar/list` are rewritten to the
 *     placeholder page (`/projects/_/lists/_/list`)   → `toPlaceholderPath`
 *   • `useParams()` reads the real values back out of the URL → `matchParams`
 *
 * Keep this in sync with the dynamic page routes under `src/app`.
 */
import { ROUTE_PLACEHOLDER } from './config';

/** Every page route that contains a dynamic segment or sits beside one. */
export const PAGE_ROUTES = [
  '/projects/new',
  '/projects/[slug]',
  '/projects/[slug]/manage',
  '/projects/[slug]/manage/requests',
  '/projects/[slug]/chat',
  '/projects/[slug]/chat/[channelId]',
  '/projects/[slug]/voice/[channelId]',
  '/projects/[slug]/lists',
  '/projects/[slug]/lists/[listId]',
  '/projects/[slug]/lists/[listId]/list',
  '/projects/[slug]/lists/[listId]/kanban',
  '/projects/[slug]/lists/[listId]/timeline',
  '/projects/[slug]/lists/[listId]/team',
  '/projects/[slug]/lists/[listId]/files',
  '/projects/[slug]/lists/[listId]/notes',
  '/projects/[slug]/lists/[listId]/whiteboards',
  '/projects/[slug]/lists/[listId]/whiteboards/[wbId]',
  '/projects/[slug]/lists/[listId]/tasks/new',
  '/projects/[slug]/lists/[listId]/tasks/[taskKey]',
  '/projects/[slug]/lists/[listId]/tabs/[tabId]',
  '/chat/global/[channelId]',
  '/voice/[channelId]',
] as const;

interface Compiled {
  template: string;
  segs: { lit?: string; name?: string }[];
  literalCount: number;
}

const COMPILED: Compiled[] = PAGE_ROUTES.map((t) => {
  const segs = t
    .split('/')
    .filter(Boolean)
    .map((s) => (s.startsWith('[') ? { name: s.slice(1, -1) } : { lit: s }));
  return { template: t, segs, literalCount: segs.filter((s) => s.lit).length };
}).sort((a, b) => b.literalCount - a.literalCount);

function normalize(pathname: string): string[] {
  return pathname
    .replace(/\.txt$/, '')
    .replace(/\/index$/, '')
    .split('/')
    .filter(Boolean);
}

function match(parts: string[]): { c: Compiled; params: Record<string, string> } | null {
  for (const c of COMPILED) {
    if (c.segs.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      const s = c.segs[i]!;
      if (s.lit !== undefined) {
        if (s.lit !== parts[i]) {
          ok = false;
          break;
        }
      } else {
        params[s.name!] = parts[i]!;
      }
    }
    if (ok) return { c, params };
  }
  return null;
}

/** `/projects/foo/lists/bar/list(.txt)` → `/projects/_/lists/_/list(.txt)`; null if not a dynamic route. */
export function toPlaceholderPath(pathname: string): string | null {
  const parts = normalize(pathname);
  const m = match(parts);
  if (!m || Object.keys(m.params).length === 0) return null;
  const out = m.c.segs.map((s) => (s.name ? ROUTE_PLACEHOLDER : s.lit)).join('/');
  const suffix = pathname.endsWith('.txt') ? (pathname.endsWith('/index.txt') ? '/index.txt' : '.txt') : '';
  return `/${out}${suffix}`;
}

/** Params as encoded in the real URL (still percent-encoded, like Next's `useParams`). */
export function matchParams(pathname: string): Record<string, string> | null {
  const m = match(normalize(pathname));
  return m ? m.params : null;
}
