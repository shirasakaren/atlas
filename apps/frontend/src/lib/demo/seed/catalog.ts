/**
 * The portfolio: ~80 projects across Halcyon Global. One line each; the
 * projects seeder expands them into full records (description, members,
 * media, links…).
 *
 * `me`: how the persona (Maya) relates to it: O = owns & manages, M = manages,
 * C = contributes. Unset = not a member.
 */
import type { ProjectPhase } from '@/lib/types';
import type { ProjectKind } from '../schema';

export interface CatalogEntry {
  key: string;
  title: string;
  kind: ProjectKind;
  dept: string;
  phase: ProjectPhase;
  short: string;
  me?: 'O' | 'M' | 'C';
  tags: string[];
  /** Hidden from non-members. */
  priv?: boolean;
  /** Owner id override (defaults to the department's leader). */
  owner?: string;
  pinned?: boolean;
}

const E = 'Engineering';
const D = 'Data & Analytics';
const S = 'Security';
const P = 'Product';
const DS = 'Design';
const MK = 'Marketing';
const F = 'Finance';
const HR = 'People Operations';
const L = 'Legal & Compliance';
const SC = 'Supply Chain';
const CS = 'Customer Success';
const SO = 'Sales Operations';
const IT = 'IT & Infrastructure';
const TO = 'Transformation Office';

