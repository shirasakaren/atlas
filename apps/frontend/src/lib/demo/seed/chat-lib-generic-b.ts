/**
 * Generic conversation pools, part B: release, incident, risk, access,
 * planning, retro, demo, question, feedback. Shared by every project kind and
 * channel, so only tokens (never hard-coded names/dates/projects) get concrete.
 * See chat-dsl.ts for the authoring contract.
 */
import type { Pools } from './chat-dsl';

const RELEASE: Pools['release'] = [
  // 1 - classic release note
  [
    "A: **{ver} is going out {day}** 🚀\n\nWhat's in it:\n- {taskname} ({task})\n- {task2}: fix for {problem}\n- {pr} dependency bumps, nothing scary\n\nRollout is 10% → 50% → 100%, with an hour between steps. I'll post after each. ~rx:🎉|🚀|🙌",
    "B: Do we have a rollback plan if 10% looks off?",
    "A: Yes, flag flip first, redeploy of the previous tag second. It's in the {doc}, section 4. {wiki}",
    "B: {ack}.",
  ],
  // 2 - now live
  [
    "A: {ver} is **live at 100%** as of {time}. No alerts, error rate flat, {metric} unchanged. Nice and boring, the way we like it. ~rx:🎉|🚀|🙌",
    "B: boring is the best compliment a release can get",
    "C: Can confirm {feature} works on my account. Closing {task}.",
  ],
  // 3 - rollback notice
  [
    "A: Heads up: we've **rolled back {ver}** to the previous build. {metric} regressed after the 25% step and we'd rather investigate calmly than live with it.",
    "B: Anything customer-visible?",
    "A: Only if you hit {feature} in the last 20 minutes, in which case it may have been slow. Nothing lost, no data impact.",
    "B: Good to know. I'll tell support to expect a couple of tickets.",
    "A: Thanks. Root cause is probably {pr}; I'll confirm and we'll re-cut as {ver}-rc2 once it's fixed.",
  ],
  // 4 - hotfix
  [
    "A: Hotfix incoming: {pr} fixes {problem} that's been biting {cust}. One-line change, tested against the repro in {task}. Merging now, deploying right after unless someone shouts.",
    "B: Shouting politely: can you wait for the {n}-minute smoke suite?",
    "A: Fair. Waiting. 🫡",
    "A: Smoke suite green. Deploying.",
    "A: Done. {sha} is live, repro no longer reproduces. Telling {cust} now.",
  ],
  // 5 - release train reminder (single turn)
  [
    "A: Reminder: the release train leaves **{day} at {time}**. Anything not merged and green by then waits for the next one. No heroics, no \"just one more fix\" 🚂",
  ],
  // 6 - smoke test results
  [
    "A: Post-release smoke test for {ver}:\n\n- login / logout ✅\n- {feature} ✅\n- export to CSV ✅\n- bulk edit on 5k rows ⚠️ slow ({ms} for the first page)\n- permissions check for guest role ✅\n\nEverything else passes. I'll open a ticket for the bulk edit slowness, not a blocker.",
    "B: ⚠️ one worth a ticket, agreed. Did you try it on the large dataset or just the demo one?",
    "A: Large one. The demo one is instant, which is how it got through.",
    "B: classic",
  ],
  // 7 - staged rollout update
  [
    "A: Rollout update for {ver}: **{pct} of traffic**. Error budget burn is normal, {metric} within {pct2} of baseline. Next step in an hour if it holds.",
    "A: Update: still holding. Moving to the next stage. 👀",
  ],
  // 8 - release notes asked for by Maya
  [
    "M: Can someone send me customer-ready notes for {ver} by {day}? Two or three bullets, no ticket numbers, plain language. Account managers are going to forward them as-is.",
    "A: Draft in the {wiki} page for the release. I'll trim it to three bullets and put it in this thread in a bit.",
    "A: Here you go:\n- {feature} is faster, especially for large accounts\n- Fixed an issue where exports could include duplicate rows\n- Admins can now see who changed what in the audit trail",
    "M: Perfect, that's exactly the register I wanted. Thank you.",
  ],
  // 9 - release freeze
  [
    "A: Code freeze for {ver} starts **{day} at {time}**. After that only fixes tagged `release-blocker` go in, and they need two approvals.",
    "B: What counts as a blocker? Asking because last time \"blocker\" included a tooltip typo.",
    "A: Fair. Blocker = data loss, security, outage, or a broken main flow. The tooltip typo is a {day2} problem.",
    "C: I'll add that definition to the {doc} so we stop re-arguing it.",
  ],
  // 10 - went wrong, fixed forward
  [
    "A: Quick one: {ver} has a bug where {feature} shows the wrong total for accounts with more than one currency. Affects about {n} accounts so far. Fix is {pr}, I'd rather fix forward than roll back since everything else in the release is fine.",
    "B: Agree on fix-forward. Is the wrong total just displayed, or also stored?",
    "A: Display only. The underlying data is right, I checked a sample of {n2} rows against the ledger.",
    "B: {ack}. Go ahead.",
    "A: Fix deployed. Refresh and the totals should match. Sorry about that one.",
  ],
  // 11 - changelog bullets with small celebration
  [
    "A: {ver} changelog, short and sweet:\n\n**Added**\n- {feature} ({task})\n\n**Fixed**\n- {problem} in {component} ({task2})\n- a typo that had been in the footer since forever\n\n**Removed**\n- the beta banner. We're out of beta. 🥳 ~rx:🎉|🚀|🙌",
    "B: the footer typo. SINCE FOREVER.",
    "A: Fourteen months. Nobody said anything!",
    "C: we all assumed it was a house style 😂",
  ],
  // 12 - release candidate asks for testers
  [
    "A: {ver}-rc1 is on staging. Looking for volunteers to bash on {feature} for {n} minutes each. Anything weird goes in the thread, anything very weird goes in a ticket.",
    "B: I'll take the permissions side.",
    "C: Taking exports and the audit trail.",
    "A: 🙏 That leaves anything involving dates in non-UTC timezones. Anyone? Please?",
    "D: Fine, I'm in {city} time anyway, I'll break it for you.",
  ],
  // 13 - post-release metrics
  [
    "A: Two days after {ver}: {metric} is better by {pct}, support tickets about {feature} are down to {n} from {n2}. Good outcome. Thanks to everyone who tested. ~rx:🎉|🚀|🙌",
    "B: Love that. Can we put the numbers in the {doc} for the next steering committee?",
    "A: Already there. {dash}",
  ],
  // 14 - hotfix needs approval from Maya
  [
    "A: {@me} we need your go-ahead for an out-of-cycle hotfix: {ver} patch for {problem}. Risk is low (one config path), blast radius is {cust} plus anyone using {feature}.",
    "M: Approved. Please post in #general when it's out and tell support before, not after.",
    "A: Will do. Deploying at {time}.",
  ],
  // 15 - release notes for internal tools
  [
    "A: Internal tooling release, {ver}: the admin console now lets you search by ticket id, and the nightly report job no longer double-sends on the first of the month. Both on {tracker}.",
    "B: The double-send. 🙏 I've been apologising to finance for it since spring.",
  ],
  // 16 - release blocked
  [
    "A: Not shipping {ver} today. {pr} didn't pass the load test: {ms} p95 against a target we promised to hold. New plan: fix, retest, ship {day}.",
    "B: Does anyone outside the team need to know?",
    "A: {@me} probably, since the {meeting} agenda mentions the date. I'll write two lines.",
    "M: Thanks for the warning. I'll move it on the plan and mention it as a one-day slip, not a risk.",
  ],
];

