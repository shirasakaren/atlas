/**
 * Kind libraries (part C): legal, research, supply-chain, customer, sales.
 * Hand-authored workplace chat for the Halcyon Global demo. Authoring contract:
 * ./chat-dsl.ts. Each kind is split into lex + two pool halves purely to keep
 * the file editable; they are merged at the bottom.
 */
import type { KindLib, Lex, Pools } from './chat-dsl';
import type { ProjectKind } from '../schema';

// ═══════════════════════════════════════════════════════════════════════
// LEGAL: compliance / privacy / contracts
// ═══════════════════════════════════════════════════════════════════════

const LEGAL_LEX: Lex = {
  feature: [
    'the clause library', 'the DSAR intake form', 'the consent banner', 'the matter intake form',
    'the contract approval workflow', 'the redline comparison view', 'the retention scheduler',
    'the vendor risk scorecard', 'the NDA self-serve template', 'the legal hold notifications',
    'the obligation tracker', 'the e-signature routing', 'the renewal alerts', 'the privacy request portal',
  ],
  component: [
    'the DSAR fulfilment queue', 'the record of processing activities', 'the contract repository',
    'the CMP integration', 'the sub-processor register', 'the data map', 'the deletion pipeline',
    'the clause playbook', 'the DPIA template', 'the Ironclad workflow', 'the OneTrust vendor module',
    'the retention schedule', 'the approval matrix', 'the legal hold register',
  ],
  tool: [
    'Ironclad', 'OneTrust', 'DocuSign', 'Icertis', 'Relativity', 'the CLM', 'SharePoint', 'TrustArc',
    'BigID', 'Okta', 'Excel', 'Word track changes', 'Jira',
  ],
  problem: [
    'an expired DPA', 'a missing sub-processor notice', 'an uncapped indemnity', 'a DSAR clock about to run out',
    'a stale RoPA entry', 'an auto-renewal nobody caught', 'a contract that contradicts the data map',
    'a cookie banner firing before consent', 'a transfer with no TIA behind it', 'a signature block with the wrong entity',
    'personal data lingering in backups', 'a redline that came back with the cap quietly deleted',
  ],
  metric: [
    'DSAR turnaround', 'NDA turnaround time', 'contract cycle time', 'share of vendors with a signed DPA',
    'consent opt-in rate', 'redline backlog', 'playbook adherence', 'overdue obligations',
    'days to close a DSAR', 'vendor review SLA', 'auto-renewals caught early', 'RoPA coverage',
  ],
  deliverable: [
    'the DPIA', 'the transfer impact assessment', 'the records of processing', 'the updated DPA template',
    'the retention schedule', 'the regulator response', 'the sub-processor list', 'the cookie audit',
    'the master services agreement', 'the policy refresh', 'the training module', 'the board privacy report',
  ],
  team: [
    'privacy', 'commercial legal', 'procurement', 'InfoSec', 'HR', 'IT', 'records management',
    'outside counsel', 'compliance', 'product counsel', 'marketing ops', 'internal audit',
  ],
  vendor: [
    'the payroll provider', 'the cloud hosting vendor', 'the translation agency', 'the call-centre BPO',
    'the analytics SaaS', 'the background-check vendor', 'the survey platform', 'the recruiting tool',
    'the e-signature vendor', 'the marketing automation vendor', 'the offsite shredding company', 'the benefits administrator',
  ],
  regulation: [
    'GDPR Art. 28', 'CCPA', 'UK GDPR', 'Schrems II', 'the EU AI Act', 'SOX', 'HIPAA', 'PIPL', 'LGPD', 'NIS2', 'DORA', 'ePrivacy',
  ],
  clause: [
    'the limitation of liability', 'the indemnity', 'the audit rights clause', 'the data return clause',
    'the termination for convenience', 'the governing law', 'the sub-processor flow-down', 'the breach notification window',
    'the assignment clause', 'the auto-renewal', 'the MFN', 'the exclusivity',
  ],
};

