/**
 * Voice channels: per-project + workspace lobby CRUD, join/leave, and the
 * paired text-thread lookup. Mirrors apps/backend/src/modules/voice
 * (controllers: channels, lobby, join).
 */
import { badRequest, conflict, del, forbidden, get, notFound, patch, post } from '../http';
import { ME_ID } from '../config';
import { me, accessFor, assertInsider, assertManager, resolveProject } from '../access';
import { projects } from '../store';
import { tableNames, tbl } from '../db';
import { userSummary } from '../access';
import { mintDemoToken, LIVEKIT_DEMO_URL } from './voice-token';
import { nowIso } from '../clock';
import { newId } from '../prng';
import { requireAdminGuard } from './admin-rbac';
import {
  addPresence,
  channelById,
  channelOfUser,
  channelsTbl,
  pushListEvent,
  removePresence,
  rosterOf,
  threadIdFor,
  livePresence,
  type VoiceChannelRec,
} from './voice-sim';

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9 \-_]*$/;
const NAME_MSG = 'Channel name may only contain letters, numbers, spaces, hyphens, and underscores.';

/** `publicSelect` projection. */
export function publicChannel(c: VoiceChannelRec) {
  return {
    id: c.id,
    projectId: c.projectId,
    name: c.name,
    topic: c.topic,
    userLimit: c.userLimit,
    audioQuality: c.audioQuality,
    kind: c.kind,
    isDefault: c.isDefault,
    sortIndex: c.sortIndex,
    permissions: c.permissions,
    textThreadId: c.textThreadId,
    createdById: c.createdById,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    archivedAt: c.archivedAt,
  };
}

function sortChannels(list: VoiceChannelRec[]): VoiceChannelRec[] {
  return list
    .slice()
    .sort(
      (a, b) =>
        Number(b.isDefault) - Number(a.isDefault) ||
        a.sortIndex - b.sortIndex ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.name.localeCompare(b.name),
    );
}

function withRoster(c: VoiceChannelRec) {
  return { ...publicChannel(c), participants: rosterOf(c.id) };
}

function requireChannel(id: string): VoiceChannelRec {
  const c = channelById(id);
  if (!c) throw notFound('Voice channel not found.');
  return c;
}

function validateCreate(body: any) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('name must be longer than or equal to 1 characters');
  if (name.length > 64) throw badRequest('name must be shorter than or equal to 64 characters');
  if (!NAME_RE.test(body.name)) throw badRequest(NAME_MSG);
  if (body.topic !== undefined && (typeof body.topic !== 'string' || body.topic.length > 200)) {
    throw badRequest('topic must be shorter than or equal to 200 characters');
  }
  if (body.userLimit !== undefined && (!Number.isInteger(body.userLimit) || body.userLimit < 0 || body.userLimit > 100)) {
    throw badRequest('userLimit must not be greater than 100');
  }
  if (body.audioQuality !== undefined && !['LOW', 'STANDARD', 'HIGH'].includes(body.audioQuality)) {
    throw badRequest('audioQuality must be one of the following values: LOW, STANDARD, HIGH');
  }
  if (body.kind !== undefined && !['STANDARD', 'STAGE'].includes(body.kind)) {
    throw badRequest('kind must be one of the following values: STANDARD, STAGE');
  }
  return name;
}

