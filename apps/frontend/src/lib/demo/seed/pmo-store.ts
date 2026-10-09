/**
 * PMO record shapes + typed table accessors, shared by the PMO seeder and the
 * PMO handlers. Everything here is plain data (no browser globals).
 *
 * Internal records are intentionally compact (ISO strings for dates, numbers
 * for positions, lazily-built bodies) so ~6k tasks / ~12k comments / ~30k
 * activity rows seed in a few tens of milliseconds. The handlers expand them
 * into the exact API shapes (see `handlers/pmo-shape.ts`).
 */
import { tbl } from '../db';
import type {
  PmoBrandColor,
  TaskActivityKind,
  TaskDependencyKind,
  TaskListTab,
  TaskPriority,
  TaskStatus,
} from '@/lib/types';

export interface ListRec {
  id: string;
  projectId: string;
  name: string;
  iconName: string;
  iconColor: PmoBrandColor;
  order: number;
  contributorsCanCreateTasks: boolean;
  projectKey: string | null;
  taskCounter: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Recipe for a lazily-built Tiptap description (see pmo-content `buildDescription`). */
export interface DescSpec {
  /** Per-task seed. */
  s: number;
  /** Content stream (plan | build | verify | rollout | ops | comms). */
  st: string;
  /** Keys of related tasks referenced from the body (rendered as task links). */
  rel?: string[];
  /** A blocker note is appended. */
  blk?: string;
}

export interface AssigneeRef {
  userId: string;
  at: string;
}

export interface TaskRec {
  id: string;
  taskListId: string;
  projectId: string;
  key: string;
  title: string;
  /** Explicit (user-edited) Tiptap JSON; wins over `dspec`. */
  description: Record<string, unknown> | null;
  dspec: DescSpec | null;
  statusId: string;
  priority: TaskPriority;
  storyPoints: number | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  pos: number;
  createdById: string;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: AssigneeRef[];
}

export interface DepRec {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  kind: TaskDependencyKind;
}

export interface CommentRec {
  id: string;
  taskId: string;
  authorId: string;
  markdown: string;
  replyToId: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface ActivityRec {
  id: string;
  taskId: string;
  projectId: string;
  listId: string;
  actorId: string | null;
  kind: TaskActivityKind | 'MOVED';
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface FileRec {
  id: string;
  projectId: string;
  parentFolderId: string | null;
  name: string;
  isFolder: boolean;
  /** Renderable URL; when null and `gen` is set the poster is generated on read. */
  url: string | null;
  gen: string | null;
  s3Key: string | null;
  mime: string | null;
  bytes: number | null;
  uploadedById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NoteGen {
  /** Template family (meeting | rfc | runbook | retro | kickoff | decision | brief). */
  kind: string;
  seed: number;
}

export interface NoteRec {
  id: string;
  projectId: string;
  parentNoteId: string | null;
  title: string;
  iconName: string | null;
  order: number;
  createdById: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  yDocKey: string;
  /** Explicit BlockNote JSON (after the first edit). */
  contentSnapshot: unknown | null;
  gen: NoteGen | null;
  deletedAt: string | null;
}

export interface NoteRevRec {
  id: string;
  noteId: string;
  /** Explicit snapshot, or null → derived from `noteId`'s generator truncated to `frac`. */
  contentSnapshot: unknown | null;
  frac: number;
  size: number;
  authorId: string | null;
  isCheckpoint: boolean;
  createdAt: string;
}

export interface WbGen {
  kind: string;
  seed: number;
}

export interface WbRec {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  /** Explicit thumbnail (after edits); else generated on read from the scene. */
  thumbnailUrl: string | null;
  createdById: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  yDocKey: string;
  sceneSnapshot: unknown | null;
  gen: WbGen | null;
  deletedAt: string | null;
}

export interface WbRevRec {
  id: string;
  whiteboardId: string;
  sceneSnapshot: unknown | null;
  frac: number;
  size: number;
  authorId: string | null;
  isCheckpoint: boolean;
  createdAt: string;
}

export interface UndoRec {
  id: string;
  actorId: string;
  scope: string;
  kind: 'TASK_MOVED' | 'TASK_UPDATED';
  taskId: string | null;
  forwardOp: Record<string, any>;
  inverseOp: Record<string, any>;
  appliedAt: number;
  undoneAt: number | null;
  redoneAt: number | null;
}

export type StatusRec = TaskStatus;
export type TabRec = TaskListTab;

export const pmoLists = () => tbl<ListRec>('pmoLists');
export const pmoStatuses = () => tbl<StatusRec>('pmoStatuses');
export const pmoTabs = () => tbl<TabRec>('pmoTabs');
export const pmoTasks = () => tbl<TaskRec>('pmoTasks');
export const pmoDeps = () => tbl<DepRec>('pmoDeps');
export const pmoComments = () => tbl<CommentRec>('pmoComments');
export const pmoActivity = () => tbl<ActivityRec>('pmoActivity');
export const pmoFiles = () => tbl<FileRec>('pmoFiles');
export const pmoNotes = () => tbl<NoteRec>('pmoNotes');
export const pmoNoteRevs = () => tbl<NoteRevRec>('pmoNoteRevs');
export const pmoWbs = () => tbl<WbRec>('pmoWbs');
export const pmoWbRevs = () => tbl<WbRevRec>('pmoWbRevs');
export const pmoUndo = () => tbl<UndoRec>('pmoUndo');

/** Default statuses of a new list (mirrors the backend `task-list-defaults.ts`). */
export const DEFAULT_STATUSES: ReadonlyArray<{
  name: string;
  color: string;
  category: TaskStatus['category'];
  isDefault: boolean;
}> = [
  { name: 'Backlog', color: 'neutral', category: 'TODO', isDefault: true },
  { name: 'In Progress', color: 'blue', category: 'IN_PROGRESS', isDefault: false },
  { name: 'In Review', color: 'yellow', category: 'IN_PROGRESS', isDefault: false },
  { name: 'Done', color: 'green', category: 'DONE', isDefault: false },
];

export const DEFAULT_TABS: ReadonlyArray<{ kind: TaskListTab['kind']; iconName: string }> = [
  { kind: 'OVERVIEW', iconName: 'gauge' },
  { kind: 'LIST', iconName: 'list-todo' },
  { kind: 'KANBAN', iconName: 'kanban-square' },
  { kind: 'GANTT', iconName: 'gantt-chart' },
  { kind: 'TEAM', iconName: 'users-round' },
  { kind: 'FILES', iconName: 'folder' },
  { kind: 'NOTES', iconName: 'notebook-pen' },
  { kind: 'WHITEBOARDS', iconName: 'pencil-ruler' },
];

/** Seed ids for a list's children are derived from the list number so they never collide. */
export const sid = (prefix: string, n: number, width = 5) => `${prefix}_${String(n).padStart(width, '0')}`;
