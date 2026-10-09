/**
 * Replaces `window.fetch` so that
 *   1. requests to the (fake) API origin are answered by the in-browser engine, and
 *   2. static-export RSC payload requests for dynamic routes are served from
 *      the single pre-rendered placeholder page (see route-table.ts).
 * Everything else passes through untouched.
 */
import { toPlaceholderPath } from './route-table';
import { NO_CONTENT } from './http';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

let installed = false;

/** Opt-in request log: `localStorage.atlas_demo_debug = '1'`. */
const DEBUG_API = (() => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('atlas_demo_debug') === '1';
  } catch {
    return false;
  }
})();

async function readBody(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  let raw: BodyInit | null | undefined = init?.body;
  if (raw === undefined && typeof Request !== 'undefined' && input instanceof Request) {
    try {
      const t = await input.clone().text();
      raw = t || undefined;
    } catch {
      raw = undefined;
    }
  }
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  // FormData / Blob / etc.: the demo never needs the bytes.
  return undefined;
}

function jsonResponse(status: number, body: unknown): Response {
  if (body === NO_CONTENT) return new Response(null, { status: status === 204 ? 204 : status });
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export function installDemoFetch(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

    if (url.startsWith(API_BASE)) {
      const method = (
        init?.method ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
      ).toUpperCase();
      const headers = new Headers(
        init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined),
      );
      const body = await readBody(input, init);
      const { dispatch } = await import('./engine');
      // A little latency so spinners/skeletons behave like a real network.
      const res = await dispatch(method, url.slice(API_BASE.length), body, headers);
      await new Promise((r) => setTimeout(r, 8 + Math.random() * 22));
      if (DEBUG_API) console.log(`[demo-api] ${method} ${url.slice(API_BASE.length)} → ${res.status}`);
      return jsonResponse(res.status, res.body);
    }

    // Static export: RSC flight requests for dynamic routes.
    try {
      const u = new URL(url, window.location.href);
      if (u.origin === window.location.origin && u.pathname.endsWith('.txt')) {
        const rewritten = toPlaceholderPath(u.pathname);
        if (rewritten) {
          u.pathname = rewritten;
          const next = typeof input === 'string' || input instanceof URL ? u.href : new Request(u.href, input as Request);
          return realFetch(next, init);
        }
      }
    } catch {
      /* fall through */
    }
    return realFetch(input, init);
  };
}