function createChannel(projectId: string | null, body: any): VoiceChannelRec {
  const name = validateCreate(body);
  const dupe = channelsTbl()
    .all()
    .some((c) => c.projectId === projectId && !c.archivedAt && c.name.toLowerCase() === name.toLowerCase());
  if (dupe) throw conflict(`A voice channel named "${name}" already exists here.`);
  const now = nowIso();
  const rec: VoiceChannelRec = {
    id: newId('vc'),
    projectId,
    name,
    topic: typeof body.topic === 'string' && body.topic.trim() ? body.topic.trim() : null,
    userLimit: body.userLimit && body.userLimit > 0 ? body.userLimit : null,
    audioQuality: body.audioQuality ?? 'STANDARD',
    kind: body.kind ?? 'STANDARD',
    isDefault: false,
    sortIndex: 0,
    permissions: {},
    textThreadId: null,
    createdById: ME_ID,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  channelsTbl().insert(rec);
  ensureThread(rec);
  return rec;
}

function updateChannel(c: VoiceChannelRec, body: any): VoiceChannelRec {
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name || name.length > 64 || !NAME_RE.test(name)) throw badRequest(NAME_MSG);
    if (c.isDefault && name !== c.name) throw forbidden('The default voice channel cannot be renamed.');
    c.name = name;
  }
  if (body?.topic !== undefined) {
    if (typeof body.topic !== 'string' || body.topic.length > 200) {
      throw badRequest('topic must be shorter than or equal to 200 characters');
    }
    c.topic = body.topic.trim() || null;
  }
  if (body?.userLimit !== undefined) {
    if (!Number.isInteger(body.userLimit) || body.userLimit < 0 || body.userLimit > 100) {
      throw badRequest('userLimit must not be greater than 100');
    }
    c.userLimit = body.userLimit > 0 ? body.userLimit : null;
  }
  if (body?.audioQuality !== undefined) {
    if (!['LOW', 'STANDARD', 'HIGH'].includes(body.audioQuality)) {
      throw badRequest('audioQuality must be one of the following values: LOW, STANDARD, HIGH');
    }
    c.audioQuality = body.audioQuality;
  }
  c.updatedAt = nowIso();
  return channelsTbl().save(c);
}

function archiveChannel(c: VoiceChannelRec) {
  if (c.isDefault) throw forbidden('The default voice channel cannot be archived.');
  if (c.archivedAt) return publicChannel(c);
  c.archivedAt = nowIso();
  c.updatedAt = c.archivedAt;
  channelsTbl().save(c);
  for (const p of livePresence(c.id).slice()) removePresence(c, p.userId, 'kick');
  return publicChannel(c);
}

// ─── Per-project channels ──────────────────────────────────────────────

get('/projects/:slugOrId/voice/channels', (req) => {
  const { project, access } = resolveProject(req.params.slugOrId!);
  assertInsider(access);
  const items = sortChannels(channelsTbl().where('projectId', project.id).filter((c) => !c.archivedAt));
  return { items: items.map(withRoster) };
});

post('/projects/:slugOrId/voice/channels', (req) => {
  const { project, access } = resolveProject(req.params.slugOrId!);
  assertManager(access);
  const rec = createChannel(project.id, req.body);
  pushListEvent(rec, 'voice.channel.created', publicChannel(rec));
  return publicChannel(rec);
});

patch('/projects/:slugOrId/voice/channels/:channelId', (req) => {
  const { access } = resolveProject(req.params.slugOrId!);
  assertManager(access);
  const c = requireChannel(req.params.channelId!);
  updateChannel(c, req.body);
  pushListEvent(c, 'voice.channel.updated', publicChannel(c));
  return publicChannel(c);
});

del('/projects/:slugOrId/voice/channels/:channelId', (req) => {
  const { access, project } = resolveProject(req.params.slugOrId!);
  assertManager(access);
  const c = requireChannel(req.params.channelId!);
  const out = archiveChannel(c);
  pushListEvent(c, 'voice.channel.archived', { channelId: c.id, projectId: project.id });
  return out;
});

// ─── Workspace lobby ───────────────────────────────────────────────────

get('/voice/lobby/channels', () => {
  const items = sortChannels(channelsTbl().where('projectId', null).filter((c) => !c.archivedAt));
  return { items: items.map(withRoster) };
});

post('/voice/lobby/channels', (req) => {
  requireAdminGuard();
  const rec = createChannel(null, req.body);
  pushListEvent(rec, 'voice.channel.created', publicChannel(rec));
  return publicChannel(rec);
});

patch('/voice/lobby/channels/:channelId', (req) => {
  requireAdminGuard();
  const c = requireChannel(req.params.channelId!);
  updateChannel(c, req.body);
  pushListEvent(c, 'voice.channel.updated', publicChannel(c));
  return publicChannel(c);
});

