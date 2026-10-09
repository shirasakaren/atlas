/**
 * Collaboration: contribution requests, project invites and member management.
 * Mirrors contributions.service.ts and team.service.ts.
 */
import { ME_ID } from '../config';
import { contracts } from '../contracts';
import { accessFor, assertManager, projectBySlugOrId, resolveProject, userSummary } from '../access';
import { nowIso } from '../clock';
import { badRequest, conflict, del, forbidden, get, notFound, patch, post } from '../http';
import { notify } from '../notify';
import { newId } from '../prng';
import type { ContributionRec, InviteRec, MemberRec } from '../schema';
import { contributions, invites, members, projects, users } from '../store';
import type { ContributionStatus, ProjectRole } from '@/lib/types';

const STATUS_ORDER: Record<ContributionStatus, number> = { PENDING: 0, APPROVED: 1, REJECTED: 2, WITHDRAWN: 3 };
const byStatusThenNewest = (a: ContributionRec, b: ContributionRec) =>
  STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.createdAt.localeCompare(a.createdAt);

const ROLES: ProjectRole[] = ['PROJECT_MANAGER', 'CONTRIBUTOR'];

const projectRef = (id: string) => {
  const p = projects().get(id);
  return p ? { id: p.id, slug: p.slug, title: p.title } : undefined;
};

// ─── Contribution requests ──────────────────────────────────────────────

post('/projects/:slug/contribute', (req) => {
  const p = projectBySlugOrId(req.params.slug!);
  if (p.archivedAt) throw notFound('Project not found.');
  if (members().where('projectId', p.id).some((m) => m.userId === ME_ID)) {
    throw conflict('You are already a member of this project.');
  }
  const role = req.body?.role;
  const message = req.body?.message;
  if (typeof role !== 'string' || !role.trim() || role.length > 120) throw badRequest('role must be a string');
  if (typeof message !== 'string' || message.trim().length < 10) {
    throw badRequest('message must be longer than or equal to 10 characters');
  }
  if (message.length > 2000) throw badRequest('message must be shorter than or equal to 2000 characters');
  if (!p.collaborationRoles.includes(role)) throw badRequest('That role is not currently being recruited.');
  if (contributions().where('projectId', p.id).some((c) => c.userId === ME_ID && c.status === 'PENDING')) {
    throw conflict('You already have a pending request for this project.');
  }
  const now = nowIso();
  const rec: ContributionRec = {
    id: newId('con'),
    projectId: p.id,
    userId: ME_ID,
    role,
    message: message.trim(),
    status: 'PENDING',
    resolvedAt: null,
    resolvedById: null,
    resolutionNote: null,
    createdAt: now,
    updatedAt: now,
  };
  contributions().insert(rec);
  return { ...rec, user: userSummary(ME_ID, true), project: projectRef(p.id) };
});

get('/projects/:slug/contributions', (req) => {
  const { project, access } = resolveProject(req.params.slug!);
  assertManager(access);
  const status = req.query.get('status');
  return contributions()
    .where('projectId', project.id)
    .filter((c) => !status || c.status === status)
    .sort(byStatusThenNewest)
    .map((c) => ({ ...c, user: userSummary(c.userId, true) }));
});

get('/contributions/mine', () =>
  contributions()
    .where('userId', ME_ID)
    .slice()
    .sort(byStatusThenNewest)
    .flatMap((c) => {
      const p = projects().get(c.projectId);
      if (!p) return [];
      return [
        {
          ...c,
          project: {
            id: p.id,
            slug: p.slug,
            title: p.title,
            shortDescription: p.shortDescription,
            thumbnailUrl: p.thumbnailUrl,
            thumbnailType: p.thumbnailType,
          },
        },
      ];
    }),
);

post('/contributions/:id/withdraw', (req) => {
  const c = contributions().get(req.params.id!);
  if (!c) throw notFound('Request not found.');
  if (c.userId !== ME_ID) throw forbidden('You can only withdraw your own requests.');
  if (c.status !== 'PENDING') throw badRequest('Only pending requests can be withdrawn.');
  const now = nowIso();
  c.status = 'WITHDRAWN';
  c.resolvedAt = now;
  c.resolvedById = ME_ID;
  c.updatedAt = now;
  contributions().save(c);
  return { ...c };
});

