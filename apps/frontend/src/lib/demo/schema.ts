/**
 * Record shapes shared across demo domains. Domain-private records (task
 * comments, chat messages, godmode settings…) are defined next to their
 * handlers; only what several domains must agree on lives here.
 *
 * Timestamps are ISO strings (same as the API). Foreign keys are plain ids.
 */
import type {
  ContributionStatus,
  InviteStatus,
  MediaType,
  ProjectPhase,
  ProjectRole,
  ProjectVisibility,
  Tag,
  CollaborationRole,
  NotificationType,
} from '@/lib/types';

/** Drives which task/chat vocabulary a project's seed content draws from. */
export type ProjectKind =
  | 'software'
  | 'mobile'
  | 'data'
  | 'security'
  | 'infrastructure'
  | 'finance'
  | 'people'
  | 'marketing'
  | 'design'
  | 'operations'
  | 'legal'
  | 'research'
  | 'supply-chain'
  | 'customer'
  | 'sales';

export interface UserRec {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  /** Denormalised mirror of holding the admin/superadmin role. */
  isAdmin: boolean;
  /** Role codes held (`member`, `manager`, `admin`, `superadmin`, …). */
  roles: string[];
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  themeId: string | null;
  themeMode: string | null;
  // Org-chart flavour (demo only; surfaced in bios, admin lists, mentions).
  jobTitle: string;
  department: string;
  location: string;
  timezone: string;
  createdAt: string;
  lastActiveAt: string;
  suspendedAt: string | null;
}

export interface TagRec extends Tag {}
export interface CollabRoleRec extends CollaborationRole {}

export interface ProjectRec {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  /** Tiptap JSON document. */
  description: Record<string, unknown>;
  thumbnailUrl: string | null;
  thumbnailType: MediaType | null;
  techStack: string[];
  phase: ProjectPhase;
  visibility: ProjectVisibility;
  /** Names of collaboration roles the project is recruiting for. */
  collaborationRoles: string[];
  archivedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  tagIds: string[];
  pinned: boolean;
  internalLinks: { pmTool?: string; repository?: string; staging?: string; designs?: string } | null;
  // Demo-only metadata used by seeders of other domains.
  kind: ProjectKind;
  department: string;
  /** Uppercase task-key prefix, e.g. `PLT` → `PLT-12`. Unique across projects. */
  key: string;
}

export interface MediaRec {
  id: string;
  projectId: string;
  url: string;
  type: MediaType;
  order: number;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
}

export interface MemberRec {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  /** Free-form collaboration title ("Frontend Engineer"). */
  title: string | null;
  joinedAt: string;
}

export interface ContributionRec {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  message: string;
  status: ContributionStatus;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InviteRec {
  id: string;
  projectId: string;
  invitedUserId: string;
  invitedById: string;
  role: ProjectRole;
  title: string | null;
  status: InviteStatus;
  createdAt: string;
}

export interface BookmarkRec {
  id: string;
  userId: string;
  projectId: string;
  createdAt: string;
}

export interface NotificationRec {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

/** Table names: always go through `store.ts` accessors rather than raw strings. */
export const TABLES = {
  users: 'users',
  tags: 'tags',
  collabRoles: 'collabRoles',
  projects: 'projects',
  media: 'media',
  members: 'members',
  contributions: 'contributions',
  invites: 'invites',
  bookmarks: 'bookmarks',
  notifications: 'notifications',
} as const;
