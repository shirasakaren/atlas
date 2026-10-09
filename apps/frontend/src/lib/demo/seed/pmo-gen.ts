/**
 * PMO seed generator: task lists, statuses, tabs, tasks, dependencies,
 * comments and activity for every project. Pure data generation (no browser
 * globals). Deterministic per project (own RNG), relative to `now`.
 */
import { DAY, HOUR, MIN } from '../clock';
import { ME_ID } from '../config';
import { createRng, hashString, type Rng } from '../prng';
import type { ProjectKind, ProjectRec } from '../schema';
import { members as membersTbl, projects as projectsTbl, users as usersTbl } from '../store';
import {
  COMMENTS_MAYA,
  COMMENTS_REPLY,
  COMMENTS_TOP,
  DEFAULT_LIST_NAMES,
  FLAVOR_ICON,
  FLAVOR_STREAMS,
  STREAMS,
  UNIVERSAL_TITLES,
  fill,
  projectSubject,
  type FillCtx,
  type Flavor,
  type KindVocab,
  type Stream,
} from './pmo-content-common';
import { pickBlocker } from './pmo-docs';
import {
  DEFAULT_TABS,
  sid,
  type ActivityRec,
  type CommentRec,
  type DepRec,
  type DescSpec,
  type ListRec,
  type StatusRec,
  type TabRec,
  type TaskRec,
} from './pmo-store';
import { vocabFor } from './pmo-vocab';
import type { TaskPriority } from '@/lib/types';

export type Role = 'backlog' | 'ready' | 'progress' | 'blocked' | 'review' | 'done' | 'cancelled';

interface StatusDef {
  name: string;
  color: string;
  category: StatusRec['category'];
  role: Role;
  isDefault?: boolean;
}

const SETS: { w: number; defs: StatusDef[] }[] = [
  {
    w: 38,
    defs: [
      { name: 'Backlog', color: 'neutral', category: 'TODO', role: 'backlog', isDefault: true },
      { name: 'In Progress', color: 'blue', category: 'IN_PROGRESS', role: 'progress' },
      { name: 'In Review', color: 'yellow', category: 'IN_PROGRESS', role: 'review' },
      { name: 'Done', color: 'green', category: 'DONE', role: 'done' },
    ],
  },
  {
    w: 20,
    defs: [
      { name: 'Backlog', color: 'neutral', category: 'TODO', role: 'backlog', isDefault: true },
      { name: 'Ready', color: 'yellow', category: 'TODO', role: 'ready' },
      { name: 'In Progress', color: 'blue', category: 'IN_PROGRESS', role: 'progress' },
      { name: 'Blocked', color: 'red', category: 'IN_PROGRESS', role: 'blocked' },
      { name: 'In Review', color: 'yellow', category: 'IN_PROGRESS', role: 'review' },
      { name: 'Done', color: 'green', category: 'DONE', role: 'done' },
      { name: "Won't do", color: 'neutral', category: 'CANCELLED', role: 'cancelled' },
    ],
  },
  {
    w: 14,
    defs: [
      { name: 'Backlog', color: 'neutral', category: 'TODO', role: 'backlog', isDefault: true },
      { name: 'In Progress', color: 'blue', category: 'IN_PROGRESS', role: 'progress' },
      { name: 'Blocked', color: 'red', category: 'IN_PROGRESS', role: 'blocked' },
      { name: 'Done', color: 'green', category: 'DONE', role: 'done' },
      { name: 'Cancelled', color: 'neutral', category: 'CANCELLED', role: 'cancelled' },
    ],
  },
  {
    w: 10,
    defs: [
      { name: 'To do', color: 'neutral', category: 'TODO', role: 'backlog', isDefault: true },
      { name: 'Doing', color: 'blue', category: 'IN_PROGRESS', role: 'progress' },
      { name: 'In review', color: 'yellow', category: 'IN_PROGRESS', role: 'review' },
      { name: 'Done', color: 'green', category: 'DONE', role: 'done' },
    ],
  },
  {
    w: 18,
    defs: [
      { name: 'Backlog', color: 'neutral', category: 'TODO', role: 'backlog', isDefault: true },
      { name: 'Planned', color: 'yellow', category: 'TODO', role: 'ready' },
      { name: 'In Progress', color: 'blue', category: 'IN_PROGRESS', role: 'progress' },
      { name: 'QA', color: 'yellow', category: 'IN_PROGRESS', role: 'review' },
      { name: 'Done', color: 'green', category: 'DONE', role: 'done' },
      { name: 'Cancelled', color: 'neutral', category: 'CANCELLED', role: 'cancelled' },
    ],
  },
];

const PHASE_ROLES: Record<string, [Role, number][]> = {
  SHIPPED: [['done', 86], ['cancelled', 4], ['progress', 3], ['review', 1], ['backlog', 5], ['blocked', 1]],
  ARCHIVED: [['done', 72], ['cancelled', 12], ['backlog', 12], ['progress', 3], ['blocked', 1]],
  IN_REVIEW: [['done', 52], ['review', 15], ['progress', 12], ['backlog', 9], ['ready', 4], ['blocked', 5], ['cancelled', 3]],
  IN_DEVELOPMENT: [['done', 34], ['progress', 19], ['review', 8], ['backlog', 22], ['ready', 7], ['blocked', 6], ['cancelled', 4]],
  PLANNING: [['done', 8], ['progress', 18], ['review', 3], ['backlog', 52], ['ready', 12], ['blocked', 3], ['cancelled', 4]],
  IDEA: [['done', 5], ['progress', 15], ['backlog', 70], ['ready', 5], ['cancelled', 5]],
};

