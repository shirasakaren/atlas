/**
 * Storage-provider migration simulation. Changing `storage.provider` in godmode
 * starts a "background copy" that progresses with wall-clock time and flips
 * the setting when it completes, like the real StorageMigrationService.
 */
import { tbl, type Rec } from '../db';
import { get, post, HttpError } from '../http';
import { newId } from '../prng';
import { nowIso } from '../clock';
import { requireGodmode } from './godmode-guard';
import { setSetting } from './godmode-settings';

export interface MigrationRec extends Rec {
  fromProvider: string;
  toProvider: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'INTERRUPTED';
  objectCount: number;
  transferredCount: number;
  totalBytes: number;
  transferredBytes: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

export const migrationsTbl = () => tbl<MigrationRec>('storageMigrations');

const DURATION_MS = 9000;

export function startStorageMigration(from: string, to: string): MigrationRec {
  const objectCount = 1284 + Math.floor(Math.random() * 120);
  const rec: MigrationRec = {
    id: newId('mig'),
    fromProvider: from,
    toProvider: to,
    status: 'RUNNING',
    objectCount,
    transferredCount: 0,
    totalBytes: objectCount * 2_710_000,
    transferredBytes: 0,
    error: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    finishedAt: null,
  };
  return migrationsTbl().insert(rec);
}

/** Latest migration with progress advanced to "now"; completes + flips the provider when due. */
export function latestMigration(): MigrationRec | null {
  const all = migrationsTbl().all();
  const last = all[all.length - 1];
  if (!last) return null;
  if (last.status === 'RUNNING') {
    const elapsed = Date.now() - new Date(last.createdAt).getTime();
    const frac = Math.max(0, Math.min(1, elapsed / DURATION_MS));
    last.transferredCount = Math.floor(last.objectCount * frac);
    last.transferredBytes = Math.floor(last.totalBytes * frac);
    last.updatedAt = nowIso();
    if (frac >= 1) {
      last.status = 'COMPLETED';
      last.finishedAt = nowIso();
      setSetting('storage.provider', last.toProvider);
    }
    migrationsTbl().save(last);
  }
  return last;
}

get('/godmode/storage/migration', (req) => {
  requireGodmode(req);
  return latestMigration();
});

post('/godmode/storage/migration/retry', (req) => {
  requireGodmode(req);
  const last = latestMigration();
  if (!last) throw new HttpError(503, 'There is no migration to retry.');
  if (last.status === 'RUNNING') throw new HttpError(503, 'A storage migration is already running.');
  return startStorageMigration(last.fromProvider, last.toProvider);
});
