/**
 * Document generators for the PMO demo:
 *   • Tiptap JSON task descriptions (built lazily from a `DescSpec`)
 *   • BlockNote JSON notes (meeting notes, RFCs, runbooks, retros, kickoffs…)
 *   • Excalidraw scenes (architecture / flow / retro / journey) + an SVG
 *     thumbnail renderer for whiteboard cards.
 * All generators are deterministic functions of (seed, project, people).
 */
import { createRng, type Rng } from '../prng';
import {
  BLOCKERS,
  CONTEXT,
  CRITERIA,
  NOTES_LINES,
  WEEKDAYS,
  fill,
  projectSubject,
  type FillCtx,
  type KindVocab,
  type Stream,
} from './pmo-content-common';

type J = Record<string, unknown>;

// ─── Tiptap ────────────────────────────────────────────────────────────────

const tText = (t: string, marks?: J[]): J => ({ type: 'text', text: t, ...(marks ? { marks } : {}) });
const tPara = (...c: (string | J)[]): J => ({
  type: 'paragraph',
  content: c.map((x) => (typeof x === 'string' ? tText(x) : x)),
});
const tHead = (t: string, level = 3): J => ({ type: 'heading', attrs: { level }, content: [tText(t)] });
const tBullets = (items: (string | J)[][]): J => ({
  type: 'bulletList',
  content: items.map((i) => ({ type: 'listItem', content: [tPara(...i)] })),
});
const tBold = (t: string): J => tText(t, [{ type: 'bold' }]);
const tLink = (t: string, href: string): J => tText(t, [{ type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer' } }]);

export interface DescInput {
  seed: number;
  stream: Stream;
  rel?: string[];
  blk?: string;
  projectSlug: string;
  listId: string;
  vocab: KindVocab;
  projectTitle: string;
}

export function buildDescription(d: DescInput): J {
  const rng = createRng(d.seed);
  const ctx: FillCtx = { pools: d.vocab.pools, subj: projectSubject(d.projectTitle), proj: d.projectTitle };
  const f = (s: string) => fill(s, rng, ctx);
  const blocks: J[] = [tPara(f(rng.pick(CONTEXT[d.stream])))];
  if (rng.chance(0.35)) blocks.push(tPara(tBold('Context: '), f(rng.pick(NOTES_LINES))));
  const crit = rng.sample(CRITERIA[d.stream], rng.int(2, 4)).map((c) => [f(c)]);
  blocks.push(tHead('Acceptance criteria'), tBullets(crit));
  if (d.rel && d.rel.length > 0) {
    const parts: (string | J)[] = [tBold('Related: ')];
    d.rel.forEach((k, i) => {
      if (i > 0) parts.push(', ');
      parts.push(tLink(k, `/projects/${d.projectSlug}/lists/${d.listId}/tasks/${k}`));
    });
    blocks.push(tPara(...parts));
  }
  if (d.blk) blocks.push(tPara(tBold('Blocker: '), f(d.blk)));
  return { type: 'doc', content: blocks };
}

export function pickBlocker(rng: Rng): string {
  return rng.pick(BLOCKERS);
}

// ─── BlockNote ─────────────────────────────────────────────────────────────

let blockSeq = 0;
const inline = (t: string, bold = false): J[] => [{ type: 'text', text: t, styles: bold ? { bold: true } : {} }];
const rich = (lead: string, rest: string): J[] => [
  { type: 'text', text: lead, styles: { bold: true } },
  { type: 'text', text: rest, styles: {} },
];
const bn = (type: string, content: J[] | string, props?: J): J => ({
  id: `b${(blockSeq = (blockSeq + 1) % 1_000_000)}`,
  type,
  props: {
    textColor: 'default',
    backgroundColor: 'default',
    ...(type === 'heading' ? { textAlignment: 'left', level: 2, isToggleable: false } : type === 'checkListItem' ? { textAlignment: 'left', checked: false } : { textAlignment: 'left' }),
    ...props,
  },
  content: typeof content === 'string' ? inline(content) : content,
  children: [],
});
const bH = (t: string, level = 2) => bn('heading', t, { level });
const bP = (t: string | J[]) => bn('paragraph', t);
const bBul = (t: string | J[]) => bn('bulletListItem', t);
const bNum = (t: string | J[]) => bn('numberedListItem', t);
const bChk = (t: string | J[], checked = false) => bn('checkListItem', t, { checked });
const bCode = (code: string, language = 'bash') => ({
  ...bn('codeBlock', code, { language }),
});

export interface NoteInput {
  kind: string;
  seed: number;
  vocab: KindVocab;
  projectTitle: string;
  /** Member display names (first = project lead). */
  people: string[];
  /** Day offset used for dates in the document, relative to today. */
  daysAgo: number;
  /** Developer-ish kinds get shell snippets in runbooks. */
  technical: boolean;
}

const DISCUSSION = [
  ['Scope: ', 'agreed to keep {thing} in the first release and move the {region} variant to the next iteration.'],
  ['Timeline: ', 'the date for {thing} is realistic only if {team} confirms capacity by {day}.'],
  ['Risk: ', 'dependency on {thing2} is the main unknown; we will review it again in the next sync.'],
  ['Budget: ', 'forecast is within {pct}% of plan; a request for {amount} may be needed if the pilot is extended.'],
  ['Quality: ', 'test coverage for {thing} is improving, but the {env} data is still not representative.'],
  ['Stakeholders: ', '{team} asked for an earlier preview; we will schedule a short demo.'],
  ['Adoption: ', 'feedback from the pilot is positive; the main ask is better documentation for {thing}.'],
  ['Open issue: ', 'nobody currently owns {thing} after go-live. Needs a decision this week.'],
];
const DECISIONS = [
  'Proceed with the phased rollout, starting with {region}.',
  'Keep {thing} as a manual step until after the pilot.',
  'Move the go / no-go review to {day}.',
  '{team} owns {thing} after handover; RACI to be updated.',
  'Defer the {region} variant to the next planning cycle.',
  'Use the staging environment for all demos until the freeze.',
];
const ACTIONS = [
  'update the plan and send the revised dates to {team}',
  'confirm the change window with {team}',
  'write up the options for {thing} and circulate before {day}',
  'schedule the demo for the {region} leads',
  'review the {doc} and add comments',
  'close the open defects against {thing}',
  'raise the access request for {env}',
  'update the risk register with the dependency on {thing2}',
  'share the numbers with Finance',
];
const WENT_WELL = [
  'The pilot group gave fast, specific feedback, which made prioritisation easy.',
  'Daily 15-minute syncs kept {team} and the delivery team aligned.',
  'The decision log meant we did not relitigate settled questions.',
  'Rollback was rehearsed twice and worked as designed.',
  'Early involvement of {team} avoided late surprises.',
  'Good demo discipline: every two weeks we showed working software.',
];
const WENT_BADLY = [
  'Requirements for {thing} changed three times after the design was approved.',
  'Test data in {env} did not match production, so issues showed up late.',
  'Handover to {team} was rushed; the runbook was incomplete.',
  'Too many parallel workstreams competing for the same two people.',
  'Status was tracked in three places, which caused confusion.',
  'Vendor responses took longer than planned and blocked {thing}.',
];
const CHANGES = [
  'Single source of truth for status: the Atlas task list only.',
  'Definition of done now includes the runbook and a support walkthrough.',
  'Freeze scope two weeks before every cutover.',
  'Name an owner for every risk, not only for every task.',
  'Add a production-like data set to {env} before the next wave.',
  'Hold a ten-minute pre-mortem at the start of each phase.',
];
const GOALS = [
  'Deliver {subj} on time and within the approved budget.',
  'Give {team} a simpler, more reliable way to work with {thing}.',
  'Reduce manual effort in {thing} by at least a third.',
  'Complete the rollout to {region} without customer-visible disruption.',
];
const RISKS = [
  'Capacity: {team} is shared with two other programmes in the same quarter.',
  'Dependency: {thing} relies on a third party outside our control.',
  'Change fatigue: users are absorbing two other rollouts this year.',
  'Data quality: legacy sources in {thing} are inconsistent and will need cleansing.',
  'Regulatory: interpretation for {region} may change mid-project.',
];
const STEPS_PLAIN = [
  'Confirm the change window with {team} and post it in the program channel.',
  'Take a snapshot of the current configuration of {thing} and attach it to the change ticket.',
  'Notify the on-call engineer and the support rota that the change is starting.',
  'Apply the change to {env} first and verify the health checks.',
  'Apply the change in production in the agreed order.',
  'Watch the dashboard for {metric} for at least 30 minutes.',
  'Confirm with {team} that the acceptance checks pass.',
  'Post the completion note with links to evidence.',
];
const STEPS_CODE: [string, string][] = [
  ['Check the current state before making any changes.', 'kubectl get pods -n platform --sort-by=.status.startTime\nkubectl rollout status deploy/api -n platform'],
  ['Take a snapshot so we can roll back.', 'aws rds create-db-snapshot --db-instance-identifier core-primary \\\n  --db-snapshot-identifier pre-change-$(date +%Y%m%d%H%M)'],
  ['Apply the change in staging and confirm the health endpoints.', 'terraform plan -out=tfplan -var-file=staging.tfvars\nterraform apply tfplan\ncurl -fsS https://staging.internal/healthz'],
  ['Shift traffic gradually and watch the error rate.', 'argocd app set api --parameter canary.weight=10\nargocd app sync api'],
  ['Verify and record the result.', 'curl -fsS https://api.internal/healthz | jq .status'],
];
const ROLLBACK = [
  'If error rate exceeds {pct}% for five minutes, stop and roll back to the previous version.',
  'Rolling back is safe at any point before step 5; after that, contact the incident lead first.',
  'Record the reason for the rollback in the change ticket and notify {team}.',
];
const OVERVIEW_LINES = [
  'This page is the single place where we describe how {subj} works day to day. Keep it short and keep it current.',
  'Use this as the starting point when onboarding someone to the project. Links to the detailed documents are in the Files tab.',
  'The aim is that anyone on {team} can pick up the process without a walkthrough.',
];
const PRINCIPLES = [
  'Prefer small, reversible changes over big-bang releases.',
  'Write decisions down where the whole team can find them.',
  'Every task has one owner, even when many people help.',
  'Escalate early; surprises are more expensive than bad news.',
  'If it is not in the tracker, it is not planned.',
  'Done means documented, handed over and measured.',
];

function mkFill(i: NoteInput, rng: Rng) {
  const ctx: FillCtx = { pools: i.vocab.pools, subj: projectSubject(i.projectTitle), proj: i.projectTitle };
  return (s: string) => fill(s, rng, ctx);
}

function dateLabel(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function buildNote(i: NoteInput): J[] {
  const rng = createRng(i.seed);
  const f = mkFill(i, rng);
  const names = i.people.length ? i.people : ['The team'];
  const owner = () => rng.pick(names);
  const out: J[] = [];
  switch (i.kind) {
    case 'meeting': {
      out.push(bP(rich('Date: ', dateLabel(i.daysAgo))));
      out.push(bP(rich('Attendees: ', rng.sample(names, Math.min(names.length, rng.int(4, 7))).join(', '))));
      out.push(bH('Agenda'));
      for (const a of rng.sample(['Status and milestones', 'Risks and blockers', 'Decisions needed', 'Budget and capacity', 'Stakeholder feedback', 'Next steps'], 4)) out.push(bNum(a));
      out.push(bH('Discussion'));
      for (const [lead, rest] of rng.sample(DISCUSSION, rng.int(4, 6))) out.push(bBul(rich(lead, f(rest))));
      out.push(bH('Decisions'));
      for (const d of rng.sample(DECISIONS, rng.int(2, 3))) out.push(bBul(f(d)));
      out.push(bH('Action items'));
      for (const a of rng.sample(ACTIONS, rng.int(3, 5))) out.push(bChk(`${owner()}: ${f(a)} by ${rng.pick(WEEKDAYS)}`, rng.chance(0.35)));
      break;
    }
    case 'rfc': {
      out.push(bP(rich('Status: ', rng.pick(['Draft', 'In review', 'Accepted', 'Accepted'])) ));
      out.push(bP(rich('Author: ', `${owner()} · Reviewers: ${rng.sample(names, Math.min(3, names.length)).join(', ')}`)));
      out.push(bH('Summary'));
      out.push(bP(f('We propose a change to how {subj} handles {thing}. The goal is to reduce operational risk and to make the behaviour observable and reversible.')));
      out.push(bH('Context'));
      out.push(bP(f('Today {thing} is handled differently by each team, which causes inconsistent results and manual hand-offs. The last two incidents were traced back to this. {team} asked for a single approach before the {region} rollout.')));
      out.push(bH('Proposal'));
      for (const l of rng.sample([
        'Introduce one documented path for {thing} and retire the alternatives.',
        'Make the new behaviour opt-in per team for the first four weeks.',
        'Emit metrics for {metric} so we can compare before and after.',
        'Provide a rollback that can be executed by the on-call without a code change.',
        'Review the outcome after the pilot with {team} before expanding.',
      ], 4)) out.push(bBul(f(l)));
      out.push(bH('Alternatives considered'));
      out.push(bBul(rich('Do nothing. ', f('Lowest effort, but the manual steps for {thing} remain and the risk grows with volume.'))));
      out.push(bBul(rich('Buy a product. ', f('Evaluated two vendors; both cover most needs but add licence cost and an integration with {thing2}.'))));
      out.push(bBul(rich('Incremental fix. ', f('Fixes the symptom only; we would revisit the same problem in {quarter}.'))));
      out.push(bH('Risks'));
      for (const r of rng.sample(RISKS, 3)) out.push(bBul(f(r)));
      out.push(bH('Open questions'));
      out.push(bChk(f('Who owns {thing} after go-live?'), true));
      out.push(bChk(f('Do we need sign-off from {team} before the pilot?')));
      out.push(bChk(f('What is the rollback time if {thing2} is unavailable?')));
      break;
    }
    case 'runbook': {
      out.push(bP(f(rng.pick(OVERVIEW_LINES))));
      out.push(bH('Before you start'));
      for (const l of ['You have an approved change ticket linked to this runbook.', f('You have confirmed the window with {team}.'), 'You have the on-call number for the incident lead.', f('You can access {env} and production.')]) out.push(bChk(l, rng.chance(0.2)));
      out.push(bH('Steps'));
      if (i.technical) {
        for (const [txt, code] of rng.sample(STEPS_CODE, 4)) {
          out.push(bNum(txt));
          out.push(bCode(code, 'bash'));
        }
      } else {
        for (const s of STEPS_PLAIN.slice(0, rng.int(6, 8))) out.push(bNum(f(s)));
      }
      out.push(bH('Rollback'));
      for (const r of rng.sample(ROLLBACK, 2)) out.push(bBul(f(r)));
      out.push(bH('Contacts'));
      for (const n of rng.sample(names, Math.min(3, names.length))) out.push(bBul(`${n}: primary contact (${rng.pick(['chat', 'phone', 'pager'])})`));
      break;
    }
    case 'retro': {
      out.push(bP(rich('Facilitator: ', `${owner()} · Participants: ${rng.sample(names, Math.min(names.length, 6)).join(', ')}`)));
      out.push(bH('What went well'));
      for (const l of rng.sample(WENT_WELL, 4)) out.push(bBul(f(l)));
      out.push(bH('What did not go well'));
      for (const l of rng.sample(WENT_BADLY, 4)) out.push(bBul(f(l)));
      out.push(bH('What we will change'));
      for (const l of rng.sample(CHANGES, 4)) out.push(bChk(f(l), rng.chance(0.4)));
      out.push(bH('Kudos'));
      out.push(bBul(`${owner()} for staying calm during the cutover and writing the clearest status notes.`));
      out.push(bBul(`${owner()} for turning around the review comments within a day.`));
      break;
    }
    case 'kickoff': {
      out.push(bP(f('This brief captures what we agreed at kickoff for {subj}. It is a living document: update it when scope or ownership changes.')));
      out.push(bH('Goals'));
      for (const g of rng.sample(GOALS, 3)) out.push(bBul(f(g)));
      out.push(bH('Scope'));
      out.push(bBul(rich('In scope: ', f('design, build, rollout and enablement for the first wave of users; migration of in-flight work; runbooks and reporting.'))));
      out.push(bBul(rich('Out of scope: ', f('a second phase for adjacent business units; changes to {thing} owned by other programmes.'))));
      out.push(bH('Roles'));
      const roles = ['Executive sponsor', 'Delivery lead', 'Technical lead', 'Change lead', 'Business owner'];
      roles.forEach((r, k) => out.push(bBul(rich(`${r}: `, names[k % names.length]!))));
      out.push(bH('Milestones'));
      for (const m of ['Plan approved by the steering committee', 'Pilot with the first group', f('Go / no-go for {region}'), 'Hypercare and handover']) out.push(bNum(m));
      out.push(bH('How we work'));
      out.push(bP(f('Weekly status on Thursdays, a fortnightly demo, decisions in the decision log, tasks in the Atlas lists. Ask in the project chat if anything is unclear.')));
      out.push(bH('Risks'));
      for (const r of rng.sample(RISKS, 3)) out.push(bBul(f(r)));
      break;
    }
    case 'index': {
      out.push(bP('Notes from our recurring meetings live below this page, newest last. Add a child page per meeting and link the action items to the matching tasks.'));
      break;
    }
    case 'decision': {
      out.push(bP(f('Decisions that shape {subj}. Newest at the bottom. Each entry has the decision, the reason and what it changes.')));
      const n = rng.int(4, 6);
      for (let k = 1; k <= n; k++) {
        out.push(bH(`D-${k}: ${f(rng.pick(['Phase the rollout by region', 'Keep {thing} manual for the pilot', 'Standardise on one approach for {thing}', 'Descope {thing2} from release one', 'Name {team} as owner of {thing}', 'Freeze scope two weeks before cutover']))}`, 3));
        out.push(bP(rich('Decision: ', f(rng.pick(DECISIONS)))));
        out.push(bP(rich('Why: ', f(rng.pick(['It limits the blast radius and gives us a real data point before we scale.', 'It removes a manual step without adding a new dependency.', 'The alternative costs more and delays {quarter}.', 'Both {team} and Security preferred this option in the review.'])))));
        out.push(bP(rich('Consequence: ', f(rng.pick(['The plan and the RACI were updated.', 'Two tasks moved to the backlog.', 'We re-check this after the pilot.', 'Communication to {region} leads went out the same day.'])))));
      }
      break;
    }
    default: {
      out.push(bP(f(rng.pick(OVERVIEW_LINES))));
      out.push(bH('Principles'));
      for (const p of rng.sample(PRINCIPLES, 4)) out.push(bBul(p));
      out.push(bH('Details'));
      out.push(bP(f('The standard approach for {thing} is described below. Exceptions are agreed with {team} and recorded in the decision log.')));
      for (const l of rng.sample(DISCUSSION, 3)) out.push(bBul(rich(l[0]!, f(l[1]!))));
    }
  }
  return out;
}

// ─── Excalidraw ────────────────────────────────────────────────────────────

interface ExEl extends J {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const PALETTE = ['#a5d8ff', '#b2f2bb', '#ffec99', '#ffc9c9', '#d0bfff', '#99e9f2'];
const STROKES = ['#1971c2', '#2f9e44', '#e8590c', '#e03131', '#6741d9', '#0c8599'];

export interface SceneInput {
  kind: string;
  seed: number;
  vocab: KindVocab;
  projectTitle: string;
  people: string[];
}

export function buildScene(i: SceneInput): { type: 'excalidraw'; version: 2; source: string; elements: ExEl[]; appState: J; files: J } {
  const rng = createRng(i.seed);
  const f = mkFill({ ...i, kind: i.kind, daysAgo: 0, technical: false }, rng);
  let n = 0;
  const base = (type: string, x: number, y: number, width: number, height: number): ExEl => ({
    id: `el${i.seed % 9973}_${++n}`,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: 1000 + n * 7919 + (i.seed % 1000),
    version: 1,
    versionNonce: 5000 + n * 104729,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
  });
  const els: ExEl[] = [];
  const textW = (s: string, fs: number) => Math.round(Math.max(...s.split('\n').map((l) => l.length)) * fs * 0.54);
  const text = (s: string, x: number, y: number, fs = 18, center = false, color = '#1e1e1e', w?: number): ExEl => {
    const lines = s.split('\n').length;
    const tw = w ?? textW(s, fs);
    const el = base('text', center ? x - tw / 2 : x, y, tw, Math.round(fs * 1.25 * lines));
    Object.assign(el, {
      strokeColor: color,
      text: s,
      originalText: s,
      fontSize: fs,
      fontFamily: 2,
      textAlign: center ? 'center' : 'left',
      verticalAlign: 'top',
      containerId: null,
      lineHeight: 1.25,
      autoResize: true,
    });
    els.push(el);
    return el;
  };
  const box = (x: number, y: number, w: number, h: number, label: string, ci: number, shape: 'rectangle' | 'ellipse' | 'diamond' = 'rectangle'): ExEl => {
    const el = base(shape, x, y, w, h);
    Object.assign(el, {
      backgroundColor: PALETTE[ci % PALETTE.length],
      strokeColor: STROKES[ci % STROKES.length],
      roundness: shape === 'rectangle' ? { type: 3 } : shape === 'ellipse' ? null : { type: 2 },
    });
    els.push(el);
    const lines = wrap(label, Math.max(8, Math.floor((w - 16) / 9.5)));
    const fs = 16;
    const th = lines.split('\n').length * fs * 1.25;
    text(lines, x + w / 2, y + (h - th) / 2, fs, true);
    return el;
  };
  const arrow = (x1: number, y1: number, x2: number, y2: number, dashed = false): ExEl => {
    const el = base('arrow', x1, y1, Math.abs(x2 - x1), Math.abs(y2 - y1));
    Object.assign(el, {
      points: [
        [0, 0],
        [x2 - x1, y2 - y1],
      ],
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: 'arrow',
      elbowed: false,
      strokeStyle: dashed ? 'dashed' : 'solid',
    });
    els.push(el);
    return el;
  };
  const sticky = (x: number, y: number, label: string, ci: number): void => {
    const lines = wrap(label, 22);
    const h = 28 + lines.split('\n').length * 22;
    const el = base('rectangle', x, y, 200, h);
    Object.assign(el, { backgroundColor: PALETTE[ci % PALETTE.length], strokeColor: STROKES[ci % STROKES.length], strokeWidth: 1, roundness: { type: 3 } });
    els.push(el);
    text(lines, x + 12, y + 14, 16);
  };
  const pool = (k: string) => i.vocab.pools[k] ?? [];
  const title = (s: string) => text(s, 40, 20, 28);
  const trim = (s: string) => s.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase());

  switch (i.kind) {
    case 'architecture': {
      title(`${i.projectTitle}: target architecture`);
      const cols: [string, string[]][] = [
        ['Clients', rng.sample(['Web app', 'Mobile app', 'Partner API', 'Admin console', 'Batch jobs'], 3)],
        ['Services', rng.sample(pool('thing'), 4).map(trim)],
        ['Data & platform', [...rng.sample(pool('sys'), 3)]],
      ];
      const centres: number[][] = [];
      cols.forEach(([head, items], c) => {
        const x = 60 + c * 330;
        text(head.toUpperCase(), x, 80, 14, false, '#868e96');
        const ys: number[] = [];
        items.forEach((it, r) => {
          const y = 120 + r * 110;
          box(x, y, 230, 80, it, c * 2 + (r % 2));
          ys.push(y + 40);
        });
        centres.push(ys);
      });
      centres[0]!.forEach((y, r) => arrow(290, y, 390, centres[1]![r % centres[1]!.length]!));
      centres[1]!.forEach((y, r) => arrow(620, y, 720, centres[2]![r % centres[2]!.length]!, r % 2 === 1));
      text('Dashed = asynchronous', 60, 580, 14, false, '#868e96');
      break;
    }
    case 'flow': {
      title(`${i.projectTitle}: process flow`);
      const steps = ['Request', f('Triage with {team}'), 'Approve?', 'Execute', f('Verify in {env}'), 'Close'];
      let x = 50;
      const y = 170;
      const mids: number[] = [];
      steps.forEach((s, k) => {
        const isDecision = s.endsWith('?');
        const w = isDecision ? 170 : 150;
        const h = isDecision ? 120 : 80;
        box(x, isDecision ? y - 20 : y, w, h, s, k, isDecision ? 'diamond' : 'rectangle');
        mids.push(x, x + w);
        x += w + 60;
      });
      for (let k = 0; k < steps.length - 1; k++) arrow(mids[k * 2 + 1]!, y + 40, mids[(k + 1) * 2]!, y + 40);
      text('No', 410, 310, 14, false, '#e03131');
      arrow(480, 280, 480, 360, true);
      box(400, 360, 180, 70, 'Return to requester', 3);
      text('Yes', 505, 130, 14, false, '#2f9e44');
      break;
    }
    case 'retro': {
      title(f('{proj}: retro board'));
      const cols: [string, string[], number][] = [
        ['Went well', rng.sample(WENT_WELL, 3), 1],
        ['To improve', rng.sample(WENT_BADLY, 3), 3],
        ['Actions', rng.sample(CHANGES, 3), 2],
      ];
      cols.forEach(([head, items, ci], c) => {
        const x = 50 + c * 260;
        const h = base('rectangle', x - 10, 80, 240, 560);
        Object.assign(h, { strokeColor: '#ced4da', strokeWidth: 1, roundness: { type: 3 } });
        els.push(h);
        text(head, x + 8, 92, 22, false, STROKES[ci]);
        items.forEach((s, r) => sticky(x + 8, 140 + r * 150, f(s), ci));
      });
      break;
    }
    default: {
      // journey
      title(`${i.projectTitle}: journey map`);
      const stages = ['Discover', 'Onboard', 'Adopt', 'Expand', 'Renew'];
      stages.forEach((s, k) => box(50 + k * 200, 90, 180, 60, s, k));
      const pains = rng.sample(WENT_BADLY, 4);
      const wins = rng.sample(WENT_WELL, 4);
      text('Pain points', 50, 190, 14, false, '#e03131');
      pains.forEach((p, k) => sticky(50 + k * 200, 215, f(p), 3));
      text('Opportunities', 50, 420, 14, false, '#2f9e44');
      wins.forEach((p, k) => sticky(50 + k * 200, 445, f(p), 1));
      break;
    }
  }
  return { type: 'excalidraw', version: 2, source: 'atlas-demo', elements: els, appState: { viewBackgroundColor: '#ffffff', gridSize: null }, files: {} };
}

function wrap(s: string, width: number): string {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 5).join('\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Render a (subset of an) Excalidraw scene as a small SVG data-URI thumbnail. */
export function sceneThumbnail(scene: unknown): string {
  const els = ((scene as { elements?: ExEl[] } | null)?.elements ?? []).filter((e) => !(e as J).isDeleted);
  const W = 640;
  const H = 360;
  if (els.length === 0) {
    return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#f8f9fa"/><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="18" fill="#adb5bd">Empty whiteboard</text></svg>`);
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const e of els) {
    const pts = (e as J).points as number[][] | undefined;
    const xs = pts ? pts.map((p) => e.x + p[0]!) : [e.x, e.x + (e.width || 0)];
    const ys = pts ? pts.map((p) => e.y + p[1]!) : [e.y, e.y + (e.height || 0)];
    minX = Math.min(minX, ...xs);
    maxX = Math.max(maxX, ...xs);
    minY = Math.min(minY, ...ys);
    maxY = Math.max(maxY, ...ys);
  }
  const pad = 24;
  const sw = Math.max(1, maxX - minX);
  const sh = Math.max(1, maxY - minY);
  const k = Math.min((W - pad * 2) / sw, (H - pad * 2) / sh);
  const ox = (W - sw * k) / 2 - minX * k;
  const oy = (H - sh * k) / 2 - minY * k;
  let body = '';
  for (const e of els) {
    const stroke = String((e as J).strokeColor ?? '#1e1e1e');
    const fillRaw = String((e as J).backgroundColor ?? 'transparent');
    const sw2 = Math.max(1, Number((e as J).strokeWidth ?? 1) * k);
    const x = e.x * k + ox;
    const y = e.y * k + oy;
    const w = (e.width || 0) * k;
    const h = (e.height || 0) * k;
    switch (e.type) {
      case 'rectangle':
        body += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(10, w / 8).toFixed(1)}" fill="${fillRaw}" stroke="${stroke}" stroke-width="${sw2.toFixed(1)}"/>`;
        break;
      case 'ellipse':
        body += `<ellipse cx="${(x + w / 2).toFixed(1)}" cy="${(y + h / 2).toFixed(1)}" rx="${(w / 2).toFixed(1)}" ry="${(h / 2).toFixed(1)}" fill="${fillRaw}" stroke="${stroke}" stroke-width="${sw2.toFixed(1)}"/>`;
        break;
      case 'diamond':
        body += `<path d="M${(x + w / 2).toFixed(1)} ${y.toFixed(1)} L${(x + w).toFixed(1)} ${(y + h / 2).toFixed(1)} L${(x + w / 2).toFixed(1)} ${(y + h).toFixed(1)} L${x.toFixed(1)} ${(y + h / 2).toFixed(1)} Z" fill="${fillRaw}" stroke="${stroke}" stroke-width="${sw2.toFixed(1)}"/>`;
        break;
      case 'arrow':
      case 'line':
      case 'freedraw': {
        const pts = ((e as J).points as number[][] | undefined) ?? [[0, 0], [e.width, e.height]];
        const d = pts.map((p, idx) => `${idx ? 'L' : 'M'}${(x + p[0]! * k).toFixed(1)} ${(y + p[1]! * k).toFixed(1)}`).join(' ');
        body += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw2.toFixed(1)}"${(e as J).strokeStyle === 'dashed' ? ' stroke-dasharray="6 5"' : ''}${e.type === 'arrow' ? ' marker-end="url(#ah)"' : ''}/>`;
        break;
      }
      case 'text': {
        const fs = Math.max(5, Number((e as J).fontSize ?? 16) * k);
        const lines = String((e as J).text ?? '').split('\n');
        const anchor = (e as J).textAlign === 'center' ? 'middle' : 'start';
        const tx = anchor === 'middle' ? x + w / 2 : x;
        lines.forEach((ln, idx) => {
          body += `<text x="${tx.toFixed(1)}" y="${(y + fs * (0.95 + idx * 1.25)).toFixed(1)}" text-anchor="${anchor}" font-family="Helvetica,Arial,sans-serif" font-size="${fs.toFixed(1)}" fill="${stroke}">${esc(ln)}</text>`;
        });
        break;
      }
    }
  }
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#495057"/></marker></defs><rect width="${W}" height="${H}" fill="#ffffff"/>${body}</svg>`,
  );
}

function svgUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
