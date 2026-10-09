/**
 * Chat REST endpoints (mirrors apps/backend/src/modules/chat controllers).
 */
import { accessibleProjectIds, assertAdmin, assertInsider as assertProjectInsider, assertManager as assertProjectManager, me, meId, requireBody, resolveProject, userSummary } from '../access';
import { badRequest, conflict, forbidden, get, intParam, notFound, patch, post, del, type Req } from '../http';
import { nowIso } from '../clock';
import { presign, resolveBlobUrl } from '../blobs';
import { newId, slugify } from '../prng';
import { members as membersTbl, notifications, projects, users } from '../store';
import {
  chatAvatars,
  chatChannels,
  chatMessages,
  chatPacks,
  chatPins,
  chatReads,
  chatStickers,
  readId,
  type AttRec,
  type ChannelRec,
  type MsgRec,
} from '../seed/chat-schema';
import { previewFor } from '../seed/chat-preview';
import type { ChatMessage, ChatOverviewPayload, ChatProjectOverview, ChatAvatarInfo } from '@/lib/types';
import {
  accessForChannel,
  addMessage,
  assertInsider,
  assertManager,
  channelMsgs,
  channelOrder,
  isMuted,
  lowerBound,
  markRead,
  messageOrThrow,
  newAttachmentId,
  newMessageId,
  projectChannels,
  requireChannel,
  scopeOf,
  setMuted,
  shapeChannel,
  shapeMessage,
  unreadFor,
  type ChannelAccess,
} from './chat-store';
import * as pub from './chat-publish';
import { addReactionTo, afterPersonaMessage } from './chat-sim';
import { runSearch } from './chat-search';

const NAME_RE = /^[a-z0-9][a-z0-9-_]*$/i;

// ─── Overview ─────────────────────────────────────────────────────────

const avatarOf = (key: string): ChatAvatarInfo | null => {
  const a = chatAvatars().get(key);
  return a ? { emoji: a.emoji, color: a.color, imageUrl: a.imageUrl } : null;
};

function overview(): ChatOverviewPayload {
  const ok = new Set(accessibleProjectIds());
  const admin = me().isAdmin;
  const byProject = new Map<string, ChannelRec[]>();
  const global: ChannelRec[] = [];
  for (const c of chatChannels().all()) {
    if (c.isVoiceThread || c.isArchived) continue;
    if (!c.projectId) global.push(c);
    else if (ok.has(c.projectId)) {
      let l = byProject.get(c.projectId);
      if (!l) byProject.set(c.projectId, (l = []));
      l.push(c);
    }
  }
  const rows = (cs: ChannelRec[]) =>
    cs.sort(channelOrder).map((c) => ({ id: c.id, name: c.name, slug: c.slug, isGeneral: c.isGeneral, unread: unreadFor(c.id), updatedAt: c.updatedAt }));
  const myMember = new Map<string, string>();
  for (const m of membersTbl().all()) if (m.userId === meId()) myMember.set(m.projectId, m.role);
  const out: ChatProjectOverview[] = [];
  for (const p of [...projects().all()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))) {
    const cs = byProject.get(p.id);
    if (!cs || !cs.length) continue;
    const channels = rows(cs);
    out.push({
      id: p.id,
      slug: p.slug,
      title: p.title,
      thumbnailUrl: p.thumbnailUrl,
      avatar: avatarOf(`project:${p.id}`),
      updatedAt: p.updatedAt,
      channels,
      unread: channels.reduce((s, c) => s + c.unread, 0),
      isManager: admin || myMember.get(p.id) === 'PROJECT_MANAGER',
      chatMuted: isMuted(`project:${p.id}`),
    });
  }
  const wsChannels = rows(global);
  return {
    projects: out,
    workspace: { channels: wsChannels, unread: wsChannels.reduce((s, c) => s + c.unread, 0), avatar: avatarOf('workspace'), chatMuted: isMuted('workspace') },
  };
}

get('/chat/me/projects', () => overview());

// ─── Channels ─────────────────────────────────────────────────────────

