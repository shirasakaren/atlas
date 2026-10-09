/**
 * Godmode has its own auth (X-Godmode-Token), separate from the user session.
 * In the demo ANY passphrase unlocks and the token is stateless: anything that
 * starts with `demo-gm-` is valid, so a reload keeps you unlocked (the token
 * lives in localStorage) without any server-side session table.
 */
import { HttpError, type Req } from '../http';

export const GM_TOKEN_PREFIX = 'demo-gm-';

export function mintGodmodeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return GM_TOKEN_PREFIX + s;
}

export function godmodeTokenOf(req: Req): string | null {
  const t = req.headers.get('x-godmode-token');
  return t && t.startsWith(GM_TOKEN_PREFIX) ? t : null;
}

/** 401 unless the request carries a godmode token (the UI then shows the unlock screen). */
export function requireGodmode(req: Req): string {
  const t = godmodeTokenOf(req);
  if (!t) throw new HttpError(401, 'Godmode session expired.');
  return t;
}
