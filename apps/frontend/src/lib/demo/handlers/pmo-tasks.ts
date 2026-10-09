/** PMO handlers: tasks, gantt, overview, dependencies, mention search, team, undo/redo. */
import { assertManager } from '../access';
import { badRequest, conflict, del, forbidden, get, HttpError, notFound, patch, post } from '../http';
import { ME_ID } from '../config';
import { notify } from '../notify';
import { newId } from '../prng';
import { members as membersTbl, users } from '../store';
import { pmoDeps, pmoStatuses, pmoTasks, pmoUndo, pmoLists, pmoActivity, type TaskRec, type UndoRec } from '../seed/pmo-store';
import { projects } from '../store';
import type { ProjectRec } from '../schema';
import {
  activityDto,
  body,
  dateOrNull,
  intOrNull,
  lite,
  listOf,
  nowIso,
  oneOf,
  pctx,
  PRIORITIES,
  recordActivity,
  reqString,
  statusesOf,
  taskDto,
  taskOf,
  userIds,
  type InsiderKind,
  type Pctx,
} from './pmo-shape';
import { intParam } from '../http';

const MAX_TASKS_PER_LIST = 2000;

function sortedTasks(listId: string): TaskRec[] {
  return pmoTasks().where('taskListId', listId).filter((t) => !t.deletedAt);
}

function nextKey(list: { id: string; projectKey: string | null; taskCounter: number }, projectId: string): string {
  const prefix = list.projectKey && list.projectKey.length > 0 ? list.projectKey : 'TASK';
  let siblingMax = 0;
  for (const t of pmoTasks().where('projectId', projectId)) {
    if (t.key.startsWith(`${prefix}-`)) {
      const n = Number(t.key.slice(prefix.length + 1));
      if (Number.isFinite(n) && n > siblingMax) siblingMax = n;
    }
  }
  const next = Math.max(list.taskCounter + 1, siblingMax + 1);
  return `${prefix}-${next}`;
}

function notifyAssigned(task: TaskRec, project: ProjectRec, ids: string[]) {
  const actor = users().get(ME_ID)?.name ?? 'Someone';
  for (const uid of ids) {
    if (uid === ME_ID) continue;
    notify(uid, {
      type: 'TASK_ASSIGNED',
      title: `${actor} assigned you ${task.key}`,
      body: task.title,
      link: `/projects/${project.slug}/lists/${task.taskListId}/tasks/${task.key}`,
      metadata: { taskId: task.id, taskKey: task.key, actorId: ME_ID },
    });
  }
}

// ─── reads ─────────────────────────────────────────────────────────────────

get('/projects/:slug/task-lists/:listId/tasks', (req) => {
  const { project } = pctx(req);
  const list = listOf(project.id, req.params.listId!);
  const q = req.query;
  const includeArchived = q.get('includeArchived') === 'true';
  const statusId = q.get('statusId');
  const assigneeId = q.get('assigneeId');
  const text = (q.get('q') ?? '').trim().toLowerCase();
  if (text.length > 200) throw badRequest('q must be shorter than or equal to 200 characters');
  return sortedTasks(list.id)
    .filter((t) => (includeArchived || !t.archivedAt) && (!statusId || t.statusId === statusId) && (!assigneeId || t.assignees.some((a) => a.userId === assigneeId)) && (!text || t.title.toLowerCase().includes(text)))
    .sort((a, b) => (a.statusId < b.statusId ? -1 : a.statusId > b.statusId ? 1 : a.pos - b.pos || a.createdAt.localeCompare(b.createdAt)))
    .map((t) => taskDto(t));
});

get('/projects/:slug/tasks/key/:key', (req) => {
  const { project } = pctx(req);
  const key = req.params.key!;
  const t = pmoTasks().where('projectId', project.id).find((x) => x.key === key && !x.deletedAt);
  if (!t) throw notFound('Task not found.');
  return taskDto(t);
});