function createChannel(projectId: string | null, body: { name?: string; topic?: string }): ChannelRec {
  const raw = typeof body?.name === 'string' ? body.name : '';
  if (!raw.trim() || raw.length > 64 || !NAME_RE.test(raw.trim())) throw badRequest('Channel name may only contain letters, numbers, hyphens, and underscores.');
  const name = raw.trim().toLowerCase();
  if (name === 'general') throw badRequest(projectId ? '`general` is reserved; it is created automatically with each project.' : '`general` is reserved for the workspace general channel.');
  if (body.topic && body.topic.length > 200) throw badRequest('topic must be shorter than or equal to 200 characters');
  const slug = slugify(name);
  if (chatChannels().all().some((c) => c.projectId === projectId && !c.isVoiceThread && (c.slug === slug || c.name === name))) {
    throw conflict(projectId ? `Channel "${name}" already exists in this project.` : `Workspace channel "${name}" already exists.`);
  }
  const now = nowIso();
  return chatChannels().insert({
    id: newId('chn'),
    projectId,
    name,
    slug,
    topic: body.topic?.trim() || null,
    isGeneral: false,
    isArchived: false,
    isVoiceThread: false,
    createdById: meId(),
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
}

function updateChannel(c: ChannelRec, body: { name?: string; topic?: string }): ChannelRec {
  if (c.isGeneral && body.name && body.name !== c.name) throw forbidden('The `general` channel cannot be renamed.');
  if (body.name !== undefined) {
    if (!body.name.trim() || body.name.length > 64 || !NAME_RE.test(body.name)) throw badRequest('Channel name may only contain letters, numbers, hyphens, and underscores.');
    const name = body.name.trim().toLowerCase();
    const slug = slugify(body.name);
    if (chatChannels().all().some((x) => x.id !== c.id && x.projectId === c.projectId && !x.isVoiceThread && (x.slug === slug || x.name === name))) throw conflict('A channel with that name already exists.');
    c.name = name;
    c.slug = slug;
  }
  if (body.topic !== undefined) c.topic = body.topic.trim() || null;
  c.updatedAt = nowIso();
  return chatChannels().save(c);
}

function archive(c: ChannelRec): ChannelRec {
  if (c.isGeneral) throw forbidden('The `general` channel cannot be archived.');
  c.isArchived = true;
  c.archivedAt = nowIso();
  c.updatedAt = c.archivedAt;
  return chatChannels().save(c);
}

function unarchive(c: ChannelRec): ChannelRec {
  c.isArchived = false;
  c.archivedAt = null;
  c.updatedAt = nowIso();
  return chatChannels().save(c);
}

const globalChannel = (id: string): ChannelRec => {
  const c = requireChannel(id);
  if (c.projectId) throw notFound('Channel not found.');
  return c;
};

const projectChannel = (req: Req, managerOnly: boolean): { c: ChannelRec; projectId: string } => {
  const { project, access } = resolveProject(req.params.slugOrId ?? req.params.slug!);
  if (managerOnly) assertProjectManager(access);
  else assertProjectInsider(access);
  const c = req.params.channelId ? requireChannel(req.params.channelId) : (null as never);
  if (c && c.projectId !== project.id) throw notFound('Channel not found.');
  return { c, projectId: project.id };
};

// Global channels
get('/chat/global/channels', () => projectChannels(null).map(shapeChannel));
post('/chat/global/channels', (req) => {
  assertAdmin();
  const c = createChannel(null, requireBody(req));
  pub.channelCreated(c);
  return shapeChannel(c);
});
patch('/chat/global/channels/:channelId', (req) => {
  assertAdmin();
  const c = updateChannel(globalChannel(req.params.channelId!), requireBody(req));
  pub.channelUpdated(c);
  return shapeChannel(c);
});
post('/chat/global/channels/:channelId/archive', (req) => {
  assertAdmin();
  const c = archive(globalChannel(req.params.channelId!));
  pub.channelArchived(c.id);
  return shapeChannel(c);
});
post('/chat/global/channels/:channelId/unarchive', (req) => {
  assertAdmin();
  const c = unarchive(globalChannel(req.params.channelId!));
  pub.channelUpdated(c);
  return shapeChannel(c);
});
patch('/chat/global/mute', (req) => {
  const muted = !!requireBody<{ muted?: boolean }>(req).muted;
  setMuted('workspace', muted);
  return { muted };
});
get('/chat/global/members', (req) => {
  const term = (req.query.get('q') ?? '').trim().toLowerCase();
  return users()
    .all()
    .filter((u) => !u.suspendedAt && (!term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20)
    .map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl, role: null, title: null }));
});

