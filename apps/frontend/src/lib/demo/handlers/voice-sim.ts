/**
 * Voice core: channel table, live presence (who is in which channel), the
 * `/voice` socket simulation, and the ambient "office" that makes rooms feel
 * alive (colleagues drifting in and out, raising their hand on stage...).
 *
 * Presence is deliberately EPHEMERAL (module memory, re-seeded on every load):
 * persisting "who is in a call right now" in the visitor's overlay would show
 * stale rosters after a refresh. Channels, preferences, soundboard clips and
 * recordings are normal tables and persist.
 *
 * The LiveKit stand-in (`../livekit-mock.ts`) subscribes to `voiceBus` so the
 * room the visitor is in reflects the same roster.
 */
import { tbl, type Rec } from '../db';
import { ME_ID } from '../config';
import { createRng, hashString } from '../prng';
import { nowIso } from '../clock';
import { users, members, projects } from '../store';
import { userSummary } from '../access';
import {
  joinRoom,
  leaveRoom,
  onClientEmit,
  onSocketConnect,
  pushToClients,
  type DemoSocket,
} from '../realtime';

/** Ambient simulation jitter (who joins/leaves next); not security-relevant, so the demo PRNG is plenty. */
const ambient = createRng(Date.now());
function rand(): number {
  return ambient.next();
}

export type VoiceKind = 'STANDARD' | 'STAGE';
export type VoiceRole = 'SPEAKER' | 'AUDIENCE';
export type ScreenScene = 'dashboard' | 'slides' | 'code';