get('/projects/:slug/tasks/:taskId', (req) => {
  const { project } = pctx(req);
  return taskDto(taskOf(project.id, req.params.taskId!));
});

get('/projects/:slug/tasks/:taskId/activity', (req) => {
  const { project } = pctx(req);
  const t = taskOf(project.id, req.params.taskId!);
  const page = intParam(req.query, 'page', 1, 100000);
  const pageSize = intParam(req.query, 'pageSize', 50, 100);
  const rows = pmoActivity().where('taskId', t.id).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return { items: rows.slice((page - 1) * pageSize, page * pageSize).map(activityDto), total: rows.length, page, pageSize };
});

// ─── create ────────────────────────────────────────────────────────────────

export function createTask(ctx: Pctx, listId: string, b: Record<string, any>): TaskRec {
  const list = listOf(ctx.project.id, listId);
  if (ctx.kind === 'contributor' && !list.contributorsCanCreateTasks) throw forbidden('This list does not allow contributor task creation.');
  const title = reqString(b.title, 'title', 1, 200);
  const existing = sortedTasks(list.id).length;
  if (existing >= MAX_TASKS_PER_LIST) throw conflict(`Task list already has ${existing} tasks. Maximum is ${MAX_TASKS_PER_LIST}.`);
  const statuses = statusesOf(list.id);
  const status = b.statusId !== undefined ? statuses.find((s) => s.id === b.statusId) : (statuses.find((s) => s.isDefault) ?? statuses[0]);
  if (!status) throw badRequest('No matching status for this task list.');
  const priority = b.priority === undefined ? 'NONE' : oneOf(b.priority, 'priority', PRIORITIES);
  const points = b.storyPoints === undefined ? null : intOrNull(b.storyPoints, 'storyPoints', 0, 1000);
  const startDate = b.startDate === undefined ? null : dateOrNull(b.startDate, 'startDate');
  const dueDate = b.dueDate === undefined ? null : dateOrNull(b.dueDate, 'dueDate');
  const assignees = b.assigneeUserIds === undefined ? [] : userIds(b.assigneeUserIds, 'assigneeUserIds');
  if (b.description !== undefined && (b.description === null || typeof b.description !== 'object')) throw badRequest('description must be an object');

  let lastPos = 0;
  for (const t of sortedTasks(list.id)) if (t.statusId === status.id && t.pos > lastPos) lastPos = t.pos;
  const key = nextKey(list, ctx.project.id);
  list.taskCounter = Number(key.slice(key.lastIndexOf('-') + 1));
  list.updatedAt = nowIso();
  pmoLists().save(list);
  const now = nowIso();
  const task: TaskRec = {
    id: newId('tsk'),
    taskListId: list.id,
    projectId: ctx.project.id,
    key,
    title,
    description: b.description ?? {},
    dspec: null,
    statusId: status.id,
    priority,
    storyPoints: points,
    startDate,
    dueDate,
    completedAt: null,
    pos: lastPos + 1,
    createdById: ME_ID,
    archivedAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    assignees: assignees.map((u) => ({ userId: u, at: now })),
  };
  pmoTasks().insert(task);
  recordActivity(task, 'CREATED', { title, statusId: status.id });
  for (const u of assignees) recordActivity(task, 'ASSIGNED', { userId: u });
  notifyAssigned(task, ctx.project, assignees);
  return task;
}

post('/projects/:slug/task-lists/:listId/tasks', (req) => {
  const ctx = pctx(req);
  return taskDto(createTask(ctx, req.params.listId!, body(req)));
});

// ─── update / move ─────────────────────────────────────────────────────────

function recordUndo(scope: string, kind: UndoRec['kind'], taskId: string, forwardOp: Record<string, any>, inverseOp: Record<string, any>) {
  pmoUndo().insert({ id: newId('und'), actorId: ME_ID, scope, kind, taskId, forwardOp, inverseOp, appliedAt: Date.now(), undoneAt: null, redoneAt: null });
  // bound the log
  const mine = pmoUndo().where('actorId', ME_ID);
  if (mine.length > 200) for (const r of mine.slice().sort((a, b) => a.appliedAt - b.appliedAt).slice(0, mine.length - 200)) pmoUndo().remove(r.id);
}