// Project channels
get('/projects/:slugOrId/chat/channels', (req) => {
  const { project, access } = resolveProject(req.params.slugOrId!);
  assertProjectInsider(access);
  return projectChannels(project.id).map(shapeChannel);
});
post('/projects/:slugOrId/chat/channels', (req) => {
  const { project, access } = resolveProject(req.params.slugOrId!);
  assertProjectManager(access);
  const c = createChannel(project.id, requireBody(req));
  pub.channelCreated(c);
  return shapeChannel(c);
});
patch('/projects/:slugOrId/chat/channels/:channelId', (req) => {
  const { c } = projectChannel(req, true);
  const u = updateChannel(c, requireBody(req));
  pub.channelUpdated(u);
  return shapeChannel(u);
});
post('/projects/:slugOrId/chat/channels/:channelId/archive', (req) => {
  const { c } = projectChannel(req, true);
  const u = archive(c);
  pub.channelArchived(u.id);
  return shapeChannel(u);
});
post('/projects/:slugOrId/chat/channels/:channelId/unarchive', (req) => {
  const { c } = projectChannel(req, true);
  const u = unarchive(c);
  pub.channelUpdated(u);
  return shapeChannel(u);
});
patch('/projects/:slugOrId/chat/mute', (req) => {
  const { project, access } = resolveProject(req.params.slugOrId!);
  assertProjectInsider(access);
  const muted = !!requireBody<{ muted?: boolean }>(req).muted;
  setMuted(`project:${project.id}`, muted);
  return { muted };
});
get('/projects/:slugOrId/chat/members', (req) => {
  const { project, access } = resolveProject(req.params.slugOrId!);
  assertProjectInsider(access);
  const term = (req.query.get('q') ?? '').trim().toLowerCase();
  return membersTbl()
    .where('projectId', project.id)
    .map((m) => ({ m, u: users().get(m.userId) }))
    .filter((x) => x.u && (!term || x.u.name.toLowerCase().includes(term) || x.u.email.toLowerCase().includes(term)))
    .sort((a, b) => (a.m.role === b.m.role ? (a.m.joinedAt < b.m.joinedAt ? -1 : 1) : a.m.role === 'PROJECT_MANAGER' ? -1 : 1))
    .slice(0, 20)
    .map(({ m, u }) => ({ id: u!.id, name: u!.name, avatarUrl: u!.avatarUrl, role: m.role, title: m.title }));
});

// ─── Messages ─────────────────────────────────────────────────────────

function listMessages(c: ChannelRec, q: URLSearchParams) {
  const limit = Math.min(intParam(q, 'limit', 50, 100), 100);
  const arr = channelMsgs(c.id);
  let end = arr.length;
  const cursor = q.get('cursor');
  if (cursor) {
    const ref = chatMessages().get(cursor);
    if (!ref) throw badRequest('Invalid cursor.');
    end = lowerBound(arr, ref.createdAt);
  }
  const start = Math.max(0, end - limit);
  const items = arr.slice(start, end).reverse().map(shapeMessage);
  return { items, nextCursor: start > 0 && items.length ? items[items.length - 1]!.id : null };
}

interface AttachmentIn {
  kind?: string;
  url?: string;
  s3Key?: string;
  mime?: string;
  bytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  posterUrl?: string;
}

function buildAttachments(list: AttachmentIn[] | undefined): AttRec[] | undefined {
  if (!list || !list.length) return undefined;
  if (list.length > 10) throw badRequest('At most 10 attachments per message.');
  return list.map((a) => {
    const key = a.s3Key ?? '';
    const sticker = key.startsWith('__sticker:');
    return {
      id: newAttachmentId(),
      kind: (['IMAGE', 'VIDEO', 'AUDIO', 'FILE'].includes(a.kind ?? '') ? a.kind : 'FILE') as AttRec['kind'],
      url: sticker ? (a.url ?? '') : resolveBlobUrl(key || a.url || '', key.split('/').pop() ?? 'File'),
      s3Key: key,
      mime: a.mime ?? 'application/octet-stream',
      bytes: a.bytes ?? 0,
      width: a.width ?? null,
      height: a.height ?? null,
      durationSec: a.durationSec ?? null,
      posterUrl: a.posterUrl ?? null,
    };
  });
}

