/**
 * LiveKit stand-in for the static demo (`livekit-client` cannot reach a server).
 *
 * The demo build aliases `livekit-client` to this module (webpack
 * `resolve.alias`), so `voice-provider.tsx` and the voice components run
 * unchanged against a simulated room:
 *   - `connect()` succeeds after a short delay; the token minted by the mock
 *     `/voice/channels/:id/join` endpoint carries identity / name / avatar / role.
 *   - Remote participants mirror the simulated roster (`handlers/voice-sim`):
 *     they join and leave live, take turns speaking (ActiveSpeakersChanged with
 *     animated audio levels), mute themselves, raise hands on stages, turn on
 *     cameras and share screens (animated canvases, see `livekit-scenes`).
 *   - Local mic / camera / screen-share toggles work visually. No real
 *     microphone, camera or screen permission is ever requested.
 *
 * Types are intentionally loose (`any`): the app keeps typechecking against the
 * real package; this file only has to typecheck on its own.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { decodeDemoToken } from './handlers/voice-token';
import { createScene, type Scene, type SceneKind } from './livekit-scenes';

// ─── Enums / constants (string values match livekit-client) ────────────

export const RoomEvent = {
  Connected: 'connected',
  Reconnecting: 'reconnecting',
  SignalReconnecting: 'signalReconnecting',
  Reconnected: 'reconnected',
  Disconnected: 'disconnected',
  ConnectionStateChanged: 'connectionStateChanged',
  ParticipantConnected: 'participantConnected',
  ParticipantDisconnected: 'participantDisconnected',
  TrackPublished: 'trackPublished',
  TrackUnpublished: 'trackUnpublished',
  TrackSubscribed: 'trackSubscribed',
  TrackUnsubscribed: 'trackUnsubscribed',
  TrackMuted: 'trackMuted',
  TrackUnmuted: 'trackUnmuted',
  LocalTrackPublished: 'localTrackPublished',
  LocalTrackUnpublished: 'localTrackUnpublished',
  ActiveSpeakersChanged: 'activeSpeakersChanged',
  ParticipantMetadataChanged: 'participantMetadataChanged',
  ParticipantNameChanged: 'participantNameChanged',
  ParticipantPermissionsChanged: 'participantPermissionsChanged',
  ConnectionQualityChanged: 'connectionQualityChanged',
  MediaDevicesChanged: 'mediaDevicesChanged',
  MediaDevicesError: 'mediaDevicesError',
  RoomMetadataChanged: 'roomMetadataChanged',
  DataReceived: 'dataReceived',
  AudioPlaybackStatusChanged: 'audioPlaybackChanged',
  ActiveDeviceChanged: 'activeDeviceChanged',
} as const;

export const ParticipantEvent = {
  TrackPublished: 'trackPublished',
  TrackSubscribed: 'trackSubscribed',
  TrackUnsubscribed: 'trackUnsubscribed',
  TrackMuted: 'trackMuted',
  TrackUnmuted: 'trackUnmuted',
  LocalTrackPublished: 'localTrackPublished',
  LocalTrackUnpublished: 'localTrackUnpublished',
  IsSpeakingChanged: 'isSpeakingChanged',
  ParticipantMetadataChanged: 'participantMetadataChanged',
  ConnectionQualityChanged: 'connectionQualityChanged',
} as const;

export const TrackEvent = {
  Muted: 'muted',
  Unmuted: 'unmuted',
  Ended: 'ended',
  AudioPlaybackStarted: 'audioPlaybackStarted',
  VideoPlaybackStarted: 'videoPlaybackStarted',
} as const;

export const ConnectionState = {
  Disconnected: 'disconnected',
  Connecting: 'connecting',
  Connected: 'connected',
  Reconnecting: 'reconnecting',
  SignalReconnecting: 'signalReconnecting',
} as const;

export const ConnectionQuality = {
  Excellent: 'excellent',
  Good: 'good',
  Poor: 'poor',
  Lost: 'lost',
  Unknown: 'unknown',
} as const;

export const DisconnectReason = {
  UNKNOWN_REASON: 0,
  CLIENT_INITIATED: 1,
  DUPLICATE_IDENTITY: 2,
  SERVER_SHUTDOWN: 3,
  PARTICIPANT_REMOVED: 4,
  ROOM_DELETED: 5,
} as const;

export const VideoQuality = { LOW: 0, MEDIUM: 1, HIGH: 2, OFF: 3 } as const;

const preset = (width: number, height: number, bitrate: number, fps = 30) => ({
  width,
  height,
  aspectRatio: width / height,
  resolution: { width, height, frameRate: fps },
  encoding: { maxBitrate: bitrate, maxFramerate: fps },
});

export const VideoPresets = {
  h90: preset(160, 90, 90_000, 15),
  h180: preset(320, 180, 160_000, 15),
  h216: preset(384, 216, 180_000, 15),
  h360: preset(640, 360, 450_000, 20),
  h540: preset(960, 540, 800_000, 25),
  h720: preset(1280, 720, 1_700_000),
  h1080: preset(1920, 1080, 3_000_000),
  h1440: preset(2560, 1440, 5_000_000),
  h2160: preset(3840, 2160, 8_000_000),
};

export const ScreenSharePresets = {
  h360fps3: preset(640, 360, 200_000, 3),
  h720fps5: preset(1280, 720, 400_000, 5),
  h720fps15: preset(1280, 720, 1_500_000, 15),
  h1080fps15: preset(1920, 1080, 2_500_000, 15),
  h1080fps30: preset(1920, 1080, 5_000_000, 30),
};

export const AudioPresets = {
  telephone: { maxBitrate: 12_000 },
  speech: { maxBitrate: 24_000 },
  music: { maxBitrate: 48_000 },
  musicStereo: { maxBitrate: 64_000 },
  musicHighQuality: { maxBitrate: 96_000 },
  musicHighQualityStereo: { maxBitrate: 128_000 },
};

export const TrackKind = { Audio: 'audio', Video: 'video', Unknown: 'unknown' } as const;
export const TrackSource = {
  Camera: 'camera',
  Microphone: 'microphone',
  ScreenShare: 'screen_share',
  ScreenShareAudio: 'screen_share_audio',
  Unknown: 'unknown',
} as const;

// ─── Tiny event emitter ────────────────────────────────────────────────

class Emitter {
  private _h = new Map<string, Set<(...a: any[]) => void>>();
  on(ev: string, fn: (...a: any[]) => void): this {
    let s = this._h.get(ev);
    if (!s) this._h.set(ev, (s = new Set()));
    s.add(fn);
    return this;
  }
  addListener(ev: string, fn: (...a: any[]) => void): this {
    return this.on(ev, fn);
  }
  once(ev: string, fn: (...a: any[]) => void): this {
    const w = (...a: any[]) => {
      this.off(ev, w);
      fn(...a);
    };
    return this.on(ev, w);
  }
  off(ev: string, fn?: (...a: any[]) => void): this {
    if (!fn) this._h.delete(ev);
    else this._h.get(ev)?.delete(fn);
    return this;
  }
  removeListener(ev: string, fn?: (...a: any[]) => void): this {
    return this.off(ev, fn);
  }
  removeAllListeners(ev?: string): this {
    if (ev) this._h.delete(ev);
    else this._h.clear();
    return this;
  }
  emit(ev: string, ...args: any[]): boolean {
    const set = this._h.get(ev);
    if (!set || set.size === 0) return false;
    for (const f of Array.from(set)) {
      try {
        f(...args);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[demo livekit] listener error', ev, e);
      }
    }
    return true;
  }
  listenerCount(ev: string): number {
    return this._h.get(ev)?.size ?? 0;
  }
}

let sidSeq = 0;
const sid = (prefix: string) => `${prefix}_${(++sidSeq).toString(36).padStart(6, '0')}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Tracks ────────────────────────────────────────────────────────────

class MockTrack extends Emitter {
  static Kind = TrackKind;
  static Source = TrackSource;
  sid = sid('TR');
  kind: string;
  source: string;
  name = '';
  mediaStreamTrack: MediaStreamTrack | null = null;
  mediaStream: MediaStream | null = null;
  isMuted = false;
  isLocal: boolean;
  attachedElements: HTMLMediaElement[] = [];
  private scene: Scene | null = null;
  private volume = 1;

  constructor(kind: string, source: string, opts: { local?: boolean; scene?: Scene | null; track?: MediaStreamTrack | null } = {}) {
    super();
    this.kind = kind;
    this.source = source;
    this.isLocal = !!opts.local;
    this.scene = opts.scene ?? null;
    if (opts.track) {
      this.mediaStreamTrack = opts.track;
      if (typeof MediaStream !== 'undefined') this.mediaStream = new MediaStream([opts.track]);
    } else if (this.scene?.stream) {
      this.mediaStream = this.scene.stream;
      this.mediaStreamTrack = this.scene.stream.getVideoTracks()[0] ?? null;
    }
  }

  /** Video tracks render their synthetic scene into the element; audio tracks are silent. */
  attach(el?: HTMLMediaElement): HTMLMediaElement {
    const target: HTMLMediaElement =
      el ?? (typeof document !== 'undefined' ? document.createElement(this.kind === 'video' ? 'video' : 'audio') : ({} as any));
    if (!this.attachedElements.includes(target)) this.attachedElements.push(target);
    if (this.kind === 'video' && this.mediaStream && 'srcObject' in target) {
      (target as any).srcObject = this.mediaStream;
      this.scene?.retain();
      try {
        void (target as any).play?.().catch?.(() => undefined);
      } catch {
        /* autoplay policy: the element has autoplay set anyway */
      }
    }
    return target;
  }

  detach(el?: HTMLMediaElement): HTMLMediaElement[] {
    const els = el ? [el] : this.attachedElements.slice();
    for (const t of els) {
      const i = this.attachedElements.indexOf(t);
      if (i === -1) continue;
      this.attachedElements.splice(i, 1);
      if (this.kind === 'video' && (t as any).srcObject === this.mediaStream) {
        (t as any).srcObject = null;
        this.scene?.release();
      }
    }
    return els;
  }

  setVolume(v: number) {
    this.volume = v;
  }
  getVolume() {
    return this.volume;
  }
  mute() {
    this.isMuted = true;
    return this;
  }
  unmute() {
    this.isMuted = false;
    return this;
  }
  async setMuted(m: boolean) {
    this.isMuted = m;
  }
  stop() {
    this.scene?.stop();
    try {
      this.mediaStreamTrack?.stop();
    } catch {
      /* ignore */
    }
    this.attachedElements = [];
  }
  getRTCStatsReport() {
    return Promise.resolve(undefined);
  }
}