const COMMENT_COUNTS: Record<Role, number[]> = {
  done: [0.25, 0.25, 0.22, 0.15, 0.08, 0.05],
  progress: [0.05, 0.12, 0.2, 0.2, 0.17, 0.12, 0.09, 0.05],
  review: [0, 0.12, 0.2, 0.25, 0.22, 0.13, 0.08],
  blocked: [0, 0, 0.2, 0.25, 0.25, 0.18, 0.12],
  backlog: [0.4, 0.3, 0.2, 0.1],
  ready: [0.4, 0.3, 0.2, 0.1],
  cancelled: [0.3, 0.4, 0.3],
};

const MAYA_ASKS = [
  '{m} could you approve the budget line for {thing}? We need it confirmed before {day}.',
  '{m} do you want this in the {quarter} update, or is it fine to report it as on track?',
  '{m} flagging for visibility: {team} wants to move the date. Your call on whether we accept.',
  'Can you weigh in {m}? Two options for {thing}; I recommend the simpler one but it is your decision.',
  '{m} this is the item I mentioned in the sync. Needs a sponsor-level nudge to {team}.',
  'Heads up {m}: the {doc} is ready for your review whenever you have ten minutes.',
  '{m} could you unblock the access request for {env}? Ticket is with the service desk.',
  'Looping in {m} since this affects the {region} plan. No action yet, just awareness.',
  '{m} are you ok with descoping {thing2} from this release? It saves about a week.',
  'Thanks for the steer {m}. I have updated the plan and the RACI accordingly.',
];

const SP = [1, 2, 3, 5, 8, 13];

export interface GenOut {
  lists: ListRec[];
  statuses: StatusRec[];
  tabs: TabRec[];
  tasks: TaskRec[];
  deps: DepRec[];
  comments: CommentRec[];
  activity: ActivityRec[];
}

interface Spec {
  title: string;
  stream: Stream;
  role: Role;
  createdMs: number;
  startMs: number | null;
  dueMs: number | null;
  completedMs: number | null;
  assignees: string[];
  creator: string;
  priority: TaskPriority;
  points: number | null;
  archivedMs: number | null;
  seed: number;
  preds: number[];
  list: ListCtx;
  proj: ProjCtx;
  id?: string;
  key?: string;
  num?: number;
  maya?: boolean;
}

interface ListCtx {
  rec: ListRec;
  flavor: Flavor;
  defs: StatusDef[];
  statuses: StatusRec[];
  specs: Spec[];
}

interface ProjCtx {
  rec: ProjectRec;
  vocab: KindVocab;
  rng: Rng;
  memberIds: string[];
  managerIds: string[];
  cum: number[];
  hasMaya: boolean;
  me?: 'O' | 'M' | 'C';
  lists: ListCtx[];
  fillCtx: FillCtx;
  names: Map<string, string>;
}

function localAt(now: number, dayOffset: number, h: number, m: number): number {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d.getTime();
}
const dueAt = (now: number, off: number) => localAt(now, off, 23, 30);
const startAt = (now: number, off: number) => localAt(now, off, 9, 0);

const iso = (ms: number) => new Date(ms).toISOString();

function workTime(rng: Rng, dayMs: number): number {
  return Math.floor(dayMs / DAY) * DAY + rng.int(8 * 60, 17 * 60 + 40) * MIN;
}

function pickWeighted<T>(rng: Rng, arr: readonly T[], w: readonly number[]): T {
  let t = 0;
  for (const x of w) t += x;
  let r = rng.next() * t;
  for (let i = 0; i < arr.length; i++) {
    r -= w[i] ?? 0;
    if (r <= 0) return arr[i]!;
  }
  return arr[arr.length - 1]!;
}

function pickMember(p: ProjCtx, rng: Rng): string {
  const total = p.cum[p.cum.length - 1]!;
  const r = rng.next() * total;
  let lo = 0;
  let hi = p.cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (p.cum[mid]! < r) lo = mid + 1;
    else hi = mid;
  }
  return p.memberIds[lo]!;
}

function listCountFor(phase: string, rng: Rng): number {
  switch (phase) {
    case 'IDEA':
      return 1;
    case 'PLANNING':
      return rng.weighted([[1, 50], [2, 50]]);
    case 'ARCHIVED':
      return rng.weighted([[1, 60], [2, 40]]);
    case 'SHIPPED':
      return rng.weighted([[1, 35], [2, 40], [3, 25]]);
    default:
      return rng.weighted([[1, 30], [2, 38], [3, 24], [4, 8]]);
  }
}

function pickFlavors(phase: string, n: number, rng: Rng): Flavor[] {
  const first: Flavor[] = phase === 'IDEA' || phase === 'PLANNING' ? ['discovery', 'roadmap'] : ['roadmap', 'sprint'];
  const rest: Flavor[] = phase === 'SHIPPED' || phase === 'ARCHIVED'
    ? ['launch', 'backlog', 'risk', 'enable', 'vendor']
    : ['sprint', 'launch', 'backlog', 'risk', 'vendor', 'enable', 'discovery'];
  const out: Flavor[] = [rng.pick(first)];
  const pool = rng.shuffle(rest).filter((f) => !out.includes(f));
  while (out.length < n && pool.length) out.push(pool.shift()!);
  return out;
}