const LEGAL_P1: Pools = {
  // ───────────────────────── work ─────────────────────────
  work: [
    [
      "A: DSAR landed in the shared privacy inbox. Subject is a former employee, wants “everything you hold on me”. Received {date}, so statutory month ends {date2}. Logging it in {tool} now.",
      "B: Has ID been verified? We don't start the clock-stop conversation until we've asked, and we can only ask once, reasonably.",
      "A: Sent the verification request this morning. Passport scan or two utility-style documents, nothing more intrusive than that.",
      "C: Reminder that HR systems, the old Slack export and the recruiting tool are all in scope. Don't just search the HRIS and call it done.",
      "A: Already on the list. Third-party exemptions will be the fun part, there's a grievance file full of other people's names. ~r",
    ],
    [
      "A: Reviewing the DPA from {vendor}. Their sub-processor clause says they “may engage sub-processors at their discretion with notice on their website”. That is not an Art. 28(2) mechanism.",
      "B: Agree. We need prior specific or general written authorisation, with a real objection right. Website notice with no way to object is a no.",
      "A: Proposing 30 days' notice by email to the privacy contact, objection right, and termination without penalty if we object and they proceed anyway.",
      "B: Good. Expect them to push back to 10 days. Fallback is 15 and I'd hold there.",
    ],
    [
      "A: Question for the room: when we say “anonymised” in the data map for the analytics dataset, do we mean anonymised or pseudonymised? Because the key table still exists.",
      "C: Pseudonymised. If anyone with access to the key can re-identify, it's personal data. Full stop.",
      "A: Thought so. That changes the retention answer, the transfer analysis and probably the lawful basis for secondary use.",
      "B: Please update {component} and flag the three reports that call it anonymised in the privacy notice. We'll fix the notice before someone writes to the ICO about it.",
    ],
    [
      "A: Redline from {cust} came back on {clause}. They deleted the cap entirely and replaced it with “liability as provided by law”.",
      "B: lol no.",
      "A: Fallback per playbook is 12 months fees, super-cap for data breach at 3x. I can offer 2x if they accept mutual cap language.",
      "C: Check with finance before conceding anything above 2x, their insurer needs to be happy. And does the DPA breach carve-out sit inside or outside the cap? It's ambiguous in their draft.",
      "A: Outside, per their draft, which is the bit I really don't like. Ack on 2x, will hold the line on inside the super-cap. ~r2",
    ],
    [
      "A: RoPA update. After the last HR review we found {n} processing activities that weren't recorded: employee wellbeing app, whistleblowing hotline, building access logs. Art. 30 says all of them.",
      "B: Building access logs are the sneaky one. Biometric templates? Because that's special category and needs an Art. 9 condition.",
      "A: Fingerprint at the {city} office, yes. Consent is the stated basis and I do not love it. Employees can't freely consent when the alternative is the lanyard queue.",
      "B: Let's talk to HR about moving to the card-only option and deleting the templates. DPIA first, though.",
    ],
    [
      "A: Quick walkthrough of how we handle cross-border transfers from the EU entity to the US analytics vendor:\n1. DPF certification check (they are certified, verified on the list)\n2. SCCs module 2 as fallback in the DPA\n3. TIA on file, reviewed annually\n4. Supplementary measures: encryption at rest with our keys",
      "B: What if the DPF gets invalidated, like Privacy Shield did?",
      "A: Then the SCCs + TIA carry us. That's why we keep both. Belt and braces, boring and correct.",
      "C: I like belt and braces. Please also put the date of the last TIA review in the register so audit doesn't ask. ~r",
    ],
    [
      "A: Does anyone remember why our standard NDA has a 7 year term on confidentiality? Sales is asking for 2 and I want to know what I'm giving up.",
      "B: It was a trade secrets thing from the R&D deals. For commercial prospects with no tech exchange, 3 years is fine in practice.",
      "A: Okay, I'll add a trade-secret carve-out that survives for as long as the info stays a trade secret, and give them 3 years for everything else.",
      "C: That's the standard compromise. Put it in the playbook so we don't redo this next quarter. {thanks} ~r",
    ],
    [
      "A: Cookie audit results from {tool}: {n} third-party tags fire before the user touches the banner. Two are marketing pixels, one is a session replay tool.",
      "B: Session replay before consent is a bad look, and in some member states a clear violation.",
      "A: I've asked marketing ops to move all non-essential tags behind consent mode. Opt-in rate is going to drop, they know.",
      "C: It should. Right now the rate is high because the banner is lying by omission 😅",
    ],
    [
      "A: Legal hold issued for the {cust} dispute. Custodians: {n} people, plus the shared mailbox and the project channel. Suspended auto-delete for those mailboxes as of today.",
      "B: Slack too? Our retention is 90 days on DMs and the dispute window goes back a year.",
      "A: Exporting now, and I've paused the retention policy on those channels. IT confirmed on a call, I'm waiting on the written confirmation.",
      "B: Please get that in writing. Spoliation arguments love a phone call with no paper trail.",
    ],
    [
      "A: Data subject asked us to erase their account. Engineering says deleted. {tool} says active. Backups still have them for 35 days.",
      "B: Backups are fine if we document it, put them beyond use, and make sure restore doesn't reintroduce the data without re-running deletions.",
      "A: There's a deletion ledger for exactly that. Verified it replays on restore, ran a test in staging last week.",
      "C: Then tell them “erased from live systems, remaining in backups until {date}, then overwritten” and be honest about it. Regulators read honest answers kindly.",
    ],
    [
      "A: Ironclad workflow change: anything over {usd} now routes to the deal desk *and* legal. Before, it was one or the other, which is how an uncapped indemnity slipped through last quarter.",
      "B: Does it add days?",
      "A: Parallel routing, so no. It just means both can see the same redline at the same time, which I'd frankly like to have had in the first place.",
      "C: Perfect. Add a SLA reminder so nothing sits in someone's queue over a long weekend.",
    ],
    [
      "A: Question on EU AI Act exposure: the HR screening tool ranks CVs. Is that “high-risk” under Annex III?",
      "B: Employment and worker management is explicitly on the Annex III list, and CV-sorting is the textbook example. Yes, high-risk, unless the human review is genuine and decisive.",
      "A: So conformity assessment, risk management system, human oversight, logging, the works. Timeline is tight.",
      "B: I'll draft the gap analysis with product counsel. First question to the vendor is whether they consider themselves a provider or us the deployer. That determines half of this.",
    ],
    [
      "A: Records retention: finance wants to keep invoices for 10 years “just in case”. Statutory minimum in most of our entities is 6-7.",
      "B: Longer retention needs a purpose. “Just in case” isn't one, and the data subjects in those invoices are real people.",
      "A: I'll suggest 7 years plus 1, with a documented exception for the two jurisdictions that require longer. They'll grumble.",
      "C: They always grumble. Show them the number of DSARs that touched invoices last year, it is not zero 😬",
    ],
  ],

  // ───────────────────────── standup ─────────────────────────
  standup: [
    [
      "A: **Done:** DPA for {vendor} signed, sub-processor list attached\n**Doing:** first pass on {task}, three DSARs in flight (clock days 4, 11, 19)\n**Blocked:** waiting on IT for the HRIS export",
      "B: Day 19 one is the nervous one. Anything I can do to speed IT up?",
      "A: I'll escalate in the channel if it's not there by noon. ~r",
    ],
    [
      "A: Redlines: 5 open, 2 waiting on counterparty, 1 with finance for cap approval, 2 mine. Hoping to clear mine before lunch and spend the afternoon on {deliverable}.",
    ],
    [
      "A: Today: NDA queue (6), review {vendor} security addendum, prep for the {meeting} with {cust} outside counsel.\nTomorrow: out until {time} for a regulator webinar. Back-up is {B}.",
      "B: Got it. Send me the NDA numbers you're on so I don't duplicate. ~r",
    ],
    [
      "A: Standup, privacy edition. DSARs: {n} open, none over 25 days. RoPA: {pct} of departments reviewed. Cookie audit: remediation ticket open with marketing ops. Mood: caffeinated.",
      "B: Nice. What's the one over 25 days that isn't over 25 days?",
      "A: The one where we're waiting on identity verification. Clock is stopped and documented, in case anyone asks. ~r",
    ],
    [
      "M: Standup from me: {meeting} prep for {date}, need a decision from legal on the outside counsel budget by Friday. {@A} I'll pull you in on the regulator timeline after lunch.",
      "A: Sure. Draft timeline is in {wiki}, I'll update it with the new inspection date before we talk.",
    ],
    [
      "A: Yesterday: three vendor assessments. Two clean, one has no sub-processor list and a SOC 2 report from 2022. Today: chase them, move on {task}. Mood: mildly cursed.",
      "B: The SOC 2 from 2022 should be a hard stop. Bridge letter at minimum.",
      "A: Asked for a bridge letter and the current report. They said “what's a bridge letter”, so that's a good sign 🙃",
    ],
    [
      "A: Short one: heads down on the regulator response, 48 pages and counting, back after {time}. Anyone needing me, ping {B}.",
      "B: On it. And please eat something.",
    ],
  ],

  // ───────────────────────── blocker ─────────────────────────
  blocker: [
    [
      "A: Blocker: {vendor} won't sign the DPA without a liability cap of 100% of annual fees across everything including data breach. That's the opposite of our playbook.",
      "B: Then it's an escalation. Who's the exec sponsor on their side?",
      "A: Procurement says the account owner, who is not a lawyer and keeps saying “just sign it”.",
      "B: I'll loop in the GC. If they won't move, we pick a different vendor, I'm not putting that on paper. ~r",
    ],
    [
      "A: DSAR day 24 of 30. Still waiting on {team} to produce a mailbox export. Three reminders sent, two ignored.",
      "B: Escalating to their manager now. If we hit day 30 without the export, we send a partial response and explain the delay (we can extend by two months for complexity, but only with notice inside the first month).",
      "A: I'd rather not use the extension. It looks like we weren't ready.",
      "B: Agreed. Chase. Hard. ~r",
    ],
    [
      "A: Blocked on {deliverable}: need engineering to confirm where the personal data actually lives in the new platform and nobody can tell me. The data map is a diagram from 2021.",
      "B: A diagram from 2021 is a work of historical fiction.",
      "M: I'll get an engineering owner named by end of day. Without that the DPIA stalls and the launch date has no legal basis. {@A} please send me the exact questions so they can answer in one go.",
      "A: Questions in the doc, six of them. {thanks}",
    ],
    [
      "A: Signature block on the {cust} MSA names the wrong legal entity (they restructured in the summer). Signing under the old name makes the contract voidable on their side.",
      "B: Stop signing. Get a certificate of incumbency or a recent registry extract, and amend the preamble.",
      "A: Asked. Their legal says it'll take a week. Sales says the quarter ends in three days. 🙃",
      "B: The quarter ends, the contract is still there. Not the other way round. Tell sales I'll hold the line.",
    ],
    [
      "A: Cannot close {task}: the regulator's inspection request asks for processing records for 2022 and we only have RoPA entries from last year onward.",
      "B: Honest answer is we need to reconstruct from DPIAs and system change logs. It'll be slow.",
      "A: Do I request an extension? The deadline is {date}.",
      "B: Yes, today, with a proposed schedule. Silence is the only thing a regulator can't forgive. ~r",
    ],
    [
      "A: Blocker: marketing refuses to switch off the session replay tag until after the campaign on {date}, citing revenue. Legal view is that it's non-compliant today.",
      "B: Then it's a risk acceptance, and someone with authority needs to sign it. Not me, and not you.",
      "A: Drafting a one-page risk acceptance for the CMO. Includes the exposure estimate and what a regulator letter would look like.",
      "B: Good. Make the “what a regulator letter would look like” section very readable 😄",
    ],
    [
      "A: Waiting on outside counsel for a view on the Schrems II analysis for our India support vendor. They said Wednesday. It's Friday.",
      "B: Want me to ring their partner? We pay enough to be called back.",
      "A: Please. I'll hold the TIA in draft until their view comes in, so we're not signing off blind.",
    ],
  ],
};
const LEGAL_P2: Pools = {
  // ───────────────────────── decision ─────────────────────────
  decision: [
    [
      "A: Decision needed on the cookie banner: reject-all button at the same level as accept-all (our recommendation), or a “manage preferences” link (marketing's preference).",
      "B: Regulators in three member states have fined second-layer reject buttons. Same level, same colour weight.",
      "M: Going with equal-prominence buttons. Marketing ops to adjust the opt-in forecast and I'll tell the CMO. Closing this thread. ~pin:Decision ~rx:👍|✅",
    ],
    [
      "A: Proposal: we standardise on our own DPA template for all vendors under {usd} annual spend, and only accept vendor paper above that, with legal review.",
      "B: This cuts review time a lot. Vendors under that threshold rarely have leverage to push back anyway.",
      "C: Procurement is in favour as long as there's an exception path for the sole-source ones.",
      "A: Exception path: written request to privacy and the GC, 48h SLA. Agreed? ~rx:👍|✅",
    ],
    [
      "A: DPO question: do we appoint one group DPO or one per region? EU entities need one under GDPR Art. 37 anyway, and the UK entity wants its own.",
      "B: One group DPO with local contacts is workable if the DPO has real independence and reporting to the board. Duplication is expensive.",
      "A: I'll recommend one group DPO plus UK representative, and review in 12 months. Any objections?",
      "C: None from me. Make sure the reporting line is written in the charter, not implied. ~pin:Decision ~rx:👍|✅",
    ],
    [
      "A: Retention for support call recordings: 90 days default, 12 months if flagged for a complaint or dispute, deleted automatically after that. Ok with everyone?",
      "B: Fine with me. Please add the QA exception for the sampled calls, they're used for training and need a separate basis.",
      "A: Added: sampled calls kept 6 months with agent notice. {ack}. ~rx:👍|✅",
    ],
    [
      "A: Do we accept the mutual limitation of liability from {cust}, with data breach super-cap at 3x fees, or hold at 2x?",
      "B: 3x is within what finance and insurance told us they can absorb. And honestly, the relationship is worth more than one multiplier.",
      "C: I'd hold at 2x on the first renewal and give them 3x only if they accept our audit rights. Trading, not conceding.",
      "A: Going with C's approach: 2x opening, 3x in exchange for audit rights. ~rx:👍|✅",
    ],
    [
      "M: We need a call on outside counsel: panel firm A (cheaper, slower) or firm B (pricey, specialists in the regulator's practice) for the inspection response.",
      "A: Firm B. The regulator has opinions about format and they know them. Time matters more than the fee here.",
      "B: Agree, and let's cap the budget at {usd} with a weekly burn report.",
      "M: Decided: firm B, capped at {usd}, weekly burn to {@A}. Thanks both. ~pin:Decision ~rx:👍|✅",
    ],
    [
      "A: Proposal for the clause library: any clause marked “mandatory” in the playbook can't be edited in Ironclad without a reason code. Everything else is free-text.",
      "B: Good guardrail. Add a monthly report of the reason codes so we can see which fallbacks keep getting used. That's the actual playbook feedback.",
      "A: Done in the next sprint. Agreed? ~rx:👍|✅",
    ],
  ],

  // ───────────────────────── launch ─────────────────────────
  launch: [
    [
      "A: Go-live checklist for the new privacy request portal, {date}:\n- [x] DSAR form tested in EN/DE/FR\n- [x] ID verification flow signed off by privacy\n- [x] SLA timers in {tool}\n- [ ] Comms to employees\n- [ ] Runbook for the support team",
      "B: Comms drafted, waiting on HR to approve the wording around “identity verification”.",
      "A: Perfect. Doors open tomorrow at {time} 🚀 ~rx:🎉|🚀",
    ],
    [
      "A: Ironclad workflow for self-serve NDAs is live. Sales reps can generate a mutual NDA from the template and only come to legal for edits. Turnaround time for the standard case: zero.",
      "B: Zero? Zero hours?",
      "A: Zero minutes, it signs itself 😄 We're expecting 70% of NDAs to go this route. ~rx:🎉|🚀",
    ],
    [
      "A: Cookie consent v2 is rolling out to the EU storefronts today, staged by region. Start with Netherlands and Ireland, expand if opt-in is healthy.",
      "B: Marketing ops is watching the dashboard {dash}. Expect opt-in to land a bit lower than before. This is what compliance looks like.",
      "A: Good. If the banner misbehaves, the rollback is a flag, not a deploy. ~rx:🎉|🚀",
    ],
    [
      "A: Announcement: the new retention schedule goes live on {date}. Teams will see auto-deletion on the file shares after a 60-day grace period. Details and exceptions are in {wiki}.",
      "B: Reminder to owners: the legal hold register overrides everything, so if you know of a dispute, tell us now, not after the deletion job runs 😅",
      "C: Please do. Please. ~rx:🎉|🚀",
    ],
    [
      "A: Vendor risk assessment workflow cutover: every new vendor with access to personal data now goes through the {tool} questionnaire before procurement can issue a PO.",
      "B: PO block is live in the ERP. I tested it with a dummy vendor and it holds.",
      "A: 🚀 Please send feedback on the questionnaire wording after the first few go through, it's long. ~rx:🎉|🚀",
    ],
    [
      "M: Launch day for the training module. Mandatory for all {n}+ staff by {date}. Legal, can you confirm the quiz questions are final?",
      "A: Final. I removed the question about Art. 28 because nobody should be tested on that unless they've lost a bet.",
      "M: 😂 Sending the all-hands now. Thank you, team. ~rx:🎉|🚀",
    ],
    [
      "A: DPA refresh complete: all {n} top vendors now on the new template with the updated SCCs and sub-processor flow-downs. Last signatures came in this morning.",
      "B: That's the last of the Schrems II backlog, isn't it?",
      "A: It is. Closing the epic. Quietly proud. ~rx:🎉|🚀",
    ],
  ],

  // ───────────────────────── chatter ─────────────────────────
  chatter: [
    [
      "A: Who owns {component}? The permissions look off and I don't want to touch it.",
      "B: Records management. Ask {p1}.",
    ],
    [
      "A: Does “reasonable endeavours” mean anything in English law or is it vibes?",
      "B: It means something, and what it means depends on which judge you get. So, vibes with footnotes.",
    ],
    [
      "A: {ack}. I'll turn the redline around before {time}.",
    ],
    [
      "A: Remember the contract that auto-renewed for 3 years because nobody read the notice period? Found another one 🙃",
      "B: Please tell me it's not the same vendor.",
      "A: It's a different vendor with the same clause. Same energy.",
    ],
    [
      "A: Hot take: nobody has ever read a privacy notice start to finish, including the people who wrote it.",
      "B: I've read ours. Once. During a fever.",
    ],
    [
      "A: Anyone got the latest version of the sub-processor list? There are four files called “final”.",
      "B: {wiki}. The one called “final_v3_REAL” is the real one, I'm sorry.",
    ],
    [
      "A: Quick one, can we use the NDA template for a university collaboration?",
      "B: No, universities need the research-collaboration form, IP ownership works differently. Ping me and I'll send it.",
    ],
    [
      "A: Lunch? I need to be in a room that doesn't have the word “indemnity” on a whiteboard.",
      "B: Yes. {lunch}.",
    ],
    [
      "A: Is the new associate GC joining {meeting}? Want to make sure she's on the invite.",
      "B: Yes, I added her yesterday.",
    ],
    [
      "A: DSAR volumes are up {pct} this quarter. Apparently a data broker newsletter told everyone to send them.",
      "B: Template requests from some website, with the same typo in each. We just got three “Dear Sir/Madam, as of article 15 of the GDRP”.",
      "A: GDRP 😂",
    ],
    [
      "A: Can someone sanity-check my reading? “Provider shall not be liable for indirect losses” covers loss of profit or not?",
      "B: Depends on the jurisdiction and on whether the clause lists it expressly. In English law, loss of profit can be direct. I'd list it.",
    ],
    [
      "A: Friendly reminder that “just a quick question for legal” is how we got the {cust} dispute 😅",
      "B: And it was a very quick question, the answer being “don't”.",
    ],
    [
      "A: Contract signed! {ack}. Uploading to {tool} and tagging the obligations.",
      "B: Nice. Don't forget the renewal date, we owe the vendor a notice 90 days out.",
    ],
    [
      "A: Do we still need wet-ink signatures for the property lease?",
      "B: In that jurisdiction, yes. Print, sign, courier. It's like 1994 🖨️",
    ],
    [
      "A: Privacy awareness week is next month. Ideas for a fun poster that isn't a padlock?",
      "B: A cat that's clearly watching you. “Someone's always listening.” Maybe too creepy.",
      "C: Creepy is on-brand for privacy week 😄",
    ],
    [
      "A: Who has the signing authority for contracts above {usd}? The matrix says CFO or two directors.",
      "B: CFO, or two directors jointly. And the board for anything above {usd}.",
    ],
    [
      "A: Third NDA today with “mutual” crossed out and replaced by “one-way, in our favour”. Same counterparty. I admire the consistency.",
      "B: Persistence is a trait.",
    ],
    [
      "A: Does the new hire in {city} need the local-law addendum or are the standard terms enough?",
      "B: Addendum, they've got statutory notice rules the standard terms don't cover. I'll send the template.",
    ],
    [
      "A: Can we pause the weekly review on the 25th? The regulator call collides.",
      "B: Yes. Moved to Thursday, same room, same coffee.",
    ],
    [
      "A: A vendor just sent their “DPA” — it is 1 page and it says “we care deeply about your data”.",
      "B: Moving it to the folder called “aspirational”.",
    ],
    [
      "A: Anyone tracking the CPRA amendments? Think they change our opt-out wording.",
      "B: I am. They do. I'll write a short summary and send it around {day}.",
    ],
    [
      "M: Quick one for legal: can the {cust} announcement go out before the contract is countersigned?",
      "A: Not until signature. If it falls through we've told the market about a deal that doesn't exist. I'll chase for {day}.",
    ],
    [
      "A: Spreadsheet of active DPAs now has a column for “last reviewed”. Rows with “never” are now highlighted. It's a lot of orange.",
      "B: Orange is the colour of progress and avoidance.",
    ],
    [
      "A: Does anyone know if the Dutch DPA published guidance on legitimate interest for employee monitoring?",
      "B: Yes, in the autumn. It's strict, I'll dig out the link and put it in {wiki}.",
    ],
  ],

  // ───────────────────────── incident ─────────────────────────
  incident: [
    [
      "A: Possible personal data breach: marketing ops emailed a CSV of {big} newsletter subscribers (names + emails) to the wrong external address. Recalled within 4 minutes, unknown if opened.",
      "B: Clock check: the 72-hour window to notify the supervisory authority starts when we become aware. That's now, {time}. Opening an incident under {ticket}.",
      "A: Risk assessment started. Low-sensitivity data, small recipient set, recall attempted, so leaning no notification to individuals, but we log it either way.",
      "B: Log it, document the reasoning, and let's pull the recipient's mail domain to see if the message was delivered at all. ~r",
      "M: Thanks both. I want a one-paragraph summary for the exec team by end of day, factual, no speculation.",
    ],
    [
      "A: Regulator letter came in this morning. Request for information on our cross-border transfers, 14 days to respond.",
      "B: Ok, calm. We have the TIAs and the register. Outside counsel needs to see this today.",
      "A: Looped in. Draft response plan: who owns which section, timeline, privilege review. Putting it in {wiki}.",
      "C: Please also freeze changes to the transfers register until we've sent the response. Don't want to be explaining edits made during an inquiry.",
      "A: Freeze in place. Anyone who changes it needs my sign-off. ~r",
    ],
    [
      "A: Employee reports a customer called our support team and recited another customer's address. Looks like an identity verification failure rather than a leak.",
      "B: That's still a personal data breach if disclosure happened to an unauthorised person. How many calls?",
      "A: Reviewing recordings. So far one. Support has stopped using the old verification questions until we agree new ones.",
      "B: Document it, notify the affected individual, and propose a stronger verification script. We'll decide notification to the authority once we know it's a single case.",
    ],
    [
      "A: Whistleblower hotline report received about a manager sharing client data with a personal Gmail. Escalating to compliance and HR, outside counsel on standby.",
      "B: Preserve the evidence first. Legal hold on the manager's mailbox and devices, quietly. And do not confront anyone.",
      "A: Hold request sent to IT with a confidentiality instruction. Investigation scope to be agreed on {day}.",
      "C: I'll take the HR side. Do we have the policy on personal email in {wiki}? ~r2",
    ],
    [
      "A: Subpoena for customer records arrived, signed by a court clerk in another jurisdiction. Due in 10 days.",
      "B: Before anything leaves the building: is it valid in our jurisdiction? Mutual legal assistance might be required.",
      "A: Outside counsel says it needs a proper domestic process, and we should respond with an objection letter instead. Drafting.",
      "B: Good. Preserve the data, don't produce, and tell the customer if we're allowed to. ~r",
    ],
  ],
};