del('/voice/lobby/channels/:channelId', (req) => {
  requireAdminGuard();
  const c = requireChannel(req.params.channelId!);
  const out = archiveChannel(c);
  pushListEvent(c, 'voice.channel.archived', { channelId: c.id, projectId: null });
  return out;
});

// ─── Join / leave / thread ─────────────────────────────────────────────

/** Access gate shared by join/thread/recordings/hand queue: insider for project channels, open for lobby. */
export function channelAccess(c: VoiceChannelRec) {
  if (!c.projectId) return { canModerate: me().isAdmin, isInsider: true };
  const project = projects().get(c.projectId);
  if (!project) throw notFound('Project not found.');
  const access = accessFor(project);
  assertInsider(access);
  return { canModerate: access.isManager, isInsider: access.isInsider };
}


/**
 * Paired text thread (a chat channel flagged `isVoiceThread`). The chat domain
 * owns `chatChannels`; look it up defensively and only create a row when that
 * table exists, otherwise just hand back the stable fake id.
 */
export function ensureThread(c: VoiceChannelRec): string {
  const id = threadIdFor(c.id);
  if (c.textThreadId !== id) {
    c.textThreadId = id;
    channelsTbl().save(c);
  }
  try {
    if (tableNames().includes('chatChannels')) {
      const t = tbl<any>('chatChannels');
      if (!t.get(id)) {
        const now = nowIso();
        t.insert({
          id,
          projectId: c.projectId,
          name: `voice:${c.id}`,
          slug: `voice-${c.id.slice(0, 8)}`,
          topic: null,
          isGeneral: false,
          isArchived: false,
          isVoiceThread: true,
          voiceChannelId: c.id,
          createdById: c.createdById,
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
        });
      }
    }
  } catch {
    /* chat domain not ready: the fake id is enough */
  }
  return id;
}

post('/voice/channels/:channelId/join', (req) => {
  const c = requireChannel(req.params.channelId!);
  if (c.archivedAt) throw forbidden('This voice channel is archived.');
  const { canModerate } = channelAccess(c);
  const live = livePresence(c.id);
  const already = live.find((p) => p.userId === ME_ID);
  if (c.userLimit && !already && live.length >= c.userLimit) throw conflict('This voice channel is full.');
  // Single-room invariant.
  const prev = channelOfUser(ME_ID);
  if (prev) {
    const pc = channelById(prev);
    if (pc) removePresence(pc, ME_ID, 'leave');
  }
  const role = c.kind === 'STAGE' && !canModerate ? 'AUDIENCE' : 'SPEAKER';
  const p = addPresence(c, ME_ID, { role, sim: false });
  const u = me();
  const sum = userSummary(ME_ID);
  return {
    url: LIVEKIT_DEMO_URL,
    token: mintDemoToken({
      channelId: c.id,
      identity: ME_ID,
      name: u.name,
      avatarUrl: sum.avatarUrl,
      role,
      kind: c.kind,
    }),
    roomName: `voice:${c.id}`,
    participant: {
      id: p.id,
      channelId: c.id,
      userId: ME_ID,
      joinedAt: p.joinedAt,
      mutedByMod: false,
      role: p.role,
      handRaisedAt: null,
    },
    channel: { id: c.id, name: c.name, audioQuality: c.audioQuality, kind: c.kind },
  };
});

post('/voice/channels/:channelId/leave', (req) => {
  const c = requireChannel(req.params.channelId!);
  return { left: removePresence(c, ME_ID, 'leave') };
});

get('/voice/channels/:channelId/thread', (req) => {
  const c = requireChannel(req.params.channelId!);
  if (c.archivedAt) throw forbidden('This voice channel is archived.');
  channelAccess(c);
  const id = ensureThread(c);
  const slug = c.projectId ? (projects().get(c.projectId)?.slug ?? null) : null;
  return { chatChannelId: id, projectId: c.projectId, projectSlug: slug };
});