export function updateTask(project: ProjectRec, t: TaskRec, b: Record<string, any>, opts: { skipUndo?: boolean } = {}): TaskRec {
  const fwd: Record<string, unknown> = {};
  const inv: Record<string, unknown> = {};
  const events: { kind: any; payload: Record<string, unknown> }[] = [];
  let newTitle: string | undefined;
  let newDesc: Record<string, unknown> | undefined;
  let newStatusId: string | undefined;
  let newPriority: (typeof PRIORITIES)[number] | undefined;
  let newPoints: number | null | undefined;
  let newStart: string | null | undefined;
  let newDue: string | null | undefined;
  let newAssignees: string[] | undefined;

  if (b.title !== undefined) newTitle = reqString(b.title, 'title', 1, 200);
  if (b.description !== undefined) {
    if (b.description === null || typeof b.description !== 'object') throw badRequest('description must be an object');
    newDesc = b.description;
  }
  if (b.statusId !== undefined) {
    if (typeof b.statusId !== 'string') throw badRequest('statusId must be a UUID');
    newStatusId = b.statusId;
  }
  if (b.priority !== undefined) newPriority = oneOf(b.priority, 'priority', PRIORITIES);
  if (b.storyPoints !== undefined) newPoints = intOrNull(b.storyPoints, 'storyPoints', 0, 1000);
  if (b.startDate !== undefined) newStart = dateOrNull(b.startDate, 'startDate');
  if (b.dueDate !== undefined) newDue = dateOrNull(b.dueDate, 'dueDate');
  if (b.assigneeUserIds !== undefined) newAssignees = userIds(b.assigneeUserIds, 'assigneeUserIds');

  const status = pmoStatuses().get(t.statusId)!;
  const prevDesc = descriptionBefore(t);

  if (newTitle !== undefined && newTitle !== t.title) {
    events.push({ kind: 'RENAMED', payload: { before: t.title, after: newTitle } });
    inv.title = t.title;
    fwd.title = newTitle;
    t.title = newTitle;
  }
  if (newDesc !== undefined) {
    events.push({ kind: 'DESCRIPTION_EDITED', payload: {} });
    inv.description = prevDesc;
    fwd.description = newDesc;
    t.description = newDesc;
    t.dspec = null;
  }
  if (newStatusId !== undefined && newStatusId !== t.statusId) {
    const ns = pmoStatuses().get(newStatusId);
    if (!ns || ns.taskListId !== t.taskListId) throw badRequest('Status not found in this list.');
    events.push({ kind: 'STATUS_CHANGED', payload: { before: t.statusId, after: ns.id } });
    inv.statusId = t.statusId;
    fwd.statusId = ns.id;
    t.statusId = ns.id;
    if (ns.category === 'DONE' && status.category !== 'DONE') {
      t.completedAt = nowIso();
      events.push({ kind: 'COMPLETED', payload: {} });
    } else if (ns.category !== 'DONE' && status.category === 'DONE') {
      t.completedAt = null;
      events.push({ kind: 'REOPENED', payload: {} });
    }
  }
  if (newPriority !== undefined && newPriority !== t.priority) {
    events.push({ kind: 'PRIORITY_CHANGED', payload: { before: t.priority, after: newPriority } });
    inv.priority = t.priority;
    fwd.priority = newPriority;
    t.priority = newPriority;
  }
  if (newPoints !== undefined && newPoints !== t.storyPoints) {
    inv.storyPoints = t.storyPoints;
    fwd.storyPoints = newPoints;
    t.storyPoints = newPoints;
  }
  if (newStart !== undefined && newStart !== t.startDate) {
    events.push({ kind: 'START_DATE_SET', payload: { before: t.startDate, after: newStart } });
    inv.startDate = t.startDate;
    fwd.startDate = newStart;
    t.startDate = newStart;
  }
  if (newDue !== undefined && newDue !== t.dueDate) {
    events.push({ kind: newDue === null ? 'DUE_DATE_CLEARED' : 'DUE_DATE_SET', payload: { before: t.dueDate, after: newDue } });
    inv.dueDate = t.dueDate;
    fwd.dueDate = newDue;
    t.dueDate = newDue;
  }
  let added: string[] = [];
  if (newAssignees !== undefined) {
    const cur = t.assignees.map((a) => a.userId);
    added = newAssignees.filter((u) => !cur.includes(u));
    const removed = cur.filter((u) => !newAssignees!.includes(u));
    if (added.length || removed.length) {
      const now = nowIso();
      t.assignees = [...t.assignees.filter((a) => !removed.includes(a.userId)), ...added.map((u) => ({ userId: u, at: now }))];
      for (const u of added) events.push({ kind: 'ASSIGNED', payload: { userId: u } });
      for (const u of removed) events.push({ kind: 'UNASSIGNED', payload: { userId: u } });
      inv.assigneeUserIds = cur;
      fwd.assigneeUserIds = newAssignees;
    }
  }
  if (events.length || Object.keys(fwd).length) {
    t.updatedAt = nowIso();
    pmoTasks().save(t);
    for (const e of events) recordActivity(t, e.kind, e.payload);
    if (Object.keys(fwd).length > 0 && !opts.skipUndo) recordUndo(`task:${t.id}`, 'TASK_UPDATED', t.id, { taskId: t.id, fields: fwd }, { taskId: t.id, fields: inv });
    if (added.length) notifyAssigned(t, project, added);
  }
  return t;
}

