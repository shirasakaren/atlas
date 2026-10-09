/**
 * Account lifecycle operations shared by `/users/:id/*` (admin console) and
 * `/godmode/users/*`. Mirrors the backend GodmodeService / UsersService.
 */
import { HttpError, badRequest, conflict, forbidden, notFound } from '../http';
import { me } from '../access';
import { avatarDataUri } from '../assets';
import { newId, slugify } from '../prng';
import { nowIso } from '../clock';
import { contracts } from '../contracts';
import { tbl } from '../db';
import { bookmarks, contributions, invites, members, notifications, projects, users } from '../store';
import type { UserRec } from '../schema';
import { PROTECTED_ROLE_CODES, isSuperadmin, roleByCode, syncAdminFlag } from './admin-rbac';
import { voiceUserRemoved } from './voice-sim';

type UserExtras = UserRec & { suspendedReason?: string | null; lastLoginAt?: string | null };

export function requireUser(id: string): UserRec {
  const u = users().get(id);
  if (!u) throw notFound('User not found.');
  return u;
}

/** Fields returned by `PUBLIC_USER_SELECT` on the backend. */
export function publicUser(u: UserRec) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt,
  };
}

export function grantRole(userId: string, roleCode: string): void {
  const role = roleByCode(roleCode);
  if (!role) throw conflict(`Unknown role: ${roleCode}`);
  const u = users().get(userId);
  if (!u) throw conflict('User not found.');
  if (!u.roles.includes(roleCode)) {
    u.roles = [...u.roles, roleCode];
  }
  syncAdminFlag(u);
}

export function revokeRole(userId: string, roleCode: string): void {
  const role = roleByCode(roleCode);
  if (!role) throw conflict(`Unknown role: ${roleCode}`);
  const u = users().get(userId);
  if (!u) return;
  u.roles = u.roles.filter((c) => c !== roleCode);
  syncAdminFlag(u);
}

/** Guard used by the `/users/:id/roles` endpoints (admin/superadmin need isAdmin). */
export function assertMayTouchRole(roleCode: string, verb: 'grant' | 'revoke'): void {
  if (PROTECTED_ROLE_CODES.has(roleCode) && !me().isAdmin) {
    throw forbidden(`Only an admin can ${verb} that role.`);
  }
}

export function suspendUser(userId: string, message?: string): void {
  const u = requireUser(userId) as UserExtras;
  if (u.suspendedAt) throw conflict('User is already suspended.');
  u.suspendedAt = nowIso();
  u.suspendedReason = message?.trim() || 'Contact the workspace administrator.';
  users().save(u);
}

export function unsuspendUser(userId: string): void {
  const u = requireUser(userId) as UserExtras;
  u.suspendedAt = null;
  u.suspendedReason = null;
  users().save(u);
}

export function revokeSessions(userId: string): void {
  requireUser(userId);
  // No server-side sessions exist in the demo; the call just succeeds.
}

export function resetPassword(userId: string, password: string, minLen: number): void {
  const u = requireUser(userId);
  if (typeof password !== 'string' || password.length < minLen) {
    throw badRequest(`Password must be at least ${minLen} characters.`);
  }
  tbl<{ id: string; mustChange: boolean; changedAt: string }>('passwordResets').save({
    id: u.id,
    mustChange: true,
    changedAt: nowIso(),
  });
}

/** Hard-delete: reassigns owned content to the persona (the remaining superadmin). */
export function deleteUserAccount(userId: string): void {
  const u = requireUser(userId);
  if (isSuperadmin(u)) {
    const others = users().filter((x) => x.id !== userId && isSuperadmin(x));
    if (others.length === 0) {
      throw badRequest(
        'This is the last superadmin. Grant superadmin to another user before deleting this account.',
      );
    }
  }
  const reassignTo = users().find((x) => x.id !== userId && isSuperadmin(x));
  if (!reassignTo) {
    throw badRequest('No remaining superadmin to reassign this user content to.');
  }
  for (const m of members().where('userId', userId).slice()) {
    members().remove(m.id);
    contracts.chat?.onMemberChanged?.(m.projectId, userId, 'removed');
  }
  for (const b of bookmarks().where('userId', userId).slice()) bookmarks().remove(b.id);
  for (const c of contributions().where('userId', userId).slice()) contributions().remove(c.id);
  for (const i of invites().filter((x) => x.invitedUserId === userId || x.invitedById === userId)) {
    invites().remove(i.id);
  }
  for (const n of notifications().where('userId', userId).slice()) notifications().remove(n.id);
  for (const p of projects().where('ownerId', userId).slice()) {
    p.ownerId = reassignTo.id;
    projects().save(p);
  }
  voiceUserRemoved(userId, reassignTo.id);
  users().remove(userId);
}

export function createUserRec(dto: {
  email?: string;
  name?: string;
  password?: string;
  roleCode?: string;
}): UserRec {
  const email = (dto.email ?? '').toLowerCase().trim();
  if (!email) throw new HttpError(400, 'Email is required.');
  if (users().find((x) => x.email.toLowerCase() === email)) {
    throw conflict('A user with that email already exists.');
  }
  const roleCode = dto.roleCode ?? 'member';
  if (!roleByCode(roleCode)) throw badRequest(`Unknown role: ${roleCode}`);
  if (dto.password && dto.password.length < 6) {
    throw badRequest('Password must be at least 6 characters.');
  }
  const name = (dto.name || email.split('@')[0]!).trim();
  const id = newId('usr');
  const now = nowIso();
  const rec: UserRec = {
    id,
    email,
    name,
    avatarUrl: avatarDataUri(name, id),
    bio: null,
    isAdmin: roleCode === 'admin' || roleCode === 'superadmin',
    roles: [roleCode],
    phone: null,
    phoneVerified: false,
    emailVerified: true,
    themeId: null,
    themeMode: null,
    jobTitle: 'New team member',
    department: 'Unassigned',
    location: 'Remote',
    timezone: 'UTC',
    createdAt: now,
    lastActiveAt: now,
    suspendedAt: null,
  };
  users().insert(rec);
  return rec;
}

/** Slug-ish helper kept here so role creation stays consistent between endpoints. */
export function roleCodeFromName(name: string): string {
  return slugify(name).slice(0, 40);
}
