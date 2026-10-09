/**
 * Content libraries shared by every kind of project: slot pools, the slot
 * filler, universal task-title templates, description building blocks and the
 * comment phrase books. Kind-specific vocabularies live in pmo-vocab-*.ts.
 *
 * Template syntax: `{slot}` is replaced from the kind's pools, then the common
 * pools. `{slot2}` re-rolls the same pool until it differs from `{slot}`.
 * Special slots: `{subj}` (project subject, "the Billing Engine"), `{proj}`.
 */
import type { Rng } from '../prng';

export type Stream = 'plan' | 'build' | 'verify' | 'rollout' | 'ops' | 'comms';
export const STREAMS: Stream[] = ['plan', 'build', 'verify', 'rollout', 'ops', 'comms'];

export type Flavor =
  | 'roadmap'
  | 'sprint'
  | 'launch'
  | 'backlog'
  | 'risk'
  | 'vendor'
  | 'discovery'
  | 'enable';

export interface KindVocab {
  pools: Record<string, string[]>;
  titles: Record<Stream, string[]>;
  lists: Partial<Record<Flavor, string[]>>;
  /** Folder names for the Files tab (first few are used). */
  folders: string[];
  /** File name templates per folder-ish bucket, "name|ext". */
  files: string[];
  /** Note titles by note family. */
  notes: Partial<Record<'meeting' | 'rfc' | 'runbook' | 'retro' | 'kickoff' | 'decision' | 'brief', string[]>>;
  /** Whiteboard topics: [scene kind, title]. */
  boards: [string, string][];
}

export const FLAVOR_STREAMS: Record<Flavor, Record<Stream, number>> = {
  roadmap: { plan: 3, build: 3.2, verify: 1.5, rollout: 1.4, ops: 0.7, comms: 1 },
  sprint: { plan: 0.5, build: 5, verify: 2.5, rollout: 0.5, ops: 1, comms: 0.3 },
  launch: { plan: 1, build: 0.5, verify: 2.5, rollout: 4, ops: 1.5, comms: 2.5 },
  backlog: { plan: 1, build: 3, verify: 1, rollout: 0.3, ops: 3, comms: 0.5 },
  risk: { plan: 2.5, build: 0.5, verify: 3, rollout: 0.3, ops: 1.5, comms: 1.5 },
  vendor: { plan: 3, build: 0.5, verify: 1.5, rollout: 0.5, ops: 1, comms: 2.5 },
  discovery: { plan: 5, build: 0.6, verify: 1, rollout: 0.1, ops: 0.3, comms: 1.5 },
  enable: { plan: 1, build: 0.5, verify: 1, rollout: 2, ops: 1, comms: 5 },
};

export const FLAVOR_ICON: Record<Flavor, [string, 'blue' | 'yellow' | 'red' | 'green' | 'neutral']> = {
  roadmap: ['target', 'blue'],
  sprint: ['zap', 'yellow'],
  launch: ['rocket', 'green'],
  backlog: ['layers', 'neutral'],
  risk: ['shield-check', 'red'],
  vendor: ['package', 'yellow'],
  discovery: ['compass', 'blue'],
  enable: ['users-round', 'green'],
};

/** Fallback list names (used when a kind does not define a flavor). */
export const DEFAULT_LIST_NAMES: Record<Flavor, string[]> = {
  roadmap: ['Roadmap', 'Delivery plan', 'Program roadmap', 'Milestones'],
  sprint: ['Sprint {n}', 'Iteration {n}', 'Delivery sprint {n}'],
  launch: ['Launch readiness', 'Go-live checklist', 'Cutover plan', 'Release readiness'],
  backlog: ['Backlog', 'Backlog & tech debt', 'Parking lot', 'Icebox'],
  risk: ['Risks & compliance', 'Risk register', 'Audit evidence', 'Controls & sign-offs'],
  vendor: ['Vendor management', 'Procurement & contracts', 'Vendor onboarding'],
  discovery: ['Discovery', 'Requirements & discovery', 'Stakeholder alignment'],
  enable: ['Training & enablement', 'Change management', 'Comms & adoption'],
};

