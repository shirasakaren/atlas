/**
 * Voice moderation (mute/kick/move) and stage channels (hand raise queue,
 * promote/demote). Mirrors the backend moderation + stage controllers.
 */
import { badRequest, forbidden, get, notFound, post } from '../http';
import { ME_ID } from '../config';
import { me, accessFor, assertManager, userSummary } from '../access';
import { projects, users } from '../store';
import { nowIso } from '../clock';
import {
  addPresence,
  channelById,
  livePresence,
  presenceOf,
  pushChannelEvent,
  pushToUser,
  removePresence,
  touchPresence,
  type VoiceChannelRec,
} from './voice-sim';
import { channelAccess } from './voice-channels';

function requireOpen(id: string): VoiceChannelRec {
  const c = channelById(id);
  if (!c) throw notFound('Voice channel not found.');
  if (c.archivedAt) throw forbidden('This voice channel is archived.');
  return c;
}

function assertCanModerate(c: VoiceChannelRec): void {
  if (c.projectId) {
    const p = projects().get(c.projectId);
    if (!p) throw notFound('Project not found.');
    assertManager(accessFor(p));
  } else if (!me().isAdmin) {
    throw forbidden('Admin role required to moderate lobby channels.');
  }
}

function isModerator(c: VoiceChannelRec): boolean {
  try {
    assertCanModerate(c);
    return true;
  } catch {
    return false;
  }
}

function targetOf(body: any): string {
  const id = body?.participantUserId;
  if (typeof id !== 'string' || !id) throw badRequest('participantUserId must be a string');
  return id;
}

post('/voice/channels/:channelId/moderate/mute', (req) => {
  const c = requireOpen(req.params.channelId!);
  assertCanModerate(c);
  const target = targetOf(req.body);
  if (target === ME_ID) throw forbidden('Use the mic button to mute yourself.');
  const muted = req.body?.muted ?? true;
  const p = presenceOf(c.id, target);
  if (!p) throw notFound('That user is not currently in this voice channel.');
  p.mutedByMod = muted === true;
  touchPresence(c, p);
  pushChannelEvent(c, 'voice.moderation.mute', { channelId: c.id, targetUserId: target, muted: p.mutedByMod, byUserId: ME_ID });
  return { ok: true, targetUserId: target, muted: p.mutedByMod };
});

post('/voice/channels/:channelId/moderate/kick', (req) => {
  const c = requireOpen(req.params.channelId!);
  assertCanModerate(c);
  const target = targetOf(req.body);
  if (target === ME_ID) throw forbidden('Use the leave button to leave a channel yourself.');
  removePresence(c, target, 'kick');
  pushChannelEvent(c, 'voice.moderation.kick', {
    channelId: c.id,
    targetUserId: target,
    byUserId: ME_ID,
    reason: req.body?.reason ?? null,
  });
  return { ok: true, targetUserId: target };
});

post('/voice/channels/:channelId/moderate/move', (req) => {
  const source = requireOpen(req.params.channelId!);
  assertCanModerate(source);
  const target = targetOf(req.body);
  if (target === ME_ID) throw forbidden('Switch channels yourself by clicking the destination.');
  const dest = requireOpen(String(req.body?.targetChannelId ?? ''));
  if (!users().get(target)) throw notFound('Target user not found.');
  if (source.id === dest.id) throw badRequest('Target channel must be different from source.');
  if (source.projectId !== dest.projectId) {
    throw forbidden('Move target must be in the same project (or both must be lobby channels).');
  }
  if (dest.userLimit && livePresence(dest.id).length >= dest.userLimit) throw badRequest('Target channel is full.');
  const prev = presenceOf(source.id, target);
  removePresence(source, target, 'move');
  addPresence(dest, target, {
    sim: prev?.sim ?? true,
    role: dest.kind === 'STAGE' ? 'AUDIENCE' : 'SPEAKER',
    micOff: prev?.micOff,
  });
  pushChannelEvent(source, 'voice.moderation.move', { channelId: source.id, targetUserId: target, targetChannelId: dest.id, byUserId: ME_ID });
  return { ok: true, targetUserId: target, targetChannelId: dest.id };
});

// ─── Stage ─────────────────────────────────────────────────────────────