export const Track = MockTrack;
export class LocalAudioTrack extends MockTrack {}
export class LocalVideoTrack extends MockTrack {}
export class RemoteAudioTrack extends MockTrack {}
export class RemoteVideoTrack extends MockTrack {}

class MockPublication extends Emitter {
  trackSid = sid('PU');
  kind: string;
  source: string;
  trackName: string;
  track: MockTrack | undefined;
  isMuted = false;
  isSubscribed = true;
  isEnabled = true;
  isLocal: boolean;
  constructor(track: MockTrack, opts: { name?: string; local?: boolean } = {}) {
    super();
    this.track = track;
    this.kind = track.kind;
    this.source = track.source;
    this.trackName = opts.name ?? '';
    this.isLocal = !!opts.local;
    this.isMuted = track.isMuted;
  }
  get trackInfo() {
    return { sid: this.trackSid, name: this.trackName };
  }
  setSubscribed() {}
  setEnabled() {}
  setVideoQuality() {}
  async mute() {
    this.isMuted = true;
    this.track && (this.track.isMuted = true);
  }
  async unmute() {
    this.isMuted = false;
    this.track && (this.track.isMuted = false);
  }
}

export class LocalTrackPublication extends MockPublication {}
export class RemoteTrackPublication extends MockPublication {}
export const TrackPublication = MockPublication;

