/**
 * "app" domain seed (order 60, runs after pmo 30 and chat 40):
 *   • Maya's notification inbox (~140 items over three weeks, every NotificationType, ~35% unread)
 *   • her notification preferences, account extras and the admin-pinned (featured) list
 *   • a little contribution/invite history so the notifications have records behind them
 * Real tasks / channels come from the pmo and chat contracts; everything degrades gracefully without them.
 */
import { agoIso, DAY, HOUR, MIN } from '../clock';
import { ME_ID } from '../config';
import { contracts } from '../contracts';
import { registerSeeder } from '../db';
import { seqId, type Rng } from '../prng';
import type { ContributionRec, InviteRec, NotificationRec, ProjectRec } from '../schema';
import { contributions, invites, members, notifications, projects, users } from '../store';
import type { MyOpenTask, NotificationType } from '@/lib/types';
import { defaultPrefs, featuredTable, meExtraTable, prefsTable } from '../handlers/app-shared';
import {
  CHAT_MENTION_LINES,
  NOTE_TITLES,
  STATUS_NAMES,
  BLOCKER_TITLES,
  VOICE_MENTION_LINES,
  VOICE_ROOMS,
  WHITEBOARD_TITLES,
} from './app-notification-content';

interface Draft {
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  /** epoch ms the notification was created */
  at: number;
}

const WINDOW = 21 * DAY;

const taskLink = (t: MyOpenTask) => `/projects/${t.project.slug}/lists/${t.taskList.id}/tasks/${t.key}`;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