export interface VoiceChannelRec extends Rec {
  projectId: string | null;
  name: string;
  topic: string | null;
  userLimit: number | null;
  audioQuality: 'LOW' | 'STANDARD' | 'HIGH';
  kind: VoiceKind;
  isDefault: boolean;
  sortIndex: number;
  permissions: Record<string, unknown>;
  textThreadId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface Presence {
  id: string;
  channelId: string;
  userId: string;
  joinedAt: string;
  mutedByMod: boolean;
  role: VoiceRole;
  handRaisedAt: string | null;
  /** Simulated colleague (vs the visitor). */
  sim: boolean;
  /** Mic closed by the participant themselves (sims only). */
  micOff: boolean;
  camera: boolean;
  screen: ScreenScene | null;
}

export const channelsTbl = () => tbl<VoiceChannelRec>('voiceChannels');

// ─── Presence store ────────────────────────────────────────────────────

const presence = new Map<string, Presence[]>();
let presenceSeq = 0;

export function nextPresenceId(): string {
  return `vpart_${String(++presenceSeq).padStart(5, '0')}`;
}

export function livePresence(channelId: string): readonly Presence[] {
  return presence.get(channelId) ?? [];
}

export function presenceOf(channelId: string, userId: string): Presence | undefined {
  return livePresence(channelId).find((p) => p.userId === userId);
}

/** The channel a user is currently in (single-room invariant), if any. */
export function channelOfUser(userId: string): string | null {
  for (const [cid, list] of presence) if (list.some((p) => p.userId === userId)) return cid;
  return null;
}

export function seedPresence(p: Presence): void {
  const list = presence.get(p.channelId) ?? [];
  list.push(p);
  presence.set(p.channelId, list);
}

/** Wipe live state (seeders run once per load, but keep the harness re-entrant). */
export function resetPresence(): void {
  presence.clear();
  presenceSeq = 0;
}

export function rosterOf(channelId: string) {
  return livePresence(channelId)
    .slice()
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    .map((p) => ({
      id: p.id,
      userId: p.userId,
      joinedAt: p.joinedAt,
      mutedByMod: p.mutedByMod,
      role: p.role,
      handRaisedAt: p.handRaisedAt,
      user: userSummary(p.userId),
    }));
}

// ─── Event bus (consumed by the LiveKit mock) ──────────────────────────

export type VoiceBusEvent =
  | { type: 'joined'; channelId: string; p: Presence }
  | { type: 'left'; channelId: string; userId: string; reason?: 'kick' | 'leave' | 'move' }
  | { type: 'updated'; channelId: string; p: Presence }
  | { type: 'recording'; channelId: string; active: boolean };

type Listener = (e: VoiceBusEvent) => void;
const listeners = new Set<Listener>();

export const voiceBus = {
  on(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit(e: VoiceBusEvent) {
    for (const l of Array.from(listeners)) {
      try {
        l(e);
      } catch {
        /* a broken subscriber must not stop the sim */
      }
    }
  },
};

// ─── Realtime fan-out ──────────────────────────────────────────────────

function listRoom(channel: VoiceChannelRec): string {
  return channel.projectId ? `project:${channel.projectId}` : 'voice-lobby';
}

export function pushRoster(channel: VoiceChannelRec): void {
  pushToClients('/voice', 'voice.roster.update', { channelId: channel.id }, { room: listRoom(channel) });
}

export function pushChannelEvent(channel: VoiceChannelRec, event: string, payload: unknown): void {
  pushToClients('/voice', event, payload, { room: `channel:${channel.id}` });
}

export function pushListEvent(channel: VoiceChannelRec, event: string, payload: unknown): void {
  pushToClients('/voice', event, payload, { room: listRoom(channel) });
}

export function pushToUser(userId: string, event: string, payload: unknown): void {
  pushToClients('/voice', event, payload, { room: `user:${userId}` });
}

// ─── Presence mutations (used by REST handlers and the ambient sim) ────

export function addPresence(
  channel: VoiceChannelRec,
  userId: string,
  opts: Partial<Pick<Presence, 'role' | 'micOff' | 'camera' | 'screen' | 'sim'>> = {},
): Presence {
  const p: Presence = {
    id: nextPresenceId(),
    channelId: channel.id,
    userId,
    joinedAt: nowIso(),
    mutedByMod: false,
    role: opts.role ?? 'SPEAKER',
    handRaisedAt: null,
    sim: opts.sim ?? userId !== ME_ID,
    micOff: opts.micOff ?? false,
    camera: opts.camera ?? false,
    screen: opts.screen ?? null,
  };
  const list = presence.get(channel.id) ?? [];
  list.push(p);
  presence.set(channel.id, list);
  voiceBus.emit({ type: 'joined', channelId: channel.id, p });
  pushChannelEvent(channel, 'voice.participant.joined', {
    channelId: channel.id,
    userId,
    name: userSummary(userId).name,
    avatarUrl: userSummary(userId).avatarUrl,
    joinedAt: p.joinedAt,
  });
  pushRoster(channel);
  return p;
}

export function removePresence(
  channel: VoiceChannelRec,
  userId: string,
  reason: 'kick' | 'leave' | 'move' = 'leave',
): boolean {
  const list = presence.get(channel.id);
  if (!list) return false;
  const idx = list.findIndex((p) => p.userId === userId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  voiceBus.emit({ type: 'left', channelId: channel.id, userId, reason });
  pushChannelEvent(channel, 'voice.participant.left', { channelId: channel.id, userId });
  pushRoster(channel);
  return true;
}

/** Notify consumers that a participant's mutable fields changed. */
export function touchPresence(channel: VoiceChannelRec, p: Presence): void {
  voiceBus.emit({ type: 'updated', channelId: channel.id, p });
}

export function channelById(id: string): VoiceChannelRec | undefined {
  return channelsTbl().get(id);
}

/** Account deletion hook: drop presence and hand authored channels to `reassignTo`. */
export function voiceUserRemoved(userId: string, reassignTo: string): void {
  for (const [cid, list] of presence) {
    if (list.some((p) => p.userId === userId)) {
      const ch = channelById(cid);
      if (ch) removePresence(ch, userId, 'kick');
    }
  }
  for (const c of channelsTbl().where('createdById', userId).slice()) {
    c.createdById = reassignTo;
    channelsTbl().save(c);
  }
}

// ─── Traits for simulated colleagues (shared with the mock room) ───────

export interface SimTraits {
  /** 0.2–1: how often they take the floor. */
  chattiness: number;
  /** Vocal energy, scales the animated audio level. */
  energy: number;
}

export function traitsOf(userId: string): SimTraits {
  const h = hashString(`traits:${userId}`);
  return { chattiness: 0.25 + ((h % 76) / 100), energy: 0.55 + (((h >>> 8) % 40) / 100) };
}

// ─── Thread lookup (paired text channel) ───────────────────────────────

export function threadIdFor(channelId: string): string {
  return `vthread_${channelId}`;
}

// ─── Socket simulation ─────────────────────────────────────────────────

let ambientStarted = false;

onClientEmit('/voice', 'voice:subscribe.lobby', (_p, ack, sock) => {
  joinRoom(sock, 'voice-lobby');
  ack?.({ ok: true });
});

onClientEmit('/voice', 'voice:subscribe.project', (payload, ack, sock) => {
  const key = String(payload?.projectId ?? '');
  const proj = projects().get(key) ?? projects().where('slug', key)[0];
  if (!proj) return ack?.({ ok: false, error: 'Project not found.' });
  joinRoom(sock, `project:${proj.id}`);
  ack?.({ ok: true });
});

onClientEmit('/voice', 'voice:subscribe.channel', (payload, ack, sock) => {
  if (!payload?.channelId) return ack?.({ ok: false });
  joinRoom(sock, `channel:${payload.channelId}`);
  ack?.({ ok: true });
});

onClientEmit('/voice', 'voice:unsubscribe.channel', (payload, ack, sock) => {
  if (payload?.channelId) leaveRoom(sock, `channel:${payload.channelId}`);
  ack?.({ ok: true });
});

onClientEmit('/voice', 'voice:speaking', (_payload, ack) => ack?.({ ok: true }));

onSocketConnect((s: DemoSocket) => {
  if (s.nsp !== '/voice') return;
  joinRoom(s, `user:${ME_ID}`);
  startAmbient();
});

// ─── Ambient office ────────────────────────────────────────────────────

const TICK_MS = 6500;

function startAmbient(): void {
  if (ambientStarted || typeof window === 'undefined') return;
  ambientStarted = true;
  setInterval(ambientTick, TICK_MS);
}

function eligibleBots(channel: VoiceChannelRec): string[] {
  const busy = new Set<string>();
  for (const list of presence.values()) for (const p of list) busy.add(p.userId);
  let pool: string[];
  if (channel.projectId) pool = members().where('projectId', channel.projectId).map((m) => m.userId);
  else pool = users().all().map((u) => u.id);
  return pool.filter((id) => id !== ME_ID && !busy.has(id) && !users().get(id)?.suspendedAt);
}

function pickRandom<T>(arr: readonly T[]): T | undefined {
  return arr.length ? arr[Math.floor(rand() * arr.length)] : undefined;
}

function ambientTick(): void {
  const active = channelsTbl()
    .all()
    .filter((c) => !c.archivedAt);
  if (active.length === 0) return;
  const meChannel = channelOfUser(ME_ID);
  // Bias towards the channel the visitor is in (so an empty room fills up),
  // otherwise a random channel that already has people or is a lobby room.
  const lively = active.filter((c) => livePresence(c.id).some((p) => p.sim) || !c.projectId);
  const target =
    meChannel && rand() < 0.45 ? channelById(meChannel) : pickRandom(lively.length ? lively : active);
  if (!target) return;
  const bots = livePresence(target.id).filter((p) => p.sim);
  const cap = target.userLimit ?? (target.kind === 'STAGE' ? 24 : 7);
  const total = livePresence(target.id).length;
  const wantJoin =
    total === 0 || (total < 2 ? rand() < 0.8 : total < Math.min(cap, 6) && rand() < 0.55);

  if (wantJoin && total < cap) {
    const uid = pickRandom(eligibleBots(target));
    if (uid) {
      addPresence(target, uid, {
        sim: true,
        role: target.kind === 'STAGE' ? 'AUDIENCE' : 'SPEAKER',
        micOff: rand() < 0.12,
        camera: target.kind === 'STANDARD' && rand() < 0.1,
      });
    }
  } else if (bots.length > 0 && (total > 3 || rand() < 0.35)) {
    const leaver = pickRandom(bots.filter((p) => p.role !== 'SPEAKER' || target.kind !== 'STAGE'));
    if (leaver) removePresence(target, leaver.userId, 'leave');
  }

  // Stage: audience members raise their hands every now and then.
  if (target.kind === 'STAGE') {
    const quiet = livePresence(target.id).filter((p) => p.sim && p.role === 'AUDIENCE' && !p.handRaisedAt);
    const raised = livePresence(target.id).filter((p) => p.handRaisedAt).length;
    const p = pickRandom(quiet);
    if (p && raised < 4 && rand() < 0.35) {
      p.handRaisedAt = nowIso();
      touchPresence(target, p);
      pushChannelEvent(target, 'voice.stage.hand.raised', {
        channelId: target.id,
        userId: p.userId,
        handRaisedAt: p.handRaisedAt,
      });
    }
  }
}
