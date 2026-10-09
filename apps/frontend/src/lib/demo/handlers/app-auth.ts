/**
 * Auth + instance config for the demo. There is exactly one persona, so every
 * sign-in method (password, magic link, OTP, passphrase, OIDC…) resolves to
 * Maya and answers with the same `{ sessionId, expiresAt, user }` shape the
 * real `AuthService.issueSession()` returns.
 */
import { COMPANY, ME_ID } from '../config';
import { badRequest, del, get, HttpError, NO_CONTENT, post, type Req } from '../http';
import { me } from '../access';
import { personaSession } from '../session';
import { nowIso } from '../clock';
import { THEMES } from '@/lib/themes/registry';
import { users } from '../store';
import { meExtraTable } from './app-shared';
import { godmodePublicConfig } from './godmode-public-config';

export const OAUTH_PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  gitlab: 'GitLab',
  apple: 'Apple',
  x: 'X',
  facebook: 'Facebook',
  discord: 'Discord',
  azure: 'Microsoft',
  keycloak: 'Keycloak',
};

const CALLBACK_BASE = `https://atlas.${COMPANY.domain}/api/v1`;

export function oauthCallbacks(): Record<string, string> {
  return Object.fromEntries(Object.keys(OAUTH_PROVIDER_LABELS).map((id) => [id, `${CALLBACK_BASE}/auth/oauth/${id}/callback`]));
}

/** Mirror of AuthService.issueSession for the persona (live name/avatar from the users table). */
export function issueSession() {
  const u = me();
  const base = personaSession(u.isAdmin);
  const ex = meExtraTable().get(ME_ID);
  if (ex) {
    ex.lastLoginAt = nowIso();
    meExtraTable().save(ex);
  }
  return {
    ...base,
    user: { ...base.user, email: u.email, name: u.name, avatarUrl: u.avatarUrl, isAdmin: u.isAdmin },
  };
}

export const PUBLIC_CONFIG = () => ({
  configured: true,
  site: {
    name: 'Atlas',
    description: "Halcyon Global's project & program office: every initiative, task, decision and conversation in one place.",
  },
  appearance: { defaultTheme: 'atlas', defaultThemeMode: 'system', allowUserThemes: true },
  themes: THEMES.map((t) => ({ label: t.name, value: t.id })),
  registration: { enabled: true, inviteRequired: false, defaultRole: 'member', requireEmailVerification: false },
  authMethods: {
    password: { enabled: true, label: 'Email & password' },
    magicLink: { enabled: false, label: 'Magic link' },
    phone: { enabled: false, otpEnabled: false, label: 'Phone' },
    passphrase: { enabled: false, label: 'Passphrase' },
  },
  oauthProviders: [] as { id: string; label: string }[],
  oauthCallbacks: oauthCallbacks(),
  sso: {
    oidc: { enabled: false, label: 'Single sign-on' },
    saml: { enabled: false, label: 'SAML' },
    connections: [] as { id: string; name: string; type: 'oidc' | 'saml'; domains: string[] }[],
  },
  modules: { pmo: true, voice: true },
  features: { gifs: false, push: false },
  gifs: { available: false, klipyAppKey: '' },
  legal: { requireConsent: false, terms: true, privacy: true },
});

const TERMS = `# Terms of use

Welcome to the Atlas demo for **Halcyon Global**, a fictional company.

This is a portfolio demonstration. All people, projects, tasks and messages you see are generated sample data.
Nothing you do leaves your browser: edits are stored locally (IndexedDB) and can be reset at any time from the demo banner.

## Acceptable use

Please do not enter personal, confidential or regulated information. There is no server to protect it.

## No warranty

The demo is provided as-is, without warranty of any kind.
`;

const PRIVACY = `# Privacy policy

**This demo has no backend.** Atlas runs entirely in your browser; no account is created and no data is transmitted to a server.

## What is stored

- Your changes to the sample workspace, in your browser's IndexedDB.
- A small number of preferences (theme, last session) in localStorage.

## How to erase it

Use "Reset demo" in the banner, or clear this site's data in your browser settings.
`;

