/**
 * Chat record shapes + typed table accessors. Records are intentionally
 * compact (the seed holds ~27k messages); the handlers expand them into the
 * exact API shapes (see `handlers/chat-store.ts`). No browser globals.
 */
import { tbl } from '../db';
import type { ChatAttachmentKind, ChatDeleteActor, ChatLinkPreview, ChatMessageKind } from '@/lib/types';

export interface ChannelRec {
  id: string;
  /** null = workspace-global channel. */
  projectId: string | null;
  name: string;
  slug: string;
  topic: string | null;
  isGeneral: boolean;
  isArchived: boolean;
  /** Voice-channel text threads live in the same table but never show in lists. */
  isVoiceThread: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface AttRec {
  id: string;
  kind: ChatAttachmentKind;
  url: string;
  s3Key: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  posterUrl: string | null;
}

export interface MsgRec {
  id: string;
  channelId: string;
  authorId: string;
  kind: ChatMessageKind;
  createdAt: string;
  markdown: string;
  editedAt?: string;
  deletedAt?: string;
  deletedActor?: ChatDeleteActor;
  deletedById?: string;
  replyToId?: string;
  forwardedFromId?: string;
  metadata?: { linkPreviews: ChatLinkPreview[] };
  attachments?: AttRec[];
  /** [emoji, userIds[]] in first-reacted order. */
  reactions?: [string, string[]][];
}

/** Per-(channel,user) read state (only the persona is ever tracked). */
export interface ReadRec {
  id: string; // `${channelId}|${userId}`
  channelId: string;
  userId: string;
  lastReadAt: string | null;
  lastReadMessageId: string | null;
}

export interface PinRec {
  id: string;
  channelId: string;
  messageId: string;
  pinnedById: string;
  position: number;
  note: string | null;
  pinnedAt: string;
}

export interface StickerPackRec {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isArchived: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface StickerRec {
  id: string;
  packId: string;
  name: string;
  keywords: string[];
  s3Key: string;
  url: string;
  mime: string;
  width: number | null;
  height: number | null;
  position: number;
  createdAt: string;
}

/** `workspace` or `project:<id>` server avatar overrides. */
export interface AvatarRec {
  id: string;
  emoji: string | null;
  color: string | null;
  imageUrl: string | null;
}

/** Personal chat prefs: mute flag for `workspace` / `project:<id>`. */
export interface PrefRec {
  id: string; // `${userId}|workspace` | `${userId}|project:<id>`
  userId: string;
  scope: string;
  muted: boolean;
}

export const chatChannels = () => tbl<ChannelRec>('chatChannels');
export const chatMessages = () => tbl<MsgRec>('chatMessages');
export const chatReads = () => tbl<ReadRec>('chatReads');
export const chatPins = () => tbl<PinRec>('chatPins');
export const chatPacks = () => tbl<StickerPackRec>('chatPacks');
export const chatStickers = () => tbl<StickerRec>('chatStickers');
export const chatAvatars = () => tbl<AvatarRec>('chatAvatars');
export const chatPrefs = () => tbl<PrefRec>('chatPrefs');

export const readId = (channelId: string, userId: string) => `${channelId}|${userId}`;
export const prefId = (userId: string, scope: string) => `${userId}|${scope}`;