function resolveRequest(id: string, outcome: 'APPROVED' | 'REJECTED', note: unknown) {
  const c = contributions().get(id);
  if (!c) throw notFound('Request not found.');
  if (c.status !== 'PENDING') throw badRequest('This request is no longer pending.');
  const p = projects().get(c.projectId);
  if (!p) throw notFound('Project not found.');
  if (!accessFor(p).isManager) throw forbidden('Only Project Managers or Admins may resolve requests.');
  const text = typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null;
  if (typeof note === 'string' && note.length > 500) throw badRequest('note must be shorter than or equal to 500 characters');

  const now = nowIso();
  c.status = outcome;
  c.resolvedAt = now;
  c.resolvedById = ME_ID;
  c.resolutionNote = text;
  c.updatedAt = now;
  contributions().save(c);

  if (outcome === 'APPROVED') {
    const existing = members().where('projectId', c.projectId).find((m) => m.userId === c.userId);
    if (existing) {
      existing.title = c.role;
      members().save(existing);
    } else {
      const m: MemberRec = {
        id: newId('mem'),
        projectId: c.projectId,
        userId: c.userId,
        role: 'CONTRIBUTOR',
        title: c.role,
        joinedAt: now,
      };
      members().insert(m);
      contracts.chat?.onMemberChanged?.(c.projectId, c.userId, 'added');
    }
  }
  notify(c.userId, {
    type: outcome === 'APPROVED' ? 'CONTRIBUTION_REQUEST_APPROVED' : 'CONTRIBUTION_REQUEST_REJECTED',
    title: outcome === 'APPROVED' ? 'Welcome aboard' : 'Contribution request declined',
    body:
      outcome === 'APPROVED'
        ? `You're now a contributor on "${p.title}".`
        : `Your request to join "${p.title}" was declined.`,
    link: `/projects/${p.slug}`,
    metadata: { requestId: c.id, projectId: c.projectId, note: text },
  });
  return { ...c };
}

post('/contributions/:id/approve', (req) => resolveRequest(req.params.id!, 'APPROVED', req.body?.note));
post('/contributions/:id/reject', (req) => resolveRequest(req.params.id!, 'REJECTED', req.body?.note));

// ─── Invites ────────────────────────────────────────────────────────────

post('/projects/:projectId/invites', (req) => {
  const p = projectBySlugOrId(req.params.projectId!);
  assertManager(accessFor(p));
  const userId = req.body?.userId;
  const role = req.body?.role as ProjectRole;
  const title = req.body?.title;
  if (typeof userId !== 'string') throw badRequest('userId must be a string');
  if (!ROLES.includes(role)) throw badRequest('role must be one of the following values: PROJECT_MANAGER, CONTRIBUTOR');
  if (title !== undefined && (typeof title !== 'string' || title.length > 120)) throw badRequest('title must be a string');
  const target = users().get(userId);
  if (!target) throw notFound('User not found.');
  if (members().where('projectId', p.id).some((m) => m.userId === userId)) throw conflict('User is already a member.');
  if (invites().where('projectId', p.id).some((i) => i.invitedUserId === userId && i.status === 'PENDING')) {
    throw conflict('User already has a pending invite.');
  }
  const rec: InviteRec = {
    id: newId('inv'),
    projectId: p.id,
    invitedUserId: userId,
    invitedById: ME_ID,
    role,
    title: title ?? null,
    status: 'PENDING',
    createdAt: nowIso(),
  };
  invites().insert(rec);
  notify(userId, {
    type: 'PROJECT_INVITED',
    title: 'You have been invited to a project',
    body: `${users().get(ME_ID)?.name} invited you to join "${p.title}" as ${role.toLowerCase().replace('_', ' ')}.`,
    link: `/projects/${p.slug}`,
    metadata: { inviteId: rec.id, projectId: p.id, role },
  });
  return { ...rec };
});