// ─── Participants ──────────────────────────────────────────────────────

const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
};

class MockParticipant extends Emitter {
  sid = sid('PA');
  identity: string;
  name: string;
  metadata = '';
  isSpeaking = false;
  audioLevel = 0;
  connectionQuality: string = ConnectionQuality.Excellent;
  lastSpokeAt: Date | undefined;
  permissions = { canPublish: true, canSubscribe: true, canPublishData: true };
  protected pubs = new Map<string, MockPublication>();

  constructor(identity: string, name: string, metadata = '') {
    super();
    this.identity = identity;
    this.name = name;
    this.metadata = metadata;
  }

  get trackPublications(): Map<string, MockPublication> {
    return this.pubs;
  }
  get audioTrackPublications(): Map<string, MockPublication> {
    return new Map([...this.pubs].filter(([, p]) => p.kind === 'audio'));
  }
  get videoTrackPublications(): Map<string, MockPublication> {
    return new Map([...this.pubs].filter(([, p]) => p.kind === 'video'));
  }

  getTrackPublication(source: string): MockPublication | undefined {
    let fallback: MockPublication | undefined;
    for (const p of this.pubs.values()) {
      if (p.source !== source) continue;
      // The soundboard side-channel shares the microphone source; the real mic wins.
      if (p.trackName === 'soundboard') {
        fallback ??= p;
        continue;
      }
      return p;
    }
    return fallback;
  }
  getTrackPublicationByName(name: string) {
    return [...this.pubs.values()].find((p) => p.trackName === name);
  }