export const COMMON_POOLS: Record<string, string[]> = {
  region: [
    'EMEA', 'APAC', 'LATAM', 'North America', 'DACH', 'Nordics', 'UK & Ireland', 'Canada', 'ANZ', 'Iberia',
    'Benelux', 'Southeast Asia', 'Japan', 'Brazil', 'Middle East',
  ],
  team: [
    'Finance', 'Legal', 'Security', 'Support', 'Sales Ops', 'HR Business Partners', 'Procurement', 'Compliance',
    'Internal Audit', 'the regional leads', 'Customer Success', 'Data Governance', 'Treasury', 'Facilities',
    'the IT Service Desk', 'Product', 'Engineering', 'Marketing', 'the PMO', 'Operations', 'Risk Management',
    'Enterprise Architecture', 'the steering committee', 'Platform Engineering',
  ],
  doc: [
    'runbook', 'one-pager', 'decision record', 'RACI matrix', 'test plan', 'rollout plan', 'training deck', 'FAQ',
    'release notes', 'risk register', 'cutover checklist', 'architecture review pack', 'data dictionary',
    'SLA draft', 'budget model', 'status report', 'communication plan', 'dependency map', 'readiness scorecard',
    'handover document', 'exit criteria', 'onboarding guide', 'operating model',
  ],
  quarter: ['Q4', 'Q1', 'the FY27 planning cycle', 'the October release train', 'the next steering committee', 'the quarterly business review', 'the audit window', 'the November freeze', 'the board update', 'the mid-year review'],
  day: ['Thursday', 'end of week', 'Monday', 'tomorrow', 'Friday', 'next Tuesday', 'the end of the sprint', 'Wednesday', 'EOD', 'the next steering committee'],
  env: ['staging', 'UAT', 'pre-prod', 'the sandbox', 'the integration environment', 'the demo tenant'],
  pct: ['30', '40', '55', '60', '70', '75', '85', '90'],
  n: ['3', '4', '5', '6', '7', '8', '10', '12', '15'],
  amount: ['$18k', '$42k', '$75k', '$120k', '$210k', '$310k', '$1.2M', '$480k', '$65k', '$26k'],
  weeks: ['two', 'three', 'four', 'six', 'eight'],
  q: ['Q3 2026', 'Q2 2026', 'Q1 2026', 'Q4 2025', 'Sep 2026', 'Aug 2026', 'Oct 2026'],
};

/** Subject of a project ("Billing Engine Rewrite" → "the Billing Engine"). */
export function projectSubject(title: string): string {
  const t = title
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\b(Rewrite|Redesign|Migration|Consolidation|Program|Rollout|Overhaul|Initiative|Platform|Implementation|Upgrade|Modernization|Replatform|Automation|Optimization|Launch|Refresh|Remediation|Study|Pilot|Retirement|Replacement|Update|Management)\b\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const s = t.length >= 4 ? t : title;
  const lead = /^(the|a|an)\s/i.test(s) ? '' : 'the ';
  return `${lead}${s}`;
}

export interface FillCtx {
  pools: Record<string, string[]>;
  subj: string;
  proj: string;
}

const SLOT = /\{([a-z]+)(2?)\}/g;

export function fill(tpl: string, rng: Rng, ctx: FillCtx): string {
  const used: Record<string, string> = {};
  const pass = (s: string) =>
    s.replace(SLOT, (_m, name: string, two: string) => {
      if (name === 'subj') return ctx.subj;
      if (name === 'proj') return ctx.proj;
      const pool = ctx.pools[name] ?? COMMON_POOLS[name];
      if (!pool || pool.length === 0) return name;
      let v = rng.pick(pool);
      if (two && v === used[name] && pool.length > 1) v = pool[(pool.indexOf(v) + 1) % pool.length]!;
      if (!two) used[name] = v;
      return v;
    });
  let out = pass(tpl);
  if (out.includes('{')) out = pass(out); // pools may contain nested slots ("the {region} workforce")
  return out;
}

// ─── Universal task titles (apply to every kind) ───────────────────────────

