/**
 * Shared lookups & authorisation, mirroring the backend's ProjectAccessService.
 * Every handler that needs "who is calling" or "may they see this project"
 * goes through here so all domains behave consistently.
 */
import type { Req } from './http';
import { forbidden, HttpError, notFound } from './http';
import { ME_ID } from './config';
import { members, projects, users } from './store';
import type { MemberRec, ProjectRec, UserRec } from './schema';
import type { UserSummary } from '@/lib/types';

export type AccessLevel = 'admin' | 'manager' | 'contributor' | 'viewer';

export interface ProjectAccess {
  level: AccessLevel;
  isInsider: boolean;
  isManager: boolean;
  membership?: MemberRec;
}

/** The signed-in persona (every request is made as them). */
export function me(): UserRec {
  const u = users().get(ME_ID);
  if (!u) throw new HttpError(401, 'Not signed in');
  return u;
}

export function meId(): string {
  return ME_ID;
}

/** `{ id, name, avatarUrl }` (+ optional email) as used all over the API. */
export function userSummary(id: string | null | undefined, withEmail = false): UserSummary {
  const u = id ? users().get(id) : undefined;
  if (!u) {
    return { id: id ?? 'unknown', name: 'Deleted user', avatarUrl: null };
  }
  return withEmail
    ? { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl }
    : { id: u.id, name: u.name, avatarUrl: u.avatarUrl };
}

/** Resolve a project by slug or id; 404 if missing. */
export function projectBySlugOrId(slugOrId: string): ProjectRec {
  const p = projects().get(slugOrId) ?? projects().where('slug', slugOrId)[0];
  if (!p) throw notFound('Project not found.');
  return p;
}

export function membershipOf(projectId: string, userId: string): MemberRec | undefined {
  return members().where('projectId', projectId).find((m) => m.userId === userId);
}

export function accessFor(project: ProjectRec, userId: string = ME_ID): ProjectAccess {
  const u = users().get(userId);
  const membership = membershipOf(project.id, userId);
  if (u?.isAdmin) return { level: 'admin', isInsider: true, isManager: true, membership };
  if (membership) {
    const isManager = membership.role === 'PROJECT_MANAGER';
    return { level: isManager ? 'manager' : 'contributor', isInsider: true, isManager, membership };
  }
  return { level: 'viewer', isInsider: false, isManager: false };
}

/** Resolve + authorise for READ of public/insider-visible project info (403 for private non-members). */
export function resolveProject(slugOrId: string): { project: ProjectRec; access: ProjectAccess } {
  const project = projectBySlugOrId(slugOrId);
  const access = accessFor(project);
  if (project.visibility === 'PRIVATE' && !access.isInsider) throw forbidden('This project is private.');
  return { project, access };
}

export function assertInsider(access: ProjectAccess) {
  if (!access.isInsider) throw forbidden('Project membership required.');
}

export function assertManager(access: ProjectAccess) {
  if (!access.isManager) throw forbidden('Project Manager role required.');
}

export function assertAdmin() {
  if (!me().isAdmin) throw forbidden('Admin role required.');
}

/** Project ids the persona may read insider (member-only) content on. */
export function accessibleProjectIds(): string[] {
  if (me().isAdmin) return projects().all().map((p) => p.id);
  const mine = new Set(members().all().filter((m) => m.userId === ME_ID).map((m) => m.projectId));
  return Array.from(mine);
}

/** Visible-to-persona project test (public, or insider). */
export function canSeeProject(p: ProjectRec): boolean {
  return p.visibility === 'PUBLIC' || accessFor(p).isInsider;
}

/** Body helper: `requireBody(req)` throws 400 when no JSON object was sent. */
export function requireBody<T = Record<string, any>>(req: Req): T {
  if (req.body == null || typeof req.body !== 'object') throw new HttpError(400, 'Request body required.');
  return req.body as T;
}
