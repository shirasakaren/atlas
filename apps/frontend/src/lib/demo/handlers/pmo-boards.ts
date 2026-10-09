/**
 * PMO handlers: notes and whiteboards.
 *
 * There is no Yjs websocket in the demo: both editors run in their
 * single-user mode and persist through the debounced snapshot PATCH
 * (`contentSnapshot` / `sceneSnapshot`). Seeded bodies are generated lazily
 * (deterministically) on first read and replaced by the visitor's edits.
 */
import { ME_ID } from '../config';
import { badRequest, del, get, notFound, patch, post } from '../http';
import { presign } from '../blobs';
import { newId } from '../prng';
import type { ProjectKind, ProjectRec } from '../schema';
import { members as membersTbl, users } from '../store';
import { buildNote, buildScene, sceneThumbnail } from '../seed/pmo-docs';
import { pmoNoteRevs, pmoNotes, pmoWbRevs, pmoWbs, type NoteRec, type NoteRevRec, type WbRec, type WbRevRec } from '../seed/pmo-store';
import { vocabFor } from '../seed/pmo-vocab';
import { body, lite, nowIso, optString, pctx, reqString, ICON_RE } from './pmo-shape';

const MAX_NOTES = 500;
const MAX_DEPTH = 5;
const MAX_WBS = 100;
const MAX_REVS = 50;
const COALESCE_MS = 90_000;
const TECH = new Set(['software', 'infrastructure', 'security', 'mobile', 'data', 'research']);

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

function peopleOf(project: ProjectRec, seed: number): string[] {
  const names = membersTbl().where('projectId', project.id).map((m) => users().get(m.userId)?.name).filter((n): n is string => !!n);
  if (names.length === 0) return ['The team'];
  const off = seed % names.length;
  return [...names.slice(off), ...names.slice(0, off)];
}

const noteCache = new Map<string, unknown>();
function noteBody(project: ProjectRec, n: NoteRec): unknown {
  if (n.contentSnapshot !== null) return n.contentSnapshot;
  if (!n.gen) return {};
  const ck = `${n.id}`;
  let v = noteCache.get(ck);
  if (!v) {
    v = buildNote({
      kind: n.gen.kind,
      seed: n.gen.seed,
      vocab: vocabFor(project.kind as ProjectKind),
      projectTitle: project.title,
      people: peopleOf(project, n.gen.seed),
      daysAgo: Math.max(0, Math.round((Date.now() - Date.parse(n.createdAt)) / 86_400_000)),
      technical: TECH.has(project.kind),
    });
    noteCache.set(ck, v);
  }
  return v;
}

const sceneCache = new Map<string, unknown>();
function sceneBody(project: ProjectRec, w: WbRec): unknown {
  if (w.sceneSnapshot !== null) return w.sceneSnapshot;
  if (!w.gen) return {};
  let v = sceneCache.get(w.id);
  if (!v) {
    v = buildScene({ kind: w.gen.kind, seed: w.gen.seed, vocab: vocabFor(project.kind as ProjectKind), projectTitle: project.title, people: peopleOf(project, w.gen.seed) });
    sceneCache.set(w.id, v);
  }
  return v;
}

// ─── Notes ─────────────────────────────────────────────────────────────────

const noteItem = (n: NoteRec) => ({
  id: n.id,
  projectId: n.projectId,
  parentNoteId: n.parentNoteId,
  title: n.title,
  iconName: n.iconName,
  order: n.order,
  createdById: n.createdById,
  archivedAt: n.archivedAt,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
});

const noteFull = (project: ProjectRec, n: NoteRec) => ({ ...noteItem(n), yDocKey: n.yDocKey, contentSnapshot: noteBody(project, n), deletedAt: n.deletedAt });

function noteOf(projectId: string, id: string): NoteRec {
  const n = pmoNotes().get(id);
  if (!n || n.projectId !== projectId || n.deletedAt) throw notFound('Note not found.');
  return n;
}

function noteDepth(projectId: string, parentId: string): number {
  let depth = 1;
  let cur: string | null = parentId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    depth++;
    seen.add(cur);
    cur = pmoNotes().get(cur)?.parentNoteId ?? null;
  }
  return depth;
}

function noteSubtree(projectId: string, rootId: string): string[] {
  const ids = [rootId];
  let parents = [rootId];
  while (parents.length) {
    const next: string[] = [];
    for (const n of pmoNotes().where('projectId', projectId)) if (!n.deletedAt && n.parentNoteId && parents.includes(n.parentNoteId) && !ids.includes(n.id)) next.push(n.id);
    ids.push(...next);
    parents = next;
  }
  return ids;
}

