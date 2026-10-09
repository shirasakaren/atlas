/**
 * RBAC helpers shared by the admin/godmode handlers: role + permission
 * tables, permission checks for the persona, and keeping `UserRec.isAdmin`
 * consistent with the role codes a user holds.
 *
 * Exported for other domains too (e.g. `/users/me/roles`):
 *   permissionsOf(userId), rolesOf(userId)
 */
import { tbl, type Rec } from '../db';
import { forbidden } from '../http';
import { me } from '../access';
import { users } from '../store';
import { ME_ID, LS_SESSION } from '../config';
import type { UserRec } from '../schema';

export interface RoleRec extends Rec {
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionRec extends Rec {
  code: string;
  name: string;
  description: string | null;
  category: string;
}

export const rolesTbl = () => tbl<RoleRec>('roles');
export const permissionsTbl = () => tbl<PermissionRec>('permissions');

export const ADMIN_ROLE_CODES = ['admin', 'superadmin'] as const;
export const PROTECTED_ROLE_CODES = new Set<string>(ADMIN_ROLE_CODES);

export function roleByCode(code: string): RoleRec | undefined {
  return rolesTbl().where('code', code)[0];
}

export function roleName(code: string): string {
  return roleByCode(code)?.name ?? code;
}

/** `[{ code, name }]` for a user's role codes (admin list shape). */
export function rolesOf(u: UserRec): { code: string; name: string }[] {
  return u.roles.map((code) => ({ code, name: roleName(code) }));
}

/** Union of the permission codes granted by the roles the user holds. */
export function permissionsOf(userId: string): Set<string> {
  const u = users().get(userId);
  const out = new Set<string>();
  if (!u) return out;
  for (const code of u.roles) {
    const r = roleByCode(code);
    if (r) for (const p of r.permissions) out.add(p);
  }
  return out;
}

/** 403 unless the persona holds the permission (admins bypass, like the backend guard). */
export function requirePermission(code: string): void {
  const m = me();
  if (m.isAdmin) return;
  if (!permissionsOf(m.id).has(code)) throw forbidden('Forbidden resource');
}

/** Persona must be an admin (AdminGuard). */
export function requireAdminGuard(): void {
  if (!me().isAdmin) throw forbidden('Admin role required.');
}

export function isSuperadmin(u: UserRec): boolean {
  return u.roles.includes('superadmin');
}

/** Recompute the denormalised flag after a role change; mirrors it into the stored session for the persona. */
export function syncAdminFlag(u: UserRec): void {
  const next = u.roles.some((c) => PROTECTED_ROLE_CODES.has(c));
  if (u.isAdmin !== next) u.isAdmin = next;
  users().save(u);
  if (u.id === ME_ID) mirrorPersonaSession(u.isAdmin);
}

/** Browser only: keep `atlas_session.user.isAdmin` in step with the persona's roles. */
export function mirrorPersonaSession(isAdmin: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s?.user && s.user.isAdmin !== isAdmin) {
      s.user.isAdmin = isAdmin;
      localStorage.setItem(LS_SESSION, JSON.stringify(s));
    }
  } catch {
    /* storage blocked */
  }
}
