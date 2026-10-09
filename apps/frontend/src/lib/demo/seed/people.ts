/**
 * Workforce of "Halcyon Global": ~190 people across 12 departments, plus the
 * persona every visitor is signed in as (Maya Brennan).
 */
import { avatarDataUri } from '../assets';
import { agoIso, DAY } from '../clock';
import { COMPANY, ME_ID } from '../config';
import { registerSeeder } from '../db';
import type { Rng } from '../prng';
import { slugify } from '../prng';
import type { CollabRoleRec, TagRec, UserRec } from '../schema';
import { collabRoles, tags, users } from '../store';

export const DEPARTMENTS = [
  'Engineering',
  'Data & Analytics',
  'Security',
  'Product',
  'Design',
  'Marketing',
  'Finance',
  'People Operations',
  'Legal & Compliance',
  'Supply Chain',
  'Customer Success',
  'Sales Operations',
  'IT & Infrastructure',
  'Transformation Office',
] as const;

const TITLES: Record<string, string[]> = {
  Engineering: [
    'Staff Software Engineer',
    'Senior Software Engineer',
    'Software Engineer II',
    'Engineering Manager',
    'Principal Engineer',
    'Frontend Engineer',
    'Backend Engineer',
    'QA Automation Engineer',
    'Mobile Engineer',
  ],
  'Data & Analytics': [
    'Senior Data Engineer',
    'Data Scientist',
    'Analytics Engineer',
    'ML Engineer',
    'BI Developer',
    'Head of Data Platform',
    'Data Product Manager',
  ],
  Security: [
    'Security Engineer',
    'Senior Security Analyst',
    'GRC Analyst',
    'Application Security Lead',
    'Security Architect',
    'Incident Response Lead',
  ],
  Product: [
    'Senior Product Manager',
    'Product Manager',
    'Group Product Manager',
    'Product Operations Lead',
    'Technical Product Manager',
  ],
  Design: [
    'Senior Product Designer',
    'UX Researcher',
    'Design Systems Lead',
    'Brand Designer',
    'Content Designer',
    'Interaction Designer',
  ],
  Marketing: [
    'Demand Generation Manager',
    'Content Strategist',
    'Brand Marketing Lead',
    'Marketing Operations Manager',
    'Product Marketing Manager',
    'Lifecycle Marketing Manager',
  ],
  Finance: [
    'Financial Planning Analyst',
    'Senior Accountant',
    'Procurement Lead',
    'Finance Business Partner',
    'Revenue Operations Analyst',
    'Controller',
  ],
  'People Operations': [
    'People Partner',
    'Talent Acquisition Lead',
    'Learning & Development Manager',
    'Compensation Analyst',
    'People Analytics Lead',
  ],
  'Legal & Compliance': [
    'Corporate Counsel',
    'Privacy Counsel',
    'Compliance Manager',
    'Contracts Specialist',
    'Regulatory Affairs Lead',
  ],
  'Supply Chain': [
    'Supply Planning Manager',
    'Logistics Analyst',
    'Demand Planner',
    'Vendor Management Lead',
    'Warehouse Operations Manager',
    'Sourcing Specialist',
  ],
  'Customer Success': [
    'Customer Success Manager',
    'Support Operations Lead',
    'Solutions Consultant',
    'Onboarding Specialist',
    'Technical Account Manager',
  ],
  'Sales Operations': [
    'Sales Operations Manager',
    'CRM Administrator',
    'Territory Planning Analyst',
    'Enablement Manager',
    'Deal Desk Lead',
  ],
  'IT & Infrastructure': [
    'Site Reliability Engineer',
    'Cloud Platform Engineer',
    'Network Engineer',
    'IT Service Manager',
    'DevOps Engineer',
    'Systems Administrator',
  ],
  'Transformation Office': [
    'Program Manager',
    'Senior Program Manager',
    'Portfolio Analyst',
    'Change Management Lead',
    'Business Analyst',
    'Delivery Lead',
  ],
};