export const CATALOG: CatalogEntry[] = [
  // ── Software / product engineering ─────────────────────────────────
  { key: 'PORT', title: 'Customer Portal Redesign', kind: 'software', dept: P, phase: 'IN_DEVELOPMENT', me: 'O', pinned: true,
    short: 'Rebuild the self-service customer portal on the new design system: faster, accessible and finally mobile-friendly.',
    tags: ['Q4 Priority', 'Customer-Facing', 'Web', 'React', 'TypeScript'] },
  { key: 'GATE', title: 'API Gateway Consolidation', kind: 'software', dept: E, phase: 'IN_DEVELOPMENT',
    short: 'Collapse four legacy gateways into a single policy-driven edge with unified auth, quotas and observability.',
    tags: ['Platform', 'Cost Reduction', 'TypeScript', 'Kubernetes'] },
  { key: 'BILL', title: 'Billing Engine Rewrite', kind: 'software', dept: E, phase: 'IN_REVIEW', me: 'C', pinned: true,
    short: 'Replace the 11-year-old invoicing monolith with an event-sourced billing engine that supports usage-based pricing.',
    tags: ['Board Initiative', 'Finance', 'Platform', 'TypeScript', 'AWS'] },
  { key: 'DEVX', title: 'Developer Experience Platform', kind: 'software', dept: E, phase: 'IN_DEVELOPMENT', me: 'C',
    short: 'Golden paths, self-service environments and a service catalog so a new engineer ships on day three, not week three.',
    tags: ['Internal Tooling', 'Platform', 'Kubernetes', 'TypeScript'] },
  { key: 'MONO', title: 'Monolith-to-Services Migration', kind: 'software', dept: E, phase: 'IN_DEVELOPMENT', owner: 'usr_kenji_tanaka',
    short: 'Strangler-fig extraction of the order, catalog and identity domains from the core monolith, one bounded context at a time.',
    tags: ['Platform', 'Board Initiative', 'Kubernetes', 'AWS'] },
  { key: 'SRCH', title: 'Search Relevance Overhaul', kind: 'software', dept: P, phase: 'PLANNING',
    short: 'Rework product and help-center search with hybrid lexical + vector retrieval and a proper relevance feedback loop.',
    tags: ['Customer-Facing', 'Growth', 'Python', 'Web'] },
  { key: 'PART', title: 'Partner Integration Hub', kind: 'software', dept: E, phase: 'IN_DEVELOPMENT',
    short: 'A self-serve developer portal and webhook platform so partners can integrate without a solutions engineer.',
    tags: ['Growth', 'Customer-Facing', 'TypeScript', 'AWS'] },
  { key: 'FLAG', title: 'Feature Flag Platform Rollout', kind: 'software', dept: E, phase: 'SHIPPED', me: 'C',
    short: 'Company-wide progressive delivery: flags, experiments and kill-switches wired into every deploy pipeline.',
    tags: ['Internal Tooling', 'Platform', 'TypeScript'] },
  { key: 'OMS', title: 'Order Management Modernization', kind: 'software', dept: E, phase: 'IN_DEVELOPMENT',
    short: 'Move order orchestration to a workflow engine with idempotent fulfilment steps and real-time status for support.',
    tags: ['Platform', 'Operations', 'Kubernetes', 'AWS'] },
  { key: 'NOTI', title: 'Notification Service v3', kind: 'software', dept: E, phase: 'SHIPPED',
    short: 'One service for email, SMS, push and in-app messaging with templating, preferences and delivery analytics.',
    tags: ['Platform', 'Customer-Facing', 'TypeScript'] },

  // ── Mobile ─────────────────────────────────────────────────────────
  { key: 'MOB5', title: 'Halcyon Mobile App 5.0', kind: 'mobile', dept: P, phase: 'IN_DEVELOPMENT', me: 'O', pinned: true,
    short: 'The biggest mobile release in company history: offline mode, biometric sign-in and a redesigned home feed.',
    tags: ['Q4 Priority', 'Customer-Facing', 'Mobile', 'Swift', 'Kotlin'] },
  { key: 'FIELD', title: 'Field Technician App', kind: 'mobile', dept: E, phase: 'IN_REVIEW', me: 'M',
    short: 'Replace paper work orders with an offline-first app for 1,400 field technicians, including photo capture and e-signatures.',
    tags: ['Operations', 'Mobile', 'Kotlin'] },
  { key: 'LOYAL', title: 'Loyalty Wallet Integration', kind: 'mobile', dept: MK, phase: 'PLANNING',
    short: 'Add loyalty cards to Apple and Google Wallet with real-time points, tier status and location-based offers.',
    tags: ['Growth', 'Mobile', 'Swift'] },
  { key: 'SCAN', title: 'Warehouse Scanner Rollout', kind: 'mobile', dept: SC, phase: 'SHIPPED',
    short: 'Rugged-device app for receiving, put-away and cycle counts across nine distribution centres.',
    tags: ['Operations', 'Supply Chain', 'Mobile', 'Kotlin'] },

  // ── Data & analytics ───────────────────────────────────────────────
  { key: 'EDW', title: 'Enterprise Data Warehouse Migration', kind: 'data', dept: D, phase: 'IN_DEVELOPMENT', me: 'M', pinned: true,
    short: 'Retire the on-prem warehouse and move 400 TB of curated data to Snowflake with zero reporting downtime.',
    tags: ['Board Initiative', 'Cost Reduction', 'Data', 'Snowflake', 'Python'] },
  { key: 'C360', title: 'Customer 360 Platform', kind: 'data', dept: D, phase: 'IN_DEVELOPMENT', me: 'C',
    short: 'A unified customer profile stitched from CRM, billing, support and product telemetry, available to every team.',
    tags: ['Data', 'Customer Experience', 'Snowflake', 'Python'] },
  { key: 'FCST', title: 'Demand Forecasting Models v2', kind: 'data', dept: D, phase: 'IN_REVIEW',
    short: 'Hierarchical forecasting models with promotion and weather effects, cutting forecast error by a target 18%.',
    tags: ['Data', 'Supply Chain', 'Python'] },
  { key: 'SSA', title: 'Self-Serve Analytics Portal', kind: 'data', dept: D, phase: 'IN_DEVELOPMENT',
    short: 'Governed semantic layer and a metrics catalog so business teams stop filing tickets for every dashboard.',
    tags: ['Data', 'Internal Tooling', 'Snowflake'] },
  { key: 'DQO', title: 'Data Quality & Observability', kind: 'data', dept: D, phase: 'PLANNING', me: 'C',
    short: 'Automated freshness, volume and schema checks on every critical pipeline, with owner-routed alerts.',
    tags: ['Data', 'Platform', 'Python'] },
  { key: 'MDM', title: 'Master Data Management Program', kind: 'data', dept: D, phase: 'IN_DEVELOPMENT',
    short: 'A single golden record for customers, products and suppliers across ERP, CRM and e-commerce.',
    tags: ['Data', 'Board Initiative', 'SAP'] },
  { key: 'CHRN', title: 'Churn Prediction Pilot', kind: 'data', dept: CS, phase: 'SHIPPED',
    short: 'Early-warning model for at-risk enterprise accounts, now feeding the customer success playbooks.',
    tags: ['Data', 'Customer Experience', 'Python'] },
  { key: 'KPI', title: 'Executive KPI Dashboard', kind: 'data', dept: TO, phase: 'IN_DEVELOPMENT', me: 'O',
    short: 'One trusted view of company health for the leadership team: revenue, delivery, risk and people metrics.',
    tags: ['Q4 Priority', 'Data', 'Board Initiative'] },

  // ── Security ───────────────────────────────────────────────────────
  { key: 'SOC2', title: 'SOC 2 Type II Readiness', kind: 'security', dept: S, phase: 'IN_DEVELOPMENT', me: 'O', pinned: true,
    short: 'Evidence collection, control testing and policy updates ahead of the Q1 audit window.',
    tags: ['Compliance', 'Security', 'Q4 Priority'] },
  { key: 'ZTNA', title: 'Zero Trust Network Rollout', kind: 'security', dept: S, phase: 'IN_DEVELOPMENT', me: 'C',
    short: 'Replace the legacy VPN with identity-aware access to every internal application.',
    tags: ['Security', 'Platform', 'Board Initiative'] },
  { key: 'PAM', title: 'Privileged Access Management', kind: 'security', dept: S, phase: 'PLANNING', priv: true,
    short: 'Just-in-time elevation, session recording and vaulted credentials for production and finance systems.',
    tags: ['Security', 'Compliance'] },
  { key: 'VRM', title: 'Vendor Risk Assessment Automation', kind: 'security', dept: S, phase: 'IN_DEVELOPMENT',
    short: 'Questionnaire intake, scoring and continuous monitoring for 600+ third-party vendors.',
    tags: ['Security', 'Compliance', 'Internal Tooling'] },
  { key: 'SAW', title: 'Security Awareness Program', kind: 'security', dept: S, phase: 'SHIPPED',
    short: 'Role-based training, phishing simulations and a security champions network across every department.',
    tags: ['Security', 'People'] },
  { key: 'SECR', title: 'Secrets Management Migration', kind: 'security', dept: IT, phase: 'IN_REVIEW', me: 'C',
    short: 'Move every hard-coded and environment-stored secret into a central vault with automated rotation.',
    tags: ['Security', 'Platform', 'AWS'] },
  { key: 'PEN', title: 'Pen Test Remediation Q3', kind: 'security', dept: S, phase: 'IN_DEVELOPMENT', priv: true,
    short: 'Track and close every finding from the Q3 external penetration test before the re-test.',
    tags: ['Security', 'Compliance', 'Q4 Priority'] },

  // ── Infrastructure & IT ────────────────────────────────────────────
  { key: 'MRF', title: 'Multi-Region Failover Program', kind: 'infrastructure', dept: IT, phase: 'IN_DEVELOPMENT', me: 'M',
    short: 'Active-active deployment across two cloud regions with a tested 15-minute recovery objective.',
    tags: ['Platform', 'Board Initiative', 'AWS', 'Kubernetes'] },
  { key: 'K8S', title: 'Kubernetes Platform Upgrade', kind: 'infrastructure', dept: IT, phase: 'IN_REVIEW',
    short: 'Roll every production cluster to the next minor version with zero customer-visible disruption.',
    tags: ['Platform', 'Kubernetes'] },
  { key: 'FIN', title: 'Cloud Cost Optimization (FinOps)', kind: 'infrastructure', dept: IT, phase: 'IN_DEVELOPMENT', me: 'O',
    short: 'Rightsizing, commitments and tagging hygiene to take 22% out of the annual cloud bill.',
    tags: ['Cost Reduction', 'Q4 Priority', 'AWS'] },
  { key: 'OBS', title: 'Observability Stack Consolidation', kind: 'infrastructure', dept: IT, phase: 'PLANNING',
    short: 'Three monitoring tools become one: shared dashboards, tracing and an SLO-driven alerting policy.',
    tags: ['Platform', 'Cost Reduction'] },
  { key: 'DCX', title: 'Data Center Exit', kind: 'infrastructure', dept: IT, phase: 'IN_DEVELOPMENT', priv: true,
    short: 'Decommission the last two colocation facilities by migrating 340 workloads to the cloud.',
    tags: ['Cost Reduction', 'Board Initiative', 'AWS'] },
  { key: 'EPM', title: 'Endpoint Management Modernization', kind: 'infrastructure', dept: IT, phase: 'SHIPPED',
    short: 'Zero-touch laptop provisioning and compliance posture checks for 5,200 devices.',
    tags: ['Internal Tooling', 'Security'] },
  { key: 'SSO', title: 'Identity Provider Consolidation', kind: 'infrastructure', dept: IT, phase: 'IN_DEVELOPMENT', me: 'C',
    short: 'One workforce identity provider, SCIM everywhere, and no more app-local passwords.',
    tags: ['Security', 'Platform'] },

  // ── Finance ────────────────────────────────────────────────────────
  { key: 'ERP', title: 'ERP Consolidation (SAP S/4HANA)', kind: 'finance', dept: F, phase: 'IN_DEVELOPMENT', me: 'M', pinned: true,
    short: 'Merge three regional ERPs into a single global instance: chart of accounts, intercompany and close in one place.',
    tags: ['Board Initiative', 'Finance', 'SAP', 'Cost Reduction'] },
  { key: 'P2P', title: 'Procure-to-Pay Automation', kind: 'finance', dept: F, phase: 'IN_DEVELOPMENT',
    short: 'Touchless PO matching and approvals, cutting invoice cycle time from 19 days to under 5.',
    tags: ['Finance', 'Cost Reduction', 'SAP'] },
  { key: 'ASC', title: 'Revenue Recognition ASC 606 Update', kind: 'finance', dept: F, phase: 'IN_REVIEW', priv: true,
    short: 'Systemize multi-element contract accounting ahead of the new subscription bundles.',
    tags: ['Finance', 'Compliance'] },
  { key: 'FPA', title: 'Annual Planning & Budget Tool', kind: 'finance', dept: F, phase: 'PLANNING',
    short: 'Replace the 40-tab planning workbook with a driver-based model that every budget owner can use.',
    tags: ['Finance', 'Internal Tooling'] },
  { key: 'EXP', title: 'Expense Management Replacement', kind: 'finance', dept: F, phase: 'SHIPPED',
    short: 'New card-and-receipt workflow with policy-aware approvals and instant reimbursement.',
    tags: ['Finance', 'Internal Tooling'] },
  { key: 'TRSY', title: 'Treasury Visibility Dashboard', kind: 'finance', dept: F, phase: 'IDEA',
    short: 'Daily global cash position and FX exposure in a single view for the treasury team.',
    tags: ['Finance', 'Data'] },

  // ── People ─────────────────────────────────────────────────────────
  { key: 'HRIS', title: 'HRIS Migration', kind: 'people', dept: HR, phase: 'IN_DEVELOPMENT', me: 'M',
    short: 'Move 7,800 employee records, payroll feeds and org structures to the new HR system of record.',
    tags: ['People', 'Board Initiative'] },
  { key: 'ONB', title: 'Global Onboarding Experience', kind: 'people', dept: HR, phase: 'IN_REVIEW', me: 'C',
    short: 'A consistent, personalized first 90 days for every new hire, from offer accepted to first quarterly review.',
    tags: ['People', 'Growth'] },
  { key: 'PERF', title: 'Performance Review Redesign', kind: 'people', dept: HR, phase: 'PLANNING',
    short: 'Lighter, more frequent check-ins with calibrated outcomes and clearer growth paths.',
    tags: ['People'] },
  { key: 'LRN', title: 'Learning Academy Launch', kind: 'people', dept: HR, phase: 'IN_DEVELOPMENT',
    short: 'Internal learning platform with curated paths for engineering, product and leadership development.',
    tags: ['People', 'Growth'] },
  { key: 'PAYQ', title: 'Pay Equity Analysis', kind: 'people', dept: HR, phase: 'IN_DEVELOPMENT', priv: true,
    short: 'Annual statistical review of compensation across levels and regions, with remediation recommendations.',
    tags: ['People', 'Compliance', 'Data'] },
  { key: 'HYB', title: 'Hybrid Work Program', kind: 'people', dept: HR, phase: 'SHIPPED',
    short: 'Office neighbourhoods, booking tools and team agreements for the new hybrid operating model.',
    tags: ['People', 'Operations'] },

  // ── Marketing ──────────────────────────────────────────────────────
  { key: 'BRND', title: 'Brand Refresh 2026', kind: 'marketing', dept: MK, phase: 'IN_DEVELOPMENT', me: 'C',
    short: 'New visual identity, tone of voice and templates rolled out across every customer touchpoint.',
    tags: ['Marketing', 'Customer-Facing', 'Q4 Priority'] },
  { key: 'MAUT', title: 'Marketing Automation Replatform', kind: 'marketing', dept: MK, phase: 'IN_DEVELOPMENT',
    short: 'Migrate 240 campaigns and 3M contacts to a new automation suite with real attribution.',
    tags: ['Marketing', 'Salesforce', 'Cost Reduction'] },
  { key: 'PERS', title: 'Website Personalization', kind: 'marketing', dept: MK, phase: 'PLANNING',
    short: 'Account-based content and onsite experiments driven by firmographic and behavioural signals.',
    tags: ['Marketing', 'Growth', 'Web', 'React'] },
  { key: 'ADV', title: 'Customer Advocacy Program', kind: 'marketing', dept: MK, phase: 'IN_DEVELOPMENT',
    short: 'References, case studies and a customer council that sales can actually find and use.',
    tags: ['Marketing', 'Customer Experience', 'Growth'] },
  { key: 'HRZN', title: 'Horizon 2026 Customer Conference', kind: 'marketing', dept: MK, phase: 'PLANNING', me: 'M',
    short: 'Plan and run the 2,500-person annual conference: venue, content tracks, speakers and the live-stream.',
    tags: ['Marketing', 'Growth', 'Q4 Priority'] },
  { key: 'SEO', title: 'Content Hub & SEO Overhaul', kind: 'marketing', dept: MK, phase: 'SHIPPED',
    short: 'Rebuilt the content hub with a topic-cluster architecture; organic traffic is up 34% year over year.',
    tags: ['Marketing', 'Web', 'Growth'] },

  // ── Design ─────────────────────────────────────────────────────────
  { key: 'DSYS', title: 'Design System 3.0', kind: 'design', dept: DS, phase: 'IN_DEVELOPMENT', me: 'C', owner: 'usr_hannah_lindgren',
    short: 'Tokens, components and documentation shared by web, mobile and email, with themes for every brand.',
    tags: ['Platform', 'Web', 'React', 'Internal Tooling'] },
  { key: 'A11Y', title: 'Accessibility Remediation (WCAG 2.2)', kind: 'design', dept: DS, phase: 'IN_DEVELOPMENT', me: 'M',
    short: 'Audit and fix the top 40 customer journeys to meet WCAG 2.2 AA before the regulatory deadline.',
    tags: ['Compliance', 'Customer-Facing', 'Web'] },
  { key: 'UXR', title: 'User Research Repository', kind: 'design', dept: DS, phase: 'IDEA',
    short: 'A searchable, tagged archive of every interview, survey and usability test the company has run.',
    tags: ['Research', 'Internal Tooling'] },

  // ── Operations ─────────────────────────────────────────────────────
  { key: 'WHA2', title: 'Warehouse Automation Phase 2', kind: 'operations', dept: SC, phase: 'IN_DEVELOPMENT',
    short: 'Goods-to-person picking and conveyor sortation at the Memphis and Rotterdam hubs.',
    tags: ['Operations', 'Supply Chain', 'Board Initiative'] },
  { key: 'HQ', title: 'Toronto HQ Consolidation', kind: 'operations', dept: TO, phase: 'IN_DEVELOPMENT', me: 'O',
    short: 'Consolidate three downtown offices into a single hybrid-ready headquarters by the end of Q2.',
    tags: ['Cost Reduction', 'Operations', 'People'] },
  { key: 'BCP', title: 'Business Continuity Plan Refresh', kind: 'operations', dept: TO, phase: 'IN_REVIEW', me: 'O', priv: true,
    short: 'Update continuity and disaster-recovery plans for every critical business process and run the tabletop exercises.',
    tags: ['Compliance', 'Operations'] },
  { key: 'CSP', title: 'Customer Support Platform Consolidation', kind: 'operations', dept: CS, phase: 'IN_DEVELOPMENT',
    short: 'Merge two helpdesks and the chat vendor into one omnichannel support platform.',
    tags: ['Customer Experience', 'Cost Reduction', 'Salesforce'] },

  // ── Supply chain ───────────────────────────────────────────────────
  { key: 'SUPL', title: 'Supplier Portal', kind: 'supply-chain', dept: SC, phase: 'IN_DEVELOPMENT',
    short: 'Self-service onboarding, purchase orders, ASNs and invoice status for 1,200 suppliers.',
    tags: ['Supply Chain', 'Web', 'SAP'] },
  { key: 'LMD', title: 'Last-Mile Delivery Optimization', kind: 'supply-chain', dept: SC, phase: 'IN_DEVELOPMENT', me: 'M',
    short: 'Dynamic routing and carrier selection to hit a 97% on-time delivery target at lower cost per drop.',
    tags: ['Operations', 'Supply Chain', 'Data', 'Python'] },
  { key: 'INV', title: 'Inventory Optimization Engine', kind: 'supply-chain', dept: SC, phase: 'IN_REVIEW',
    short: 'Multi-echelon safety-stock model across 90 SKUs families and nine distribution centres.',
    tags: ['Supply Chain', 'Data', 'Python'] },
  { key: 'PACK', title: 'Sustainable Packaging Initiative', kind: 'supply-chain', dept: SC, phase: 'PLANNING',
    short: 'Cut packaging weight by 25% and move to 100% recyclable materials without raising damage rates.',
    tags: ['Operations', 'Supply Chain', 'Cost Reduction'] },
  { key: 'TARF', title: 'Tariff Impact Modeling', kind: 'supply-chain', dept: F, phase: 'IN_DEVELOPMENT', priv: true,
    short: 'Scenario model of landed-cost exposure by SKU, lane and supplier under evolving trade policy.',
    tags: ['Finance', 'Supply Chain', 'Data'] },

  // ── Legal & compliance ─────────────────────────────────────────────
  { key: 'DSR', title: 'GDPR Data Subject Request Automation', kind: 'legal', dept: L, phase: 'IN_DEVELOPMENT', me: 'C',
    short: 'Automate access, deletion and portability requests across 38 systems within the 30-day statutory window.',
    tags: ['Compliance', 'Security', 'Data'] },
  { key: 'CLM', title: 'Contract Lifecycle Management Rollout', kind: 'legal', dept: L, phase: 'IN_DEVELOPMENT',
    short: 'Templates, clause library, approvals and renewal alerts for every commercial contract.',
    tags: ['Compliance', 'Internal Tooling', 'Salesforce'] },
  { key: 'PRIV', title: 'Global Privacy Program (CCPA / LGPD)', kind: 'legal', dept: L, phase: 'IN_REVIEW',
    short: 'Harmonize consent, retention and records-of-processing across regions into one privacy operating model.',
    tags: ['Compliance', 'Legal'] },
  { key: 'POL', title: 'Policy Management Hub', kind: 'legal', dept: L, phase: 'SHIPPED',
    short: 'One home for every corporate policy with owners, review cycles and employee attestations.',
    tags: ['Compliance', 'Internal Tooling'] },

  // ── Research / innovation ──────────────────────────────────────────
  { key: 'GENA', title: 'Generative AI Assistant Pilot', kind: 'research', dept: E, phase: 'IN_DEVELOPMENT', me: 'C', pinned: true,
    short: 'Retrieval-grounded internal assistant for support, sales and engineering, with strict data boundaries.',
    tags: ['Q4 Priority', 'Growth', 'Python', 'AWS'] },
  { key: 'EDGE', title: 'Edge Computing Feasibility Study', kind: 'research', dept: IT, phase: 'IDEA',
    short: 'Evaluate moving latency-sensitive inference and caching to edge locations for retail partners.',
    tags: ['Research', 'Platform'] },
  { key: 'PQC', title: 'Quantum-Safe Cryptography Study', kind: 'research', dept: S, phase: 'IDEA', priv: true,
    short: 'Inventory cryptographic dependencies and plan the migration to post-quantum algorithms.',
    tags: ['Research', 'Security'] },

  // ── Customer success ───────────────────────────────────────────────
  { key: 'COA', title: 'Customer Onboarding Automation', kind: 'customer', dept: CS, phase: 'IN_DEVELOPMENT', me: 'C',
    short: 'Guided, milestone-based onboarding that cuts time-to-value for enterprise customers from 90 to 45 days.',
    tags: ['Customer Experience', 'Growth', 'Salesforce'] },
  { key: 'VOC', title: 'Voice of Customer Program', kind: 'customer', dept: CS, phase: 'SHIPPED',
    short: 'Always-on listening across surveys, calls and reviews, with themes routed to the right product owners.',
    tags: ['Customer Experience', 'Research'] },
  { key: 'KB2', title: 'Support Knowledge Base 2.0', kind: 'customer', dept: CS, phase: 'IN_REVIEW',
    short: 'Rewrite the 1,800-article help center with a content model, ownership and deflection analytics.',
    tags: ['Customer Experience', 'Web'] },
  { key: 'EAH', title: 'Enterprise Account Health Scoring', kind: 'customer', dept: CS, phase: 'PLANNING',
    short: 'A transparent, explainable health score combining usage, sentiment and commercial signals.',
    tags: ['Customer Experience', 'Data'] },

  // ── Sales operations ───────────────────────────────────────────────
  { key: 'CPQ', title: 'CPQ Implementation', kind: 'sales', dept: SO, phase: 'IN_DEVELOPMENT',
    short: 'Guided quoting with pricing guardrails and automated approvals, replacing 14 spreadsheet quote tools.',
    tags: ['Growth', 'Salesforce', 'Finance'] },
  { key: 'TERR', title: 'Sales Territory Realignment FY27', kind: 'sales', dept: SO, phase: 'PLANNING', priv: true,
    short: 'Rebalance territories and quotas using account potential, coverage and rep capacity.',
    tags: ['Growth', 'Data'] },
  { key: 'PREF', title: 'Partner Referral Program', kind: 'sales', dept: SO, phase: 'IN_DEVELOPMENT',
    short: 'Referral tracking, payouts and co-selling plays for the channel partner ecosystem.',
    tags: ['Growth', 'Salesforce'] },
  { key: 'RINT', title: 'Revenue Intelligence Rollout', kind: 'sales', dept: SO, phase: 'SHIPPED',
    short: 'Conversation and pipeline analytics deployed to all 420 quota-carrying reps.',
    tags: ['Growth', 'Data'] },

  // ── Archived (legacy) ──────────────────────────────────────────────
  { key: 'LGCY', title: 'Legacy Intranet Retirement', kind: 'operations', dept: IT, phase: 'ARCHIVED',
    short: 'Decommissioned the 2012 intranet after migrating all content to the new knowledge hub.',
    tags: ['Cost Reduction', 'Internal Tooling'] },
  { key: 'WEB1', title: 'Public Website Migration', kind: 'marketing', dept: MK, phase: 'ARCHIVED',
    short: 'Moved the marketing site from the legacy CMS to a headless stack. Completed and closed.',
    tags: ['Marketing', 'Web'] },
];