get('/projects/:slug/notes', (req) => {
  const { project } = pctx(req);
  const notes = pmoNotes()
    .where('projectId', project.id)
    .filter((n) => !n.deletedAt)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
    .map(noteItem);
  return { notes };
});

get('/projects/:slug/notes/:noteId', (req) => {
  const { project } = pctx(req);
  return noteFull(project, noteOf(project.id, req.params.noteId!));
});

get('/projects/:slug/notes/:noteId/yjs-token', (req) => {
  const { project } = pctx(req);
  const n = noteOf(project.id, req.params.noteId!);
  return { token: 'demo-token', docKey: n.yDocKey, wsUrl: '' };
});

post('/projects/:slug/notes', (req) => {
  const { project } = pctx(req);
  const b = body(req);
  const all = pmoNotes().where('projectId', project.id).filter((n) => !n.deletedAt);
  if (all.length >= MAX_NOTES) throw badRequest(`A project can have at most ${MAX_NOTES} notes.`);
  const title = optString(b.title, 'title', 1, 200);
  const iconName = optString(b.iconName, 'iconName', 1, 40);
  if (iconName && !ICON_RE.test(iconName)) throw badRequest('iconName must be a lowercase kebab-case Lucide key');
  const parent = (b.parentNoteId as string | undefined) ?? null;
  if (parent) {
    const p = pmoNotes().get(parent);
    if (!p || p.projectId !== project.id || p.deletedAt) throw notFound('Parent note not found.');
    if (noteDepth(project.id, parent) > MAX_DEPTH) throw badRequest(`Notes can be nested at most ${MAX_DEPTH} levels deep.`);
  }
  const order = all.filter((n) => n.parentNoteId === parent).reduce((m, n) => Math.max(m, n.order), -1) + 1;
  const id = newId('nte');
  const now = nowIso();
  const note: NoteRec = { id, projectId: project.id, parentNoteId: parent, title: title?.trim() || 'Untitled', iconName: iconName ?? null, order, createdById: ME_ID, archivedAt: null, createdAt: now, updatedAt: now, yDocKey: `note:${id}`, contentSnapshot: {}, gen: null, deletedAt: null };
  pmoNotes().insert(note);
  return noteFull(project, note);
});

function addNoteRevision(project: ProjectRec, n: NoteRec, snapshot: unknown) {
  const size = JSON.stringify(snapshot ?? null).length;
  const revs = pmoNoteRevs().where('noteId', n.id).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = revs[0];
  if (last && !last.isCheckpoint && last.authorId === ME_ID && Date.now() - Date.parse(last.createdAt) < COALESCE_MS) {
    last.contentSnapshot = snapshot;
    last.size = size;
    last.createdAt = nowIso();
    pmoNoteRevs().save(last);
    return;
  }
  // freeze the pre-edit body so older revisions keep their content
  for (const r of revs) {
    if (r.contentSnapshot === null) {
      const full = noteBody(project, n);
      const arr = Array.isArray(full) ? full : [];
      r.contentSnapshot = r.frac >= 1 ? full : arr.slice(0, Math.max(1, Math.ceil(arr.length * r.frac)));
      pmoNoteRevs().save(r);
    }
  }
  pmoNoteRevs().insert({ id: newId('nrv'), noteId: n.id, contentSnapshot: snapshot, frac: 1, size, authorId: ME_ID, isCheckpoint: false, createdAt: nowIso() });
  const extra = revs.filter((r) => !r.isCheckpoint).slice(MAX_REVS - 1);
  for (const r of extra) pmoNoteRevs().remove(r.id);
}

