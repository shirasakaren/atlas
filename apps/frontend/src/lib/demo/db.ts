/**
 * In-memory database + per-visitor persistence.
 *
 * Seed data is generated deterministically at page load (see `seed/`). Every
 * mutation a visitor makes at runtime is written to an IndexedDB *overlay*
 * (one row per changed/deleted record) that is replayed on top of the fresh
 * seed at the next load, so edits survive a refresh but never leave the
 * browser and never touch anyone else's copy.
 *
 * RULE FOR HANDLERS: mutate only through `insert` / `update` / `save` /
 * `remove`. If you change a record in place, call `table.save(rec)` after.
 */
import { DATA_VERSION } from './config';
import { setSeedNow, seedNow } from './clock';
import { createRng, hashString, type Rng } from './prng';
import { NotFoundError } from './errors';

export interface Rec {
  id: string;
}

const DB_NAME = 'atlas-demo';
const STORE = 'overlay';
const META = 'meta';

// ─── Persistence (IndexedDB overlay) ───────────────────────────────────

interface OverlayRow {
  k: string;
  table: string;
  id: string;
  rec: unknown | null;
}

let idb: IDBDatabase | null = null;
const pending = new Map<string, OverlayRow>();
let seeding = false;

function openIdb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'k' });
        if (!d.objectStoreNames.contains(META)) d.createObjectStore(META);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function reqP<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

let flushQueued = false;
function scheduleFlush() {
  if (flushQueued || !idb) return;
  flushQueued = true;
  // Next microtask: a handler's writes (all synchronous) share one transaction,
  // and the transaction starts before any navigation that follows the response.
  queueMicrotask(() => {
    flushQueued = false;
    void flushNow();
  });
}

export async function flushNow(): Promise<void> {
  if (!idb || pending.size === 0) return;
  const rows = Array.from(pending.values());
  pending.clear();
  try {
    const tx = idb.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    for (const row of rows) store.put(row);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  } catch {
    // Quota or private-mode failure: the in-memory copy still works.
  }
}

function record(table: string, id: string, rec: unknown | null) {
  if (seeding) return;
  pending.set(`${table}\u0000${id}`, { k: `${table}\u0000${id}`, table, id, rec });
  scheduleFlush();
}

if (typeof window !== 'undefined') {
  const flushOnHide = () => void flushNow();
  window.addEventListener('pagehide', flushOnHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnHide();
  });
}

// ─── Tables ────────────────────────────────────────────────────────────

export class Table<T extends Rec> {
  private map = new Map<string, T>();
  private arr: T[] | null = null;
  private idx = new Map<string, Map<unknown, T[]>>();

  constructor(readonly name: string) {}

  get size(): number {
    return this.map.size;
  }

  private dirty() {
    this.arr = null;
    if (this.idx.size) this.idx.clear();
  }

  get(id: string | null | undefined): T | undefined {
    return id == null ? undefined : this.map.get(id);
  }

