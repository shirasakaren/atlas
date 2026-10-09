/** PMO handlers: task lists, tabs and statuses. */
import { assertManager } from '../access';
import { conflict, badRequest, del, get, notFound, patch, post } from '../http';
import { newId } from '../prng';
import { DEFAULT_STATUSES, DEFAULT_TABS, pmoLists, pmoStatuses, pmoTabs, pmoTasks, type ListRec, type StatusRec, type TabRec } from '../seed/pmo-store';
import {
  body,
  CATEGORIES,
  COLORS,
  ICON_RE,
  listDto,
  listOf,
  nowIso,
  oneOf,
  optString,
  pctx,
  reqString,
  statusesOf,
} from './pmo-shape';

const MAX_LISTS = 50;
const MAX_TABS = 20;

export function deriveProjectKey(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'TASK';
  if (words.length === 1) return words[0]!.slice(0, Math.min(4, words[0]!.length)) || 'TASK';
  return words.slice(0, 6).map((w) => w[0]!).join('').slice(0, 6);
}

/** Create a list with default statuses + built-in tabs (also used by contracts.pmo.onProjectCreated). */
export function createList(projectId: string, init: { name: string; iconName?: string; iconColor?: ListRec['iconColor']; projectKey?: string; contributorsCanCreateTasks?: boolean }): ListRec {
  const existing = pmoLists().where('projectId', projectId).filter((l) => !l.deletedAt).length;
  const now = nowIso();
  const list: ListRec = {
    id: newId('tls'),
    projectId,
    name: init.name,
    iconName: init.iconName ?? 'list-todo',
    iconColor: init.iconColor ?? 'blue',
    order: existing,
    contributorsCanCreateTasks: init.contributorsCanCreateTasks ?? true,
    projectKey: init.projectKey ?? deriveProjectKey(init.name),
    taskCounter: 0,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  pmoLists().insert(list);
  DEFAULT_STATUSES.forEach((s, i) =>
    pmoStatuses().insert({ id: newId('tst'), taskListId: list.id, name: s.name, color: s.color, category: s.category, order: i, isDefault: s.isDefault }),
  );
  DEFAULT_TABS.forEach((t, i) =>
    pmoTabs().insert({ id: newId('ttb'), taskListId: list.id, kind: t.kind, label: null, iconName: t.iconName, url: null, embedPreset: null, order: i, hidden: false, createdAt: now }),
  );
  return list;
}

function touch(l: ListRec) {
  l.updatedAt = nowIso();
  pmoLists().save(l);
}

get('/projects/:slug/task-lists', (req) => {
  const { project } = pctx(req);
  return pmoLists()
    .where('projectId', project.id)
    .filter((l) => !l.deletedAt)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
    .map(listDto);
});

get('/projects/:slug/task-lists/:listId', (req) => {
  const { project } = pctx(req);
  return listDto(listOf(project.id, req.params.listId!));
});

function parseListFields(b: Record<string, any>, partial: boolean) {
  const out: { name?: string; iconName?: string; iconColor?: ListRec['iconColor']; projectKey?: string; contributorsCanCreateTasks?: boolean } = {};
  if (!partial || b.name !== undefined) out.name = reqString(b.name, 'name', 1, 80);
  if (b.iconName !== undefined) {
    const v = reqString(b.iconName, 'iconName', 1, 40);
    if (!ICON_RE.test(v)) throw badRequest('iconName must be a lowercase kebab-case Lucide key');
    out.iconName = v;
  }
  if (b.iconColor !== undefined) out.iconColor = oneOf(b.iconColor, 'iconColor', COLORS);
  if (b.projectKey !== undefined) {
    const v = reqString(b.projectKey, 'projectKey', 2, 6);
    if (!/^[A-Z][A-Z0-9]{1,5}$/.test(v)) throw badRequest('projectKey must be 2–6 uppercase letters/digits');
    out.projectKey = v;
  }
  if (b.contributorsCanCreateTasks !== undefined) {
    if (typeof b.contributorsCanCreateTasks !== 'boolean') throw badRequest('contributorsCanCreateTasks must be a boolean value');
    out.contributorsCanCreateTasks = b.contributorsCanCreateTasks;
  }
  return out;
}

post('/projects/:slug/task-lists', (req) => {
  const { project, access } = pctx(req);
  assertManager(access);
  const f = parseListFields(body(req), false);
  const count = pmoLists().where('projectId', project.id).filter((l) => !l.deletedAt).length;
  if (count >= MAX_LISTS) throw conflict(`Project already has ${count} task lists. Maximum is ${MAX_LISTS}.`);
  return listDto(createList(project.id, f as never));
});

patch('/projects/:slug/task-lists/reorder', (req) => {
  const { project, access } = pctx(req);
  assertManager(access);
  const ids = body(req).listIds;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50) throw badRequest('listIds must be a non-empty array');
  ids
    .filter((id: unknown): id is string => typeof id === 'string')
    .filter((id) => {
      const l = pmoLists().get(id);
      return !!l && l.projectId === project.id && !l.deletedAt;
    })
    .forEach((id, idx) => {
      const l = pmoLists().get(id)!;
      l.order = idx;
      pmoLists().save(l);
    });
  return { ok: true };
});