function requireStage(id: string): VoiceChannelRec {
  const c = requireOpen(id);
  if (c.kind !== 'STAGE') throw badRequest('This action is only for stage channels.');
  return c;
}

post('/voice/channels/:channelId/hand/raise', (req) => {
  const c = requireStage(req.params.channelId!);
  channelAccess(c);
  const p = presenceOf(c.id, ME_ID);
  if (!p) throw badRequest('You must be in the channel to raise your hand.');
  if (p.role === 'SPEAKER') throw badRequest("You're already a speaker.");
  if (p.handRaisedAt) return { ok: true, handRaisedAt: p.handRaisedAt };
  p.handRaisedAt = nowIso();
  touchPresence(c, p);
  pushChannelEvent(c, 'voice.stage.hand.raised', { channelId: c.id, userId: ME_ID, handRaisedAt: p.handRaisedAt });
  scheduleAutoPromote(c.id);
  return { ok: true, handRaisedAt: p.handRaisedAt };
});

post('/voice/channels/:channelId/hand/lower', (req) => {
  const c = requireStage(req.params.channelId!);
  const targetId: string = req.body?.targetUserId ?? ME_ID;
  if (targetId !== ME_ID && !isModerator(c)) throw forbidden("Only moderators can lower other people's hands.");
  channelAccess(c);
  const p = presenceOf(c.id, targetId);
  if (!p) throw notFound('That user is not currently in this channel.');
  if (!p.handRaisedAt) return { ok: true };
  p.handRaisedAt = null;
  touchPresence(c, p);
  pushChannelEvent(c, 'voice.stage.hand.lowered', { channelId: c.id, userId: targetId, byUserId: ME_ID });
  return { ok: true };
});

get('/voice/channels/:channelId/hand/queue', (req) => {
  const c = requireOpen(req.params.channelId!);
  channelAccess(c);
  const items = livePresence(c.id)
    .filter((p) => p.handRaisedAt && p.role === 'AUDIENCE')
    .slice()
    .sort((a, b) => a.handRaisedAt!.localeCompare(b.handRaisedAt!))
    .map((p) => ({ userId: p.userId, handRaisedAt: p.handRaisedAt!, user: userSummary(p.userId) }));
  return { items };
});

function promote(c: VoiceChannelRec, userId: string): void {
  const p = presenceOf(c.id, userId);
  if (!p) throw notFound('That user is not currently in this channel.');
  if (p.role === 'SPEAKER') throw badRequest('That user is already a speaker.');
  p.role = 'SPEAKER';
  p.handRaisedAt = null;
  p.micOff = false;
  touchPresence(c, p);
  pushChannelEvent(c, 'voice.stage.promoted', { channelId: c.id, targetUserId: userId, byUserId: ME_ID });
  pushToUser(userId, 'voice.stage.you.promoted', { channelId: c.id });
}

post('/voice/channels/:channelId/stage/promote', (req) => {
  const c = requireStage(req.params.channelId!);
  assertCanModerate(c);
  promote(c, targetOf(req.body));
  return { ok: true };
});

post('/voice/channels/:channelId/stage/demote', (req) => {
  const c = requireStage(req.params.channelId!);
  assertCanModerate(c);
  const userId = targetOf(req.body);
  const p = presenceOf(c.id, userId);
  if (!p) throw notFound('That user is not currently in this channel.');
  if (p.role === 'AUDIENCE') throw badRequest('That user is already in the audience.');
  p.role = 'AUDIENCE';
  touchPresence(c, p);
  pushChannelEvent(c, 'voice.stage.demoted', { channelId: c.id, targetUserId: userId, byUserId: ME_ID });
  pushToUser(userId, 'voice.stage.you.demoted', { channelId: c.id });
  return { ok: true };
});

/**
 * When the visitor is an audience member and raises their hand, a (simulated)
 * moderator lets them speak after a few seconds, like a real town hall.
 */
function scheduleAutoPromote(channelId: string): void {
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    const c = channelById(channelId);
    const p = c && presenceOf(channelId, ME_ID);
    if (c && p && p.role === 'AUDIENCE' && p.handRaisedAt) promote(c, ME_ID);
  }, 6000 + Math.random() * 3000);
}
