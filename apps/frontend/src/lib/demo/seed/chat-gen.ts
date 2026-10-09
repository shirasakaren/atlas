/**
 * Scene engine: casts people into a scene, expands tokens, and lays the turns
 * out in time. Shared by the seeder (bulk history) and the live simulation.
 * Pure functions over an explicit `GenCtx` (no tables, no browser globals).
 */
import type { Rng } from '../prng';
import { BASE_LEX, DYNAMIC_TOKENS, parseScene, type Lex, type ParsedScene, type ParsedTurn, type Scene } from './chat-dsl';

export interface Person {
  id: string;
  name: string;
  first: string;
  /** UTC offset in minutes (local = utc + off). */
  off: number;
  dept: string;
}

export interface Member {
  p: Person;
  w: number;
}

export interface TaskRef {
  key: string;
  title: string;
}

export interface GenCtx {
  rng: Rng;
  channel: string;
  projTitle: string | null;
  projKey: string | null;
  projSlug: string | null;
  tasks: TaskRef[];
  /** Channel participants other than the persona, weighted. */
  members: Member[];
  /** The persona when she takes part in the channel. */
  maya: Person | null;
  /** Random project refs for global channels' {proj}/{task}. */
  projects: { title: string; key: string; slug: string }[];
  lex: Lex;
  nowMs: number;
}

export interface OutTurn {
  who: Person;
  turn: ParsedTurn;
  text: string;
}

// ─── Small data ───────────────────────────────────────────────────────