interface MessageBody {
  markdown?: string;
  replyToId?: string;
  attachments?: AttachmentIn[];
  linkPreviews?: { url: string; kind?: string; title?: string; description?: string; imageUrl?: string; siteName?: string; embedHtml?: string }[];
  clientMessageId?: string;
}

export function createMessage(c: ChannelRec, body: MessageBody): { rec: MsgRec; wire: ChatMessage & { clientMessageId?: string } } {
  if (typeof body.markdown !== 'string') throw badRequest('markdown must be a string');
  if (body.markdown.length > 8000) throw badRequest('markdown must be shorter than or equal to 8000 characters');
  const hasText = body.markdown.trim().length > 0;
  const atts = buildAttachments(body.attachments);
  if (!hasText && !atts) throw badRequest('Message must have text or at least one attachment.');
  if (body.replyToId) {
    const t = chatMessages().get(body.replyToId);
    if (!t || t.channelId !== c.id || t.deletedAt) throw badRequest('Reply target not found in this channel.');
  }
  const rec: MsgRec = {
    id: newMessageId(),
    channelId: c.id,
    authorId: meId(),
    kind: 'TEXT',
    createdAt: nowIso(),
    markdown: body.markdown,
  };
  if (body.replyToId) rec.replyToId = body.replyToId;
  if (body.linkPreviews?.length) {
    rec.metadata = {
      linkPreviews: body.linkPreviews.slice(0, 4).map((p) => ({ url: p.url, kind: (p.kind as 'link' | 'video' | 'gif') ?? 'link', title: p.title, description: p.description, imageUrl: p.imageUrl, siteName: p.siteName, embedHtml: p.embedHtml })),
    };
  }
  if (atts) rec.attachments = atts;
  addMessage(rec);
  pub.messageCreated(rec, body.clientMessageId);
  afterPersonaMessage(rec);
  return { rec, wire: { ...shapeMessage(rec), clientMessageId: body.clientMessageId } };
}

const byChannelId = (req: Req): ChannelAccess => {
  const a = accessForChannel(requireChannel(req.params.channelId!));
  assertInsider(a);
  return a;
};

const byProjectChannel = (req: Req): ChannelAccess => {
  const { project, access } = resolveProject(req.params.slugOrId!);
  assertProjectInsider(access);
  const c = requireChannel(req.params.channelId!);
  if (c.projectId !== project.id) throw notFound('Channel not found.');
  return accessForChannel(c);
};

function pinsOf(c: ChannelRec) {
  return chatPins()
    .where('channelId', c.id)
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((p) => {
      const m = chatMessages().get(p.messageId);
      const author = m ? userSummary(m.authorId) : null;
      const by = userSummary(p.pinnedById);
      return {
        ...p,
        message: m
          ? {
              id: m.id,
              channelId: m.channelId,
              authorId: m.authorId,
              kind: m.kind,
              markdown: m.deletedAt ? '' : m.markdown,
              metadata: m.deletedAt ? null : (m.metadata ?? null),
              createdAt: m.createdAt,
              editedAt: m.editedAt ?? null,
              deletedAt: m.deletedAt ?? null,
              replyToId: m.replyToId ?? null,
              forwardedFromId: m.forwardedFromId ?? null,
              author: { id: author!.id, name: author!.name, avatarUrl: author!.avatarUrl },
              attachments: (m.attachments ?? []).map((a) => ({ ...a, messageId: m.id, createdAt: m.createdAt })),
            }
          : null,
        pinnedBy: { id: by.id, name: by.name, avatarUrl: by.avatarUrl },
      };
    });
}

const classify = (mime: string): AttRec['kind'] =>
  /^image\//.test(mime) ? 'IMAGE' : /^video\//.test(mime) ? 'VIDEO' : /^audio\//.test(mime) ? 'AUDIO' : 'FILE';

function presignAttachment(c: ChannelRec, body: { contentType?: string; contentLength?: number; filename?: string }) {
  if (typeof body.filename !== 'string' || typeof body.contentType !== 'string') throw badRequest('filename and contentType are required.');
  if ((body.contentLength ?? 0) > 52_428_800) throw badRequest('Attachment exceeds the 52428800-byte limit.');
  const p = presign(`chat/${c.id}`, body.filename, body.contentType);
  return { ...p, kind: classify(body.contentType) };
}

