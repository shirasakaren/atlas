/**
 * Chat seeder (order 40): channels for the workspace and every project, ~27k
 * realistic messages composed from the hand-authored libraries, pins,
 * reactions, attachments, link previews, read state, sticker packs, avatars.
 */
import { posterDataUri } from '../assets';
import { DAY, HOUR, MIN } from '../clock';
import { ME_ID } from '../config';
import { registerSeeder } from '../db';
import type { Rng } from '../prng';
import { slugify } from '../prng';
import type { ProjectKind, ProjectRec } from '../schema';
import { members as membersTbl, notifications, projects, users } from '../store';
import { tbl } from '../db';
import {
  chatAvatars,
  chatChannels,
  chatMessages,
  chatPacks,
  chatPins,
  chatPrefs,
  chatReads,
  chatStickers,
  prefId,
  readId,
  type AttRec,
  type ChannelRec,
  type MsgRec,
  type PinRec,
} from './chat-schema';
import type { Pools, Scene } from './chat-dsl';
import {
  buildBag,
  castPeople,
  drawScene,
  expandScene,
  localMinute,
  makeReactions,
  toneFor,
  turnGapMs,
  type GenCtx,
  type Member,
  type Person,
  type SceneBag,
  type TaskRef,
} from './chat-gen';
import { GENERIC, globalSpecs, kindLex, resolveRef } from './chat-libs';
import { CAST } from './people';
import { firstUrl, previewFor } from './chat-preview';
import { stickerPacks } from './chat-stickers';
import { BASE_LEX } from './chat-dsl';
import type { Lex } from './chat-dsl';
import type { NotificationRec } from '../schema';

// ─── Tunables ─────────────────────────────────────────────────────────

const TARGET_TOTAL = 27_000;
const CHANNEL_CAP = 600;
const GLOBAL_PER_SIZE = 68;

const PHASE_BASE: Record<string, number> = {
  IDEA: 45,
  PLANNING: 130,
  IN_DEVELOPMENT: 330,
  IN_REVIEW: 280,
  SHIPPED: 150,
  ARCHIVED: 80,
};

const EXTRA_NAMES: Record<ProjectKind, string[]> = {
  software: ['standup', 'releases', 'blockers', 'code-review'],
  mobile: ['standup', 'releases', 'device-lab', 'blockers'],
  data: ['standup', 'data-quality', 'blockers', 'dashboards'],
  security: ['standup', 'findings', 'audit-room', 'blockers'],
  infrastructure: ['standup', 'change-control', 'blockers', 'cost-watch'],
  finance: ['standup', 'close-room', 'blockers', 'controls'],
  people: ['standup', 'change-comms', 'blockers', 'pilot-feedback'],
  marketing: ['launch-room', 'creative-review', 'standup', 'agency'],
  design: ['critiques', 'standup', 'handoff', 'research'],
  operations: ['site-readiness', 'standup', 'blockers', 'training'],
  legal: ['standup', 'reviews', 'blockers', 'regulator-watch'],
  research: ['experiments', 'standup', 'blockers', 'readouts'],
  'supply-chain': ['standup', 'exceptions', 'blockers', 'suppliers'],
  customer: ['escalations', 'standup', 'blockers', 'playbooks'],
  sales: ['deal-desk', 'standup', 'blockers', 'enablement'],
};

const TOPICS: Record<string, string> = {
  general: 'Day-to-day discussion for the project team.',
  standup: 'Daily async updates: yesterday / today / blockers.',
  releases: 'Release notes, rollouts and rollbacks.',
  blockers: 'Anything stuck. Tag an owner and a date.',
  'code-review': 'Review requests and review etiquette.',
  'device-lab': 'Device matrix, OS betas and test-lab issues.',
  'data-quality': 'Freshness, volume and schema alerts.',
  dashboards: 'Dashboards, metric definitions and sign-off.',
  findings: 'Open findings, severities and remediation owners.',
  'audit-room': 'Evidence requests and auditor Q&A.',
  'change-control': 'Change windows, CAB approvals and cutovers.',
  'cost-watch': 'Spend, budgets and optimisation ideas.',
  'close-room': 'Close calendar, cutoffs and reconciliations.',
  controls: 'Control owners, testing and exceptions.',
  'change-comms': 'Messaging, training and manager briefings.',
  'pilot-feedback': 'Feedback from pilot groups.',
  'launch-room': 'Go-live coordination. Keep it tight.',
  'creative-review': 'Creative drafts and approvals.',
  agency: 'Agency coordination and briefs.',
  critiques: 'Design critique. Be kind, be specific.',
  handoff: 'Design-to-dev handoff questions.',
  research: 'Research plans, sessions and findings.',
  'site-readiness': 'Site checklists, training and go-live readiness.',
  training: 'Training schedules and materials.',
  reviews: 'Document and contract reviews in flight.',
  'regulator-watch': 'Regulatory changes and deadlines.',
  experiments: 'Experiment plans, runs and results.',
  readouts: 'Readouts and go/no-go material.',
  exceptions: 'Exceptions, expedites and escalations.',
  suppliers: 'Supplier communications and performance.',
  escalations: 'Customer escalations and their owners.',
  playbooks: 'Playbook updates and enablement.',
  'deal-desk': 'Approvals, discount requests and quote issues.',
  enablement: 'Enablement sessions and collateral.',
  retro: 'Retrospective notes and follow-ups.',
};

