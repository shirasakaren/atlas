/**
 * Shared shaping helpers for the "app" domain handlers: project cards,
 * project detail (viewer vs insider), user records, role catalogue.
 * Mirrors apps/backend/src/modules/projects/projects.service.ts.
 */
import { nowIso } from '../clock';
import { ME_ID } from '../config';
import { tbl, type Rec } from '../db';
import { HttpError } from '../http';
import { accessFor, userSummary, type ProjectAccess } from '../access';
import type { MemberRec, ProjectRec, UserRec } from '../schema';
import { bookmarks, contributions, invites, media, members, projects, tags, users } from '../store';
import type {
  ProjectCard,
  ProjectDetail,
  ProjectDetailInsider,
  ProjectDetailViewer,
  ProjectMedia,
  Tag,
} from '@/lib/types';

// ─── App-owned tables ───────────────────────────────────────────────────

/** Per-user notification preference rows (NotificationPreference shape). */
export interface PrefRec extends Rec {
  userId: string;
  [flag: string]: unknown;
}
export const prefsTable = () => tbl<PrefRec>('app_notification_prefs');

/** Auxiliary per-user account fields not on UserRec. */
export interface MeExtraRec extends Rec {
  consentAcceptedAt: string | null;
  passwordChangedAt: string | null;
  lastLoginAt: string;
}
export const meExtraTable = () => tbl<MeExtraRec>('app_me_extra');

/** Admin-curated featured (pinned) projects, in display order. */
export interface FeaturedRec extends Rec {
  /** id === projectId */
  order: number;
  setAt: string;
}
export const featuredTable = () => tbl<FeaturedRec>('app_featured');

/** Remembers the phase an archived project had so unarchive can restore it. */
export interface PrevPhaseRec extends Rec {
  phase: string;
}
export const prevPhaseTable = () => tbl<PrevPhaseRec>('app_prev_phase');

/** Push "devices" (always empty: push is disabled in the demo). */
export interface PushDeviceRec extends Rec {
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
}
export const pushDevicesTable = () => tbl<PushDeviceRec>('app_push_devices');

// ─── Roles ──────────────────────────────────────────────────────────────

export const ALL_PERMISSIONS = [
  'projects.read', 'projects.create', 'projects.manage', 'projects.delete', 'projects.manageMembers',
  'projects.curate', 'tags.manage', 'users.view', 'users.manage', 'roles.manage', 'settings.view',
  'settings.manage', 'godmode.access', 'chat.read', 'chat.write', 'chat.moderate', 'stickers.manage',
  'flags.manage', 'pmo.read', 'pmo.write', 'pmo.manage', 'voice.read', 'voice.moderate', 'voice.record',
  'media.upload', 'notifications.manage', 'audit.view',
];

export const ROLE_CATALOG: Record<string, { id: string; name: string; permissions: string[] }> = {
  superadmin: { id: 'role_superadmin', name: 'Superadmin', permissions: ALL_PERMISSIONS },
  admin: {
    id: 'role_admin',
    name: 'Admin',
    permissions: ALL_PERMISSIONS.filter((p) => !['settings.view', 'settings.manage', 'godmode.access'].includes(p)),
  },
  member: {
    id: 'role_member',
    name: 'Member',
    permissions: ['projects.read', 'chat.read', 'chat.write', 'pmo.read', 'pmo.write', 'voice.read', 'media.upload'],
  },
  manager: {
    id: 'role_manager',
    name: 'Manager',
    permissions: [
      'projects.read', 'projects.create', 'projects.manage', 'projects.manageMembers', 'chat.read',
      'chat.write', 'pmo.read', 'pmo.write', 'voice.read', 'media.upload',
    ],
  },
  developer: {
    id: 'role_developer',
    name: 'Developer',
    permissions: [
      'projects.read', 'projects.create', 'projects.manage', 'projects.manageMembers', 'chat.read',
      'chat.write', 'pmo.read', 'pmo.write', 'pmo.manage', 'voice.read', 'media.upload',
    ],
  },
  visitor: { id: 'role_visitor', name: 'Visitor / Guest', permissions: ['projects.read', 'chat.read', 'voice.read'] },
};

export function roleOf(code: string) {
  const r = ROLE_CATALOG[code];
  return { id: r?.id ?? `role_${code}`, code, name: r?.name ?? code, permissions: r?.permissions ?? [] };
}

// ─── Project shaping ────────────────────────────────────────────────────

export function tagsOf(p: ProjectRec): Tag[] {
  const out: Tag[] = [];
  for (const id of p.tagIds) {
    const t = tags().get(id);
    if (t) out.push({ id: t.id, name: t.name, category: t.category, slug: t.slug });
  }
  return out;
}

export function sortedMedia(projectId: string) {
  return [...media().where('projectId', projectId)].sort((a, b) => a.order - b.order);
}

export function toProjectMedia(m: { id: string; url: string; type: ProjectMedia['type']; order: number; width: number | null; height: number | null; sizeBytes: number | null }): ProjectMedia {
  return { id: m.id, url: m.url, type: m.type, order: m.order, width: m.width, height: m.height, sizeBytes: m.sizeBytes };
}

export function memberCount(projectId: string): number {
  return members().where('projectId', projectId).length;
}

export function pendingRequestCount(projectId: string): number {
  return contributions().where('projectId', projectId).filter((c) => c.status === 'PENDING').length;
}