const LOCATIONS: [string, string][] = [
  ['Toronto, Canada', 'America/Toronto'],
  ['New York, USA', 'America/New_York'],
  ['Austin, USA', 'America/Chicago'],
  ['San Francisco, USA', 'America/Los_Angeles'],
  ['London, UK', 'Europe/London'],
  ['Dublin, Ireland', 'Europe/Dublin'],
  ['Berlin, Germany', 'Europe/Berlin'],
  ['Amsterdam, Netherlands', 'Europe/Amsterdam'],
  ['Lisbon, Portugal', 'Europe/Lisbon'],
  ['Warsaw, Poland', 'Europe/Warsaw'],
  ['Singapore', 'Asia/Singapore'],
  ['Bengaluru, India', 'Asia/Kolkata'],
  ['Tokyo, Japan', 'Asia/Tokyo'],
  ['Sydney, Australia', 'Australia/Sydney'],
  ['São Paulo, Brazil', 'America/Sao_Paulo'],
  ['Nairobi, Kenya', 'Africa/Nairobi'],
  ['Dubai, UAE', 'Asia/Dubai'],
  ['Mexico City, Mexico', 'America/Mexico_City'],
];

const FIRST = [
  'Aaliyah', 'Aarav', 'Abigail', 'Adaeze', 'Adrian', 'Aiko', 'Akira', 'Alejandro', 'Alina', 'Amara', 'Amir',
  'Ananya', 'Andre', 'Anika', 'Anton', 'Aria', 'Arjun', 'Astrid', 'Ayesha', 'Beatriz', 'Benedikt', 'Bianca',
  'Bruno', 'Camila', 'Carlos', 'Caroline', 'Chidi', 'Chloe', 'Claudia', 'Dalia', 'Daniela', 'Darius', 'David',
  'Deepa', 'Diego', 'Dmitri', 'Eleni', 'Elif', 'Elias', 'Emeka', 'Emilia', 'Emre', 'Esperanza', 'Eva', 'Fatima',
  'Felix', 'Finn', 'Freya', 'Gabriel', 'Gemma', 'Giulia', 'Grace', 'Gustavo', 'Hana', 'Harper', 'Hassan',
  'Hiroshi', 'Ibrahim', 'Idris', 'Ingrid', 'Isabel', 'Ivan', 'Jae-won', 'Jamal', 'Jana', 'Javier', 'Jin',
  'Joaquin', 'Johan', 'Julia', 'Kamal', 'Kaito', 'Kenji', 'Kiara', 'Klaus', 'Kwame', 'Lars', 'Laura', 'Leila',
  'Leo', 'Liam', 'Lina', 'Luca', 'Lucia', 'Magnus', 'Mai', 'Malik', 'Marcus', 'Maren', 'Mateo', 'Mei', 'Mia',
  'Miguel', 'Mina', 'Mohammed', 'Nadia', 'Naomi', 'Nathan', 'Nia', 'Nikolai', 'Nora', 'Olamide', 'Olivia',
  'Omar', 'Oscar', 'Paloma', 'Pedro', 'Petra', 'Priya', 'Rafael', 'Rahul', 'Rania', 'Rei', 'Renata', 'Rohan',
  'Ruth', 'Sade', 'Salma', 'Samir', 'Sana', 'Santiago', 'Sara', 'Sasha', 'Sebastian', 'Selin', 'Shreya',
  'Sienna', 'Simon', 'Sofia', 'Soo-jin', 'Stefan', 'Sven', 'Tariq', 'Tessa', 'Theo', 'Thiago', 'Tomas',
  'Uma', 'Valentina', 'Victor', 'Viktor', 'Wei', 'Wren', 'Xavier', 'Yara', 'Yusuf', 'Zainab', 'Zane', 'Zoe',
];

