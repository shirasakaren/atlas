/** PMO handlers: task comments. */
import { ME_ID } from '../config';
import { badRequest, del, forbidden, get, intParam, notFound, patch, post } from '../http';
import { notify } from '../notify';
import { newId } from '../prng';
import { projects, users } from '../store';
import { pmoComments, pmoTasks, type CommentRec, type TaskRec } from '../seed/pmo-store';
import { body, commentDto, nowIso, pctx, recordActivity, reqString, taskOf } from './pmo-shape';
import type { ProjectRec } from '../schema';

const MENTION = /@\[[^\]]+\]\(([^)\s]+)\)/g;
const EDIT_WINDOW_MS = 24 * 3600 * 1000;

function mentionIds(md: string): string[] {
  const ids = new Set<string>();
  for (const m of md.matchAll(MENTION)) ids.add(m[1]!);
  return [...ids];
}

get('/projects/:slug/tasks/:taskId/comments', (req) => {
  const { project } = pctx(req);
  const t = taskOf(project.id, req.params.taskId!);
  const page = intParam(req.query, 'page', 1, 100000);
  const pageSize = intParam(req.query, 'pageSize', 50, 100);
  const rows = pmoComments().where('taskId', t.id).slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  return { items: rows.slice((page - 1) * pageSize, page * pageSize).map(commentDto), total: rows.length, page, pageSize };
});

function addComment(project: ProjectRec, task: TaskRec, authorId: string, markdown: string, replyToId: string | null, at = nowIso()): CommentRec {
  const c: CommentRec = { id: newId('tcm'), taskId: task.id, authorId, markdown, replyToId, editedAt: null, deletedAt: null, createdAt: at };
  pmoComments().insert(c);
  recordActivity(task, 'COMMENT_ADDED', { commentId: c.id, replyToId }, authorId, at);
  const mentioned = mentionIds(markdown).filter((u) => users().has(u));
  for (const u of mentioned) recordActivity(task, 'MENTIONED', { userId: u, commentId: c.id }, authorId, at);
  const link = `/projects/${project.slug}/lists/${task.taskListId}/tasks/${task.key}`;
  const author = users().get(authorId)?.name ?? 'Someone';
  const recipients = mentioned.filter((u) => u !== authorId);
  for (const u of recipients) {
    notify(u, { type: 'TASK_MENTIONED', title: `${author} mentioned you in ${task.key}`, body: task.title, link, metadata: { taskId: task.id, taskKey: task.key, commentId: c.id } });
  }
  if (replyToId) {
    const parent = pmoComments().get(replyToId);
    if (parent && parent.authorId !== authorId && !recipients.includes(parent.authorId)) {
      notify(parent.authorId, { type: 'TASK_COMMENT_REPLY', title: `${author} replied to your comment on ${task.key}`, body: task.title, link, metadata: { taskId: task.id, taskKey: task.key, commentId: c.id } });
    }
  }
  task.updatedAt = at;
  pmoTasks().save(task);
  return c;
}

const COLLEAGUE_REPLIES = [
  'Thanks, noted. I will pick that up and update the task later today.',
  'Makes sense. I have added it to my list for tomorrow morning.',
  'Good point. Let me check with the team and come back to you.',
  'Agreed. I will update the description so it is clear for everyone.',
  'Thanks for the nudge. Should be done by end of week.',
  'Got it. I will flag it in the next status update as well.',
];

/** A colleague answers Maya's comment a few seconds later, so notifications feel alive. */
function simulateReply(project: ProjectRec, task: TaskRec, parent: CommentRec) {
  if (typeof window === 'undefined') return;
  const candidates = task.assignees.map((a) => a.userId).filter((u) => u !== ME_ID);
  if (candidates.length === 0 || Math.random() > 0.6) return;
  const who = candidates[Math.floor(Math.random() * candidates.length)]!;
  const text = COLLEAGUE_REPLIES[Math.floor(Math.random() * COLLEAGUE_REPLIES.length)]!;
  setTimeout(() => {
    try {
      const fresh = pmoTasks().get(task.id);
      if (!fresh || fresh.deletedAt || !pmoComments().get(parent.id) || pmoComments().get(parent.id)!.deletedAt) return;
      addComment(project, fresh, who, text, parent.replyToId ?? parent.id);
    } catch {
      /* ignore */
    }
  }, 9000 + Math.random() * 9000);
}

post('/projects/:slug/tasks/:taskId/comments', (req) => {
  const { project } = pctx(req);
  const t = taskOf(project.id, req.params.taskId!);
  const b = body(req);
  const markdown = reqString(b.markdown, 'markdown', 1, 10_000);
  let replyToId: string | null = null;
  if (b.replyToId !== undefined && b.replyToId !== null) {
    const parent = pmoComments().get(String(b.replyToId));
    if (!parent || parent.taskId !== t.id || parent.deletedAt) throw badRequest('Reply target not found.');
    replyToId = parent.replyToId ?? parent.id; // flatten to a single level
  }
  const c = addComment(project, t, ME_ID, markdown, replyToId);
  simulateReply(project, t, c);
  return commentDto(c);
});

function commentOf(projectId: string, id: string): { c: CommentRec; t: TaskRec } {
  const c = pmoComments().get(id);
  const t = c ? pmoTasks().get(c.taskId) : undefined;
  if (!c || !t || t.projectId !== projectId || t.deletedAt || c.deletedAt) throw notFound('Comment not found.');
  return { c, t };
}

patch('/projects/:slug/task-comments/:commentId', (req) => {
  const { project } = pctx(req);
  const { c } = commentOf(project.id, req.params.commentId!);
  if (c.authorId !== ME_ID) throw forbidden('Only the comment author can edit it.');
  if (Date.now() - Date.parse(c.createdAt) > EDIT_WINDOW_MS) throw forbidden('Comments can only be edited within 24 hours.');
  c.markdown = reqString(body(req).markdown, 'markdown', 1, 10_000);
  c.editedAt = nowIso();
  pmoComments().save(c);
  return commentDto(c);
});

del('/projects/:slug/task-comments/:commentId', (req) => {
  const ctx = pctx(req);
  const { c } = commentOf(ctx.project.id, req.params.commentId!);
  if (c.authorId !== ME_ID && ctx.kind === 'contributor') throw forbidden('Only the author or a project manager can delete a comment.');
  c.deletedAt = nowIso();
  pmoComments().save(c);
  return { ok: true };
});

void projects;
