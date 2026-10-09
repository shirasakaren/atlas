/**
 * Workspace-global technical/ops channels, part B: #data-and-analytics,
 * #security-corner, #oncall-handoff, #it-help. Authoring contract: ./chat-dsl.ts
 */
import type { GlobalChannelDef } from './chat-dsl';

export const GLOBAL_B: GlobalChannelDef[] = [
  // ═════════════════════════ #data-and-analytics ═════════════════════════
  {
    name: 'data-and-analytics',
    topic: 'dbt, Snowflake, dashboards and metric definitions. Check the semantic layer before you build a new number.',
    size: 7,
    mix: [
      ['dbt', 9],
      ['warehouse', 8],
      ['discrepancy', 9],
      ['metrics', 7],
      ['freshness', 6],
      ['sql', 8],
      ['governance', 8],
      ['notebooks', 5],
      ['generic:question', 3],
      ['generic:thanks', 2],
      ['generic:docs', 2],
      ['generic:social', 1],
      ['generic:ack', 1],
    ],
    cast: ['priya'],
    castWeight: 0.1,
    depts: ['Data & Analytics', 'Engineering', 'Finance', 'Product'],
    lex: {
      dtable: ['fct_orders', 'dim_customer', 'fct_invoice_lines', 'stg_stripe__charges', 'dim_account_hierarchy', 'fct_pipeline_snapshots', 'int_sessions_stitched', 'fct_support_tickets', 'dim_product_sku', 'fct_usage_daily', 'mart_revenue_recognition', 'stg_salesforce__opportunity'],
      wh: ['TRANSFORM_L', 'BI_XS', 'ADHOC_M', 'LOAD_WH', 'DS_SANDBOX', 'REVOPS_S', 'FINANCE_M', 'REPORTING_S', 'BACKFILL_XL', 'ML_TRAIN_L'],
      bimetric: ['active customers', 'net revenue retention', 'gross margin', 'weekly active users', 'ARR', 'logo churn', 'pipeline coverage', 'CAC payback', 'activation rate', 'booked revenue', 'support backlog', 'trial-to-paid conversion'],
      dashname: ['Exec KPI Board', 'Revenue Waterfall', 'Customer Health', 'Pipeline Review', 'Support Ops Overview', 'Product Adoption', 'Cloud Cost Explorer', 'Churn Watch', 'Regional Sales Scorecard', 'Weekly Business Review'],
      dtool: ['Looker', 'dbt Cloud', 'Airflow', 'Hex', 'Fivetran', 'Snowflake', 'Tableau', 'Monte Carlo', 'Census', 'Dagster'],
      owner: ['the growth analytics pod', 'FP&A', 'data platform', 'revenue operations', 'the finance systems team', 'customer success ops', 'product analytics', 'nobody, apparently'],
      piicol: ['email', 'phone_number', 'date_of_birth', 'ip_address', 'billing_address', 'national_id_last4', 'full_name', 'device_id'],
    },
    intro: [
      [
        "A: Welcome to #data-and-analytics. Ground rules:\n1. Ask metric questions here, not in DMs, so the answer is searchable.\n2. Before building a new number, check the semantic layer ({wiki}) for an existing definition.\n3. Never paste raw PII into the channel. Use the masked views or a row ID and we'll look it up.\n4. Pipeline broken? Post in the thread under the freshness alert, don't open a new thread.\n5. Notebook shares welcome, please say what the notebook does and who can run it.",
        "B: Pinning this. Also, office hours are Thursdays at {time}, bring your worst SQL. ~pin:Channel guidelines",
      ],
    ],
    pools: {
      // ───────────────────────── dbt ─────────────────────────
      dbt: [
        [
          "A: Anyone know why `{dtable}` went from 4 min to 31 min in the nightly run? Nothing in the model changed.",
          "B: Check the upstream. The Fivetran sync for that source switched to full resyncs after the schema change on {day}, so the incremental filter now scans everything.",
          "A: That's it. The `is_incremental()` block filters on `_loaded_at` and every row got a fresh timestamp. {thanks}",
          "B: Switch the filter to the business timestamp and add a 3-day lookback. Happy to review. ~rx:👍",
        ],
        [
          "A: Style question for the dbt crowd: do we put the casting in staging or in the intermediate layer? I keep seeing both.",
          "B: Staging. Rename, cast, nothing else. If you're joining in staging, something has gone wrong.",
          "C: Counterpoint: if the source is genuinely cursed (looking at you, `stg_salesforce__opportunity`) one light intermediate model saves everyone. But it needs a comment explaining why.",
          "B: Fair. Cursed sources get a documented exemption. It's in the style guide under 'sins we have agreed to'. {lol}",
        ],
        [
          "A: PSA: `dbt build` on CI now fails if a model has no description or no unique test on its primary key. Merged in {pr}.",
          "B: Oh no. I have {n} legacy models with neither.",
          "A: There's a grandfather list in `dbt_project.yml`, add yours with an owner and a date. After the date they fall out of the list and start failing. ~rx:😬|👍",
          "C: Honestly overdue. Half of my 'why is this duplicated' pings would have been caught by a unique test.",
        ],
        [
          "A: Is there a macro for converting fiscal periods? I'm about to write `case when month >= 2 then ...` for the fourth time in my life.",
          "B: `fiscal_period()` in the shared package. Our fiscal year starts in February, in case that wasn't obvious from the pain. Usage:\n```sql\nselect\n  order_id,\n  {{ fiscal_period('ordered_at') }} as fiscal_quarter\nfrom {{ ref('fct_orders') }}\n```",
          "A: Wonderful. Why is this not in the docs? ~r",
          "B: It is, under 'Date helpers', but the search for 'fiscal' returns nothing because the page title says 'Calendar utilities'. Fixing the title now.",
        ],
        [
          "A: Our `dim_customer` snapshot has {big} rows for what should be about 9,000 customers. Someone check my logic before I panic.",
          "B: Snapshot strategy `timestamp` on `updated_at`? If anything touches `updated_at` on every sync, you get a new version per row per day.",
          "A: Yep. Last_synced was being mapped into `updated_at` in the staging model. Oof.",
          "B: Switch to `check` strategy on the columns you actually care about, then prune the junk versions. I have a cleanup script, will share. ~rx:🙏",
        ],
        [
          "A: Merged a model rename and now three dashboards are showing 'table not found'. Do we have a deprecation process for this?",
          "B: Yes: keep the old name as a view pointing at the new model for two release cycles, and announce in here. It's in the contract doc ({wiki}).",
          "A: Right. I skipped that because it felt like paperwork. Restoring the alias view now, sorry everyone.",
          "C: It's ok, the lineage graph in {dtool} would have shown the downstream exposures. Worth a glance before you merge. ~rx:👍",
        ],
        [
          "A: Looking for a second opinion on this incremental model. Does the merge predicate look right to you?\n```sql\n{{ config(\n    materialized='incremental',\n    unique_key='event_id',\n    incremental_strategy='merge'\n) }}\n\nselect * from {{ ref('stg_events') }}\n{% if is_incremental() %}\nwhere event_ts > (select max(event_ts) - interval '3 days' from {{ this }})\n{% endif %}\n```",
          "B: Looks fine, but late-arriving events older than 3 days will never land. What's the actual max lateness?",
          "A: Mobile SDK buffers offline events, so... up to 14 days in the worst case.",
          "B: Then 3 days is going to bite you. Make it 15, accept the extra scan, and add a weekly full refresh for drift. ~r",
        ],
        [
          "A: `dbt test` is red on `accepted_values` for `plan_tier`. A new value 'enterprise_plus' appeared.",
          "B: That's from the pricing launch. Product didn't tell us, but good that the test caught it.",
          "A: Do I add it to the list or is it a mistake upstream?",
          "B: Add it. And ask {@C} to put us on the pricing-change announce list, so the next one doesn't arrive as a red build.",
        ],
        [
          "A: Quick one: ephemeral vs view vs table for an intermediate model that three marts depend on?",
          "B: If three things depend on it and it's non-trivial to compute, table. Ephemeral gets inlined three times and you pay three times.",
          "A: Makes sense. It's about 40M rows. Table it is.",
        ],
        [
          "A: Anyone using `dbt-expectations` for anomaly checks, or are we going with Monte Carlo for volume anomalies?",
          "B: Both, different jobs. dbt tests for logic (nulls, ranges, referential integrity), {dtool} for 'this table is usually 2M rows and today is 40k'.",
          "A: Fair, I was trying to pick one. Splitting the responsibility is cleaner.",
        ],
        [
          "A: heads up: I'm bumping dbt to the next minor on {day}. The only change that might bite is stricter handling of duplicate YAML keys. CI will tell you.",
          "B: Do I need to do anything for packages?",
          "A: `dbt deps` pulls the compatible versions, lockfile is already updated in {pr}. If you have a local venv, rebuild it.",
          "C: Thanks for the notice, much better than finding out from a failing run. ~rx:👍",
        ],
      ],
      // ───────────────────────── warehouse ─────────────────────────
      warehouse: [
        [
          "A: Snowflake credits jumped {pct} week over week. Anyone know what changed?",
          "B: Looking at the usage view. `{wh}` ran 11 hours on {day}, normally about 2.",
          "A: Who owns it?",
          "B: `ML_TRAIN_L` is the retraining job. Somebody set the warm-up loop to retry on failure with no cap. It retried {n} times overnight before anyone noticed. Killing it and adding a cap now.",
          "A: Ouch. Can we put a resource monitor on that one? ~r",
          "B: Doing it this afternoon. 80% notify, 100% suspend. ~rx:👍",
        ],
        [
          "A: Does anyone else's query on `{dtable}` crawl today? 12 minutes for something that took 40 seconds last week.",
          "B: Open the query profile and look for 'bytes spilled to remote storage'. If it's non-zero, the warehouse is too small for the join.",
          "A: Yes, 38 GB spilled. Wow.",
          "B: Either bump the warehouse for that run or filter before the join, you're joining a year of events against a full dimension. I'd filter first.",
          "A: Filtering first, down to 90 seconds. {thanks} ~rx:🎉",
        ],
        [
          "A: Cost review prep: top 5 queries by credits last month. Number one is a dashboard tile refreshing every 5 minutes on `{dashname}`.",
          "B: Nobody needs that tile at 5-minute freshness. Who owns the dashboard?",
          "C: That's us. It was set to 5 minutes for a launch week two quarters ago and never changed. I'll move it to hourly.",
          "A: That alone is about {usd} a month. Small things add up. ~rx:💸|👍",
        ],
        [
          "A: Is it safe to cluster `{dtable}` on `account_id`? It's 2 TB and most queries filter on it.",
          "B: Check the cardinality first. 9,000 accounts, heavily skewed to a handful of whales, will give you uneven micro-partitions. Try `account_id, event_date` and look at the clustering depth after a day.",
          "A: Makes sense. I'll test on a clone so I'm not paying to recluster production just to find out.",
          "B: Use `system$clustering_information` on the clone before and after. ~r",
        ],
        [
          "A: {greet}. Reminder that `{wh}` auto-suspend is 60s by default, not 10 minutes. If you've been setting it higher 'to avoid cold starts' please stop, you're paying for idle compute.",
          "B: Caching though? The result cache survives suspend, it's only the local disk cache that you lose.",
          "A: Right, and for dashboards that's fine. The one exception is the loader, which keeps its own warm period.",
        ],
        [
          "A: Is there a way to see who ran that 6-hour query yesterday? It's blocking my backfill.",
          "B: `account_usage.query_history`, filter on `execution_status = 'RUNNING'` and `total_elapsed_time`. Don't kill it yet, check the user first.",
          "A: It's a data science sandbox account. A notebook left running, probably.",
          "B: Ping them before killing, but yes. It's been eating the queue for 6 hours, I think 'sorry, notebook' is the likely answer. ~rx:😅",
        ],
        [
          "A: We're at {pct} of the monthly credit budget and it's only {date}. Finance is asking whether to expect an overage.",
          "B: Forecast says we land at 108% if nothing changes. The two drivers are the backfill and the Q-end reporting rush.",
          "A: Can the backfill move to the weekend on a smaller warehouse? Slower is fine.",
          "B: Yes, I'll chunk it by month and run it on `BACKFILL_XL`'s smaller sibling over the weekend. That alone claws back about 6 points.",
        ],
        [
          "M: Can someone from data platform explain to me, in two sentences, why the Snowflake line is red on the monthly cost report? I'm presenting to {dept} tomorrow.",
          "A: Short version: a runaway retry loop on the ML job plus an extra backfill. Both are fixed or scheduled off-peak now.",
          "B: And we're adding resource monitors with auto-suspend so a single job can't do that again. I'll send you a single slide for it. ~rx:🙏",
          "M: Perfect, that's exactly what I needed. {thanks}",
        ],
      ],
      // ───────────────────────── discrepancy ─────────────────────────
      discrepancy: [
        [
          "A: Finance says {bimetric} for last month is {big} and the {dashname} shows {big}. Which one is right?",
          "B: Probably both, depending on definition. Finance recognises revenue on the invoice date, the dashboard buckets on order date.",
          "C: Confirmed, and there's also a timezone issue. The dashboard cuts at UTC, finance cuts at Toronto time. Anything booked after 7pm on the last day lands in the following month.",
          "A: So the answer is 'it depends' with two footnotes. Wonderful. Can we at least label it on the dashboard?",
          "B: Yes, adding a definition tooltip and linking the metric page. ~rx:👍",
        ],
        [
          "A: The {dashname} says {big} {bimetric} and the CRM export says {big}. The CRM is higher. I've been told to 'reconcile' by Friday.",
          "B: First check: does the CRM count test accounts? We exclude anything with `is_internal = true`, they usually don't.",
          "A: Yes, 41 test accounts in there. That explains some of it but not all.",
          "B: Next suspect: duplicates after the account merge in the spring. Compare distinct `master_account_id` on both sides.",
          "A: That closes the gap down to 3. I can live with 3, and explain it. {thanks} ~rx:🙌",
        ],
        [
          "A: Our weekly numbers changed on a report I sent last Monday. Same query, different result. Is the data not stable?",
          "B: Late-arriving data. The weekly view backfills for 7 days after close, so the number you sent was preliminary.",
          "A: That's a trap for anyone who doesn't know. Is there a 'final' column or flag?",
          "B: `is_final` was added last quarter, flips at day 8. I'd put it as a tag on every export. We should surface it in the dashboards by default, filing it. ~r",
        ],
        [
          "A: Real question: why does the revenue waterfall not sum to the total? It's off by $212k.",
          "B: Rounding? Or is there an 'other' bucket that someone dropped from the chart?",
          "A: Not rounding. I found it, the FX adjustment line is filtered out by the default dashboard filter. Only 'USD-native' is selected.",
          "B: Classic. The filter default should be 'all'. Whoever set it presumably wanted a clean demo. ~rx:😅",
        ],
        [
          "A: Marketing's attribution report says {n} signups from paid search. Product analytics says {n2}. We're about to make budget calls based on it.",
          "B: Different attribution windows? Marketing is last-touch with a 30-day lookback, product is first-touch with 7.",
          "C: And one deduplicates by email while the other uses device ID. People sign up twice.",
          "A: OK, so neither is 'wrong' but we should not put both on the same slide. Can we agree one for budget decisions?",
          "B: Taking this to the metric council on {day}. Until then, label the source on every chart. ~rx:👍",
        ],
        [
          "A: Is the churn number on the {dashname} gross or net? It says {pct} and the board deck says {pct2}.",
          "B: The deck is net of expansion, the dashboard is logo churn. Different things sharing a word.",
          "A: Then the dashboard tile needs a rename, or someone will quote it as net. Can I rename to 'Logo churn'?",
          "B: Yes please, and link it to the definition page. I'll approve the PR in a few minutes.",
        ],
        [
          "A: Quick sanity check. Support ticket volume on my dashboard is down {pct} but Support says it's up. Who's lying?",
          "B: Nobody, the ticket table had a gap for {day} while the connector was failing. We've since backfilled, did your dashboard cache the old numbers?",
          "A: Probably. It's an extract, not a live connection.",
          "B: Force a refresh. If it still disagrees, send me the filter list and I'll dig. ~rx:👍",
        ],
      ],
      // ───────────────────────── metrics ─────────────────────────
      metrics: [
        [
          "A: Proposal: 'active customer' = at least one billable event in the last 30 days, excluding trials and internal accounts. Objections?",
          "B: Billable event or any event? Some of our customers are on prepaid plans and only generate 'billable' events at renewal.",
          "A: Hm. Fair, so they'd show as inactive 11 months a year.",
          "C: Use 'any API or UI event tied to a paid contract'. Slightly more generous, but it matches how Customer Success talks about health.",
          "A: Better. Updating the proposal and posting it for sign-off on {day}. ~rx:👍",
        ],
        [
          "A: Can we agree what 'weekly active users' means, once and for all? I have 3 definitions in 3 dashboards.",
          "B: In the semantic layer there's a single `wau` metric with the one signed-off definition. The other two are old.",
          "A: Then we should deprecate the others, loudly. If I can build a number from a raw table it will happen again.",
          "B: Agreed. We're hiding raw event tables from the BI role next quarter, and everything has to come from a metric. ~rx:🙌",
        ],
        [
          "A: In the semantic layer, can I add a dimension to `net_revenue_retention` without bumping the version?",
          "B: Additive dimensions: no bump. Changing the numerator or the filter: yes, new version, and we need a changelog entry.",
          "A: Adding `region` only. Thanks, that's very clear.",
        ],
        [
          "A: Debate time: should CAC include the salaries of the sales engineers?",
          "B: In the fully loaded version, yes. In the 'marketing efficiency' version, no. We have both, labelled.",
          "C: The problem is that the exec board only ever sees one of them and nobody remembers which.",
          "B: Then we put the label in the chart title. 'CAC (fully loaded)'. Boring but it works.",
        ],
        [
          "A: New metric request from Sales Ops: 'pipeline coverage'. Definition: open pipeline for the quarter divided by remaining quota. Is that right?",
          "B: Typically weighted or unweighted? Unweighted looks great and means nothing.",
          "A: Both, I think. 'Coverage (unweighted)' as the headline and weighted next to it.",
          "B: Good. Add 'stage ≥ 2' to the filter so they can't pad it with early-stage placeholders. ~rx:👍",
        ],
        [
          "A: Does anyone have the one-pager explaining the difference between ARR and contracted ARR? A new director on my side is asking.",
          "B: {wiki} has it under Metrics → Revenue → ARR. Short version: ARR is live subscriptions, contracted ARR includes signed deals that haven't started yet.",
          "A: Perfect, sending the link. {thanks}",
        ],
        [
          "M: Two teams have given me different numbers for {bimetric} in the same week. Which one should go in the {meeting} pack?",
          "A: The one on the {dashname}. It's certified, the other is a one-off extract with a custom filter.",
          "B: I'd add a footnote with the definition and date of extract. Reviewers always ask. ~rx:👍",
          "M: Great, I'll do that. {thanks}",
        ],
      ],
      // ───────────────────────── freshness ─────────────────────────
      freshness: [
        [
          "A: 🔴 Freshness alert: `{dtable}` hasn't updated for {hours}. Expected every hour.",
          "B: Looking. The upstream sync shows 'running' since 02:10, I think it's hung.",
          "B: Confirmed. Killed the sync and restarted. First batch landing now, ~15 min to catch up.",
          "A: Tracking in {ticket}. Anything downstream I should warn people about?",
          "B: The `{dashname}` will show yesterday's numbers until about {time}. Posting a banner. ~rx:🙏",
        ],
        [
          "A: 🟡 Warning: `{dtable}` row count is {pct} below the 7-day average.",
          "B: Could be a quiet day, it's a public holiday in two of our largest regions.",
          "A: Checked: same pattern last year, within a couple of points of normal. Resolving.",
        ],
        [
          "A: The overnight pipeline failed at the `{dtable}` step. Error: 'Numeric value 'N/A' is not recognized'.",
          "B: Someone typed 'N/A' into a numeric source field. I'll add a `try_to_number` in the staging model and flag the row.",
          "A: Do we know where it came from?",
          "B: A finance spreadsheet import. I'll ask them to switch to the validated template. Fixed forward, rerunning the DAG. ~rx:👍",
        ],
        [
          "A: Is anyone else's {dtool} dashboard blank? Getting 'Failed to load data' since about {time}.",
          "B: Yes, we've had {n} reports. Looks like the BI service lost its connection to the warehouse after the credential rotation.",
          "A: The rotation was today?",
          "B: Yes, the secret in the BI connection wasn't updated. Fix in progress, {n2} minutes. Sorry for the noise. ~rx:😬",
        ],
        [
          "A: Weekly reminder that the `{dashname}` data is refreshed at 06:00 UTC. If you are looking at it before then, you are looking at yesterday.",
          "B: Could we show the last refresh time in the header? Every Monday somebody asks.",
          "A: Yes. It's a one-line change, I'll ship it today. ~rx:👍",
        ],
        [
          "A: Fivetran says the connector is healthy, but nothing's landed from the billing system since yesterday. What gives?",
          "B: The connector is 'healthy' because it's syncing 0 rows without error. The upstream API returned an empty page after their release. I've opened a case with them.",
          "A: So the monitor needs a row-count check, not just a status check.",
          "B: Exactly, adding a volume anomaly check this sprint. ~rx:👍",
        ],
      ],
      // ───────────────────────── sql ─────────────────────────
      sql: [
        [
          "A: Best way to get the latest row per customer without a self-join?",
          "B: `qualify` is your friend on Snowflake:\n```sql\nselect *\nfrom {{ ref('fct_pipeline_snapshots') }}\nqualify row_number() over (\n  partition by account_id\n  order by snapshot_date desc\n) = 1;\n```",
          "A: I had a subquery nested 3 levels deep. I am embarrassed and grateful. ~rx:😂|🙏",
        ],
        [
          "A: Is there a neat way to get week-over-week change in one query? Mine is 40 lines.",
          "B: `lag` over a weekly aggregate:\n```sql\nwith weekly as (\n  select date_trunc('week', ordered_at) as wk, sum(amount) as rev\n  from fct_orders\n  group by 1\n)\nselect wk, rev,\n  rev / nullif(lag(rev) over (order by wk), 0) - 1 as wow\nfrom weekly\norder by wk;\n```",
          "A: 40 lines to 10. ok. {thanks}",
        ],
        [
          "A: My backfill is going to take 9 hours. Any tricks?",
          "B: Don't do it in one transaction. Chunk by month and loop:\n```sql\ninsert into fct_usage_daily\nselect * from stg_usage\nwhere usage_date >= '2025-01-01'\n  and usage_date <  '2025-02-01';\n```\nThen run months in parallel on a bigger warehouse, it's cheaper than serial on a small one because you pay by time.",
          "A: Splitting by month, running 4 at a time. Also, noted that bigger and shorter beats smaller and longer. ~rx:👍",
        ],
        [
          "A: Why does `count(distinct user_id)` give a different answer from the `approx_count_distinct` in the other report?",
          "B: HLL is an estimate, error up to about 2%. Fine for dashboards, not for anything that's going to be reconciled with finance.",
          "A: That explains the 1.6% gap. I'll use the exact count for the audit pack. ~rx:👍",
        ],
        [
          "A: Is a CTE that I reference 3 times computed 3 times in Snowflake?",
          "B: Usually the optimizer materialises it once, but not guaranteed. If it's expensive and used more than twice, put it in a temp table and be sure.",
          "A: I've been trusting the optimizer. I'll test with the query profile.",
        ],
        [
          "A: Need a gap-and-island query: continuous active periods per customer, where a gap of >30 days starts a new period.",
          "B: Two-step window trick:\n```sql\nselect customer_id, min(event_date) as start_date, max(event_date) as end_date\nfrom (\n  select *,\n    sum(is_new) over (partition by customer_id order by event_date) as grp\n  from (\n    select customer_id, event_date,\n      iff(datediff('day', lag(event_date) over (partition by customer_id order by event_date), event_date) > 30, 1, 0) as is_new\n    from fct_usage_daily\n  )\n)\ngroup by customer_id, grp;\n```",
          "A: I would never have got there. That is a beautiful, awful query. ~rx:😂",
          "B: Add a comment above it. Future you will not remember either.",
        ],
        [
          "A: How do I safely remove duplicates from a table I can't recreate?",
          "B: Step 1: `create table x_backup clone x;` Step 2: delete using the row_number trick on a key. Step 3: check counts. Never skip step 1. ~rx:👍",
          "A: Cloning is the zero-copy one, right? So it's cheap.",
          "B: Right, instant and free until you diverge. It's the best feature of the platform, honestly.",
        ],
        [
          "A: Does anyone have a query to find unused tables? I think we're hoarding about 400 of them.",
          "B: Join `access_history` to `tables` and look for zero reads in 90 days:\n```sql\nselect t.table_catalog, t.table_schema, t.table_name, t.bytes\nfrom snowflake.account_usage.tables t\nleft join (\n  select distinct f.value:objectName::string as obj\n  from snowflake.account_usage.access_history,\n    lateral flatten(base_objects_accessed) f\n  where query_start_time > dateadd('day', -90, current_date)\n) a on a.obj = t.table_catalog || '.' || t.table_schema || '.' || t.table_name\nwhere a.obj is null and t.deleted is null\norder by t.bytes desc;\n```",
          "A: Brilliant, running it now. Storage savings incoming.",
          "C: Please warn owners before dropping anything. Time travel is not an excuse. ~rx:👍",
        ],
      ],
      // ───────────────────────── governance ─────────────────────────
      governance: [
        [
          "A: Who owns `{dtable}`? There's no owner tag and I need to change a column type.",
          "B: Last committed by {C}, but I believe it moved to {owner} in the re-org.",
          "C: Not me anymore. It's with {owner}. I'll update the owner tag so it stops being a mystery.",
          "A: {thanks} Flagging a rule for the checklist: no table without an owner tag. ~rx:👍",
        ],
        [
          "A: We've found `{piicol}` in an analytics table that is readable by the whole BI role.",
          "B: Thanks for flagging. Masking policy goes on today. Do we know who's queried it recently?",
          "A: Access history says 3 people, all internal analysts. Looks benign, but I've opened {ticket} with Security so it's on record.",
          "B: Good. We'll tag it as PII in the catalog and gate the raw column to the privileged role. ~rx:🙏",
        ],
        [
          "A: Heads up: data contract change for `{dtable}`. Column `status` is going from free text to an enum with 6 values. Effective {date}.",
          "B: Does it hit consumers? I read it in the Finance exports.",
          "A: Yes, but only if they filter on text that is no longer valid. A mapping table is in {wiki}. Please check your queries.",
          "C: Thanks for the notice with a date. Seriously, bless you. ~rx:🙌",
        ],
        [
          "A: Can I get access to the raw customer table for an analysis? I only need aggregates.",
          "B: Use the masked view, `customer_masked`. Aggregates work fine on it and you don't need the raw PII at all.",
          "A: Perfect, I didn't realise it existed. Requesting the role now.",
          "B: Mention your manager in the access request. Then it auto-approves. ~rx:👍",
        ],
        [
          "A: Reminder that the quarterly access review is open. If you own tables, please re-certify who has access by {date}.",
          "B: How many tables am I responsible for?",
          "A: The review tool lists them. Anything with PII or financial data is mandatory, the rest is best effort. ~rx:👍",
        ],
        [
          "A: Is `{dtable}` covered by the 90-day retention policy?",
          "B: It's covered by the 13-month one because it has finance data. 90 days is for the raw event logs only.",
          "A: Great, that matches what I told Legal. {thanks}",
        ],
        [
          "A: We deleted a customer on request last week. How do we confirm the deletion also reached the warehouse and the BI extracts?",
          "B: The deletion job logs to `privacy_requests_log`, and extracts are rebuilt nightly, so by tomorrow it's gone everywhere. Time travel has a 7-day tail on the warehouse side, we document that for Legal.",
          "A: And backups?",
          "B: Rolling 35 days, then gone. It's in the privacy notice, and Compliance signs off on that wording. ~rx:👍",
        ],
        [
          "A: Who approves new columns in the certified layer?",
          "B: The data council, weekly on {day}. Submit the change in the contract template. If it's additive and non-PII it's usually approved in one pass.",
          "A: Thanks, submitting now.",
        ],
      ],
      // ───────────────────────── notebooks ─────────────────────────
      notebooks: [
        [
          "A: Sharing a {dtool} notebook on churn drivers: logistic regression on 18 months of usage features. Anyone can clone it, uses the masked views only. {wiki}",
          "B: Nice. Which features ranked highest?",
          "A: Days since last login and the number of support tickets in the last 60 days. Boring but it validates what CS already suspects.",
          "B: Boring is the best kind of validation. Sharing with CS. ~rx:🙌",
        ],
        [
          "A: I built a notebook that explains why our forecast misses on the last week of each quarter. TL;DR: deals pushed from week 12 into the next quarter. Link: {wiki}",
          "B: The reps are always optimistic in week 12. 😅",
          "C: Could you add a slice by region? I suspect APAC is the main driver.",
          "A: Sure, give me an hour. ~r",
        ],
        [
          "A: Does anyone have a good template for a notebook that explains an A/B test result to non-statisticians?",
          "B: {wiki} has one. It starts with the decision, then the effect size, then the confidence, then the caveats. Leave out the p-value until the end.",
          "A: Love that structure. Decision first. ~rx:👍",
        ],
        [
          "A: FYI I've published the weekly metrics notebook. It's parameterised, so you can run it for your region. Takes about 2 minutes.",
          "B: You're a lifesaver. I've been doing this by hand for the last year.",
          "A: Please don't tell me that. ~rx:😂",
        ],
        [
          "A: I made a cost explorer notebook that breaks Snowflake spend by team using query tags. Fair warning: it only works if you tag your queries.",
          "B: Which I do not. Where is the tagging docs?",
          "A: {wiki}. One-liner: `alter session set query_tag = 'team:finance'`. ~rx:👍",
        ],
      ],
    },
  },
  // @@APPEND@@
];