patch('/projects/:slug/task-lists/:listId', (req) => {
  const { project, access } = pctx(req);
  assertManager(access);
  const l = listOf(project.id, req.params.listId!);
  const f = parseListFields(body(req), true);
  if (Object.keys(f).length > 0) {
    Object.assign(l, f);
    touch(l);
  }
  return listDto(l);
});

post('/projects/:slug/task-lists/:listId/archive', (req) => {
  const { project, access } = pctx(req);
  assertManager(access);
  const l = listOf(project.id, req.params.listId!);
  if (!l.archivedAt) {
    l.archivedAt = nowIso();
    touch(l);
  }
  return listDto(l);
});

post('/projects/:slug/task-lists/:listId/unarchive', (req) => {
  const { project, access } = pctx(req);
  assertManager(access);
  const l = listOf(project.id, req.params.listId!);
  l.archivedAt = null;
  touch(l);
  return listDto(l);
});

del('/projects/:slug/task-lists/:listId', (req) => {
  const { project, access } = pctx(req);
  assertManager(access);
  const l = listOf(project.id, req.params.listId!);
  l.deletedAt = nowIso();
  pmoLists().save(l);
  return { ok: true };
});

// ─── tabs ──────────────────────────────────────────────────────────────────

patch('/projects/:slug/task-lists/:listId/tabs/reorder', (req) => {
  const { project, access } = pctx(req);
  assertManager(access);
  const l = listOf(project.id, req.params.listId!);
  const items = body(req).tabs;
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) throw badRequest('tabs must be a non-empty array');
  const mine = new Map(pmoTabs().where('taskListId', l.id).map((t) => [t.id, t]));
  let touched = 0;
  items.forEach((it: { id?: string; hidden?: boolean }, idx: number) => {
    const t = it && typeof it.id === 'string' ? mine.get(it.id) : undefined;
    if (!t) return;
    t.order = idx;
    if (typeof it.hidden === 'boolean') t.hidden = it.hidden;
    pmoTabs().save(t);
    touched++;
  });
  if (touched === 0) throw badRequest('No matching tabs to reorder.');
  return listDto(l);
});

const PRESETS = ['figma', 'gdocs', 'gsheets', 'gslides', 'canva', 'loom', 'youtube', 'miro', 'custom'] as const;