registerSeeder({
  name: 'app-extras',
  order: 60,
  run({ rng, now }) {
    const allUsers = users().all();
    const nameOf = (id: string) => users().get(id)?.name ?? 'A colleague';

    // ─── Account extras, preferences, featured ───────────────────────────
    const me = users().get(ME_ID);
    meExtraTable().insert({
      id: ME_ID,
      consentAcceptedAt: me ? new Date(new Date(me.createdAt).getTime() + DAY).toISOString() : null,
      passwordChangedAt: agoIso(63 * DAY),
      lastLoginAt: agoIso(3 * HOUR + 12 * MIN),
    });
    const prefs = defaultPrefs(ME_ID, me?.createdAt ?? agoIso(400 * DAY));
    prefs.pushEnabled = false; // push is not available in the demo
    prefsTable().insert(prefs);

    const pinned = projects().all().filter((p) => p.pinned && !p.archivedAt).slice(0, 12);
    pinned.forEach((p, i) => featuredTable().insert({ id: p.id, order: i, setAt: agoIso((40 - i) * DAY) }));

    // ─── Context ─────────────────────────────────────────────────────────
    const myMembers = members().where('userId', ME_ID);
    const mine = myMembers.flatMap((m) => {
      const p = projects().get(m.projectId);
      return p && !p.archivedAt ? [{ m, p }] : [];
    });
    const managed = mine.filter((x) => x.m.role === 'PROJECT_MANAGER').map((x) => x.p);
    const contributing = mine.filter((x) => x.m.role === 'CONTRIBUTOR');
    const myProjects = mine.map((x) => x.p);

    const actorFor = (p: ProjectRec | undefined): string => {
      const pool = p ? members().where('projectId', p.id).map((m) => m.userId).filter((id) => id !== ME_ID) : [];
      return rng.pick(pool.length ? pool : allUsers.filter((u) => u.id !== ME_ID).map((u) => u.id));
    };
    const projectBySlug = (slug: string) => projects().where('slug', slug)[0];

    let tasks: MyOpenTask[] = contracts.pmo?.myOpenTasks(ME_ID, 80) ?? [];
    if (tasks.length === 0) {
      // pmo not available (isolated dev): synthesise plausible keys so the inbox still has task items.
      tasks = myProjects.slice(0, 12).map((p, i) => ({
        id: `task_fallback_${i}`,
        key: `${p.key}-${10 + i * 3}`,
        title: `Follow up on open items for ${p.title}`,
        dueDate: new Date(now + (i - 4) * DAY).toISOString(),
        priority: 'MEDIUM',
        status: { name: 'In Progress', color: '#2f5fb0', category: 'IN_PROGRESS' },
        taskList: { id: `list_${p.id}`, name: 'Backlog' },
        project: { slug: p.slug, title: p.title },
      })) as MyOpenTask[];
    }
    const tasksByProject = new Map<string, MyOpenTask[]>();
    for (const t of tasks) {
      const l = tasksByProject.get(t.project.slug) ?? [];
      l.push(t);
      tasksByProject.set(t.project.slug, l);
    }
    const listIdFor = (slug: string): string | null => tasksByProject.get(slug)?.[0]?.taskList.id ?? null;

    const drafts: Draft[] = [];
    const randomAge = (min = 4 * MIN): number => Math.max(min, Math.pow(rng.next(), 1.6) * WINDOW);
    const cycle = <T,>(list: T[]) => {
      let q: T[] = [];
      return () => {
        if (q.length === 0) q = rng.shuffle(list);
        return q.pop()!;
      };
    };
    const nextTask = cycle(tasks);

    // ─── Task notifications ──────────────────────────────────────────────
    const taskNotif = (
      type: NotificationType,
      t: MyOpenTask,
      at: number,
      title: string,
      body: string,
      extra: Record<string, unknown> = {},
    ) =>
      drafts.push({
        type,
        title,
        body,
        link: taskLink(t),
        metadata: { taskId: t.id, taskKey: t.key, ...extra },
        at,
      });

    for (let i = 0; i < 20; i++) {
      const t = nextTask();
      const actor = actorFor(projectBySlug(t.project.slug));
      taskNotif('TASK_ASSIGNED', t, now - randomAge(), `${nameOf(actor)} assigned you ${t.key}`, t.title, { actorId: actor });
    }
    for (let i = 0; i < 13; i++) {
      const t = nextTask();
      const actor = actorFor(projectBySlug(t.project.slug));
      taskNotif('TASK_MENTIONED', t, now - randomAge(), `${nameOf(actor)} mentioned you in ${t.key}`, t.title, { actorId: actor, commentId: `cmt_${i}` });
    }
    for (let i = 0; i < 9; i++) {
      const t = nextTask();
      const actor = actorFor(projectBySlug(t.project.slug));
      taskNotif('TASK_COMMENT_REPLY', t, now - randomAge(), `${nameOf(actor)} replied to your comment on ${t.key}`, t.title, { actorId: actor, commentId: `cmt_r${i}` });
    }
    for (let i = 0; i < 14; i++) {
      const t = nextTask();
      const actor = actorFor(projectBySlug(t.project.slug));
      const status = rng.pick(STATUS_NAMES);
      taskNotif('TASK_STATUS_CHANGED', t, now - randomAge(), `${nameOf(actor)} moved ${t.key} to ${status}`, t.title, { actorId: actor, status });
    }
    // Blocked by another task (one of Maya's own in the same project when possible).
    const pairs = [...tasksByProject.values()].filter((l) => l.length >= 2);
    for (let i = 0; i < 5; i++) {
      const a = pairs.length ? rng.pick(rng.pick(pairs)) : nextTask();
      const siblings = (tasksByProject.get(a.project.slug) ?? []).filter((t) => t.id !== a.id);
      const other = siblings.length ? rng.pick(siblings) : null;
      const blocker = other
        ? { key: other.key, title: other.title }
        : { key: `${a.key.replace(/-\d+$/, '')}-${rng.int(3, 9)}`, title: rng.pick(BLOCKER_TITLES) };
      const actor = actorFor(projectBySlug(a.project.slug));
      taskNotif(
        'TASK_DEPENDENCY_BLOCKED',
        a,
        now - randomAge(),
        `${a.key} is blocked by ${blocker.key}`,
        `“${a.title}” cannot start until “${blocker.title}” is done (${nameOf(actor)}).`,
        { blockedByKey: blocker.key, actorId: actor },
      );
    }
    // Due soon / overdue: timestamps follow the task's real due date.
    const dated = tasks.filter((t) => t.dueDate);
    const overdueTasks = rng.shuffle(dated.filter((t) => new Date(t.dueDate!).getTime() < now));
    const soonTasks = rng.shuffle(dated.filter((t) => new Date(t.dueDate!).getTime() < now + 36 * HOUR));
    let overdueMade = 0;
    for (const t of overdueTasks) {
      if (overdueMade >= 8) break;
      const due = new Date(t.dueDate!).getTime();
      const at = Math.min(now - 30 * MIN, due + rng.int(6, 40) * HOUR);
      if (at < due || at < now - WINDOW) continue;
      taskNotif('TASK_OVERDUE', t, at, `Overdue: ${t.key}`, `“${t.title}” was due ${isoDay(due)}.`, { kind: 'pmo-due' });
      overdueMade++;
    }
    let soonMade = 0;
    for (const t of soonTasks) {
      if (soonMade >= 10) break;
      const due = new Date(t.dueDate!).getTime();
      const at = Math.min(now - 10 * MIN, due - rng.int(5, 23) * HOUR);
      if (at < now - WINDOW) continue;
      taskNotif('TASK_DUE_SOON', t, at, `Due soon: ${t.key}`, `“${t.title}” is due ${isoDay(due)}.`, { kind: 'pmo-due' });
      soonMade++;
    }

    // ─── Chat mentions ───────────────────────────────────────────────────
    const channels = contracts.chat?.unreadSummary(ME_ID) ?? [];
    const lines = cycle(CHAT_MENTION_LINES);
    for (let i = 0; i < 16; i++) {
      const ch = channels.length ? rng.pick(channels) : null;
      const proj = ch?.projectSlug ? projectBySlug(ch.projectSlug) : rng.pick(myProjects);
      const author = actorFor(proj);
      const channelName = ch?.name ?? 'general';
      const link = ch
        ? ch.projectSlug
          ? `/projects/${ch.projectSlug}/chat/${ch.channelId}`
          : `/chat/global/${ch.channelId}`
        : `/projects/${proj?.slug}/chat`;
      const body = lines().replace('{project}', proj?.title ?? 'the program');
      drafts.push({
        type: 'CHAT_MENTION',
        title: `@${nameOf(author)} mentioned you in #${channelName}`,
        body,
        link,
        metadata: { messageId: `msg_demo_${i}`, channelId: ch?.channelId ?? null, projectId: proj?.id ?? null },
        at: now - randomAge(),
      });
    }

    // ─── Contribution requests (real records) ────────────────────────────
    const managedIds = new Set(managed.map((p) => p.id));
    for (const c of contributions().all()) {
      if (!managedIds.has(c.projectId) || c.userId === ME_ID) continue;
      const created = new Date(c.createdAt).getTime();
      if (created < now - WINDOW) continue;
      const p = projects().get(c.projectId)!;
      drafts.push({
        type: 'CONTRIBUTION_REQUEST_SUBMITTED',
        title: 'New contribution request',
        body: `${nameOf(c.userId)} wants to join "${p.title}" as ${c.role}.`,
        link: `/projects/${p.slug}/manage/requests`,
        metadata: { requestId: c.id, projectId: p.id, applicantId: c.userId },
        at: created,
      });
    }

    // History records so approvals / invites have something behind them.
    const history = rng.shuffle(contributing.filter((x) => x.p.phase !== 'SHIPPED'));
    const approvedFor = history.slice(0, 2);
    approvedFor.forEach(({ m, p }, i) => {
      const createdAt = now - (i === 0 ? 6 : 12) * DAY - rng.int(1, 8) * HOUR;
      const resolvedAt = createdAt + rng.int(4, 30) * HOUR;
      const rec: ContributionRec = {
        id: `con_hist_${i + 1}`,
        projectId: p.id,
        userId: ME_ID,
        role: m.title ?? 'Program Manager',
        message: i === 0
          ? 'I ran the last two cross-functional rollouts for this area and can help with planning, RAID tracking and stakeholder comms.'
          : 'Our team depends on this workstream. I can commit a few hours a week to coordination and status reporting.',
        status: 'APPROVED',
        resolvedAt: new Date(resolvedAt).toISOString(),
        resolvedById: p.ownerId,
        resolutionNote: 'Welcome aboard! Added you to the channel and the task list.',
        createdAt: new Date(createdAt).toISOString(),
        updatedAt: new Date(resolvedAt).toISOString(),
      };
      contributions().insert(rec);
      m.joinedAt = rec.resolvedAt!;
      members().save(m);
      drafts.push({
        type: 'CONTRIBUTION_REQUEST_APPROVED',
        title: 'Welcome aboard',
        body: `You're now a contributor on "${p.title}".`,
        link: `/projects/${p.slug}`,
        metadata: { requestId: rec.id, projectId: p.id, note: rec.resolutionNote },
        at: resolvedAt,
      });
    });
    for (const c of contributions().where('userId', ME_ID)) {
      if (c.status !== 'REJECTED' || !c.resolvedAt) continue;
      const at = new Date(c.resolvedAt).getTime();
      const p = projects().get(c.projectId);
      if (!p || at < now - WINDOW) continue;
      drafts.push({
        type: 'CONTRIBUTION_REQUEST_REJECTED',
        title: 'Contribution request declined',
        body: `Your request to join "${p.title}" was declined.`,
        link: `/projects/${p.slug}`,
        metadata: { requestId: c.id, projectId: p.id, note: c.resolutionNote },
        at,
      });
    }

    // ─── Invites ─────────────────────────────────────────────────────────
    for (const inv of invites().where('invitedUserId', ME_ID)) {
      const p = projects().get(inv.projectId);
      if (!p) continue;
      drafts.push({
        type: 'PROJECT_INVITED',
        title: 'You have been invited to a project',
        body: `${nameOf(inv.invitedById)} invited you to join "${p.title}" as ${inv.role.toLowerCase().replace('_', ' ')}.`,
        link: `/projects/${p.slug}`,
        metadata: { inviteId: inv.id, projectId: p.id, role: inv.role },
        at: new Date(inv.createdAt).getTime(),
      });
    }
    const acceptedFor = history[2];
    if (acceptedFor) {
      const { m, p } = acceptedFor;
      const at = now - 15 * DAY - rng.int(1, 6) * HOUR;
      const inv: InviteRec = {
        id: 'inv_hist_1',
        projectId: p.id,
        invitedUserId: ME_ID,
        invitedById: p.ownerId,
        role: 'CONTRIBUTOR',
        title: m.title,
        status: 'ACCEPTED',
        createdAt: new Date(at).toISOString(),
      };
      invites().insert(inv);
      m.joinedAt = new Date(at + 3 * HOUR).toISOString();
      members().save(m);
      drafts.push({
        type: 'PROJECT_INVITED',
        title: 'You have been invited to a project',
        body: `${nameOf(p.ownerId)} invited you to join "${p.title}" as contributor.`,
        link: `/projects/${p.slug}`,
        metadata: { inviteId: inv.id, projectId: p.id, role: inv.role },
        at,
      });
    }

    // ─── Role changes / removal ──────────────────────────────────────────
    rng.sample(managed, 3).forEach((p, i) => {
      const actor = p.ownerId !== ME_ID ? p.ownerId : actorFor(p);
      drafts.push({
        type: 'PROJECT_ROLE_CHANGED',
        title: 'Your project role changed',
        body: `${nameOf(actor)} made you a Project Manager on "${p.title}".`,
        link: `/projects/${p.slug}`,
        metadata: { projectId: p.id, role: 'PROJECT_MANAGER' },
        at: now - (4 + i * 5 + rng.int(0, 3)) * DAY - rng.int(1, 9) * HOUR,
      });
    });
    const memberOf = new Set(myMembers.map((m) => m.projectId));
    const removedFrom = rng.pick(projects().all().filter((p) => !memberOf.has(p.id) && (p.phase === 'SHIPPED' || p.phase === 'IN_REVIEW')));
    if (removedFrom) {
      drafts.push({
        type: 'PROJECT_REMOVED',
        title: 'Removed from a project',
        body: `${nameOf(removedFrom.ownerId)} removed you from "${removedFrom.title}".`,
        link: '/dashboard',
        metadata: { projectId: removedFrom.id },
        at: now - 17 * DAY - rng.int(1, 8) * HOUR,
      });
    }

    // ─── Notes, whiteboards, voice ───────────────────────────────────────
    const noteTitle = cycle(NOTE_TITLES);
    for (let i = 0; i < 6; i++) {
      const p = rng.pick(myProjects);
      const actor = actorFor(p);
      const listId = listIdFor(p.slug);
      drafts.push({
        type: 'NOTE_MENTIONED',
        title: `${nameOf(actor)} mentioned you in a note`,
        body: noteTitle().replace('{wk}', String(rng.int(38, 41))),
        link: listId ? `/projects/${p.slug}/lists/${listId}/notes` : `/projects/${p.slug}`,
        metadata: { projectId: p.id, actorId: actor },
        at: now - randomAge(),
      });
    }
    const wbTitle = cycle(WHITEBOARD_TITLES);
    for (let i = 0; i < 4; i++) {
      const p = rng.pick(myProjects);
      const actor = actorFor(p);
      const listId = listIdFor(p.slug);
      drafts.push({
        type: 'WHITEBOARD_MENTIONED',
        title: `${nameOf(actor)} mentioned you on a whiteboard`,
        body: wbTitle(),
        link: listId ? `/projects/${p.slug}/lists/${listId}/whiteboards` : `/projects/${p.slug}`,
        metadata: { projectId: p.id, actorId: actor },
        at: now - randomAge(),
      });
    }
    for (let i = 0; i < 5; i++) {
      const p = rng.pick(managed.length ? managed : myProjects);
      const actor = actorFor(p);
      drafts.push({
        type: 'VOICE_PARTICIPANT_JOINED',
        title: `${nameOf(actor)} joined voice in ${p.title}`,
        body: `${rng.pick(VOICE_ROOMS)} · ${rng.int(2, 5)} people in the room`,
        link: `/projects/${p.slug}`,
        metadata: { projectId: p.id, actorId: actor },
        at: now - randomAge(),
      });
    }
    for (let i = 0; i < 3; i++) {
      const p = rng.pick(managed.length ? managed : myProjects);
      const actor = actorFor(p);
      drafts.push({
        type: 'VOICE_MENTIONED',
        title: `${nameOf(actor)} mentioned you in voice`,
        body: `${rng.pick(VOICE_MENTION_LINES)} on ${p.title}.`,
        link: `/projects/${p.slug}`,
        metadata: { projectId: p.id, actorId: actor },
        at: now - randomAge(),
      });
    }

    // A handful of very fresh items so the bell is alive the moment the page opens.
    const fresh = drafts.filter((d) => d.type === 'CHAT_MENTION' || d.type === 'TASK_ASSIGNED' || d.type === 'TASK_MENTIONED');
    rng.sample(fresh, 6).forEach((d, i) => {
      d.at = now - (6 + i * 17) * MIN - rng.int(0, 9) * MIN;
    });

    finalize(drafts, rng, now);
  },
});