  /** Like `get`, but throws a 404 `NotFoundError` when absent. */
  require(id: string | null | undefined, message = `${this.name} not found`): T {
    const r = this.get(id);
    if (!r) throw new NotFoundError(message);
    return r;
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  /** All records in insertion order. The returned array is shared: do not mutate it. */
  all(): readonly T[] {
    if (!this.arr) this.arr = Array.from(this.map.values());
    return this.arr;
  }

  /** Indexed equality lookup. The returned array is shared: do not mutate it. */
  where<K extends keyof T>(key: K, value: T[K]): readonly T[] {
    const k = key as string;
    let m = this.idx.get(k);
    if (!m) {
      m = new Map();
      for (const r of this.all()) {
        const v = r[key];
        const list = m.get(v);
        if (list) list.push(r);
        else m.set(v, [r]);
      }
      this.idx.set(k, m);
    }
    return m.get(value) ?? EMPTY;
  }

  filter(pred: (r: T) => boolean): T[] {
    return this.all().filter(pred);
  }

  find(pred: (r: T) => boolean): T | undefined {
    return this.all().find(pred);
  }

  insert(rec: T): T {
    this.map.set(rec.id, rec);
    this.dirty();
    record(this.name, rec.id, rec);
    return rec;
  }

  /** Bulk insert for seeders (cheaper than N `insert` calls). */
  insertMany(recs: readonly T[]): void {
    for (const r of recs) this.map.set(r.id, r);
    this.dirty();
    if (!seeding) for (const r of recs) record(this.name, r.id, r);
  }

  update(id: string, patch: Partial<T>): T {
    const cur = this.require(id);
    Object.assign(cur, patch);
    this.dirty();
    record(this.name, id, cur);
    return cur;
  }

  /** Persist a record after mutating it in place. */
  save(rec: T): T {
    if (!this.map.has(rec.id)) this.map.set(rec.id, rec);
    this.dirty();
    record(this.name, rec.id, rec);
    return rec;
  }

  remove(id: string): T | undefined {
    const cur = this.map.get(id);
    if (!cur) return undefined;
    this.map.delete(id);
    this.dirty();
    record(this.name, id, null);
    return cur;
  }

  /** @internal overlay replay (no re-recording). */
  _applyOverlay(id: string, rec: T | null) {
    if (rec === null) this.map.delete(id);
    else this.map.set(id, rec);
    this.dirty();
  }
}

const EMPTY: readonly never[] = Object.freeze([]) as readonly never[];

const tables = new Map<string, Table<any>>();

/** Get (or lazily create) a named table. */
export function tbl<T extends Rec>(name: string): Table<T> {
  let t = tables.get(name);
  if (!t) {
    t = new Table<T>(name);
    tables.set(name, t);
  }
  return t as Table<T>;
}

export function tableNames(): string[] {
  return Array.from(tables.keys());
}

// ─── Seeding ───────────────────────────────────────────────────────────

export interface SeedCtx {
  /** Deterministic RNG private to this seeder (stable across code changes elsewhere). */
  rng: Rng;
  /** Anchor timestamp (ms) every seed date is relative to. */
  now: number;
}

export interface Seeder {
  name: string;
  /** Lower runs first. 10 core people/projects · 30 pmo · 40 chat · 60 notifications/derived · 80+ admin/godmode. */
  order: number;
  run(ctx: SeedCtx): void;
}

const seeders: Seeder[] = [];

export function registerSeeder(s: Seeder): void {
  seeders.push(s);
}

// ─── Boot ──────────────────────────────────────────────────────────────

let readyPromise: Promise<void> | null = null;
let isReady = false;

export function dbReady(): Promise<void> {
  if (!readyPromise) readyPromise = boot();
  return readyPromise;
}

export function isDbReady(): boolean {
  return isReady;
}

async function boot(): Promise<void> {
  setSeedNow(Date.now());
  idb = await openIdb();

  // A new deploy may have changed the generator: drop incompatible overlays.
  let overlay: OverlayRow[] = [];
  if (idb) {
    try {
      const v = await reqP(idb.transaction(META).objectStore(META).get('version'));
      if (v !== DATA_VERSION) {
        const tx = idb.transaction([STORE, META], 'readwrite');
        tx.objectStore(STORE).clear();
        tx.objectStore(META).put(DATA_VERSION, 'version');
        await new Promise<void>((res) => {
          tx.oncomplete = () => res();
          tx.onerror = () => res();
          tx.onabort = () => res();
        });
      } else {
        overlay = await reqP(idb.transaction(STORE).objectStore(STORE).getAll());
      }
    } catch {
      overlay = [];
    }
  }

  seeding = true;
  try {
    const now = seedNow();
    for (const s of [...seeders].sort((a, b) => a.order - b.order)) {
      s.run({ rng: createRng(`atlas-demo:${s.name}:${hashString(s.name)}`), now });
    }
  } finally {
    seeding = false;
  }

  for (const row of overlay) tbl(row.table)._applyOverlay(row.id, row.rec as never);
  isReady = true;
}

/** Wipe the visitor's saved edits (and cosmetic prefs) and reload fresh. */
export async function resetDemoData(): Promise<void> {
  pending.clear();
  try {
    if (idb) idb.close();
    await new Promise<void>((res) => {
      const r = indexedDB.deleteDatabase(DB_NAME);
      r.onsuccess = r.onerror = r.onblocked = () => res();
    });
  } catch {
    /* ignore */
  }
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('atlas_') || k.startsWith('atlas:')) localStorage.removeItem(k);
    }
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  window.location.assign('/');
}
