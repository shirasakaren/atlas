/**
 * Project-kind conversation libraries (part B): finance, people, marketing,
 * design, operations. Authoring contract: ./chat-dsl.ts
 */
import type { KindLib } from './chat-dsl';
import type { ProjectKind } from '../schema';

export const KINDS_B: Partial<Record<ProjectKind, KindLib>> = {
  // ═══════════════════════════════ FINANCE ═══════════════════════════════
  finance: {
    lex: {
      feature: ['the auto-accrual engine', 'three-way match', 'the intercompany netting run', 'touchless invoice routing', 'the close checklist', 'auto-certification of low-risk recs', 'driver-based forecasting', 'the journal entry approval workflow', 'the FX revaluation run', 'the cash application bot', 'the PO-backed accrual template', 'the flux commentary workflow', 'the supplier onboarding portal'],
      component: ['the GR/IR clearing account', 'the intercompany matching module', 'the AP invoice capture queue', 'the consolidation hierarchy', 'the chart of accounts mapping', 'the BlackLine rec template', 'the Anaplan driver model', 'the SAP posting interface', 'the bank statement feed', 'the vendor master', 'the tax code determination', 'the allocation cycle', 'the period-lock control'],
      tool: ['SAP S/4HANA', 'Coupa', 'Anaplan', 'BlackLine', 'Workiva', 'Oracle Hyperion', 'Excel (yes, still)', 'Power BI', 'Alteryx', 'Concur', 'BlackLine Transaction Matching', 'Bill.com for the subsidiaries', 'Avalara', 'Kyriba'],
      problem: ['a GR/IR balance that will not clear', 'an intercompany mismatch on the loan account', 'duplicate invoices past the three-way match', 'an FX rate loaded for the wrong period', 'a cutoff error on December receipts', 'unapplied cash from the lockbox', 'a reversing accrual that did not reverse', 'a rounding difference in the elimination entry', 'a vendor bank-detail change with no callback', 'a suspense account nobody owns', 'a manual journal posted after period lock', 'a tax code that defaults to zero-rated', 'a PO closed with open receipts'],
      metric: ['days to close', 'touchless invoice rate', 'first-pass match rate', 'unreconciled items over 90 days', 'DPO', 'DSO', 'forecast variance', 'manual journals per close', 'accrual accuracy', 'cost per invoice', 'on-time payment rate', 'rec completion by WD3', 'audit adjustments', 'duplicate payment rate'],
      deliverable: ['the close calendar', 'the PBC list', 'the reconciliation matrix', 'the accrual policy', 'the intercompany playbook', 'the control narrative', 'the flux package', 'the vendor onboarding SOP', 'the consolidation workbook', 'the SOX test results', 'the FX rate governance memo', 'the cutover trial balance', 'the AP automation business case'],
      team: ['GL accounting', 'AP', 'AR', 'treasury', 'tax', 'FP&A', 'internal audit', 'procurement', 'the shared service centre', 'controllership', 'revenue accounting', 'financial reporting', 'the SAP basis team'],
      vendor: ['Meridian Payments', 'Corvane Logistics', 'Northgate Staffing', 'Pellucid Cloud', 'Ardent Facilities', 'Tessel Office Supply', 'Brightwater Consulting', 'Vantor Freight', 'Quillon Legal', 'Harrow Print'],
      regulation: ['SOX 404', 'ASC 842', 'ASC 606', 'IFRS 16', 'the EU e-invoicing mandate', 'VAT reverse charge rules', 'transfer pricing documentation', 'Pillar Two reporting', 'local statutory filing deadlines', 'the 1099 threshold rules'],
      artifact: ['the close tracker', 'the accrual template', 'the TB export', 'the aged AP report', 'the elimination journal', 'the recon sign-off sheet', 'the vendor bank change log', 'the sample selection workbook', 'the FX rate table', 'the intercompany netting statement'],
      action: ['re-run the matching job', 'reverse and repost', 'push the cutoff by a day', 'reclass to the right cost centre', 'book a top-side adjustment', 'get the controller sign-off', 'open a ticket with the SAP team', 'freeze the period for subledgers', 'refresh the TB snapshot', 'send a reminder to the approvers'],
      env: ['the sandbox client', 'QA', 'the pre-prod client', 'the cutover rehearsal environment', 'production'],
    },
    pools: {
      work: [
        [
          "A: Intercompany is off again. {pct} of the open items between the UK and German entities are one-sided. Ours posted, theirs did not.",
          "B: Is it the usual timing thing or is {component} dropping documents? Last close it was timing, a week before that it was a bad partner code.",
          "A: Running this against the matching table now:\n```sql\nselect i.doc_no, i.partner_co, i.amount_lc\nfrom ic_open_items i\nleft join ic_open_items p\n  on p.doc_ref = i.doc_no and p.company = i.partner_co\nwhere p.doc_no is null\n  and i.posting_date <= :period_end;\n```",
          "A: {n} orphans, all with partner code 1040. That entity was renamed in the hierarchy and the mapping never got updated.",
          "B: Classic. I'll fix the mapping in {tool} and re-run the netting. Then we owe {C} an apology for the three emails we sent them.",
          "C: Accepted, but I want the apology in the form of someone documenting this in {wiki} 😄 ~r"
        ],
        [
          "A: Question on accrual methodology. For services received but not invoiced, do we accrue on PO line value or on the % complete the project manager gives us?",
          "B: Policy says % complete when there is a milestone schedule, otherwise the full PO line if the work is delivered. The grey zone is where the PM 'thinks' it is about {pct}.",
          "A: Right, that is the grey zone I am in. {vendor} has a T&M contract and no timesheet yet.",
          "B: Then accrue on the run-rate from the last {n} weeks and tag it 'estimated' in the description. Auditors are fine with an estimate if there is a rationale and a true-up the next month.",
          "A: Done. I'll put the rationale in {artifact} so it is not lost in my head. ~r"
        ],
        [
          "A: Walking through the FX reval order so we stop fighting about it: 1) load month-end rates, 2) revalue open AP/AR and bank, 3) run intercompany reval, 4) translate for consolidation. Step 3 before step 2 gives us phantom gains.",
          "B: That explains the {usd} swing in other income last quarter. We ran 3 before 2 because the IC job was already scheduled.",
          "A: Yes. I'll re-sequence the schedule in {env} and rerun. If the numbers settle, we move it to prod before the next close.",
          "C: Can we also freeze the rate table once treasury signs it off? Somebody loaded a rate dated the 31st of a 30-day month last time 🙃 ~rx:👍|🙌"
        ],
        [
          "A: Audit pulled their sample for the disbursements test: {n} items from the AP subledger, stratified above {usd}. I need support packs for each by {day}.",
          "B: Do we hand over the invoice, the PO, the goods receipt and the payment proof, or do they want the approval trail too?",
          "A: Approval trail too. They are testing the control, not only the transaction. Screenshot of the Coupa workflow with timestamps is the cleanest.",
          "B: Ok. I'll build a folder per sample ID with a one-page index so nobody asks 'where is the GRN' at 6pm. ~file:PBC-disbursements-sample.xlsx"
        ],
        [
          "A: Looking at invoices failing {feature}. Biggest bucket is price variance over tolerance: PO says $11.20 a unit, invoice says $11.35. Tolerance is set at 0%.",
          "B: I'd want 1% or $50 whichever is lower, otherwise AP is manually clearing pennies. But procurement needs to agree, they own the contract price.",
          "A: Pulling the numbers: at 1% we would auto-pass about {pct} of the exceptions and the total exposure is under {usd}. That is a decent argument.",
          "M: Good analysis. Send me the one-pager and I'll put it in front of procurement and the controller together. If they both agree we ship it before the next close. ~rx:👍"
        ],
        [
          "A: Anaplan question. The driver-based forecast is pulling headcount from the HRIS import, but contractors are in a different list. Do they go in 'Personnel' or 'Professional services'?",
          "B: Personnel costs for employees, professional services for contractors, with the exception of embedded contractors billed through staffing. Those still hit professional services but by cost centre.",
          "A: So the variance report will show contractors as a vendor line, not a headcount line. That will confuse the cost centre owners.",
          "B: It will confuse them regardless. I'll add a memo column 'FTE equivalent' so they can see the headcount view without moving the accounting. ~r"
        ],
        [
          "A: BlackLine auto-cert: proposing we auto-certify any rec where the GL balance equals the subledger balance and the account is under {usd} with no items older than 30 days.",
          "B: What does that cover in terms of accounts? I do not want to auto-cert something and discover it was the account with the big manual accruals.",
          "A: {n} of {n2} balance sheet accounts qualify, mostly prepaid, petty cash and clearing accounts. The high-risk ones stay manual with preparer + reviewer.",
          "B: Then I'm fine, provided internal audit signs off on the criteria. They should own the threshold, not us. 👍"
        ],
        [
          "A: Flux commentary is the part of close that everyone hates and nobody can skip. Proposal: only explain variances above both {pct} and {usd}, and make owners write one sentence + a driver, not an essay.",
          "B: I like it. 'Revenue down because of seasonality' is not a driver though. We need the specific thing, e.g. 'two enterprise renewals slid into next month'.",
          "C: I'd add a dropdown: volume, price, mix, timing, one-off, FX. Then FP&A can aggregate the reason codes instead of reading free text.",
          "A: Love the dropdown. Let me mock it in the template and run it by {@B} next. ~rx:💡|👍"
        ],
        [
          "A: Cutoff testing on {date}: found {n} receipts dated after month-end that were booked into the prior period because the warehouse scanned them late.",
          "B: What is the exposure? And did the invoices for them come in before we closed?",
          "A: About {usd} in goods. Invoices arrived two days after close, so no accrual and a small understatement of liabilities.",
          "B: Under materiality, but I would still book it as a late-entry correction and send operations a note. The scanners need a hard cutoff time. ~r"
        ],
        [
          "A: Cash application hit rate from the lockbox bot is {pct}. The rest are remittances with a customer name that does not match anything in the master.",
          "B: Half of these will be parent/subsidiary issues. The customer pays from the parent's account and quotes the sub's invoice.",
          "A: So we need a payer-to-payee alias table. Can AR maintain it, or does it belong in master data governance?",
          "B: AR should maintain it. They know which payer is which. Master data governance can own the approval step so it does not turn into a free-for-all. ~rx:👍"
        ],
        [
          "A: ASC 842 remeasurement: the Frankfurt lease got a rent index uplift, so the ROU asset and liability both change. Does the schedule in {tool} recompute automatically?",
          "B: Only if you flag the modification type as 'index change'. If you flag it as 'scope change' it will reset the discount rate and everything shifts.",
          "A: Ah. That would have been a very expensive checkbox. I'll set it to index change and run the journals in {env} first.",
          "B: And attach the lease amendment to the entry. Auditors always ask which clause triggered it."
        ],
        [
          "A: Journal entry workflow: anything over {usd} needs two approvers, but today the second approver can be anyone with the role. I'd like to block the preparer from also being an approver.",
          "B: SoD ruling. We should also block same-person approval when the entry hits a different ledger than the preparer's cost centre. Otherwise people approve for each other in a loop.",
          "A: Here's the rule I'll configure:\n```\nIF je.amount >= 50000\n  AND je.preparer == je.approver\nTHEN reject('SoD: preparer cannot approve')\nELSE route(approver_pool = 'GL_SENIOR')\n```",
          "B: Looks right. Test it with a dummy entry and show me the rejection message, I do not want users thinking the system is broken. ~r"
        ],
        [
          "A: Mapping table for the new chart of accounts. Legacy → new:",
          "A: | Legacy | New | Note |\n|---|---|---|\n| 6100 Travel | 6410 | split T&E |\n| 6105 Meals | 6411 | 50% non-deductible |\n| 7200 Bank fees | 7810 | moved to finance costs |\n| 2190 Misc accruals | 2150 | needs owner |",
          "B: 2190 'misc accruals' needs a better answer than 'needs owner'. That is where things go to hide.",
          "A: Agree. Opening that up: I will ask each cost centre owner to identify their balance, and anything left goes to a reserve under controllership. ~r"
        ],
        [
          "A: Deferred revenue waterfall does not tie to the subledger by {usd}. The difference is on multi-year contracts with a mid-term upsell.",
          "B: Is it the co-term logic? We recognise the upsell from the effective date but the system might be spreading it over the full original term.",
          "A: Confirmed on two contracts. The spread uses original end date, not the new end date, so it under-recognises.",
          "B: Then it is a configuration fix plus a one-time catch-up. I'll write the memo and put it in the policy file. 🙂"
        ]
      ],
      standup: [
        [
          "A: close update, WD{n}:\n- recs: {pct} complete, {n2} still open\n- accruals: posted except for {vendor}\n- intercompany: matching run at 9, two mismatches left\n- blocker: none yet, but the TB is {usd} off and I have a theory"
        ],
        [
          "A: **Yesterday:** cleared the GR/IR items over 90 days (down from {n} to {n2}). **Today:** FX reval review with treasury. **Blockers:** need controller sign-off on the write-off list."
        ],
        [
          "A: Quick one: AP queue is {big} invoices, of which {pct} are touchless. Working through the exceptions today, mostly missing receipts.",
          "B: If it's a missing receipt, tag the requester. I'm chasing them from my side too. ~rx:👍"
        ],
        [
          "A: Status, {day}: I have the accrual template in, waiting on two cost centres. Nudged them twice. If I don't have it by {time} I'll book the prior-month run-rate and flag it.",
          "B: Fine. Make sure it is labelled as an estimate so we can true it up."
        ],
        [
          "A: PBC list: {n} of {n2} items delivered to the auditors. Still outstanding: the bank confirmation letters and the stock count. Will update the tracker at end of day."
        ],
        [
          "A: Doing the SAP migration trial balance reconciliation today. Anything over {usd} difference I'll raise with {B}. Everything else goes in a pivot.",
          "B: Share the pivot when you have it. I'd like to see differences by company code, not by account. ~r"
        ],
        [
          "A: Morning. Anaplan: forecast refresh ran clean overnight, variance to last week is {pct}. Reviewing the headcount driver before I send it to {team}.",
          "B: Heads up: the HR import added a batch of 'planned hires' with start dates in the past. Might want to filter those."
        ]
      ],
      blocker: [
        [
          "A: Blocked on the SAP cutover trial balance. The legacy ledger shows {usd} more in prepaid than the new one and I can't find the missing journal.",
          "B: Have you checked the migration cockpit log? Last time it silently skipped lines with a null cost centre.",
          "A: Not yet, that's a good lead. Checking the rejected-records list now."
        ],
        [
          "A: Escalating: {vendor} invoices are stuck in Coupa because the PO was closed before the receipt posted. AP can't pay, the vendor is chasing, and the supplier is critical.",
          "M: Who owns reopening the PO? If it's procurement, I'll call them now. Give me the PO number and I'll get it moved today.",
          "A: PO is on the ticket {ticket}. Thanks {me}. ~rx:🙏"
        ],
        [
          "A: Auditors want the evidence for control {n} (journal approvals) but our workflow only keeps approval history for 90 days. Anything older is gone.",
          "B: That cannot be right. Is it a retention setting or did somebody purge?",
          "A: Retention. Someone set 90 days in the original config. Raising with the SAP basis team to see if the archive has it."
        ],
        [
          "A: The bank feed for the {region} entity has been broken for {n} days. Cash positions are stale and treasury is working from emails.",
          "B: Did the bank rotate the certificate? That has bitten us before.",
          "A: Yes, expired on {date}. The bank says they sent a notice to an inbox that nobody reads. New cert request submitted. ~r"
        ],
        [
          "A: I can't finish the intercompany eliminations until Legal confirms the status of the loan to the Singapore sub. Is it forgiven, converted, or still outstanding?",
          "B: I'll chase legal today. If the answer isn't by {time}, I'd book it as outstanding with a disclosure note and fix it next period."
        ],
        [
          "A: Real blocker: the tax code on {n} invoices defaulted to zero-rated, so we've under-accrued VAT on cross-border services. Tax needs to review before I can post the correction.",
          "B: Tax team's looking at it now. They said they can give an answer by tomorrow morning. Will that work for the close?",
          "A: It makes WD{n} tight, but yes. I'll prep the journal so it's ready to post as soon as they say go. ~r"
        ],
        [
          "A: Waiting on approvals: {n} manual journals are sitting in the queue because the approver is on leave and the delegate was never set up.",
          "M: Who's the backup? I'll ask the controller to approve today and we'll fix the delegation setup next week."
        ]
      ],
      decision: [
        [
          "A: Proposal: freeze all manual journals in {env} 24 hours before the cutover trial run. Any exception has to be approved by the controller.",
          "B: Agree. We had two untracked journals the last time and spent a day finding them.",
          "A: Locking it in. Decision recorded in {wiki}. ~pin:Decision ~rx:👍|✅"
        ],
        [
          "A: Decision needed: do we backdate the Q4 policy change for accrual thresholds, or apply it prospectively?",
          "B: Prospectively. Backdating means re-opening closed periods and the auditors would object.",
          "M: Agreed. Prospective from the start of the next period, documented in the policy memo. ✅ ~rx:👍|✅"
        ],
        [
          "A: We need to decide: close calendar of WD5 or WD6 for the next two quarters? The ERP cutover will eat one day.",
          "B: I'd keep WD5 as the target but communicate WD6 as the commitment until the new system settles.",
          "C: Two calendars would confuse everyone. One date, WD6, and we revisit it after the second quarter on the new system.",
          "A: WD6 it is. Back to WD5 once we're above {pct} on-time recs. ~pin:Decision ~rx:✅|👍"
        ],
        [
          "A: Vendor master: do we allow bank detail changes by email with a callback, or only through the supplier portal?",
          "B: Portal only. The callback process is manual, easy to bypass, and it's exactly how fraud gets in.",
          "A: Done. I'll draft the SOP and the supplier notice. ~rx:👍|✅"
        ],
        [
          "A: Is it ok if we set the auto-cert threshold at {usd}? Anything above stays manual.",
          "B: Fine with me, provided internal audit signs off.",
          "A: They did this morning. Locked. ~rx:✅|👍"
        ],
        [
          "A: Choosing between Option 1 (keep the legacy consolidation tool for one more quarter) and Option 2 (cut over now with the new hierarchy). Option 1 costs {usd}, Option 2 carries rework risk.",
          "B: Option 1. We already have enough risk with the ERP cutover. I'd rather pay for the extra quarter.",
          "M: Going with Option 1. Reassess at the Q+1 steering committee. ~pin:Decision ~rx:👍|✅"
        ],
        [
          "A: For the AP automation business case, we use the conservative number: {pct} touchless by the end of the year rather than the vendor's {pct2}. Ok?",
          "B: Yes. Vendor numbers are always from the best customer. Use ours.",
          "A: Updated. ~rx:👍|✅"
        ]
      ],
      launch: [
        [
          "A: Go-live checklist for the new AP workflow:\n- [x] UAT sign-off from AP and procurement\n- [x] Approval matrix loaded\n- [ ] Supplier comms sent\n- [ ] Hypercare rota confirmed\nGo/no-go is {day} at {time}.",
          "B: Supplier comms goes out in the morning. Hypercare rota has me and {p1} on call for the first week.",
          "M: Great. I'll chair the go/no-go. Please come with your biggest worry, not your best-case slide. ~rx:🚀|👍"
        ],
        [
          "A: We are live on the new close calendar in {tool}. First tasks are already assigned and the dashboard looks good. 🎉",
          "B: Already seeing a few tasks assigned to people who left. Cleaning up the owner list now.",
          "A: Expected. We'll sweep up in the first hour. ~rx:🎉|🚀"
        ],
        [
          "A: Announcement: from {date}, all supplier invoices must be submitted via Coupa. Emailed invoices to the AP inbox will be auto-replied with the portal link.",
          "B: Do we have the FAQ ready for suppliers? They're going to ask about PO numbers.",
          "A: {wiki} has the FAQ, and I've added a one-page quick start. ~rx:🎉|🚀"
        ],
        [
          "A: Cutover weekend plan: freeze at 6pm Friday, final TB extract Saturday morning, migration load Saturday afternoon, reconciliation Sunday, go/no-go Sunday evening.",
          "B: I'll be online Saturday for the load. Anyone who wants to swap shifts, tell me by Thursday.",
          "M: Thank you both. If something goes sideways, call me first, not the vendor. ~rx:🚀|👍"
        ],
        [
          "A: First close on the new ERP finished {n} hours ahead of plan. 🎉 Thanks everyone who babysat their recs.",
          "B: And the intercompany matching did not produce a single orphan. I am suspicious but I'll take it.",
          "M: Huge. Let's keep the same crew for the next one and record what we'd do differently. ~rx:🎉|🚀"
        ],
        [
          "A: Rolling out the flux commentary workflow to the {team} team today. Training session at {time}, recording will be in {wiki}.",
          "B: Do owners get an email reminder when their commentary is due?",
          "A: Yes, 24 hours and then 4 hours before. ~rx:🚀|👍"
        ],
        [
          "A: Wave 2 of the AP automation is live in {region}. Touchless rate in the first hour: {pct}. Exceptions are routing to the right queues.",
          "B: Nice. Anything weird?",
          "A: One supplier with a PO format we didn't expect, I'm adding it to the exception rules. ~rx:🎉|🚀"
        ]
      ],
      chatter: [
        ["A: Does anyone know who owns the suspense account 9999? It has {usd} in it and a post-it note attached."],
        ["A: Who has the latest version of the close calendar?", "B: {wiki}. The one in my inbox is outdated, ignore it. ~r"],
        ["A: Reminder: JE cutoff is {time} today. After that you'll need controller approval.", "B: Noted. ~rx:👍"],
        ["A: Can I get a second pair of eyes on this accrual before I post it?", "B: Send it over. Which cost centre?"],
        ["A: The spreadsheet that runs half our close has a macro nobody dares open. We call it 'Gerald'.", "B: Gerald has survived three ERP projects. He will survive this one too 😂"],
        ["A: Month-end is basically a very long Monday with a countdown clock.", "B: Please don't remind me, I'm on WD2."],
        ["A: Is anyone else getting a 500 error from {tool} or just me?", "B: Same here. Looks like it's down for everyone."],
        ["A: Quick one: does {vendor} need a W-9 on file before we pay them?", "B: Yes, and a TIN match. I'll send the form. ~r"],
        ["A: I just found a reversing journal from 2019 still hitting the ledger every month.", "B: What does it do?", "A: Nobody knows. It nets to zero. We're calling it a pet."],
        ["A: Coffee run before the intercompany matching? I'll bring {snack}.", "B: Yes please ☕"],
        ["A: Anyone know what the 'XX' in the cost centre naming means?", "B: Historical. It used to mean 'acquired entity'. It does not any more."],
        ["A: Updated {artifact}, new tab is 'Open items by owner'. Take a look, it makes chasing easier.", "B: Perfect, thanks. ~rx:🙌"],
        ["A: Reminder that the auditors are on site {day}. Please keep desks tidy and don't leave open invoices on screen 😅"],
        ["A: PSA: the FX rates for {date} are in. Please re-run your reval jobs.", "B: Thanks for the ping. ~rx:👍"],
        ["A: Who approved that expense report with a $400 'team bonding' line item?", "B: That was the offsite. It had a receipt and a cake."],
        ["A: Can we please stop sending PDFs of Excel screenshots? 🙏", "B: I would if my approvers would open the actual file."],
        ["A: Does {team} know about the new PO threshold? A few requests came in with the old numbers.", "B: I'll pass it along in their channel. ~r"],
        ["A: The close dashboard is green for the first time in months. Nobody touch it.", "B: Don't jinx it 😂"],
        ["A: I'm out {day} afternoon. {B} will cover AP approvals.", "B: Got it, I'll check the queue at noon."],
        ["A: Is the 'unapplied cash' number real? It jumped by {usd}.", "B: It's a large payment from a customer with no remittance. AR is chasing."],
        ["A: Just found out our bank charges a fee for every paper statement. We still receive one. Monthly. For {n} years.", "B: Cancelling that today 😂"],
        ["A: Who wants to do a quick tie-out walkthrough for the new joiner?", "B: I can, tomorrow after standup. ~r"],
        ["A: Balance sheet recs: 100% by WD3 would be a nice problem to have.", "B: Would be a nice problem. We're at {pct}."],
        ["A: Can someone sanity check my VLOOKUP? It's returning #N/A and I swear the values match.", "B: Trailing space. It's always a trailing space 🙃"]
      ],
      incident: [
        [
          "A: Incident: the payment run for {region} went out with duplicate vendor payments. {n} suppliers paid twice, total around {usd}.",
          "B: Stop any further runs. Treasury needs to put a hold on the bank file. Can we recall at the bank?",
          "A: Treasury is on the phone with the bank. The cause looks like the duplicate invoice check was disabled in the pre-prod config that was copied to prod.",
          "M: I'm creating {ticket}. Please keep the thread as the source of truth. Everyone else, no side channels. ~pin:Incident",
          "A: Recalls submitted for {n2} of {n} payments. We'll know the rest by tomorrow morning."
        ],
        [
          "A: The consolidation job just finished and the group balance sheet does not balance. Out by {usd}.",
          "B: Did anyone post after the TB snapshot? Check for entries after {time}.",
          "A: Found one: a manual elimination entry posted to the wrong ledger. Reversing and reposting. ~r",
          "B: Re-run the consolidation once it's posted and share the result here."
        ],
        [
          "A: Vendor bank-detail fraud attempt: AP received an email from a 'supplier' asking to change bank accounts. The domain differs by one letter.",
          "B: Did we change anything? Check the change log.",
          "A: No change was made, the callback caught it. Reporting to security and the real supplier.",
          "M: Good catch. Let's use this in the next training as a real example. ~rx:👍|🙏"
        ]
      ]
    }
  },
  // ═══════════════════════════════ PEOPLE ═══════════════════════════════
  people: {
    lex: {
      feature: ['the new onboarding journey', 'manager self-service', 'the merit cycle worksheet', 'the job architecture', 'the pulse survey module', 'employee self-service', 'the benefits enrollment flow', 'the org chart view', 'the internal mobility marketplace', 'the time-off accrual engine', 'the offboarding checklist', 'compensation planning', 'the digital offer letter flow'],
      component: ['the Workday tenant', 'the payroll integration', 'the supervisory org hierarchy', 'the security domain setup', 'the ATS-to-HRIS handoff', 'the benefits carrier feed', 'the SSO connection', 'the calculated field library', 'the EIB load template', 'the position management model', 'the business process definitions', 'the time tracking integration', 'the learning platform sync'],
      tool: ['Workday', 'Greenhouse', 'Culture Amp', 'ADP', 'Docebo', 'Okta', 'Rippling for the small entities', 'Lattice', 'Visier', 'Slack announcements', 'Sana', 'SuccessFactors (legacy)', 'Qualtrics', 'Excel with way too many tabs'],
      problem: ['a worker with two active positions', 'a payroll variance on net pay', 'a missing manager on the org chart', 'a bad cost centre mapping', 'duplicate employee IDs from the legacy system', 'a benefits eligibility error', 'a merit budget that does not add up', 'an offer letter with the wrong currency', 'a time-off balance that migrated as zero', 'a security role that sees too much', 'a termination date entered backwards', 'an I-9 section 2 past the deadline', 'a bank detail mismatch on a pay file'],
      metric: ['time to fill', 'new-hire 90-day retention', 'survey participation rate', 'payroll parity rate', 'eNPS', 'offer acceptance rate', 'HR ticket volume', 'manager adoption rate', 'onboarding completion in week one', 'merit cycle on-time approvals', 'attrition by tenure band', 'time to productivity', 'data quality score'],
      deliverable: ['the data conversion plan', 'the parallel payroll results', 'the change impact assessment', 'the training curriculum', 'the comp cycle calendar', 'the job architecture framework', 'the manager toolkit', 'the engagement action plan', 'the cutover checklist', 'the works council briefing pack', 'the integration test report', 'the communication plan', 'the policy harmonisation table'],
      team: ['HR operations', 'total rewards', 'talent acquisition', 'HRBPs', 'payroll', 'learning and development', 'people analytics', 'employee relations', 'IT service desk', 'the Workday deployment partner', 'internal communications', 'legal and compliance', 'the benefits team'],
      vendor: ['Lumen Benefits', 'Orbis Payroll Services', 'Kestrel Background Checks', 'Waypoint Relocation', 'Tandem Learning', 'Fernhill Executive Search', 'Alder & Finch Consulting', 'Sundial Wellness', 'Rook HR Advisory', 'Pinecrest Pensions'],
      regulation: ['GDPR for employee data', 'works council consultation rules', 'the pay transparency directive', 'I-9 requirements', 'state payroll tax registrations', 'the working time rules', 'country-specific termination law', 'local pension auto-enrollment', 'the equal pay reporting rules'],
      artifact: ['the headcount reconciliation', 'the conversion mapping sheet', 'the cutover runbook', 'the survey heatmap', 'the pay-parity variance report', 'the manager FAQ', 'the onboarding checklist', 'the org chart export', 'the calibration grid', 'the open enrollment guide'],
      action: ['correct it in the tenant', 'rerun the EIB', 'escalate to the deployment partner', 'hold the payment run', 'send a manager reminder', 'update the security group', 'get legal to review', 'reopen the business process', 'freeze changes for the weekend', 'reload from the mapping sheet'],
      env: ['the implementation tenant', 'the sandbox preview tenant', 'the production tenant', 'the gold tenant', 'the test tenant'],
    },
    pools: {
      work: [
        [
          "A: Parallel payroll run 2 results. Gross-to-net matches for {pct} of the population. The mismatches cluster in two places: employees with mid-month position changes and anyone with a garnishment.",
          "B: The mid-month change is almost always the proration rule. Workday prorates on calendar days, our legacy payroll used working days.",
          "A: That tracks with the sample I looked at. The delta is under {usd} per head, but there are {n} of them and nobody wants to explain it to finance.",
          "B: Then we either change the proration rule in {tool} or document and accept the difference. I'd push for matching legacy for the first two cycles and fix it in a policy review after.",
          "A: Fair. I'll write up both options for {@C} so a decision can be made. ~r"
        ],
        [
          "A: Draft of the onboarding journey, from offer accepted to day 90:\n1. **Pre-boarding** (T-14): welcome email, equipment form, paperwork\n2. **Day 1**: laptop, badge, buddy intro, no meetings before 11\n3. **Week 1**: role clarity chat with manager, systems access check\n4. **Day 30**: pulse check\n5. **Day 90**: stay conversation",
          "B: I love 'no meetings before 11' but we will need a way to enforce it. Hiring managers will book their new person for six intros before lunch.",
          "A: Fair. The journey sends the manager a checklist the day before: first task is 'protect the first morning'. We'll see if they obey 😅",
          "C: Can we add a 'first commit' for the new hire, something small that they ship in week one? It really helps their confidence. ~rx:👍|💡"
        ],
        [
          "A: Merit cycle modelling: a {pct} budget across the company, but the compa-ratio is {n} points lower in engineering than in G&A. If we distribute evenly, we make the gap bigger.",
          "B: What does the policy say about distribution guidance? Do we allow a skew toward below-market bands?",
          "A: Policy says managers can allocate within a range of ±{pct2} of the budget, but nobody uses the upper end. I'd like the worksheet to show compa-ratio next to the proposed increase so they can see it.",
          "B: A compa-ratio column is a great idea. And add a flag if an increase takes someone above the band max, otherwise they'll end up with lump sums by accident. ~r"
        ],
        [
          "A: Survey results are in: participation {pct}, eNPS up {n} points. The pattern I find interesting is the manager score gap between new hires and tenured staff.",
          "B: Is that 'new hires love their managers because they have just met' or is there a real onboarding effect?",
          "A: Controlling for tenure, teams that finished the onboarding checklist in week one scored {n2} points higher on 'I know what is expected of me'. So there's something real.",
          "B: That's a good argument for the new journey. Let's put the heatmap in {wiki} and invite {@C} to take a look before the steering call. ~img:Survey-heatmap-by-org"
        ],
        [
          "A: Data conversion question. Legacy has {n} different values for employment status (Active, ACTIVE, A, Active - LOA, On leave...). Workday has 6. How should we map them?",
          "B: Start from the business meaning, not from the label. Active + on leave with pay → Active. Unpaid LOA → Leave of Absence with a reason code. Anything blank we send to a review file.",
          "A: Understood. I'll build the mapping sheet and send it to HR ops for sign-off before we load anything.",
          "B: Add a column with the record count for each legacy value. If something maps {big} rows, we need to be extra careful. ~rx:👍"
        ],
        [
          "A: Security domain review for managers. Right now managers can see the compensation history of their entire org tree, including skip-levels. Is that intended?",
          "B: Intended for direct reports only. Skip-level visibility was a legacy setting from when everyone had a single org. We should limit it.",
          "A: I'll adjust the security group to direct reports + their own record. Do you want the HRBP group to keep full visibility?",
          "B: Yes, for their supported orgs only. Not the whole company. ~r"
        ],
        [
          "A: Question for {team}: for transfers between legal entities, do we terminate and rehire or use the transfer process? The system supports both but they have different consequences for benefits and service dates.",
          "B: Transfer process, if the service date carries over and the employee stays in the same country. Cross-country moves need a termination and rehire because of local payroll and the social insurance set-up.",
          "A: Thanks, that matches what the partner told us. I'll capture it in the policy table. ~r"
        ],
        [
          "A: Weekly change-management check-in. Our manager readiness survey shows {pct} feel prepared for the new system. Target is {pct2} before go-live.",
          "B: Which managers are least ready? Is it by function or by location?",
          "A: Mostly shift-based sites and managers who have fewer than {n} direct reports, I think they believe it won't affect them.",
          "B: Then we need floor-level sessions, not another webinar. Let's put sessions on the shop floor during shift change, 20 minutes, with free coffee ☕ ~rx:👍|💡"
        ],
        [
          "A: Looking at the works council briefing for Germany. They want to know exactly which employee data fields are visible to managers and which reports leave the EU.",
          "B: We can show them the security matrix and the data residency diagram. Let me ask legal if we need an additional DPIA before the next meeting.",
          "A: That would be helpful. They are meeting on {day}, so we have a few days. ~file:Workday-data-visibility-matrix.xlsx"
        ],
        [
          "A: Calibration prep: the grid has {n} people in the 'exceeds' box for one org, which statistically is... optimistic.",
          "B: Managers rate their own team. Of course the org has only top talent 😄",
          "A: The facilitation guide has the usual prompts: 'what evidence supports this rating?' and 'would we be surprised if they left?'. I'd like to also show the distribution before the session.",
          "B: Yes. If people see the curve in advance there's less debate on the day. ~r"
        ],
        [
          "A: Parity check for the new bonus plan. We converted {n} bonus targets from percentages to amounts and found {n2} where the new amount is lower than the old one because of rounding on prior base pay.",
          "B: Those need to be fixed manually, nobody's target should go down due to a formula. Can you give me the list?",
          "A: Sending now. I also flagged three where the legacy target was missing entirely. ~file:Bonus-target-conversion-exceptions.xlsx"
        ],
        [
          "A: Job architecture proposal: 5 career streams, 9 levels, and a 'title is free text, level is not' rule. Titles used to be the only thing we had, which is why there are {big} unique ones.",
          "B: The unique title count is both hilarious and horrifying. How many do we collapse into the new level structure?",
          "A: About {pct} map cleanly. The rest need a manager conversation, and a few are things like 'Chief Happiness Officer' which I'm not touching without a drink.",
          "B: 😂 Do the cleanly mapped ones first, and let's not publish levels to employees until the comp ranges are signed off. ~rx:👍"
        ],
        [
          "A: How do we handle accrued PTO on migration? Workday expects balances per plan, legacy kept a single number.",
          "B: Split by plan using the entitlement rules. For carry-over balances use the legacy number but tag it as 'migrated balance'. The system will let us expire it according to policy.",
          "A: Understood. I'll test with the {n} people who have the biggest balances first, since if their numbers are wrong we'll hear about it immediately. ~r"
        ],
        [
          "A: ATS integration: when a candidate is marked 'hired' in Greenhouse, we create a pre-hire in Workday with the offer data. Today the job requisition ID is not carried over, so the position doesn't link.",
          "B: We need the req ID in the offer custom field, then the integration can match to the position. Without it, someone in HR ops will do it by hand.",
          "A: Adding the field to the offer template today. I'll test with two dummy hires in {env}. ~r"
        ]
      ],
      standup: [
        [
          "A: **Yesterday:** parallel payroll comparison for {region}. **Today:** variance analysis, then the review with payroll. **Blockers:** waiting for the legacy payroll register for one entity."
        ],
        [
          "A: Update: security role testing at {pct}. Found {n} issues with HRBP access, fixing them now. Will re-test tomorrow.",
          "B: Ping me when it's ready and I'll try with a real HRBP login. ~rx:👍"
        ],
        [
          "A: Working through the manager FAQ today. If you have questions you keep getting from your managers, drop them in this thread so I can include them."
        ],
        [
          "A: Quick status. Onboarding journey: copy reviewed, in build. Conversion: {pct} of mapping signed off. Open risk: the benefits carrier feed spec changed again.",
          "B: What's changed? I'll talk to the carrier about it today."
        ],
        [
          "A: Today I'm in the comp cycle calibration sessions, offline until {time}. Please message {B} for anything urgent on the pay run.",
          "B: On it."
        ],
        [
          "A: Done: org hierarchy load for {n} supervisory orgs. Doing: reconciling the headcount against finance. Blocker: finance counts contractors, HR doesn't, so we need to agree on a definition.",
          "B: Let's agree the definition in the steering call. I'll add it to the agenda. ~r"
        ],
        [
          "A: Morning. Survey: reminders went out, participation is now {pct}. If your team is below {pct2}, expect a nudge from me."
        ]
      ],
      blocker: [
        [
          "A: Blocked: the deployment partner has not delivered the integration spec for the benefits carrier. Test cycle starts {day} and we cannot load files without it.",
          "M: When was it promised? I'll call their partner lead today. If we don't have it by tomorrow I'd escalate to their director.",
          "A: Was due last {day2}. Thanks {me}. ~rx:🙏"
        ],
        [
          "A: Parallel payroll has {n} employees with a net pay difference over {usd}, and I can't tell if it's data or configuration. I need payroll to look at it.",
          "B: Share the list. I'll check each one against the legacy register today.",
          "A: Sending it over. All {n} are in the same pay group, so it feels like config. ~file:Payroll-variance-over-threshold.xlsx"
        ],
        [
          "A: Employee relations says three countries need works council approval before we can switch on manager self-service for performance data. That could push the go-live for those countries.",
          "B: Is it all three or only the one that flagged it?",
          "A: Legal is confirming. If it's all three, we'd phase those countries in after the first wave. ~r"
        ],
        [
          "A: The tenant refresh from production overwrote my test configuration. Again.",
          "B: Did you save the config as a bundle? We can reload it.",
          "A: Yes, but the bundle is two days old. I need to redo what's changed since. Roughly a day of work, ugh."
        ],
        [
          "A: Offboarding checklist is blocked because IT doesn't have the API to deprovision accounts automatically. It's still a ticket, and it takes {hours}.",
          "B: Did we ask Okta to create a deprovisioning hook from the termination event? That would close the gap.",
          "A: Raising it with IT. It's a security audit finding anyway. ~r"
        ],
        [
          "A: We still don't have the final headcount from finance. The conversion plan depends on it and the date is Friday.",
          "M: I'll talk to the finance lead today. Give me the specific fields you need so I can be precise.",
          "A: Cost centre, legal entity, FTE. Ideally on one sheet. Thanks."
        ],
        [
          "A: Legal wants to review the new offer letter templates for the three new countries and says it will take two weeks. We need them for the first wave.",
          "B: Can we go live with the existing templates in those countries and swap later? As long as they're approved.",
          "A: Existing templates don't have the pay transparency language. Legal might not accept that. I'll ask. ~r"
        ]
      ],
      decision: [
        [
          "A: Decision: do we migrate {n} years of historical performance reviews into the new system or archive them as PDFs?",
          "B: Archive. They're not needed for decisions and the mapping is a swamp. Link the PDFs from the employee record.",
          "A: Agreed. Locked in. ~pin:Decision ~rx:👍|✅"
        ],
        [
          "A: Cutover options: a big-bang go-live on {date}, or two waves by region?",
          "B: Two waves. Payroll risk is concentrated in the largest region and I'd rather learn on the smaller one first.",
          "M: Two waves. Wave 1 the smaller region, wave 2 four weeks later. Please update the plan and the comms. ✅ ~pin:Decision ~rx:👍|✅"
        ],
        [
          "A: Should managers approve their team's time off in the new system, or should it be auto-approved with notice?",
          "B: Approval by manager for now. We can relax it later when people trust the system.",
          "A: Done. ~rx:👍|✅"
        ],
        [
          "A: For the merit cycle, do we allow lump-sum payments above the band max?",
          "B: Yes, with HRBP approval. Otherwise we hit the ceiling for our top performers.",
          "C: And a cap of {pct} of base, so it doesn't become a back door for raises.",
          "A: Policy updated: HRBP approval, cap {pct}. ~rx:👍|✅"
        ],
        [
          "A: Survey cadence: quarterly pulse or twice a year deep survey?",
          "B: Twice a year deep survey plus a short quarterly pulse of 5 questions. Managers get action planning time after each one.",
          "A: Perfect. I'll update the people analytics roadmap. ~pin:Decision ~rx:✅|👍"
        ],
        [
          "A: Do we keep both legacy and new employee IDs visible after go-live?",
          "B: For {n} months yes. Payroll and benefits vendors still reference the old ones. Then retire the legacy ID.",
          "A: Noted, and I'll add the retirement date to the plan. ~rx:👍|✅"
        ],
        [
          "A: Training approach: instructor-led sessions for managers or short videos plus office hours?",
          "B: Videos plus office hours. People never have an hour free, and we get better completion on three-minute clips.",
          "M: Go with that. I'll ask comms to share the schedule. ✅ ~rx:👍|✅"
        ]
      ],
      launch: [
        [
          "A: Go-live checklist:\n- [x] Data load validated\n- [x] Integrations tested end-to-end\n- [x] Manager training {pct} complete\n- [ ] Hypercare rota\n- [ ] Go/no-go\nWe go on {date}.",
          "B: Hypercare rota is set. We have a floor-walker in each office for the first week.",
          "M: Great. Chair of the go/no-go will be me. Bring me your list of red items before {time}. ~rx:🚀|👍"
        ],
        [
          "A: Employee announcement draft: 'From {date}, you'll manage your time off, pay slips and personal details in one place. Your login stays the same. Here's a two-minute video and a one-page guide.'",
          "B: Add the help desk contact and the hours for the first week. People always search for that on day one.",
          "A: Added. ~rx:🚀|🎉"
        ],
        [
          "A: Wave 1 is live. First login success rate is {pct}. Help desk has {n} tickets, mostly 'where do I find my payslip'.",
          "B: A QR code on the poster would have helped, I'm adding one to the next announcement.",
          "A: Nice. ~rx:🎉|🚀"
        ],
        [
          "A: First live payroll on the new system finished and paid on time. 🎉 {pct} of the employees had zero differences compared with the parallel run.",
          "B: And the {n} exceptions are all explained. That is better than I expected.",
          "M: Thank you everyone for the long nights. We're pausing for a toast on Friday. ~rx:🎉|🚀"
        ],
        [
          "A: The new manager self-service is live today. Managers can now approve time off and start promotions from their phone.",
          "B: First promo already submitted. It took 4 minutes instead of 4 days 😮",
          "A: That's the dream. ~rx:🎉|🚀"
        ],
        [
          "A: Open enrollment starts Monday. The enrollment flow is live in {env}, tested with {n} pilot users and benefits carriers have confirmed receipt of test files.",
          "B: I'll send the comms at 9. Deadline is {date}, reminders weekly.",
          "A: Please also put a slide in the all-hands. ~rx:🚀|👍"
        ],
        [
          "A: Our first survey on the new tool just closed with {pct} participation. Up from last year!",
          "B: People said the mobile experience was the difference. Fewer clicks.",
          "A: We'll run the manager readouts next week. ~rx:🎉|🚀"
        ]
      ],
      chatter: [
        ["A: Does anyone know who owns the 'Employee Handbook' page in {wiki}? It still mentions fax numbers."],
        ["A: Who's covering the HR helpdesk on {day}?", "B: I am, until {time}. {p1} takes over after. ~r"],
        ["A: Just got my 4th email this week asking 'where is my payslip'.", "B: It's in the app, in 'Pay'. We need a bigger button."],
        ["A: It's fascinating how every employee has a different opinion about the lunch policy but nobody has an opinion about the pension.", "B: 😂 Nobody reads the pension doc."],
        ["A: Is a 'quick sync' on the calendar actually quick?", "B: Never."],
        ["A: Reminder: I-9 reviews due {day} for new hires from last week.", "B: Noted, I'm on it. ~rx:👍"],
        ["A: Reporting that the org chart is hilariously wrong for one department. Someone reports to a person who left in 2021.", "B: Send me the name, I'll fix it now."],
        ["A: Who wants to pilot the new manager toolkit with their team?", "B: I'll volunteer {p1}'s team, don't tell them 😄"],
        ["A: Does the new system send the welcome email at 3am? A new joiner got one.", "B: Time zone setting. Fixing."],
        ["A: Thanks to everyone who came to the office hours. We answered {n} questions and ate all the cookies.", "B: Cookies are the best change management tool."],
        ["A: Quick question: do we count a contractor who converts to employee as a new hire?", "B: Yes for onboarding, no for hiring metrics. Annoying but true. ~r"],
        ["A: I know it's a small thing, but the new profile photos make the org chart feel alive.", "B: Agreed. Except for {p1}, who uploaded a picture of a cat. We are letting it stay."],
        ["A: Reminder that the {team} team has a 'no meeting Friday' policy. Please respect it 🙏"],
        ["A: Anyone know a good way to explain compa-ratio to a new manager in 30 seconds?", "B: 'Where you are compared with the middle of the range for your role.' Works every time."],
        ["A: The new parental leave policy takes effect next month. I'm updating the FAQ.", "B: Please add the example for adoption leave, people ask. ~rx:👍"],
        ["A: Is there any way to export the open requisitions with hiring manager and days open?", "B: Yes, the Visier dashboard. Check {dash}. ~r"],
        ["A: Offer accepted for the {n}th time this month. HR life is so much better when people say yes 🙂"],
        ["A: Does the person who signs off the policy changes work in this channel?", "B: {p1}, I'll ping them."],
        ["A: I just gave a 20-minute training and discovered my slides still say 'SuccessFactors'.", "B: 😂 A classic."],
        ["A: Raise your hand if you've ever had to explain 'FTE' to an executive.", "B: ✋"],
        ["A: Our 'People Partner' title confuses everyone. Half of the company thinks we're a dating service.", "B: We're a matchmaking service for roles and people, technically."],
        ["A: Who has the latest version of the headcount report? There are three in circulation.", "B: Use {wiki}. The others are retired. ~r"],
        ["A: Good news: all {n} managers in the pilot completed the training module. Bad news: I wrote the quiz and one of the questions had two right answers.", "B: Credit for everyone then 😄"],
        ["A: Do we have a template for a 'stay interview'? Not the exit one.", "B: Yes, in the manager toolkit. The best question is 'what would make you leave?'."]
      ],
      incident: [
        [
          "A: Incident: the payroll integration sent last month's bank details for {n} employees. Pay would have gone to the wrong accounts.",
          "B: Hold the payment file. Do NOT release it.",
          "A: Held. The cause is a stale cache in the integration, the file was generated before the bank updates synced.",
          "M: Opening {ticket}. Payroll, please confirm the cutoff time with the bank so we can regenerate and still pay on time. ~pin:Incident",
          "A: Regenerating now. We'll compare each bank record against the tenant before release."
        ],
        [
          "A: An HRBP just told me she can see compensation for the executive team in the new system.",
          "B: That's a security domain issue. Revoke the role immediately and check the audit log for who accessed it.",
          "A: Revoked. Audit log shows {n} views by two users. I'm looping in security and legal. ~r",
          "B: Tell them it's a breach of policy but treat the two as innocent unless proven otherwise."
        ],
        [
          "A: The onboarding flow sent welcome emails to {n} candidates whose offers were not yet accepted.",
          "B: Recall what we can, and send an apology with an explanation.",
          "A: Draft apology: 'Our system sent you a message too early. Your offer is still being finalised and we'll be in touch soon.' Ok?",
          "B: Adjust the last sentence to make clear nothing has changed for them. Otherwise good. ~r"
        ]
      ]
    }
  },
  // @@NEXT@@
};
