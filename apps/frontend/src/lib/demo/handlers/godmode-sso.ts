/**
 * Godmode: SSO connections, passphrase credentials, VAPID keys and instance
 * stats. Mirrors the GodmodeService delegates.
 */
import { tbl, tableNames, type Rec } from '../db';
import { badRequest, del, get, notFound, post, put } from '../http';
import { projects, users } from '../store';
import { newId } from '../prng';
import { nowIso } from '../clock';
import { requireGodmode } from './godmode-guard';
import { setSetting } from './godmode-settings';
import { roleByCode } from './admin-rbac';

// ─── SSO connections ───────────────────────────────────────────────────

interface SsoCfg {
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  entryPoint?: string;
  spIssuer?: string;
  cert?: string;
  privateKey?: string;
}

export interface SsoRec extends Rec {
  name: string;
  type: 'oidc' | 'saml';
  enabled: boolean;
  domains: string[];
  /** Plain config incl. secrets; masked on the way out. */
  config: SsoCfg;
  createdAt: string;
  updatedAt: string;
}

export const ssoTbl = () => tbl<SsoRec>('ssoConnections');

const SECRET_FIELDS = ['clientSecret', 'cert', 'privateKey'] as const;
const PLAIN_FIELDS = ['issuer', 'clientId', 'entryPoint', 'spIssuer'] as const;

