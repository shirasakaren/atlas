/**
 * Cross-domain seams. A domain that owns data other domains need to *read*
 * (tasks, chat) implements its contract here at module load; consumers call
 * through `contracts.<domain>?.…` and degrade gracefully when absent.
 */
import type { ProjectRec } from './schema';
import type {
  ChatSearchHit,
  FileSearchHit,
  ForMeActivity,
  ForMeTask,
  MyOpenTask,
  NoteSearchHit,
  TaskSearchHit,
  WhiteboardSearchHit,
} from '@/lib/types';

export interface PmoContract {
  /** A project was just created at runtime: create its default list/statuses/tabs. */
  onProjectCreated?(project: ProjectRec): void;
  /** Top open tasks assigned to `userId`, soonest due first (dashboard widget). */
  myOpenTasks(userId: string, limit: number): MyOpenTask[];
  /** Buckets for GET /users/me/for-me. */
  forMeTasks(userId: string): { overdue: ForMeTask[]; dueToday: ForMeTask[]; open: ForMeTask[] };
  /** Latest task activity across the user's projects (For-me feed). */
  recentActivity(userId: string, limit: number): ForMeActivity[];
  /** Global search; callers pass the accessible project ids. */
  searchTasks(q: string, projectIds: string[], limit: number): TaskSearchHit[];
  searchNotes(q: string, projectIds: string[], limit: number): NoteSearchHit[];
  searchFiles(q: string, projectIds: string[], limit: number): FileSearchHit[];
  searchWhiteboards(q: string, projectIds: string[], limit: number): WhiteboardSearchHit[];
  /** Number of open (non-done, non-archived) tasks in a project, for cards/admin stats. */
  openTaskCount(projectId: string): number;
}

export interface ChatContract {
  /** A project was just created at runtime: create its #general channel. */
  onProjectCreated?(project: ProjectRec): void;
  /** Membership changed (so channels/unread state stay consistent). */
  onMemberChanged?(projectId: string, userId: string, change: "added" | "removed"): void;
  /** Unread counts per channel the user can see (For-me widget). Only channels with unread > 0. */
  unreadSummary(userId: string): { channelId: string; name: string; projectSlug: string | null; unread: number }[];
  /** Global search over messages. */
  searchMessages(q: string, projectIds: string[], limit: number): ChatSearchHit[];
  /** Total unread across channels (badge). */
  totalUnread(userId: string): number;
}

export interface Contracts {
  pmo?: PmoContract;
  chat?: ChatContract;
}

export const contracts: Contracts = {};