function genTitle(p: ProjCtx, stream: Stream, rng: Rng, used: Set<string>): string {
  const kindT = p.vocab.titles[stream];
  for (let attempt = 0; attempt < 8; attempt++) {
    const tpl = rng.chance(0.68) ? rng.pick(kindT) : rng.pick(UNIVERSAL_TITLES[stream]);
    let t = fill(tpl, rng, p.fillCtx);
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (!used.has(t)) {
      used.add(t);
      return t;
    }
  }
  const t = `${fill(rng.pick(kindT), rng, p.fillCtx)} (${rng.pick(['follow-up', 'phase 2', 'second pass', 'remaining items'])})`;
  used.add(t);
  return t;
}

function mention(p: ProjCtx, id: string): string {
  return `@[${p.names.get(id) ?? 'Teammate'}](${id})`;
}

// ─── Per-project spec generation ───────────────────────────────────────────

function buildProject(rec: ProjectRec, now: number, seq: { list: number; status: number; tab: number }, out: GenOut): ProjCtx {
  const rng = createRng(`pmo:${rec.id}:${hashString(rec.key)}`);
  const vocab = vocabFor(rec.kind as ProjectKind);
  const mem = membersTbl().where('projectId', rec.id);
  const memberIds = mem.map((m) => m.userId);
  const managerIds = mem.filter((m) => m.role === 'PROJECT_MANAGER').map((m) => m.userId);
  const hasMaya = memberIds.includes(ME_ID);
  const names = new Map<string, string>();
  for (const id of memberIds) names.set(id, usersTbl().get(id)?.name ?? 'Teammate');
  // Uneven workloads: a few people carry most of the tasks.
  let acc = 0;
  const cum = memberIds.map((id) => {
    const base = 0.15 + Math.pow(rng.next(), 2.4) * 3.2;
    acc += id === ME_ID ? 0.6 : managerIds.includes(id) ? base * 0.55 : base;
    return acc;
  });
  const subj = projectSubject(rec.title);
  const p: ProjCtx = {
    rec,
    vocab,
    rng,
    memberIds,
    managerIds,
    cum,
    hasMaya,
    lists: [],
    fillCtx: { pools: vocab.pools, subj, proj: rec.title },
    names,
  };

  const nLists = listCountFor(rec.phase, rng);
  const flavors = pickFlavors(rec.phase, nLists, rng);
  const pStart = Date.parse(rec.createdAt);
  const ageDays = Math.max(20, Math.round((now - pStart) / DAY));
  const sprintBase = 12 + (hashString(rec.key) % 26);
  const usedNames = new Set<string>();
  const usedTitles = new Set<string>();

  flavors.forEach((flavor, li) => {
    const namePool = vocab.lists[flavor] ?? DEFAULT_LIST_NAMES[flavor];
    let name = rng.pick(namePool).replace('{n}', String(sprintBase + li));
    if (usedNames.has(name)) name = `${name} ${li + 1}`;
    usedNames.add(name);
    const setDef = pickWeighted(rng, SETS, SETS.map((s) => s.w));
    const listId = sid('tls', seq.list++, 4);
    const [icon, color] = FLAVOR_ICON[flavor];
    const lrec: ListRec = {
      id: listId,
      projectId: rec.id,
      name,
      iconName: icon,
      iconColor: color,
      order: li,
      contributorsCanCreateTasks: !rng.chance(0.1),
      projectKey: rec.key,
      taskCounter: 0,
      archivedAt: rec.phase === 'ARCHIVED' || (rec.phase === 'SHIPPED' && li > 0 && rng.chance(0.3)) ? iso(now - rng.int(30, 200) * DAY) : null,
      createdAt: iso(pStart + li * rng.int(2, 25) * DAY),
      updatedAt: iso(now),
      deletedAt: null,
    };
    const statuses: StatusRec[] = setDef.defs.map((d, i) => ({
      id: sid('tst', seq.status++, 5),
      taskListId: listId,
      name: d.name,
      color: d.color,
      category: d.category,
      order: i,
      isDefault: !!d.isDefault,
    }));
    DEFAULT_TABS.forEach((t, i) => {
      const kind = t.kind;
      out.tabs.push({
        id: sid('ttb', seq.tab++, 5),
        taskListId: listId,
        kind,
        label: null,
        iconName: t.iconName,
        url: null,
        embedPreset: null,
        order: i,
        hidden: false,
        createdAt: lrec.createdAt,
      });
    });
    // A few lists carry an embed tab (Figma / docs).
    if (li === 0 && rng.chance(0.15)) {
      out.tabs.push({
        id: sid('ttb', seq.tab++, 5),
        taskListId: listId,
        kind: 'EMBED',
        label: rng.pick(['Figma designs', 'Program charter (Docs)', 'Status deck (Slides)']),
        iconName: 'link',
        url: 'https://www.figma.com/embed?embed_host=atlas&url=https://www.figma.com/file/demo',
        embedPreset: 'figma',
        order: DEFAULT_TABS.length,
        hidden: false,
        createdAt: lrec.createdAt,
      });
    }
    out.lists.push(lrec);
    out.statuses.push(...statuses);
    const lc: ListCtx = { rec: lrec, flavor, defs: setDef.defs, statuses, specs: [] };
    p.lists.push(lc);

    // ── tasks ──
    const n = rec.phase === 'IDEA' ? rng.int(8, 14) : rec.phase === 'PLANNING' ? rng.int(25, 48) : rng.int(25, 58);
    const sw = FLAVOR_STREAMS[flavor];
    const streamW = STREAMS.map((s) => sw[s]);
    const roleTable = PHASE_ROLES[rec.phase] ?? PHASE_ROLES.IN_DEVELOPMENT!;
    for (let k = 0; k < n; k++) {
      const stream = pickWeighted(rng, STREAMS, streamW);
      let role = rng.weighted(
        roleTable.map(([r, w]) => [r, flavor === 'backlog' ? (r === 'backlog' || r === 'ready' ? w * 2.5 : r === 'done' ? w * 0.5 : w) : w] as const),
      ) as Role;
      if (!lc.defs.some((d) => d.role === role)) role = role === 'blocked' ? 'progress' : role === 'ready' ? 'backlog' : role === 'review' ? 'progress' : 'backlog';
      const spec = makeSpec(p, lc, stream, role, now, pStart, ageDays, usedTitles);
      lc.specs.push(spec);
    }
    makeDeps(lc, rng);
  });
  return p;
}