patch('/projects/:slug/notes/:noteId', (req) => {
  const { project } = pctx(req);
  const n = noteOf(project.id, req.params.noteId!);
  const b = body(req);
  const title = optString(b.title, 'title', 1, 200);
  const hasContent = Object.prototype.hasOwnProperty.call(b, 'contentSnapshot') && b.contentSnapshot !== undefined;
  if (hasContent) addNoteRevision(project, n, b.contentSnapshot); // before mutating so the old body can be frozen
  if (title !== undefined) n.title = title.trim() || 'Untitled';
  if (b.iconName !== undefined) {
    if (b.iconName !== null) {
      const v = reqString(b.iconName, 'iconName', 1, 40);
      if (!ICON_RE.test(v)) throw badRequest('iconName must be a lowercase kebab-case Lucide key');
      n.iconName = v;
    } else n.iconName = null;
  }
  if (b.order !== undefined) {
    if (typeof b.order !== 'number' || !Number.isInteger(b.order) || b.order < 0) throw badRequest('order must not be less than 0');
    n.order = b.order;
  }
  if (hasContent) {
    n.contentSnapshot = b.contentSnapshot;
    n.gen = null;
  }
  if (b.parentNoteId !== undefined) {
    const target = b.parentNoteId as string | null;
    if (target === null) n.parentNoteId = null;
    else if (target === n.id) throw badRequest('A note cannot be its own parent.');
    else {
      const p = pmoNotes().get(target);
      if (!p || p.projectId !== project.id || p.deletedAt) throw notFound('Parent note not found.');
      if (noteSubtree(project.id, n.id).includes(target)) throw badRequest('A note cannot be moved into its own descendant.');
      if (noteDepth(project.id, target) > MAX_DEPTH) throw badRequest(`Notes can be nested at most ${MAX_DEPTH} levels deep.`);
      n.parentNoteId = target;
    }
  }
  n.updatedAt = nowIso();
  pmoNotes().save(n);
  return noteFull(project, n);
});

const authorOf = (id: string | null) => (id ? lite(id) : null);

get('/projects/:slug/notes/:noteId/revisions', (req) => {
  const { project } = pctx(req);
  const n = noteOf(project.id, req.params.noteId!);
  const revisions = pmoNoteRevs()
    .where('noteId', n.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100)
    .map((r) => ({ id: r.id, createdAt: r.createdAt, size: r.size, isCheckpoint: r.isCheckpoint, author: authorOf(r.authorId) }));
  return { revisions };
});

function noteRevOf(project: ProjectRec, n: NoteRec, id: string): NoteRevRec & { contentSnapshot: unknown } {
  const r = pmoNoteRevs().get(id);
  if (!r || r.noteId !== n.id) throw notFound('Revision not found.');
  if (r.contentSnapshot !== null) return r as never;
  const full = noteBody(project, n);
  const arr = Array.isArray(full) ? full : [];
  return { ...r, contentSnapshot: r.frac >= 1 ? full : arr.slice(0, Math.max(1, Math.ceil(arr.length * r.frac))) };
}

get('/projects/:slug/notes/:noteId/revisions/:revisionId', (req) => {
  const { project } = pctx(req);
  const n = noteOf(project.id, req.params.noteId!);
  const r = noteRevOf(project, n, req.params.revisionId!);
  return { id: r.id, noteId: r.noteId, contentSnapshot: r.contentSnapshot, size: r.size, authorId: r.authorId, isCheckpoint: r.isCheckpoint, createdAt: r.createdAt };
});

post('/projects/:slug/notes/:noteId/revisions/:revisionId/restore', (req) => {
  const { project } = pctx(req);
  const n = noteOf(project.id, req.params.noteId!);
  const r = noteRevOf(project, n, req.params.revisionId!);
  const snapshot = r.contentSnapshot;
  addNoteRevisionForce(project, n, snapshot);
  n.contentSnapshot = snapshot;
  n.gen = null;
  n.updatedAt = nowIso();
  pmoNotes().save(n);
  return noteFull(project, n);
});

function addNoteRevisionForce(project: ProjectRec, n: NoteRec, snapshot: unknown) {
  // freeze existing lazily-derived revisions first (their content depends on the current body)
  for (const r of pmoNoteRevs().where('noteId', n.id)) {
    if (r.contentSnapshot === null) {
      const full = noteBody(project, n);
      const arr = Array.isArray(full) ? full : [];
      r.contentSnapshot = r.frac >= 1 ? full : arr.slice(0, Math.max(1, Math.ceil(arr.length * r.frac)));
      pmoNoteRevs().save(r);
    }
  }
  pmoNoteRevs().insert({ id: newId('nrv'), noteId: n.id, contentSnapshot: snapshot, frac: 1, size: JSON.stringify(snapshot ?? null).length, authorId: ME_ID, isCheckpoint: false, createdAt: nowIso() });
}

del('/projects/:slug/notes/:noteId', (req) => {
  const { project } = pctx(req);
  const n = noteOf(project.id, req.params.noteId!);
  const ids = noteSubtree(project.id, n.id);
  const now = nowIso();
  for (const id of ids) {
    const x = pmoNotes().get(id)!;
    x.deletedAt = now;
    pmoNotes().save(x);
  }
  return { deleted: true, count: ids.length };
});

// ─── Whiteboards ───────────────────────────────────────────────────────────