const CUSTOMERS = [
  'Brightwater Logistics', 'Kestrel Retail Group', 'Fernhill Foods', 'Tailwind Air', 'Alderbank Insurance', 'Marlowe Health',
  'Ironvale Energy', 'Copperline Telecom', 'Larkspur Hotels', 'Oakridge Pharma', 'Stonebridge Capital', 'Pinecrest Education',
  'Harborline Shipping', 'Summit Outdoor Co.', 'Vantage Aerospace', 'Meridian Grocers', 'Quillon Publishing', 'Bluepeak Software',
  'Redwood Utilities', 'Cobalt Motors', 'Sable & Finch', 'Granite Peak Mining', 'Juniper Care Group', 'Lumen Cinemas',
];
const REGIONS = ['eu-west-1', 'us-east-1', 'us-west-2', 'ap-southeast-1', 'eu-central-1', 'ca-central-1', 'ap-south-1', 'sa-east-1'];
const CITIES = ['Toronto', 'London', 'Berlin', 'Singapore', 'Austin', 'Dublin', 'Lisbon', 'Sydney', 'Bengaluru', 'Amsterdam', 'Warsaw', 'Tokyo', 'New York', 'Nairobi'];
const DEPTS = [
  'Engineering', 'Data & Analytics', 'Security', 'Product', 'Design', 'Marketing', 'Finance', 'People Operations',
  'Legal & Compliance', 'Supply Chain', 'Customer Success', 'Sales Operations', 'IT & Infrastructure', 'Transformation Office',
];
const EMOJI = ['🎉', '🚀', '🙌', '✨', '💪', '👏', '🔥', '✅', '🙏', '💯'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TIMES = ['9am', '9:30am', '10am', '10:30am', '11am', '1pm', '2pm', '2:30pm', '3pm', '3:30pm', '4pm', '4:30pm', '5pm'];
const USD = ['$12k', '$48k', '$1.2M', '$310k', '$86k', '$2.4M', '$640k', '$19k', '$7.5k', '$150k', '$3.1M', '$225k'];
const HOURS = ['an hour', '2 hours', '3 hours', 'a couple of hours', '90 minutes', 'half a day', '4 hours', '45 minutes'];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const fmtDate = (ms: number) => {
  const d = new Date(ms);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

// ─── Token expansion ──────────────────────────────────────────────────

const TOKEN_RE = /\{(@?[A-Za-z][A-Za-z0-9_]*)\}/g;
const ALT_RE = /\{(?!\s)([^{}\n]*\|[^{}\n]*)\}/g;

interface Env {
  ctx: GenCtx;
  cast: Person[];
  memo: Map<string, string>;
  taskIdx: number | null;
  depth: number;
}

export const mention = (p: Person) => `@[${p.name}](${p.id})`;

function pickOther(env: Env, n: number): Person | null {
  const { ctx } = env;
  const pool = ctx.members.filter((m) => !env.cast.includes(m.p));
  if (!pool.length) return null;
  const key = `__p${n}`;
  const hit = env.memo.get(key);
  if (hit) return pool.find((m) => m.p.id === hit)?.p ?? null;
  const used = new Set<string>();
  for (let i = 1; i < n; i++) {
    const u = env.memo.get(`__p${i}`);
    if (u) used.add(u);
  }
  const free = pool.filter((m) => !used.has(m.p.id));
  const src = free.length ? free : pool;
  const p = src[Math.floor(ctx.rng.next() * src.length)]!.p;
  env.memo.set(key, p.id);
  return p;
}

function genToken(env: Env, name: string): string | null {
  const { ctx } = env;
  const { rng } = ctx;
  switch (name) {
    case 'ch':
      return ctx.channel;
    case 'proj': {
      if (ctx.projTitle) return ctx.projTitle;
      const p = ctx.projects.length ? rng.pick(ctx.projects) : null;
      return p ? p.title : 'the program';
    }
    case 'key':
      return ctx.projKey ?? (ctx.projects.length ? rng.pick(ctx.projects).key : 'ATL');
    case 'task':
    case 'task2':
    case 'task3': {
      const t = taskFor(env, name);
      return t.key;
    }
    case 'taskname':
      return taskFor(env, 'task').title;
    case 'n':
    case 'n2':
    case 'n3':
      return String(rng.int(2, 30));
    case 'big': {
      const v = rng.int(120, 9800);
      return v >= 1000 ? `${Math.floor(v / 1000)},${String(v % 1000).padStart(3, '0')}` : String(v);
    }
    case 'pct':
    case 'pct2':
      return `${rng.int(3, 98)}%`;
    case 'ms':
      return `${rng.int(80, 2400)}ms`;
    case 'usd':
      return rng.chance(0.4) ? rng.pick(USD) : `$${rng.int(8, 950)}k`;
    case 'ver':
      return `v${rng.int(1, 5)}.${rng.int(0, 24)}.${rng.int(0, 9)}`;
    case 'pr':
    case 'pr2':
      return `#${rng.int(1100, 9899)}`;
    case 'ticket':
      return `INC-${rng.int(10000, 59999)}`;
    case 'sha': {
      let s = '';
      for (let i = 0; i < 7; i++) s += '0123456789abcdef'[rng.int(0, 15)];
      return s;
    }
    case 'sprint':
      return `Sprint ${rng.int(18, 64)}`;
    case 'q': {
      const q = Math.floor(new Date(ctx.nowMs).getUTCMonth() / 3) + 1;
      return `Q${rng.chance(0.7) ? q : (q % 4) + 1}`;
    }
    case 'day':
    case 'day2':
      return rng.pick(DAYS);
    case 'date':
    case 'date2':
      return fmtDate(ctx.nowMs + rng.int(-14, 28) * 86_400_000);
    case 'time':
      return rng.pick(TIMES);
    case 'hours':
      return rng.pick(HOURS);
    case 'region':
      return rng.pick(REGIONS);
    case 'city':
      return rng.pick(CITIES);
    case 'cust':
      return rng.pick(CUSTOMERS);
    case 'dept':
      return rng.pick(DEPTS);
    case 'emoji':
      return rng.pick(EMOJI);
    case 'wiki': {
      const k = ctx.projKey ?? 'PMO';
      return `https://wiki.halcyon.example/spaces/${k}/pages/${rng.int(100000, 999999)}/${slug(pickLex(env, 'doc'))}`;
    }
    case 'figma':
      return `https://figma.halcyon.example/file/${(ctx.projKey ?? 'DSYS').toLowerCase()}-${rng.int(1000, 9999)}/${slug(pickLex(env, 'feature'))}`;
    case 'repo':
      return `https://git.halcyon.example/${ctx.projSlug ?? 'platform'}/pull/${rng.int(1100, 9899)}`;
    case 'dash':
      return `https://grafana.halcyon.example/d/${rng.int(100000, 999999).toString(36)}/${slug(pickLex(env, 'metric'))}`;
    case 'runbook':
      return `https://wiki.halcyon.example/runbooks/${slug(pickLex(env, 'component'))}`;
    case 'tracker':
      return `https://tracker.halcyon.example/${(ctx.projKey ?? 'atl').toLowerCase()}/${taskFor(env, 'task').key}`;
    case 'me':
      return ctx.maya ? ctx.maya.first : 'Maya';
    case '@me':
      return ctx.maya ? mention(ctx.maya) : '@Maya';
    case 'p1':
    case 'p2':
    case 'p3': {
      const p = pickOther(env, Number(name[1]));
      return p ? p.first : 'someone';
    }
    case '@p1':
    case '@p2': {
      const p = pickOther(env, Number(name[2]));
      return p ? mention(p) : 'someone';
    }
  }
  if (name.length === 1 && name >= 'A' && name <= 'F') {
    const p = env.cast[name.charCodeAt(0) - 65];
    return p ? p.first : 'someone';
  }
  if (name.length === 2 && name[0] === '@' && name[1]! >= 'A' && name[1]! <= 'F') {
    const p = env.cast[name.charCodeAt(1) - 65];
    return p ? mention(p) : 'someone';
  }
  return null;
}

function taskFor(env: Env, name: string): TaskRef {
  const { ctx } = env;
  const memoKey = `__t:${name}`;
  const hit = env.memo.get(memoKey);
  const list = ctx.tasks;
  if (hit !== undefined) return list[Number(hit)] ?? synthTask(ctx);
  if (!list.length) {
    const t = synthTask(ctx);
    return t;
  }
  let idx = Math.floor(ctx.rng.next() * list.length);
  // Keep {task2}/{task3} distinct from {task}.
  if (name !== 'task') {
    const base = env.memo.get('__t:task');
    if (base !== undefined && list.length > 1) while (idx === Number(base)) idx = Math.floor(ctx.rng.next() * list.length);
  }
  env.memo.set(memoKey, String(idx));
  return list[idx]!;
}

function synthTask(ctx: GenCtx): TaskRef {
  const key = ctx.projKey ?? (ctx.projects.length ? ctx.rng.pick(ctx.projects).key : 'ATL');
  return { key: `${key}-${ctx.rng.int(3, 240)}`, title: 'the open item' };
}

function pickLex(env: Env, key: string): string {
  const vs = env.ctx.lex[key] ?? BASE_LEX[key];
  if (!vs || !vs.length) return key;
  return env.ctx.rng.pick(vs).replace(/\{[^}]*\}/g, '');
}

function resolveToken(env: Env, name: string): string | null {
  const hit = env.memo.get(name);
  if (hit !== undefined) return hit;
  let v: string | null = genToken(env, name);
  if (v === null) {
    const vs = env.ctx.lex[name] ?? BASE_LEX[name];
    if (vs && vs.length) v = env.ctx.rng.pick(vs);
    else {
      // {feature2}: independent draw from {feature}.
      const base = name.replace(/\d+$/, '');
      if (base !== name) {
        const bs = env.ctx.lex[base] ?? BASE_LEX[base];
        if (!bs && DYNAMIC_TOKENS.has(base)) {
          const prev = env.memo.get(base);
          let tries = 0;
          do v = genToken(env, base);
          while (v !== null && v === prev && ++tries < 4);
        } else if (bs && bs.length) {
          const prev = env.memo.get(base);
          let tries = 0;
          do v = env.ctx.rng.pick(bs);
          while (v === prev && bs.length > 1 && ++tries < 6);
        }
      }
    }
  }
  if (v === null) return null;
  if (v.includes('{') && env.depth < 3) {
    env.depth++;
    v = expandTokens(env, v);
    env.depth--;
  }
  env.memo.set(name, v);
  return v;
}

function expandTokens(env: Env, text: string): string {
  return text.replace(TOKEN_RE, (m, name: string) => resolveToken(env, name) ?? m);
}

const DET_RE = /(the|a|an) (a|an|the) (w)/gi;
function fixDeterminers(text: string): string {
  if (!/(the|a|an) (a|an|the) /i.test(text)) return text;
  return text.replace(DET_RE, (_m, first: string, second: string, next: string) => {
    const cap = first[0] === first[0]!.toUpperCase() ? (w: string) => w[0]!.toUpperCase() + w.slice(1) : (w: string) => w;
    if (first.toLowerCase() === 'the' || second.toLowerCase() === 'the') return `${cap(first.toLowerCase() === 'the' ? 'the' : 'the')} ${next}`;
    return `${cap(/[aeiou]/i.test(next) ? 'an' : 'a')} ${next}`;
  });
}

function expandAlternations(rng: Rng, text: string): string {
  if (!text.includes('|')) return text;
  return text.replace(ALT_RE, (_m, body: string) => {
    const opts = body.split('|');
    return opts[Math.floor(rng.next() * opts.length)]!;
  });
}

// ─── Casting & expansion ──────────────────────────────────────────────

export function pickMember(rng: Rng, members: Member[], exclude?: Set<string>): Person | null {
  let total = 0;
  for (const m of members) if (!exclude || !exclude.has(m.p.id)) total += m.w;
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const m of members) {
    if (exclude && exclude.has(m.p.id)) continue;
    r -= m.w;
    if (r <= 0) return m.p;
  }
  for (let i = members.length - 1; i >= 0; i--) if (!exclude || !exclude.has(members[i]!.p.id)) return members[i]!.p;
  return null;
}