function descriptionBefore(t: TaskRec): Record<string, unknown> {
  return taskDto(t).description;
}

patch('/projects/:slug/tasks/:taskId', (req) => {
  const ctx = pctx(req);
  const t = taskOf(ctx.project.id, req.params.taskId!);
  return taskDto(updateTask(ctx.project, t, body(req)));
});

export function moveTask(t: TaskRec, statusId: string, position: number, opts: { skipUndo?: boolean } = {}): TaskRec {
  const ns = pmoStatuses().get(statusId);
  if (!ns || ns.taskListId !== t.taskListId) throw badRequest('Status not found in this list.');
  const prevStatus = pmoStatuses().get(t.statusId)!;
  const beforeStatus = t.statusId;
  const beforePos = String(t.pos);
  const afterPos = String(position);
  const statusChanged = statusId !== beforeStatus;
  const posChanged = beforePos !== afterPos;
  t.statusId = statusId;
  t.pos = position;
  if (statusChanged || posChanged) t.updatedAt = nowIso();
  if (statusChanged) {
    recordActivity(t, 'STATUS_CHANGED', { before: beforeStatus, after: statusId, beforePosition: beforePos, afterPosition: afterPos });
    if (ns.category === 'DONE' && prevStatus.category !== 'DONE') {
      t.completedAt = nowIso();
      recordActivity(t, 'COMPLETED', {});
    } else if (ns.category !== 'DONE' && prevStatus.category === 'DONE') {
      t.completedAt = null;
      recordActivity(t, 'REOPENED', {});
    }
  } else if (posChanged) {
    recordActivity(t, 'MOVED', { statusId, beforePosition: beforePos, afterPosition: afterPos });
  }
  pmoTasks().save(t);
  if ((statusChanged || posChanged) && !opts.skipUndo) {
    recordUndo(`kanban:${t.taskListId}`, 'TASK_MOVED', t.id, { taskId: t.id, statusId, positionInStatus: afterPos }, { taskId: t.id, statusId: beforeStatus, positionInStatus: beforePos });
  }
  return t;
}