for (const base of ['/chat/channels/:channelId', '/projects/:slugOrId/chat/channels/:channelId']) {
  const resolve = base.startsWith('/chat') ? byChannelId : byProjectChannel;
  get(`${base}/messages`, (req) => listMessages(resolve(req).channel, req.query));
  post(`${base}/messages`, (req) => createMessage(resolve(req).channel, requireBody(req)).wire);
  post(`${base}/read`, (req) => {
    const a = resolve(req);
    markRead(a.channel.id, meId(), (req.body as { lastReadMessageId?: string } | undefined)?.lastReadMessageId);
    return { ok: true };
  });
  get(`${base}/state`, (req) => {
    const a = resolve(req);
    const r = chatReads().get(readId(a.channel.id, meId()));
    return { lastReadMessageId: r?.lastReadMessageId ?? null, lastReadAt: r?.lastReadAt ?? null };
  });
  get(`${base}/pins`, (req) => pinsOf(resolve(req).channel));
  post(`${base}/attachments/presign`, (req) => presignAttachment(resolve(req).channel, requireBody(req)));
}

// ─── Message operations ───────────────────────────────────────────────

const accessForMessage = (id: string): { m: MsgRec; a: ChannelAccess } => {
  const m = messageOrThrow(id);
  const a = accessForChannel(requireChannel(m.channelId));
  assertInsider(a);
  return { m, a };
};

patch('/chat/messages/:id', (req) => {
  const { m } = accessForMessage(req.params.id!);
  const body = requireBody<{ markdown?: string }>(req);
  if (m.deletedAt) throw notFound('Message not found.');
  if (typeof body.markdown !== 'string' || !body.markdown.trim()) throw badRequest('markdown must not be empty');
  if (m.authorId !== meId()) throw forbidden('Only the author can edit a message.');
  if (Date.now() - new Date(m.createdAt).getTime() > 24 * 3_600_000) throw forbidden('Messages can only be edited within 24 hours of posting.');
  m.markdown = body.markdown;
  m.editedAt = nowIso();
  chatMessages().save(m);
  pub.messageEdited(m);
  return shapeMessage(m);
});

del('/chat/messages/:id', (req) => {
  const { m, a } = accessForMessage(req.params.id!);
  if (m.deletedAt) throw notFound('Message not found.');
  const isAuthor = m.authorId === meId();
  if (!isAuthor && !(me().isAdmin || a.access.isManager)) throw forbidden('You do not have permission to delete this message.');
  m.deletedAt = nowIso();
  m.deletedActor = isAuthor ? 'SELF' : 'MODERATOR';
  m.deletedById = meId();
  m.markdown = '';
  chatMessages().save(m);
  pub.messageDeleted(m);
  return shapeMessage(m);
});

post('/chat/messages/:id/reactions', (req) => {
  const { m } = accessForMessage(req.params.id!);
  const emoji = requireBody<{ emoji?: string }>(req).emoji;
  if (typeof emoji !== 'string' || !emoji || emoji.length > 32) throw badRequest('emoji is required');
  if (m.deletedAt) throw notFound('Message not found.');
  if (addReactionTo(m, emoji, meId())) {
    chatMessages().save(m);
    pub.reaction(true, m.channelId, m.id, meId(), emoji);
  }
  return { messageId: m.id, channelId: m.channelId, projectId: requireChannel(m.channelId).projectId, emoji, userId: meId() };
});

del('/chat/messages/:id/reactions/:emoji', (req) => {
  const { m } = accessForMessage(req.params.id!);
  const emoji = req.params.emoji!;
  const g = m.reactions?.find((r) => r[0] === emoji);
  if (g && g[1].includes(meId())) {
    g[1] = g[1].filter((x) => x !== meId());
    m.reactions = m.reactions!.filter((r) => r[1].length > 0);
    if (!m.reactions.length) delete m.reactions;
    chatMessages().save(m);
    pub.reaction(false, m.channelId, m.id, meId(), emoji);
  }
  return { messageId: m.id, channelId: m.channelId, projectId: requireChannel(m.channelId).projectId, emoji, userId: meId() };
});

