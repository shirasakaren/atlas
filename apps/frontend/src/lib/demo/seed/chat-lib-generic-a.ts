/**
 * Generic conversation pools (part A): standup, review, blocker, decision,
 * status, meeting, docs, code. Shared across every project kind and channel,
 * so everything concrete comes from tokens. Authoring contract: ./chat-dsl.ts
 */
import type { Pools } from './chat-dsl';

export const GENERIC_A: Pools = {
  // ───────────────────────── standup ─────────────────────────
  standup: [
    [
      "A: **Yesterday**\n- Finished the first pass on {task}\n- Paired with {B} on {problem}\n\n**Today**\n- Address review comments on {pr}\n- Start on {task2}\n\n**Blockers**\n- None right now",
      "B: 👍 ping me if the pairing thing resurfaces",
    ],
    [
      "A: standup, {day}:\n• done: {task} is in QA\n• doing: untangling {problem} in {component}\n• blocked: waiting on {B} for the sample data",
      "B: Sending it over after lunch, sorry. Had it ready yesterday and then got pulled into {ticket}.",
      "A: No stress, I'll pick up {task2} until it lands. ~r",
    ],
    [
      "A: heads down on {task}, back around {time}",
    ],
    [
      "A: Morning! Quick one from me. Yesterday: {task} reviewed and merged. Today: starting {task2}. Blocked on nothing, which feels suspicious.",
      "B: Same energy. Yesterday I closed {n} tickets and today I plan to open at least {n2} new ones by accident 😅",
      "C: Yesterday: {task3} demo to {dept}, went fine. Today: write up their feedback. Blockers: none.",
      "D: Out until {time} for a dentist thing. {C} has my handover notes if anything pings.",
    ],
    [
      "A: Who's covering {component} today? {p1} is out and the alert channel is already chatty.",
      "B: I can watch it until {time}, then I'm in back-to-back calls.",
      "A: That works, thanks. I'll take over after that. {ack}. ~r",
    ],
    [
      "A: **Standup digest, {day}**\n\n✅ Done ({n})\n- {task}\n- {task2}\n\n🔄 In progress ({n2})\n- {task3}\n\n⛔ Blocked (1)\n- {ticket} — waiting on {team}\n\nAuto-posted from the tracker. React with 👀 if something here is wrong.",
      "B: 👀 {task2} isn't done, it's in review. Somebody flipped the status early.",
      "A: Fixed it, thanks for flagging. The status automation fires on branch merge, not PR merge, which is a fun quirk.",
    ],
    [
      "A: Sorry, late standup. Yesterday ate itself: {hours} on {problem} and I'm not fully through it. Today the same, plus the {meeting} at {time}. Will ask for help if still stuck by lunch.",
      "B: Want a second pair of eyes? I've seen something like that in {component} before.",
      "A: Yes please. 30 minutes after the {meeting}? ~r",
      "B: Booked. 👍",
    ],
    [
      "A: Y: wrote the migration script for {task}, dry run clean\nT: run it on staging, check row counts\nB: none",
      "B: Please do the row counts twice. I'm still haunted by the last time.",
      "A: Twice, noted. And I'll paste the output here.",
    ],
    [
      "M: Standup from me: finishing the {doc} for {date}, then the {meeting} prep. Need a decision from {@A} on {task} before end of day, otherwise it slips.",
      "A: Looking at it now, will reply by {time}.",
    ],
    [
      "A: Day {n} of fighting {problem}. Today's plan: stop being clever, add logging, reproduce, then fix. In that order.",
      "B: This is the way.",
      "C: Please tell me the order you actually follow is not fix, reproduce, add logging 😄",
      "A: {lol} that was Monday.",
    ],
    [
      "A: Out sick today, sorry team. {task} is untouched and {B} knows where I left things. Back tomorrow if the fever behaves.",
      "B: Rest up! I'll move {task} to Thursday on the board so nobody chases you.",
      "C: Feel better 🙏",
    ],
    [
      "A: Quick async standup so we can skip the call:\n1. {task} - waiting on review, {pct} complete\n2. {task2} - not started\n3. {task3} - parked until {date}\nAnything that needs a live conversation?",
      "B: Nothing from me. Skip it.",
      "C: Same. I'll use the time to finally write up {deliverable}.",
      "D: Skip! 🎉 ~rx:🎉|👍",
    ],
    [
      "A: Team, reminder: standup notes go in the thread before 10:00, not whenever you feel like it. This is mostly aimed at me, I posted at 11:40 yesterday.",
      "B: lol we noticed",
      "C: In my defence I wrote mine at 9:58 and then the wifi died. ~r",
    ],
    [
      "A: Today: reviewing {pr} and {pr2}, then {task}. Tomorrow I'm at the {city} office, so reachable but slower. Doc for anything urgent is {wiki}",
      "B: Safe travels. I'll have a summary of {task} waiting for you when you're back.",
    ],
    [
      "A: Yesterday: nothing visible. Honestly. I spent all day reading the old code in {component} so that today I can delete {n} files. Will post the diff.",
      "B: The best kind of day.",
      "C: Post the diff and I'll bring the confetti. ~rx:🎉|😂",
    ],
  ],
  // ───────────────────────── review ─────────────────────────
  review: [
    [
      "A: Can someone review {pr}? Small one, touches {component} only. ~{n} lines changed.",
      "B: On it.",
      "B: Two nits, one real question about the null handling in the retry path. Details in the PR.",
      "A: Good catch on the null. Fixed in {sha}. ~r",
      "B: Approved. ✅",
    ],
    [
      "A: {pr} is up for review. Not urgent, but I'd like it in before {day}.",
      "B: Is there a test for the empty-list case? I can't see one.",
      "A: There isn't. Adding one now.",
      "B: Cheers. Block on that, everything else is fine.",
    ],
    [
      "A: {B} when you get a sec, could you look at {pr}? You wrote most of {component} so you'll spot what I broke.",
      "B: Looking now. Fair warning, I probably wrote the bug you're fixing too.",
      "A: Honestly would not be surprised 😅",
    ],
    [
      "A: Merge conflict on {pr} after {pr2} landed. Rebasing now, please hold the approval until I've pushed.",
      "B: Holding.",
      "A: Pushed. Conflict was only in the lockfile, nothing real changed.",
      "B: Re-approved. ~r",
    ],
    [
      "A: Re-requested review on {pr}. All comments addressed, changes summarised in the last commit message.",
      "B: Thanks, I didn't get the notification. Looking.",
      "B: One remaining: please rename `tmp2` to something a human can read. Otherwise lgtm.",
      "A: `tmp2` was my best work 😂 renamed.",
    ],
    [
      "A: Need a design review on {figma} before {date}. I mostly want feedback on the empty states and the error copy, the happy path is boring and settled.",
      "B: Left comments in Figma. The error copy is too apologetic, we say sorry three times on one screen.",
      "C: Agree with {B}. Also the disabled button doesn't pass contrast, I think. Checking.",
      "A: Fixed both, will re-share tomorrow morning.",
    ],
    [
      "A: Can I get eyes on the {doc}? Specifically section 3. I'm not confident about the rollback steps.",
      "M: Read it. Step 4 assumes the feature flag is already off, which it won't be if we're rolling back mid-ramp.",
      "A: Hm, right. Adding an explicit flag-off step before step 4.",
      "B: Thanks. Otherwise it's clear. {ack}.",
    ],
    [
      "A: nit: trailing whitespace on L42\nnit: unused import\nblocker: this swallows the error from `fetchOrders`, caller thinks it succeeded",
      "B: Fair on the blocker, nits too. Should I throw or return a Result?",
      "A: Throw. We don't use Result anywhere else in {component}. ~r",
    ],
    [
      "A: {pr} has been sitting for {n} days with 0 reviewers. I know everyone is busy but could someone take it? It's blocking {task}.",
      "B: Sorry, I assumed {C} had it.",
      "C: I assumed {B} had it. 🙃 Taking it now.",
    ],
    [
      "A: Reminder that the review checklist says tests for any behavioural change. {pr} changes the sort order and has no tests.",
      "B: Sorry, I'll add them. Wasn't sure where sort tests live.",
      "A: `__tests__/sorting.spec.ts`, there's a table-driven test you can just extend.",
      "B: Found it, thanks. Pushing in 10.",
    ],
    [
      "M: {@A} the vendor contract markup is ready for your review. Only clauses 7 and 12 need a legal eye. The rest is formatting.",
      "A: Got it, clauses 7 and 12 only. I'll have comments by {time} tomorrow.",
      "M: Perfect. Not rushing you but we sign on {date}.",
    ],
    [
      "A: Big PR warning: {pr} is {n} files. Sorry. It's mostly renames, the real change is in 3 files, I've commented where to look.",
      "B: Appreciated, that makes it bearable. Starting with the three.",
      "B: Reviewed. The three are good. Can't promise the renames are all right but the compiler agrees with them, so 🤷",
      "A: That's all I ask. Merging after CI.",
    ],
    [
      "A: Review feedback on the {doc}: I'd cut sections 2 and 5, they repeat what the intro already says. Happy to be overruled though.",
      "B: Section 5 is the one the {team} team asked for. Keep it but shorten?",
      "A: Fine with that. Shorten, keep. ~r",
    ],
    [
      "A: Approve-with-comments on {pr}, merge when you're ready. The comment on L88 is a suggestion for later, not now.",
      "B: Thank you! Merging. Will open a ticket for the L88 thing so it doesn't get lost.",
    ],
  ],
  // ───────────────────────── blocker ─────────────────────────
  blocker: [
    [
      "A: I'm blocked on {task}. Still no access to the {region} environment, ticket {ticket} has been open since {day}.",
      "B: Who's the approver? I can nudge them.",
      "A: It says {C}, but {C} has been on leave.",
      "C: Back today, actually. Approved it a minute ago, should propagate within 15 minutes.",
      "A: Seeing it now. Thanks both! 🙏",
    ],
    [
      "A: Waiting on the vendor for the API keys. They promised them by {day}, we're now at {day2} and there's no reply to my two emails.",
      "B: Escalate through the account manager. I'll send you the contact in a DM.",
      "A: Will do. If I can't get anything by {time} I'll tell the team that {task} slips a day.",
    ],
    [
      "A: {@B} flagging early: {task} can't proceed without the final data mapping from your side. Everything on mine is ready.",
      "B: Understood. It's half done, I can give you the first {pct} today so you aren't idle.",
      "A: That would be great. Anything is better than nothing. ~r",
    ],
    [
      "A: Staging has been down since {time}. Is that a known thing or am I the first to notice? It's blocking {n} people on my team.",
      "B: Known, there's a certificate expiry. {C} is on it.",
      "C: Cert is renewed, redeploying now. ETA 10 min.",
      "A: Perfect, ta. I'll tell the others. ~rx:🙌",
    ],
    [
      "A: Hi {@me}, politely escalating: we've been waiting {n} days for sign-off on the budget change for {task}. Without it we can't commit the contractor hours.",
      "M: Thanks for flagging. Who's holding it?",
      "A: Finance, specifically the second approver.",
      "M: I'll chase it today. Expect an answer before {time}.",
      "A: Thanks, truly. ~rx:🙏",
      "M: Resolved, approved just now. Please proceed.",
    ],
    [
      "A: Blocked on a decision, not code. Do we use the old customer ID format or the new one? I can build either but not both.",
      "B: New format. The old one is being retired in Q4 anyway.",
      "C: Disagree, partners still send the old one. We need a mapper at minimum.",
      "A: So new format plus a translation layer for partner input. Does that match what you both meant?",
      "B: Yes. ~r",
      "C: Yes, that's what I meant.",
    ],
    [
      "A: Can't reproduce {problem} locally, but it happens every time in staging. Which means I'm blocked on getting staging logs.",
      "B: I'll add you to the log viewer. Two minutes.",
      "B: Done. Check you can see the {component} stream.",
      "A: I can. And the log line I needed has a timestamp from the future. Interesting. Investigating.",
    ],
    [
      "A: Need a security review of {component} before we ship. The {team} team's queue is {n} weeks long. Anyone know a fast lane?",
      "B: There's an expedited route for anything with a customer commitment. Mention the {cust} date in the ticket.",
      "A: Brilliant, adding it now.",
      "B: Put it in the first line, not the last. They skim.",
    ],
    [
      "A: Legal hasn't returned the redline on {deliverable}, so I can't release the final version to {cust}. Planning to say we deliver {date} unless someone objects.",
      "B: Realistic. They told me yesterday it's with the senior counsel.",
      "A: OK. Telling {cust} Friday, and being clear it depends on legal.",
    ],
    [
      "A: Still blocked on {task}. I tried the approach from the {wiki} page and got the same permissions error. Anyone hit this?",
      "B: Yes, that page is out of date. You need the new service account, the old one was disabled last week.",
      "A: That explains a lot. Is there a doc for the new one?",
      "B: Not yet 😬 I'll write it up after lunch.",
      "A: Legend. ~r",
    ],
    [
      "A: Unblocked! {B} found the missing config value (it was `TIMEOUT_MS` set to 0 in one env, naturally). Thanks for the patience everyone.",
      "B: I will be adding validation so that never happens again. Never. ~rx:🎉|🙌",
    ],
    [
      "A: Quick one, I'm blocked on {task} waiting for the {team} team to review the interface contract. Have been for {n} days. Do I just keep asking?",
      "M: Ask in their channel, not DM, with a specific question and a date. DMs get lost.",
      "A: Good tip. Posting there now.",
      "B: Add what you'll do if they don't reply by then, e.g. proceed with the draft. Gives them a reason to answer.",
    ],
  ],
  // ───────────────────────── decision ─────────────────────────
  decision: [
    [
      "A: Need to pick for {feature}. **Option A**: ship the simple version by {date}, fewer edge cases handled. **Option B**: wait two sprints, handle everything.",
      "B: A. We learn more from real usage than from edge-case guessing.",
      "C: A, but let's list the unhandled edge cases in the {doc} so nobody is surprised.",
      "A: Going with A. I'll own the edge-case list, in the {doc} by {day}. ~rx:👍|✅ ~pin:Decision: ship the simple version",
    ],
    [
      "A: Proposal: freeze changes to {component} from {date} until the release. Anything urgent goes through {B}.",
      "B: I'm fine with that. Is a hotfix an exception?",
      "A: Hotfixes yes, with one approver other than the author.",
      "A: Calling it decided unless anyone objects by end of day. ~rx:✅",
    ],
    [
      "A: Do we build or buy for {deliverable}? Quick pros/cons from me: build is ~{usd} and {n} weeks, buy is a licence of {usd2} a year and a week to integrate.",
      "B: Buy. We have enough things to maintain already.",
      "C: Buy, but only if the vendor passes security review. If not, build.",
      "B: Right, conditional. ~r",
      "A: Decision: buy, subject to security sign-off. I'll own the review request, due {date}. Logging in the {doc}. ~rx:👍|✅",
    ],
    [
      "A: Weekly review slot: Tuesday 10:00 or Thursday 15:00? Please vote 1️⃣ or 2️⃣ on this message.",
      "B: 1️⃣",
      "C: 1️⃣ Thursday afternoons are always eaten by something else.",
      "D: 2️⃣ unfortunately, I have a standing thing on Tuesday morning.",
      "A: 1️⃣ wins 3-1. Tuesday 10:00 from next week. Sorry {D}, I'll record it for you. ~rx:👍",
    ],
    [
      "M: Decision needed on {task} by {day}: do we expand scope to include {feature} or hold the original plan? Recommendation from me is to hold, risk to {date} is too high otherwise.",
      "A: Agree to hold. We can do {feature} as a fast follow.",
      "B: Same. Putting it on the list for next quarter.",
      "M: Decided: hold scope. Logged in the {doc}. ~pin:Decision: scope held ~rx:👍|✅",
    ],
    [
      "A: RFC for the new {component} naming is in {wiki}. TL;DR: snake_case everywhere, no more mixed conventions. Comments close {day}.",
      "B: I like it. What about the legacy endpoints?",
      "A: Leave them, with a deprecation note. Only new ones follow the rule.",
      "C: +1. I'd add a lint rule so we don't have to police it by hand.",
      "A: Adopted. {C} owns the lint rule, due {date}. ~rx:✅",
    ],
    [
      "A: We can use {tool} or spreadsheets for tracking this. I know people will say spreadsheets, but hear me out: we'd have it all in one place and permissions are free.",
      "B: Spreadsheets break at around {n} people editing. We'll regret it.",
      "C: I'd rather regret it than do another tool onboarding 😅",
      "A: Fair. Let's try {tool} for one month and review on {date}. If it's a mess, back to the sheet. ~rx:👍",
    ],
    [
      "A: Which option do we go with for the {cust} request? 1) say no, 2) say yes with a surcharge, 3) say yes and absorb it.",
      "B: 2. They have asked for custom work twice before and it was never priced.",
      "C: 2 as well. I'd phrase it as a package so it doesn't sound punitive.",
      "A: OK, 2, {C} drafts the wording and {B} checks the numbers. Reply to {cust} by {date}. ~rx:✅ ~pin:Decision: yes, with surcharge",
    ],
    [
      "A: Quick decision needed, retire the old dashboard or keep both for a month? I've seen {pct} of traffic still on the old one.",
      "M: Keep both, redirect after a month, and put a banner on the old one now.",
      "A: Agreed. Banner goes up today and redirect on {date}. ~rx:👍",
    ],
    [
      "A: Are we OK with going live on a {day}? Normally we avoid it. But the window is ideal this time and we have coverage.",
      "B: Who's on call?",
      "A: {C} and me.",
      "B: Then fine by me. Please write the rollback steps down anyway.",
      "A: Already in the {doc}. Go ahead confirmed. ~rx:✅|👍",
    ],
    [
      "A: Let's make a rule: no meeting without an agenda. If there's none in the invite 24h before, the organiser cancels it.",
      "B: Bold. I love it.",
      "C: Mildly terrified, but love it too.",
      "A: Trial for the rest of the quarter, then we'll see how it went. Writing it up in the team {doc}. ~rx:🎉|👍",
    ],
    [
      "A: Re the {component} rewrite: not doing it this quarter. The team doesn't have the headroom and the risk-to-benefit ratio is poor. We'll revisit in {q} with a proper estimate.",
      "B: Disappointed, honestly, but it's the right call.",
      "A: Thanks for being gracious. Noted in the {doc}, with the reasons so we don't re-litigate. ~pin:Rewrite deferred ~rx:👍",
    ],
  ],
  // ───────────────────────── status ─────────────────────────
  status: [
    [
      "A: **Weekly status, {proj}**\n\n🟢 Overall: Green\n🟡 Schedule: Amber (see risk 1)\n🟢 Budget: Green\n\n**Progress:** {pct} complete (was {pct2} last week)\n**Done:** {task}, {task2}\n**Next:** {task3}, then the {meeting} on {date}\n\n**Risks**\n1. {team} dependency may slip by {n} days\n2. One open decision on scope, owner {B}",
      "B: Re risk 2, I'll have it by Thursday. Please keep it amber until then.",
      "A: Will do. ~r",
    ],
    [
      "A: Status for the week ending {date}: on track. {pct} complete, {task} landed, {task2} in test. Nothing needs escalating.",
      "M: Short and sweet, love it. Copying this into the steering summary as-is.",
    ],
    [
      "A: Amber this week. {task} is taking longer than planned: {problem} turned up and ate about {hours} per day since {day}. Re-forecast: {date} instead of {date2}. Not asking for help yet, just early warning.",
      "M: Thanks for the early flag. What would make it green again?",
      "A: Either dropping {task3} from this milestone or borrowing someone from {team} for a week.",
      "M: I'd drop {task3}. Let's talk through it in the {meeting}. ~r",
    ],
    [
      "A: 🔴 Red for the program this week, sorry. The vendor delivery slid {n} days and everything downstream moves with it. Recovery plan in the {doc}, will walk through it in the {meeting}.",
      "B: How red are we talking? Is {date} still the real date?",
      "A: Honestly, no. Best case {date2}. I'll have a firm date after the {meeting}.",
      "B: Appreciate the honesty. Better to know now.",
    ],
    [
      "M: Status check, {@A}: how is {task} tracking against {date}? I need to tell the steering committee tomorrow.",
      "A: Amber. {pct} done, remaining work is testing and one integration. I'm confident in {date2}, less so in {date}.",
      "M: Then I'll say {date2} and mention {date} as the stretch. Thanks. ~r",
    ],
    [
      "A: Biweekly update:\n- Milestone 2: ✅ done\n- Milestone 3: 🔄 {pct} complete\n- Milestone 4: ⏳ starts {date}\n\nBudget: {usd} spent of {usd2}. Forecast unchanged.",
      "B: Does that {usd} include the contractor invoices from last month? Last time they arrived late and surprised us.",
      "A: Not yet, good question. The real number is probably a bit higher. I'll check with finance and edit.",
      "A: Edited. Real spend is higher but within contingency. ~edit",
    ],
    [
      "A: Status: *green*, but I'd like to flag one thing in plain words, the test environment is flaky and about {pct} of our runs fail for no reason. It's not hurting delivery yet.",
      "B: I'd rather it was amber. If it's costing us rerun time it counts.",
      "A: Fair. Amber for testing, green for everything else. ~r",
    ],
    [
      "A: Where are we on {deliverable}? Last I heard it was {pct}, and that was two weeks ago.",
      "B: {pct2} now. It was held up by {problem}, sorted on {day}.",
      "A: OK so the date holds?",
      "B: It holds, barely. I'd call it amber.",
    ],
    [
      "A: Heads up that the status report template has changed, please use the new one in {wiki}. The main differences: RAG per workstream, and a mandatory \"what changed since last week\" line.",
      "B: The \"what changed\" line is going to expose how much of my status is copy-paste 😅",
      "C: that's the point, I think",
      "A: Yep. Takes 30 seconds, and people read it. ~rx:😂",
    ],
    [
      "A: **Release readiness**\n- Test pass rate: {pct}\n- Open blockers: {n}\n- Open majors: {n2}\n- Go/no-go: {date}\n\nIf the blockers are not zero by {day}, I'll propose we move the date.",
      "B: One of the blockers is a duplicate, will close it.",
      "C: Two of the majors are fixed but not verified. I'll verify today.",
      "A: Thanks both, I'll re-count tomorrow. ~rx:👍",
    ],
  ],
  // ───────────────────────── meeting ─────────────────────────
  meeting: [
    [
      "A: Can we move the {meeting} from {day} to {day2}? I've got a clash with the {cust} call and can't be in two places.",
      "M: Works for me.",
      "C: {day2} is tight for me. Anything after {time}?",
      "A: {time} on {day2} then. Sending an updated invite. ~rx:👍",
    ],
    [
      "A: Agenda for today's {meeting}:\n1. Last week's actions (5 min)\n2. {task} status (10 min)\n3. Risks and asks (10 min)\n4. Anything else (5 min)\n\nAdd to it by replying here.",
      "B: Can we add {problem}? It's affecting {task2} and I'd like a view from {C}.",
      "A: Added as item 3b.",
    ],
    [
      "A: **Notes from the {meeting}**\n\n**Decisions**\n- Keep the {date} target\n- {task} goes to QA first\n\n**Actions**\n- {@B} to update the {doc} by {day}\n- {@C} to book the review with {team}\n- {A} to send the summary to stakeholders\n\nRecording is in the {doc}.",
      "B: Thanks for writing it up. I'll do mine tonight.",
      "C: Booked. Invite is on its way.",
    ],
    [
      "A: Cancelling today's {meeting}, nothing new to discuss and half of us are travelling. Updates in the thread please.",
      "B: Thank you, a free hour 🎉",
      "A: Don't waste it. ~rx:😂",
    ],
    [
      "A: Running {n} minutes late, start without me. {B}, can you take the first item?",
      "B: Sure. We'll hold the second one.",
      "A: Actually joining now, apologies.",
    ],
    [
      "A: Quick time-zone check. The {meeting} is at {time} for me. Is that the same for {city}?",
      "B: It's not. I think the invite is in your time zone, and my calendar shows it two hours earlier.",
      "C: Ugh, daylight saving. The clocks changed in {city} last weekend but not here.",
      "A: Let me fix the invite so it's explicit: {time} {city} time. Sorry about that. ~r",
    ],
    [
      "A: Does anyone have the link for the {meeting}? Zoom invite isn't on my calendar.",
      "B: It's in the channel description. Or use this one, it's the standing link.",
      "A: Got it, thanks. I'd been looking at the wrong calendar.",
    ],
    [
      "M: Moving the stakeholder readout to {day2}. {@A} can you adjust the deck so it covers the last two weeks only?",
      "A: Yes, I'll have it by end of {day}. ~r",
      "M: Thanks. And please keep the risks slide to one page, they don't read page two.",
    ],
    [
      "A: Do we need all {n} of us in the {meeting}? Genuinely asking. If it's only about {task}, the rest of you could do something useful.",
      "B: I think just {C} and {D}. The rest of us can read the notes.",
      "C: Fine by me.",
      "A: OK, shrinking the invite. I'll post notes within the hour.",
    ],
    [
      "A: Follow-up from the {meeting}: I wrote the actions as I understood them. Please correct me if I got anything wrong.\n\n- {B}: confirm the {date} date with {team}\n- {C}: draft the comms for {cust}\n- Me: update the {doc}",
      "B: Correct.",
      "C: Slight tweak, I need the facts from {B} before I draft. So {B} first, then me.",
      "A: Updated, thanks. Dependency noted. ~edit",
    ],
    [
      "A: Standing reminder: {meeting} tomorrow at {time}. Please bring one thing that's going well and one that isn't. Yes, both.",
      "B: I have a lot of the second.",
      "C: I only have a lot of the first. Is that allowed? 😄",
      "A: It's suspicious but allowed. ~rx:😂",
    ],
    [
      "A: Office hours today {time}-{time2}. I'll be on the video link answering questions about {feature}. Bring your weird edge cases.",
      "B: Joined at {time}, you've got {n} people waiting 😮",
      "A: Doing what I can, thanks for the warning. Going one at a time.",
    ],
  ],
  // ───────────────────────── docs ─────────────────────────
  docs: [
    [
      "A: Where's the latest version of the {doc}? I have three copies and they all disagree.",
      "B: {wiki}. Anything in email is out of date.",
      "A: Thank you. Deleting the other two with great satisfaction. ~r",
    ],
    [
      "A: Updated the {doc} with everyone's feedback. Changes: new section on rollback, the timeline is now in a table, and I removed the paragraph about {tool} that nobody agreed on.",
      "B: Nice, the table makes it much easier to read.",
      "C: Can you resolve my comments when you've handled them? Otherwise I can't tell what's done.",
      "A: Resolved the ones I handled, left 2 open for discussion. ~r",
    ],
    [
      "A: Can someone give me edit access to {wiki}? I only have view and I need to add the section on {component}.",
      "B: Sent you an invite, check your email.",
      "A: Got it, edit works. Thanks!",
    ],
    [
      "A: Design files for {feature} are in {figma}. Frames marked ✅ are final, 🚧 still moving. Please don't build from a 🚧 frame, I will find out. 😄",
      "B: Is the mobile variant final?",
      "A: No, 🚧. Tablet too. Desktop only for now.",
    ],
    [
      "A: Doc comment digest for the {doc}:\n- 6 open comments from {B}, mostly wording\n- 2 from {C} about the timeline, they need a decision\n- 1 from legal about the data retention paragraph, urgent\n\nLink: {wiki}",
      "B: My six are all optional, ignore them if you're short on time.",
      "A: Tackling legal's first. {ack}. ~rx:👍",
    ],
    [
      "A: Which repo has the config for {component}? The README in {repo} points to a different one and I think it's old.",
      "B: It moved last quarter. {repo} is correct, the old one is archived.",
      "A: Then the README needs a fix. Doing that now.",
      "B: Please do! That one has cost people hours. ~rx:🙌",
    ],
    [
      "A: Version confusion alert: there are two files called `final_v3.xlsx`, one from {day} and one from {day2}. The {day2} one is the right one. Please check the modified date before sharing.",
      "M: The {day2} one has the corrected totals, yes. I fixed them myself.",
      "A: I've renamed it in the folder. And no, I don't want to talk about how it got named that. ~file:budget-final_v3.xlsx",
    ],
    [
      "A: Posting the architecture overview in case it's useful for onboarding {B}: {wiki}. It's slightly behind reality. The caching bit changed, I'll fix that this week.",
      "B: Thanks, I'm reading it tonight. I'll note anything that looks off.",
      "A: Please do, fresh eyes are exactly what it needs.",
    ],
    [
      "A: Can we agree to put meeting notes under one parent page? Right now they're scattered across {n} places and I can't find anything from last month.",
      "B: Yes! Parent page called \"Notes\" in {wiki}, dated titles, e.g. `2026-10-08 {meeting}`.",
      "A: Perfect. I'll move the existing ones this afternoon. ~rx:👍",
    ],
    [
      "A: Here's the current state of the dependency map. Red boxes are things we don't control.",
      "B: There are a lot of red boxes.",
      "A: Yes. That's the slide. ~img:Dependency map",
      "C: I'm going to put this in the {meeting} and watch people's faces. ~rx:😂",
    ],
  ],
  // ───────────────────────── code ─────────────────────────
  code: [
    [
      "A: TIL you can pull just the failing checks out of that giant JSON with jq:\n```bash\ncurl -s $API/runs/latest | jq -r '.checks[] | select(.status != \"passed\") | .name + \": \" + .message'\n```\nSaves scrolling through {n} screens of output.",
      "B: Nice. I always forget the `-r` and then wonder why everything has quotes around it.",
      "C: Pipe it to `sort -u` as well, the same check fails per shard and you get 8 copies.",
      "A: Ha, that explains the 8 copies. Adding. ~rx:🙌",
    ],
    [
      "A: Anyone know a quick way to find which commit broke {component}? Last known good was {ver}.",
      "B: `git bisect`. Takes about 5 minutes if you have a test that fails:\n```bash\ngit bisect start\ngit bisect bad HEAD\ngit bisect good v2.14.0\ngit bisect run npm test -- --grep \"sync job\"\n```\nIt does the binary search by itself.",
      "A: That is magic. Found it in 6 steps, it was {sha}.",
      "B: Always is. Don't forget `git bisect reset` when you're done or you'll be confused on Monday. ~r2",
    ],
    [
      "A: Need the latest order per customer without a subquery mess. This works, but is it the best way?\n```sql\nSELECT customer_id, order_id, total\nFROM (\n  SELECT o.*,\n         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS rn\n  FROM orders o\n) t\nWHERE rn = 1;\n```",
      "B: That's the standard approach. If you're on Postgres, `DISTINCT ON (customer_id)` with the same ORDER BY is shorter and usually faster.",
      "A: Tried it, same results and it runs in {ms} instead of {ms2}. Thanks! ~r",
    ],
    [
      "A: Retry wrapper I'm adding to the client, comments welcome:\n```ts\nexport async function withRetry<T>(\n  fn: () => Promise<T>,\n  attempts = 3,\n  baseMs = 200,\n): Promise<T> {\n  let lastErr: unknown;\n  for (let i = 0; i < attempts; i++) {\n    try {\n      return await fn();\n    } catch (err) {\n      lastErr = err;\n      const delay = baseMs * 2 ** i + Math.random() * 100;\n      await new Promise((r) => setTimeout(r, delay));\n    }\n  }\n  throw lastErr;\n}\n```",
      "B: Looks good. One thing, it retries on every error including 400s, which will never succeed on retry. Maybe pass in a `shouldRetry(err)`?",
      "A: Good point, adding an optional predicate. Default is retry only on 5xx and network errors.",
    ],
    [
      "A: For anyone parsing the export by hand, here's a Python snippet that groups rows by status without pandas:\n```python\nfrom collections import defaultdict\nimport csv\n\nby_status = defaultdict(list)\nwith open('export.csv', newline='') as f:\n    for row in csv.DictReader(f):\n        by_status[row['status']].append(row['id'])\n\nfor status, ids in sorted(by_status.items()):\n    print(status, len(ids))\n```",
      "B: Clean. For a quick look I'd still reach for `csvkit` but this is great when you can't install anything.",
      "A: Yes, that's the situation I was in. Locked-down laptop. 😅",
    ],
    [
      "A: Question about the pipeline config, why is the cache step running on every branch?\n```yaml\n- name: Cache deps\n  uses: actions/cache@v4\n  with:\n    path: node_modules\n    key: deps-${{ hashFiles('pnpm-lock.yaml') }}\n```",
      "B: It should only matter when the lockfile changes, so the key is right. The slow part is probably that you're caching `node_modules` rather than the pnpm store. Cache `~/.local/share/pnpm/store` and install with `--frozen-lockfile`.",
      "A: Ahh. That brings the step from {n} minutes to about 40 seconds on my branch. Thanks!",
    ],
    [
      "A: Regex for pulling ticket keys out of commit messages, in case it's useful:\n```\n\\b[A-Z][A-Z0-9]{1,9}-\\d+\\b\n```\nMatches `PORT-142` and `INC-48213`, doesn't match `UTF-8` since the dash needs digits after it. Well, it does match `UTF-8`. Hm.",
      "B: 😂 It does. Add a negative lookahead or just exclude a small list: `UTF|ISO|SHA`.",
      "A: Excluding the list. I'll add a test with `UTF-8` in it so it stays fixed. ~r",
    ],
    [
      "A: Shell tip for the logs folder, deletes anything older than {n} days but only prints first so you can sanity check:\n```bash\nfind ./logs -name '*.log' -mtime +14 -print\n# then, when you're happy:\nfind ./logs -name '*.log' -mtime +14 -delete\n```",
      "B: I like the print-first habit. Learned that one the hard way once, deleted a directory I didn't mean to 😬",
      "A: We've all done the thing. Print first, always.",
    ],
    [
      "A: Feature flag config for {feature}. Can someone check the rollout numbers before I merge?\n```json\n{\n  \"flag\": \"new_onboarding\",\n  \"enabled\": true,\n  \"rollout\": {\n    \"percentage\": 10,\n    \"allow\": [\"internal\", \"beta\"]\n  }\n}\n```",
      "B: 10% looks right for week one. Is `internal` a group or a tenant? Different code path, I think.",
      "A: Group. I'll rename it `internal_group` to make that obvious. ~r",
    ],
    [
      "A: This query is slow and I don't understand why. Plan says a sequential scan on a {big}-row table.\n```sql\nEXPLAIN ANALYZE\nSELECT * FROM events WHERE lower(email) = lower('someone@halcyon.example');\n```",
      "B: The `lower(email)` kills the index. Either add an expression index:\n```sql\nCREATE INDEX CONCURRENTLY idx_events_email_lower ON events (lower(email));\n```\nor store emails lowercased and drop the function.",
      "A: Expression index it is. Takes the query from {ms} to under 5ms in staging, which feels fake. ~r",
      "B: Always run it in production once too. 🙂",
    ],
    [
      "A: Smoke test script for after deploys, saves me from clicking through the app:\n```bash\n#!/usr/bin/env bash\nset -euo pipefail\nfor path in /health /api/v1/status /api/v1/me; do\n  if curl -sf -o /dev/null \"$BASE_URL$path\"; then echo \"$path ok\"; else echo \"$path FAILED\"; exit 1; fi\ndone\n```",
      "B: `/api/v1/me` needs a token, so `curl -f` will fail with a 401 in CI, you'll want to pass `-H \"Authorization: Bearer $TOKEN\"`.",
      "A: Of course it does. Adding the header. ✅ ~r",
    ],
    [
      "A: Quick TypeScript tip: stop writing `if (x !== undefined && x !== null)`. Just use `x != null`, or optional chaining.\n```ts\nconst name = user?.profile?.displayName ?? 'Unknown';\n```",
      "B: Please don't tell the linter people about `!= null`, they will have opinions.",
      "C: Our linter allows `!= null` specifically for this, check `eqeqeq` config with the `null: ignore` option.",
      "A: There we go. ~rx:👍",
    ],
  ],
};