  get isMicrophoneEnabled(): boolean {
    const p = this.getTrackPublication(TrackSource.Microphone);
    return !!p && !p.isMuted;
  }
  get isCameraEnabled(): boolean {
    const p = this.getTrackPublication(TrackSource.Camera);
    return !!p && !p.isMuted;
  }
  get isScreenShareEnabled(): boolean {
    const p = this.getTrackPublication(TrackSource.ScreenShare);
    return !!p && !p.isMuted;
  }
  get isEncrypted() {
    return false;
  }
  get isLocal(): boolean {
    return false;
  }
}

export class RemoteParticipant extends MockParticipant {
  /** @internal scenes owned by this participant, stopped on leave. */
  _scenes: Scene[] = [];
  /** @internal */
  _traits = { chattiness: 0.6, energy: 0.8 };
}

export class LocalParticipant extends MockParticipant {
  localTrackPublications = new Map<string, MockPublication>();
  private room: Room;
  /** Audience members on a stage cannot publish until promoted. */
  canPublish = true;
  private scenes: Scene[] = [];

  constructor(room: Room, identity: string, name: string, metadata: string) {
    super(identity, name, metadata);
    this.room = room;
    this.pubs = this.localTrackPublications;
  }
  get isLocal() {
    return true;
  }

  private add(track: MockTrack, name = ''): MockPublication {
    const pub = new LocalTrackPublication(track, { name, local: true });
    this.localTrackPublications.set(pub.trackSid, pub);
    this.room.emit(RoomEvent.LocalTrackPublished, pub, this);
    this.emit(ParticipantEvent.LocalTrackPublished, pub);
    return pub;
  }

  private setMuted(pub: MockPublication, muted: boolean) {
    if (pub.isMuted === muted) return;
    pub.isMuted = muted;
    if (pub.track) pub.track.isMuted = muted;
    this.room.emit(muted ? RoomEvent.TrackMuted : RoomEvent.TrackUnmuted, pub, this);
    this.emit(muted ? ParticipantEvent.TrackMuted : ParticipantEvent.TrackUnmuted, pub);
  }

  async setMicrophoneEnabled(enabled: boolean, _opts?: any, _publishOpts?: any): Promise<MockPublication | undefined> {
    const existing = this.getTrackPublication(TrackSource.Microphone);
    if (enabled && !this.canPublish) {
      throw new Error('insufficient permissions to publish: ask a moderator to let you speak');
    }
    if (existing && existing.trackName !== 'soundboard') {
      this.setMuted(existing, !enabled);
      return existing;
    }
    if (!enabled) return undefined;
    await sleep(60);
    const pub = this.add(new MockTrack('audio', TrackSource.Microphone, { local: true }));
    return pub;
  }

