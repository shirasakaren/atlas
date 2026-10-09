/**
 * Godmode access: unlock (ANY passphrase works in the demo), session check,
 * logout, onboarding, and the 2FA surfaces (TOTP + passkeys).
 *
 * 2FA is never *required* to unlock in the demo (so nobody can lock themselves
 * out of a public site), but the panels are fully functional: enabling TOTP
 * accepts any 6-digit code, and passkey registration drives the real WebAuthn
 * ceremony in the browser and just stores the credential locally.
 */
import { tbl, type Rec } from '../db';
import { badRequest, get, post, del, HttpError } from '../http';
import { newId } from '../prng';
import { nowIso } from '../clock';
import { COMPANY } from '../config';
import { godmodeTokenOf, mintGodmodeToken, requireGodmode } from './godmode-guard';
import { getSetting, isConfigured, setSetting } from './godmode-settings';

export interface PasskeyRec extends Rec {
  credentialId: string;
  name: string | null;
  transports: string[];
  createdAt: string;
  counter: number;
}

export const passkeysTbl = () => tbl<PasskeyRec>('godmodePasskeys');

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function randomBase32(len = 32): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += BASE32[b % 32];
  return s;
}

function randomChallenge(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── Unlock / session ──────────────────────────────────────────────────

post('/godmode/unlock', (req) => {
  const passphrase = req.body?.passphrase;
  if (typeof passphrase !== 'string' || !passphrase) throw badRequest('passphrase should not be empty');
  const ttl = Number(getSetting('godmode.sessionTtlMinutes')) || 720;
  const token = mintGodmodeToken();
  return {
    id: newId('gms'),
    token,
    expiresAt: new Date(Date.now() + ttl * 60_000).toISOString(),
    metadata: { totp: false, passkey: false },
    configured: isConfigured(),
  };
});

get('/godmode/unlock/factors', () => ({ totpEnabled: false, passkeyEnabled: false }));

post('/godmode/2fa/passkey/authenticate/options', () => ({
  challenge: randomChallenge(),
  options: { challenge: randomChallenge(), timeout: 60000, userVerification: 'preferred', allowCredentials: [] },
}));

get('/godmode/session', (req) => {
  const token = godmodeTokenOf(req);
  if (!token) return { valid: false };
  const ttl = Number(getSetting('godmode.sessionTtlMinutes')) || 720;
  return { valid: true, expiresAt: new Date(Date.now() + ttl * 60_000).toISOString() };
});

post('/godmode/logout', (req) => {
  requireGodmode(req);
  return { ok: true };
});

// ─── Onboarding ────────────────────────────────────────────────────────

get('/godmode/onboarding', (req) => {
  requireGodmode(req);
  return {
    configured: isConfigured(),
    steps: [
      { id: 'account', label: 'Create the superadmin account', done: false },
      { id: 'site', label: 'Set the site name and instance URL', done: false },
      { id: 'auth', label: 'Pick sign-in methods and configure credentials', done: false },
      { id: 'providers', label: 'Configure email, SMS, and storage providers', done: false },
      { id: 'modules', label: 'Enable the modules you want', done: false },
    ],
  };
});

post('/godmode/onboarding/complete', (req) => {
  requireGodmode(req);
  setSetting('system.configured', true);
  return { configured: true };
});

// ─── 2FA: TOTP ─────────────────────────────────────────────────────────

get('/godmode/2fa/status', (req) => {
  requireGodmode(req);
  return {
    totpEnabled: getSetting<boolean>('godmode.totp.enabled') === true,
    passkeys: passkeysTbl().all().map((p) => ({
      id: p.id,
      credentialId: p.credentialId,
      transports: p.transports,
      name: p.name,
      createdAt: p.createdAt,
      counter: p.counter,
    })),
  };
});

post('/godmode/2fa/totp/setup', (req) => {
  requireGodmode(req);
  const secret = randomBase32(32);
  const siteName = String(getSetting('site.name') || 'Atlas').replace(/\s+/g, '') || 'Atlas';
  const params = new URLSearchParams({ secret, issuer: siteName, digits: '6', period: '30', algorithm: 'SHA1' });
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(siteName)}:${encodeURIComponent('Atlas godmode')}?${params.toString()}`;
  return { secret, otpauthUrl };
});

post('/godmode/2fa/totp/enable', (req) => {
  requireGodmode(req);
  const code = String(req.body?.code ?? '').replace(/\s/g, '');
  if (!String(req.body?.secret ?? '')) throw badRequest('secret should not be empty');
  // Demo: any well-formed 6-digit code is accepted so visitors can try the flow without an authenticator app.
  if (!/^\d{6}$/.test(code)) throw new HttpError(401, 'Invalid TOTP code, try again.');
  setSetting('godmode.totp.secret', String(req.body.secret));
  setSetting('godmode.totp.enabled', true);
  return { enabled: true };
});

post('/godmode/2fa/totp/disable', (req) => {
  requireGodmode(req);
  setSetting('godmode.totp.enabled', false);
  setSetting('godmode.totp.secret', '');
  return { enabled: false };
});

// ─── 2FA: passkeys (WebAuthn) ──────────────────────────────────────────

post('/godmode/2fa/passkey/register/options', (req) => {
  requireGodmode(req);
  const challenge = randomChallenge();
  const siteName = String(getSetting('site.name') || 'Atlas');
  return {
    challenge,
    options: {
      rp: { name: siteName },
      user: { id: randomChallenge().slice(0, 22), name: `godmode@${COMPANY.domain}`, displayName: 'Atlas godmode operator' },
      challenge,
      pubKeyCredParams: [
        { alg: -8, type: 'public-key' },
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      timeout: 60000,
      attestation: 'none',
      excludeCredentials: [],
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    },
  };
});

post('/godmode/2fa/passkey/register/verify', (req) => {
  requireGodmode(req);
  const resp = req.body?.response ?? {};
  const rec: PasskeyRec = {
    id: newId('pk'),
    credentialId: String(resp.id ?? randomChallenge()),
    name: `Passkey ${passkeysTbl().size + 1}`,
    transports: Array.isArray(resp.response?.transports) ? resp.response.transports : ['internal'],
    createdAt: nowIso(),
    counter: 0,
  };
  passkeysTbl().insert(rec);
  return { verified: true, id: rec.id };
});

del('/godmode/2fa/passkey/:id', (req) => {
  requireGodmode(req);
  passkeysTbl().remove(req.params.id!);
  return { ok: true };
});