post('/projects/:slug/task-lists/:listId/tabs', (req) => {
  const { project, access } = pctx(req);
  assertManager(access);
  const l = listOf(project.id, req.params.listId!);
  const b = body(req);
  const label = reqString(b.label, 'label', 1, 80).trim();
  const url = reqString(b.url, 'url', 1, 2048);
  if (!/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) throw badRequest('url must be a URL address');
  const preset = b.embedPreset === undefined ? 'custom' : oneOf(b.embedPreset, 'embedPreset', PRESETS);
  const iconName = optString(b.iconName, 'iconName', 1, 40);
  if (iconName && !ICON_RE.test(iconName)) throw badRequest('iconName must be a lowercase kebab-case Lucide key');
  const tabs = pmoTabs().where('taskListId', l.id);
  if (tabs.length >= MAX_TABS) throw badRequest(`A list can have at most ${MAX_TABS} tabs.`);
  if (tabs.some((t) => t.kind === 'EMBED' && t.label === label)) throw conflict('A tab with that name already exists in this list.');
  const tab: TabRec = {
    id: newId('ttb'),
    taskListId: l.id,
    kind: 'EMBED',
    label,
    iconName: iconName ?? null,
    url,
    embedPreset: preset,
    order: tabs.reduce((m, t) => Math.max(m, t.order), -1) + 1,
    hidden: false,
    createdAt: nowIso(),
  };
  pmoTabs().insert(tab);
  return listDto(l);
});

del('/projects/:slug/task-lists/:listId/tabs/:tabId', (req) => {
  const { project, access } = pctx(req);
  assertManager(access);
  const l = listOf(project.id, req.params.listId!);
  const tab = pmoTabs().get(req.params.tabId);
  if (!tab || tab.taskListId !== l.id) throw notFound('Tab not found.');
  if (tab.kind !== 'EMBED') throw badRequest('Built-in tabs cannot be deleted, hide them instead.');
  pmoTabs().remove(tab.id);
  return listDto(l);
});

// ─── statuses ──────────────────────────────────────────────────────────────

patch('/projects/:slug/task-lists/:listId/statuses', (req) => {
  const { project, access } = pctx(req);
  assertManager(access);
  const l = listOf(project.id, req.params.listId!);
  const b = body(req);
  const entries = b.statuses;
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 30) throw badRequest('statuses must contain between 1 and 30 items');
  const current = statusesOf(l.id);
  const byId = new Map(current.map((s) => [s.id, s]));
  const parsed = entries.map((e: Record<string, any>) => {
    if (e.id !== undefined && !byId.has(e.id)) throw badRequest(`Status ${e.id} not found in this list.`);
    return {
      id: e.id as string | undefined,
      name: reqString(e.name, 'name', 1, 40),
      color: e.color === undefined ? 'neutral' : oneOf(e.color, 'color', COLORS),
      category: e.category === undefined ? 'TODO' : oneOf(e.category, 'category', CATEGORIES),
      isDefault: e.isDefault === true,
    };
  });
  const keep = new Set(parsed.filter((e) => e.id).map((e) => e.id!));
  const doomed = current.filter((s) => !keep.has(s.id));
  const moveTo = typeof b.moveTasksTo === 'string' ? b.moveTasksTo : undefined;
  if (doomed.length > 0) {
    const doomedIds = new Set(doomed.map((s) => s.id));
    const affected = pmoTasks().where('taskListId', l.id).filter((t) => !t.deletedAt && doomedIds.has(t.statusId));
    if (affected.length > 0) {
      if (!moveTo) throw badRequest('Deleting a status with tasks requires moveTasksTo set to a kept status.');
      if (!keep.has(moveTo)) throw badRequest('moveTasksTo must reference a kept status.');
    }
    if (moveTo && keep.has(moveTo)) {
      for (const t of pmoTasks().where('taskListId', l.id)) {
        if (doomedIds.has(t.statusId)) {
          t.statusId = moveTo;
          pmoTasks().save(t);
        }
      }
    }
    for (const s of doomed) pmoStatuses().remove(s.id);
  }
  const explicit = parsed.findIndex((e) => e.isDefault);
  const defIdx = explicit === -1 ? 0 : explicit;
  parsed.forEach((e, i) => {
    if (e.id) {
      const s = byId.get(e.id)!;
      Object.assign(s, { name: e.name, color: e.color, category: e.category, order: i, isDefault: i === defIdx });
      pmoStatuses().save(s);
    } else {
      const s: StatusRec = { id: newId('tst'), taskListId: l.id, name: e.name, color: e.color, category: e.category, order: i, isDefault: i === defIdx };
      pmoStatuses().insert(s);
    }
  });
  touch(l);
  return listDto(l);
});