type Mix = [string, number][];
const MIX_GENERAL = (kind: ProjectKind): Mix => [
  ['kind:work', 4], ['kind:standup', 1], ['kind:decision', 1], ['kind:chatter', 3], ['kind:planning', 0.6], ['kind:design', 0.4],
  ['generic:review', 1.5], ['generic:status', 1], ['generic:docs', 1], ['generic:thanks', 1], ['generic:social', 1], ['generic:meeting', 1],
  ['generic:question', 1], ['generic:ack', 1.5], ['generic:planning', 0.5], ['generic:retro', 0.3], ['generic:poll', 0.2], ['generic:ooo', 0.4],
  ['generic:risk', 0.4], ['generic:feedback', 0.3], ['generic:access', 0.3], ['generic:decision', 0.5], ['generic:demo', 0.3],
  ['generic:code', ['software', 'mobile', 'data', 'infrastructure', 'security'].includes(kind) ? 1 : 0.15], ['generic:birthday', 0.15],
];
const MIX_STANDUP: Mix = [['kind:standup', 5], ['generic:standup', 4], ['kind:chatter', 1], ['generic:ooo', 1], ['generic:ack', 1]];
const MIX_BLOCKERS: Mix = [['kind:blocker', 5], ['generic:blocker', 4], ['generic:risk', 2], ['kind:decision', 1], ['generic:decision', 1], ['generic:access', 1], ['generic:ack', 0.5]];
const MIX_LAUNCH: Mix = [['kind:launch', 5], ['generic:release', 4], ['kind:release', 2], ['generic:incident', 1.5], ['kind:incident', 1], ['generic:decision', 1], ['generic:thanks', 1], ['kind:chatter', 1]];
const MIX_DESIGN: Mix = [['kind:design', 4], ['kind:work', 2], ['generic:feedback', 1.5], ['generic:docs', 1], ['generic:review', 2], ['generic:ack', 1]];
const MIX_DEFAULT: Mix = [['kind:work', 4], ['generic:question', 2], ['generic:docs', 1], ['kind:chatter', 2], ['generic:ack', 1], ['generic:status', 1], ['generic:decision', 1]];

export function mixFor(name: string, kind: ProjectKind): Mix {
  switch (name) {
    case 'general':
      return MIX_GENERAL(kind);
    case 'standup':
      return MIX_STANDUP;
    case 'blockers':
    case 'exceptions':
    case 'escalations':
    case 'findings':
      return MIX_BLOCKERS;
    case 'releases':
    case 'launch-room':
    case 'site-readiness':
    case 'change-control':
    case 'close-room':
      return MIX_LAUNCH;
    case 'critiques':
    case 'creative-review':
    case 'handoff':
    case 'code-review':
    case 'reviews':
      return MIX_DESIGN;
    default:
      return MIX_DEFAULT;
  }
}

const EXTRA_RATIO: Record<string, number> = {
  standup: 0.55, blockers: 0.3, releases: 0.4, 'launch-room': 0.45, 'code-review': 0.3, 'device-lab': 0.3, 'data-quality': 0.35,
  dashboards: 0.3, findings: 0.4, 'audit-room': 0.35, 'change-control': 0.35, 'cost-watch': 0.2, 'close-room': 0.4,
};

const AVATARS: Record<string, [string, string]> = {
  PORT: ['🚀', '#5865F2'], MOB5: ['📱', '#EB459E'], EDW: ['🗄️', '#0F8A9D'], SOC2: ['🛡️', '#2D7D46'], BILL: ['💳', '#B65C1D'],
  KPI: ['📊', '#7B3FE4'], DSYS: ['🎨', '#A6328D'], GATE: ['🚪', '#4A5FC1'], ZTNA: ['🔐', '#1E7F5C'], ERP: ['🏭', '#B65C1D'],
  GENA: ['🧠', '#7B3FE4'], MRF: ['📣', '#ED4245'],
};

// ─── Helpers ──────────────────────────────────────────────────────────

const tzCache = new Map<string, number>();
function tzOffset(tz: string, at: number): number {
  const hit = tzCache.get(tz);
  if (hit !== undefined) return hit;
  let off = 0;
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
    const v = f.formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
    const m = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(v);
    if (m) off = (m[1] === '-' ? -1 : 1) * (parseInt(m[2]!, 10) * 60 + parseInt(m[3] ?? '0', 10));
  } catch {
    off = 0;
  }
  tzCache.set(tz, off);
  return off;
}

function weigh(rng: Rng, people: Person[], boost?: Map<string, number>): Member[] {
  const order = rng.shuffle(people);
  return order.map((p, i) => ({ p, w: (1 / Math.pow(i + 1, 0.8) + 0.02) * (boost?.get(p.id) ?? 1) }));
}

const iso = (ms: number) => new Date(ms).toISOString();

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  md: 'text/markdown',
  txt: 'text/plain',
  json: 'application/json',
  log: 'text/plain',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  sql: 'text/plain',
};

