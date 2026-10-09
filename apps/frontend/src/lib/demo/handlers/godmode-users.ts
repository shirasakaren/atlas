/**
 * Godmode: users, invites, roles + permissions (the RBAC console).
 * Mirrors GodmodeController / GodmodeService; the account operations are
 * shared with the admin console (admin-user-ops).
 */
import { badRequest, conflict, del, get, post, put } from '../http';
import { users } from '../store';
import { newId } from '../prng';
import { nowIso } from '../clock';
import { tbl, type Rec } from '../db';
import { requireGodmode } from './godmode-guard';
import { getSetting, isConfigured } from './godmode-settings';
import { permissionsTbl, roleByCode, rolesTbl } from './admin-rbac';
import { roleList } from './admin-users';
import {
  createUserRec,
  deleteUserAccount,
  grantRole,
  resetPassword,
  revokeRole,
  revokeSessions,
  roleCodeFromName,
  suspendUser,
  unsuspendUser,
} from './admin-user-ops';
import type { UserRec } from '../schema';

type UserExtras = UserRec & { suspendedReason?: string | null; lastLoginAt?: string | null };

function godmodeUser(u: UserRec) {
  const x = u as UserExtras;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    isAdmin: u.isAdmin,
    emailVerified: u.emailVerified,
    phone: u.phone,
    lastLoginAt: x.lastLoginAt ?? u.lastActiveAt,
    createdAt: u.createdAt,
    suspendedAt: u.suspendedAt,
    suspendedReason: x.suspendedReason ?? null,
    userRoles: u.roles.map((code) => {
      const r = roleByCode(code);
      return {
        id: `ur_${u.id}_${code}`,
        roleId: r?.id ?? code,
        role: { id: r?.id ?? code, code, name: r?.name ?? code },
      };
    }),
  };
}

get('/godmode/users', (req) => {
  requireGodmode(req);
  const q = (req.query.get('q') ?? '').trim().toLowerCase();
  let list = users().all().slice();
  if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return list.slice(0, 100).map(godmodeUser);
});

const GODMODE_ROLE_CODES = ['superadmin', 'admin', 'member', 'developer', 'visitor'];

post('/godmode/users', (req) => {
  requireGodmode(req);
  const dto = req.body ?? {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(dto.email ?? ''))) throw badRequest('email must be an email');
  if (!String(dto.name ?? '').trim()) throw badRequest('name should not be empty');
  if (dto.roleCode !== undefined && !GODMODE_ROLE_CODES.includes(dto.roleCode)) {
    throw badRequest('roleCode must be one of the following values: ' + GODMODE_ROLE_CODES.join(', '));
  }
  const minLen = Number(getSetting('auth.passwordMinLength')) || 8;
  if (dto.password && String(dto.password).length < minLen) {
    throw badRequest(`Password must be at least ${minLen} characters.`);
  }
  const roleCode = isConfigured() ? (dto.roleCode ?? 'member') : 'superadmin';
  const u = createUserRec({ ...dto, roleCode });
  return { id: u.id, email: u.email, name: u.name };
});

post('/godmode/invites', (req) => {
  requireGodmode(req);
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  tbl<Rec & { code: string; email: string; expiresAt: string; createdAt: string }>('godmodeInvites').insert({
    id: newId('inv'),
    code,
    email: String(req.body?.email ?? '').toLowerCase(),
    expiresAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    createdAt: nowIso(),
  });
  return { code };
});

post('/godmode/users/:id/roles', (req) => {
  requireGodmode(req);
  const roleCode = String(req.body?.roleCode ?? '');
  if (!roleCode) throw badRequest('roleCode should not be empty');
  grantRole(req.params.id!, roleCode);
});

del('/godmode/users/:id/roles/:roleCode', (req) => {
  requireGodmode(req);
  revokeRole(req.params.id!, req.params.roleCode!);
});

post('/godmode/users/:id/suspend', (req) => {
  requireGodmode(req);
  suspendUser(req.params.id!, req.body?.message);
});

post('/godmode/users/:id/unsuspend', (req) => {
  requireGodmode(req);
  unsuspendUser(req.params.id!);
});

del('/godmode/users/:id', (req) => {
  requireGodmode(req);
  deleteUserAccount(req.params.id!);
});

post('/godmode/users/:id/password', (req) => {
  requireGodmode(req);
  const pw = req.body?.password;
  if (typeof pw !== 'string' || pw.length < 8) throw badRequest('password must be longer than or equal to 8 characters');
  resetPassword(req.params.id!, pw, Number(getSetting('auth.passwordMinLength')) || 8);
});

post('/godmode/users/:id/sessions/revoke', (req) => {
  requireGodmode(req);
  revokeSessions(req.params.id!);
});

// ─── Roles & permissions ───────────────────────────────────────────────

get('/godmode/roles', (req) => {
  requireGodmode(req);
  return roleList();
});

get('/godmode/permissions', (req) => {
  requireGodmode(req);
  return permissionsTbl()
    .all()
    .slice()
    .sort((a, b) => a.category.localeCompare(b.category) || a.code.localeCompare(b.code));
});

function assertKnownPermissions(perms: unknown): string[] {
  if (!Array.isArray(perms) || perms.some((p) => typeof p !== 'string')) {
    throw badRequest('permissions must be an array of strings');
  }
  const known = new Set(permissionsTbl().all().map((p) => p.code));
  const unknown = (perms as string[]).filter((p) => !known.has(p));
  if (unknown.length > 0) throw conflict(`Unknown permissions: ${unknown.join(', ')}`);
  return perms as string[];
}

post('/godmode/roles', (req) => {
  requireGodmode(req);
  const name = String(req.body?.name ?? '').trim();
  if (!name) throw badRequest('Role name is required.');
  const code = roleCodeFromName(name);
  if (!code) throw badRequest('Role name must contain letters or numbers.');
  if (roleByCode(code)) throw conflict(`A role with the code "${code}" already exists.`);
  const permissions = assertKnownPermissions(req.body?.permissions);
  const now = nowIso();
  rolesTbl().insert({
    id: newId('role'),
    code,
    name,
    description: req.body?.description ? String(req.body.description) : null,
    permissions,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  });
  return { code };
});

put('/godmode/roles', (req) => {
  requireGodmode(req);
  const code = String(req.body?.code ?? '');
  const name = String(req.body?.name ?? '');
  if (!code) throw badRequest('code should not be empty');
  if (!name) throw badRequest('name should not be empty');
  const permissions = assertKnownPermissions(req.body?.permissions);
  const description = req.body?.description ? String(req.body.description) : null;
  const cur = roleByCode(code);
  if (cur) {
    cur.name = name;
    cur.description = description;
    cur.permissions = permissions;
    cur.updatedAt = nowIso();
    rolesTbl().save(cur);
  } else {
    const now = nowIso();
    rolesTbl().insert({ id: newId('role'), code, name, description, permissions, isSystem: false, createdAt: now, updatedAt: now });
  }
});

del('/godmode/roles/:roleCode', (req) => {
  requireGodmode(req);
  const role = roleByCode(req.params.roleCode!);
  if (!role) return;
  if (role.isSystem) throw conflict('System roles cannot be deleted.');
  if (users().all().some((u) => u.roles.includes(role.code))) throw conflict('Role is still assigned to users.');
  rolesTbl().remove(role.id);
});
