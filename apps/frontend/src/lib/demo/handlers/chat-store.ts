/**
 * Shared chat helpers for the handlers, the socket server and the live
 * simulation: message index, API shaping, read state, access.
 */
import { ME_ID } from '../config';
import { isDbReady } from '../db';
import { forbidden, notFound } from '../http';
import { me, resolveProject, userSummary, type ProjectAccess } from '../access';
import { projects, users } from '../store';
import { newId } from '../prng';
import { nowIso } from '../clock';
import {
  chatChannels,
  chatMessages,
  chatPins,
  chatPrefs,
  chatReads,
  prefId,
  readId,
  type ChannelRec,
  type MsgRec,
  type PinRec,
} from '../seed/chat-schema';
import type { ProjectRec } from '../schema';
import type { ChatChannel, ChatMessage } from '@/lib/types';

// ─── Message index (channelId -> messages, ascending) ─────────────────

let idx: Map<string, MsgRec[]> | null = null;

function buildIndex(): Map<string, MsgRec[]> {
  const m = new Map<string, MsgRec[]>();
  for (const r of chatMessages().all()) {
    let l = m.get(r.channelId);
    if (!l) m.set(r.channelId, (l = []));
    l.push(r);
  }
  for (const l of m.values()) {
    let sorted = true;
    for (let i = 1; i < l.length; i++) {
      if (l[i]!.createdAt < l[i - 1]!.createdAt) {
        sorted = false;
        break;
      }
    }
    if (!sorted) l.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1));
  }
  return m;
}

/** Cached only once the DB is ready (the overlay replay replaces seed records at boot). */
export function msgIndex(): Map<string, MsgRec[]> {
  if (idx) return idx;
  const built = buildIndex();
  if (isDbReady()) idx = built;
  return built;
}

const EMPTY: MsgRec[] = [];
export const channelMsgs = (channelId: string): MsgRec[] => msgIndex().get(channelId) ?? EMPTY;

export function addMessage(rec: MsgRec): MsgRec {
  chatMessages().insert(rec);
  const m = msgIndex();
  let l = m.get(rec.channelId);
  if (!l) m.set(rec.channelId, (l = []));
  const last = l[l.length - 1];
  if (!last || last.createdAt <= rec.createdAt) l.push(rec);
  else {
    l.push(rec);
    l.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1));
  }
  return rec;
}

/** Index of the first message with createdAt >= iso (lower bound). */
export function lowerBound(arr: MsgRec[], iso: string): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid]!.createdAt < iso) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// ─── Channels ─────────────────────────────────────────────────────────

export function requireChannel(id: string): ChannelRec {
  const c = chatChannels().get(id);
  if (!c) throw notFound('Channel not found.');
  return c;
}

export function shapeChannel(c: ChannelRec): ChatChannel {
  return {
    id: c.id,
    projectId: c.projectId,
    name: c.name,
    slug: c.slug,
    topic: c.topic,
    isGeneral: c.isGeneral,
    isArchived: c.isArchived,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    archivedAt: c.archivedAt,
  };
}

export const channelOrder = (a: ChannelRec, b: ChannelRec) =>
  Number(b.isGeneral) - Number(a.isGeneral) || Number(a.isArchived) - Number(b.isArchived) || (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0);

export function projectChannels(projectId: string | null): ChannelRec[] {
  return chatChannels()
    .all()
    .filter((c) => c.projectId === projectId && !c.isVoiceThread)
    .sort(channelOrder);
}

export interface ChannelAccess {
  channel: ChannelRec;
  project: ProjectRec | null;
  access: ProjectAccess;
}

/** Access resolved from the channel row itself (global channels admit everyone; admins moderate). */
export function accessForChannel(channel: ChannelRec): ChannelAccess {
  if (!channel.projectId) {
    const admin = me().isAdmin;
    return {
      channel,
      project: null,
      access: admin ? { level: 'admin', isInsider: true, isManager: true } : { level: 'contributor', isInsider: true, isManager: false },
    };
  }
  const project = projects().get(channel.projectId);
  if (!project) throw notFound('Project not found.');
  return { channel, project, access: resolveProject(project.id).access };
}

export function assertInsider(a: ChannelAccess) {
  if (!a.access.isInsider) throw forbidden('Project membership required.');
}

export function assertManager(a: ChannelAccess) {
  if (!a.access.isManager) throw forbidden('Project Manager role required.');
}

// ─── Message shaping ──────────────────────────────────────────────────

const pinOf = (messageId: string): PinRec | undefined => chatPins().where('messageId', messageId)[0];

