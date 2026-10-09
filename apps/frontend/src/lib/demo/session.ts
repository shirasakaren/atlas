/**
 * Every visitor is signed in as the persona. Sign-out sends them to /login,
 * where one click signs back in (the demo has no real credentials).
 */
import { avatarDataUri } from './assets';
import { COMPANY, DEMO_SESSION_ID, LS_SESSION, LS_VISITED, ME_ID } from './config';

export const PERSONA = {
  id: ME_ID,
  name: 'Maya Brennan',
  email: `maya.brennan@${COMPANY.domain}`,
  title: 'Senior Program Manager, Transformation Office',
} as const;

export function personaSession(isAdmin = true) {
  return {
    sessionId: DEMO_SESSION_ID,
    user: {
      id: ME_ID,
      keycloakId: ME_ID,
      email: PERSONA.email,
      name: PERSONA.name,
      avatarUrl: avatarDataUri(PERSONA.name, ME_ID),
      isAdmin,
    },
    expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
  };
}

export function signInAsPersona(isAdmin?: boolean): void {
  try {
    let admin = isAdmin;
    if (admin === undefined) {
      try {
        const cur = JSON.parse(localStorage.getItem(LS_SESSION) ?? 'null');
        admin = cur?.user?.isAdmin ?? true;
      } catch {
        admin = true;
      }
    }
    localStorage.setItem(LS_SESSION, JSON.stringify(personaSession(admin)));
    localStorage.setItem(LS_VISITED, '1');
  } catch {
    /* storage blocked: the app falls back to /login each load */
  }
}

/** First visit: sign in automatically so the dashboard is the first thing seen. */
export function ensureDemoSession(): void {
  try {
    if (!localStorage.getItem(LS_VISITED)) signInAsPersona(true);
  } catch {
    /* ignore */
  }
}
