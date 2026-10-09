/**
 * Chat content DSL: how the hand-authored conversation libraries are written
 * and how the generator expands them. Pure data + pure functions (no browser
 * globals), shared by the seeder and the live simulation.
 *
 * ── Authoring contract (read this before writing a library) ─────────────────
 *
 * A *scene* is a short conversation: an array of *turn* strings.
 *
 *     ['A: Can someone review {pr}? It touches the {component}.',
 *      'B: On it. ~rx:👍',
 *      'B: Left two comments, mostly naming. {Otherwise|Apart from that} looks good.',
 *      'A: {thanks} Pushed the fixes. ~r']
 *
 * A turn is `SPEAKER: text` where SPEAKER is one of `A B C D E F` (distinct
 * people, A starts the scene) or `M` (Maya Brennan, the signed-in persona; a
 * scene that uses `M`, `{me}` or `{@me}` is only played where she takes part).
 * Text is GitHub-flavoured markdown (`inline code`, ``` fences with \n, lists,
 * **bold**). It is NOT a template language beyond the tokens below.
 *
 * Optional trailing markers (separated by a space and `~`, at the END only):
 *     ~r        reply to the previous turn (quoted preview in the UI)
 *     ~r2       reply to the turn two back (any digit)
 *     ~rx       add a few reactions (emoji chosen by the scene's tone)
 *     ~rx:👍|🎉  add reactions from this pool (1-3 picked, 1-5 reactors each)
 *     ~img:Label  attach a generated image (a screenshot/chart/photo stand-in)
 *     ~file:Q3-budget.xlsx  attach a file chip with that filename
 *     ~edit     show "(edited)"
 *     ~del      the message was deleted (tombstone; its text is dropped)
 *     ~pin / ~pin:Pin note   pin this message (manager pin, optional note)
 *     ~t:45     this turn comes 45 s after the previous (default: random)
 *
 * Tokens `{name}` (resolved once per scene; the same token = the same value
 * within a scene; a trailing digit, e.g. {task2}, draws a different one):
 *   people   {A}..{F} first names of the scene's speakers; {@A}..{@F} mention
 *            them (renders as @Name and notifies); {me} = Maya, {@me} mentions
 *            her; {p1} {p2} {p3} first names of other channel members;
 *            {@p1} {@p2} mention them.
 *   context  {ch} channel name · {proj} project title (or "the program") ·
 *            {key} project key · {task} {task2} {task3} real task keys of the
 *            project (e.g. PORT-142) · {taskname} the title of {task}
 *   numbers  {n} {n2} {n3} (2-30) · {big} (e.g. 1,240) · {pct} {pct2} (37%) ·
 *            {ms} (340ms) · {usd} ($48k) · {ver} (v2.14.3) · {pr} {pr2}
 *            (#4821) · {ticket} (INC-48213) · {sha} (a3f9c1e) ·
 *            {sprint} (Sprint 42) · {q} (Q4) · {day} {day2} (Tuesday) ·
 *            {date} {date2} (Oct 14) · {time} (2:30pm) · {hours} (3 hours)
 *   misc     {region} (eu-west-1) · {city} · {cust} (a fictional customer) ·
 *            {dept} · {emoji} (a positive emoji) · {wiki} {figma} {repo}
 *            {dash} {runbook} {tracker} (internal https links on
 *            halcyon.example; never write other URLs except github.com,
 *            stackoverflow.com, en.wikipedia.org style well-known sites)
 *   lexicon  any key of the library's own `lex` (each value a short phrase) and
 *            the BASE_LEX keys below ({ack} {thanks} {greet} {doc} {meeting}…).
 * Alternation `{this|that|}` (no spaces right after `{`, no nesting) picks one
 * at random; an empty option is allowed.
 *
 * Quality bar: it must read like real, busy workplace chat. Vary length (many
 * turns are 4-12 words, some are a paragraph), voice (terse, chatty, formal),
 * and structure. Reference concrete things through the tokens. Include the odd
 * typo-free emoji, a shrug, a joke, a correction. Never lorem ipsum, never
 * "Sample text", never real people/brands in a bad light; real tools (Jira,
 * Snowflake, Datadog, Figma, Slack…) are fine, customers are fictional.
 */

// ─── Types ─────────────────────────────────────────────────────────────

export type Scene = string[] | { w?: number; turns: string[] };
export type Pools = Record<string, Scene[]>;
export type Lex = Record<string, string[]>;

/** A project-kind library: its vocabulary and conversation pools. */
export interface KindLib {
  /** Must define: feature component tool problem metric deliverable team (>= 10 values each). */
  lex: Lex;
  /**
   * Required pools: work standup blocker decision launch chatter.
   * Optional: incident retro design planning release (used when present).
   */
  pools: Pools;
}