function sessionPayload() {
  return issueSession();
}

function requireStr(req: Req, field: string, label = field): string {
  const v = req.body?.[field];
  if (typeof v !== 'string' || !v.trim()) throw badRequest(`${label} should not be empty`);
  return v.trim();
}

// Derived from the godmode settings table so edits there show up app-wide.
get('/public-config', () => godmodePublicConfig());

get('/public-config/legal/:page', (req) => {
  const page = req.params.page;
  if (page === 'terms') return { page, text: TERMS };
  if (page === 'privacy') return { page, text: PRIVACY };
  throw new HttpError(404, 'Unknown legal page.');
});

get('/auth/oauth-callbacks', () => oauthCallbacks());

get('/auth/session', () => {
  const u = me();
  return {
    id: u.id,
    keycloakId: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    isAdmin: u.isAdmin,
  };
});

del('/auth/logout', () => ({ ok: true }));

// ─── Sign-in methods: every one resolves to the persona ────────────────

post('/auth/login', () => sessionPayload());
post('/auth/login/password', () => ({ ...sessionPayload(), mustChangePassword: false }));
post('/auth/login/passphrase', () => sessionPayload());

post('/auth/register', (req) => {
  requireStr(req, 'email', 'email');
  requireStr(req, 'name', 'name');
  const pw = req.body?.password;
  if (typeof pw !== 'string' || pw.length < 6) throw badRequest('Password must be at least 6 characters.');
  // No new account is created in the demo: the visitor signs in as the persona on /login.
  return { user: { id: ME_ID, email: String(req.body.email).toLowerCase(), name: String(req.body.name) }, emailVerificationSent: false };
});
post('/auth/register/invite/check', () => ({ valid: true }));

post('/auth/magic-link/request', () => ({ delivered: true }));
post('/auth/magic-link/verify', () => sessionPayload());

post('/auth/phone/otp/request', () => ({ ttlSeconds: 300 }));
post('/auth/phone/otp/verify', () => sessionPayload());

post('/auth/password/forgot', () => ({ delivered: true }));
post('/auth/password/reset', (req) => {
  const pw = req.body?.newPassword;
  if (typeof pw !== 'string' || pw.length < 6) throw badRequest('Password must be at least 6 characters.');
  return NO_CONTENT;
});
post('/auth/password/change', (req) => {
  const pw = req.body?.newPassword;
  if (typeof pw !== 'string' || pw.length < 6) throw badRequest('Password must be at least 6 characters.');
  const ex = meExtraTable().get(ME_ID);
  if (ex) {
    ex.passwordChangedAt = nowIso();
    meExtraTable().save(ex);
  }
  return NO_CONTENT;
});

post('/auth/email/verify', () => ({ verified: true }));
post('/auth/email/verify/resend', () => NO_CONTENT);

post('/auth/phone/verify', (req) => {
  requireStr(req, 'phone', 'phone');
  return { ttlSeconds: 300 };
});
post('/auth/phone/verify/confirm', (req) => {
  const phone = requireStr(req, 'phone', 'phone');
  const code = requireStr(req, 'code', 'code');
  // Any numeric code verifies (there is no SMS gateway). Never 401: the client signs out on 401.
  if (!/^\d{4,8}$/.test(code)) throw badRequest('Invalid code.');
  const u = me();
  u.phone = phone;
  u.phoneVerified = true;
  users().save(u);
  return {};
});

// ─── Ops endpoints some pages poll ──────────────────────────────────────

get('/health', () => ({
  status: 'ok',
  info: { database: { status: 'up' }, s3: { status: 'up' }, redis: { status: 'up' } },
  error: {},
  details: { database: { status: 'up' }, s3: { status: 'up' }, redis: { status: 'up' } },
}));

get('/version', () => ({ sha: 'demo', version: 'demo', builtAt: '' }));
