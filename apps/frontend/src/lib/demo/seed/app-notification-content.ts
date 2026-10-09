/**
 * Hand-written phrase libraries for the persona's notification inbox.
 * `{project}`, `{key}`, `{who}` placeholders are filled by the seeder.
 */

/** Chat messages that @mention Maya (body of CHAT_MENTION notifications). */
export const CHAT_MENTION_LINES = [
  '@Maya can you confirm the cutover date before Thursday\'s steering? Legal wants it in writing.',
  '@Maya the vendor sent over the revised SOW. I dropped it in Files, can you take a look when you have a minute?',
  '@Maya +1 on pushing the UAT window by a week. Want me to update the plan and re-circulate?',
  '@Maya who owns the comms plan for the pilot group? Compliance wants to review it before it goes out.',
  '@Maya quick one: are we still on for the go/no-go on the 14th, or did the dependency on {project} slip?',
  '@Maya heads up, the risk register has two new reds on {project}. Can we talk through them in standup?',
  '@Maya I updated the RACI like you asked. Mind sanity-checking the approver column?',
  '@Maya thanks for unblocking the access request, that saved us a day.',
  '@Maya are you able to join the 3pm with finance? They are asking about the Q4 forecast for {project}.',
  '@Maya the steering deck is in the shared folder. Slides 4 to 7 need your numbers.',
  '@Maya can you approve the change request? It is blocking two of the migration tasks.',
  '@Maya we should probably loop in security before the pilot starts. Can you set up the intro?',
  '@Maya the weekly status draft is ready, I left comments on the budget slide for you.',
  '@Maya sorry to ping you again, the vendor needs a decision on the licence tier by EOD.',
  '@Maya do you have the latest rollout calendar? Mine still shows wave 2 starting on the 3rd.',
  '@Maya great catch on the duplicate invoices, I raised it with AP and they are fixing the batch.',
  '@Maya can we move our 1:1 to tomorrow? The incident review is running long.',
  '@Maya reminder: training slots for the Toronto team close Friday. Can you nominate two people?',
  '@Maya the audit evidence folder is complete as of this morning. Can you do a last pass before we send it?',
  '@Maya we need an owner for the data-quality exceptions list. Happy to take it if you agree.',
];

export const NOTE_TITLES = [
  'Steering committee notes, week {wk}',
  'Decision log',
  'Kickoff notes',
  'Risk register review',
  'Retrospective: pilot wave 1',
  'Stakeholder map and comms plan',
  'Cutover runbook (draft)',
  'Vendor call notes',
  'Weekly status',
  'Open questions for legal',
];

export const WHITEBOARD_TITLES = [
  'Target operating model',
  'Cutover swimlanes',
  'Dependency map',
  'Rollout waves',
  'Stakeholder influence grid',
  'Journey map: current vs future state',
  'Risk heat map',
];

export const VOICE_ROOMS = ['Daily sync', 'War room', 'Design review', 'Office hours', 'Cutover bridge', 'Weekly planning'];

export const VOICE_MENTION_LINES = [
  'Asked for your input on the go-live checklist',
  'Wants you to confirm the rollback plan',
  'Pulled you into the cutover bridge',
  'Needs a decision on scope before the call ends',
];

export const BLOCKER_TITLES = [
  'Vendor sandbox access',
  'Security review sign-off',
  'Data migration dry run',
  'Environment provisioning',
  'Legal approval of the revised contract',
  'Finalise the RACI with stakeholders',
];

export const STATUS_NAMES = ['In Progress', 'In Review', 'Done', 'Blocked', 'Ready for QA', 'Awaiting Approval'];