export const UNIVERSAL_TITLES: Record<Stream, string[]> = {
  plan: [
    'Draft the {doc} for {subj}',
    'Confirm scope and RACI with {team}',
    'Agree success metrics for {subj} with {team}',
    'Size the {region} rollout and capture assumptions',
    'Run stakeholder interviews with {team}',
    'Publish the milestone plan for {quarter}',
    'Estimate effort for {thing} with the delivery leads',
    'Map dependencies between {thing} and {thing2}',
    'Write the business case addendum for {amount} of additional funding',
    'Prioritise the open requests from {team}',
    'Document the current-state process for {thing}',
    'Review the {doc} with {team} and collect comments',
    'Define the exit criteria for the {region} pilot',
    'Reconcile the budget forecast for {subj} with {team}',
    'Prepare the decision paper for the steering committee',
    'Identify owners for every open action from the last workshop',
  ],
  build: [
    'Implement {thing} for {subj}',
    'Spike: evaluate options for {thing}',
    'Refactor {thing} to remove the manual hand-off',
    'Add monitoring and alerting for {thing}',
    'Automate the weekly {doc} generation',
    'Fix intermittent failures in {thing}',
    'Build the {region} variant of {thing}',
    'Integrate {thing} with {thing2}',
    'Migrate the remaining configuration for {thing}',
    'Remove the legacy workaround for {thing}',
    'Harden {thing} against the edge cases found in {env}',
  ],
  verify: [
    'Dry-run the {doc} with {team}',
    'Sign-off review of {thing} with {team}',
    'Walk {team} through the acceptance checklist',
    'Validate {thing} end to end in {env}',
    'Run the regression pass on {thing} before the freeze',
    'Collect UAT feedback from {team}',
    'Re-test the fixes from the last review of {thing}',
    'Reconcile the results of the {region} pilot against the success metrics',
    'Peer review the {doc}',
    'Capture evidence for {thing} and file it in the shared drive',
  ],
  rollout: [
    'Roll out to the {region} pilot group',
    'Hold the go / no-go meeting for {region}',
    'Schedule hypercare rota for the first {weeks} weeks',
    'Prepare the rollback plan for the {region} cutover',
    'Freeze changes to {thing} ahead of the cutover window',
    'Cut over the {region} cohort to {thing}',
    'Confirm cutover owners and escalation contacts for {region}',
    'Switch {region} users over and monitor the first 48 hours',
    'Decommission the old version of {thing} once {region} is stable',
  ],
  ops: [
    'Hand over {thing} to {team} for ongoing support',
    'Update the on-call escalation path for {thing}',
    'Close out open risks in the risk register',
    'Triage the post-launch issue backlog with {team}',
    'Review the {pct}% threshold alert for {thing}',
    'Tidy up access reviews for {thing}',
    'Archive the working documents for {subj}',
    'Run the monthly health check for {thing}',
    'Write the operational handover for {team}',
  ],
  comms: [
    'Send the {quarter} status update to the steering committee',
    'Record a five-minute demo for {team}',
    'Write the FAQ for {region} leads',
    'Draft the announcement for {subj} and get it approved by {team}',
    'Publish the weekly update in the program channel',
    'Prepare the town-hall slides on {subj}',
    'Run the office hours for {team} questions',
    'Collect quotes and success stories from the {region} pilot',
    'Update the intranet page for {subj}',
    'Brief the executive sponsor ahead of the {quarter}',
  ],
};

// ─── Description building blocks ───────────────────────────────────────────