function makeSpec(p: ProjCtx, lc: ListCtx, stream: Stream, role: Role, now: number, pStart: number, ageDays: number, used: Set<string>): Spec {
  const rng = p.rng;
  const title = genTitle(p, stream, rng, used);
  let created = 0;
  let start: number | null = null;
  let due: number | null = null;
  let completed: number | null = null;
  let archivedMs: number | null = null;
  const shipped = p.rec.phase === 'SHIPPED' || p.rec.phase === 'ARCHIVED';
  switch (role) {
    case 'done': {
      const maxAgo = Math.max(3, Math.min(ageDays - 2, 330));
      const ago = shipped ? rng.int(3, maxAgo) : Math.max(1, Math.floor(Math.pow(rng.next(), 1.5) * maxAgo));
      completed = workTime(rng, now - ago * DAY);
      if (completed > now - 20 * MIN) completed = now - rng.int(30, 300) * MIN;
      start = completed - rng.int(1, 22) * DAY;
      created = Math.max(pStart, start - rng.int(0, 15) * DAY);
      if (start < created) start = created;
      if (completed < start) completed = start + HOUR;
      due = rng.chance(0.92) ? dueAt(now, Math.round((completed - now) / DAY) + rng.int(-5, 4)) : null;
      start = workTime(rng, start);
      if (start < created) start = created;
      if (ago > 70 && rng.chance(0.07)) archivedMs = Math.min(now - HOUR, completed + rng.int(1, 30) * DAY);
      break;
    }
    case 'progress':
    case 'review':
    case 'blocked': {
      const startAgo = rng.int(1, Math.max(2, Math.min(ageDays - 1, 40)));
      start = workTime(rng, now - startAgo * DAY);
      if (start > now - HOUR) start = now - rng.int(2, 20) * HOUR;
      const overdueP = role === 'blocked' ? 0.5 : role === 'review' ? 0.1 : 0.17;
      if (rng.chance(overdueP)) due = dueAt(now, -rng.int(1, 24));
      else due = rng.chance(0.93) ? dueAt(now, rng.int(0, 35)) : null;
      if (due !== null && due - start < 2 * DAY) start = Math.min(start, due - rng.int(3, 20) * DAY);
      created = Math.max(pStart, start - rng.int(0, 25) * DAY);
      if (start < created) start = created;
      break;
    }
    case 'cancelled': {
      const ago = rng.int(5, Math.max(6, Math.min(ageDays - 1, 200)));
      created = Math.max(pStart, now - (ago + rng.int(2, 40)) * DAY);
      due = rng.chance(0.4) ? dueAt(now, -ago + rng.int(0, 20)) : null;
      start = null;
      if (rng.chance(0.55)) archivedMs = now - ago * DAY + rng.int(0, 3) * DAY;
      break;
    }
    default: {
      // backlog / ready
      const span = now - pStart;
      created = Math.min(now - 2 * HOUR, pStart + Math.floor(span * Math.pow(rng.next(), 0.85)));
      if (role === 'ready' ? rng.chance(0.5) : rng.chance(0.18)) start = startAt(now, rng.int(1, 40));
      if (rng.chance(role === 'ready' ? 0.7 : 0.5)) due = dueAt(now, rng.chance(0.07) ? -rng.int(1, 40) : (start !== null ? Math.round((start - now) / DAY) : 0) + rng.int(7, 100));
      if (role === 'backlog' && !shipped && rng.chance(0.04)) archivedMs = Math.min(now - DAY, created + rng.int(3, 60) * DAY);
    }
  }
  // assignees
  const open = role === 'backlog' || role === 'ready';
  const k = open
    ? pickWeighted(rng, [0, 1, 2], [40, 50, 10])
    : pickWeighted(rng, [0, 1, 2, 3], [4, 72, 19, 5]);
  const assignees: string[] = [];
  for (let i = 0; i < k * 3 && assignees.length < k; i++) {
    const m = pickMember(p, rng);
    if (!assignees.includes(m)) assignees.push(m);
  }
  const creator = rng.chance(0.55) && p.managerIds.length ? rng.pick(p.managerIds) : assignees[0] ?? pickMember(p, rng);
  let priority: TaskPriority = rng.weighted([['NONE', 20], ['LOW', 15], ['MEDIUM', 38], ['HIGH', 20], ['URGENT', 7]] as const);
  if ((role === 'blocked' || (due !== null && due < now && role !== 'done')) && rng.chance(0.5)) priority = rng.chance(0.5) ? 'URGENT' : 'HIGH';
  const points = rng.chance(0.25) ? null : rng.pick(SP);
  return {
    title,
    stream,
    role,
    createdMs: created,
    startMs: start,
    dueMs: due,
    completedMs: completed,
    assignees,
    creator,
    priority,
    points,
    archivedMs,
    seed: rng.int(1, 2_000_000_000),
    preds: [],
    list: lc,
    proj: p,
  };
}

