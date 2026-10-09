/**
 * RBAC catalog, mirrored from apps/backend/prisma/seed.ts (PERMISSIONS +
 * ROLE_TEMPLATES). Keep in sync: codes are what the guards check.
 */

export interface PermissionDef {
  code: string;
  name: string;
  description: string;
  category: string;
}

export interface RoleTemplate {
  code: string;
  name: string;
  description: string;
  permissions: string[];
}

export const PERMISSIONS: PermissionDef[] = [
  { code: 'projects.read', name: 'View projects', description: 'See public projects and discovery.', category: 'projects' },
  { code: 'projects.create', name: 'Create projects', description: 'Start new projects.', category: 'projects' },
  { code: 'projects.manage', name: 'Manage projects', description: 'Edit, archive, and manage any project.', category: 'projects' },
  { code: 'projects.delete', name: 'Delete projects', description: 'Permanently delete projects.', category: 'projects' },
  { code: 'projects.manageMembers', name: 'Manage project members', description: 'Invite, approve, and remove project members.', category: 'projects' },
  { code: 'projects.curate', name: 'Curate featured', description: 'Set featured projects on the discovery hero.', category: 'projects' },
  { code: 'tags.manage', name: 'Manage tags', description: 'Create, rename, and archive tags.', category: 'tags' },
  { code: 'users.view', name: 'View users', description: 'List and search user accounts.', category: 'users' },
  { code: 'users.manage', name: 'Manage users', description: 'Create users, reset passwords, grant roles.', category: 'users' },
  { code: 'roles.manage', name: 'Manage roles', description: 'Edit role definitions and permission sets.', category: 'users' },
  { code: 'settings.view', name: 'View settings', description: 'Read instance configuration.', category: 'settings' },
  { code: 'settings.manage', name: 'Manage settings', description: 'Change instance configuration (godmode).', category: 'settings' },
  { code: 'godmode.access', name: 'Access godmode', description: 'Unlock the control plane with the passphrase.', category: 'settings' },
  { code: 'chat.read', name: 'Read chat', description: 'Read channels and messages.', category: 'chat' },
  { code: 'chat.write', name: 'Write chat', description: 'Send messages, react, pin.', category: 'chat' },
  { code: 'chat.moderate', name: 'Moderate chat', description: 'Delete messages and manage global channels.', category: 'chat' },
  { code: 'stickers.manage', name: 'Manage sticker packs', description: 'Create and archive sticker packs.', category: 'chat' },
  { code: 'flags.manage', name: 'Manage feature flags', description: 'Toggle runtime feature flags.', category: 'settings' },
  { code: 'pmo.read', name: 'Read PMO', description: 'View lists, tasks, and boards.', category: 'pmo' },
  { code: 'pmo.write', name: 'Write PMO', description: 'Create and edit tasks, comments, notes.', category: 'pmo' },
  { code: 'pmo.manage', name: 'Manage PMO', description: 'Manage lists, statuses, and project settings.', category: 'pmo' },
  { code: 'voice.read', name: 'Join voice', description: 'Join voice channels.', category: 'voice' },
  { code: 'voice.moderate', name: 'Moderate voice', description: 'Mute, kick, and manage channels.', category: 'voice' },
  { code: 'voice.record', name: 'Record voice', description: 'Start and manage recordings.', category: 'voice' },
  { code: 'media.upload', name: 'Upload media', description: 'Upload images, video, and files.', category: 'media' },
  { code: 'notifications.manage', name: 'Manage notifications', description: 'Send instance-wide notifications.', category: 'users' },
  { code: 'audit.view', name: 'View audit log', description: 'Read the audit trail.', category: 'settings' },
];

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    code: 'superadmin',
    name: 'Superadmin',
    description: 'Instance owner: godmode access and every permission.',
    permissions: PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'admin',
    name: 'Admin',
    description: 'Runs the instance: users, roles, moderation, curation. No godmode.',
    permissions: [
      'projects.read', 'projects.create', 'projects.manage', 'projects.delete',
      'projects.manageMembers', 'projects.curate', 'tags.manage', 'users.view',
      'users.manage', 'roles.manage', 'chat.read', 'chat.write', 'chat.moderate',
      'stickers.manage', 'flags.manage', 'pmo.read', 'pmo.write', 'pmo.manage',
      'voice.read', 'voice.moderate', 'voice.record', 'media.upload',
      'notifications.manage', 'audit.view',
    ],
  },
  {
    code: 'member',
    name: 'Member',
    description: 'Regular workspace member.',
    permissions: ['projects.read', 'chat.read', 'chat.write', 'pmo.read', 'pmo.write', 'voice.read', 'media.upload'],
  },
  {
    code: 'manager',
    name: 'Manager',
    description: 'Member plus permission to start and run new projects.',
    permissions: [
      'projects.read', 'projects.create', 'projects.manage', 'projects.manageMembers',
      'chat.read', 'chat.write', 'pmo.read', 'pmo.write', 'voice.read', 'media.upload',
    ],
  },
  {
    code: 'developer',
    name: 'Developer',
    description: 'Member plus project-management capabilities on joined projects.',
    permissions: [
      'projects.read', 'projects.create', 'projects.manage', 'projects.manageMembers',
      'chat.read', 'chat.write', 'pmo.read', 'pmo.write', 'pmo.manage',
      'voice.read', 'media.upload',
    ],
  },
  {
    code: 'visitor',
    name: 'Visitor / Guest',
    description: 'Read-only access to public content.',
    permissions: ['projects.read', 'chat.read', 'voice.read'],
  },
];