/** A workspace-global channel: its personality and conversation pools. */
export interface GlobalChannelDef {
  /** Channel name, lowercase with hyphens (#general is `general`). */
  name: string;
  topic: string;
  /** Relative volume (1-10); the seeder rescales to its message budget. */
  size: number;
  /** Which pools to draw from and how often. Pool names are keys of `pools` or `generic:<pool>` or `kind:<ProjectKind>:<pool>`. */
  mix: [pool: string, weight: number][];
  pools: Pools;
  lex?: Lex;
  /** Leaders (keys of CAST in seed/people.ts) who preferentially author scenes' speaker A, e.g. ['amara','daniel']. */
  cast?: string[];
  /** Weight (0-1) of A-speakers drawn from `cast` vs the departments (default 0.15; announcements use 0.9). */
  castWeight?: number;
  /** Departments (names as in seed/people.ts DEPARTMENTS) whose staff take part; empty = everyone. */
  depts?: string[];
  /** Pinned intro/guidelines scene(s) posted when the channel was created. */
  intro?: Scene[];
}

// ─── Base lexicon (usable in every scene) ──────────────────────────────

export const BASE_LEX: Lex = {
  ack: ['Sounds good', 'On it', 'Got it, thanks', 'Noted', 'Will do', 'Makes sense', 'Perfect', 'Done', 'Roger that', 'Works for me', 'Yep, will do', 'Great, thanks', 'All good on my side', 'Agreed', 'Cool'],
  thanks: ['Thanks!', 'Thank you!', 'Appreciate it', 'Thanks, that helps', 'Cheers', 'Thanks a ton', 'Much appreciated', 'Thank you, really helpful', 'Thanks for the quick turnaround', 'Ah, thanks'],
  greet: ['Morning all', 'Hi team', 'Hey folks', 'Good morning', 'Hello everyone', 'Hi all', 'Morning team', 'Hey everyone', 'Happy Monday', 'Afternoon all'],
  lol: ['😂', 'haha', 'lol', '😅', 'ha, true', 'hahaha', '🙃', 'dead 😂', 'ok that made me laugh'],
  positive: ['great', 'awesome', 'nice', 'love it', 'perfect', 'brilliant', 'excellent', 'fantastic', 'solid', 'really good'],
  doc: ['rollout plan', 'runbook', 'design doc', 'RFC', 'status report', 'decision log', 'test plan', 'architecture overview', 'onboarding guide', 'budget sheet', 'risk register', 'launch checklist', 'migration plan', 'comms plan', 'requirements doc', 'cutover plan', 'RACI', 'FAQ'],
  meeting: ['weekly sync', 'steering committee', 'design review', 'sprint planning', 'retro', 'stakeholder readout', 'kickoff', 'demo', 'office hours', 'go/no-go', 'architecture review', 'standup', 'planning session', 'working session', 'status call'],
  snack: ['the good coffee', 'those little pastries', 'fruit and nuts', 'bagels', 'cold brew', 'the pastries from downstairs', 'proper tea', 'oat milk lattes'],
  weekend: ['hiking', 'a long run', 'painting the spare room', 'a farmers market', 'absolutely nothing', 'a friend\'s wedding', 'a road trip', 'finally cleaning the garage', 'a pottery class', 'catching up on sleep', 'visiting family'],
  lunch: ['ramen', 'the new taco place', 'a salad (boring, I know)', 'leftover curry', 'sushi', 'a sandwich at my desk', 'pho', 'falafel', 'the Thursday food trucks'],
  feature: ['the new onboarding flow', 'search filters', 'the approvals queue', 'bulk edit', 'the export function', 'role-based views', 'notifications', 'the audit trail', 'saved views', 'the dashboard refresh'],
  component: ['the API layer', 'the auth service', 'the scheduler', 'the reporting module', 'the sync job', 'the ingestion pipeline', 'the permissions model', 'the settings page', 'the queue consumer', 'the cache layer'],
  tool: ['Jira', 'Confluence', 'Slack', 'Figma', 'Datadog', 'Terraform', 'GitHub', 'Zoom', 'Notion', 'Excel'],
  problem: ['a flaky test', 'a permissions error', 'a timeout', 'a data mismatch', 'a missing config value', 'a stale cache', 'a race condition', 'an off-by-one in the date range', 'a broken link', 'a duplicate record'],
  metric: ['p95 latency', 'error rate', 'conversion', 'ticket volume', 'cycle time', 'adoption', 'completion rate', 'cost per run', 'forecast accuracy', 'NPS'],
  deliverable: ['the cutover plan', 'the training deck', 'the test report', 'the data mapping', 'the vendor contract', 'the runbook', 'the launch comms', 'the requirements doc', 'the budget revision', 'the risk register'],
  env: ['staging', 'production', 'QA', 'the sandbox', 'the preview environment', 'UAT', 'pre-prod'],
  flag: ['new-checkout-v2', 'saved-filters-beta', 'async-export', 'inline-comments', 'sso-enforce', 'bulk-edit'],
  team: ['platform', 'data', 'design', 'security', 'finance', 'support', 'sales ops', 'QA', 'infra', 'legal'],
};

// ─── Parsing ───────────────────────────────────────────────────────────

export interface ParsedTurn {
  who: string; // 'A'..'F' | 'M'
  text: string;
  reply?: number; // how many turns back
  rx?: true | string[];
  img?: string;
  file?: string;
  edit?: boolean;
  del?: boolean;
  pin?: true | string;
  gap?: number; // seconds
}