export function projectCard(p: ProjectRec): ProjectCard {
  const preview = sortedMedia(p.id)
    .filter((m) => m.order > 0)
    .slice(0, 4)
    .map((m) => ({ id: m.id, url: m.url, type: m.type, order: m.order }));
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    thumbnailUrl: p.thumbnailUrl,
    thumbnailType: p.thumbnailType,
    phase: p.phase,
    visibility: p.visibility,
    collaborationRoles: p.collaborationRoles,
    archivedAt: p.archivedAt,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    owner: userSummary(p.ownerId),
    tags: tagsOf(p),
    previewMedia: preview,
    memberCount: memberCount(p.id),
    pinned: featuredTable().has(p.id),
  };
}

/** The slim project row used by the dashboard, bookmarks and similar lists. */
export function projectBrief(p: ProjectRec) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    phase: p.phase,
    visibility: p.visibility,
    thumbnailUrl: p.thumbnailUrl,
    thumbnailType: p.thumbnailType,
    archivedAt: p.archivedAt,
  };
}

function roleRank(r: MemberRec['role']): number {
  return r === 'PROJECT_MANAGER' ? 0 : 1;
}

export function projectDetail(p: ProjectRec, access: ProjectAccess): ProjectDetail {
  const mem = [...members().where('projectId', p.id)].sort(
    (a, b) => roleRank(a.role) - roleRank(b.role) || a.joinedAt.localeCompare(b.joinedAt),
  );
  const base: ProjectDetailViewer = {
    id: p.id,
    slug: p.slug,
    title: p.title,
    shortDescription: p.shortDescription,
    description: p.description,
    thumbnailUrl: p.thumbnailUrl,
    thumbnailType: p.thumbnailType,
    techStack: p.techStack,
    phase: p.phase,
    visibility: p.visibility,
    collaborationRoles: p.collaborationRoles,
    archivedAt: p.archivedAt,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    owner: userSummary(p.ownerId),
    tags: tagsOf(p),
    media: sortedMedia(p.id).map(toProjectMedia),
    managers: mem.filter((m) => m.role === 'PROJECT_MANAGER').map((m) => userSummary(m.userId)),
    memberCount: mem.length,
    access: { level: access.level, isInsider: access.isInsider, isManager: access.isManager },
    bookmarked: bookmarks().where('projectId', p.id).some((b) => b.userId === ME_ID),
  };
  if (!access.isInsider) return base;
  const owner = users().get(p.ownerId);
  const insider: ProjectDetailInsider = {
    ...base,
    internalLinks: p.internalLinks,
    members: mem.map((m) => ({
      id: m.id,
      role: m.role,
      title: m.title,
      joinedAt: m.joinedAt,
      user: userSummary(m.userId, true),
    })),
    pendingRequestCount: access.isManager ? pendingRequestCount(p.id) : undefined,
    ownerEmail: owner?.email ?? '',
  };
  return insider;
}

/** Visible to the persona: admin sees all; otherwise public or member. */
export function visibleTo(p: ProjectRec, userId: string = ME_ID): boolean {
  if (p.visibility === 'PUBLIC') return true;
  return accessFor(p, userId).isInsider;
}

/** Cascade-remove everything this domain owns that hangs off a project. */
export function purgeProject(id: string): void {
  for (const m of [...members().where('projectId', id)]) members().remove(m.id);
  for (const m of [...media().where('projectId', id)]) media().remove(m.id);
  for (const c of [...contributions().where('projectId', id)]) contributions().remove(c.id);
  for (const b of [...bookmarks().where('projectId', id)]) bookmarks().remove(b.id);
  for (const i of [...invites().where('projectId', id)]) invites().remove(i.id);
  featuredTable().remove(id);
  projects().remove(id);
}

export function requireString(v: unknown, field: string, min: number, max: number): string {
  if (typeof v !== 'string') throw new HttpError(400, `${field} must be a string.`);
  const s = v.trim();
  if (s.length < min) throw new HttpError(400, `${field} must be longer than or equal to ${min} characters.`);
  if (s.length > max) throw new HttpError(400, `${field} must be shorter than or equal to ${max} characters.`);
  return s;
}

export function userRolesOf(u: UserRec) {
  return u.roles.map((c) => ({ id: roleOf(c).id, code: c, name: roleOf(c).name }));
}

// ─── Notification preferences ───────────────────────────────────────────

export const PREF_FLAGS = [
  'pushEnabled',
  'contributionRequestEnabled',
  'projectInvitedEnabled',
  'projectRoleChangedEnabled',
  'projectRemovedEnabled',
  'chatMentionEnabled',
  'taskAssignedEnabled',
  'taskMentionedEnabled',
  'taskDueSoonEnabled',
  'taskOverdueEnabled',
  'taskCommentReplyEnabled',
  'taskStatusChangedEnabled',
  'taskDependencyBlockedEnabled',
  'noteMentionedEnabled',
  'whiteboardMentionedEnabled',
  'voiceParticipantJoinedEnabled',
  'voiceMentionedEnabled',
] as const;

export function defaultPrefs(userId: string, at: string = nowIso()): PrefRec {
  const rec: PrefRec = { id: `npref_${userId}`, userId, createdAt: at, updatedAt: at };
  for (const f of PREF_FLAGS) rec[f] = true;
  return rec;
}