patch('/projects/:slug/tasks/:taskId/position', (req) => {
  const ctx = pctx(req);
  const t = taskOf(ctx.project.id, req.params.taskId!);
  const b = body(req);
  if (typeof b.statusId !== 'string') throw badRequest('statusId must be a UUID');
  if (typeof b.positionInStatus !== 'number' || !Number.isFinite(b.positionInStatus)) throw badRequest('positionInStatus must be a number conforming to the specified constraints');
  return taskDto(moveTask(t, b.statusId, b.positionInStatus));
});

post('/projects/:slug/tasks/:taskId/archive', (req) => {
  const { project } = pctx(req);
  const t = taskOf(project.id, req.params.taskId!);
  if (!t.archivedAt) {
    t.archivedAt = nowIso();
    t.updatedAt = t.archivedAt;
    pmoTasks().save(t);
    recordActivity(t, 'ARCHIVED');
  }
  return taskDto(t);
});

post('/projects/:slug/tasks/:taskId/unarchive', (req) => {
  const { project } = pctx(req);
  const t = taskOf(project.id, req.params.taskId!);
  if (t.archivedAt) {
    t.archivedAt = null;
    t.updatedAt = nowIso();
    pmoTasks().save(t);
    recordActivity(t, 'UNARCHIVED');
  }
  return taskDto(t);
});

del('/projects/:slug/tasks/:taskId', (req) => {
  const ctx = pctx(req);
  const t = taskOf(ctx.project.id, req.params.taskId!);
  if (ctx.kind === 'contributor' && t.createdById !== ME_ID) throw forbidden('Only the task creator or a project manager can delete this task.');
  t.deletedAt = nowIso();
  pmoTasks().save(t);
  return { ok: true };
});

// ─── gantt / overview ──────────────────────────────────────────────────────

const cmpNullLast = (a: string | null, b: string | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -1 : 1);

get('/projects/:slug/task-lists/:listId/gantt', (req) => {
  const { project } = pctx(req);
  const list = listOf(project.id, req.params.listId!);
  const rows = sortedTasks(list.id)
    .filter((t) => !t.archivedAt)
    .sort((a, b) => cmpNullLast(a.startDate, b.startDate) || cmpNullLast(a.dueDate, b.dueDate) || a.createdAt.localeCompare(b.createdAt));
  const deps = rows.flatMap((t) => pmoDeps().where('fromTaskId', t.id));
  return {
    tasks: rows.map((t) => {
      const st = pmoStatuses().get(t.statusId)!;
      return {
        id: t.id,
        key: t.key,
        title: t.title,
        statusId: t.statusId,
        statusName: st.name,
        statusCategory: st.category,
        startDate: t.startDate,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        assignees: t.assignees.map((a) => lite(a.userId)),
      };
    }),
    dependencies: deps.map((d) => ({ id: d.id, fromTaskId: d.fromTaskId, toTaskId: d.toTaskId, kind: d.kind })),
  };
});

get('/projects/:slug/task-lists/:listId/overview', (req) => {
  const { project } = pctx(req);
  const list = listOf(project.id, req.params.listId!);
  const now = Date.now();
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  const endWeek = new Date(startToday);
  endWeek.setDate(endWeek.getDate() + 7);
  const sT = startToday.toISOString();
  const eT = endToday.toISOString();
  const eW = endWeek.toISOString();
  const nowI = new Date(now).toISOString();
  const statuses = statusesOf(list.id);
  const live = sortedTasks(list.id).filter((t) => !t.archivedAt);
  const catOf = new Map(statuses.map((s) => [s.id, s.category]));
  const counts = new Map<string, number>();
  let dueToday = 0;
  let dueThisWeek = 0;
  let overdue = 0;
  let totalOpen = 0;
  const work = new Map<string, number>();
  for (const t of live) {
    counts.set(t.statusId, (counts.get(t.statusId) ?? 0) + 1);
    const cat = catOf.get(t.statusId);
    if (cat !== 'TODO' && cat !== 'IN_PROGRESS') continue;
    totalOpen++;
    if (t.dueDate) {
      if (t.dueDate >= sT && t.dueDate < eT) dueToday++;
      if (t.dueDate >= sT && t.dueDate < eW) dueThisWeek++;
      if (t.dueDate < nowI) overdue++;
    }
    for (const a of t.assignees) work.set(a.userId, (work.get(a.userId) ?? 0) + 1);
  }
  // recent activity across the list (top 15)
  const acts = [];
  for (const t of sortedTasks(list.id)) for (const a of pmoActivity().where('taskId', t.id)) acts.push(a);
  acts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return {
    byStatus: statuses.map((s) => ({ statusId: s.id, name: s.name, color: s.color, category: s.category, count: counts.get(s.id) ?? 0 })),
    dueToday,
    dueThisWeek,
    overdue,
    totalOpen,
    workload: [...work.entries()]
      .map(([userId, count]) => ({ userId, name: users().get(userId)?.name ?? 'Unknown', avatarUrl: users().get(userId)?.avatarUrl ?? null, count }))
      .sort((a, b) => b.count - a.count),
    recentActivity: acts.slice(0, 15).map((a) => ({ id: a.id, kind: a.kind, payload: a.payload, createdAt: a.createdAt, taskId: a.taskId, actor: a.actorId ? lite(a.actorId) : null })),
  };
});