  async setCameraEnabled(enabled: boolean, _opts?: any, _publishOpts?: any): Promise<MockPublication | undefined> {
    const existing = this.getTrackPublication(TrackSource.Camera);
    if (existing) {
      this.setMuted(existing, !enabled);
      return existing;
    }
    if (!enabled) return undefined;
    if (!this.canPublish) throw new Error('insufficient permissions to publish');
    await sleep(120);
    const scene = this.makeScene('camera');
    this.scenes.push(scene);
    return this.add(new MockTrack('video', TrackSource.Camera, { local: true, scene }));
  }

  async setScreenShareEnabled(enabled: boolean, _capture?: any, _publishOpts?: any): Promise<MockPublication | undefined> {
    const existing = this.getTrackPublication(TrackSource.ScreenShare);
    if (!enabled) {
      if (existing) {
        existing.track?.stop();
        this.localTrackPublications.delete(existing.trackSid);
        this.room.emit(RoomEvent.LocalTrackUnpublished, existing, this);
        this.emit(ParticipantEvent.LocalTrackUnpublished, existing);
      }
      return undefined;
    }
    if (existing) return existing;
    if (!this.canPublish) throw new Error('insufficient permissions to publish');
    await sleep(150);
    const scene = this.makeScene('desktop');
    this.scenes.push(scene);
    return this.add(new MockTrack('video', TrackSource.ScreenShare, { local: true, scene }));
  }

  private makeScene(kind: SceneKind): Scene {
    return createScene({ kind, label: this.name, hue: hueOf(this.identity) });
  }

  /** Used by the soundboard: a MediaStreamTrack from a WebAudio destination. Played locally so the visitor hears it. */
  async publishTrack(track: any, opts: { name?: string; source?: string } = {}): Promise<MockPublication> {
    const isMock = track instanceof MockTrack;
    const kind = isMock ? track.kind : track?.kind === 'video' ? 'video' : 'audio';
    const mt = isMock ? track : new MockTrack(kind, opts.source ?? TrackSource.Microphone, { local: true, track: isMock ? null : track });
    if (opts.name === 'soundboard' && !isMock && typeof Audio !== 'undefined' && typeof MediaStream !== 'undefined') {
      try {
        const el = new Audio();
        el.srcObject = new MediaStream([track]);
        el.volume = 0.9;
        void el.play().catch(() => undefined);
        (mt as any)._player = el;
      } catch {
        /* playback is a nicety */
      }
    }
    return this.add(mt, opts.name ?? '');
  }

  async unpublishTrack(track: any): Promise<MockPublication | undefined> {
    for (const [k, p] of this.localTrackPublications) {
      if (p.track === track || (p.track as any)?.mediaStreamTrack === track) {
        this.localTrackPublications.delete(k);
        try {
          (p.track as any)?._player?.pause?.();
        } catch {
          /* ignore */
        }
        this.room.emit(RoomEvent.LocalTrackUnpublished, p, this);
        return p;
      }
    }
    return undefined;
  }

  async setMetadata(metadata: string): Promise<void> {
    const prev = this.metadata;
    this.metadata = metadata;
    this.room.emit(RoomEvent.ParticipantMetadataChanged, prev, this);
    this.emit(ParticipantEvent.ParticipantMetadataChanged, prev);
  }
  async setName(name: string): Promise<void> {
    this.name = name;
  }

  /** @internal */
  _dispose() {
    for (const p of this.localTrackPublications.values()) {
      p.track?.stop();
      try {
        (p.track as any)?._player?.pause?.();
      } catch {
        /* ignore */
      }
    }
    for (const s of this.scenes) s.stop();
    this.localTrackPublications.clear();
  }
}

// ─── Room ──────────────────────────────────────────────────────────────

interface RoomOptions {
  [k: string]: any;
}