const LEGAL: KindLib = { lex: LEGAL_LEX, pools: { ...LEGAL_P1, ...LEGAL_P2 } };

// ═══════════════════════════════════════════════════════════════════════
// RESEARCH: R&D / ML / AI pilots
// ═══════════════════════════════════════════════════════════════════════

const RESEARCH_LEX: Lex = {
  feature: [
    'the retrieval reranker', 'the claims-triage classifier', 'the contract summariser', 'the support copilot',
    'the demand forecasting model', 'the semantic search prototype', 'the document extraction pipeline',
    'the guardrail layer', 'the voice-of-customer clustering', 'the anomaly detector', 'the code-review assistant',
    'the citation checker',
  ],
  component: [
    'the vector index', 'the eval harness', 'the prompt registry', 'the feature store', 'the annotation queue',
    'the embedding service', 'the training pipeline', 'the chunking step', 'the judge model', 'the PII scrubber',
    'the experiment tracker', 'the inference gateway',
  ],
  tool: [
    'Weights & Biases', 'MLflow', 'Jupyter', 'Label Studio', 'Hugging Face', 'PyTorch', 'Ray', 'Databricks',
    'pgvector', 'Slurm', 'Airflow', 'DVC',
  ],
  problem: [
    'data leakage between train and test', 'a hallucinated citation', 'a prompt regression after the model upgrade',
    'label noise', 'an eval set that has gone stale', 'GPU quota exhausted', 'retrieval missing the right chunk',
    'a judge model that likes its own answers', 'a drifting baseline', 'a run nobody can reproduce',
    'PII in the training corpus', 'a tokenizer mismatch',
  ],
  metric: [
    'hallucination rate', 'recall@10', 'faithfulness score', 'inter-annotator agreement', 'cost per 1k queries',
    'p95 latency', 'exact-match accuracy', 'F1 on the held-out set', 'groundedness', 'refusal rate',
    'human-override rate', 'tokens per answer',
  ],
  deliverable: [
    'the go/no-go readout', 'the evaluation report', 'the model card', 'the cost-to-scale model',
    'the data-handling memo', 'the pilot protocol', 'the red-team report', 'the benchmark results',
    'the annotation guidelines', 'the technical brief', 'the baseline comparison', 'the ablation table',
  ],
  team: [
    'applied research', 'ML platform', 'data engineering', 'the pilot business unit', 'security', 'legal',
    'the annotation vendor', 'product', 'responsible AI', 'finance', 'the domain experts', 'infra',
  ],
  dataset: [
    'the golden set', 'the held-out set', 'the 2,000-ticket sample', 'the synthetic set', 'the production-traffic replay',
    'the red-team prompts', 'the anonymised claims sample', 'the pilot cohort logs', 'the labelled contracts', 'the long-tail queries',
  ],
  model: [
    'the base model', 'the fine-tuned model', 'the small distilled model', 'the frontier model', 'the open-weights model',
    'the embedding model', 'the reranker', 'the judge model', 'the baseline classifier',
  ],
  stakeholder: [
    'the pilot sponsor', 'the business owner', 'the CFO', 'the CISO', 'the head of claims', 'the ops director',
    'the data protection officer', 'the steering committee',
  ],
};