// ─── dependencies ──────────────────────────────────────────────────────────

const DEP_KINDS = ['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH'] as const;

post('/projects/:slug/tasks/:taskId/dependencies', (req) => {
  const { project } = pctx(req);
  const from = taskOf(project.id, req.params.taskId!);
  const b = body(req);
  if (typeof b.toTaskId !== 'string') throw badRequest('toTaskId must be a UUID');
  if (from.id === b.toTaskId) throw badRequest('A task cannot depend on itself.');
  const to = pmoTasks().get(b.toTaskId);
  if (!to || to.projectId !== project.id || to.deletedAt) throw notFound('One or both tasks were not found.');
  if (to.taskListId !== from.taskListId) throw badRequest('Dependencies must be within the same task list.');
  const kind = b.kind === undefined ? 'FINISH_TO_START' : oneOf(b.kind, 'kind', DEP_KINDS);
  if (pmoDeps().where('fromTaskId', to.id).some((d) => d.toTaskId === from.id)) throw badRequest('The reverse dependency already exists; this would create a cycle.');
  if (pmoDeps().where('fromTaskId', from.id).some((d) => d.toTaskId === to.id)) throw conflict('Unique constraint failed on the fields: (`fromTaskId`,`toTaskId`)');
  const dep = pmoDeps().insert({ id: newId('tdp'), fromTaskId: from.id, toTaskId: to.id, kind });
  recordActivity(from, 'DEPENDENCY_ADDED', { toTaskId: to.id, depId: dep.id, kind });
  return dep;
});

del('/projects/:slug/tasks/:taskId/dependencies/:depId', (req) => {
  const { project } = pctx(req);
  const from = taskOf(project.id, req.params.taskId!);
  const dep = pmoDeps().get(req.params.depId);
  if (!dep || dep.fromTaskId !== from.id) throw notFound('Dependency not found.');
  pmoDeps().remove(dep.id);
  recordActivity(from, 'DEPENDENCY_REMOVED', { toTaskId: dep.toTaskId, depId: dep.id });
  return { ok: true };
});

// ─── mention search / team ─────────────────────────────────────────────────

