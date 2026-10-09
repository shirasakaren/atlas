/**
 * Expands the catalog into full project records: description documents,
 * members, gallery media, tags, bookmarks, contribution requests & invites.
 */
import { coverDataUri } from '../assets';
import { DAY, HOUR, MIN } from '../clock';
import { ME_ID } from '../config';
import { registerSeeder } from '../db';
import { slugify, type Rng } from '../prng';
import type {
  BookmarkRec,
  ContributionRec,
  InviteRec,
  MediaRec,
  MemberRec,
  ProjectKind,
  ProjectRec,
} from '../schema';
import { bookmarks, collabRoles, contributions, invites, media, members, projects, tags, users } from '../store';
import { CATALOG, type CatalogEntry } from './catalog';
import { CAST, COLLAB_ROLE_NAMES } from './people';
import type { ProjectPhase, ProjectRole } from '@/lib/types';

// ─── Tiptap document helpers ─────────────────────────────────────────

type Node = Record<string, unknown>;
const text = (t: string, marks?: Node[]): Node => ({ type: 'text', text: t, ...(marks ? { marks } : {}) });
const para = (...c: (string | Node)[]): Node => ({
  type: 'paragraph',
  content: c.map((x) => (typeof x === 'string' ? text(x) : x)),
});
const heading = (t: string, level = 2): Node => ({ type: 'heading', attrs: { level }, content: [text(t)] });
const bullets = (items: string[]): Node => ({
  type: 'bulletList',
  content: items.map((i) => ({ type: 'listItem', content: [para(i)] })),
});
const bold = (t: string): Node => text(t, [{ type: 'bold' }]);
export const doc = (...content: Node[]) => ({ type: 'doc', content });

// ─── Per-kind pools ──────────────────────────────────────────────────

