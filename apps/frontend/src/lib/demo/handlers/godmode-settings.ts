/**
 * Godmode settings store + endpoints: the instance configuration registry
 * (reproduced from the backend's settings-registry) with values persisted in
 * a table. Secrets are never returned, only `secretSet`.
 */
import { tbl, type Rec } from '../db';
import { badRequest, get, put } from '../http';
import { nowIso } from '../clock';
import { SETTING_DEFS, SETTING_GROUPS, type SettingDef } from '../seed/godmode-registry';
import { requireGodmode } from './godmode-guard';
import { startStorageMigration } from './godmode-storage';
import { listSsoConnections, listPassphraseCredentials } from './godmode-sso';

export interface SettingRow extends Rec {
  /** id === key */
  value: unknown;
  updatedAt: string;
}

export const settingsTbl = () => tbl<SettingRow>('godmodeSettings');

const DEFS = new Map<string, SettingDef>(SETTING_DEFS.map((d) => [d.key, d]));

export function settingDef(key: string): SettingDef | undefined {
  return DEFS.get(key);
}

/** Resolve a setting: stored value → registry default. */
export function getSetting<T = unknown>(key: string): T {
  const row = settingsTbl().get(key);
  if (row && row.value !== undefined && row.value !== null) return row.value as T;
  return DEFS.get(key)?.defaultValue as T;
}

/** Validate + coerce like `SettingsService.coerce`. */
export function coerceSetting(def: SettingDef, value: unknown): unknown {
  switch (def.type) {
    case 'boolean':
      return value === true || value === 'true';
    case 'number': {
      const n = Number(value);
      if (!Number.isFinite(n)) throw badRequest(`${def.key} must be a number`);
      return n;
    }
    case 'json':
      return value;
    case 'enum':
      if (typeof value !== 'string' || (def.options && !def.options.some((o) => o.value === value))) {
        throw badRequest(`${def.key} must be one of: ${def.options?.map((o) => o.value).join(', ')}`);
      }
      return value;
    default:
      return String(value ?? '');
  }
}

export function setSetting(key: string, value: unknown): void {
  const def = DEFS.get(key);
  if (!def) throw badRequest(`Unknown setting: ${key}`);
  const stored = def.secret && typeof value === 'string' ? value : coerceSetting(def, value);
  settingsTbl().save({ id: key, value: stored, updatedAt: nowIso() });
}

export function isConfigured(): boolean {
  return getSetting<boolean>('system.configured') === true;
}

export function viewForGodmode() {
  return SETTING_DEFS.map((def) => {
    const base = {
      key: def.key,
      label: def.label,
      description: def.description,
      group: def.group,
      type: def.type,
      secret: !!def.secret,
      options: def.options,
      advanced: def.advanced,
      public: def.public,
      visibleWhen: def.visibleWhen,
      disabledWhen: def.disabledWhen,
      moreInfo: def.moreInfo,
      action: def.action,
      docUrl: def.docUrl,
      fileUpload: def.fileUpload,
      placeholder: def.placeholder,
    };
    if (def.secret) {
      const raw = getSetting<string>(def.key);
      return { ...base, secretSet: !!(raw && raw !== '') };
    }
    return { ...base, value: getSetting(def.key), defaultValue: def.defaultValue };
  });
}

get('/godmode/settings', (req) => {
  requireGodmode(req);
  return {
    groups: SETTING_GROUPS,
    items: viewForGodmode(),
    configured: isConfigured(),
    ssoConnections: listSsoConnections(),
    passphraseCredentials: listPassphraseCredentials(),
  };
});

put('/godmode/settings/:key', (req) => {
  requireGodmode(req);
  setSetting(req.params.key!, req.body?.value);
  return { ok: true };
});

put('/godmode/settings', (req) => {
  requireGodmode(req);
  const entries = req.body?.settings;
  if (!Array.isArray(entries) || entries.length === 0) throw badRequest('settings should not be empty');
  for (const e of entries) {
    if (typeof e?.key !== 'string' || !e.key) throw badRequest('Each setting needs a key');
    if (!DEFS.has(e.key)) throw badRequest(`Unknown setting: ${e.key}`);
  }
  const providerChange = entries.find((e: { key: string }) => e.key === 'storage.provider');
  const active = getSetting<string>('storage.provider');
  const target = providerChange ? String(providerChange.value) : active;
  const migrates = providerChange && target !== active && target !== 'disabled' && active !== 'disabled';
  for (const e of entries) {
    if (migrates && e.key === 'storage.provider') continue;
    setSetting(e.key, e.value);
  }
  if (migrates) {
    const m = startStorageMigration(active, target);
    return { ok: true, storageMigrationStarted: true, migrationId: m.id };
  }
  return { ok: true };
});
