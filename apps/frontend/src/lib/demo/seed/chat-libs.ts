/**
 * Aggregates the hand-authored conversation libraries into the three things
 * the generator needs: shared pools, per-ProjectKind libs, and the global
 * channel specs. Channels/kinds without bespoke content fall back to the
 * shared pools so the demo is never empty.
 */
import type { ProjectKind } from '../schema';
import type { GlobalChannelDef, KindLib, Lex, Pools, Scene } from './chat-dsl';
import { GENERIC_A } from './chat-lib-generic-a';
import { GENERIC_B } from './chat-lib-generic-b';
import { GENERIC_C } from './chat-lib-generic-c';
import { KINDS_A } from './chat-lib-kinds-a';
import { KINDS_B } from './chat-lib-kinds-b';
import { KINDS_C } from './chat-lib-kinds-c';
import { GLOBAL_A } from './chat-lib-global-a';
import { GLOBAL_B } from './chat-lib-global-b';
import { GLOBAL_C } from './chat-lib-global-c';
import { KINDS_D, GLOBAL_D } from './chat-lib-extra';

function mergePools(...all: Pools[]): Pools {
  const out: Pools = {};
  for (const p of all) for (const [k, v] of Object.entries(p)) (out[k] ??= []).push(...v);
  return out;
}

export const GENERIC: Pools = mergePools(GENERIC_A, GENERIC_B, GENERIC_C);

export const KIND_LIBS: Partial<Record<ProjectKind, KindLib>> = (() => {
  const out: Partial<Record<ProjectKind, KindLib>> = {};
  for (const src of [KINDS_A, KINDS_B, KINDS_C, KINDS_D]) {
    for (const [k, lib] of Object.entries(src) as [ProjectKind, KindLib][]) {
      const prev = out[k];
      out[k] = prev ? { lex: { ...prev.lex, ...lib.lex }, pools: mergePools(prev.pools, lib.pools) } : lib;
    }
  }
  return out;
})();

export function kindLex(kind: ProjectKind): Lex {
  return KIND_LIBS[kind]?.lex ?? {};
}

export function kindPool(kind: ProjectKind, pool: string): Scene[] | undefined {
  return KIND_LIBS[kind]?.pools[pool];
}

/** Resolve `generic:x`, `kind:x` (current kind) or `kind:<k>:x` pool refs. */
export function resolveRef(ref: string, kind: ProjectKind | null, own: Pools): Scene[] | undefined {
  if (ref.startsWith('generic:')) return GENERIC[ref.slice(8)];
  if (ref.startsWith('kind:')) {
    const rest = ref.slice(5);
    const i = rest.indexOf(':');
    if (i >= 0) return KIND_LIBS[rest.slice(0, i) as ProjectKind]?.pools[rest.slice(i + 1)];
    return kind ? KIND_LIBS[kind]?.pools[rest] : undefined;
  }
  return own[ref];
}

// ─── Global channels ─────────────────────────────────────────────────