const GOALS: Record<ProjectKind, string[]> = {
  software: [
    'Ship the first production slice to a pilot group within the first quarter',
    'Reduce p95 latency of the critical user flows below 300 ms',
    'Retire the legacy code path and delete it from the repository',
    'Reach 80%+ automated test coverage on the new services',
    'Give on-call engineers a single runbook and dashboard per service',
    'Publish stable, versioned APIs with consumer-driven contract tests',
  ],
  mobile: [
    'Hit a 4.7+ store rating and a crash-free session rate above 99.7%',
    'Cut cold-start time by 40% on mid-range devices',
    'Support full offline use for the three most common workflows',
    'Release on a predictable two-week train with staged rollouts',
    'Pass accessibility review for VoiceOver and TalkBack',
  ],
  data: [
    'Move every tier-one dataset to the governed platform with lineage',
    'Cut median dashboard load time from 14 s to under 3 s',
    'Reduce monthly compute spend by 30% through workload tuning',
    'Establish data owners and SLAs for every certified dataset',
    'Backfill three years of history without breaking downstream reports',
    'Document and test every business-critical metric definition',
  ],
  security: [
    'Close all high and critical findings before the audit window',
    'Automate evidence collection for 90% of in-scope controls',
    'Reduce mean time to remediate vulnerabilities to under 14 days',
    'Enforce phishing-resistant MFA for every privileged account',
    'Complete a tabletop exercise with executive participation',
    'Publish updated policies and obtain 100% employee attestation',
  ],
  infrastructure: [
    'Achieve a tested recovery time objective of 15 minutes',
    'Cut the monthly infrastructure bill without hurting reliability',
    'Standardize on infrastructure-as-code for every environment',
    'Give every service an SLO and an error-budget policy',
    'Eliminate snowflake servers and manual change windows',
    'Complete the migration with zero customer-visible downtime',
  ],
  finance: [
    'Shorten the monthly close by three working days',
    'Reach 95% touchless invoice processing',
    'Reconcile intercompany balances automatically each night',
    'Provide budget owners with self-service variance reporting',
    'Pass external audit sampling with zero material findings',
    'Cut manual journal entries by 60%',
  ],
  people: [
    'Reach 90%+ completion of required steps within the first 30 days',
    'Improve manager satisfaction with HR tooling above 4.2 / 5',
    'Migrate all employee data with verified parity checks',
    'Reduce HR ticket volume by 35% through self-service',
    'Roll out in waves by region with a clear change-management plan',
  ],
  marketing: [
    'Increase marketing-sourced pipeline by 20% year over year',
    'Launch on schedule with every asset approved and localized',
    'Reduce cost per qualified lead below target',
    'Achieve consistent brand usage across every channel',
    'Build a repeatable playbook other regions can adopt',
  ],
  design: [
    'Adopt the shared components in 90% of new screens',
    'Pass an independent WCAG 2.2 AA audit',
    'Cut design-to-development handoff time in half',
    'Document usage guidelines with real product examples',
    'Run quarterly usability sessions with at least eight participants',
  ],
  operations: [
    'Deliver on time and within the approved capital budget',
    'Keep operations running with no unplanned downtime during cutover',
    'Train 100% of affected staff before go-live',
    'Hit throughput targets within the first 60 days of operation',
    'Capture lessons learned and update the playbook',
  ],
  legal: [
    'Respond to every request inside the statutory deadline',
    'Maintain a complete, auditable record of processing activities',
    'Standardize on approved templates for 90% of agreements',
    'Train all business owners on their new responsibilities',
    'Pass the next regulator or customer audit without findings',
  ],
  research: [
    'Produce a go / no-go recommendation backed by measured results',
    'Define evaluation criteria and test sets before building anything',
    'Keep every experiment inside the data-handling boundaries',
    'Share findings in an open internal readout',
    'Estimate cost to scale before asking for production funding',
  ],
  'supply-chain': [
    'Raise on-time-in-full to 97% across all lanes',
    'Cut inventory carrying cost by 12% without hurting service levels',
    'Give suppliers real-time visibility into orders and payments',
    'Reduce expedited freight spend by 30%',
    'Validate the model against twelve months of historical data',
  ],
  customer: [
    'Cut time-to-value for new customers by 40%',
    'Lift customer satisfaction above 92% on the new flow',
    'Deflect 25% of tickets through better self-service',
    'Detect at-risk accounts at least 60 days earlier',
    'Equip every CSM with a consistent playbook and tooling',
  ],
  sales: [
    'Shorten the average quote-to-cash cycle by a week',
    'Reach 95% adoption among quota-carrying reps within 60 days',
    'Improve forecast accuracy to within 5% each quarter',
    'Remove manual steps from deal desk approvals',
    'Enable partners with a clear program and reliable payouts',
  ],
};

const RISKS = [
  'Competing priorities for shared engineering capacity in the final quarter',
  'Vendor delivery dates that depend on a third party outside our control',
  'Data quality issues in legacy source systems that surface late',
  'Change fatigue in teams already absorbing two other rollouts',
  'Regulatory interpretation changing mid-project',
  'Key-person dependency on a small number of domain experts',
  'Integration complexity with systems that have no test environment',
  'Budget approval for phase two landing after the planned start date',
];