function maskSso(r: SsoRec) {
  const config: Record<string, unknown> = {};
  for (const f of SECRET_FIELDS) config[f] = '';
  for (const f of PLAIN_FIELDS) config[f] = r.config[f] ?? '';
  config.secretSet = Object.fromEntries(SECRET_FIELDS.map((f) => [f, !!r.config[f]]));
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    enabled: r.enabled,
    domains: r.domains,
    config,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function listSsoConnections() {
  return ssoTbl().all().map(maskSso);
}

function validateSso(dto: any, prev?: SsoRec) {
  if (!dto?.name || !String(dto.name).trim()) throw badRequest('A name is required.');
  if (String(dto.name).trim().length > 80) throw badRequest('Keep the name under 80 characters.');
  if (dto.type !== 'oidc' && dto.type !== 'saml') throw badRequest('Type must be oidc or saml.');
  const c = dto.config ?? {};
  if (dto.type === 'oidc' && !String(c.issuer ?? '').trim()) throw badRequest('OIDC needs an issuer URL.');
  if (dto.type === 'saml') {
    const hasCert = String(c.cert ?? '').trim() || prev?.config.cert;
    if (!String(c.entryPoint ?? '').trim() || !hasCert) {
      throw badRequest('SAML needs an entry point and the IdP certificate.');
    }
  }
}

function domainsOf(dto: any): string[] {
  const raw = dto.domains;
  const arr: string[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  return arr.map((d) => String(d).trim()).filter(Boolean);
}

/** Blank secret fields keep the stored value (the UI never receives secrets). */
function mergeConfig(prev: SsoCfg | undefined, incoming: SsoCfg): SsoCfg {
  const out: SsoCfg = {};
  for (const f of PLAIN_FIELDS) {
    const v = String(incoming[f] ?? '').trim();
    if (v) out[f] = v;
  }
  for (const f of SECRET_FIELDS) {
    const v = String(incoming[f] ?? '').trim();
    const keep = prev?.[f];
    if (v) out[f] = v;
    else if (keep) out[f] = keep;
  }
  return out;
}

get('/godmode/sso/connections', (req) => {
  requireGodmode(req);
  return listSsoConnections();
});

post('/godmode/sso/connections', (req) => {
  requireGodmode(req);
  validateSso(req.body);
  const now = nowIso();
  const rec: SsoRec = {
    id: newId('sso'),
    name: String(req.body.name).trim(),
    type: req.body.type,
    enabled: req.body.enabled ?? false,
    domains: domainsOf(req.body),
    config: mergeConfig(undefined, req.body.config ?? {}),
    createdAt: now,
    updatedAt: now,
  };
  ssoTbl().insert(rec);
  return maskSso(rec);
});

put('/godmode/sso/connections/:id/enabled', (req) => {
  requireGodmode(req);
  const rec = ssoTbl().get(req.params.id!);
  if (!rec) throw notFound('SSO connection not found.');
  rec.enabled = req.body?.enabled === true;
  rec.updatedAt = nowIso();
  ssoTbl().save(rec);
  return maskSso(rec);
});

put('/godmode/sso/connections/:id', (req) => {
  requireGodmode(req);
  const rec = ssoTbl().get(req.params.id!);
  if (!rec) throw notFound('SSO connection not found.');
  validateSso(req.body, rec);
  rec.name = String(req.body.name).trim();
  rec.type = req.body.type;
  rec.enabled = req.body.enabled ?? false;
  rec.domains = domainsOf(req.body);
  rec.config = mergeConfig(rec.config, req.body.config ?? {});
  rec.updatedAt = nowIso();
  ssoTbl().save(rec);
  return maskSso(rec);
});

del('/godmode/sso/connections/:id', (req) => {
  requireGodmode(req);
  if (!ssoTbl().remove(req.params.id!)) throw notFound('SSO connection not found.');
  return { ok: true };
});

// ─── Passphrase credentials ────────────────────────────────────────────

export interface PassphraseRec extends Rec {
  name: string;
  roleCode: string;
  enabled: boolean;
  lastUsedAt: string | null;
  /** The phrase itself is never kept, only its length. */
  passphraseLength: number;
  createdAt: string;
  updatedAt: string;
}

export const passphraseTbl = () => tbl<PassphraseRec>('passphraseCredentials');

function pubPass(r: PassphraseRec) {
  return {
    id: r.id,
    name: r.name,
    roleCode: r.roleCode,
    enabled: r.enabled,
    lastUsedAt: r.lastUsedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export function listPassphraseCredentials() {
  return passphraseTbl().all().map(pubPass);
}

function validatePass(dto: any, requirePassphrase: boolean) {
  if (!dto?.name || !String(dto.name).trim()) throw badRequest('A name is required.');
  if (String(dto.name).trim().length > 80) throw badRequest('Keep the name under 80 characters.');
  if (!dto.roleCode) throw badRequest('A role is required.');
  if (!roleByCode(dto.roleCode)) throw badRequest(`Unknown role: ${dto.roleCode}`);
  const pp = String(dto.passphrase ?? '').trim();
  if (requirePassphrase && !pp) throw badRequest('A passphrase is required.');
  if (pp && pp.length < 4) throw badRequest('Passphrase must be at least 4 characters.');
}

get('/godmode/passphrase-credentials', (req) => {
  requireGodmode(req);
  return listPassphraseCredentials();
});

post('/godmode/passphrase-credentials', (req) => {
  requireGodmode(req);
  validatePass(req.body, true);
  const now = nowIso();
  const rec: PassphraseRec = {
    id: newId('pass'),
    name: String(req.body.name).trim(),
    roleCode: req.body.roleCode,
    enabled: req.body.enabled ?? true,
    lastUsedAt: null,
    passphraseLength: String(req.body.passphrase).trim().length,
    createdAt: now,
    updatedAt: now,
  };
  passphraseTbl().insert(rec);
  return pubPass(rec);
});

put('/godmode/passphrase-credentials/:id/enabled', (req) => {
  requireGodmode(req);
  const rec = passphraseTbl().get(req.params.id!);
  if (!rec) throw notFound('Passphrase credential not found.');
  rec.enabled = req.body?.enabled === true;
  rec.updatedAt = nowIso();
  passphraseTbl().save(rec);
  return pubPass(rec);
});

put('/godmode/passphrase-credentials/:id', (req) => {
  requireGodmode(req);
  const rec = passphraseTbl().get(req.params.id!);
  if (!rec) throw notFound('Passphrase credential not found.');
  validatePass(req.body, false);
  rec.name = String(req.body.name).trim();
  rec.roleCode = req.body.roleCode;
  rec.enabled = req.body.enabled ?? rec.enabled;
  const pp = String(req.body.passphrase ?? '').trim();
  if (pp) rec.passphraseLength = pp.length;
  rec.updatedAt = nowIso();
  passphraseTbl().save(rec);
  return pubPass(rec);
});

del('/godmode/passphrase-credentials/:id', (req) => {
  requireGodmode(req);
  if (!passphraseTbl().remove(req.params.id!)) throw notFound('Passphrase credential not found.');
  return { ok: true };
});

// ─── VAPID + stats ─────────────────────────────────────────────────────

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Random, well-formed-looking VAPID pair (65-byte public, 32-byte private). Not functional. */
export function fakeVapidKeys(): { publicKey: string; privateKey: string } {
  const pub = new Uint8Array(65);
  crypto.getRandomValues(pub);
  pub[0] = 0x04;
  const priv = new Uint8Array(32);
  crypto.getRandomValues(priv);
  return { publicKey: b64url(pub), privateKey: b64url(priv) };
}

post('/godmode/integrations/vapid/generate', (req) => {
  requireGodmode(req);
  const keys = fakeVapidKeys();
  setSetting('integrations.push.vapidPublicKey', keys.publicKey);
  setSetting('integrations.push.vapidPrivateKey', keys.privateKey);
  return keys;
});

function chatMessageCount(): number {
  // The chat domain owns its tables; find the message table defensively.
  const name = tableNames().find((n) => /^chat.?messages?$/i.test(n));
  return name ? tbl(name).size : 0;
}

get('/godmode/stats', (req) => {
  requireGodmode(req);
  return {
    userCount: users().size,
    projectCount: projects().size,
    chatMessageCount: chatMessageCount(),
  };
});