const INCIDENT: Pools['incident'] = [
  // 1 - full lifecycle part 1 (alert → all clear)
  [
    "A: is {component} down for anyone else? Getting timeouts since about {time}",
    "B: Yes, same here. Seeing 502s on {feature}.",
    "C: Datadog just paged. Opening {ticket}, I'm incident commander unless someone objects.",
    "C: Triage so far: error rate jumped from <1% to {pct} at {time}. Last deploy was 25 minutes before that, so not obviously related. Looking at dependencies.",
    "B: DB connections are pegged at the pool limit. {component} is waiting on the database, not the other way round.",
    "C: Good catch. Restarting the connection pooler, status update in 15 minutes.",
    "C: 15-minute update: pool restart helped, error rate down to {pct2}. Still watching. Mitigation is in, root cause TBD.",
    "C: **All clear** as of now. Error rate back to baseline for 20 minutes. Follow-up and postmortem on {day}. Thanks everyone. 🙏 ~rx:🙏|👍",
  ],
  // 2 - latency, rollback
  [
    "A: {metric} on {component} is climbing, {ms} and rising. Anyone deploy anything?",
    "B: I did, {pr} about 10 minutes ago. Looking.",
    "B: Reverted. Redeploying the previous build now. ETA 5 min.",
    "A: Latency dropping already. Thank you for the quick revert.",
    "B: My fault for shipping it right before lunch. I'll write up what happened.",
  ],
  // 3 - false alarm
  [
    "A: Alert says {component} is returning 500s but the dashboard looks fine to me. Anyone seeing it?",
    "B: Nothing on my side. Checking the alert definition.",
    "B: False alarm. The check was hitting a staging URL that got renamed this morning. Fixing the monitor; no customer impact.",
    "A: Phew. Thanks. Marking {ticket} as not-an-incident.",
  ],
  // 4 - maintenance window announcement
  [
    "A: Planned maintenance: **{day} {time}**, about {hours}. We're upgrading the database in {region}. Expect read-only mode for roughly 20 minutes and a few failed writes in that window, retried automatically.",
    "B: Does this affect the nightly import?",
    "A: Yes, it'll run late. I've moved it to start an hour after the window closes. Tracking in {ticket}.",
    "B: Great, thanks for thinking about the import.",
  ],
  // 5 - postmortem, deploy / config change
  [
    "A: **Mini-postmortem for {ticket}** (blameless, short version)\n\n**Impact:** {feature} unavailable for about {n} minutes, {pct} of requests failed.\n\n**Timeline**\n- 09:12 deploy of {ver}\n- 09:18 first alert, error rate climbing\n- 09:27 rollback started\n- 09:34 recovered\n\n**Root cause:** a config value changed format and the service silently fell back to a default that doesn't exist in prod.\n\n**Action items**\n- [ ] validate config at startup and fail the deploy, not the runtime ({B})\n- [ ] add the check to the canary step ({C})\n- [ ] alert on fallbacks being used ({A})",
    "B: Taking the first one. I'll have a PR up by {day}.",
    "C: Canary step is mine. Also adding a note to the {doc} so it's not tribal knowledge.",
  ],
  // 6 - postmortem, third party / certificate
  [
    "A: **Postmortem: {ticket}, expired certificate**\n\n**What happened:** the cert for the internal API gateway expired at 02:00. Auto-renewal had failed three weeks earlier and its alert went to an inbox nobody reads.\n\n**Impact:** nightly sync failed, morning dashboards were stale until {time}.\n\n**What we're doing:**\n1. send renewal failures to the on-call channel ({B})\n2. inventory every cert with an expiry date ({C})\n3. add a 30/14/7 day warning ({A})\n\nNo one is at fault; the system had a hole.",
    "B: Ack on number 1. It's embarrassing how simple the fix is.",
    "C: Starting the inventory, I suspect we'll find at least {n} more.",
  ],
  // 7 - status updates with stakeholder
  [
    "M: What's the status on {ticket}? Leadership is asking and I'd like to say something accurate.",
    "A: Currently degraded, not down. {feature} works, but {pct} of requests are slow. We have a mitigation in place and a fix in review.",
    "M: Great. ETA for full recovery?",
    "A: Best estimate {time}, confidence medium. I'll update you at {time} either way, even if it's \"no change\".",
    "M: Perfect. Sending that line up and I'll hold questions until after your update.",
  ],
  // 8 - third-party vendor outage
  [
    "A: Our email provider is having an incident, so none of the password reset or notification mails are going out. Their status page says \"investigating\". 🙄",
    "B: Is this why {cust} just emailed support?",
    "A: Probably. I'll post a banner in the app and queue the messages so they send once the provider recovers.",
    "B: Banner copy: \"Some emails are delayed. Nothing is lost, they'll arrive shortly.\" Short and calm.",
    "A: Using it. Thanks.",
    "A: Provider says resolved. Draining the queue now, {n} messages, should finish in a few minutes.",
  ],
  // 9 - wrong data incident
  [
    "A: The {dash} dashboard is showing zero for {metric} this morning. Real zero or broken zero?",
    "B: Broken zero. The overnight job failed halfway through and the table is partial.",
    "A: How bad? Anything customer-facing read from that table?",
    "B: Only the internal dashboard. I'm re-running the job, it'll be accurate in about {n} minutes. I'll tag {ticket} when it's done.",
    "B: Re-run complete, numbers match yesterday's trend. Dashboard is fine. I've added a row-count check so a partial table can't look like a real one.",
  ],
  // 10 - maintenance done
  [
    "A: Maintenance window complete. Database upgrade went to plan: {n} minutes of read-only, no failed writes beyond the expected retries. All services green. Thanks for your patience, everyone. ✅",
    "B: The import ran too, picked up cleanly at {time}.",
  ],
  // 11 - login failures after deploy
  [
    "A: Support is getting reports that people can't log in. Seems to be SSO users only.",
    "B: Was there a deploy to the {component}?",
    "A: Yes, {pr} at {time}. It changed the claims mapping.",
    "B: That'd do it. Reverting the mapping and redeploying. {ticket} is the incident.",
    "A: Confirming login works again for the SSO test account.",
    "B: Good. I'll write up what happened and why the pre-prod test didn't catch it. (Spoiler: test account has no group claim.)",
  ],
  // 12 - postmortem, near miss, with lighter note
  [
    "A: **Near-miss review: {ticket}**\n\nWe almost took down {component} by running a cleanup script against the wrong environment. The script asked \"are you sure?\" and I typed `y` without reading the hostname. It was a read replica, so nothing broke, but it could have.\n\n**Changes**\n- script now prints the environment in red and requires typing the environment name\n- prod credentials are no longer in the default shell profile\n- I'm buying lunch for the team 🥪",
    "B: The lunch is a fine action item, would recommend. ~rx:👍|😂",
    "C: Appreciate the honesty. This is how we actually learn.",
  ],
  // 13 - queue backlog
  [
    "A: Queue depth on {component} is {big} and growing. Normally it's under a hundred.",
    "B: Consumers are fine, but one message keeps failing and retrying forever. Poison message.",
    "A: Can we move it to the dead-letter queue?",
    "B: Done. Backlog's draining, about {n} minutes to catch up. I'll look at what was in that message once the fire is out.",
    "A: Thanks. Please add a retry cap to the list of follow-ups, this has bitten us before.",
  ],
  // 14 - status update cadence, calm voice
  [
    "A: **Update ({time})** on {ticket}: we've identified the cause (a bad index on a large table) and are rebuilding it. Queries are slower than normal but succeeding. Next update at {time}.",
    "A: **Update**: index rebuild is {pct} done. No change in customer impact. Next update in 30 minutes.",
    "A: **Resolved**: index rebuilt, query times back to normal. Postmortem to follow. 🙏",
  ],
  // 15 - brief "is it just me" that's just a VPN
  [
    "A: Is {tool} down? Spinning for me",
    "B: Works fine here. Are you on VPN?",
    "A: ...I was. Disconnected and it loads.",
    "B: The VPN is having a moment, it's on the status page. {runbook} has the workaround.",
    "A: Thanks, and sorry for the false alarm 😅",
  ],
];