export class Room extends Emitter {
  static getLocalDevices = async (kind?: string): Promise<MediaDeviceInfo[]> => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      return kind ? all.filter((d) => d.kind === kind) : all;
    } catch {
      return [];
    }
  };

  state: string = ConnectionState.Disconnected;
  name = '';
  remoteParticipants = new Map<string, RemoteParticipant>();
  localParticipant!: LocalParticipant;
  options: RoomOptions;
  engine: any = { client: { rtt: 28 } };
  isE2EEEnabled = false;
  private channelId: string | null = null;
  private kind: 'STANDARD' | 'STAGE' = 'STANDARD';
  private unsubBus: (() => void) | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private speakers = new Map<string, { until: number; phase: number }>();
  private nextStart = 0;
  private lastSpeakerKey = '';
  private sim: typeof import('./handlers/voice-sim') | null = null;
  private activeDevices: Record<string, string> = {};

  constructor(options: RoomOptions = {}) {
    super();
    this.options = options;
    this.localParticipant = new LocalParticipant(this, 'pending', 'You', '');
  }

  get numParticipants() {
    return this.remoteParticipants.size + 1;
  }

  getParticipantByIdentity(identity: string) {
    return identity === this.localParticipant.identity ? this.localParticipant : this.remoteParticipants.get(identity);
  }

  async connect(_url: string, token: string, _opts?: any): Promise<void> {
    this.state = ConnectionState.Connecting;
    this.emit(RoomEvent.ConnectionStateChanged, this.state);
    const claims = decodeDemoToken(token);
    if (!claims) {
      this.state = ConnectionState.Disconnected;
      throw new Error('Invalid voice token.');
    }
    this.channelId = claims.channelId;
    this.kind = claims.kind === 'STAGE' ? 'STAGE' : 'STANDARD';
    this.name = `voice:${claims.channelId}`;
    const lp = new LocalParticipant(
      this,
      claims.identity,
      claims.name ?? 'You',
      JSON.stringify({ avatarUrl: claims.avatarUrl ?? null, channelId: claims.channelId, role: claims.role }),
    );
    lp.canPublish = claims.role !== 'AUDIENCE';
    this.localParticipant = lp;

    await sleep(450 + Math.random() * 350);
    this.sim = await import('./handlers/voice-sim');
    const sim = this.sim;

    // Mirror the simulated roster (everyone but ourselves).
    for (const p of sim.livePresence(this.channelId!)) {
      if (p.userId !== lp.identity) this.addRemote(p, false);
    }
    this.unsubBus = sim.voiceBus.on((e) => this.onBus(e));
    this.state = ConnectionState.Connected;
    this.emit(RoomEvent.ConnectionStateChanged, this.state);
    this.emit(RoomEvent.Connected);
    this.emit(RoomEvent.ConnectionQualityChanged, ConnectionQuality.Excellent, lp);
    this.nextStart = Date.now() + 900;
    this.tickTimer = setInterval(() => this.tick(), 220);
  }

  async disconnect(_stopTracks = true): Promise<void> {
    if (this.state === ConnectionState.Disconnected && !this.tickTimer) return;
    this.teardown();
    this.state = ConnectionState.Disconnected;
    this.emit(RoomEvent.ConnectionStateChanged, this.state);
    this.emit(RoomEvent.Disconnected, DisconnectReason.CLIENT_INITIATED);
  }

  private teardown() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    this.unsubBus?.();
    this.unsubBus = null;
    this.localParticipant._dispose();
    for (const rp of this.remoteParticipants.values()) for (const s of rp._scenes) s.stop();
    this.remoteParticipants.clear();
    this.speakers.clear();
  }

  async switchActiveDevice(kind: string, deviceId: string, _exact?: boolean): Promise<boolean> {
    this.activeDevices[kind] = deviceId;
    this.emit(RoomEvent.ActiveDeviceChanged, kind, deviceId);
    return true;
  }
  getActiveDevice(kind: string): string | undefined {
    return this.activeDevices[kind];
  }
  async startAudio() {}
  get canPlaybackAudio() {
    return true;
  }

  // ─── Remote participants ─────────────────────────────────────────────

  private addRemote(p: any, announce: boolean): RemoteParticipant {
    let rp = this.remoteParticipants.get(p.userId);
    if (rp) return rp;
    const info = this.userInfo(p.userId);
    rp = new RemoteParticipant(p.userId, info.name, JSON.stringify({ avatarUrl: info.avatarUrl, channelId: this.channelId, role: p.role }));
    if (this.sim) rp._traits = this.sim.traitsOf(p.userId);
    this.remoteParticipants.set(p.userId, rp);
    this.syncRemote(rp, p, false);
    if (announce) {
      this.emit(RoomEvent.ParticipantConnected, rp);
    }
    return rp;
  }

  private userInfo(userId: string): { name: string; avatarUrl: string | null } {
    const row = this.sim?.rosterOf(this.channelId!).find((r) => r.userId === userId);
    return { name: row?.user.name ?? userId, avatarUrl: row?.user.avatarUrl ?? null };
  }

  /** Reconcile a remote participant's publications with their simulated state. */
  private syncRemote(rp: RemoteParticipant, p: any, emit: boolean) {
    const speaker = p.role !== 'AUDIENCE';
    const mic = rp.getTrackPublication(TrackSource.Microphone);
    const wantMuted = !!(p.micOff || p.mutedByMod);
    if (speaker) {
      if (!mic) {
        const pub = new RemoteTrackPublication(new MockTrack('audio', TrackSource.Microphone), { name: 'microphone' });
        pub.isMuted = wantMuted;
        pub.track!.isMuted = wantMuted;
        rp.trackPublications.set(pub.trackSid, pub);
        if (emit) this.emit(RoomEvent.TrackSubscribed, pub.track, pub, rp);
      } else if (mic.isMuted !== wantMuted) {
        mic.isMuted = wantMuted;
        mic.track!.isMuted = wantMuted;
        if (emit) this.emit(wantMuted ? RoomEvent.TrackMuted : RoomEvent.TrackUnmuted, mic, rp);
        if (wantMuted) this.silence(rp);
      }
    } else if (mic) {
      rp.trackPublications.delete(mic.trackSid);
      this.silence(rp);
      if (emit) this.emit(RoomEvent.TrackUnsubscribed, mic.track, mic, rp);
    }
    rp.metadata = JSON.stringify({ ...safeJson(rp.metadata), role: p.role, handRaised: !!p.handRaisedAt });

    this.syncVideo(rp, TrackSource.Camera, p.camera ? 'camera' : null, emit);
    this.syncVideo(rp, TrackSource.ScreenShare, p.screen ?? null, emit);
  }

  private syncVideo(rp: RemoteParticipant, source: string, scene: SceneKind | null, emit: boolean) {
    const cur = rp.getTrackPublication(source);
    if (scene && !cur) {
      const sc = createScene({ kind: scene, label: rp.name, hue: hueOf(rp.identity) });
      rp._scenes.push(sc);
      const pub = new RemoteTrackPublication(new MockTrack('video', source, { scene: sc }), { name: source });
      rp.trackPublications.set(pub.trackSid, pub);
      if (emit) this.emit(RoomEvent.TrackSubscribed, pub.track, pub, rp);
    } else if (!scene && cur) {
      cur.track?.stop();
      rp.trackPublications.delete(cur.trackSid);
      if (emit) this.emit(RoomEvent.TrackUnsubscribed, cur.track, cur, rp);
    }
  }

  private silence(rp: RemoteParticipant) {
    this.speakers.delete(rp.identity);
    rp.isSpeaking = false;
    rp.audioLevel = 0;
  }

  private onBus(e: any) {
    if (e.channelId !== this.channelId) return;
    const myId = this.localParticipant.identity;
    if (e.type === 'joined') {
      if (e.p.userId === myId) return;
      this.addRemote(e.p, true);
    } else if (e.type === 'left') {
      if (e.userId === myId) {
        // We were removed (channel archived / moderated): drop the connection.
        void this.disconnect();
        return;
      }
      const rp = this.remoteParticipants.get(e.userId);
      if (!rp) return;
      this.silence(rp);
      for (const s of rp._scenes) s.stop();
      this.remoteParticipants.delete(e.userId);
      this.emit(RoomEvent.ParticipantDisconnected, rp);
    } else if (e.type === 'updated') {
      if (e.p.userId === myId) {
        const lp = this.localParticipant;
        const could = lp.canPublish;
        lp.canPublish = e.p.role !== 'AUDIENCE';
        if (could !== lp.canPublish) this.emit(RoomEvent.ParticipantPermissionsChanged, undefined, lp);
        if (!lp.canPublish && lp.isMicrophoneEnabled) void lp.setMicrophoneEnabled(false);
        return;
      }
      const rp = this.remoteParticipants.get(e.p.userId);
      if (!rp) return;
      this.syncRemote(rp, e.p, true);
      this.emit(RoomEvent.ParticipantMetadataChanged, '', rp);
    }
  }

  // ─── Conversation simulation ─────────────────────────────────────────

  private tick() {
    if (this.state !== ConnectionState.Connected) return;
    const now = Date.now();
    this.engine.client.rtt = Math.round(24 + Math.random() * 14);

    for (const [id, s] of this.speakers) if (s.until <= now) this.speakers.delete(id);

    const candidates = [...this.remoteParticipants.values()].filter(
      (rp) => rp.isMicrophoneEnabled && !this.speakers.has(rp.identity),
    );
    const floor = this.speakers.size;
    if (candidates.length > 0 && now >= this.nextStart && (floor === 0 || (floor === 1 && Math.random() < 0.05))) {
      const weights = candidates.map((c) => c._traits.chattiness);
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let pick = candidates[0]!;
      for (let i = 0; i < candidates.length; i++) {
        r -= weights[i]!;
        if (r <= 0) {
          pick = candidates[i]!;
          break;
        }
      }
      const short = floor === 1;
      const dur = short ? 500 + Math.random() * 700 : 1800 + Math.random() * 4200;
      this.speakers.set(pick.identity, { until: now + dur, phase: Math.random() * 6 });
      this.nextStart = now + dur + 350 + Math.random() * 1700;
    }

    const t = now / 1000;
    const active: RemoteParticipant[] = [];
    for (const rp of this.remoteParticipants.values()) {
      const s = this.speakers.get(rp.identity);
      if (s && rp.isMicrophoneEnabled) {
        const wave = 0.5 + 0.35 * Math.abs(Math.sin(t * 9 + s.phase)) + 0.15 * Math.random();
        rp.audioLevel = Math.min(1, wave * rp._traits.energy);
        rp.isSpeaking = true;
        rp.lastSpokeAt = new Date();
        active.push(rp);
      } else if (rp.isSpeaking) {
        rp.isSpeaking = false;
        rp.audioLevel = 0;
      }
    }
    active.sort((a, b) => b.audioLevel - a.audioLevel);
    const key = active.map((a) => a.identity).join(',');
    if (active.length > 0 || key !== this.lastSpeakerKey) {
      this.lastSpeakerKey = key;
      this.emit(RoomEvent.ActiveSpeakersChanged, active);
    }
  }
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