/** Cast `n` distinct people (A first). `lead` forces speaker A. */
export function castPeople(ctx: GenCtx, n: number, lead?: Person | null): Person[] {
  const out: Person[] = [];
  const used = new Set<string>();
  if (lead) {
    out.push(lead);
    used.add(lead.id);
  }
  if (ctx.maya) used.add(ctx.maya.id);
  while (out.length < n) {
    const p = pickMember(ctx.rng, ctx.members, used);
    if (!p) break;
    out.push(p);
    used.add(p.id);
  }
  // Tiny channels: allow repeats rather than failing.
  while (out.length < n) out.push(out[out.length % Math.max(1, out.length)] ?? ctx.members[0]!.p);
  return out;
}

export function expandScene(ctx: GenCtx, scene: ParsedScene, cast: Person[]): OutTurn[] {
  const env: Env = { ctx, cast, memo: new Map(), taskIdx: null, depth: 0 };
  const out: OutTurn[] = [];
  for (const turn of scene.turns) {
    const who = turn.who === 'M' ? ctx.maya! : cast[turn.who.charCodeAt(0) - 65]!;
    let text = expandTokens(env, turn.text);
    text = fixDeterminers(expandAlternations(ctx.rng, text));
    out.push({ who, turn, text });
  }
  return out;
}