const RESEARCH_P1: Pools = {
  work: [
    [
      "A: Eval update on {feature}. On {dataset}: {metric} went from {pct} to {pct2} with the new chunking. Recall@10 is up but faithfulness didn't move, so I think we're retrieving better and still writing wrong answers 🤔",
      "B: Is the judge model the same family as the generator? Judges prefer their own output.",
      "A: Same family, yes. Re-scoring a 200-item sample with a different judge and two humans now.",
      "C: Please report the kappa between humans and judge. If it's under 0.6 I'd not trust the automatic number for go/no-go. ~r",
    ],
    [
      "A: Ran the ablation. Retrieval only: acceptable. Retrieval + reranker: +{n} points on recall@10, +{ms} latency. Reranker + query rewriting: another +2 points, doubling the cost per query.",
      "B: Doubling the cost per query for 2 points is unlikely to survive the CFO.",
      "A: Agree. I'd ship reranker, skip rewriting, and put it in the “later, if the numbers justify” column.",
      "B: Put the cost-to-scale table next to it. Numbers beat adjectives.",
    ],
    [
      "A: Looking at the hallucination rate by query type:\n\n| type | n | halluc. |\n|---|---|---|\n| factual lookup | 412 | 3% |\n| multi-doc synthesis | 188 | 14% |\n| numeric / tables | 96 | 22% |\n| unanswerable | 120 | 31% |\n\nUnanswerable is the killer. It makes things up instead of saying “I don't know”.",
      "B: Abstention is a policy problem as much as a model problem. Do we reward refusal in the eval at all?",
      "A: Not enough. Adding a refusal-appropriateness score so a confident wrong answer hurts more than an honest “can't find it”.",
      "C: 👍 And make sure the pilot users see the same behaviour, not just the test harness. ~r",
    ],
    [
      "A: Data boundary question for the pilot: the claims sample has free-text notes with names and phone numbers. The scrubber catches maybe 97% in my tests. Is 97% enough to send it to an external model API?",
      "B: Not for an external API. For anything leaving our VPC we need zero tolerance or contractual zero-retention plus a DPA, and I'd want both.",
      "A: Then we stay inside the VPC with the open-weights model for anything with free text, and use the external model only for the synthetic set.",
      "B: That's the cleanest line. Document it in {deliverable} so nobody “just tries” the API on real data at 2am.",
    ],
    [
      "A: Fine-tune vs prompting update. Fine-tuned small model beats prompted frontier model on {metric} ({pct} vs {pct2}) at a tenth of the cost per 1k queries, but only on in-distribution. On the long tail it falls off a cliff.",
      "B: So the fine-tune is a specialist and the prompted model is a generalist. Can we route?",
      "A: A simple confidence-threshold router sends about 80% of traffic to the small model. Testing the cutoff now.",
      "C: Watch out for the routing becoming a second model to maintain. ~r",
    ],
    [
      "A: Annotation round 2 is back from {team}. Inter-annotator agreement is 0.71, up from 0.52 after we rewrote the guidelines. The disagreements are mostly “is a partial answer acceptable?”",
      "B: Define partial. Put three examples per label in the guidelines and escalate edge cases weekly.",
      "A: Adding them, and I'll drop a calibration batch into the next round to see if it sticks.",
    ],
    [
      "A: Reproducibility check: re-ran last week's best run from the commit hash and got {pct} instead of {pct2}. Same seed, same data version, different GPU type.",
      "B: Non-deterministic kernels on a different architecture. Annoying but normal. Report mean and std over 5 seeds, not a single run.",
      "A: Switching the eval harness to 5 seeds by default. Painful for the cluster bill, great for credibility.",
      "C: The credibility is worth it. Nobody remembers the cluster bill, everyone remembers the claim that didn't replicate. 😅",
    ],
    [
      "A: Cost-to-scale first pass: at pilot volume ({big} queries/day) the model costs about {usd} a month. At full roll-out it is 40x that. Most of it is output tokens.",
      "B: Can we shorten the answer format? Half the tokens are the model apologising.",
      "A: Tried a terse format: -38% tokens, user preference in a 40-person test was neutral. Worth keeping.",
      "M: Good find. Put that in the go/no-go readout as a lever, with the assumption stated. The finance team will want to see which numbers are measured and which are projected.",
    ],
    [
      "A: Red-team results: {n} jailbreak prompts out of {big} got something we classified as harmful or policy-violating. Most were multi-turn “role-play” ones.",
      "B: Can the guardrail layer catch them or do we need a model-level fix?",
      "A: Guardrail catches about two thirds. The remaining third needs a system-prompt change plus an output classifier.",
      "C: Re-run the same set after the change and report it as a regression suite, not a one-off. ~r",
    ],
    [
      "A: Potential data leakage: the held-out set has {n} near-duplicates of training items (same ticket, different forwards). Explains why the number looked too good.",
      "B: Classic. Dedup on content hash and on embeddings above 0.95 cosine, then re-split by customer, not by ticket.",
      "A: Re-splitting by customer. Expect the score to drop, the new number is the honest one.",
      "B: The honest number is the only one the readout should use. {thanks} ~rx:👍",
    ],
    [
      "A: Does anyone know why {model} refuses to answer anything with the word “claim” in it? Latency fine, accuracy fine, but it says “I can't help with that” for insurance claims.",
      "B: Probably an over-eager safety classifier on “claim”. Can you share five examples?",
      "A: Sent. All benign. It also refuses “policy” sometimes 😅",
      "B: Ha. Whitelist-by-context in the guardrail config, I'll look at it today.",
    ],
    [
      "A: Embedding model comparison on {dataset}: open-weights model A scores recall@10 of {pct}, model B {pct2}. B is 2.4x bigger and 3x slower to index.",
      "B: What's the re-index time for the full corpus?",
      "A: A: 45 minutes on 2 GPUs. B: nearly 3 hours. We re-index weekly, so A is tolerable and B isn't.",
      "B: Then A, unless B wins by a lot on the long tail. ~r",
    ],
    [
      "A: Pilot user feedback, first week:\n- “Saves me ten minutes a ticket”\n- “Cited a policy that doesn't exist”\n- “Why does it say ‘as an AI’”\n- “Loved the summary, hated the font”\nSo: useful, hallucinating, and slightly preachy.",
      "B: The citation one is the problem. Can we verify that every cited document ID exists before showing the answer?",
      "A: A citation checker is cheap: exact ID lookup, drop the answer if any ID is missing. Building it Monday.",
      "C: 👍 It shouldn't be possible to cite a document we don't have. ~r",
    ],
  ],

  standup: [
    [
      "A: **Yesterday:** finished the eval harness refactor, 5-seed runs now default\n**Today:** judge-model agreement check on {n} items, start writing the cost section\n**Blockers:** cluster queue (we're at 100% of GPU quota until {day})",
      "B: I can release one node from the research partition for a day. Message me which job. ~r",
    ],
    [
      "A: Day {n} of the retrieval work. Chunk size 512 vs 1024 is a coin flip, overlap matters more. Today: sweep overlaps, write up the table.",
      "B: Please sweep overlap AND document type. Tables and prose behave very differently.",
    ],
    [
      "A: Morning. Annotation vendor delivered batch 3. Today I'm doing spot-checks (5%) and computing agreement. If it's below 0.65 we send it back.",
    ],
    [
      "A: Standup: baseline classifier rerun on {dataset}, new numbers in {tracker}. Next: {task}. No blockers, but I would like it noted that I've been looking at the same confusion matrix for two days.",
      "B: Noted. What's it telling you?",
      "A: That “complaint” and “query” are the same class if you squint. Which, to be fair, is what the support team says too.",
    ],
    [
      "M: From me: pilot readout is on {date}. I need the draft by Wednesday with go/no-go criteria agreed in advance. {@A}, are the thresholds in {wiki} final?",
      "A: Draft thresholds are there, I'd like the business owner to sign off on the hallucination limit before we run the final numbers, so nobody can say we moved the goalposts.",
      "M: Agreed. I'll get it signed this week.",
    ],
    [
      "A: Yesterday: PII scrubber v2 (precision 99.1, recall 97.8). Today: try a rule-based second pass for phone numbers. Blocked: no one on {team} has replied about the data-sharing form.",
      "B: I'll nudge them in their channel and cc you.",
    ],
    [
      "A: Short one: out for the afternoon, long runs are queued on the cluster and should finish tonight. If a job dies, check the {tool} dashboard before restarting.",
      "B: Got it. If one dies I'll restart it with the same seed, I promise not to “just try a different one”.",
    ],
  ],

  blocker: [
    [
      "A: Blocked: security won't approve sending {dataset} to the external API until the DPA is signed. DPA is with legal, they said two weeks.",
      "B: We can't wait two weeks and I don't want to stall the whole pilot. Can we run the open-weights model in the meantime?",
      "A: It's about 6 points worse on the hard queries, but it keeps us moving and keeps the data inside. Doing that.",
      "M: Good call. I'll push legal to get the DPA done by {date}. If it slips, we report numbers from the open-weights model and say so plainly. ~r2",
    ],
    [
      "A: Eval set is stale. The product changed in {q} and about 20% of the golden answers are now wrong. I can't tell whether regressions are real or just old labels.",
      "B: Refresh with the domain experts. How many hours?",
      "A: Roughly 30 hours of expert time to relabel the changed 20%. {team} says they're booked until {date}.",
      "B: Then we escalate. Evaluating against wrong labels is worse than not evaluating. ~r",
    ],
    [
      "A: Cluster is full. My training job has been queued for 31 hours and the go/no-go is on {date}.",
      "B: Fair-share scheduler is punishing us for last week's sweep. I'll ask ML platform for a short priority bump.",
      "A: Please. In the meantime I'm shrinking the run to a subsample so we have *something* by Thursday.",
    ],
    [
      "A: Legal flagged that the training corpus contains emails from a customer whose contract prohibits ML use. I have no idea how many records.",
      "B: Quarantine the shard now, rebuild the index without it, and write down what was affected. We'll need to tell the customer, probably.",
      "A: Quarantined. Identifying affected records via the customer-ID field. This probably delays the readout by a week.",
      "M: Delay accepted. Do it properly and write the timeline of what was exposed when. I'll brief the sponsor. ~r",
    ],
    [
      "A: The pilot business unit hasn't given us the 50 users we promised. We have 12. Statistical power is nonexistent.",
      "B: With 12 users the CI on adoption is wider than the effect. We either extend the pilot or change what we claim.",
      "A: I'd rather extend two weeks than overclaim. But the sponsor wants the readout on the original date.",
      "M: I'll talk to the sponsor. Extension, with interim numbers presented on the original date, labelled as interim. ~r",
    ],
    [
      "A: Annotation vendor is {pct} behind schedule and sent labels with 0.41 agreement, which is noise.",
      "B: Reject the batch and ask for a calibration session, we can't pay for coin flips.",
      "A: Sent. They've asked if we can “just average” the labels. I said no, politely.",
    ],
    [
      "A: Model provider is deprecating the endpoint we benchmarked on, effective {date}. All our baselines are pinned to it.",
      "B: Freeze the numbers, archive outputs, and re-baseline on the replacement. Report both so the delta is visible.",
      "A: Doing it. It's a lot of re-runs and a nice reminder never to pin a research result to a moving target.",
    ],
  ],
};


const RESEARCH: KindLib = { lex: RESEARCH_LEX, pools: { ...RESEARCH_P1 } };

export const KINDS_C: Partial<Record<ProjectKind, KindLib>> = {
  legal: LEGAL,
  research: RESEARCH,
};