const LAST = [
  'Abara', 'Adeyemi', 'Aguilar', 'Ahmed', 'Alvarez', 'Andersson', 'Arslan', 'Bakker', 'Banerjee', 'Barros',
  'Bauer', 'Beaumont', 'Bergström', 'Bianchi', 'Bose', 'Brandt', 'Cabrera', 'Carvalho', 'Castillo', 'Chaudhry',
  'Cho', 'Costa', 'Dahl', 'Dang', 'Delgado', 'Demir', 'Dietrich', 'Dlamini', 'Duarte', 'Eriksen', 'Esposito',
  'Farouk', 'Fernandes', 'Fischer', 'Fonseca', 'Garcia', 'Gill', 'Gomez', 'Gupta', 'Haddad', 'Hansen',
  'Hashimoto', 'Hoang', 'Holm', 'Hossain', 'Ibrahim', 'Ivanova', 'Jansen', 'Jensen', 'Joshi', 'Kaplan',
  'Karlsson', 'Kato', 'Keller', 'Khan', 'Kim', 'Kowalski', 'Kruger', 'Kumar', 'Lacroix', 'Lam', 'Larsen',
  'Lehmann', 'Lindgren', 'Lopez', 'Mahlangu', 'Malik', 'Marques', 'Martins', 'Mbeki', 'Medina', 'Mehta',
  'Mendes', 'Moreau', 'Morales', 'Mueller', 'Murphy', 'Nakamura', 'Naidoo', 'Nguyen', 'Nilsson', 'Novak',
  'Nwosu', 'Okoye', 'Oliveira', 'Olsen', 'Ortiz', 'Osei', 'Park', 'Patel', 'Pereira', 'Petrov', 'Pham',
  'Quintero', 'Rahman', 'Ramos', 'Rao', 'Reyes', 'Ribeiro', 'Rossi', 'Roy', 'Saito', 'Salazar', 'Sandhu',
  'Santos', 'Schmidt', 'Sharma', 'Silva', 'Singh', 'Sokolov', 'Sousa', 'Suzuki', 'Tanaka', 'Tran', 'Turner',
  'Valdez', 'Varga', 'Vasquez', 'Verma', 'Vogel', 'Wagner', 'Wang', 'Weber', 'Wójcik', 'Yamamoto', 'Yilmaz',
  'Zhang', 'Zimmerman',
];

/** Named cast: leaders the stories revolve around. `id` stable so other seeds can reference them. */
export const CAST = {
  maya: { id: ME_ID },
  daniel: { id: 'usr_daniel_okafor', name: 'Daniel Okafor', title: 'VP, Engineering', dept: 'Engineering', admin: true },
  priya: { id: 'usr_priya_nair', name: 'Priya Nair', title: 'Head of Data Platform', dept: 'Data & Analytics', admin: false },
  tomas: { id: 'usr_tomas_ferreira', name: 'Tomás Ferreira', title: 'Chief Information Security Officer', dept: 'Security', admin: false },
  hannah: { id: 'usr_hannah_lindgren', name: 'Hannah Lindgren', title: 'Design Director', dept: 'Design', admin: false },
  ravi: { id: 'usr_ravi_menon', name: 'Ravi Menon', title: 'VP, Finance & Strategy', dept: 'Finance', admin: true },
  elena: { id: 'usr_elena_vasquez', name: 'Elena Vasquez', title: 'Chief Operating Officer', dept: 'Supply Chain', admin: false },
  james: { id: 'usr_james_whitfield', name: 'James Whitfield', title: 'General Counsel', dept: 'Legal & Compliance', admin: false },
  amara: { id: 'usr_amara_osei', name: 'Amara Osei', title: 'VP, People & Culture', dept: 'People Operations', admin: false },
  kenji: { id: 'usr_kenji_tanaka', name: 'Kenji Tanaka', title: 'Director, Platform Engineering', dept: 'IT & Infrastructure', admin: false },
  sofia: { id: 'usr_sofia_marchetti', name: 'Sofia Marchetti', title: 'VP, Marketing', dept: 'Marketing', admin: false },
  oliver: { id: 'usr_oliver_grant', name: 'Oliver Grant', title: 'VP, Customer Success', dept: 'Customer Success', admin: false },
  nadia: { id: 'usr_nadia_haddad', name: 'Nadia Haddad', title: 'Director of Product', dept: 'Product', admin: false },
} as const;