const RISK: Pools['risk'] = [
  // 1 - raise and assess
  [
    "A: Raising a risk: {cust} wants {feature} before {date}, but {component} still depends on the {team} team's work, which hasn't started. If that slips a week, we slip.",
    "B: Likelihood? I'd say medium. They've been pulled onto other things.",
    "A: Medium-high, honestly. Impact is high because it's a contractual date.",
    "B: Then it goes on the register as amber trending red. Mitigation options: borrow someone, descope, or ask for the date to move.",
    "A: I'll draft all three with costs and send them to {@me} for the {meeting}.",
  ],
  // 2 - register update
  [
    "M: Risk register refreshed, {n} open, {n2} closed since last time. New this week:\n- vendor lead time on {deliverable} (**amber**)\n- single point of failure on {component} knowledge (**amber**)\n- budget variance on {dept} spend (**green**, watching)\n\nOwners, please check your lines by {day}.",
    "A: Mine is the {component} one. I'll add a named backup by Friday, that should downgrade it.",
    "B: Budget line is mine. I'd call it green, but I've left a note on why.",
    "M: Thanks both. I'll mention the backup plan in the readout.",
  ],
  // 3 - stakeholder push-back
  [
    "A: I flagged the schedule risk on {feature}; just heard from {@B} that leadership thinks it's \"overstated\". Any thoughts on how to respond?",
    "B: I'd put numbers on it. Last two similar projects ran {pct} over. That's not a feeling, that's history.",
    "A: Good point. Pulling the actuals from the {doc} and adding them to the risk entry.",
    "B: And propose a trigger, \"if we haven't started by {date}, we escalate\". Makes the conversation about a date instead of an opinion.",
  ],
  // 4 - mitigation agreed
  [
    "A: Mitigation for the data migration risk, agreed in today's session:\n1. a full dry run on a copy by {date}\n2. rollback plan written and rehearsed\n3. freeze on schema changes from {date2}\n4. go/no-go with business owners {day}\n\nLikelihood drops from high to low if all four land. Impact stays high.",
    "B: Impact never really moves with migrations, does it.",
    "A: No. We just get better at not triggering it. 😄",
  ],
  // 5 - dependency risk, terse
  [
    "A: New risk: the {team} team's API won't be ready before our freeze. {task} is blocked on it.",
    "B: Probability?",
    "A: Their lead says 70/30 they make it. I've heard that number before.",
    "B: Plan B: stub the API and swap it later?",
    "A: Yes, that's the mitigation. Logging it.",
  ],
  // 6 - risk closed
  [
    "A: Closing the {component} capacity risk. Load test last night handled {pct} above forecast peak with room to spare. Evidence is linked in the register. {wiki}",
    "M: Great news, thank you. Archived on my side too. ~rx:🎉|👍",
  ],
  // 7 - risk acceptance
  [
    "A: Do we accept the risk that the old reporting module stays unpatched until {q}? It's low likelihood, contained to an internal network, and fixing it is {n} sprint-days we don't have.",
    "B: I'd accept it, with conditions: documented, owner named, and revisit on {date}.",
    "C: Security can live with that if it's not internet-facing. Please confirm it isn't.",
    "A: Confirmed, internal only. Writing the acceptance note now. Needs a sign-off from {@me}.",
    "M: Signed. Revisit date is in my calendar.",
  ],
  // 8 - quant risk
  [
    "A: Quick quant on the vendor risk: P(delay) about {pct}, cost of a two-week delay about {usd}. Expected loss is therefore roughly {usd2}. Doesn't sound much until you notice it's the same on three vendors.",
    "B: It adds up when you multiply by three. We should ask if any of them can commit to dates in writing.",
    "A: Asking. I'll report back by {day}.",
  ],
  // 9 - skeptical stakeholder asks
  [
    "M: Quick question on the risk list: what are the top three things that could stop us hitting {date}? Not the full register, just the three.",
    "A: 1) {team} dependency on {component}, 2) the {deliverable} sign-off timing, 3) holiday cover in the last two weeks.",
    "M: Brilliant, that's the slide. Anything I can do to unblock #1?",
    "A: A nudge to their director would help. Names in the register.",
    "M: On it.",
  ],
];
const ACCESS: Pools['access'] = [
  // 1 - simple grant
  [
    "A: Hi, could someone add me to the staging environment? I need to test {task}.",
    "B: Added you to the group. Can you retry?",
    "A: Works now. {thanks}",
  ],
  // 2 - security asks for justification
  [
    "A: Requesting admin access to {tool} for the {proj} workspace.",
    "B: Security here. Can you add a business justification, expected duration, and your manager's approval? Access to this one is reviewed quarterly.",
    "A: Justification: need to configure the integrations for {feature}. Two weeks, then I'll step down. Manager is {@C}.",
    "C: Confirming, I've approved the request on my side.",
    "B: Thanks. Granted for 14 days; it will expire automatically. Reminder goes to you before it does.",
  ],
  // 3 - VPN
  [
    "A: VPN keeps rejecting my credentials since the password rotation. Anyone else?",
    "B: Did you update the saved password in the client? It caches the old one and locks you out after three tries.",
    "A: ...no. That's it. 🤦",
    "B: Happens to everyone. I'll unlock the account, try again in a minute.",
    "A: In! Thanks.",
  ],
  // 4 - licence
  [
    "A: Do we have any spare {tool} licences? I've been asked to produce {deliverable} and my trial just ended.",
    "B: Let me check. We have two unassigned, but they're reserved for the contractors starting {date}.",
    "A: I'll need it for about three weeks. Can I borrow one and give it back?",
    "B: Yes, that works. Assigned. Please ping me when you're done and I'll release it.",
    "A: Will do, thank you!",
  ],
  // 5 - read-only access, scoped
  [
    "A: Could I get read-only access to the {dash} dashboards? Just the finance views, I don't need the raw tables.",
    "B: Read-only on the views is fine. I'll file it against {ticket} for the audit trail.",
    "B: Done. You'll get an invite email within a few minutes, accept it and you're in.",
    "A: Got it, I can see the views. {thanks}",
  ],
  // 6 - access removed after role change
  [
    "A: Reminder that {B} moved to a different team last week. Please review their access to {tool} and {component}; they shouldn't need either now.",
    "B: Thanks {A}. Removed both and left a note on {ticket}. If they need anything for handover they can request it.",
    "A: Good, much appreciated.",
  ],
  // 7 - production access emergency
  [
    "A: Need break-glass access to production for {ticket}, customer-facing issue.",
    "B: Granting temporary access for {hours}. Everything you do is logged. Please add the reason to the ticket.",
    "A: Already did. Thanks for the quick one.",
    "B: When you're done, tell me and I'll revoke early. Otherwise it expires on its own.",
  ],
  // 8 - access Q with docs
  [
    "A: Where do I request access to the shared drive for the {proj} project?",
    "B: Self-serve form, {wiki}. Pick \"project shared drive\" and the owner approves it. Takes about a day.",
    "A: Thanks. Do I need approval from my manager too?",
    "B: Not for the shared drive, only for production systems.",
  ],
  // 9 - guest/contractor
  [
    "A: Onboarding a contractor on {date}. What's the right way to give them access to the tracker without giving them everything?",
    "B: Create a guest account scoped to {proj}. Guests can see only what's shared with them, no org directory.",
    "A: And the VPN?",
    "B: Not needed for the tracker. Only if they touch the internal environments. In which case I'd want a ticket and an end date. 😉",
    "A: Understood, thank you.",
  ],
  // 10 - permissions error
  [
    "A: Getting \"403 forbidden\" opening the {doc}. I was able to see it last week.",
    "B: Permissions on that folder were tightened on {day}. Who owns it?",
    "A: I think {@C}. Pinging.",
    "C: Added you back, sorry, I over-tightened. Try again.",
    "A: Loads now! Thanks both.",
  ],
];
const PLANNING: Pools['planning'] = [
  // 1 - capacity
  [
    "A: {sprint} capacity: {n} people, but two are out Thursday and Friday, and {B} is on call. Realistic number is about {n2} points, not the {n3} we penciled in.",
    "B: Honest numbers, thank you. Last three sprints we committed to more than that and spilled over every time.",
    "A: Exactly. Let's commit to {n2} and have a stretch list ready.",
    "C: Stretch list should be small, bounded things. Nothing that needs a design decision.",
  ],
  // 2 - what drops
  [
    "A: Product wants {task} added to this sprint.",
    "B: What drops if we add it? It's an 8-pointer and we're full.",
    "A: Good question. Candidates: {task2} (5) or the {component} cleanup (3) plus the doc work (3).",
    "B: I'd move {task2}. Cleanup is the kind of thing that never gets scheduled again.",
    "A: Fine, I'll go back with that trade-off, in those words.",
  ],
  // 3 - estimate argument
  [
    "A: Estimate for {feature}: I'm saying 13. {B} says 8.",
    "B: I'm assuming the API already supports filtering. If not it's a 13.",
    "A: It supports filtering, but not on the field we need.",
    "B: Then 13. Good thing we asked.",
    "C: This is why we planning-poke. 🙂",
  ],
  // 4 - dependency map
  [
    "A: Dependency map for the quarter, rough draft:\n- {feature} needs {component} changes first\n- {component} needs the {team} schema approved\n- schema approval is waiting on a security review ({task})\n\nSo the critical path starts with a review nobody has scheduled yet.",
    "B: Oh no.",
    "A: I'll book it for tomorrow. 20 minutes, security, {team}, and me.",
    "B: Please. Everything else is gated on it.",
  ],
  // 5 - quarter plan, M
  [
    "M: Draft {q} plan is in the {doc}. Three themes, six commitments, four \"if time allows\". Please read the commitments column carefully: if your name is on a line you can't deliver, tell me this week, not in the last month.",
    "A: Read it. My line on {feature} is realistic if the {team} dependency lands by {date}. If not, it moves.",
    "M: Put that condition in the notes column so it's visible.",
    "A: Done.",
  ],
  // 6 - scope trade-off
  [
    "A: We can have two of three: the {feature} rewrite, the reporting export, or the permissions refactor by {date}. Not all three.",
    "B: Which two bring the most value to {cust}?",
    "A: Export and permissions. The rewrite is mostly invisible to them.",
    "B: Then rewrite waits. I'd rather say so now than quietly under-deliver on all three.",
    "C: Agreed. Capturing it in the {doc}.",
  ],
  // 7 - sprint kick-off message
  [
    "A: {sprint} goal: ship {feature} to internal users and stop leaking cases from {problem}. Board is up to date. Please pull from the top, not from whichever ticket looks fun. 🙏",
    "B: pull from the top. noted.",
  ],
  // 8 - buffer
  [
    "A: Can we put a buffer into the plan? Every previous estimate has been {pct} optimistic.",
    "B: Stakeholders will hate a buffer with that name. Call it \"integration and test\" and it'll survive.",
    "A: It is integration and test. I'm just adding more of it.",
    "B: See? 😄",
  ],
  // 9 - parking lot
  [
    "A: Parking lot from planning: (1) who owns the {component} on-call, (2) can we get a dedicated environment for QA, (3) whether {task} is really in scope. Owners please.",
    "B: I'll take 1.",
    "C: 2 is mine. I'll find out what a second environment costs.",
    "A: And 3, {@me}, I think that's a call for you.",
    "M: Yes. I'll decide by {day} and post it here.",
  ],
  // 10 - velocity honest
  [
    "A: Velocity by sprint for the last six: {n}, {n2}, {n3}, {n}, {n2}, {n3}. It's not a trend, it's a vibe.",
    "B: Tell me about the vibe. Roughly 20% of that is unplanned work.",
    "A: Then plan 80%. 20% of the sprint is reserved for \"stuff\".",
  ],
];
const RETRO: Pools['retro'] = [
  // 1 - structured
  [
    "A: Retro notes for {sprint}.\n\n**Went well**\n- code review turnaround dropped to under a day\n- demo prep was calm for once\n\n**Didn't**\n- scope crept on {task} after planning\n- two surprise dependencies on {team}\n\n**Try next**\n- freeze scope at the start of day 3\n- one named owner per dependency",
    "B: Love the \"one named owner\" rule. Shared ownership is how things fall through.",
    "C: Agreed. I'll add owners to the board column.",
  ],
  // 2 - light-hearted
  [
    "A: Retro vote: highlight of the sprint?",
    "B: When the build went green on the first try. We all stared at it for a full minute.",
    "C: I'm going with the Tuesday that {D} found the missing semicolon after {hours}.",
    "D: It was a comma. And I'm not discussing this. ~rx:😂",
    "A: Noted for the highlights doc. 😄",
  ],
  // 3 - action items
  [
    "A: Retro action items, owners and dates:\n1. {B}: write the on-call handoff template by {date}\n2. {C}: fix the flaky test behind {problem}\n3. {A}: ask {team} for office hours twice a week\n\nWe'll check these at the start of the next retro. If we don't, someone remind us.",
    "B: Will do. I'll start from the version the platform team uses.",
    "C: Flaky test fix is a small thing. Doing it today.",
  ],
  // 4 - process fix
  [
    "A: Retro theme: PRs sat in review too long. Median wait {hours}, worst case four days.",
    "B: Proposal: any PR over a day old gets a ping in the channel, no shame, just a nudge.",
    "C: And PRs under 200 lines. Big ones should be broken up.",
    "A: Both fine. We try them for two sprints and see if the median moves.",
  ],
  // 5 - disagreement
  [
    "A: Some people want to drop the daily standup in favour of async updates. Thoughts?",
    "B: I like the standup for the human contact. I'd cut it to three days a week.",
    "C: I'd go async but keep a weekly sync. Timezones make daily hard.",
    "A: Let's try three days sync, two days async for a month and measure whether blockers get found faster.",
    "B: Fair. Experiment it is.",
  ],
  // 6 - what went well
  [
    "A: Shout-outs from the retro: {B} for stepping up on the incident, {C} for the test plan that saved us a rollback, and everyone for staying civil during the scope debate. 🙌 ~rx:🙌|👏",
    "B: Aw, thank you. Genuinely.",
    "C: Team effort. I just wrote down what we were all thinking.",
  ],
  // 7 - what didn't
  [
    "A: What didn't go well: requirements changed twice after dev started. Both times we found out in {meeting}, not before.",
    "B: Both changes were reasonable in isolation. The problem is that nobody said what they displaced.",
    "A: So a rule: any change after kickoff gets a written trade-off before it's accepted.",
    "B: Yes. Nothing fancy, three lines in the ticket.",
    "C: Adding the template to the {doc}.",
  ],
  // 8 - retro format fun
  [
    "A: New retro format this time: sailboat. Wind = what pushed us forward, anchors = what held us back, rocks = risks ahead.",
    "B: I'm an anchor. Specifically the one that was the deploy pipeline.",
    "C: Rocks: {team} handoff, the {q} deadline, and me running out of holiday.",
    "D: wind: coffee ☕",
    "A: Everyone take {n} minutes to add stickies, then we'll cluster them.",
  ],
  // 9 - follow-up on past action
  [
    "A: Checking last retro's action items: 4 done, 1 in progress, 1 dropped. Dropped one was the \"weekly lunch-and-learn\". Be honest, did anyone want it?",
    "B: I wanted it in theory. I didn't want it at 12:30 on a Tuesday.",
    "C: Same. Try an optional recording?",
    "A: Recorded, short, and skippable. Deal.",
  ],
  // 10 - retro Maya
  [
    "A: {@me} one retro item for you: our requirement approvals take too long. Average {n} days from request to sign-off.",
    "M: That's fair. I've been the bottleneck on a few. Proposal: I do approvals twice a week, Tuesday and Thursday, and anything with a deadline gets a flag.",
    "A: That's perfect, thank you.",
  ],
];
const DEMO: Pools['demo'] = [
  // 1 - announcement
  [
    "A: **Demo day is {day} at {time}.** Each team gets 7 minutes. Show working software, not slides. 🖥️ Sign up in the {wiki} page. Snacks: {snack}.",
    "B: Signed up for {feature}. Is 7 minutes strict?",
    "A: Strict-ish. We have a bell. 🔔",
  ],
  // 2 - in 10
  [
    "A: Demo in 10 minutes, link is in the invite. Please mute when not speaking.",
    "B: Joining now. Is {p1} presenting first?",
    "A: I'm first. Please don't ask me why it needs a second spinner.",
  ],
  // 3 - sideways
  [
    "A: So. That demo.",
    "B: The one where the login page redirected to a login page that redirected to a login page?",
    "A: Yes. In my defence it worked on my machine, and on staging. At 9am.",
    "B: The best demo gremlin is a cache that's expired right before the meeting.",
    "C: I thought it was a very bold choice to demo \"what an infinite loop feels like\".",
    "A: We're calling it a performance demo. For performance art. 😭 ~rx:😂",
  ],
  // 4 - feedback after
  [
    "A: Feedback from today's demo, so far:\n- stakeholders loved the speed of {feature}\n- confusing label on the second tab\n- someone asked whether the export can include archived items (yes, but not by default)\n\nPlease add yours in the thread. I'll file anything actionable.",
    "B: The second tab label tripped me up too. \"Overview\" and \"Summary\" are the same word with extra letters.",
    "C: Filing {task} for the label. Five minutes of work.",
  ],
  // 5 - recorded demo
  [
    "A: Recording of today's demo is up: {wiki}. 12 minutes, chapters in the description. Great for anyone who missed it.",
    "B: Watching tonight. Heard the Q&A was good.",
    "A: It was. {cust} asked a very sharp question about permissions.",
  ],
  // 6 - M ask
  [
    "M: For {day}'s demo, can the team give me a two-line summary of what's shown and why it matters? I want to introduce each one properly instead of reading the title.",
    "A: Sure. Ours: \"{feature} now loads in under a second on large accounts. This was the top customer complaint last quarter.\"",
    "M: That's exactly the sort of line I meant. Thanks!",
  ],
  // 7 - dry run
  [
    "A: Dry run for the demo at {time}. We'll run it once, break it on purpose, and fix the broken bits.",
    "B: The last time we skipped the dry run, the demo found three new bugs live.",
    "A: Which is a data point. See you then.",
  ],
  // 8 - sandbag
  [
    "A: Please don't demo from production. Use the demo environment, it has fake data, no real customers, and nobody's email on the screen.",
    "B: Noted. Remember last time we put a real account on the big screen.",
    "A: I do. It was a lesson. 🙈",
  ],
];
const QUESTION: Pools['question'] = [
  // 1 - where is
  [
    "A: Where do we keep the {doc}? I swear I saw it last week.",
    "B: {wiki}, under \"Planning\". It moved when someone reorganised the space.",
    "A: Found it. {thanks}",
  ],
  // 2 - how do I (git)
  [
    "A: How do I undo my last commit without losing the changes?",
    "B: ```\ngit reset --soft HEAD~1\n```\nThat keeps everything staged. Use `--mixed` if you want it unstaged too.",
    "A: Perfect. And if I already pushed?",
    "B: Then don't reset, use `git revert` so you don't rewrite shared history.",
    "A: Good rule. Thanks.",
  ],
  // 3 - why does
  [
    "A: Why does {component} return a 404 for a resource that exists in the UI?",
    "B: Soft-deleted. The UI shows archived items, the API hides them unless you pass `include_archived=true`.",
    "A: Ugh, of course. Surprising default.",
    "B: Documented, but you'd have to know where to look. {wiki}",
  ],
  // 4 - knows
  [
    "A: Anyone know how the nightly export decides which accounts to include?",
    "B: That's a great question. {C} wrote it, so I'd ask them.",
    "C: Active in the last 90 days, plus anyone with an open ticket. The 90 is configurable in `export.yaml`.",
    "A: Brilliant, that's what I needed.",
  ],
  // 5 - quick sql
  [
    "A: Quick SQL question: what's the best way to get the latest row per customer?",
    "B: ```sql\nSELECT DISTINCT ON (customer_id) *\nFROM orders\nORDER BY customer_id, created_at DESC;\n```\nPostgres-specific, but fast with an index on `(customer_id, created_at)`.",
    "A: That's much nicer than my subquery. Thanks!",
  ],
  // 6 - who owns
  [
    "A: Who owns {component}? A customer found a bug and I don't know where to route it.",
    "B: Platform team. Their intake queue is {tracker}, or ping their channel.",
    "A: Thanks. I'll file there.",
  ],
  // 7 - how long
  [
    "A: How long does it usually take to get a new service account provisioned?",
    "B: Two business days if the form is complete. Longer if security asks questions. Put the owning team in the request, that's what usually slows it down.",
    "A: Good tip, thanks.",
  ],
  // 8 - tool tip
  [
    "A: Is there a way to see all tasks assigned to me across projects in one view?",
    "B: Yes, \"My work\" in the sidebar. You can group by project or by due date.",
    "A: Oh wow, I've been checking each project manually for months. 🤦",
    "B: Don't worry, you're in good company.",
  ],
  // 9 - what's the difference
  [
    "A: What's the actual difference between a spike and a task? I keep getting told off for mis-labelling.",
    "B: A spike answers a question and produces a decision or doc. A task produces working output. If the result of the ticket is \"we know X\", it's a spike.",
    "C: And spikes are time-boxed. If it's not, it's a project in disguise.",
    "A: Makes sense. Re-labelling {task} as a spike.",
  ],
  // 10 - when is
  [
    "A: When is the next release train? I need to know if {task} can make it.",
    "B: {day} at {time}. Cut-off for merged and green is 24 hours before.",
    "A: So I have until {day2}. OK, that's doable.",
  ],
  // 11 - does anyone
  [
    "A: Does anyone have a template for a decision log? I don't want to invent one.",
    "B: Mine: date, decision, context, options considered, who decided, review date. Table form works best. I'll drop it in the {wiki} page.",
    "A: That's the one I was hoping existed. Thank you!",
  ],
  // 12 - env var
  [
    "A: Local build fails with \"missing config value\" after pulling main. Did something change?",
    "B: Yes, {pr} added a required env var. Copy the new line from `.env.example`.",
    "A: That fixed it. Might be worth a note in the PR description next time. 🙂",
    "B: Fair. Added.",
  ],
  // 13 - M
  [
    "A: {@me} quick question: is the {deliverable} in scope for this phase, or next? Two people have told me opposite things.",
    "M: Next phase. It's in the plan for {q}. Sorry for the mixed messages, I'll make it clearer in the {doc}.",
    "A: Thanks, that clears it up.",
  ],
  // 14 - what does X mean
  [
    "A: Sorry, dumb question. What does \"soft launch\" mean here? Internal-only, or real customers with a flag?",
    "B: Real customers, small slice, behind a flag. Think 5%.",
    "A: Got it. Not dumb at all, we use that term inconsistently.",
  ],
  // 15 - regex
  [
    "A: Regex help: I need to match ticket ids like `ABC-123` in commit messages.",
    "B: ```\n[A-Z]{2,5}-\\d+\n```\nAdd word boundaries if you don't want it matching inside longer strings.",
    "A: That works, thank you. Yes, the boundaries were what I was missing.",
  ],
  // 16 - timezone
  [
    "A: Is the standup time UTC or local? The invite says {time} and I'm confused.",
    "B: Local to whoever created the invite. We're all in different places, so we use {city} time.",
    "A: OK, thanks. Setting up a world clock widget.",
  ],
  // 17 - how do I reset
  [
    "A: How do I reset my MFA device? I got a new phone.",
    "B: Self-service: {wiki} > Security > Reset MFA. You'll need your recovery code. If you don't have it, IT can do it after verifying your identity.",
    "A: I have the code somewhere. 😬 Thanks.",
  ],
  // 18 - dataset
  [
    "A: Which table is the source of truth for active customers: `accounts` or `customers_v2`?",
    "B: `accounts`. `customers_v2` is a legacy copy that stopped syncing in the spring. Both are in the {wiki} page.",
    "C: We keep meaning to delete it. Anyone who feels brave? 🙃",
  ],
];
const FEEDBACK: Pools['feedback'] = [
  // 1 - positive feedback
  [
    "A: Feedback from {cust} after the pilot:\n\n> \"The new {feature} has saved our team about an hour a day. Honestly the best change we've seen this year.\"\n> — {cust}, operations lead\n\nThank you to everyone who built it! 🙌 ~rx:🎉|🙌|👏",
    "B: That's brilliant to hear. Forwarding to the team.",
    "C: An hour a day!! Can we put it on the slide?",
    "A: Already asked for permission. 😄",
  ],
  // 2 - negative feedback and triage
  [
    "A: Support forwarded this from {cust}:\n\n> \"Exports time out for anything over 10,000 rows. We've had to split reports manually and it's a real pain.\"\n\nThis is the third time I've seen this complaint.",
    "B: Third time makes it a pattern. Filing {task} and linking the other two reports.",
    "A: Priority? I'd say high, it's blocking their month-end.",
    "B: High, agreed. I'll tell them we're on it and give them a date by {day}.",
  ],
  // 3 - disagreement on priority
  [
    "A: Feedback from {cust}:\n\n> \"Please add dark mode. Many of us work late and the white background hurts.\"\n\nI think it's a big ask, but there's demand.",
    "B: Demand is real, but nobody's churned over it. Compared to the export timeouts it's a P3.",
    "C: I'd bump it slightly. It's cheap with the new design tokens. Maybe {n} days of work.",
    "A: Compromise: schedule it for {q}, behind the export fix. Agree?",
    "B: Agree. Logging as {task}.",
  ],
  // 4 - thank you
  [
    "A: Quote from {cust} after the release:\n\n> \"The audit trail finally shows who changed what and when. Our auditors loved it.\"\n\nA big thank you to {B} for pushing for this when everyone said it could wait.",
    "B: Thank you! Glad it landed. Though to be clear, it was {C} who did the hard parts.",
    "C: Team effort. 🙌 ~rx:🙌|👏",
  ],
  // 5 - mixed
  [
    "A: Survey comments from this month:\n\n> \"Love the speed. Hate the new navigation, I can't find anything.\"\n> — {cust}\n\n> \"Navigation is cleaner. Missing the old shortcut for creating tasks.\"\n> — {cust2}\n\nSo: opposite opinions on the nav, one concrete ask.",
    "B: The shortcut is easy to fix. I'll file {task}. The nav is harder; I'd want usability data before touching it.",
    "A: Agreed. Can design run a short test?",
    "C: Yes, I'll set up five sessions next week.",
  ],
  // 6 - M
  [
    "M: {cust} pasted this in their QBR notes:\n\n> \"Support response time is excellent, but we still don't know when promised features will arrive.\"\n\nThe first half is a compliment to you all. The second half is on me and the roadmap comms. I'll fix it.",
    "A: The roadmap is clear internally but we haven't shared it. Happy to help with a customer-safe version.",
    "M: Yes please. One page, quarter-level, no dates we can't keep.",
  ],
  // 7 - feature request logged
  [
    "A: Request via support, {cust}:\n\n> \"Can we get a weekly digest of changes to the projects we follow? Email is fine.\"\n\nSounds sensible. Anyone else heard this?",
    "B: Two others, I'll link them. Think it's {n} days of work if we reuse the notification templates.",
    "A: Logging as {task}, labelled \"customer request\".",
  ],
  // 8 - praise for support
  [
    "A: Lovely note landed in the support inbox:\n\n> \"I reached out with a really confusing problem and {B} solved it in under an hour, and was kind about it. Thank you.\"\n> — {cust}\n\nWanted to share it with the channel. 💙 ~rx:💙|🙌",
    "B: That made my morning. Thank you for posting it.",
    "C: Well deserved!",
  ],
  // 9 - critical
  [
    "A: Not great: {cust} says \"we've reported the {problem} issue twice and heard nothing\".\n\nI can see the tickets. They were assigned to nobody.",
    "B: That's on us. I'll take both and reply today with an owner and a plan.",
    "A: Thank you. Please include a plain apology, not corporate-speak.",
    "B: Already writing it.",
  ],
  // 10 - NPS
  [
    "A: NPS survey results are in. {metric} up from {n} to {n2}. Detractor comments are mostly about onboarding being confusing:\n\n> \"I spent two days figuring out what to click first.\"\n> — {cust}, new admin\n\nIf we fix one thing, it's that.",
    "B: The first-run flow is on the {q} list already. I'll make sure it moves up.",
    "C: Can I run a few onboarding interviews? I want to watch people use it for the first time.",
    "A: Please, and record them. {wiki}",
  ],
  // 11 - conflicting priority from stakeholders
  [
    "A: {cust} (via sales):\n\n> \"We'd upgrade tomorrow if you add SSO group mapping.\"\n\nSales wants it this quarter.",
    "B: Does one deal justify reordering {q}? I want to see how many other accounts have asked.",
    "A: I'll ask. If it's more than two, it's a pattern.",
    "B: That's the bar. One-off asks get a polite \"on the list\".",
    "C: And be careful about promising dates in sales calls. 🙏",
  ],
  // 12 - small joy
  [
    "A: Screenshot from {cust}'s own internal wiki: they wrote a how-to for the thing we shipped last week. That's a good sign. ~img:Customer how-to page",
    "B: Always a better sign than a survey. 😍",
  ],
];

//__MORE__

export const GENERIC_B: Pools = {
  release: RELEASE,
  incident: INCIDENT,
  risk: RISK,
  access: ACCESS,
  planning: PLANNING,
  retro: RETRO,
  demo: DEMO,
  question: QUESTION,
  feedback: FEEDBACK,
};