function makeDeps(lc: ListCtx, rng: Rng) {
  const live = lc.specs
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s.role !== 'cancelled' && x.s.archivedMs === null)
    .sort((a, b) => (a.s.startMs ?? a.s.createdMs) - (b.s.startMs ?? b.s.createdMs));
  for (let j = 1; j < live.length; j++) {
    if (!rng.chance(0.3)) continue;
    const cur = live[j]!;
    const nDeps = rng.chance(0.2) ? 2 : 1;
    for (let d = 0; d < nDeps; d++) {
      const pj = j - rng.int(1, Math.min(7, j));
      const pred = live[pj]!;
      if (cur.s.role === 'done' && pred.s.role !== 'done') continue;
      if (cur.s.preds.includes(pred.i)) continue;
      cur.s.preds.push(pred.i);
      if (cur.s.role !== 'done' && pred.s.dueMs !== null && cur.s.startMs !== null && cur.s.startMs <= pred.s.dueMs && cur.s.role !== 'progress' && cur.s.role !== 'review') {
        cur.s.startMs = pred.s.dueMs + DAY;
        if (cur.s.dueMs !== null && cur.s.dueMs < cur.s.startMs + DAY) cur.s.dueMs = cur.s.startMs + rng.int(3, 14) * DAY;
      }
    }
  }
}

// ─── Persona workload ──────────────────────────────────────────────────────

function personaWorkload(projs: ProjCtx[], now: number) {
  const rng = createRng('pmo:persona');
  const cand = projs.filter((p) => p.hasMaya && p.rec.phase !== 'SHIPPED' && p.rec.phase !== 'ARCHIVED' && p.rec.phase !== 'IDEA');
  const chosen = cand.slice(0, 22);
  const picked: Spec[] = [];
  for (const p of chosen) {
    const want = p.rec.phase === 'PLANNING' ? rng.int(2, 3) : rng.int(3, 5);
    const specs = p.lists.filter((l) => !l.rec.archivedAt).flatMap((l) => l.specs).filter((s) => ['backlog', 'ready', 'progress', 'review', 'blocked'].includes(s.role) && s.archivedMs === null);
    const mine = specs.filter((s) => s.assignees.includes(ME_ID));
    const others = rng.shuffle(specs.filter((s) => !s.assignees.includes(ME_ID)));
    const take = [...mine.slice(0, want), ...others].slice(0, want);
    for (const s of take) {
      if (!s.assignees.includes(ME_ID)) {
        if (s.assignees.length >= 2) s.assignees.pop();
        s.assignees.unshift(ME_ID);
      }
      s.maya = true;
      picked.push(s);
    }
  }
  // Her open workload is exactly the curated set: drop her from every other open task.
  for (const p of projs) for (const l of p.lists) for (const s of l.specs) {
    if (!s.maya && s.assignees.includes(ME_ID) && s.role !== 'done' && s.role !== 'cancelled') {
      s.assignees = s.assignees.filter((u) => u !== ME_ID);
      if (s.assignees.length === 0 && s.role !== 'backlog' && s.role !== 'ready') s.assignees = [p.managerIds.find((u) => u !== ME_ID) ?? p.memberIds.find((u) => u !== ME_ID) ?? s.creator];
    }
  }
  const shuffled = rng.shuffle(picked);
  const N = shuffled.length;
  const quotas: [string, number][] = [['overdue', 0.12], ['today', 0.08], ['week', 0.22], ['next', 0.18], ['later', 0.28], ['none', 0.12]];
  let idx = 0;
  for (const [bucket, frac] of quotas) {
    const cnt = Math.round(N * frac);
    for (let c = 0; c < cnt && idx < N; c++, idx++) applyBucket(shuffled[idx]!, bucket, now, rng);
  }
  while (idx < N) applyBucket(shuffled[idx++]!, 'later', now, rng);
}

