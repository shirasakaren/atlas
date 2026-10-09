/**
 * Feature flags: public evaluated map + admin CRUD. Mirrors
 * apps/backend/src/modules/feature-flags.
 */
import { tbl, type Rec } from '../db';
import { del, get, put, badRequest } from '../http';
import { me } from '../access';
import { nowIso } from '../clock';
import { requirePermission } from './admin-rbac';

export interface FlagRec extends Rec {
  /** id === key */
  key: string;
  enabled: boolean;
  description: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const flagsTbl = () => tbl<FlagRec>('featureFlags');

/** Evaluated `{ key: enabled }` map (also used by other domains). */
export function evaluateFlags(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const f of flagsTbl().all()) out[f.key] = f.enabled;
  return out;
}

export function isFlagEnabled(key: string): boolean {
  return flagsTbl().get(key)?.enabled ?? false;
}

get('/feature-flags', () => evaluateFlags());

get('/admin/feature-flags', () => {
  requirePermission('flags.manage');
  return flagsTbl()
    .all()
    .slice()
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
});

put('/admin/feature-flags/:key', (req) => {
  requirePermission('flags.manage');
  const key = req.params.key!;
  if (typeof req.body?.enabled !== 'boolean') throw badRequest('enabled must be a boolean value');
  const description = typeof req.body?.description === 'string' ? req.body.description : undefined;
  const now = nowIso();
  const cur = flagsTbl().get(key);
  if (cur) {
    cur.enabled = req.body.enabled;
    if (description !== undefined) cur.description = description;
    cur.updatedBy = me().email;
    cur.updatedAt = now;
    return flagsTbl().save(cur);
  }
  return flagsTbl().insert({
    id: key,
    key,
    enabled: req.body.enabled,
    description: description ?? null,
    updatedBy: me().email,
    createdAt: now,
    updatedAt: now,
  });
});

del('/admin/feature-flags/:key', (req) => {
  requirePermission('flags.manage');
  flagsTbl().remove(req.params.key!);
  return { ok: true };
});