export const CONTEXT: Record<Stream, string[]> = {
  plan: [
    'We need a clear, written position on this before {team} can commit capacity. Today the details live in a few heads and an old slide deck.',
    'The steering committee asked for this ahead of {quarter}. Keep it short and decision-oriented: options, recommendation, what we need from whom.',
    'This unblocks the planning for {thing}. Once agreed it becomes the baseline we track against, so please be explicit about assumptions.',
    'Several teams have different mental models of how {thing} should work. This task aligns them on one version and records it.',
    'The last review surfaced gaps in how we scope {thing}. Capture the open questions here and resolve them with the owners.',
  ],
  build: [
    'Part of the workstream for {thing}. The design is agreed (see the decision log in Notes); this task is the implementation and the tests that go with it.',
    'This has been a manual step for too long. Automating it removes a recurring source of errors and saves {team} a few hours every week.',
    'Customers and internal users have hit this a handful of times. We have a reproducible case in {env}; the fix needs to be safe to ship behind a flag.',
    'We are replacing the old approach for {thing} with something that can be observed and rolled back. Keep the change small and reviewable.',
    'Follow-up from the architecture review: the current approach for {thing} will not scale to the {region} volumes, so we are changing it now rather than later.',
  ],
  verify: [
    'Before we call {thing} done we need independent confirmation that it behaves as specified, with evidence we can show to {team}.',
    'This is the quality gate ahead of the cutover. If anything fails, record it as a new task and link it here; do not paper over it.',
    'The goal is to find surprises in {env}, not in production. Please test with realistic data and involve someone who has not seen the design.',
    'Audit and {team} both asked for traceable evidence of this check. Keep screenshots, queries and sign-offs in the Files tab.',
  ],
  rollout: [
    'The {region} cohort is next in the rollout sequence. We move only if the exit criteria from the previous wave are met and the rollback has been rehearsed.',
    'Coordinate with {team} so nobody is surprised on the day. The change window and the contact list are in the cutover checklist.',
    'This is a customer-visible change, so every step has an owner and a rollback. We watch the dashboards for the first 48 hours.',
    'We are sequencing the rollout region by region to limit the blast radius. Each wave has its own go / no-go.',
  ],
  ops: [
    'Housekeeping that keeps {thing} healthy after the launch. Small, boring and important: it prevents the next incident.',
    'Once the project team steps back, {team} owns this. Make sure the handover is complete enough that nobody needs to ask us.',
    'We keep finding the same class of issue in {thing}. This task fixes the cause instead of the symptom and updates the runbook.',
    'Recurring task from the post-launch review. Time-box it and record anything unexpected in the project notes.',
  ],
  comms: [
    'People hear about {subj} from several directions, so we want one consistent story. Keep the tone plain and say what changes for them and when.',
    'This needs sign-off from {team} before it goes out. Allow a couple of days for review and translation where needed.',
    'The audience is the {region} leadership group plus the people who will actually use {thing}. Lead with the benefit, then the dates.',
    'Part of the change-management plan. Adoption depends on people knowing what is coming, why it matters and where to get help.',
  ],
};

export const CRITERIA: Record<Stream, string[]> = {
  plan: [
    'Document reviewed and approved by {team}',
    'Assumptions and open questions listed explicitly',
    'Owners and dates assigned for every action',
    'Decision recorded in the project notes',
    'Risks added to the risk register with mitigations',
    'Shared with the steering committee before the next meeting',
    'Budget impact (if any) agreed with Finance',
  ],
  build: [
    'Change merged behind a feature flag with tests',
    'Metrics and alerts visible on the dashboard for {thing}',
    'Rollback path documented and tried in {env}',
    'No new critical findings from the security scan',
    'Runbook updated for {team}',
    'Works for the {region} configuration as well as the default',
    'Load test shows no regression against the baseline',
    'Peer review completed by someone outside the team',
  ],
  verify: [
    'All test cases executed and results recorded',
    'Evidence stored in the Files tab with a clear name',
    'Defects triaged; anything severe has its own task',
    'Sign-off captured from {team}',
    'Re-run after the fixes with a clean result',
    'Test data cleaned up in {env}',
  ],
  rollout: [
    'Go / no-go held and decision recorded',
    'Rollback rehearsed and timed',
    'Support rota briefed and contact list updated',
    'Stakeholders in {region} informed at least 48 hours ahead',
    'Dashboards watched for the first 48 hours and issues logged',
    'Old system access removed after the stabilisation period',
  ],
  ops: [
    'Handover accepted by {team}',
    'Runbook and escalation path up to date',
    'Alerts tuned; no noisy or unowned alerts left',
    'Open risks reviewed and closed or re-assigned',
    'Documentation archived in the project space',
  ],
  comms: [
    'Draft approved by {team}',
    'Sent to the agreed distribution list at the agreed time',
    'FAQ updated with the questions that came back',
    'Translation or localisation reviewed where needed',
    'Feedback collected and summarised in the next update',
  ],
};