const TARGET_USERS = 192;

function bioFor(rng: Rng, title: string, dept: string): string {
  const openers = [
    `${title} on the ${dept} team.`,
    `${title}, ${dept}.`,
    `Working in ${dept} as ${title.toLowerCase().startsWith('a') ? 'an' : 'a'} ${title}.`,
  ];
  const tails = [
    'Coffee before standups, docs before meetings.',
    'Big believer in small, reversible decisions.',
    'Happiest when the dashboard is green and the backlog is groomed.',
    'Ask me about roadmaps, runbooks or ramen.',
    'Always up for a pairing session.',
    'Writes things down so the next person doesn\'t have to ask.',
    'Cross-functional by habit, async by preference.',
    'Trying to ship less, but better.',
    'Weekend trail runner, weekday spreadsheet enthusiast.',
    'Mentoring welcome both directions.',
  ];
  return `${rng.pick(openers)} ${rng.pick(tails)}`;
}

export const TAG_DEFS: { name: string; category: string }[] = [
  { name: 'Q4 Priority', category: 'Program' },
  { name: 'Board Initiative', category: 'Program' },
  { name: 'Cost Reduction', category: 'Program' },
  { name: 'Growth', category: 'Program' },
  { name: 'Compliance', category: 'Program' },
  { name: 'Customer-Facing', category: 'Program' },
  { name: 'Internal Tooling', category: 'Program' },
  { name: 'Platform', category: 'Domain' },
  { name: 'Data', category: 'Domain' },
  { name: 'Security', category: 'Domain' },
  { name: 'Mobile', category: 'Domain' },
  { name: 'Web', category: 'Domain' },
  { name: 'Finance', category: 'Domain' },
  { name: 'People', category: 'Domain' },
  { name: 'Marketing', category: 'Domain' },
  { name: 'Operations', category: 'Domain' },
  { name: 'Legal', category: 'Domain' },
  { name: 'Research', category: 'Domain' },
  { name: 'Supply Chain', category: 'Domain' },
  { name: 'Customer Experience', category: 'Domain' },
  { name: 'React', category: 'Stack' },
  { name: 'TypeScript', category: 'Stack' },
  { name: 'Python', category: 'Stack' },
  { name: 'Kubernetes', category: 'Stack' },
  { name: 'Snowflake', category: 'Stack' },
  { name: 'AWS', category: 'Stack' },
  { name: 'SAP', category: 'Stack' },
  { name: 'Salesforce', category: 'Stack' },
  { name: 'Swift', category: 'Stack' },
  { name: 'Kotlin', category: 'Stack' },
];

export const COLLAB_ROLE_NAMES = [
  'Frontend Engineer',
  'Backend Engineer',
  'Mobile Engineer',
  'Data Engineer',
  'Data Scientist',
  'Product Designer',
  'UX Researcher',
  'Program Manager',
  'Business Analyst',
  'QA Engineer',
  'DevOps / SRE',
  'Security Analyst',
  'Change Manager',
  'Technical Writer',
];