function applyBucket(s: Spec, bucket: string, now: number, rng: Rng) {
  const hasRole = (r: Role) => s.list.defs.some((d) => d.role === r);
  const setRole = (r: Role) => {
    s.role = hasRole(r) ? r : r === 'ready' ? 'backlog' : r === 'blocked' || r === 'review' ? 'progress' : r;
  };
  s.completedMs = null;
  switch (bucket) {
    case 'overdue':
      setRole(rng.weighted([['progress', 70], ['blocked', 15], ['review', 15]] as const));
      s.dueMs = dueAt(now, -rng.int(1, 8));
      s.startMs = startAt(now, -rng.int(10, 30));
      if (s.priority === 'NONE' || s.priority === 'LOW') s.priority = 'HIGH';
      break;
    case 'today':
      setRole(rng.weighted([['progress', 70], ['review', 30]] as const));
      s.dueMs = dueAt(now, 0);
      s.startMs = startAt(now, -rng.int(3, 15));
      break;
    case 'week':
      setRole(rng.weighted([['progress', 50], ['ready', 20], ['review', 15], ['backlog', 15]] as const));
      s.dueMs = dueAt(now, rng.int(1, 6));
      s.startMs = s.role === 'progress' || s.role === 'review' ? startAt(now, -rng.int(1, 12)) : null;
      break;
    case 'next':
      setRole(rng.weighted([['progress', 35], ['ready', 35], ['backlog', 30]] as const));
      s.dueMs = dueAt(now, rng.int(7, 13));
      s.startMs = s.role === 'progress' ? startAt(now, -rng.int(1, 8)) : null;
      break;
    case 'later':
      setRole(rng.weighted([['progress', 25], ['ready', 40], ['backlog', 35]] as const));
      s.dueMs = dueAt(now, rng.int(14, 70));
      s.startMs = s.role === 'progress' ? startAt(now, -rng.int(1, 8)) : null;
      break;
    default:
      setRole(rng.weighted([['ready', 40], ['backlog', 60]] as const));
      s.dueMs = null;
      s.startMs = null;
  }
  if (s.startMs !== null && s.startMs < s.createdMs) s.createdMs = s.startMs - rng.int(1, 6) * DAY;
  if (s.createdMs > now - HOUR) s.createdMs = now - 2 * DAY;
}

// ─── Materialisation ───────────────────────────────────────────────────────

function pickDistinct(rng: Rng, ids: string[], not: string[]): string {
  for (let i = 0; i < 6; i++) {
    const c = rng.pick(ids);
    if (!not.includes(c)) return c;
  }
  return rng.pick(ids);
}