export const NOTES_LINES = [
  'Related background is in the kickoff brief under Notes.',
  'Slack thread with the context is linked in the project channel.',
  'Previous attempt is described in the retro from last quarter.',
  'Owner for the final call is the project manager.',
  'Keep changes small; we can iterate after the pilot.',
  'If this slips, flag it in the weekly update rather than in the thread.',
  'Please keep the audit trail: link tickets and approvals here.',
];

export const BLOCKERS = [
  'Blocked: waiting for {team} to confirm the change window.',
  'Blocked: access to {env} has not been granted yet.',
  'Blocked: the vendor has not shared the updated specification.',
  'Blocked: budget approval for this item is still pending.',
  'Blocked: depends on a decision from the steering committee.',
  'Blocked: test data from {team} is incomplete.',
];

// ─── Comment phrase books ──────────────────────────────────────────────────
// `{a}` = mention of another member, `{m}` = mention of the persona,
// `{b}` = mention of a second member.

export const COMMENTS_TOP: Record<'start' | 'progress' | 'blocked' | 'question' | 'decision' | 'review' | 'done' | 'risk' | 'fyi' | 'backlog', string[]> = {
  start: [
    'Picking this up today. First pass of {thing} should be ready for review by {day}.',
    "I'll take this one. Starting with the open questions from the last workshop, then the draft.",
    'Started. Pairing with {a} on the tricky part tomorrow morning.',
    "Kicking this off now. I'll post a short update here once I have something to look at.",
    'On it. My plan: spike first, confirm the approach with {a}, then do the real work.',
  ],
  progress: [
    'Update: about {pct}% done. The main part of {thing} works in {env}; remaining effort is edge cases and documentation.',
    'Progress note: finished the first half, found two surprises in {thing} that I have written up in the notes. Nothing that moves the date.',
    "Quick status: draft is out for comments to {team}. I'll fold in feedback on {day}.",
    'Update: waiting on a review from {a}, otherwise this is ready. I added a short summary at the top of the description.',
    'This turned out larger than the estimate (my fault for not checking {thing2}). Revised plan: finish the core by {day}, follow up on the rest as a separate task.',
    "Made good progress today. {thing} now behaves the same in {env} and in {region}. I'll start on the tests next.",
    'Heads up: I changed the approach slightly after talking to {team}. The new version is simpler and avoids a manual step. Updated the description to match.',
  ],
  blocked: [
    'Blocked on {team} for {thing}. Pinged {a} in chat; I will chase again on {day}.',
    "I can't progress until we get access to {env}. Raised a request with the service desk, ticket is linked in the project channel.",
    'Waiting for the vendor to confirm the updated spec. Moving this to Blocked so it is visible in the weekly review.',
    "{m} could you help unblock the approval for this? It's the only thing holding up {thing} and we need it before {day}.",
    'This depends on a decision about {thing2}. Until then any work here is wasted. Added it to the steering committee agenda.',
    'Still blocked. {team} says the earliest slot is {day}. I have re-planned the downstream tasks accordingly.',
  ],
  question: [
    '{a} quick question: do we need {thing} before the {region} cutover, or can it follow in the next iteration?',
    'Do we know who owns {thing} after go-live? I cannot find it in the RACI.',
    '{b} is the {pct}% threshold in the spec a hard requirement, or an estimate? It changes how we build this.',
    'Can someone confirm whether {team} has signed off on this? I see the approval in the thread but not in the tracker.',
    '{m} do you want this in the {quarter} update, or is it fine to report it as on track?',
    'Question for {team}: is there an existing template for the {doc}, or should I start from scratch?',
  ],
  decision: [
    'Decision: going with the simpler option for {thing}. It costs us a little flexibility but halves the effort and the risk. Logged in the decision record.',
    "Decision from today's sync with {team}: we ship {thing} to {region} first and extend after the pilot. Updating the plan.",
    'We agreed to descope this for the first release and re-evaluate in {quarter}. Moving the follow-up work to the backlog.',
    'Outcome of the review: keep the current approach, but add the alerting from the second option. Recorded in the project notes.',
    'Decision: {team} will own {thing} after go-live. {a} to update the RACI.',
  ],
  review: [
    'Ready for review. Main change: {thing} now handles the {region} case. Please focus on the rollback path and the docs.',
    'Moving to In Review. Test results and evidence are attached in the Files tab. {a} could you take a look?',
    'Second pair of eyes please {a}. Specifically the assumptions in the second section.',
    'Review feedback incorporated; the remaining comments are cosmetic. Happy for this to merge once {a} confirms.',
  ],
  done: [
    'Verified in {env}. Closing this out. Thanks {a} for the quick review.',
    "Done. Summary and links are in the description. Handover to {team} is complete, so I'm marking it done.",
    'Shipped. No issues in the first 24 hours; will keep an eye on the dashboard until {day}.',
    'Confirmed with {team}: acceptance criteria are met. Closing.',
    'All checks green. Documented the follow-ups as separate tasks so this one can close cleanly.',
  ],
  risk: [
    'Flagging a risk: if {team} cannot free up capacity before {day}, this slips into {quarter}. Mitigation: we start with the smaller scope and add the rest later.',
    'Risk: {thing} has a single owner today. I have asked {a} to shadow so we have cover during the rollout.',
    'Early warning: the dependency on {thing2} is not as stable as assumed. Suggest we add a contingency of a week.',
    'Raising this in the risk register as well. Impact is medium, likelihood rising; mitigation is in the description.',
  ],
  fyi: [
    'FYI {a}, {team} confirmed the new date. Nothing to do on your side for now.',
    'For visibility: the {region} leads have agreed to the proposed approach. Notes in the project space.',
    'Link to the latest {doc} is in the Files tab. It supersedes the version in the old thread.',
    'Small heads-up: the change window moved to {day}. Updated the calendar invite.',
  ],
  backlog: [
    'Not scheduled yet. Parking this here until {quarter} planning; shout if it becomes urgent.',
    'Added a few details from the last conversation with {team}. Needs a decision on priority before anyone starts.',
    'Nice to have rather than must have. Re-evaluate once {thing} is stable.',
    '{m} you mentioned this in the steering notes; do you want it pulled into the current cycle?',
  ],
};

