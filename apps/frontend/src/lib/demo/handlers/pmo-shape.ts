/**
 * Shared helpers for the PMO handlers: access, validation, and the functions
 * that expand compact seed records into the exact API shapes.
 */
import { assertInsider, resolveProject, userSummary, type ProjectAccess } from '../access';
import { ME_ID } from '../config';
import { badRequest, notFound, type Req } from '../http';
import { posterDataUri } from '../assets';
import { resolveBlobUrl } from '../blobs';
import { newId } from '../prng';
import type { ProjectKind, ProjectRec } from '../schema';
import { projects, users } from '../store';
import { buildDescription } from '../seed/pmo-docs';
import { projectSubject } from '../seed/pmo-content-common';
import {
  pmoActivity,
  pmoLists,
  pmoStatuses,
  pmoTabs,
  pmoTasks,
  type ActivityRec,
  type CommentRec,
  type FileRec,
  type ListRec,
  type TaskRec,
} from '../seed/pmo-store';
import { vocabFor } from '../seed/pmo-vocab';
import type {
  Task,
  TaskActivity,
  TaskComment,
  TaskList,
  TaskStatus,
  ProjectFile,
} from '@/lib/types';

export type InsiderKind = 'admin' | 'manager' | 'contributor';

export interface Pctx {
  project: ProjectRec;
  access: ProjectAccess;
  kind: InsiderKind;
}

/** Resolve `:slug`, require project membership (admins always qualify). */
export function pctx(req: Req): Pctx {
  const { project, access } = resolveProject(req.params.slug!);
  assertInsider(access);
  return { project, access, kind: access.level as InsiderKind };
}

export { assertManager } from '../access';

export const nowIso = () => new Date().toISOString();
export const actorId = () => ME_ID;
export const actorName = () => users().get(ME_ID)?.name ?? 'Someone';

// ─── Validation ────────────────────────────────────────────────────────────

export function body(req: Req): Record<string, any> {
  if (req.body == null || typeof req.body !== 'object' || Array.isArray(req.body)) return {};
  return req.body as Record<string, any>;
}

export function reqString(v: unknown, field: string, min: number, max: number): string {
  if (typeof v !== 'string') throw badRequest(`${field} must be a string`);
  if (v.length < min || v.length > max) throw badRequest(`${field} must be between ${min} and ${max} characters`);
  return v;
}

export function optString(v: unknown, field: string, min: number, max: number): string | undefined {
  return v === undefined ? undefined : reqString(v, field, min, max);
}

export function dateOrNull(v: unknown, field: string): string | null {
  if (v === null) return null;
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) throw badRequest(`${field} must be a valid ISO 8601 date string`);
  return new Date(v).toISOString();
}

export function oneOf<T extends string>(v: unknown, field: string, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !allowed.includes(v as T)) throw badRequest(`${field} must be one of the following values: ${allowed.join(', ')}`);
  return v as T;
}

export const PRIORITIES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const COLORS = ['blue', 'yellow', 'red', 'green', 'neutral'] as const;
export const CATEGORIES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;
export const ICON_RE = /^[a-z0-9-]+$/;

export function intOrNull(v: unknown, field: string, min: number, max: number): number | null {
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw badRequest(`${field} must be an integer between ${min} and ${max}`);
  return v;
}

export function userIds(v: unknown, field: string, max = 20): string[] {
  if (!Array.isArray(v) || v.length > max) throw badRequest(`${field} must be an array of at most ${max} items`);
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== 'string') throw badRequest(`${field} must contain user ids`);
    if (out.includes(x)) throw badRequest(`${field} must not contain duplicate values`);
    if (!users().has(x)) throw badRequest(`User ${x} not found.`);
    out.push(x);
  }
  return out;
}

// ─── Lookups ───────────────────────────────────────────────────────────────

export function listOf(projectId: string, listId: string): ListRec {
  const l = pmoLists().get(listId);
  if (!l || l.projectId !== projectId || l.deletedAt) throw notFound('Task list not found.');
  return l;
}

export function taskOf(projectId: string, taskId: string): TaskRec {
  const t = pmoTasks().get(taskId);
  if (!t || t.projectId !== projectId || t.deletedAt) throw notFound('Task not found.');
  return t;
}

export function statusesOf(listId: string): TaskStatus[] {
  return pmoStatuses().where('taskListId', listId).slice().sort((a, b) => a.order - b.order);
}

// ─── Shapes ────────────────────────────────────────────────────────────────

