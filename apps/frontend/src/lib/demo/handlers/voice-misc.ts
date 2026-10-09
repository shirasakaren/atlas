/**
 * Voice: per-user preferences, soundboard library, call recordings.
 */
import { tbl, type Rec } from '../db';
import { badRequest, del, forbidden, get, notFound, patch, post } from '../http';
import { ME_ID } from '../config';
import { me, userSummary } from '../access';
import { newId } from '../prng';
import { nowIso } from '../clock';
import { presign, resolveBlobUrl } from '../blobs';
import { requireAdminGuard } from './admin-rbac';
import { channelById, pushChannelEvent, voiceBus } from './voice-sim';
import { channelAccess } from './voice-channels';
import { recordingSample } from './voice-audio';
import { accessFor, assertManager } from '../access';
import { projects } from '../store';

// ─── Preferences ───────────────────────────────────────────────────────

export interface PrefsRec extends Rec {
  userId: string;
  inputMode: 'VOICE_ACTIVITY' | 'PUSH_TO_TALK';
  pttKey: string | null;
  pttReleaseMs: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  micDeviceId: string | null;
  cameraDeviceId: string | null;
  outputDeviceId: string | null;
  mirrorSelfView: boolean;
  micVolume: number;
  outputVolume: number;
  shortcutMute: string | null;
  shortcutDeafen: string | null;
  shortcutDisconnect: string | null;
  soundsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const prefsTbl = () => tbl<PrefsRec>('voicePrefs');

function prefsFor(userId: string): PrefsRec {
  const cur = prefsTbl().get(`vpref_${userId}`);
  if (cur) return cur;
  const now = nowIso();
  return prefsTbl().insert({
    id: `vpref_${userId}`,
    userId,
    inputMode: 'VOICE_ACTIVITY',
    pttKey: null,
    pttReleaseMs: 150,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    micDeviceId: null,
    cameraDeviceId: null,
    outputDeviceId: null,
    mirrorSelfView: true,
    micVolume: 100,
    outputVolume: 100,
    shortcutMute: null,
    shortcutDeafen: null,
    shortcutDisconnect: null,
    soundsEnabled: true,
    createdAt: now,
    updatedAt: now,
  });
}

const BOOLS = ['noiseSuppression', 'echoCancellation', 'autoGainControl', 'mirrorSelfView', 'soundsEnabled'] as const;
const NULLABLE_STR = [
  ['pttKey', 32],
  ['micDeviceId', 256],
  ['cameraDeviceId', 256],
  ['outputDeviceId', 256],
  ['shortcutMute', 64],
  ['shortcutDeafen', 64],
  ['shortcutDisconnect', 64],
] as const;

get('/voice/me/preferences', () => prefsFor(ME_ID));

patch('/voice/me/preferences', (req) => {
  const b = req.body ?? {};
  const rec = prefsFor(ME_ID);
  if (b.inputMode !== undefined) {
    if (b.inputMode !== 'VOICE_ACTIVITY' && b.inputMode !== 'PUSH_TO_TALK') {
      throw badRequest('inputMode must be one of the following values: VOICE_ACTIVITY, PUSH_TO_TALK');
    }
    rec.inputMode = b.inputMode;
  }
  for (const k of BOOLS) {
    if (b[k] === undefined) continue;
    if (typeof b[k] !== 'boolean') throw badRequest(`${k} must be a boolean value`);
    rec[k] = b[k];
  }
  for (const [k, max] of NULLABLE_STR) {
    if (b[k] === undefined) continue;
    if (b[k] !== null && (typeof b[k] !== 'string' || b[k].length > max)) {
      throw badRequest(`${k} must be shorter than or equal to ${max} characters`);
    }
    rec[k] = b[k] || null;
  }
  const ranges: [keyof PrefsRec, number, number][] = [
    ['pttReleaseMs', 0, 2000],
    ['micVolume', 0, 200],
    ['outputVolume', 0, 200],
  ];
  for (const [k, lo, hi] of ranges) {
    if (b[k] === undefined) continue;
    if (!Number.isInteger(b[k]) || b[k] < lo || b[k] > hi) {
      throw badRequest(`${k} must not be ${b[k] < lo ? 'less' : 'greater'} than ${b[k] < lo ? lo : hi}`);
    }
    (rec as any)[k] = b[k];
  }
  rec.updatedAt = nowIso();
  return prefsTbl().save(rec);
});

// ─── Soundboard ────────────────────────────────────────────────────────

export interface ClipRec extends Rec {
  name: string;
  url: string;
  s3Key: string | null;
  durationMs: number;
  createdAt: string;
  uploadedById: string;
}

export const clipsTbl = () => tbl<ClipRec>('voiceSoundboard');

function clipOut(c: ClipRec) {
  return {
    id: c.id,
    name: c.name,
    url: c.url,
    durationMs: c.durationMs,
    createdAt: c.createdAt,
    uploadedById: c.uploadedById,
    uploadedBy: userSummary(c.uploadedById),
  };
}

const CLIP_MIME = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/mp4'];

get('/voice/soundboard/clips', () => ({
  items: clipsTbl()
    .all()
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(clipOut),
}));

post('/voice/soundboard/clips/presign', (req) => {
  requireAdminGuard();
  const b = req.body ?? {};
  const name = typeof b.name === 'string' ? b.name : '';
  if (!name || name.length > 64 || !/^[a-zA-Z0-9][a-zA-Z0-9 \-_]*$/.test(name)) {
    throw badRequest('Name may only contain letters, numbers, spaces, hyphens and underscores.');
  }
  if (!CLIP_MIME.includes(b.contentType)) throw badRequest('contentType must be one of the allowed audio types');
  if (!Number.isInteger(b.contentLength) || b.contentLength < 1 || b.contentLength > 10 * 1024 * 1024) {
    throw badRequest('contentLength must not be greater than 10485760');
  }
  const p = presign('voice-soundboard', `${name}.audio`, b.contentType);
  return { uploadUrl: p.uploadUrl, expiresIn: p.expiresIn, s3Key: p.s3Key, publicUrl: p.publicUrl };
});

post('/voice/soundboard/clips', (req) => {
  requireAdminGuard();
  const b = req.body ?? {};
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name || name.length > 64) throw badRequest('name must be shorter than or equal to 64 characters');
  if (typeof b.s3Key !== 'string' || b.s3Key.length < 8) throw badRequest('s3Key must be longer than or equal to 8 characters');
  if (!Number.isInteger(b.durationMs) || b.durationMs < 1 || b.durationMs > 30000) {
    throw badRequest('durationMs must not be greater than 30000');
  }
  const rec: ClipRec = {
    id: newId('clip'),
    name,
    s3Key: b.s3Key,
    url: resolveBlobUrl(b.s3Key, name),
    durationMs: b.durationMs,
    createdAt: nowIso(),
    uploadedById: me().id,
  };
  clipsTbl().insert(rec);
  return clipOut(rec);
});