const thumbCache = new Map<string, string>();
function thumbOf(project: ProjectRec, w: WbRec): string {
  if (w.thumbnailUrl) return w.thumbnailUrl;
  const k = `${w.id}:${w.updatedAt}`;
  let v = thumbCache.get(k);
  if (!v) {
    v = sceneThumbnail(sceneBody(project, w));
    thumbCache.set(k, v);
  }
  return v;
}

const wbItem = (project: ProjectRec, w: WbRec) => ({
  id: w.id,
  projectId: w.projectId,
  title: w.title,
  description: w.description,
  thumbnailUrl: thumbOf(project, w),
  createdById: w.createdById,
  archivedAt: w.archivedAt,
  createdAt: w.createdAt,
  updatedAt: w.updatedAt,
});

const wbFull = (project: ProjectRec, w: WbRec) => ({ ...wbItem(project, w), yDocKey: w.yDocKey, sceneSnapshot: sceneBody(project, w), deletedAt: w.deletedAt });

function wbOf(projectId: string, id: string): WbRec {
  const w = pmoWbs().get(id);
  if (!w || w.projectId !== projectId || w.deletedAt) throw notFound('Whiteboard not found.');
  return w;
}

function truncScene(scene: unknown, frac: number): unknown {
  if (frac >= 1) return scene;
  const s = scene as { elements?: unknown[] } | null;
  if (!s || !Array.isArray(s.elements)) return scene;
  return { ...s, elements: s.elements.slice(0, Math.max(1, Math.ceil(s.elements.length * frac))) };
}

function freezeWbRevs(project: ProjectRec, w: WbRec) {
  for (const r of pmoWbRevs().where('whiteboardId', w.id)) {
    if (r.sceneSnapshot === null) {
      r.sceneSnapshot = truncScene(sceneBody(project, w), r.frac);
      pmoWbRevs().save(r);
    }
  }
}

get('/projects/:slug/whiteboards', (req) => {
  const { project } = pctx(req);
  const whiteboards = pmoWbs()
    .where('projectId', project.id)
    .filter((w) => !w.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((w) => wbItem(project, w));
  return { whiteboards };
});

get('/projects/:slug/whiteboards/:wbId', (req) => {
  const { project } = pctx(req);
  return wbFull(project, wbOf(project.id, req.params.wbId!));
});

get('/projects/:slug/whiteboards/:wbId/export', (req) => {
  const { project } = pctx(req);
  const w = wbOf(project.id, req.params.wbId!);
  return { format: 'mgm.whiteboard', version: 1, exportedAt: nowIso(), atlas: { projectId: project.id, whiteboardId: w.id, title: w.title }, scene: sceneBody(project, w), mentions: [] };
});

get('/projects/:slug/whiteboards/:wbId/yjs-token', (req) => {
  const { project } = pctx(req);
  const w = wbOf(project.id, req.params.wbId!);
  return { token: 'demo-token', docKey: w.yDocKey, wsUrl: '' };
});

post('/projects/:slug/whiteboards', (req) => {
  const { project } = pctx(req);
  const b = body(req);
  if (pmoWbs().where('projectId', project.id).filter((w) => !w.deletedAt).length >= MAX_WBS) throw badRequest(`A project can have at most ${MAX_WBS} whiteboards.`);
  const title = optString(b.title, 'title', 1, 200);
  const description = optString(b.description, 'description', 0, 2000);
  const id = newId('wbd');
  const now = nowIso();
  const w: WbRec = { id, projectId: project.id, title: title?.trim() || 'Untitled whiteboard', description: description ?? null, thumbnailUrl: null, createdById: ME_ID, archivedAt: null, createdAt: now, updatedAt: now, yDocKey: `whiteboard:${id}`, sceneSnapshot: {}, gen: null, deletedAt: null };
  pmoWbs().insert(w);
  return wbFull(project, w);
});

post('/projects/:slug/whiteboards/:wbId/thumbnail/presign', (req) => {
  const { project } = pctx(req);
  const w = wbOf(project.id, req.params.wbId!);
  const b = body(req);
  const ct = reqString(b.contentType, 'contentType', 1, 127);
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(ct)) throw badRequest('Thumbnail must be a PNG, JPEG, or WebP image.');
  if (typeof b.contentLength !== 'number' || b.contentLength < 1) throw badRequest('contentLength must not be less than 1');
  if (b.contentLength > 5 * 1024 * 1024) throw badRequest(`Thumbnail exceeds the ${5 * 1024 * 1024}-byte limit.`);
  const p = presign(`projects/${project.id}/whiteboards/${w.id}`, `thumb.${ct === 'image/png' ? 'png' : ct === 'image/webp' ? 'webp' : 'jpg'}`, ct);
  return { uploadUrl: p.uploadUrl, expiresIn: p.expiresIn, s3Key: p.s3Key, url: p.publicUrl };
});