const STACK: Record<ProjectKind, string[]> = {
  software: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Kafka', 'Kubernetes', 'GraphQL', 'Redis', 'Terraform'],
  mobile: ['Swift', 'Kotlin', 'SwiftUI', 'Jetpack Compose', 'GraphQL', 'Firebase', 'Fastlane', 'Detox'],
  data: ['Snowflake', 'dbt', 'Airflow', 'Python', 'Spark', 'Kafka', 'Looker', 'Great Expectations'],
  security: ['Okta', 'CrowdStrike', 'Vault', 'Splunk', 'Wiz', 'Terraform', 'OPA'],
  infrastructure: ['AWS', 'Terraform', 'Kubernetes', 'Datadog', 'Argo CD', 'Prometheus', 'Ansible'],
  finance: ['SAP S/4HANA', 'Coupa', 'Anaplan', 'Power BI', 'Workato', 'Blackline'],
  people: ['Workday', 'Greenhouse', 'Culture Amp', 'Okta', 'Workato'],
  marketing: ['HubSpot', 'Salesforce', 'Contentful', 'Figma', 'Segment', 'Google Analytics'],
  design: ['Figma', 'Storybook', 'React', 'Style Dictionary', 'Playwright', 'axe-core'],
  operations: ['SAP EWM', 'Power BI', 'ServiceNow', 'Honeywell', 'Zebra'],
  legal: ['Ironclad', 'OneTrust', 'ServiceNow', 'DocuSign', 'Workato'],
  research: ['Python', 'PyTorch', 'LangChain', 'pgvector', 'AWS Bedrock', 'Jupyter'],
  'supply-chain': ['SAP IBP', 'Python', 'Snowflake', 'project44', 'Manhattan WMS', 'OR-Tools'],
  customer: ['Salesforce', 'Zendesk', 'Gainsight', 'Segment', 'Looker'],
  sales: ['Salesforce', 'Clari', 'Gong', 'DocuSign', 'Workato'],
};

const MEMBER_TITLES: Record<ProjectKind, string[]> = {
  software: ['Frontend Engineer', 'Backend Engineer', 'QA Engineer', 'DevOps / SRE', 'Product Designer', 'Technical Writer', 'Business Analyst'],
  mobile: ['Mobile Engineer', 'Backend Engineer', 'QA Engineer', 'Product Designer', 'UX Researcher', 'DevOps / SRE'],
  data: ['Data Engineer', 'Data Scientist', 'Business Analyst', 'Backend Engineer', 'Technical Writer', 'QA Engineer'],
  security: ['Security Analyst', 'DevOps / SRE', 'Backend Engineer', 'Change Manager', 'Technical Writer', 'Business Analyst'],
  infrastructure: ['DevOps / SRE', 'Backend Engineer', 'Security Analyst', 'Program Manager', 'Technical Writer'],
  finance: ['Business Analyst', 'Program Manager', 'Change Manager', 'Data Engineer', 'QA Engineer'],
  people: ['Program Manager', 'Change Manager', 'Business Analyst', 'Data Engineer', 'Technical Writer'],
  marketing: ['Product Designer', 'Program Manager', 'Business Analyst', 'Frontend Engineer', 'Technical Writer'],
  design: ['Product Designer', 'UX Researcher', 'Frontend Engineer', 'QA Engineer', 'Technical Writer'],
  operations: ['Program Manager', 'Business Analyst', 'Change Manager', 'Data Engineer'],
  legal: ['Business Analyst', 'Program Manager', 'Security Analyst', 'Change Manager', 'Technical Writer'],
  research: ['Data Scientist', 'Backend Engineer', 'Security Analyst', 'Product Designer', 'UX Researcher'],
  'supply-chain': ['Business Analyst', 'Data Scientist', 'Program Manager', 'Backend Engineer', 'Change Manager'],
  customer: ['Business Analyst', 'Program Manager', 'Data Engineer', 'Change Manager', 'Technical Writer'],
  sales: ['Business Analyst', 'Program Manager', 'Data Engineer', 'Change Manager', 'Technical Writer'],
};