registerSeeder({
  name: 'people',
  order: 10,
  run({ rng, now }) {
    // Tags + collaboration roles
    const tagRecs: TagRec[] = TAG_DEFS.map((t, i) => ({
      id: `tag_${String(i + 1).padStart(3, '0')}`,
      name: t.name,
      category: t.category,
      slug: `${slugify(t.category)}-${slugify(t.name)}`,
    }));
    tags().insertMany(tagRecs);
    const roleRecs: CollabRoleRec[] = COLLAB_ROLE_NAMES.map((name, i) => ({
      id: `crole_${String(i + 1).padStart(2, '0')}`,
      name,
      order: i,
    }));
    collabRoles().insertMany(roleRecs);

    const out: UserRec[] = [];
    const emails = new Set<string>();

    const make = (o: {
      id: string;
      name: string;
      title: string;
      dept: string;
      roles: string[];
      bio?: string;
      loc?: [string, string];
      joinedDaysAgo: number;
    }) => {
      const [first, ...rest] = o.name.split(' ');
      const local = `${slugify(first!)}.${slugify(rest.join(' ') || 'x')}`;
      let email = `${local}@${COMPANY.domain}`;
      let n = 2;
      while (emails.has(email)) email = `${local}${n++}@${COMPANY.domain}`;
      emails.add(email);
      const loc = o.loc ?? rng.pick(LOCATIONS);
      const isAdmin = o.roles.includes('admin') || o.roles.includes('superadmin');
      out.push({
        id: o.id,
        email,
        name: o.name,
        avatarUrl: avatarDataUri(o.name, o.id),
        bio: o.bio ?? bioFor(rng, o.title, o.dept),
        isAdmin,
        roles: o.roles,
        phone: null,
        phoneVerified: false,
        emailVerified: true,
        themeId: null,
        themeMode: null,
        jobTitle: o.title,
        department: o.dept,
        location: loc[0],
        timezone: loc[1],
        createdAt: agoIso(o.joinedDaysAgo * DAY),
        lastActiveAt: new Date(now - rng.int(2, 60 * 24 * 14) * 60_000).toISOString(),
        suspendedAt: null,
      });
    };

    // The persona.
    make({
      id: ME_ID,
      name: 'Maya Brennan',
      title: 'Senior Program Manager, Transformation Office',
      dept: 'Transformation Office',
      roles: ['superadmin'],
      bio:
        'I run cross-functional programs at Halcyon Global: platform migrations, compliance rollouts and the occasional fire drill. ' +
        'Spreadsheets for planning, Atlas for everything else.',
      loc: ['Toronto, Canada', 'America/Toronto'],
      joinedDaysAgo: 1650,
    });

    // The named leadership cast.
    for (const c of Object.values(CAST)) {
      if (c.id === ME_ID) continue;
      const cc = c as { id: string; name: string; title: string; dept: string; admin: boolean };
      make({
        id: cc.id,
        name: cc.name,
        title: cc.title,
        dept: cc.dept,
        roles: cc.admin ? ['admin'] : ['manager'],
        joinedDaysAgo: rng.int(900, 2400),
      });
    }

    // Everyone else.
    const usedNames = new Set(out.map((u) => u.name));
    let seq = 1;
    while (out.length < TARGET_USERS) {
      const name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      // Weight departments toward the bigger ones.
      const dept = rng.weighted([
        ['Engineering', 28],
        ['Data & Analytics', 12],
        ['Security', 6],
        ['Product', 8],
        ['Design', 6],
        ['Marketing', 7],
        ['Finance', 6],
        ['People Operations', 4],
        ['Legal & Compliance', 3],
        ['Supply Chain', 7],
        ['Customer Success', 6],
        ['Sales Operations', 4],
        ['IT & Infrastructure', 9],
        ['Transformation Office', 5],
      ] as const);
      const title = rng.pick(TITLES[dept]!);
      const roles = /Manager|Lead|Director|Head|Principal|Controller/.test(title) ? ['manager'] : ['member'];
      make({
        id: `usr_${String(seq++).padStart(4, '0')}`,
        name,
        title,
        dept,
        roles,
        joinedDaysAgo: rng.int(20, 2200),
      });
    }
    users().insertMany(out);
  },
});