patch('/projects/:slug/whiteboards/:wbId', (req) => {
  const { project } = pctx(req);
  const w = wbOf(project.id, req.params.wbId!);
  const b = body(req);
  const title = optString(b.title, 'title', 1, 200);
  const hasScene = b.sceneSnapshot !== undefined;
  if (hasScene) {
    freezeWbRevs(project, w);
    const size = JSON.stringify(b.sceneSnapshot ?? null).length;
    const revs = pmoWbRevs().where('whiteboardId', w.id).slice().sort((a, c) => c.createdAt.localeCompare(a.createdAt));
    const last = revs[0];
    if (last && !last.isCheckpoint && last.authorId === ME_ID && Date.now() - Date.parse(last.createdAt) < COALESCE_MS) {
      last.sceneSnapshot = b.sceneSnapshot;
      last.size = size;
      last.createdAt = nowIso();
      pmoWbRevs().save(last);
    } else {
      pmoWbRevs().insert({ id: newId('wrv'), whiteboardId: w.id, sceneSnapshot: b.sceneSnapshot, frac: 1, size, authorId: ME_ID, isCheckpoint: false, createdAt: nowIso() });
      for (const r of revs.filter((x) => !x.isCheckpoint).slice(MAX_REVS - 1)) pmoWbRevs().remove(r.id);
    }
    w.sceneSnapshot = b.sceneSnapshot;
    w.gen = null;
    if (b.thumbnailUrl === undefined) w.thumbnailUrl = sceneThumbnail(b.sceneSnapshot);
  }
  if (title !== undefined) w.title = title.trim() || 'Untitled whiteboard';
  if (b.description !== undefined) w.description = b.description === null ? null : reqString(b.description, 'description', 0, 2000);
  if (b.thumbnailUrl !== undefined) w.thumbnailUrl = b.thumbnailUrl === null ? null : reqString(b.thumbnailUrl, 'thumbnailUrl', 0, 1_000_000);
  w.updatedAt = nowIso();
  pmoWbs().save(w);
  return wbFull(project, w);
});

get('/projects/:slug/whiteboards/:wbId/revisions', (req) => {
  const { project } = pctx(req);
  const w = wbOf(project.id, req.params.wbId!);
  const revisions = pmoWbRevs()
    .where('whiteboardId', w.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100)
    .map((r) => ({ id: r.id, createdAt: r.createdAt, size: r.size, isCheckpoint: r.isCheckpoint, author: authorOf(r.authorId) }));
  return { revisions };
});

function wbRevOf(project: ProjectRec, w: WbRec, id: string): WbRevRec & { sceneSnapshot: unknown } {
  const r = pmoWbRevs().get(id);
  if (!r || r.whiteboardId !== w.id) throw notFound('Revision not found.');
  if (r.sceneSnapshot !== null) return r as never;
  return { ...r, sceneSnapshot: truncScene(sceneBody(project, w), r.frac) };
}

get('/projects/:slug/whiteboards/:wbId/revisions/:revisionId', (req) => {
  const { project } = pctx(req);
  const w = wbOf(project.id, req.params.wbId!);
  const r = wbRevOf(project, w, req.params.revisionId!);
  return { id: r.id, whiteboardId: r.whiteboardId, sceneSnapshot: r.sceneSnapshot, size: r.size, authorId: r.authorId, isCheckpoint: r.isCheckpoint, createdAt: r.createdAt };
});

post('/projects/:slug/whiteboards/:wbId/revisions/:revisionId/restore', (req) => {
  const { project } = pctx(req);
  const w = wbOf(project.id, req.params.wbId!);
  const r = wbRevOf(project, w, req.params.revisionId!);
  freezeWbRevs(project, w);
  pmoWbRevs().insert({ id: newId('wrv'), whiteboardId: w.id, sceneSnapshot: r.sceneSnapshot, frac: 1, size: r.size, authorId: ME_ID, isCheckpoint: false, createdAt: nowIso() });
  w.sceneSnapshot = r.sceneSnapshot;
  w.gen = null;
  w.thumbnailUrl = sceneThumbnail(r.sceneSnapshot);
  w.updatedAt = nowIso();
  pmoWbs().save(w);
  return wbFull(project, w);
});

del('/projects/:slug/whiteboards/:wbId', (req) => {
  const { project } = pctx(req);
  const w = wbOf(project.id, req.params.wbId!);
  w.deletedAt = nowIso();
  pmoWbs().save(w);
  return { deleted: true };
});

void hash;
