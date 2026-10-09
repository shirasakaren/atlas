/**
 * Tags, notifications (+ preferences, push stubs) and global search.
 */
import { ME_ID } from '../config';
import { contracts } from '../contracts';
import { accessibleProjectIds } from '../access';
import { nowIso } from '../clock';
import { badRequest, del, get, intParam, notFound, paginate, patch, post, forbidden } from '../http';
import { pushToClients } from '../realtime';
import { newId, slugify } from '../prng';
import type { TagRec } from '../schema';
import { members, notifications, projects, tags } from '../store';
import { me } from '../access';
import { listProjects } from './app-projects';
import { defaultPrefs, PREF_FLAGS, prefsTable, pushDevicesTable, type PrefRec } from './app-shared';
import type { GlobalSearchResponse } from '@/lib/types';

// ─── Tags ───────────────────────────────────────────────────────────────

const sortedTags = () =>
  tags()
    .all()
    .slice()
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

function assertCanManageTags() {
  if (me().isAdmin) return;
  if (!members().where('userId', ME_ID).some((m) => m.role === 'PROJECT_MANAGER')) {
    throw forbidden('Only Admins or Project Managers can configure tags.');
  }
}

function tagField(v: unknown, field: string, required: boolean): string | undefined {
  if (v === undefined && !required) return undefined;
  if (typeof v !== 'string' || !v.trim()) throw badRequest(`${field} must be longer than or equal to 1 characters`);
  if (v.length > 48) throw badRequest(`${field} must be shorter than or equal to 48 characters`);
  return v.trim();
}

get('/tags', () => sortedTags());

get('/tags/grouped', () => {
  const groups = new Map<string, TagRec[]>();
  for (const t of sortedTags()) {
    const list = groups.get(t.category) ?? [];
    list.push(t);
    groups.set(t.category, list);
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }));
});

post('/tags', (req) => {
  assertCanManageTags();
  const name = tagField(req.body?.name, 'name', true)!;
  const category = tagField(req.body?.category, 'category', true)!;
  const base = `${slugify(category)}-${slugify(name)}`;
  let slug = base;
  let n = 2;
  while (tags().where('slug', slug).length) slug = `${base}-${n++}`;
  const rec: TagRec = { id: newId('tag'), name, category, slug };
  tags().insert(rec);
  return { ...rec };
});

patch('/tags/:id', (req) => {
  assertCanManageTags();
  const t = tags().get(req.params.id!);
  if (!t) throw notFound('Tag not found.');
  const name = tagField(req.body?.name, 'name', false);
  const category = tagField(req.body?.category, 'category', false);
  if (name !== undefined) t.name = name;
  if (category !== undefined) t.category = category;
  tags().save(t);
  return { ...t };
});

del('/tags/:id', (req) => {
  assertCanManageTags();
  const t = tags().get(req.params.id!);
  if (!t) throw notFound('Tag not found.');
  tags().remove(t.id);
  for (const p of projects().all()) {
    if (p.tagIds.includes(t.id)) {
      p.tagIds = p.tagIds.filter((id) => id !== t.id);
      projects().save(p);
    }
  }
  return { deleted: true };
});

// ─── Notifications ──────────────────────────────────────────────────────

const mineNewestFirst = () =>
  notifications()
    .where('userId', ME_ID)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

function emitUnread() {
  const unread = notifications().where('userId', ME_ID).filter((n) => !n.readAt).length;
  pushToClients('/notifications', 'notification:unread', { unread });
}

get('/notifications', (req) => {
  const page = Number(req.query.get('page')) || 1;
  const pageSize = Math.min(Number(req.query.get('pageSize')) || 20, 100);
  return paginate(mineNewestFirst(), page, pageSize);
});

get('/notifications/unread-count', () => ({
  unread: notifications().where('userId', ME_ID).filter((n) => !n.readAt).length,
}));

patch('/notifications/:id/read', (req) => {
  const n = notifications().get(req.params.id!);
  if (n && n.userId === ME_ID && !n.readAt) {
    n.readAt = nowIso();
    notifications().save(n);
    emitUnread();
  }
  return { ok: true };
});

post('/notifications/read-all', () => {
  const at = nowIso();
  let updated = 0;
  for (const n of notifications().where('userId', ME_ID)) {
    if (!n.readAt) {
      n.readAt = at;
      notifications().save(n);
      updated++;
    }
  }
  emitUnread();
  return { updated };
});

// Web push is disabled in the demo (`features.push` is false in /public-config): harmless stubs.
get('/notifications/push/vapid-public-key', () => ({ publicKey: '', configured: false }));
post('/notifications/push/subscribe', (req) => {
  const rec = { id: newId('psh'), userAgent: typeof req.body?.userAgent === 'string' ? req.body.userAgent : null, createdAt: nowIso(), lastSeenAt: nowIso() };
  pushDevicesTable().insert(rec);
  return { ...rec };
});
get('/notifications/push/subscriptions', () =>
  pushDevicesTable().all().map((d) => ({ id: d.id, userAgent: d.userAgent, createdAt: d.createdAt, lastSeenAt: d.lastSeenAt })),
);
del('/notifications/push/subscriptions/:id', (req) => {
  pushDevicesTable().remove(req.params.id!);
  return { ok: true };
});

// ─── Preferences ────────────────────────────────────────────────────────

function getOrCreatePrefs(): PrefRec {
  let p = prefsTable().where('userId', ME_ID)[0];
  if (!p) p = prefsTable().insert(defaultPrefs(ME_ID));
  return p;
}

get('/notifications/preferences', () => ({ ...getOrCreatePrefs() }));

patch('/notifications/preferences', (req) => {
  const p = getOrCreatePrefs();
  const body = (req.body ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(body)) {
    if (!(PREF_FLAGS as readonly string[]).includes(k)) continue;
    if (typeof v !== 'boolean') throw badRequest(`${k} must be a boolean value`);
    p[k] = v;
  }
  p.updatedAt = nowIso();
  prefsTable().save(p);
  return { ...p };
});

// ─── Global search ──────────────────────────────────────────────────────

get('/search', (req): GlobalSearchResponse => {
  const term = (req.query.get('q') ?? '').trim();
  const limit = Math.min(Math.max(intParam(req.query, 'limit', 8, 20), 1), 20);
  const empty: GlobalSearchResponse = { query: term, projects: [], chat: [], notes: [], files: [], tasks: [], whiteboards: [] };
  if (!term) return empty;
  const ids = accessibleProjectIds();
  const found = listProjects({ q: term, page: 1, pageSize: limit, sort: 'recently-updated' });
  return {
    query: term,
    projects: found.items.map((p) => ({ id: p.id, slug: p.slug, title: p.title, thumbnailUrl: p.thumbnailUrl })),
    chat: contracts.chat?.searchMessages(term, ids, 20) ?? [],
    notes: contracts.pmo?.searchNotes(term, ids, limit) ?? [],
    files: contracts.pmo?.searchFiles(term, ids, limit) ?? [],
    tasks: contracts.pmo?.searchTasks(term, ids, limit) ?? [],
    whiteboards: contracts.pmo?.searchWhiteboards(term, ids, limit) ?? [],
  };
});