// ─── Helpers re-exported by livekit-client ─────────────────────────────

export async function createLocalAudioTrack(_opts?: any): Promise<LocalAudioTrack> {
  return new LocalAudioTrack('audio', TrackSource.Microphone, { local: true });
}

export async function createLocalVideoTrack(_opts?: any): Promise<LocalVideoTrack> {
  const scene = createScene({ kind: 'camera', label: 'You', hue: 210 });
  return new LocalVideoTrack('video', TrackSource.Camera, { local: true, scene });
}

export async function createLocalScreenTracks(_opts?: any): Promise<MockTrack[]> {
  const scene = createScene({ kind: 'desktop', label: 'You', hue: 210 });
  return [new LocalVideoTrack('video', TrackSource.ScreenShare, { local: true, scene })];
}

export async function createLocalTracks(opts: { audio?: any; video?: any } = {}): Promise<MockTrack[]> {
  const out: MockTrack[] = [];
  if (opts.audio) out.push(await createLocalAudioTrack(opts.audio));
  if (opts.video) out.push(await createLocalVideoTrack(opts.video));
  return out;
}

export function isBrowserSupported(): boolean {
  return true;
}
export function supportsAdaptiveStream(): boolean {
  return true;
}
export function supportsDynacast(): boolean {
  return true;
}
export function setLogLevel(_level?: any) {}
export const LogLevel = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, silent: 5 } as const;
export const version = 'demo';

export type { Scene };
