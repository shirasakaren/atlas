/** `contracts.pmo`: the read seam other domains (dashboard, for-me, search, admin) use. */
import { contracts, type PmoContract } from '../contracts';
import type { ProjectRec } from '../schema';
import { members as membersTbl, projects } from '../store';
import { pmoActivity, pmoFiles, pmoLists, pmoNotes, pmoStatuses, pmoTasks, pmoWbs, type ActivityRec, type ListRec, type TaskRec } from '../seed/pmo-store';
import { lite as userLite } from './pmo-shape';
import { createList } from './pmo-lists';
import type { ForMeActivity, ForMeTask, MyOpenTask } from '@/lib/types';

const isOpen = (t: TaskRec) => {
  if (t.deletedAt || t.archivedAt) return false;
  const c = pmoStatuses().get(t.statusId)?.category;
  return c === 'TODO' || c === 'IN_PROGRESS';
};

const liveList = (t: TaskRec): ListRec | undefined => {
  const l = pmoLists().get(t.taskListId);
  return l && !l.deletedAt && !l.archivedAt ? l : undefined;
};

function openTasksFor(userId: string): TaskRec[] {
  const out: TaskRec[] = [];
  for (const t of pmoTasks().all()) {
    if (t.assignees.some((a) => a.userId === userId) && isOpen(t) && liveList(t)) out.push(t);
  }
  return out;
}

const byDue = (a: TaskRec, b: TaskRec) => (a.dueDate === b.dueDate ? 0 : a.dueDate === null ? 1 : b.dueDate === null ? -1 : a.dueDate < b.dueDate ? -1 : 1);

function toMini(t: TaskRec): MyOpenTask {
  const st = pmoStatuses().get(t.statusId)!;
  const l = pmoLists().get(t.taskListId)!;
  const p = projects().get(t.projectId)!;
  return {
    id: t.id,
    key: t.key,
    title: t.title,
    dueDate: t.dueDate,
    priority: t.priority,
    status: { name: st.name, color: st.color, category: st.category },
    taskList: { id: l.id, name: l.name },
    project: { slug: p.slug, title: p.title },
  };
}

function firstListId(projectId: string): string | null {
  const l = pmoLists()
    .where('projectId', projectId)
    .filter((x) => !x.deletedAt)
    .sort((a, b) => a.order - b.order)[0];
  return l?.id ?? null;
}

function match(text: string, q: string) {
  return text.toLowerCase().includes(q);
}

const impl: PmoContract = {
  onProjectCreated(project: ProjectRec) {
    createList(project.id, { name: 'Tasks', projectKey: project.key || undefined, iconName: 'list-todo', iconColor: 'blue' });
  },

  myOpenTasks(userId, limit) {
    return openTasksFor(userId).sort(byDue).slice(0, limit).map(toMini);
  },

  forMeTasks(userId) {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday);
    endToday.setDate(endToday.getDate() + 1);
    const sT = startToday.toISOString();
    const eT = endToday.toISOString();
    const overdue: ForMeTask[] = [];
    const dueToday: ForMeTask[] = [];
    const open: ForMeTask[] = [];
    for (const t of openTasksFor(userId).sort(byDue)) {
      const m = toMini(t) as ForMeTask;
      if (t.dueDate && t.dueDate < sT) overdue.push(m);
      else if (t.dueDate && t.dueDate < eT) dueToday.push(m);
      else open.push(m);
    }
    return { overdue: overdue.slice(0, 50), dueToday: dueToday.slice(0, 50), open: open.slice(0, 30) };
  },

  recentActivity(userId, limit) {
    const mine = new Set(membersTbl().all().filter((m) => m.userId === userId).map((m) => m.projectId));
    const picked = collect(mine, limit * 3);
    const out: ForMeActivity[] = [];
    for (const a of picked) {
      if (a.kind === 'MOVED' || a.kind === 'DESCRIPTION_EDITED') continue;
      const t = pmoTasks().get(a.taskId);
      if (!t || t.deletedAt) continue;
      const p = projects().get(t.projectId)!;
      out.push({
        id: a.id,
        kind: a.kind,
        payload: a.payload,
        createdAt: a.createdAt,
        actor: a.actorId ? userLite(a.actorId) : null,
        task: { id: t.id, key: t.key, title: t.title, project: { slug: p.slug, title: p.title }, taskList: { id: t.taskListId } },
      });
      if (out.length >= limit) break;
    }
    return out;
  },

  searchTasks(q, projectIds, limit) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const ids = new Set(projectIds);
    const out = [];
    for (const t of pmoTasks().all()) {
      if (t.deletedAt || !ids.has(t.projectId)) continue;
      if (match(t.title, needle) || t.key.toLowerCase() === needle) {
        const p = projects().get(t.projectId)!;
        out.push({ id: t.id, key: t.key, title: t.title, taskListId: t.taskListId, projectId: p.id, projectSlug: p.slug, projectTitle: p.title });
        if (out.length >= limit) break;
      }
    }
    return out;
  },

  searchNotes(q, projectIds, limit) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const ids = new Set(projectIds);
    const out = [];
    for (const n of pmoNotes().all()) {
      if (n.deletedAt || !ids.has(n.projectId) || !match(n.title, needle)) continue;
      const p = projects().get(n.projectId)!;
      out.push({ id: n.id, title: n.title, projectId: p.id, projectSlug: p.slug, projectTitle: p.title, listId: firstListId(p.id) });
      if (out.length >= limit) break;
    }
    return out;
  },

  searchFiles(q, projectIds, limit) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const ids = new Set(projectIds);
    const out = [];
    for (const f of pmoFiles().all()) {
      if (f.deletedAt || !ids.has(f.projectId) || !match(f.name, needle)) continue;
      const p = projects().get(f.projectId)!;
      out.push({ id: f.id, name: f.name, mime: f.mime, parentFolderId: f.parentFolderId, projectId: p.id, projectSlug: p.slug, projectTitle: p.title, listId: firstListId(p.id) });
      if (out.length >= limit) break;
    }
    return out;
  },

  searchWhiteboards(q, projectIds, limit) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const ids = new Set(projectIds);
    const out = [];
    for (const w of pmoWbs().all()) {
      if (w.deletedAt || !ids.has(w.projectId) || !match(w.title, needle)) continue;
      const p = projects().get(w.projectId)!;
      out.push({ id: w.id, title: w.title, projectId: p.id, projectSlug: p.slug, projectTitle: p.title, listId: firstListId(p.id) });
      if (out.length >= limit) break;
    }
    return out;
  },

  openTaskCount(projectId) {
    let n = 0;
    for (const t of pmoTasks().where('projectId', projectId)) if (isOpen(t) && pmoLists().get(t.taskListId) && !pmoLists().get(t.taskListId)!.deletedAt) n++;
    return n;
  },
};

/** Latest `n` activity rows (newest first) across the given projects, via a bounded insertion list. */
function collect(projectIds: Set<string>, n: number) {
  const out: ActivityRec[] = [];
  let floor = '';
  for (const a of pmoActivity().all()) {
    if (!projectIds.has(a.projectId)) continue;
    if (out.length >= n && a.createdAt <= floor) continue;
    let i = out.length;
    while (i > 0 && out[i - 1]!.createdAt < a.createdAt) i--;
    out.splice(i, 0, a);
    if (out.length > n) out.pop();
    floor = out[out.length - 1]!.createdAt;
  }
  return out;
}

contracts.pmo = impl;
