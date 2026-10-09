/**
 * Tiny in-browser HTTP router. Handlers are registered with Express-style
 * patterns (`/projects/:slug/tasks`) relative to the API base (`/api/v1`).
 *
 *   route('GET', '/projects/:slug', (req) => ({ ... }));   // → 200 JSON
 *   route('DELETE', '/x/:id', () => NO_CONTENT);           // → 204
 *   throw new HttpError(404, 'Project not found');         // → 404 JSON
 *
 * Literal segments win over `:param` segments, so `/projects/featured`
 * beats `/projects/:slug` regardless of registration order.
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const badRequest = (m = 'Bad request') => new HttpError(400, m);
export const forbidden = (m = 'Forbidden') => new HttpError(403, m);
export const notFound = (m = 'Not found') => new HttpError(404, m);
export const conflict = (m = 'Conflict') => new HttpError(409, m);

/** Return this from a handler to answer `204 No Content`. */
export const NO_CONTENT = Symbol('NO_CONTENT');

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface Req {
  method: Method;
  /** Path relative to the API base, without query string. Always starts with `/`. */
  path: string;
  /** Decoded `:param` values. */
  params: Record<string, string>;
  query: URLSearchParams;
  /** Parsed JSON body (`undefined` when there is none). */
  body: any;
  headers: Headers;
}

export type Handler = (req: Req) => unknown | Promise<unknown>;

interface Route {
  method: Method;
  pattern: string;
  segs: { lit: string | null; name: string | null }[];
  handler: Handler;
}

const routes: Route[] = [];
let sorted = false;

export function route(method: Method, pattern: string, handler: Handler): void {
  const segs = pattern
    .split('/')
    .filter(Boolean)
    .map((s) => (s.startsWith(':') ? { lit: null, name: s.slice(1) } : { lit: s, name: null }));
  routes.push({ method, pattern, segs, handler });
  sorted = false;
}

export const get = (p: string, h: Handler) => route('GET', p, h);
export const post = (p: string, h: Handler) => route('POST', p, h);
export const patch = (p: string, h: Handler) => route('PATCH', p, h);
export const put = (p: string, h: Handler) => route('PUT', p, h);
export const del = (p: string, h: Handler) => route('DELETE', p, h);

function sortRoutes() {
  if (sorted) return;
  routes.sort((a, b) => {
    const n = Math.min(a.segs.length, b.segs.length);
    for (let i = 0; i < n; i++) {
      const al = a.segs[i]!.lit !== null;
      const bl = b.segs[i]!.lit !== null;
      if (al !== bl) return al ? -1 : 1;
    }
    return b.segs.length - a.segs.length;
  });
  sorted = true;
}

export function matchRoute(
  method: string,
  path: string,
): { handler: Handler; params: Record<string, string>; pattern: string } | null {
  sortRoutes();
  const parts = path.split('/').filter(Boolean);
  for (const r of routes) {
    if (r.method !== method || r.segs.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      const s = r.segs[i]!;
      if (s.lit !== null) {
        if (s.lit !== parts[i]) {
          ok = false;
          break;
        }
      } else {
        try {
          params[s.name!] = decodeURIComponent(parts[i]!);
        } catch {
          params[s.name!] = parts[i]!;
        }
      }
    }
    if (ok) return { handler: r.handler, params, pattern: r.pattern };
  }
  return null;
}

export function listRoutes(): string[] {
  sortRoutes();
  return routes.map((r) => `${r.method} ${r.pattern}`);
}

/** Pagination helper for `{ items, meta }` payloads (`Paginated<T>`). */
export function paginate<T>(all: T[], page: number, pageSize: number) {
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), meta: { page, pageSize, total, totalPages } };
}

export function intParam(q: URLSearchParams, key: string, dflt: number, max = 500): number {
  const raw = q.get(key);
  const n = raw == null ? NaN : parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return dflt;
  return Math.min(n, max);
}