function finalize(drafts: Draft[], rng: Rng, now: number) {
  drafts.sort((a, b) => a.at - b.at);
  // Unread likelihood falls off with age (newest items are mostly unread).
  const pUnread = (age: number) =>
    age < DAY ? 0.85 : age < 3 * DAY ? 0.6 : age < 7 * DAY ? 0.35 : age < 14 * DAY ? 0.15 : 0.05;
  const unread = drafts.map((d) => rng.chance(pUnread(now - d.at)));

  // Nudge the overall share to ~35% by flipping the items closest to the boundary.
  const target = Math.round(drafts.length * 0.35);
  let count = unread.filter(Boolean).length;
  const order = drafts.map((_, i) => i);
  for (let k = 0; count !== target && k < drafts.length * 2; k++) {
    const i = order[rng.int(0, order.length - 1)]!;
    const age = now - drafts[i]!.at;
    if (count < target && !unread[i] && age < 8 * DAY) {
      unread[i] = true;
      count++;
    } else if (count > target && unread[i] && age > 3 * DAY) {
      unread[i] = false;
      count--;
    }
  }

  const recs: NotificationRec[] = drafts.map((d, i) => ({
    id: seqId('ntf', i + 1, 4),
    userId: ME_ID,
    type: d.type,
    title: d.title,
    body: d.body,
    link: d.link,
    metadata: d.metadata,
    readAt: unread[i]
      ? null
      : new Date(Math.min(now - MIN, d.at + rng.int(3, 36 * 60) * MIN)).toISOString(),
    createdAt: new Date(d.at).toISOString(),
  }));
  notifications().insertMany(recs);
}