export function generatePmo(now: number): GenOut & { stats: Record<string, number> } {
  const out: GenOut = { lists: [], statuses: [], tabs: [], tasks: [], deps: [], comments: [], activity: [] };
  const seq = { list: 1, status: 1, tab: 1 };
  const projs: ProjCtx[] = [];
  for (const rec of projectsTbl().all()) projs.push(buildProject(rec, now, seq, out));
  personaWorkload(projs, now);

  let taskSeq = 1;
  let comSeq = 1;
  let actSeq = 1;
  let depSeq = 1;

  for (const p of projs) {
    const rng = p.rng;
    // numbering by creation time within the project
    const all = p.lists.flatMap((l) => l.specs);
    all.sort((a, b) => a.createdMs - b.createdMs);
    all.forEach((s, i) => {
      s.num = i + 1;
      s.key = `${p.rec.key}-${i + 1}`;
      s.id = sid('tsk', taskSeq++, 5);
    });
    const posCounter = new Map<string, number>();
    for (const l of p.lists) {
      l.rec.taskCounter = l.specs.reduce((m, s) => Math.max(m, s.num!), 0);
      let maxUpd = Date.parse(l.rec.createdAt);
      const byRoleStatus = (role: Role): StatusRec => {
        const idx = l.defs.findIndex((d) => d.role === role);
        return l.statuses[idx >= 0 ? idx : 0]!;
      };
      const defaultStatus = l.statuses.find((s) => s.isDefault) ?? l.statuses[0]!;
      for (let si = 0; si < l.specs.length; si++) {
        const s = l.specs[si]!;
        const st = byRoleStatus(s.role);
        const pk = st.id;
        const pos = (posCounter.get(pk) ?? 0) + 1;
        posCounter.set(pk, pos);
        const actors = s.assignees.length ? s.assignees : [s.creator];
        const actor = () => (rng.chance(0.15) && p.managerIds.length ? rng.pick(p.managerIds) : rng.pick(actors));
        const acts: { t: number; kind: ActivityRec['kind']; actor: string | null; payload: Record<string, unknown> }[] = [];
        const tEnd = s.completedMs ?? now - 3 * MIN;

        // description recipe
        const dspec: DescSpec = { s: s.seed, st: s.stream };
        if (s.preds.length) dspec.rel = s.preds.map((pi) => l.specs[pi]!.key!);
        if (s.role === 'blocked') dspec.blk = pickBlocker(rng);

        // events
        acts.push({ t: s.createdMs, kind: 'CREATED', actor: s.creator, payload: { title: s.title, statusId: defaultStatus.id } });
        for (const a of s.assignees) acts.push({ t: s.createdMs + rng.int(1, 120) * MIN, kind: 'ASSIGNED', actor: s.creator, payload: { userId: a } });
        if (s.dueMs !== null && rng.chance(0.6)) acts.push({ t: s.createdMs + rng.int(5, 600) * MIN, kind: 'DUE_DATE_SET', actor: s.creator, payload: { before: null, after: iso(s.dueMs) } });
        if (s.startMs !== null && rng.chance(0.4)) acts.push({ t: s.createdMs + rng.int(5, 900) * MIN, kind: 'START_DATE_SET', actor: s.creator, payload: { before: null, after: iso(s.startMs) } });
        if (s.priority !== 'NONE' && rng.chance(0.3)) acts.push({ t: s.createdMs + rng.int(10, 2000) * MIN, kind: 'PRIORITY_CHANGED', actor: actor(), payload: { before: 'NONE', after: s.priority } });
        // status path
        const path: Role[] = s.role === 'done' ? (l.defs.some((d) => d.role === 'review') && rng.chance(0.6) ? ['progress', 'review', 'done'] : ['progress', 'done'])
          : s.role === 'review' ? ['progress', 'review']
            : s.role === 'blocked' ? ['progress', 'blocked']
              : s.role === 'progress' ? ['progress']
                : s.role === 'ready' ? ['ready']
                  : s.role === 'cancelled' ? (rng.chance(0.5) ? ['progress', 'cancelled'] : ['cancelled']) : [];
        let prev: StatusRec = defaultStatus;
        const t0 = Math.max(s.createdMs + HOUR, s.startMs !== null && s.startMs < now ? s.startMs : s.createdMs + 3 * HOUR);
        path.forEach((r, i) => {
          const target = byRoleStatus(r);
          if (target.id === prev.id) return;
          const frac = (i + 1) / path.length;
          let t = t0 + (tEnd - t0) * frac * (r === 'done' ? 1 : 0.8) - rng.int(0, 3 * 60) * MIN;
          if (r === 'done' && s.completedMs !== null) t = s.completedMs;
          if (t < s.createdMs + MIN) t = s.createdMs + (i + 1) * HOUR;
          if (t > tEnd) t = tEnd - i * MIN;
          acts.push({ t, kind: 'STATUS_CHANGED', actor: actor(), payload: { before: prev.id, after: target.id, beforePosition: '1', afterPosition: String(pos) } });
          if (r === 'done') acts.push({ t: t + 1000, kind: 'COMPLETED', actor: actor(), payload: {} });
          prev = target;
        });
        if (rng.chance(0.2)) acts.push({ t: s.createdMs + rng.int(1, 30) * HOUR, kind: 'DESCRIPTION_EDITED', actor: s.creator, payload: {} });
        if (rng.chance(0.04)) acts.push({ t: s.createdMs + rng.int(2, 100) * HOUR, kind: 'RENAMED', actor: s.creator, payload: { before: s.title.slice(0, 40), after: s.title } });
        if (s.archivedMs !== null) acts.push({ t: s.archivedMs, kind: 'ARCHIVED', actor: actor(), payload: {} });

        // dependencies
        for (const pi of s.preds) {
          const ps = l.specs[pi]!;
          const depId = sid('tdp', depSeq++, 5);
          const kind = rng.weighted([['FINISH_TO_START', 86], ['START_TO_START', 8], ['FINISH_TO_FINISH', 6]] as const);
          out.deps.push({ id: depId, fromTaskId: s.id!, toTaskId: ps.id!, kind });
          acts.push({ t: s.createdMs + rng.int(30, 3000) * MIN, kind: 'DEPENDENCY_ADDED', actor: s.creator, payload: { toTaskId: ps.id, depId, kind } });
        }

        // comments
        const nC = pickWeighted(rng, COMMENT_COUNTS[s.role].map((_, i) => i), COMMENT_COUNTS[s.role]);
        const mayaTask = p.hasMaya && (s.maya || rng.chance(0.2));
        genComments(p, s, nC, mayaTask, tEnd, now, rng, (c) => {
          const id = sid('tcm', comSeq++, 5);
          out.comments.push({ id, taskId: s.id!, authorId: c.author, markdown: c.md, replyToId: c.replyTo !== null ? c.replyId(c.replyTo) : null, editedAt: null, deletedAt: null, createdAt: iso(c.t) });
          c.register(id);
          acts.push({ t: c.t, kind: 'COMMENT_ADDED', actor: c.author, payload: { commentId: id, replyToId: c.replyTo !== null ? c.replyId(c.replyTo) : null } });
          for (const mu of c.mentions) acts.push({ t: c.t + 500, kind: 'MENTIONED', actor: c.author, payload: { userId: mu, commentId: id } });
        });

        // recent chatter for live tasks
        if ((s.role === 'progress' || s.role === 'review') && rng.chance(0.25)) {
          acts.push({ t: now - rng.int(10, 60 * 72) * MIN, kind: 'DESCRIPTION_EDITED', actor: actor(), payload: {} });
        }

        let upd = s.createdMs;
        for (const a of acts) {
          const t = Math.min(Math.max(a.t, s.createdMs), now - MIN);
          if (t > upd) upd = t;
          out.activity.push({ id: sid('tac', actSeq++, 6), taskId: s.id!, projectId: p.rec.id, listId: l.rec.id, actorId: a.actor, kind: a.kind, payload: a.payload, createdAt: iso(t) });
        }
        if (upd > maxUpd) maxUpd = upd;
        const rec: TaskRec = {
          id: s.id!,
          taskListId: l.rec.id,
          projectId: p.rec.id,
          key: s.key!,
          title: s.title,
          description: null,
          dspec,
          statusId: st.id,
          priority: s.priority,
          storyPoints: s.points,
          startDate: s.startMs !== null ? iso(s.startMs) : null,
          dueDate: s.dueMs !== null ? iso(s.dueMs) : null,
          completedAt: st.category === 'DONE' && s.completedMs !== null ? iso(s.completedMs) : null,
          pos,
          createdById: s.creator,
          archivedAt: s.archivedMs !== null ? iso(s.archivedMs) : null,
          deletedAt: null,
          createdAt: iso(s.createdMs),
          updatedAt: iso(upd),
          assignees: s.assignees.map((u) => ({ userId: u, at: iso(s.createdMs + 30 * MIN) })),
        };
        if (st.category === 'DONE' && rec.completedAt === null) rec.completedAt = iso(Math.min(now - HOUR, s.createdMs + 3 * DAY));
        out.tasks.push(rec);
      }
      l.rec.updatedAt = iso(maxUpd);
    }
  }
  return {
    ...out,
    stats: { tasks: out.tasks.length, comments: out.comments.length, activity: out.activity.length, lists: out.lists.length, deps: out.deps.length },
  };
}