let attSeq = 1;
function imageAtt(rng: Rng, channelId: string, label: string, ts: number): AttRec {
  const id = `catt_${String(attSeq++).padStart(6, '0')}`;
  return {
    id,
    kind: 'IMAGE',
    url: posterDataUri(label.slice(0, 34), `${channelId}|${label}|${rng.int(0, 9999)}`),
    s3Key: `chat/${channelId}/${ts}-${slugify(label) || 'image'}.png`,
    mime: 'image/png',
    bytes: rng.int(42_000, 410_000),
    width: 640,
    height: 360,
    durationSec: null,
    posterUrl: null,
  };
}

function fileAtt(rng: Rng, channelId: string, name: string, ts: number): AttRec {
  const ext = (name.split('.').pop() ?? 'txt').toLowerCase();
  const id = `catt_${String(attSeq++).padStart(6, '0')}`;
  return {
    id,
    kind: 'FILE',
    url: `data:text/plain;charset=utf-8,${encodeURIComponent(`Demo placeholder for ${name}. Files shared in the Atlas demo are not stored.`)}`,
    s3Key: `chat/${channelId}/${ts}-${name.replace(/[^\w.\-]+/g, '-')}`,
    mime: MIME[ext] ?? 'application/octet-stream',
    bytes: rng.int(12_000, 2_400_000),
    width: null,
    height: null,
    durationSec: null,
    posterUrl: null,
  };
}

interface Draft {
  ts: number;
  rec: MsgRec;
  replyTo?: Draft;
  pin?: string | true;
}

interface Plan {
  ch: ChannelRec;
  kind: ProjectKind | null;
  target: number;
  startAgo: number;
  endAgo: number;
  members: Member[];
  mayaIn: boolean;
  mix: Mix;
  own: Pools;
  lex: Lex;
  leaders: Person[];
  castWeight: number;
  tasks: TaskRef[];
  project: ProjectRec | null;
  managerId: string;
  intro?: Scene[];
  /** Probability that a scene's speaker A is the persona when she is a participant (ask-pmo). */
  mayaLead?: number;
}

// ─── Seeder ───────────────────────────────────────────────────────────

registerSeeder({
  name: 'chat',
  order: 40,
  run(ctx) {
    const t0 = Date.now();
    seedChat(ctx);
    if (typeof process !== 'undefined' && process.env?.CHAT_SEED_TIMING) console.log(`[chat seed] ${Date.now() - t0}ms`);
  },
});