del('/voice/soundboard/clips/:id', (req) => {
  requireAdminGuard();
  if (!clipsTbl().remove(req.params.id!)) throw notFound('Soundboard clip not found.');
  return { ok: true };
});

// ─── Recordings ────────────────────────────────────────────────────────

export interface RecordingRec extends Rec {
  channelId: string;
  startedByUserId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  endedAt: string | null;
  s3Key: string | null;
  durationSec: number | null;
  sizeBytes: number | null;
  retentionUntil: string | null;
  errorMessage: string | null;
}

export const recordingsTbl = () => tbl<RecordingRec>('voiceRecordings');

const activeRecording = (channelId: string) =>
  recordingsTbl().where('channelId', channelId).find((r) => r.status === 'RUNNING' || r.status === 'PENDING');

function recOut(r: RecordingRec) {
  return { ...r, startedBy: userSummary(r.startedByUserId) };
}

function assertCanRecord(channelId: string) {
  const c = channelById(channelId);
  if (!c) throw notFound('Voice channel not found.');
  if (c.archivedAt) throw forbidden('This voice channel is archived.');
  if (c.projectId) {
    const p = projects().get(c.projectId);
    if (!p) throw notFound('Project not found.');
    assertManager(accessFor(p));
  } else if (!me().isAdmin) {
    throw forbidden('Admin role required for lobby recordings.');
  }
  return c;
}

post('/voice/channels/:channelId/recording/start', (req) => {
  const c = assertCanRecord(req.params.channelId!);
  if (activeRecording(c.id)) throw badRequest('A recording is already in progress for this channel.');
  const now = nowIso();
  const rec: RecordingRec = {
    id: newId('rec'),
    channelId: c.id,
    startedByUserId: ME_ID,
    status: 'RUNNING',
    startedAt: now,
    endedAt: null,
    s3Key: `voice-recordings/${c.id}/${now.slice(0, 10)}.ogg`,
    durationSec: null,
    sizeBytes: null,
    retentionUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    errorMessage: null,
  };
  recordingsTbl().insert(rec);
  pushChannelEvent(c, 'voice.recording.started', {
    channelId: c.id,
    recordingId: rec.id,
    startedByUserId: ME_ID,
    startedByName: me().name,
  });
  voiceBus.emit({ type: 'recording', channelId: c.id, active: true });
  return recOut(rec);
});

post('/voice/channels/:channelId/recording/stop', (req) => {
  const c = assertCanRecord(req.params.channelId!);
  const rec = activeRecording(c.id);
  if (!rec) throw badRequest('No active recording for this channel.');
  const secs = Math.max(6, Math.round((Date.now() - new Date(rec.startedAt).getTime()) / 1000));
  rec.status = 'COMPLETED';
  rec.endedAt = nowIso();
  rec.durationSec = secs;
  rec.sizeBytes = secs * 15_800;
  recordingsTbl().save(rec);
  pushChannelEvent(c, 'voice.recording.stopped', { channelId: c.id, recordingId: rec.id, status: 'COMPLETED' });
  voiceBus.emit({ type: 'recording', channelId: c.id, active: false });
  return { ok: true, recordingId: rec.id };
});

get('/voice/channels/:channelId/recordings', (req) => {
  const c = channelById(req.params.channelId!);
  if (!c) throw notFound('Voice channel not found.');
  channelAccess(c);
  const items = recordingsTbl()
    .where('channelId', c.id)
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map(recOut);
  return { items };
});

get('/voice/recordings/:id/download', (req) => {
  const rec = recordingsTbl().get(req.params.id!);
  if (!rec) throw notFound('Recording not found.');
  const c = channelById(rec.channelId);
  if (c) channelAccess(c);
  if (rec.status !== 'COMPLETED') throw badRequest('Recording is not ready for download.');
  if (rec.retentionUntil && new Date(rec.retentionUntil) < new Date()) {
    throw forbidden('Recording is past its retention window.');
  }
  const bytes = recordingSample(8);
  let url: string;
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof Blob !== 'undefined') {
    url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/wav' }));
  } else {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    url = `data:audio/wav;base64,${btoa(bin)}`;
  }
  return { downloadUrl: url, expiresIn: 300 };
});