interface GenComment {
  t: number;
  author: string;
  md: string;
  replyTo: number | null;
  mentions: string[];
  replyId: (i: number) => string;
  register: (id: string) => void;
}

function genComments(p: ProjCtx, s: Spec, n: number, mayaTask: boolean, tEnd: number, now: number, rng: Rng, emit: (c: GenComment) => void) {
  if (n === 0 && !mayaTask) return;
  const ids: string[] = [];
  const authors: string[] = [];
  const tops: number[] = [];
  const members = p.memberIds;
  const lo = s.createdMs + 20 * MIN;
  const hi = Math.max(lo + HOUR, tEnd);
  const extra = mayaTask && rng.chance(0.55) ? 1 : 0;
  const total = n + extra;
  const times: number[] = [];
  for (let i = 0; i < total; i++) times.push(Math.floor(lo + (hi - lo) * Math.pow(rng.next(), s.role === 'done' ? 1 : 0.7)));
  times.sort((a, b) => a - b);
  const subject = s.assignees.length ? s.assignees : [s.creator];
  for (let i = 0; i < total; i++) {
    const t = Math.min(times[i]!, now - 2 * MIN);
    const isMayaAsk = i >= n || (mayaTask && rng.chance(0.18));
    let author: string;
    let tpl: string;
    let replyTo: number | null = null;
    const last = i === total - 1;
    if (i > 0 && tops.length > 0 && !isMayaAsk && rng.chance(0.55)) {
      replyTo = rng.pick(tops);
      author = pickDistinct(rng, p.memberIds.length > 1 ? [...subject, ...members] : members, [authors[replyTo]!]);
      tpl = rng.pick(COMMENTS_REPLY);
    } else {
      let kind: keyof typeof COMMENTS_TOP;
      if (isMayaAsk) kind = 'question';
      else if (i === 0) kind = s.role === 'backlog' || s.role === 'ready' ? 'backlog' : rng.chance(0.65) ? 'start' : 'question';
      else if (last && s.role === 'done') kind = 'done';
      else if (last && s.role === 'review') kind = 'review';
      else if (s.role === 'blocked' && rng.chance(0.5)) kind = 'blocked';
      else if (s.role === 'backlog' || s.role === 'ready') kind = rng.pick(['question', 'fyi', 'decision', 'backlog'] as const);
      else if (s.role === 'cancelled') kind = 'decision';
      else kind = rng.pick(['progress', 'progress', 'question', 'decision', 'fyi', 'risk', 'review'] as const);
      if (isMayaAsk) {
        tpl = rng.pick(MAYA_ASKS);
        author = pickDistinct(rng, subject, [ME_ID]);
      } else if (mayaTask && p.memberIds.includes(ME_ID) && rng.chance(0.08)) {
        tpl = rng.pick(COMMENTS_MAYA);
        author = ME_ID;
      } else {
        tpl = rng.pick(COMMENTS_TOP[kind]);
        author = kind === 'start' || kind === 'progress' || kind === 'done' || kind === 'review' || kind === 'blocked' ? rng.pick(subject) : rng.pick(members);
      }
    }
    // mention slots
    const mentions: string[] = [];
    const pickOther = (not: string[]) => pickDistinct(rng, members, not);
    const aId = pickOther([author]);
    const bId = pickOther([author, aId]);
    const mId = p.hasMaya ? ME_ID : p.managerIds[0] ?? aId;
    let md = tpl;
    if (md.includes('{a}')) {
      md = md.replace(/\{a\}/g, mention(p, aId));
      mentions.push(aId);
    }
    if (md.includes('{b}')) {
      md = md.replace(/\{b\}/g, mention(p, bId));
      mentions.push(bId);
    }
    if (md.includes('{m}')) {
      md = md.replace(/\{m\}/g, mention(p, mId));
      if (!mentions.includes(mId)) mentions.push(mId);
    }
    md = fill(md, rng, p.fillCtx);
    if (md.length > 0) md = md.charAt(0) === '@' ? md : md;
    authors.push(author);
    if (replyTo === null) tops.push(i);
    emit({
      t,
      author,
      md,
      replyTo,
      mentions: mentions.filter((u) => u !== author),
      replyId: (k) => ids[k]!,
      register: (id) => {
        ids.push(id);
      },
    });
  }
}