/** Departments whose staff naturally staff a kind of project. */
const STAFFING: Record<ProjectKind, [string, number][]> = {
  software: [['Engineering', 6], ['Product', 2], ['Design', 2], ['Security', 1], ['Transformation Office', 1], ['IT & Infrastructure', 1]],
  mobile: [['Engineering', 6], ['Product', 2], ['Design', 2], ['Customer Success', 1]],
  data: [['Data & Analytics', 6], ['Engineering', 2], ['Finance', 1], ['Transformation Office', 1], ['IT & Infrastructure', 1]],
  security: [['Security', 5], ['IT & Infrastructure', 3], ['Engineering', 2], ['Legal & Compliance', 1], ['Transformation Office', 1]],
  infrastructure: [['IT & Infrastructure', 6], ['Engineering', 3], ['Security', 2], ['Finance', 1]],
  finance: [['Finance', 6], ['IT & Infrastructure', 2], ['Transformation Office', 2], ['Data & Analytics', 1], ['Supply Chain', 1]],
  people: [['People Operations', 6], ['IT & Infrastructure', 2], ['Transformation Office', 2], ['Legal & Compliance', 1]],
  marketing: [['Marketing', 6], ['Design', 2], ['Sales Operations', 1], ['Engineering', 1], ['Data & Analytics', 1]],
  design: [['Design', 6], ['Engineering', 3], ['Product', 2]],
  operations: [['Supply Chain', 3], ['Transformation Office', 3], ['IT & Infrastructure', 2], ['People Operations', 1], ['Finance', 1]],
  legal: [['Legal & Compliance', 5], ['Security', 2], ['IT & Infrastructure', 2], ['Transformation Office', 1], ['Data & Analytics', 1]],
  research: [['Engineering', 4], ['Data & Analytics', 3], ['Security', 1], ['Design', 1]],
  'supply-chain': [['Supply Chain', 6], ['Data & Analytics', 2], ['Finance', 1], ['Engineering', 1], ['IT & Infrastructure', 1]],
  customer: [['Customer Success', 6], ['Data & Analytics', 1], ['Engineering', 1], ['Product', 1], ['Marketing', 1]],
  sales: [['Sales Operations', 6], ['Customer Success', 1], ['Finance', 1], ['Data & Analytics', 1], ['Engineering', 1]],
};

const DEPT_LEAD: Record<string, string> = {
  Engineering: CAST.daniel.id,
  'Data & Analytics': CAST.priya.id,
  Security: CAST.tomas.id,
  Product: CAST.nadia.id,
  Design: CAST.hannah.id,
  Marketing: CAST.sofia.id,
  Finance: CAST.ravi.id,
  'People Operations': CAST.amara.id,
  'Legal & Compliance': CAST.james.id,
  'Supply Chain': CAST.elena.id,
  'Customer Success': CAST.oliver.id,
  'IT & Infrastructure': CAST.kenji.id,
};

const CONTRIB_MESSAGES = [
  "I've worked on a similar migration at my previous company and would love to help with the cutover planning.",
  'Our team depends on this and I can commit around 4 hours a week. Happy to take on testing or documentation.',
  'I have the domain context from the last rollout and can help shape the requirements.',
  'Would like to join to represent the finance stakeholders. I can review designs and sign off on process changes.',
  "I'm between projects next sprint and have experience with the tooling involved.",
  'Keen to learn and contribute. I can take on analysis tasks, data validation and status reporting.',
  'I led the pilot for this in the EMEA region and can share what worked and what did not.',
];

// ─── Seeder ──────────────────────────────────────────────────────────

function longDescription(rng: Rng, e: CatalogEntry) {
  const goals = rng.sample(GOALS[e.kind], 4);
  const risks = rng.sample(RISKS, 2);
  return doc(
    para(e.short),
    heading('Why now'),
    para(
      `This initiative was sponsored by the ${e.dept} leadership team after the annual planning cycle identified it as a top-five delivery priority. `,
      'The current state creates avoidable manual work, inconsistent customer and employee experiences, and a growing maintenance burden. ',
      'Delivering it now lets us retire older systems before the next budget cycle.',
    ),
    heading('Goals'),
    bullets(goals),
    heading('Scope'),
    para(
      bold('In scope: '),
      'design, build, rollout and enablement for the primary user groups; migration of in-flight work; operational runbooks and reporting.',
    ),
    para(bold('Out of scope: '), 'a second phase for adjacent business units, which will be re-planned after the first release.'),
    heading('Key risks'),
    bullets(risks),
    heading('How we work'),
    para(
      'Weekly steering update on Thursdays, a fortnightly demo, and decisions recorded in the project notes. ',
      'Tasks live in the lists on this project; ask in the project chat if anything is unclear.',
    ),
  );
}