// ─── Scene bags ───────────────────────────────────────────────────────

export interface BagEntry {
  scene: ParsedScene;
  pool: string;
  cum: number;
}

export interface SceneBag {
  entries: BagEntry[];
  total: number;
  used: Map<ParsedScene, number>;
}

export type PoolResolver = (ref: string) => Scene[] | undefined;

export interface BagOpts {
  /** Scenes needing Maya (M turns / {@me}) are only included when she takes part. */
  mayaIn: boolean;
  /** Runtime: never script Maya's own words. */
  noMayaTurns?: boolean;
  /** Runtime: only scenes that @mention Maya. */
  onlyMentions?: boolean;
}

export function buildBag(mix: [string, number][], resolve: PoolResolver, opts: BagOpts): SceneBag {
  const entries: BagEntry[] = [];
  let total = 0;
  for (const [ref, weight] of mix) {
    const scenes = resolve(ref);
    if (!scenes || !scenes.length) continue;
    // Spread the pool's weight over its scenes so big pools don't dominate by size alone.
    const per = weight / Math.sqrt(scenes.length);
    for (const s of scenes) {
      const p = parseScene(s);
      if (p.needsMaya && !opts.mayaIn) continue;
      if (opts.noMayaTurns && p.turns.some((t) => t.who === 'M')) continue;
      if (opts.onlyMentions && !p.mentionsMaya) continue;
      total += per * p.w;
      entries.push({ scene: p, pool: ref, cum: total });
    }
  }
  return { entries, total, used: new Map() };
}