export function shapeMessage(m: MsgRec): ChatMessage {
  const deleted = !!m.deletedAt;
  const groups = new Map<string, { emoji: string; count: number; users: { id: string; name: string }[] }>();
  if (!deleted && m.reactions) {
    for (const [emoji, ids] of m.reactions) {
      groups.set(emoji, {
        emoji,
        count: ids.length,
        users: ids.map((id) => ({ id, name: users().get(id)?.name ?? 'Deleted user' })),
      });
    }
  }
  const reply = m.replyToId ? chatMessages().get(m.replyToId) : undefined;
  const fwd = m.forwardedFromId ? chatMessages().get(m.forwardedFromId) : undefined;
  const pin = deleted ? undefined : pinOf(m.id);
  const author = userSummary(m.authorId);
  return {
    id: m.id,
    channelId: m.channelId,
    kind: m.kind,
    createdAt: m.createdAt,
    editedAt: m.editedAt ?? null,
    deletedAt: m.deletedAt ?? null,
    deletedActor: m.deletedActor ?? null,
    deletedBy: deleted && m.deletedActor === 'MODERATOR' && m.deletedById ? { id: m.deletedById, name: users().get(m.deletedById)?.name ?? 'Moderator' } : null,
    author: { id: author.id, name: author.name, avatarUrl: author.avatarUrl },
    markdown: deleted ? '' : m.markdown,
    metadata: deleted ? null : m.metadata ?? null,
    attachments: deleted ? [] : (m.attachments ?? []).map((a) => ({ ...a, messageId: m.id, createdAt: m.createdAt })),
    reactions: [...groups.values()].sort((a, b) => b.count - a.count),
    replyTo: m.replyToId
      ? {
          id: m.replyToId,
          preview: !reply || reply.deletedAt ? '' : reply.markdown.slice(0, 200),
          isDeleted: !reply || !!reply.deletedAt,
          author: reply ? userSummary(reply.authorId) : { id: 'unknown', name: 'Deleted user', avatarUrl: null },
        }
      : null,
    forwardedFrom: m.forwardedFromId
      ? {
          id: m.forwardedFromId,
          channelId: fwd?.channelId ?? m.channelId,
          author: { id: fwd?.authorId ?? 'unknown', name: fwd ? (users().get(fwd.authorId)?.name ?? 'Deleted user') : 'Deleted user' },
        }
      : null,
    isPinned: !deleted && !!pin,
    pinNote: !deleted && pin ? pin.note : null,
  };
}

export function messageOrThrow(id: string): MsgRec {
  const m = chatMessages().get(id);
  if (!m) throw notFound('Message not found.');
  return m;
}

export const newMessageId = () => newId('msg');
export const newAttachmentId = () => newId('catt');

// ─── Read state / unread / mute ───────────────────────────────────────

export function unreadFor(channelId: string, userId: string = ME_ID): number {
  const arr = channelMsgs(channelId);
  if (!arr.length) return 0;
  const last = chatReads().get(readId(channelId, userId))?.lastReadAt ?? null;
  let n = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i]!;
    if (last && m.createdAt <= last) break;
    if (m.authorId !== userId && !m.deletedAt) {
      n++;
      if (n >= 99) break;
    }
  }
  return Math.min(n, 99);
}

export function markRead(channelId: string, userId: string, lastReadMessageId?: string) {
  const id = readId(channelId, userId);
  const cur = chatReads().get(id);
  const lastReadAt = nowIso();
  if (cur) {
    cur.lastReadAt = lastReadAt;
    if (lastReadMessageId) cur.lastReadMessageId = lastReadMessageId;
    chatReads().save(cur);
  } else {
    chatReads().insert({ id, channelId, userId, lastReadAt, lastReadMessageId: lastReadMessageId ?? null });
  }
}

export const isMuted = (scope: string, userId: string = ME_ID): boolean => !!chatPrefs().get(prefId(userId, scope))?.muted;

export function setMuted(scope: string, muted: boolean, userId: string = ME_ID) {
  const id = prefId(userId, scope);
  const cur = chatPrefs().get(id);
  if (cur) {
    cur.muted = muted;
    chatPrefs().save(cur);
  } else chatPrefs().insert({ id, userId, scope, muted });
}

export const scopeOf = (channel: ChannelRec) => (channel.projectId ? `project:${channel.projectId}` : 'workspace');

/** Distinct recent authors of a channel (most frequent first), excluding the persona. */
export function recentAuthors(channelId: string, sample = 220): string[] {
  const arr = channelMsgs(channelId);
  const counts = new Map<string, number>();
  for (let i = arr.length - 1; i >= 0 && i >= arr.length - sample; i--) {
    const a = arr[i]!.authorId;
    if (a === ME_ID) continue;
    counts.set(a, (counts.get(a) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
