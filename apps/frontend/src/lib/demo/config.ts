/**
 * Demo mode: the whole backend is replaced by an in-browser mock API so the
 * app can ship as a fully static site (GitHub Pages). Everything under
 * `src/lib/demo` is dead code unless `NEXT_PUBLIC_DEMO=true` at build time.
 */

/** Build-time constant; the bundler inlines and tree-shakes on it. */
export const DEMO = process.env.NEXT_PUBLIC_DEMO === 'true';

export function isDemo(): boolean {
  return DEMO;
}

/** Bump / override per deploy: a changed version discards visitors' saved edits. */
export const DATA_VERSION = process.env.NEXT_PUBLIC_DEMO_VERSION ?? 'dev';

/** Fixed id of the one persona every visitor is signed in as. */
export const ME_ID = 'usr_maya_brennan';

/** Opaque session id handed to the app; the mock treats any bearer as the persona. */
export const DEMO_SESSION_ID = 'demo-session-maya-brennan';

export const COMPANY = {
  name: 'Halcyon Global',
  domain: 'halcyon.example',
} as const;

/** Where the portfolio owner's source lives (shown in the demo banner). */
export const SOURCE_URL = 'https://github.com/shirasakaren/atlas';

/** Placeholder segment used for every statically exported dynamic route. */
export const ROUTE_PLACEHOLDER = '_';

export const LS_VISITED = 'atlas_demo_visited';
export const LS_SESSION = 'atlas_session';
export const LS_TOKENS = 'atlas_tokens';