export const COMMENTS_REPLY: string[] = [
  'Thanks, that works for me.',
  "Confirmed. I'll update the plan.",
  "Good catch. I've added a follow-up task for it.",
  "Agreed. Let's park it until after {quarter}.",
  'On it. Will have an answer by EOD.',
  'I checked with {team}: they are fine with that.',
  'Done, see the updated {doc}.',
  'Can we pair on this tomorrow? Fifteen minutes should be enough.',
  'Makes sense. One caveat: {thing} still needs to be re-tested after this.',
  'Understood. I will keep {a} in the loop.',
  '+1, same here. Happy to go with that option.',
  "Let me double check and come back to you by {day}.",
  'Perfect, thank you. That unblocks me.',
  "I'd rather not change that now. Can we revisit after the pilot?",
  'Noted. I will mention it in the weekly update.',
  'Great, merging once the checks are green.',
  'Agreed. Marking the related task as done.',
  'Sounds good. Will you add it to the decision log or shall I?',
  'That matches what I saw in {env}. Thanks for confirming.',
  'Fair point, I had not considered {region}. Updating now.',
];

/** Comments the persona writes herself (project managers nudge a lot). */
export const COMMENTS_MAYA: string[] = [
  'Thanks for the update. Please keep the date in the tracker accurate so I can report it on Thursday.',
  "Approved from my side. {a} please go ahead.",
  'Can we make sure {team} is looped in before this goes out? I do not want a surprise in the steering committee.',
  "Good progress. What do you need from me to close this by {day}?",
  'Escalating this to the sponsor today. If you have numbers on the impact, drop them here.',
  'Let us descope if we have to, but I need a clear recommendation by {day}.',
  'I will take the action to talk to {team}. Will report back here.',
  'Nice work {a}. Adding this to the {quarter} update as a highlight.',
];

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