export function listDto(l: ListRec): TaskList {
  let count = 0;
  for (const t of pmoTasks().where('taskListId', l.id)) if (!t.deletedAt && !t.archivedAt) count++;
  return {
    id: l.id,
    projectId: l.projectId,
    name: l.name,
    iconName: l.iconName,
    iconColor: l.iconColor,
    order: l.order,
    contributorsCanCreateTasks: l.contributorsCanCreateTasks,
    projectKey: l.projectKey,
    taskCounter: l.taskCounter,
    archivedAt: l.archivedAt,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    deletedAt: l.deletedAt,
    statuses: statusesOf(l.id),
    tabs: pmoTabs().where('taskListId', l.id).slice().sort((a, b) => a.order - b.order),
    _count: { tasks: count },
  };
}

export const lite = (id: string) => {
  const s = userSummary(id);
  return { id: s.id, name: s.name, avatarUrl: s.avatarUrl };
};

export function descriptionOf(t: TaskRec): Record<string, unknown> {
  if (t.description) return t.description;
  if (!t.dspec) return {};
  const p = projects().get(t.projectId);
  if (!p) return {};
  return buildDescription({
    seed: t.dspec.s,
    stream: t.dspec.st as never,
    rel: t.dspec.rel,
    blk: t.dspec.blk,
    projectSlug: p.slug,
    listId: t.taskListId,
    vocab: vocabFor(p.kind as ProjectKind),
    projectTitle: p.title,
  });
}

export function taskDto(t: TaskRec, withDescription = true): Task {
  const status = pmoStatuses().get(t.statusId)!;
  return {
    id: t.id,
    taskListId: t.taskListId,
    projectId: t.projectId,
    key: t.key,
    title: t.title,
    description: withDescription ? descriptionOf(t) : {},
    statusId: t.statusId,
    status,
    priority: t.priority,
    storyPoints: t.storyPoints,
    startDate: t.startDate,
    dueDate: t.dueDate,
    completedAt: t.completedAt,
    positionInStatus: String(t.pos),
    createdById: t.createdById,
    archivedAt: t.archivedAt,
    deletedAt: t.deletedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    assignees: t.assignees.map((a) => ({ id: `${t.id}:${a.userId}`, taskId: t.id, userId: a.userId, assignedAt: a.at, user: lite(a.userId) })),
  };
}

export function commentDto(c: CommentRec): TaskComment {
  return {
    id: c.id,
    taskId: c.taskId,
    markdown: c.deletedAt ? '_[comment removed]_' : c.markdown,
    replyToId: c.replyToId,
    editedAt: c.editedAt,
    deletedAt: c.deletedAt,
    createdAt: c.createdAt,
    author: lite(c.authorId),
  };
}

export function activityDto(a: ActivityRec): TaskActivity {
  return {
    id: a.id,
    kind: a.kind as TaskActivity['kind'],
    payload: a.payload,
    createdAt: a.createdAt,
    actor: a.actorId ? lite(a.actorId) : null,
  };
}

export function recordActivity(t: Pick<TaskRec, 'id' | 'projectId' | 'taskListId'>, kind: ActivityRec['kind'], payload: Record<string, unknown> = {}, by: string | null = ME_ID, at: string = nowIso()): ActivityRec {
  return pmoActivity().insert({ id: newId('tac'), taskId: t.id, projectId: t.projectId, listId: t.taskListId, actorId: by, kind, payload, createdAt: at });
}

// ─── Files ─────────────────────────────────────────────────────────────────

function textBody(f: FileRec): string | null {
  const base = f.name.replace(/\.[a-z0-9]+$/i, '');
  if (f.mime === 'text/csv') {
    const rows = ['period,planned,actual,variance'];
    for (let i = 1; i <= 8; i++) rows.push(`W${i},${40 + i * 6},${38 + i * 6 + ((i * 7) % 5)},${((i * 7) % 5) - 2}`);
    return rows.join('\n') + '\n';
  }
  if (f.mime === 'text/markdown') {
    return `# ${base}\n\nWorking notes kept next to the plan. Owners update this file after each review.\n\n## Checklist\n\n- [x] Draft reviewed\n- [ ] Sign-off captured\n- [ ] Evidence attached\n`;
  }
  return null;
}

export function fileDto(f: FileRec): ProjectFile {
  let url = f.url;
  if (!f.isFolder && !url) {
    const text = textBody(f);
    url = text ? `data:${f.mime};charset=utf-8,${encodeURIComponent(text)}` : posterDataUri(f.gen ?? f.name, f.id);
  }
  return {
    id: f.id,
    projectId: f.projectId,
    parentFolderId: f.parentFolderId,
    name: f.name,
    isFolder: f.isFolder,
    url: f.isFolder ? null : url,
    s3Key: f.s3Key,
    mime: f.mime,
    bytes: f.bytes,
    uploadedById: f.uploadedById,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    deletedAt: f.deletedAt,
    uploadedBy: f.uploadedById ? lite(f.uploadedById) : null,
  };
}

export { resolveBlobUrl };

/** Subject helper re-export for the contract module. */
export const subjectOf = (p: ProjectRec) => projectSubject(p.title);