del('/projects/:projectId/invites/:inviteId', (req) => {
  const p = projectBySlugOrId(req.params.projectId!);
  assertManager(accessFor(p));
  const inv = invites().get(req.params.inviteId!);
  if (!inv || inv.projectId !== p.id) throw notFound();
  if (inv.status !== 'PENDING') throw badRequest('Invite is no longer pending.');
  inv.status = 'REVOKED';
  invites().save(inv);
  return { ...inv };
});

post('/invites/:id/accept', (req) => {
  const inv = invites().get(req.params.id!);
  if (!inv) throw notFound('Invite not found.');
  if (inv.invitedUserId !== ME_ID) throw forbidden();
  if (inv.status !== 'PENDING') throw badRequest('Invite is no longer pending.');
  let m = members().where('projectId', inv.projectId).find((x) => x.userId === ME_ID);
  if (m) {
    m.role = inv.role;
    m.title = inv.title;
    members().save(m);
  } else {
    m = {
      id: newId('mem'),
      projectId: inv.projectId,
      userId: ME_ID,
      role: inv.role,
      title: inv.title,
      joinedAt: nowIso(),
    };
    members().insert(m);
    contracts.chat?.onMemberChanged?.(inv.projectId, ME_ID, 'added');
  }
  inv.status = 'ACCEPTED';
  invites().save(inv);
  return { ...m };
});

post('/invites/:id/decline', (req) => {
  const inv = invites().get(req.params.id!);
  if (!inv) throw notFound('Invite not found.');
  if (inv.invitedUserId !== ME_ID) throw forbidden();
  if (inv.status !== 'PENDING') throw badRequest('Invite is no longer pending.');
  inv.status = 'DECLINED';
  invites().save(inv);
  return { ...inv };
});

// ─── Members ────────────────────────────────────────────────────────────

patch('/projects/:projectId/members/:memberId', (req) => {
  const p = projectBySlugOrId(req.params.projectId!);
  assertManager(accessFor(p));
  const m = members().get(req.params.memberId!);
  if (!m || m.projectId !== p.id) throw notFound();
  const role = req.body?.role;
  const title = req.body?.title;
  if (role !== undefined && !ROLES.includes(role)) throw badRequest('role must be one of the following values: PROJECT_MANAGER, CONTRIBUTOR');
  if (title !== undefined && (typeof title !== 'string' || title.length > 120)) throw badRequest('title must be a string');
  const roleChanged = role !== undefined && role !== m.role;
  // Guard the real backend omits but the UI invites: never leave a project without a manager.
  if (roleChanged && m.role === 'PROJECT_MANAGER') {
    const managers = members().where('projectId', p.id).filter((x) => x.role === 'PROJECT_MANAGER').length;
    if (managers <= 1) throw badRequest('A project must have at least one Project Manager.');
  }
  if (role !== undefined) m.role = role;
  if (title !== undefined) m.title = title;
  members().save(m);
  if (roleChanged) {
    notify(m.userId, {
      type: 'PROJECT_ROLE_CHANGED',
      title: 'Your project role changed',
      body: `You are now ${m.role === 'PROJECT_MANAGER' ? 'a Project Manager' : 'a contributor'} on "${p.title}".`,
      link: `/projects/${p.slug}`,
      metadata: { projectId: p.id, role: m.role },
    });
  }
  return { ...m };
});

del('/projects/:projectId/members/:memberId', (req) => {
  const p = projectBySlugOrId(req.params.projectId!);
  assertManager(accessFor(p));
  const m = members().get(req.params.memberId!);
  if (!m || m.projectId !== p.id) throw notFound();
  if (m.userId === p.ownerId) throw forbidden('Cannot remove the project owner.');
  if (m.role === 'PROJECT_MANAGER') {
    const managers = members().where('projectId', p.id).filter((x) => x.role === 'PROJECT_MANAGER').length;
    if (managers <= 1) throw badRequest('A project must have at least one Project Manager.');
  }
  members().remove(m.id);
  contracts.chat?.onMemberChanged?.(p.id, m.userId, 'removed');
  notify(m.userId, {
    type: 'PROJECT_REMOVED',
    title: 'Removed from a project',
    body: `${users().get(ME_ID)?.name} removed you from "${p.title}".`,
    link: '/dashboard',
    metadata: { projectId: p.id },
  });
  return { removed: true };
});