post('/chat/messages/:id/pin', (req) => {
  const { m, a } = accessForMessage(req.params.id!);
  assertManager(a);
  if (m.deletedAt) throw notFound('Message not found.');
  const existing = chatPins().where('channelId', m.channelId);
  if (existing.some((p) => p.messageId === m.id)) throw conflict('Message is already pinned.');
  const note = typeof (req.body as { note?: string } | undefined)?.note === 'string' ? (req.body as { note: string }).note.trim() : '';
  const pinRec = chatPins().insert({
    id: newId('pin'),
    channelId: m.channelId,
    messageId: m.id,
    pinnedById: meId(),
    position: existing.reduce((mx, p) => Math.max(mx, p.position), -1) + 1,
    note: note || null,
    pinnedAt: nowIso(),
  });
  pub.pin(true, m.channelId, m.id, pinRec.note);
  return { pin: pinRec, channelId: m.channelId, projectId: a.channel.projectId, note: pinRec.note };
});

post('/chat/messages/:id/unpin', (req) => {
  const { m, a } = accessForMessage(req.params.id!);
  assertManager(a);
  const p = chatPins().where('messageId', m.id)[0];
  if (!p) throw notFound('Pin not found.');
  chatPins().remove(p.id);
  pub.pin(false, m.channelId, m.id);
  return { channelId: m.channelId, projectId: a.channel.projectId, messageId: m.id };
});

post('/chat/messages/:id/forward', (req) => {
  const { m } = accessForMessage(req.params.id!);
  const targetId = requireBody<{ targetChannelId?: string }>(req).targetChannelId;
  if (!targetId) throw badRequest('targetChannelId is required');
  if (m.deletedAt) throw notFound('Source message not found.');
  const target = requireChannel(targetId);
  const ta = accessForChannel(target);
  if (target.isArchived) throw forbidden('Cannot forward into an archived channel.');
  assertInsider(ta);
  const rec: MsgRec = {
    id: newMessageId(),
    channelId: target.id,
    authorId: meId(),
    kind: 'TEXT',
    createdAt: nowIso(),
    markdown: m.markdown,
    forwardedFromId: m.id,
  };
  if (m.attachments) rec.attachments = m.attachments.map((x) => ({ ...x, id: newAttachmentId() }));
  addMessage(rec);
  pub.messageCreated(rec);
  return shapeMessage(rec);
});

// ─── Search, previews, stickers ───────────────────────────────────────

get('/chat/search', (req) => runSearch(req.query));

post('/chat/link-preview', (req) => {
  const url = requireBody<{ url?: string }>(req).url;
  const pv = typeof url === 'string' ? previewFor(url) : null;
  if (!pv) throw badRequest('Could not resolve URL.');
  return pv;
});

get('/chat/stickers/packs', () =>
  chatPacks()
    .all()
    .filter((p) => !p.isArchived)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      stickers: chatStickers()
        .where('packId', p.id)
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ id: s.id, name: s.name, keywords: s.keywords, url: s.url, mime: s.mime, width: s.width, height: s.height })),
    })),
);

// ─── Notification quick reply (service worker path) ───────────────────

post('/notifications/:id/quick-reply', (req) => {
  const n = notifications().get(req.params.id!);
  if (!n || n.userId !== meId()) throw notFound('Notification not found.');
  if (n.type !== 'CHAT_MENTION') throw badRequest('Quick-reply is only available on chat mentions in this release.');
  const channelId = typeof n.metadata?.channelId === 'string' ? n.metadata.channelId : null;
  if (!channelId) throw badRequest('Notification is missing chat routing metadata.');
  const c = requireChannel(channelId);
  const a = accessForChannel(c);
  if (!a.access.isInsider) throw forbidden('You no longer have access to this chat.');
  const text = requireBody<{ text?: string }>(req).text;
  if (typeof text !== 'string' || !text.trim()) throw badRequest('text must not be empty');
  const { rec } = createMessage(c, { markdown: text });
  n.readAt = n.readAt ?? nowIso();
  notifications().save(n);
  return { ok: true, messageId: rec.id, channelId, projectId: c.projectId, link: n.link ?? (c.projectId ? `/projects/${c.projectId}/chat/${channelId}` : `/chat/global/${channelId}`) };
});

void scopeOf;