/** Order = display order; bespoke defs from the libs override these shells. */
const SHELLS: Omit<GlobalChannelDef, 'pools'>[] = [
  { name: 'general', topic: 'Company-wide chat. Announcements live in #announcements.', size: 9, mix: [['generic:social', 4], ['generic:thanks', 2], ['generic:birthday', 2], ['generic:question', 2], ['generic:poll', 1], ['generic:ack', 2]], cast: ['amara', 'elena', 'daniel'], castWeight: 0.2 },
  { name: 'announcements', topic: 'Company news from leadership. Read-mostly; discuss in threads.', size: 2, mix: [['generic:release', 2], ['generic:status', 2]], cast: ['daniel', 'priya', 'tomas', 'hannah', 'ravi', 'elena', 'james', 'amara', 'kenji', 'sofia', 'oliver', 'nadia'], castWeight: 0.9 },
  { name: 'random', topic: 'Off-topic, memes, links and good news that has nothing to do with work.', size: 8, mix: [['generic:social', 6], ['generic:poll', 1], ['generic:ack', 2]] },
  { name: 'wins', topic: 'Celebrate shipped milestones, closed deals and kind words from customers.', size: 4, mix: [['generic:thanks', 6], ['generic:release', 2], ['generic:birthday', 1]] },
  { name: 'engineering', topic: 'Engineering-wide: architecture, tooling, CI, on-call stories and TILs.', size: 9, mix: [['generic:code', 3], ['generic:review', 3], ['generic:incident', 2], ['generic:question', 3], ['kind:software:work', 4], ['generic:release', 1], ['generic:ack', 2]], cast: ['daniel', 'kenji'], castWeight: 0.1, depts: ['Engineering', 'IT & Infrastructure', 'Data & Analytics', 'Security'] },
  { name: 'data-and-analytics', topic: 'dbt, Snowflake, dashboards and metric definitions.', size: 7, mix: [['generic:question', 3], ['generic:code', 3], ['generic:docs', 2], ['generic:ack', 1]], cast: ['priya'], depts: ['Data & Analytics', 'Engineering', 'Finance', 'Product'] },
  { name: 'security-corner', topic: 'Security questions, advisories and tips. Report phishing here or to security@.', size: 5, mix: [['generic:question', 3], ['generic:access', 3], ['generic:risk', 2], ['generic:incident', 1]], cast: ['tomas'], depts: ['Security', 'IT & Infrastructure', 'Engineering'] },
  { name: 'design-crit', topic: 'Share work in progress for critique. Be kind, be specific.', size: 5, mix: [['generic:feedback', 3], ['generic:docs', 2], ['generic:review', 3], ['generic:demo', 1]], cast: ['hannah'], depts: ['Design', 'Product', 'Engineering', 'Marketing'] },
  { name: 'people-team', topic: 'People Ops questions, hiring updates and programmes.', size: 4, mix: [['generic:question', 4], ['generic:birthday', 2], ['generic:status', 1], ['generic:meeting', 1]], cast: ['amara'], depts: ['People Operations', 'Transformation Office', 'Legal & Compliance'] },
  { name: 'it-help', topic: 'Laptops, VPN, licences and access. Include your ticket number.', size: 9, mix: [['generic:access', 4], ['generic:question', 5], ['generic:thanks', 1], ['generic:ack', 2]], cast: ['kenji'], castWeight: 0.05, depts: ['IT & Infrastructure'] },
  { name: 'finance-close', topic: 'Month-end close checklist, cutoffs and reconciliations.', size: 5, mix: [['generic:status', 3], ['generic:question', 3], ['generic:meeting', 1], ['generic:ack', 1]], cast: ['ravi'], depts: ['Finance', 'Supply Chain', 'Sales Operations', 'Transformation Office'] },
  { name: 'ask-pmo', topic: 'Questions for the PMO: intake, templates, governance and reporting.', size: 7, mix: [['generic:question', 5], ['generic:status', 2], ['generic:docs', 2], ['generic:meeting', 1], ['generic:ack', 1]] },
  { name: 'product-launches', topic: 'Launch calendar, readiness checks and go/no-go coordination.', size: 4, mix: [['generic:release', 4], ['generic:decision', 2], ['generic:status', 2], ['generic:planning', 1]], cast: ['nadia', 'sofia'], castWeight: 0.2, depts: ['Product', 'Marketing', 'Engineering', 'Customer Success', 'Sales Operations'] },
  { name: 'customer-stories', topic: 'What customers are telling us: wins, quotes and escalations resolved.', size: 3, mix: [['generic:feedback', 5], ['generic:thanks', 2]], cast: ['oliver'], depts: ['Customer Success', 'Sales Operations', 'Marketing', 'Product'] },
  { name: 'watercooler', topic: 'Coffee, lunch plans and weekend stories.', size: 7, mix: [['generic:social', 7], ['generic:poll', 1], ['generic:ack', 1]] },
  { name: 'oncall-handoff', topic: 'Weekly on-call handoff notes and follow-ups.', size: 4, mix: [['generic:incident', 3], ['generic:ooo', 2], ['generic:status', 2], ['generic:question', 1]], depts: ['Engineering', 'IT & Infrastructure', 'Security', 'Data & Analytics'] },
];

export function globalSpecs(): GlobalChannelDef[] {
  const bespoke = new Map<string, GlobalChannelDef>();
  for (const d of [...GLOBAL_A, ...GLOBAL_B, ...GLOBAL_C, ...GLOBAL_D]) bespoke.set(d.name, d);
  return SHELLS.map((s) => {
    const d = bespoke.get(s.name);
    return d ? { ...s, ...d, pools: d.pools } : { ...s, pools: {} };
  });
}