function seedChat({ rng, now }: { rng: Rng; now: number }) {
    // People
    const allUsers = users().all();
    const person = new Map<string, Person>();
    for (const u of allUsers) {
      person.set(u.id, {
        id: u.id,
        name: u.name,
        first: u.name.split(' ')[0]!,
        off: tzOffset(u.timezone, now),
        dept: u.department,
      });
    }
    const maya = person.get(ME_ID) ?? null;
    if (!maya) return;
    const byDept = new Map<string, Person[]>();
    for (const p of person.values()) {
      if (p.id === ME_ID) continue;
      const l = byDept.get(p.dept) ?? [];
      l.push(p);
      byDept.set(p.dept, l);
    }

    // Projects, members, tasks
    const projs = projects().all();
    const memberIds = new Map<string, string[]>();
    const memberRole = new Map<string, Map<string, string>>();
    for (const m of membersTbl().all()) {
      let l = memberIds.get(m.projectId);
      if (!l) memberIds.set(m.projectId, (l = []));
      l.push(m.userId);
      let r = memberRole.get(m.projectId);
      if (!r) memberRole.set(m.projectId, (r = new Map()));
      r.set(m.userId, m.role);
    }
    const taskMap = new Map<string, TaskRef[]>();
    for (const t of tbl<{ id: string; key: string; title: string; projectId: string; deletedAt?: string | null }>('pmoTasks').all()) {
      if (t.deletedAt) continue;
      let l = taskMap.get(t.projectId);
      if (!l) taskMap.set(t.projectId, (l = []));
      if (l.length < 90) l.push({ key: t.key, title: t.title });
    }
    const projectRefs = projs.map((p) => ({ title: p.title, key: p.key, slug: p.slug }));
    const adminId = CAST.daniel.id;

    // ── Plans ────────────────────────────────────────────────────────
    const plans: Plan[] = [];
    let chSeq = 1;
    const newChannel = (o: Partial<ChannelRec> & { name: string; projectId: string | null; createdAt: string; createdById: string }): ChannelRec => ({
      id: `chn_${String(chSeq++).padStart(4, '0')}`,
      slug: o.slug ?? slugify(o.name),
      topic: o.topic ?? null,
      isGeneral: o.isGeneral ?? false,
      isArchived: o.isArchived ?? false,
      isVoiceThread: false,
      updatedAt: o.updatedAt ?? o.createdAt,
      archivedAt: o.archivedAt ?? null,
      ...o,
    });

    // Global channels
    for (const spec of globalSpecs()) {
      const isGeneral = spec.name === 'general';
      const created = now - (isGeneral ? 1400 : rng.int(160, 520)) * DAY;
      const ch = newChannel({
        name: spec.name,
        projectId: null,
        topic: spec.topic,
        isGeneral,
        createdAt: iso(created),
        createdById: adminId,
      });
      let pool: Person[] = [];
      if (spec.depts && spec.depts.length) for (const d of spec.depts) pool.push(...(byDept.get(d) ?? []));
      else pool = rng.sample([...person.values()].filter((p) => p.id !== ME_ID), 90);
      pool = rng.sample(pool, Math.min(pool.length, 70));
      const leaders = (spec.cast ?? []).map((k) => person.get((CAST as Record<string, { id: string }>)[k]?.id ?? '')).filter((p): p is Person => !!p);
      for (const l of leaders) if (!pool.includes(l)) pool.push(l);
      const boost = new Map<string, number>(leaders.map((l) => [l.id, 2.2]));
      plans.push({
        ch,
        kind: null,
        target: Math.min(CHANNEL_CAP, Math.round(spec.size * GLOBAL_PER_SIZE * rng.range(0.85, 1.15))),
        startAgo: spec.name === 'announcements' ? 118 : 118,
        endAgo: 0,
        members: weigh(rng, pool, boost),
        mayaIn: true,
        mix: spec.mix,
        own: spec.pools,
        lex: { ...BASE_LEX, ...(spec.lex ?? {}) },
        leaders,
        castWeight: spec.castWeight ?? (leaders.length ? 0.15 : 0),
        tasks: [],
        project: null,
        managerId: adminId,
        intro: spec.intro,
        mayaLead: spec.name === 'ask-pmo' ? 0.0 : undefined,
      });
    }

    // Project channels
    const rawProject: { plan: Plan; raw: number; extra: boolean }[] = [];
    for (const p of projs) {
      const mids = memberIds.get(p.id) ?? [];
      const mayaIn = mids.includes(ME_ID);
      const people = mids.filter((id) => id !== ME_ID).map((id) => person.get(id)).filter((x): x is Person => !!x);
      if (people.length < 2) continue;
      const boost = new Map<string, number>([[p.ownerId, 2]]);
      const mem = weigh(rng, people, boost);
      const ageDays = Math.max(3, Math.round((now - new Date(p.createdAt).getTime()) / DAY));
      let startAgo = Math.min(118, ageDays);
      let endAgo = 0;
      if (p.phase === 'ARCHIVED') {
        startAgo = rng.int(100, 118);
        endAgo = rng.int(30, 85);
      } else if (p.phase === 'SHIPPED') {
        startAgo = Math.min(118, ageDays);
        endAgo = rng.int(1, 18);
      }
      startAgo = Math.max(startAgo, endAgo + 6);
      const kind = p.kind;
      const mgrs = [...(memberRole.get(p.id)?.entries() ?? [])].filter(([, r]) => r === 'PROJECT_MANAGER').map(([id]) => id);
      const managerId = mgrs.find((id) => id !== ME_ID) ?? p.ownerId;
      const base = (PHASE_BASE[p.phase] ?? 150) * (0.55 + 0.06 * people.length) * Math.exp(rng.range(-0.55, 0.55)) * (mayaIn ? 1.25 : 1);
      const lex: Lex = { ...BASE_LEX, ...kindLex(kind) };
      const tasks = taskMap.get(p.id) ?? [];

      const mk = (name: string, ratio: number, s: number, e: number, archived: boolean) => {
        const created = now - s * DAY - rng.int(0, 5) * HOUR;
        const ch = newChannel({
          name,
          projectId: p.id,
          topic: TOPICS[name] ?? `Working channel for ${name}.`,
          isGeneral: name === 'general',
          isArchived: archived,
          archivedAt: archived ? iso(now - Math.max(0, e) * DAY - rng.int(1, 20) * HOUR) : null,
          createdAt: iso(created),
          createdById: p.ownerId,
        });
        const plan: Plan = {
          ch,
          kind,
          target: 0,
          startAgo: s,
          endAgo: e,
          members: mem,
          mayaIn,
          mix: mixFor(name, kind),
          own: {},
          lex,
          leaders: [],
          castWeight: 0,
          tasks,
          project: p,
          managerId,
        };
        plans.push(plan);
        rawProject.push({ plan, raw: base * ratio, extra: name !== 'general' });
      };

      mk('general', 1, startAgo, endAgo, false);
      const names = EXTRA_NAMES[kind];
      let nExtra = p.phase === 'IDEA' ? 0 : p.phase === 'PLANNING' ? 1 : p.phase === 'ARCHIVED' ? 1 : p.phase === 'SHIPPED' ? rng.int(1, 2) : rng.int(2, 3);
      const pick = names.slice(0, Math.max(nExtra, 0));
      if ((p.phase === 'IN_REVIEW' || p.phase === 'SHIPPED') && !pick.some((n) => ['releases', 'launch-room', 'site-readiness', 'change-control', 'close-room'].includes(n))) {
        const l = names.find((n) => ['releases', 'launch-room', 'site-readiness', 'change-control', 'close-room'].includes(n));
        if (l) pick.push(l);
      }
      nExtra = pick.length;
      for (const n of pick) {
        const s = Math.max(endAgo + 4, startAgo - rng.int(0, Math.min(25, Math.max(1, startAgo - endAgo - 4))));
        const archived = p.phase === 'ARCHIVED' || (p.phase === 'SHIPPED' && ['launch-room', 'site-readiness', 'close-room'].includes(n) && rng.chance(0.6));
        mk(n, EXTRA_RATIO[n] ?? 0.35, s, archived ? Math.max(endAgo, 3) : endAgo, archived);
      }
    }
    // Scale project channels to the message budget.
    const globalTotal = plans.filter((x) => !x.project).reduce((s, x) => s + x.target, 0);
    const budget = Math.max(1000, TARGET_TOTAL - globalTotal);
    let rawSum = rawProject.reduce((s, r) => s + r.raw, 0);
    let scale = budget / rawSum;
    for (let pass = 0; pass < 3; pass++) {
      let sum = 0;
      for (const r of rawProject) sum += Math.min(CHANNEL_CAP, Math.max(14, r.raw * scale));
      scale *= budget / sum;
    }
    rawSum = 0;
    for (const r of rawProject) {
      r.plan.target = Math.round(Math.min(CHANNEL_CAP, Math.max(14, r.raw * scale)));
    }

    // ── Generate messages ───────────────────────────────────────────
    const finalByChannel = new Map<string, MsgRec[]>();
    const pinsOut: PinRec[] = [];
    const allRecs: MsgRec[] = [];
    let msgSeq = 1;
    let pinSeq = 1;

    // Stickers first (messages may carry some)
    const packs = stickerPacks();
    const nowIso = iso(now);
    const stickerList: { id: string; name: string; url: string }[] = [];
    packs.forEach((pk, pi) => {
      const packId = `stkp_${String(pi + 1).padStart(3, '0')}`;
      chatPacks().insert({
        id: packId,
        name: pk.name,
        slug: `${slugify(pk.name)}-${pi + 1}x`,
        description: pk.description,
        isArchived: false,
        createdById: adminId,
        createdAt: iso(now - (240 - pi * 30) * DAY),
        updatedAt: nowIso,
      });
      pk.stickers.forEach((s, si) => {
        const id = `stk_${String(pi + 1).padStart(2, '0')}${String(si + 1).padStart(2, '0')}`;
        chatStickers().insert({
          id,
          packId,
          name: s.name,
          keywords: s.keywords,
          s3Key: `stickers/${packId}/${slugify(s.name)}.svg`,
          url: s.url,
          mime: 'image/svg+xml',
          width: 160,
          height: 160,
          position: si,
          createdAt: iso(now - (238 - pi * 30) * DAY),
        });
        stickerList.push({ id, name: s.name, url: s.url });
      });
    });
    const cheerStickers = stickerList.filter((s) => ['Party', 'Nice!', 'Thanks', 'Shipped', 'Cake', 'Rocket', 'Trophy', 'LGTM', 'Happy', 'Laughing', 'Cool', 'Plus one', 'Coffee', 'Heart'].includes(s.name));

    for (const plan of plans) {
      const drafts = generateChannel(plan, rng, now, person, maya, cheerStickers);
      // Sort + strict monotonic timestamps
      drafts.sort((a, b) => a.ts - b.ts);
      for (let i = 1; i < drafts.length; i++) if (drafts[i]!.ts <= drafts[i - 1]!.ts) drafts[i]!.ts = drafts[i - 1]!.ts + rng.int(1, 9);
      const recs: MsgRec[] = [];
      for (const d of drafts) {
        d.rec.id = `msg_${String(msgSeq++).padStart(6, '0')}`;
        d.rec.createdAt = iso(d.ts);
        if (d.rec.editedAt) d.rec.editedAt = iso(d.ts + rng.int(1, 25) * MIN);
        if (d.rec.deletedAt) d.rec.deletedAt = iso(d.ts + rng.int(1, 600) * MIN);
        recs.push(d.rec);
      }
      for (const d of drafts) if (d.replyTo) d.rec.replyToId = d.replyTo.rec.id;
      // Pins (max 4 per channel)
      let position = 0;
      for (const d of drafts) {
        if (!d.pin || d.rec.deletedAt || position >= 4) continue;
        pinsOut.push({
          id: `pin_${String(pinSeq++).padStart(5, '0')}`,
          channelId: plan.ch.id,
          messageId: d.rec.id,
          pinnedById: plan.managerId,
          position: position++,
          note: d.pin === true ? null : d.pin,
          pinnedAt: iso(Math.min(now - 1000, d.ts + rng.int(2, 120) * MIN)),
        });
      }
      finalByChannel.set(plan.ch.id, recs);
      for (const r of recs) allRecs.push(r);
    }

    // ── Forwarded messages ──────────────────────────────────────────
    const candidates: { rec: MsgRec; ch: ChannelRec }[] = [];
    const planById = new Map(plans.map((p) => [p.ch.id, p]));
    for (const plan of plans) {
      const recs = finalByChannel.get(plan.ch.id)!;
      if (recs.length < 80) continue;
      for (let i = 0; i < recs.length; i += 1 + Math.floor(rng.next() * 40)) {
        const r = recs[i]!;
        if (r.kind === 'TEXT' && !r.deletedAt && r.markdown.length > 70 && r.markdown.length < 380 && !r.markdown.includes('@[') && !r.replyToId) candidates.push({ rec: r, ch: plan.ch });
      }
    }
    const targets = plans.filter((p) => !p.ch.isArchived);
    let fwd = 0;
    for (const c of rng.sample(candidates, Math.min(candidates.length, 140))) {
      const srcPlan = planById.get(c.ch.id)!;
      // Prefer a sibling channel (same project / same kind) or a global channel.
      const options = targets.filter((t) => t.ch.id !== c.ch.id && (t.ch.projectId === c.ch.projectId || !t.project || t.kind === srcPlan.kind));
      const tgt = options.length ? rng.pick(options) : null;
      if (!tgt) continue;
      const author = pickAuthor(tgt, rng);
      if (!author) continue;
      const srcTs = new Date(c.rec.createdAt).getTime();
      const ts = Math.min(now - 5 * MIN, srcTs + rng.int(20, 60 * 72) * MIN);
      const recs = finalByChannel.get(tgt.ch.id)!;
      if (ts < new Date(recs[0]?.createdAt ?? now).getTime()) continue;
      const rec: MsgRec = {
        id: `msg_f${String(++fwd).padStart(4, '0')}`,
        channelId: tgt.ch.id,
        authorId: author.id,
        kind: 'TEXT',
        createdAt: iso(ts),
        markdown: c.rec.markdown,
        forwardedFromId: c.rec.id,
      };
      if (c.rec.attachments) rec.attachments = c.rec.attachments;
      recs.push(rec);
      allRecs.push(rec);
    }
    for (const [id, recs] of finalByChannel) {
      let sorted = true;
      for (let i = 1; i < recs.length; i++) if (recs[i]!.createdAt < recs[i - 1]!.createdAt) { sorted = false; break; }
      if (!sorted) recs.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1));
      void id;
    }

    // ── Persist ────────────────────────────────────────────────────
    chatChannels().insertMany(plans.map((p) => p.ch));
    chatMessages().insertMany(allRecs);
    chatPins().insertMany(pinsOut);

    // Update channel updatedAt to last topic/archival time only (messages don't bump it).

    // ── Read state (persona) ────────────────────────────────────────
    const readsOut = [];
    const mutedCandidates: string[] = [];
    const GLOBAL_UNREAD: Record<string, number> = {
      announcements: 2, general: 4, engineering: 6, 'it-help': 0, 'ask-pmo': 3, wins: 1, random: 5, 'product-launches': 2,
      'finance-close': 4, 'data-and-analytics': 11, 'oncall-handoff': 1, 'people-team': 0, 'security-corner': 2, 'design-crit': 0,
      'customer-stories': 1, watercooler: 9,
    };
    for (const plan of plans) {
      const recs = finalByChannel.get(plan.ch.id)!;
      if (!recs.length) continue;
      let unread = 0;
      if (!plan.ch.isArchived) {
        if (!plan.project) unread = GLOBAL_UNREAD[plan.ch.name] ?? 0;
        else {
          const roll = rng.next();
          const p = plan.mayaIn ? 0.27 : 0.03;
          if (roll < p) unread = rng.weighted([[rng.int(1, 4), 60], [rng.int(5, 9), 28], [rng.int(10, 24), 12]] as const);
          if (plan.mayaIn && plan.project.phase !== 'ARCHIVED' && plan.project.phase !== 'SHIPPED' && plan.ch.isGeneral && roll > 0.9) unread += 2;
        }
      }
      // Walk back counting messages not authored by the persona.
      let idx = recs.length;
      let counted = 0;
      while (idx > 0 && counted < unread) {
        idx--;
        const r = recs[idx]!;
        if (r.authorId !== ME_ID && !r.deletedAt) counted++;
      }
      let lastReadAt: string;
      let lastReadMessageId: string | null;
      if (counted > 0 && idx > 0) {
        const prev = recs[idx - 1]!;
        lastReadAt = iso(new Date(prev.createdAt).getTime() + 500);
        lastReadMessageId = prev.id;
      } else if (counted > 0) {
        lastReadAt = iso(new Date(recs[0]!.createdAt).getTime() - 1000);
        lastReadMessageId = null;
      } else {
        const last = recs[recs.length - 1]!;
        lastReadAt = iso(Math.min(now, new Date(last.createdAt).getTime() + rng.int(1, 40) * MIN));
        lastReadMessageId = last.id;
      }
      readsOut.push({ id: readId(plan.ch.id, ME_ID), channelId: plan.ch.id, userId: ME_ID, lastReadAt, lastReadMessageId });
      if (plan.project && plan.mayaIn && plan.ch.isGeneral && plan.project.phase !== 'ARCHIVED') mutedCandidates.push(plan.project.id);
    }
    chatReads().insertMany(readsOut);

    // Mutes: a few noisy projects the persona only contributes to.
    const contribOnly = mutedCandidates.filter((pid) => memberRole.get(pid)?.get(ME_ID) === 'CONTRIBUTOR');
    for (const pid of rng.sample(contribOnly, Math.min(3, contribOnly.length))) {
      chatPrefs().insert({ id: prefId(ME_ID, `project:${pid}`), userId: ME_ID, scope: `project:${pid}`, muted: true });
    }

    // Server avatars
    for (const p of projs) {
      const a = AVATARS[p.key];
      if (a) chatAvatars().insert({ id: `project:${p.id}`, emoji: a[0], color: a[1], imageUrl: null });
    }

    // Mention notifications for the persona (recent, from the seeded history)
    const mentionTag = `@[${maya.name}](${ME_ID})`;
    const mentions: { rec: MsgRec; plan: Plan }[] = [];
    const mutedProjects = new Set(chatPrefs().all().filter((x) => x.muted).map((x) => x.scope));
    for (const plan of plans) {
      if (plan.ch.isArchived) continue;
      if (plan.project && mutedProjects.has(`project:${plan.project.id}`)) continue;
      const recs = finalByChannel.get(plan.ch.id)!;
      for (let i = recs.length - 1; i >= 0 && i > recs.length - 60; i--) {
        const r = recs[i]!;
        if (r.authorId !== ME_ID && !r.deletedAt && r.markdown.includes(mentionTag) && now - new Date(r.createdAt).getTime() < 9 * DAY) mentions.push({ rec: r, plan });
      }
    }
    mentions.sort((a, b) => (a.rec.createdAt < b.rec.createdAt ? 1 : -1));
    const notes: NotificationRec[] = mentions.slice(0, 14).map((m, i) => {
      const author = person.get(m.rec.authorId);
      return {
        id: `ntf_chat_${String(i + 1).padStart(4, '0')}`,
        userId: ME_ID,
        type: 'CHAT_MENTION',
        title: `@${author?.name ?? 'Someone'} mentioned you in #${m.plan.ch.name}`,
        body: m.rec.markdown.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1').replace(/\s+/g, ' ').trim().slice(0, 200),
        link: m.plan.project ? `/projects/${m.plan.project.slug}/chat/${m.plan.ch.id}?msg=${m.rec.id}` : `/chat/global/${m.plan.ch.id}?msg=${m.rec.id}`,
        metadata: { messageId: m.rec.id, channelId: m.plan.ch.id, projectId: m.plan.project?.id ?? null },
        readAt: i < 5 ? null : iso(new Date(m.rec.createdAt).getTime() + rng.int(5, 600) * MIN),
        createdAt: m.rec.createdAt,
      };
    });
    notifications().insertMany(notes);
}

