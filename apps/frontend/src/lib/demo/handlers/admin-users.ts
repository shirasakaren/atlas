/**
 * Admin console: user directory, instance roles, user lifecycle under
 * `/users/:id/*`, collaboration roles. Mirrors
 * apps/backend/src/modules/{admin,users}.
 */
import { badRequest, forbidden, get, notFound, paginate, intParam, patch, post, del, type Req } from '../http';
import { me, meId } from '../access';
import { collabRoles, users } from '../store';
import { newId } from '../prng';
import { nowIso } from '../clock';
import type { UserRec } from '../schema';
import {
  isSuperadmin,
  requireAdminGuard,
  requirePermission,
  roleByCode,
  rolesOf,
  rolesTbl,
  syncAdminFlag,
} from './admin-rbac';
import {
  assertMayTouchRole,
  createUserRec,
  deleteUserAccount,
  grantRole,
  publicUser,
  requireUser,
  resetPassword,
  revokeRole,
  revokeSessions,
  suspendUser,
  unsuspendUser,
} from './admin-user-ops';

type UserExtras = UserRec & { suspendedReason?: string | null };

function adminRow(u: UserRec) {
  const x = u as UserExtras;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt,
    suspendedAt: u.suspendedAt,
    suspendedReason: x.suspendedReason ?? null,
    roles: rolesOf(u),
    // Extras the demo console can show (the real list omits them).
    lastActiveAt: u.lastActiveAt,
    jobTitle: u.jobTitle,
    department: u.department,
  };
}

// ─── Directory ─────────────────────────────────────────────────────────

get('/admin/users', (req) => {
  requirePermission('users.view');
  const q = (req.query.get('q') ?? '').trim().toLowerCase();
  const page = intParam(req.query, 'page', 1, 100000);
  const pageSize = intParam(req.query, 'pageSize', 24, 100);
  let list = users().all().slice();
  if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  list.sort((a, b) => a.name.localeCompare(b.name));
  const out = paginate(list, page, pageSize);
  return { items: out.items.map(adminRow), meta: out.meta };
});

get('/admin/roles', () => {
  requirePermission('roles.manage');
  return roleList();
});

/** Shape shared with `GET /godmode/roles` (Prisma `include: { _count }`). */
export function roleList() {
  const counts = new Map<string, number>();
  for (const u of users().all()) for (const c of u.roles) counts.set(c, (counts.get(c) ?? 0) + 1);
  return rolesTbl()
    .all()
    .slice()
    .sort((a, b) => Number(b.isSystem) - Number(a.isSystem) || a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({ ...r, _count: { userRoles: counts.get(r.code) ?? 0 } }));
}

// ─── Collaboration roles ───────────────────────────────────────────────

get('/admin/collaboration-roles', () =>
  collabRoles()
    .all()
    .slice()
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((r) => ({ id: r.id, name: r.name, order: r.order })),
);

function validateCollabName(v: unknown, required: boolean): string | undefined {
  if (v === undefined && !required) return undefined;
  if (typeof v !== 'string') throw badRequest('name must be a string');
  const t = v.trim();
  if (t.length < 2 || t.length > 48) throw badRequest('name must be between 2 and 48 characters');
  return t;
}

post('/admin/collaboration-roles', (req) => {
  requireAdminGuard();
  const name = validateCollabName(req.body?.name, true)!;
  const order = Number.isInteger(req.body?.order) && req.body.order >= 0 ? req.body.order : 0;
  const rec = { id: newId('crole'), name, order };
  collabRoles().insert(rec);
  return rec;
});

patch('/admin/collaboration-roles/:id', (req) => {
  requireAdminGuard();
  const cur = collabRoles().get(req.params.id!);
  if (!cur) throw notFound();
  const name = validateCollabName(req.body?.name, false);
  if (name !== undefined) cur.name = name;
  if (Number.isInteger(req.body?.order) && req.body.order >= 0) cur.order = req.body.order;
  collabRoles().save(cur);
  return { id: cur.id, name: cur.name, order: cur.order };
});

del('/admin/collaboration-roles/:id', (req) => {
  requireAdminGuard();
  const cur = collabRoles().get(req.params.id!);
  if (!cur) throw notFound();
  // The real backend archives (soft delete); archived roles drop out of the list,
  // which is all the UI can observe, so the demo simply removes the row.
  collabRoles().remove(cur.id);
  return { ...cur, archivedAt: nowIso() };
});

// ─── User lifecycle (/users/:id/*) ─────────────────────────────────────

post('/users', (req: Req) => {
  requireAdminGuard();
  const dto = req.body ?? {};
  if (dto.roleCode === 'superadmin' && !isSuperadmin(me())) {
    throw forbidden('Only superadmins can create superadmin accounts.');
  }
  return publicUser(createUserRec(dto));
});

post('/users/:id/roles', (req) => {
  requirePermission('roles.manage');
  const roleCode = String(req.body?.roleCode ?? '');
  assertMayTouchRole(roleCode, 'grant');
  grantRole(req.params.id!, roleCode);
});

del('/users/:id/roles/:roleCode', (req) => {
  requirePermission('roles.manage');
  const roleCode = req.params.roleCode!;
  assertMayTouchRole(roleCode, 'revoke');
  revokeRole(req.params.id!, roleCode);
});

post('/users/:id/suspend', (req) => {
  requirePermission('users.manage');
  if (meId() === req.params.id) throw badRequest('You cannot suspend your own account.');
  suspendUser(req.params.id!, req.body?.message);
});

post('/users/:id/unsuspend', (req) => {
  requirePermission('users.manage');
  unsuspendUser(req.params.id!);
});

post('/users/:id/sessions/revoke', (req) => {
  requirePermission('users.manage');
  revokeSessions(req.params.id!);
});

del('/users/:id', (req) => {
  requirePermission('users.manage');
  if (meId() === req.params.id) throw badRequest('You cannot delete your own account.');
  deleteUserAccount(req.params.id!);
});

post('/users/:id/password/reset', (req) => {
  requirePermission('users.manage');
  const target = requireUser(req.params.id!);
  const pw = req.body?.newPassword;
  if (typeof pw !== 'string' || pw.length < 6) {
    throw badRequest('Password must be at least 6 characters.');
  }
  if (isSuperadmin(target) && !isSuperadmin(me())) {
    throw forbidden('Only superadmins can reset a superadmin password.');
  }
  resetPassword(target.id, pw, 6);
  return { ok: true };
});

patch('/users/:id/admin', (req) => {
  requireAdminGuard();
  if (meId() === req.params.id) throw forbidden('Admins cannot change their own admin status.');
  const target = requireUser(req.params.id!);
  if (!roleByCode('admin')) throw notFound('Admin role template is missing, run the seed.');
  const isAdmin = req.body?.isAdmin === true;
  if (isAdmin) {
    if (!target.roles.includes('admin')) target.roles = [...target.roles, 'admin'];
  } else {
    target.roles = target.roles.filter((c) => c !== 'admin');
  }
  syncAdminFlag(target);
  return publicUser(target);
});