get('/projects/:slug/pmo/mention-search', (req) => {
  const { project } = pctx(req);
  const kind = req.query.get('kind') ?? 'user';
  if (kind !== 'user' && kind !== 'task') throw badRequest(`Unsupported mention kind: ${kind}`);
  const q = (req.query.get('q') ?? '').trim().toLowerCase();
  if (kind === 'user') {
    return membersTbl()
      .where('projectId', project.id)
      .map((m) => ({ m, u: users().get(m.userId)! }))
      .filter(({ u }) => u && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
      .sort((a, b) => a.u.name.localeCompare(b.u.name))
      .slice(0, 12)
      .map(({ m, u }) => ({ kind: 'user' as const, id: u.id, label: u.name, subtitle: m.title ?? m.role.toLowerCase().replace('_', ' '), avatarUrl: u.avatarUrl }));
  }
  return pmoTasks()
    .where('projectId', project.id)
    .filter((t) => !t.deletedAt && (!q || t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 12)
    .map((t) => {
      const l = pmoLists().get(t.taskListId);
      return { kind: 'task' as const, id: t.id, label: `${t.key}  ${t.title}`, subtitle: pmoStatuses().get(t.statusId)?.name, iconName: l?.iconName ?? null, iconColor: l?.iconColor ?? null };
    });
});

get('/projects/:slug/pmo/team', (req) => {
  const { project } = pctx(req);
  const counts = new Map<string, number>();
  for (const t of pmoTasks().where('projectId', project.id)) {
    if (t.deletedAt || t.archivedAt) continue;
    for (const a of t.assignees) counts.set(a.userId, (counts.get(a.userId) ?? 0) + 1);
  }
  const mem = membersTbl()
    .where('projectId', project.id)
    .map((m) => ({ m, u: users().get(m.userId)! }))
    .filter((x) => x.u)
    .sort((a, b) => a.u.name.localeCompare(b.u.name));
  const shape = ({ m, u }: (typeof mem)[number]) => ({
    id: m.id,
    user: { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, bio: u.bio },
    role: m.role,
    title: m.title,
    joinedAt: m.joinedAt,
    taskCount: counts.get(u.id) ?? 0,
    isOwner: u.id === project.ownerId,
  });
  return { managers: mem.filter((x) => x.m.role === 'PROJECT_MANAGER').map(shape), contributors: mem.filter((x) => x.m.role === 'CONTRIBUTOR').map(shape) };
});

// ─── undo / redo ───────────────────────────────────────────────────────────

function applyOp(kind: string, op: Record<string, any>): unknown {
  const t = pmoTasks().get(op.taskId);
  if (!t || t.deletedAt) throw notFound('Task no longer exists.');
  const project = projects().get(t.projectId);
  if (!project) throw notFound('Task no longer exists.');
  if (kind === 'TASK_MOVED') {
    if (typeof op.statusId !== 'string') throw conflict('Couldn’t undo, entry payload is malformed.');
    return taskDto(moveTask(t, op.statusId, Number(op.positionInStatus ?? 0), { skipUndo: true }));
  }
  if (kind === 'TASK_UPDATED') {
    if (!op.fields || typeof op.fields !== 'object') throw conflict('Couldn’t undo, entry payload is malformed.');
    return taskDto(updateTask(project, t, op.fields, { skipUndo: true }));
  }
  throw notFound(`Unknown undo kind: ${kind}`);
}

post('/pmo/undo', () => {
  const entry = pmoUndo()
    .where('actorId', ME_ID)
    .filter((e) => e.undoneAt === null)
    .sort((a, b) => b.appliedAt - a.appliedAt)[0];
  if (!entry) throw notFound('No undoable operation.');
  try {
    const applied = applyOp(entry.kind, entry.inverseOp);
    entry.undoneAt = Date.now();
    entry.redoneAt = null;
    pmoUndo().save(entry);
    return { kind: entry.kind, scope: entry.scope, taskId: entry.taskId, applied };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw conflict('List state has changed');
  }
});

post('/pmo/redo', () => {
  const entry = pmoUndo()
    .where('actorId', ME_ID)
    .filter((e) => e.undoneAt !== null)
    .sort((a, b) => (b.undoneAt ?? 0) - (a.undoneAt ?? 0))[0];
  if (!entry) throw notFound('No redoable operation.');
  const applied = applyOp(entry.kind, entry.forwardOp);
  entry.undoneAt = null;
  entry.redoneAt = Date.now();
  pmoUndo().save(entry);
  return { kind: entry.kind, scope: entry.scope, taskId: entry.taskId, applied };
});

export type { InsiderKind };
void assertManager;
void users;