// ─── Channel generation ───────────────────────────────────────────────

function pickAuthor(plan: Plan, rng: Rng): Person | null {
  const m = plan.members;
  if (!m.length) return null;
  return m[Math.floor(rng.next() * Math.min(m.length, 12))]!.p;
}

function generateChannel(
  plan: Plan,
  rng: Rng,
  now: number,
  person: Map<string, Person>,
  maya: Person,
  stickers: { id: string; name: string; url: string }[],
): Draft[] {
  const { ch } = plan;
  const ctx: GenCtx = {
    rng,
    channel: ch.name,
    projTitle: plan.project?.title ?? null,
    projKey: plan.project?.key ?? null,
    projSlug: plan.project?.slug ?? null,
    tasks: plan.tasks,
    members: plan.members,
    maya: plan.mayaIn ? maya : null,
    projects: [],
    lex: plan.lex,
    nowMs: now,
  };
  if (!plan.project) {
    // Random project references for {proj}/{key}/{task}.
    ctx.projects = [...(projectPool ??= buildProjectPool(rng))];
  }
  const bag: SceneBag = buildBag(
    plan.mix,
    (ref) => resolveRef(ref, plan.kind, plan.own),
    { mayaIn: plan.mayaIn },
  );
  const out: Draft[] = [];
  const startMs = now - plan.startAgo * DAY;
  const created = new Date(ch.createdAt).getTime();
  const windowStart = Math.max(created, startMs);

  const mkRec = (authorId: string, markdown: string, kind: MsgRec['kind'] = 'TEXT'): MsgRec => ({
    id: '',
    channelId: ch.id,
    authorId,
    kind,
    createdAt: '',
    markdown,
  });

  // System: channel created (+ optional intro scene, pinned)
  const creator = ch.createdById;
  out.push({ ts: windowStart, rec: mkRec(creator, `created #${ch.name}`, 'SYSTEM_CHANNEL_CREATED') });
  if (plan.target >= 20) {
    const introScenes = plan.intro && plan.intro.length ? plan.intro : GENERIC.intro;
    if (introScenes && introScenes.length) {
      const sc = introScenes[Math.floor(rng.next() * introScenes.length)]!;
      const parsed = bagParse(sc);
      if (!parsed.needsMaya || plan.mayaIn) {
        const lead = plan.project ? person.get(plan.managerId) ?? null : plan.leaders[0] ?? null;
        const cast = castPeople(ctx, parsed.speakers, lead);
        const turns = expandScene(ctx, parsed, cast);
        let t = windowStart + rng.int(4, 40) * MIN;
        turns.forEach((tt, j) => {
          const rec = mkRec(tt.who.id, tt.text);
          const d: Draft = { ts: t, rec };
          if (j === 0) d.pin = typeof tt.turn.pin === 'string' ? tt.turn.pin : 'Channel guidelines';
          if (tt.turn.reply && out.length) d.replyTo = out[out.length - tt.turn.reply];
          if (tt.turn.rx) rec.reactions = makeReactions(rng, Array.isArray(tt.turn.rx) ? tt.turn.rx : toneFor('thanks'), ctx.members, ctx.maya, tt.who.id);
          out.push(d);
          t += rng.int(30, 900) * 1000;
        });
      }
    }
  }

  // Day weights
  const days: number[] = [];
  const cum: number[] = [];
  let total = 0;
  const span = Math.max(1, plan.startAgo - plan.endAgo);
  const burst = new Set<number>();
  for (let i = 0; i < Math.max(2, Math.round(span / 18)); i++) burst.add(plan.endAgo + rng.int(0, span));
  for (let d = plan.endAgo; d <= plan.startAgo; d++) {
    const dow = new Date(now - d * DAY).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const t = (d - plan.endAgo) / span;
    let w = (weekend ? 0.12 : 1) * (1.25 - 0.8 * t);
    if (burst.has(d)) w *= 3;
    days.push(d);
    cum.push((total += w));
  }
  const sampleDay = () => {
    const r = rng.next() * total;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid]! < r) lo = mid + 1;
      else hi = mid;
    }
    return days[lo]!;
  };

  const lastTs = now - 20_000;
  let guard = 0;
  while (out.length < plan.target && guard++ < plan.target * 3) {
    const entry = drawScene(bag, rng);
    if (!entry) break;
    const parsed = entry.scene;
    let lead: Person | null = null;
    if (plan.leaders.length && rng.chance(plan.castWeight)) lead = plan.leaders[Math.floor(rng.next() * plan.leaders.length)]!;
    const cast = castPeople(ctx, parsed.speakers, lead);
    const turns = expandScene(ctx, parsed, cast);
    const day = sampleDay();
    const initiator = turns[0]!.who;
    const base = Date.UTC(new Date(now - day * DAY).getUTCFullYear(), new Date(now - day * DAY).getUTCMonth(), new Date(now - day * DAY).getUTCDate());
    let ts = base + (localMinute(rng) - initiator.off) * MIN;
    if (ts > lastTs) ts = lastTs - rng.int(3, 500) * MIN;
    if (ts < windowStart + 2 * HOUR) ts = windowStart + 2 * HOUR + rng.int(0, 240) * MIN;
    const sceneDrafts: Draft[] = [];
    const tone = toneFor(entry.pool);
    for (let j = 0; j < turns.length; j++) {
      const tt = turns[j]!;
      if (j > 0) ts += tt.turn.gap ? tt.turn.gap * 1000 : turnGapMs(rng);
      const tsC = Math.min(ts, lastTs - rng.int(0, 5000));
      const rec = mkRec(tt.who.id, tt.text);
      const d: Draft = { ts: tsC, rec };
      const tn = tt.turn;
      if (tn.reply && sceneDrafts[j - tn.reply]) d.replyTo = sceneDrafts[j - tn.reply];
      if (tn.pin) d.pin = tn.pin;
      if (tn.img) rec.attachments = [imageAtt(rng, ch.id, tn.img, tsC)];
      if (tn.file) (rec.attachments ??= []).push(fileAtt(rng, ch.id, tn.file, tsC));
      if (tn.rx) rec.reactions = makeReactions(rng, Array.isArray(tn.rx) ? tn.rx : tone, ctx.members, ctx.maya, tt.who.id);
      else if (!tn.del && rng.chance(entry.pool.includes('social') || entry.pool.includes('thanks') ? 0.16 : 0.055)) {
        rec.reactions = makeReactions(rng, tone, ctx.members, ctx.maya, tt.who.id, 2);
      }
      if (tn.edit || (!tn.del && rng.chance(0.02))) rec.editedAt = 'x';
      if (tn.del || (!tn.edit && rng.chance(0.006))) {
        rec.deletedAt = 'x';
        rec.deletedActor = rng.chance(0.8) ? 'SELF' : 'MODERATOR';
        if (rec.deletedActor === 'MODERATOR') rec.deletedById = plan.managerId;
        else rec.deletedById = tt.who.id;
        rec.markdown = '';
        delete rec.reactions;
        delete rec.attachments;
      } else {
        const url = firstUrl(tt.text);
        if (url && rng.chance(0.72)) {
          const pv = previewFor(url);
          if (pv) rec.metadata = { linkPreviews: [{ url: pv.url, kind: 'link', title: pv.title, description: pv.description, imageUrl: pv.imageUrl, siteName: pv.siteName }] };
        }
      }
      sceneDrafts.push(d);
      out.push(d);
    }
    // Occasional sticker reply on celebratory scenes
    if ((entry.pool.includes('thanks') || entry.pool.includes('birthday') || entry.pool.includes('launch') || entry.pool.includes('release')) && rng.chance(0.07) && stickers.length) {
      const st = rng.pick(stickers);
      const who = pickAuthor(plan, rng);
      const last = sceneDrafts[sceneDrafts.length - 1]!;
      if (who) {
        const rec = mkRec(who.id, '');
        rec.attachments = [
          { id: `catt_${String(attSeq++).padStart(6, '0')}`, kind: 'IMAGE', url: st.url, s3Key: `__sticker:${st.id}`, mime: 'image/svg+xml', bytes: 0, width: 160, height: 160, durationSec: null, posterUrl: null },
        ];
        out.push({ ts: Math.min(last.ts + rng.int(20, 300) * 1000, lastTs), rec });
      }
    }
  }
  return out;
}

import { parseScene } from './chat-dsl';
const bagParse = parseScene;

let projectPool: { title: string; key: string; slug: string }[] | null = null;
function buildProjectPool(rng: Rng) {
  const all = projects().all();
  return rng.sample(all, Math.min(40, all.length)).map((p) => ({ title: p.title, key: p.key, slug: p.slug }));
}