registerSeeder({
  name: 'projects',
  order: 12,
  run({ rng, now }) {
    const allUsers = users().all();
    const byDept = new Map<string, string[]>();
    for (const u of allUsers) {
      if (u.id === ME_ID) continue;
      const l = byDept.get(u.department) ?? [];
      l.push(u.id);
      byDept.set(u.department, l);
    }
    const tagByName = new Map(tags().all().map((t) => [t.name, t.id]));
    const usedSlugs = new Set<string>();

    const recs: ProjectRec[] = [];
    const mediaRecs: MediaRec[] = [];
    const memberRecs: MemberRec[] = [];
    let memberSeq = 1;
    let mediaSeq = 1;

    CATALOG.forEach((e, idx) => {
      const id = `prj_${String(idx + 1).padStart(3, '0')}`;
      let slug = slugify(e.title);
      if (usedSlugs.has(slug)) slug = `${slug}-${idx + 1}`;
      usedSlugs.add(slug);

      // Timeline: shipped/archived are older; active ones started months ago.
      const ageDays =
        e.phase === 'SHIPPED' || e.phase === 'ARCHIVED'
          ? rng.int(260, 700)
          : e.phase === 'IDEA'
            ? rng.int(5, 40)
            : e.phase === 'PLANNING'
              ? rng.int(14, 90)
              : rng.int(60, 360);
      const createdAt = new Date(now - ageDays * DAY).toISOString();
      const updatedMs =
        e.phase === 'ARCHIVED'
          ? rng.int(120, 300) * DAY
          : e.phase === 'SHIPPED'
            ? rng.int(5, 60) * DAY
            : rng.int(8 * MIN, 5 * DAY);
      const updatedAt = new Date(now - updatedMs).toISOString();

      const ownerId = e.me === 'O' ? ME_ID : (e.owner ?? DEPT_LEAD[e.dept] ?? rng.pick(byDept.get(e.dept) ?? [allUsers[1]!.id]));

      // Cover art + gallery
      const thumb = coverDataUri(`${e.key}-${e.title}`, 0);
      const gallery = rng.int(2, 4);
      for (let g = 0; g < gallery; g++) {
        mediaRecs.push({
          id: `med_${String(mediaSeq++).padStart(5, '0')}`,
          projectId: id,
          url: coverDataUri(`${e.key}-${e.title}`, g + 1),
          type: 'IMAGE',
          order: g,
          width: 1200,
          height: 675,
          sizeBytes: rng.int(90_000, 480_000),
        });
      }

      const recruiting =
        (e.phase === 'PLANNING' || e.phase === 'IN_DEVELOPMENT' || e.phase === 'IDEA') && rng.chance(0.45)
          ? rng.sample(COLLAB_ROLE_NAMES, rng.int(1, 3))
          : [];

      recs.push({
        id,
        slug,
        title: e.title,
        shortDescription: e.short,
        description: longDescription(rng, e),
        thumbnailUrl: thumb,
        thumbnailType: 'IMAGE',
        techStack: rng.sample(STACK[e.kind], rng.int(3, 5)),
        phase: e.phase,
        visibility: e.priv ? 'PRIVATE' : 'PUBLIC',
        collaborationRoles: recruiting,
        archivedAt: e.phase === 'ARCHIVED' ? new Date(now - rng.int(100, 250) * DAY).toISOString() : null,
        publishedAt: e.phase === 'IDEA' ? null : new Date(new Date(createdAt).getTime() + rng.int(1, 5) * DAY).toISOString(),
        createdAt,
        updatedAt,
        ownerId,
        tagIds: e.tags.map((t) => tagByName.get(t)).filter((x): x is string => !!x),
        pinned: !!e.pinned,
        internalLinks: {
          pmTool: `https://tracker.halcyon.example/${e.key.toLowerCase()}`,
          repository: e.kind === 'software' || e.kind === 'mobile' || e.kind === 'data' || e.kind === 'infrastructure' || e.kind === 'research'
            ? `https://git.halcyon.example/${slug}`
            : undefined,
          staging: ['software', 'mobile', 'customer'].includes(e.kind) ? `https://staging.${slug}.halcyon.example` : undefined,
          designs: ['software', 'mobile', 'design', 'marketing'].includes(e.kind) ? `https://figma.halcyon.example/file/${e.key.toLowerCase()}` : undefined,
        },
        kind: e.kind,
        department: e.dept,
        key: e.key,
      });

      // ── Members ──
      const picked = new Set<string>();
      const add = (userId: string, role: ProjectRole, title: string | null) => {
        if (picked.has(userId)) return;
        picked.add(userId);
        memberRecs.push({
          id: `mem_${String(memberSeq++).padStart(5, '0')}`,
          projectId: id,
          userId,
          role,
          title,
          joinedAt: new Date(new Date(createdAt).getTime() + rng.int(0, Math.max(1, ageDays - 2)) * DAY * 0.6).toISOString(),
        });
      };

      // Owner is always a manager.
      add(ownerId, 'PROJECT_MANAGER', ownerId === ME_ID ? 'Program Manager' : 'Executive Sponsor');
      // Persona
      if (e.me === 'M') add(ME_ID, 'PROJECT_MANAGER', 'Program Manager');
      if (e.me === 'C') add(ME_ID, 'CONTRIBUTOR', rng.pick(['Program Manager', 'Business Analyst', 'Change Manager']));

      // 1-2 more managers from the staffing departments
      const staffing = STAFFING[e.kind];
      const pickFromStaffing = (): string => {
        const dept = rng.weighted(staffing as unknown as readonly (readonly [string, number])[]);
        const pool = byDept.get(dept) ?? byDept.get(e.dept)!;
        return rng.pick(pool);
      };
      const extraManagers = rng.int(1, 2);
      for (let i = 0; i < extraManagers; i++) add(pickFromStaffing(), 'PROJECT_MANAGER', rng.pick(['Delivery Lead', 'Technical Lead', 'Product Owner']));

      const total =
        e.phase === 'IDEA' ? rng.int(3, 6) : e.phase === 'PLANNING' ? rng.int(5, 9) : e.phase === 'ARCHIVED' ? rng.int(6, 10) : rng.int(8, 17);
      let guard = 0;
      while (picked.size < total && guard++ < 200) {
        add(pickFromStaffing(), 'CONTRIBUTOR', rng.pick(MEMBER_TITLES[e.kind]));
      }
    });

    projects().insertMany(recs);
    media().insertMany(mediaRecs);
    members().insertMany(memberRecs);

    // ── Bookmarks for the persona ──
    const bookmarkTargets = ['EDW', 'SOC2', 'ERP', 'GENA', 'MOB5', 'DSYS', 'BILL', 'MRF', 'HRZN'];
    const bms: BookmarkRec[] = [];
    bookmarkTargets.forEach((key, i) => {
      const p = recs.find((r) => r.key === key);
      if (p) bms.push({ id: `bkm_${String(i + 1).padStart(3, '0')}`, userId: ME_ID, projectId: p.id, createdAt: new Date(now - (i + 2) * DAY * 3).toISOString() });
    });
    bookmarks().insertMany(bms);

    // ── Contribution requests ──
    const contribs: ContributionRec[] = [];
    let cSeq = 1;
    const mkContrib = (
      projectId: string,
      userId: string,
      status: ContributionRec['status'],
      ageH: number,
      resolver?: string,
    ) => {
      const created = new Date(now - ageH * HOUR).toISOString();
      const resolved = status === 'PENDING' ? null : new Date(now - (ageH - rng.int(2, 20)) * HOUR).toISOString();
      contribs.push({
        id: `con_${String(cSeq++).padStart(4, '0')}`,
        projectId,
        userId,
        role: rng.pick(COLLAB_ROLE_NAMES),
        message: rng.pick(CONTRIB_MESSAGES),
        status,
        resolvedAt: resolved,
        resolvedById: status === 'PENDING' || status === 'WITHDRAWN' ? null : (resolver ?? ME_ID),
        resolutionNote:
          status === 'REJECTED' ? 'Thanks for the interest. We are at capacity this quarter, please check back after the next planning cycle.' : null,
        createdAt: created,
        updatedAt: resolved ?? created,
      });
    };

    const managedByMe = recs.filter((r) => memberRecs.some((m) => m.projectId === r.id && m.userId === ME_ID && m.role === 'PROJECT_MANAGER'));
    const nonMembers = (pid: string) => allUsers.filter((u) => u.id !== ME_ID && !memberRecs.some((m) => m.projectId === pid && m.userId === u.id));
    // Pending requests waiting on the persona
    for (const p of managedByMe.filter((p) => p.phase !== 'SHIPPED' && p.phase !== 'ARCHIVED').slice(0, 7)) {
      const pool = nonMembers(p.id);
      for (let i = 0; i < rng.int(1, 2); i++) mkContrib(p.id, rng.pick(pool).id, 'PENDING', rng.int(3, 120));
    }
    // Resolved history on persona's projects
    for (const p of managedByMe.slice(0, 8)) {
      const pool = nonMembers(p.id);
      mkContrib(p.id, rng.pick(pool).id, rng.pick(['APPROVED', 'REJECTED', 'WITHDRAWN']), rng.int(200, 900));
    }
    // The persona's own requests to other projects
    const others = recs.filter((r) => r.visibility === 'PUBLIC' && r.phase !== 'ARCHIVED' && !memberRecs.some((m) => m.projectId === r.id && m.userId === ME_ID));
    const mine = rng.sample(others, 4);
    mkContrib(mine[0]!.id, ME_ID, 'PENDING', 30);
    mkContrib(mine[1]!.id, ME_ID, 'PENDING', 71);
    mkContrib(mine[2]!.id, ME_ID, 'REJECTED', 400, mine[2]!.ownerId);
    mkContrib(mine[3]!.id, ME_ID, 'WITHDRAWN', 560);
    // A scattering across the portfolio for admin views
    for (const p of rng.sample(recs, 14)) mkContrib(p.id, rng.pick(nonMembers(p.id)).id, rng.pick(['PENDING', 'APPROVED', 'REJECTED']), rng.int(10, 700), p.ownerId);
    contributions().insertMany(contribs);

    // ── Invites ──
    const invs: InviteRec[] = [];
    const inviteTargets = rng.sample(others.filter((p) => p.phase === 'IN_DEVELOPMENT' || p.phase === 'PLANNING'), 3);
    inviteTargets.forEach((p, i) =>
      invs.push({
        id: `inv_${String(i + 1).padStart(3, '0')}`,
        projectId: p.id,
        invitedUserId: ME_ID,
        invitedById: p.ownerId,
        role: i === 0 ? 'PROJECT_MANAGER' : 'CONTRIBUTOR',
        title: i === 0 ? 'Program Manager' : 'Business Analyst',
        status: 'PENDING',
        createdAt: new Date(now - (i + 1) * 9 * HOUR).toISOString(),
      }),
    );
    // Invites the persona sent
    for (const [i, p] of managedByMe.slice(0, 3).entries()) {
      const target = rng.pick(nonMembers(p.id));
      invs.push({
        id: `inv_${String(10 + i).padStart(3, '0')}`,
        projectId: p.id,
        invitedUserId: target.id,
        invitedById: ME_ID,
        role: 'CONTRIBUTOR',
        title: rng.pick(MEMBER_TITLES[p.kind]),
        status: rng.pick(['PENDING', 'ACCEPTED', 'DECLINED'] as const),
        createdAt: new Date(now - rng.int(20, 200) * HOUR).toISOString(),
      });
    }
    invites().insertMany(invs);

    // Re-assert collab roles table is populated (people seeder owns it).
    void collabRoles();
    void (0 as unknown as ProjectPhase);
  },
});