export interface ParsedScene {
  w: number;
  turns: ParsedTurn[];
  /** Highest speaker letter used (A=1 … F=6). */
  speakers: number;
  needsMaya: boolean;
  /** True when it mentions Maya with {@me}. */
  mentionsMaya: boolean;
}

const TURN_RE = /^([A-FM]):\s?([\s\S]*)$/;
const MARKER_TAIL_RE = /((?: ~(?:r\d*|rx(?::[^~]*?)?|img(?::[^~]*?)?|file:[^~]+?|edit|del|pin(?::[^~]*?)?|t:\d+))+)\s*$/;
const MARKER_RE = / ~(r\d*|rx(?::[^~]*?)?|img(?::[^~]*?)?|file:[^~]+?|edit|del|pin(?::[^~]*?)?|t:\d+)(?= ~|\s*$)/g;

export class SceneError extends Error {}

export function parseTurn(raw: string): ParsedTurn {
  const m = TURN_RE.exec(raw);
  if (!m) throw new SceneError(`bad turn (expected "A: text"): ${raw.slice(0, 60)}`);
  let text = m[2]!;
  const t: ParsedTurn = { who: m[1]!, text: '' };
  const tail = MARKER_TAIL_RE.exec(text);
  if (tail) {
    text = text.slice(0, text.length - tail[0].length);
    MARKER_RE.lastIndex = 0;
    let mm: RegExpExecArray | null;
    while ((mm = MARKER_RE.exec(tail[1]!))) {
      const k = mm[1]!;
      if (k.startsWith('rx')) t.rx = k.length > 3 ? k.slice(3).split('|').map((s) => s.trim()).filter(Boolean) : true;
      else if (k.startsWith('r')) t.reply = k.length > 1 ? parseInt(k.slice(1), 10) : 1;
      else if (k.startsWith('img')) t.img = k.length > 4 ? k.slice(4).trim() : 'Screenshot';
      else if (k.startsWith('file:')) t.file = k.slice(5).trim();
      else if (k === 'edit') t.edit = true;
      else if (k === 'del') t.del = true;
      else if (k.startsWith('pin')) t.pin = k.length > 4 ? k.slice(4).trim() : true;
      else if (k.startsWith('t:')) t.gap = parseInt(k.slice(2), 10);
    }
  }
  t.text = text.trimEnd();
  return t;
}

const parsed = new WeakMap<object, ParsedScene>();

export function parseScene(scene: Scene): ParsedScene {
  const key = scene as object;
  const hit = parsed.get(key);
  if (hit) return hit;
  const turnsRaw = Array.isArray(scene) ? scene : scene.turns;
  const w = Array.isArray(scene) ? 1 : (scene.w ?? 1);
  const turns = turnsRaw.map(parseTurn);
  let speakers = 1;
  let needsMaya = false;
  let mentionsMaya = false;
  for (const t of turns) {
    if (t.who === 'M') needsMaya = true;
    else speakers = Math.max(speakers, t.who.charCodeAt(0) - 64);
    if (t.text.includes('{@me}')) {
      mentionsMaya = true;
      needsMaya = true;
    }
    if (t.text.includes('{me}')) needsMaya = true;
  }
  const out: ParsedScene = { w, turns, speakers, needsMaya, mentionsMaya };
  parsed.set(key, out);
  return out;
}

export function sceneList(pools: Pools, name: string): Scene[] {
  return pools[name] ?? [];
}

/** Tokens the generator itself provides (lint uses this to catch typos). */
export const DYNAMIC_TOKENS = new Set([
  'A', 'B', 'C', 'D', 'E', 'F', '@A', '@B', '@C', '@D', '@E', '@F', 'me', '@me', 'p1', 'p2', 'p3', '@p1', '@p2',
  'ch', 'proj', 'key', 'task', 'task2', 'task3', 'taskname',
  'n', 'n2', 'n3', 'big', 'pct', 'pct2', 'ms', 'usd', 'ver', 'pr', 'pr2', 'ticket', 'sha', 'sprint', 'q', 'day', 'day2', 'date', 'date2', 'time', 'hours',
  'region', 'city', 'cust', 'dept', 'emoji', 'wiki', 'figma', 'repo', 'dash', 'runbook', 'tracker',
]);

/** Known-token check for a library (base lexicon + its own lex + dynamic tokens). */
export function unknownTokens(text: string, lex: Lex[]): string[] {
  const bad: string[] = [];
  const re = /(\$?)\{(@?[A-Za-z][A-Za-z0-9_]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1] === '$') continue; // JS template literal inside a code sample
    const name = m[2]!;
    if (DYNAMIC_TOKENS.has(name)) continue;
    if (lex.some((l) => name in l)) continue;
    const base = name.replace(/\d+$/, '');
    if (base !== name && (DYNAMIC_TOKENS.has(base) || lex.some((l) => base in l))) continue;
    bad.push(name);
  }
  return bad;
}