export function drawScene(bag: SceneBag, rng: Rng): BagEntry | null {
  if (!bag.entries.length) return null;
  let pick: BagEntry | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = rng.next() * bag.total;
    let lo = 0;
    let hi = bag.entries.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (bag.entries[mid]!.cum < r) lo = mid + 1;
      else hi = mid;
    }
    pick = bag.entries[lo]!;
    const u = bag.used.get(pick.scene) ?? 0;
    if (u === 0 || !rng.chance(Math.min(0.92, 0.55 * u + 0.35))) break;
  }
  if (pick) bag.used.set(pick.scene, (bag.used.get(pick.scene) ?? 0) + 1);
  return pick;
}

// ─── Time ─────────────────────────────────────────────────────────────

const HOUR_W = [0, 0, 0, 0, 0.05, 0.2, 0.7, 2, 4.5, 7, 8, 7.5, 5, 5.5, 7.5, 8, 7, 5, 3, 1.4, 0.7, 0.4, 0.2, 0.05];
const HOUR_CUM: number[] = [];
{
  let t = 0;
  for (const w of HOUR_W) HOUR_CUM.push((t += w));
}

/** Random local minute-of-day with a business-hours shape. */
export function localMinute(rng: Rng): number {
  const r = rng.next() * HOUR_CUM[23]!;
  let h = 0;
  while (h < 23 && HOUR_CUM[h]! < r) h++;
  return h * 60 + rng.int(0, 59);
}

/** Milliseconds until the next turn of a scene. */
export function turnGapMs(rng: Rng): number {
  const r = rng.next();
  if (r < 0.66) return rng.int(7, 110) * 1000;
  if (r < 0.88) return rng.int(2, 14) * 60_000 + rng.int(0, 59_000);
  if (r < 0.97) return rng.int(18, 150) * 60_000;
  return rng.int(3, 20) * 3_600_000;
}

// ─── Reactions ────────────────────────────────────────────────────────

const TONES: Record<string, string[]> = {
  chatter: ['😂', '👍', '🙌', '❤️', '😅'],
  social: ['😂', '❤️', '🙌', '😅', '👀', '🍕'],
  thanks: ['🎉', '👏', '🙌', '❤️', '🙏'],
  birthday: ['🎂', '🎉', '❤️', '👏'],
  decision: ['👍', '✅', '🙌'],
  launch: ['🎉', '🚀', '🙌', '👏'],
  release: ['🚀', '🎉', '✅', '🙌'],
  incident: ['👀', '🙏', '😬', '✅'],
  blocker: ['👀', '🙏', '😬', '👍'],
  poll: ['1️⃣', '2️⃣', '3️⃣'],
  default: ['👍', '🙌', '👀', '✅', '🙏'],
};

export function toneFor(pool: string): string[] {
  const k = pool.replace(/^(generic|kind):(?:[a-z-]+:)?/, '');
  return TONES[k] ?? TONES.default!;
}

export function makeReactions(
  rng: Rng,
  emojis: string[],
  members: Member[],
  maya: Person | null,
  author: string,
  max = 3,
): [string, string[]][] {
  const out: [string, string[]][] = [];
  const kinds = rng.sample(emojis, Math.min(emojis.length, rng.int(1, max)));
  for (const e of kinds) {
    const n = Math.min(members.length, rng.weighted([[1, 5], [2, 4], [3, 3], [4, 2], [5, 1]] as const));
    const ids: string[] = [];
    const used = new Set<string>([author]);
    for (let i = 0; i < n; i++) {
      const p = pickMember(rng, members, used);
      if (!p) break;
      ids.push(p.id);
      used.add(p.id);
    }
    if (maya && !used.has(maya.id) && rng.chance(0.07)) ids.push(maya.id);
    if (ids.length) out.push([e, ids]);
  }
  return out;
}
