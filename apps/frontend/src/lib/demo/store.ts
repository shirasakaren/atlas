import { tbl } from './db';
import type {
  BookmarkRec,
  CollabRoleRec,
  ContributionRec,
  InviteRec,
  MediaRec,
  MemberRec,
  NotificationRec,
  ProjectRec,
  TagRec,
  UserRec,
} from './schema';

/** Typed accessors for the shared tables. */
export const users = () => tbl<UserRec>('users');
export const tags = () => tbl<TagRec>('tags');
export const collabRoles = () => tbl<CollabRoleRec>('collabRoles');
export const projects = () => tbl<ProjectRec>('projects');
export const media = () => tbl<MediaRec>('media');
export const members = () => tbl<MemberRec>('members');
export const contributions = () => tbl<ContributionRec>('contributions');
export const invites = () => tbl<InviteRec>('invites');
export const bookmarks = () => tbl<BookmarkRec>('bookmarks');
export const notifications = () => tbl<NotificationRec>('notifications');
