/**
 * Voice seed (order 82): the workspace lobby rooms, per-project channels,
 * who is in them right now, the soundboard library and recording history.
 */
import { registerSeeder } from '../db';
import { agoIso, DAY, HOUR, MIN } from '../clock';
import { ME_ID } from '../config';
import { seqId } from '../prng';
import { members, projects, users } from '../store';
import { CAST } from './people';
import type { ProjectKind } from '../schema';
import {
  channelsTbl,
  resetPresence,
  seedPresence,
  nextPresenceId,
  threadIdFor,
  type Presence,
  type VoiceChannelRec,
  type ScreenScene,
} from '../handlers/voice-sim';
import { clipsTbl, recordingsTbl } from '../handlers/voice-misc';
import { SYNTH_CLIPS, clipDataUri } from '../handlers/voice-audio';

interface Extra {
  name: string;
  topic: string;
  kind?: 'STANDARD' | 'STAGE';
}

const EXTRAS: Record<ProjectKind, Extra[]> = {
  software: [
    { name: 'Pairing Room', topic: 'Drop in to pair on a branch' },
    { name: 'Release Bridge', topic: 'Cutover coordination during releases' },
    { name: 'Design Review', topic: 'Walk through designs and RFCs' },
  ],
  mobile: [
    { name: 'Release Train', topic: 'Store submission and staged rollout' },
    { name: 'Device Lab Sync', topic: 'Triage device-specific bugs' },
  ],
  data: [
    { name: 'Pipeline Triage', topic: 'Failed jobs and late data' },
    { name: 'Office Hours', topic: 'Questions about datasets and metrics' },
    { name: 'Model Review', topic: 'Walk through experiments' },
  ],
  security: [
    { name: 'Incident Response', topic: 'Bridge for active security events' },
    { name: 'Control Walkthrough', topic: 'Evidence and audit prep' },
  ],
  infrastructure: [
    { name: 'On-call Handoff', topic: 'Shift handoff and weekly review' },
    { name: 'Change Advisory', topic: 'Review upcoming risky changes' },
  ],
  finance: [{ name: 'Close Calendar Sync', topic: 'Month-end checkpoints' }, { name: 'Forecast Review', topic: 'Variance walkthroughs' }],
  people: [{ name: 'Manager Sync', topic: 'Program updates for people leaders' }, { name: 'Open Forum', topic: 'Q&A with the team', kind: 'STAGE' }],
  marketing: [{ name: 'Campaign Standup', topic: 'Launch checklist and asset status' }, { name: 'Creative Review', topic: 'Feedback on drafts' }],
  design: [{ name: 'Crit Room', topic: 'Design critique, camera-friendly' }, { name: 'Handoff Hangout', topic: 'Walk engineers through specs' }],
  operations: [{ name: 'Daily Ops Stand-up', topic: 'What is blocked today' }, { name: 'Escalations', topic: 'Customer-impacting issues' }],
  legal: [{ name: 'Contract Review', topic: 'Redlines and open clauses' }, { name: 'Policy Workshop', topic: 'Draft and review policies' }],
  research: [{ name: 'Lab Meeting', topic: 'Weekly research readout' }, { name: 'Synthesis Session', topic: 'Cluster interview notes' }],
  'supply-chain': [{ name: 'Supplier Calls', topic: 'Vendor check-ins' }, { name: 'S&OP Prep', topic: 'Demand and supply alignment' }],
  customer: [{ name: 'Escalation Bridge', topic: 'Strategic account fire drills' }, { name: 'Playbook Workshop', topic: 'Refine success playbooks' }],
  sales: [{ name: 'Deal Desk', topic: 'Pricing and approvals' }, { name: 'Pipeline Review', topic: 'Weekly forecast call' }],
};

interface LobbyDef {
  name: string;
  topic: string;
  kind?: 'STANDARD' | 'STAGE';
  userLimit?: number;
  isDefault?: boolean;
  quality?: 'LOW' | 'STANDARD' | 'HIGH';
  /** Simulated occupants. */
  people: number;
  screen?: ScreenScene;
  muted?: boolean;
  cameras?: number;
  /** Stage only: how many of `people` are speakers / have a raised hand. */
  speakers?: number;
  hands?: number;
}

const LOBBY: LobbyDef[] = [
  { name: 'Voice Lobby', topic: 'Workspace-wide voice hangout', isDefault: true, people: 2 },
  { name: 'Daily Standup Room', topic: 'Async-friendly standups, 9:30 ET. Camera optional.', people: 5, cameras: 1 },
  { name: 'War Room', topic: 'Incident bridge and launch-day coordination', people: 4, screen: 'dashboard', quality: 'HIGH' },
  { name: 'Town Hall Stage', topic: 'All-hands and AMAs. Raise your hand to ask a question.', kind: 'STAGE', people: 13, speakers: 3, hands: 2, quality: 'HIGH' },
  { name: 'Coffee Break', topic: 'Water-cooler chat, no agenda', people: 2 },
  { name: 'Office Hours: Data Platform', topic: 'Drop in with questions for the data platform team', people: 0 },
  { name: 'Focus Room', topic: 'Quiet co-working. Mics muted by default.', userLimit: 8, people: 3, muted: true, quality: 'LOW' },
];

registerSeeder({
  name: 'admin-voice',
  order: 82,
  run({ rng }) {
    resetPresence();
    const chans: VoiceChannelRec[] = [];
    let n = 0;
    const make = (o: Partial<VoiceChannelRec> & { name: string }): VoiceChannelRec => {
      const id = seqId('vc', ++n);
      const created = agoIso((30 + rng.int(0, 300)) * DAY);
      const rec: VoiceChannelRec = {
        id,
        projectId: null,
        topic: null,
        userLimit: null,
        audioQuality: 'STANDARD',
        kind: 'STANDARD',
        isDefault: false,
        sortIndex: 0,
        permissions: {},
        textThreadId: threadIdFor(id),
        createdById: CAST.daniel.id,
        createdAt: created,
        updatedAt: created,
        archivedAt: null,
        ...o,
      };
      chans.push(rec);
      return rec;
    };

    const allUsers = users().all().filter((u) => u.id !== ME_ID && !u.suspendedAt);
    const busy = new Set<string>();
    const present = (
      ch: VoiceChannelRec,
      pool: readonly string[],
      count: number,
      opts: { screen?: ScreenScene; muted?: boolean; cameras?: number; speakers?: number; hands?: number } = {},
    ) => {
      const free = pool.filter((id) => id !== ME_ID && !busy.has(id));
      // Stage: the first `speakers` entries of the pool (leadership) keep their order.
      const lead = ch.kind === 'STAGE' ? free.slice(0, opts.speakers ?? 0) : [];
      const picks = [...lead, ...rng.shuffle(free.filter((id) => !lead.includes(id)))].slice(0, count);
      picks.forEach((userId, i) => {
        busy.add(userId);
        const stage = ch.kind === 'STAGE';
        const speaker = !stage || i < (opts.speakers ?? 2);
        const p: Presence = {
          id: nextPresenceId(),
          channelId: ch.id,
          userId,
          joinedAt: agoIso((4 + rng.int(0, 55)) * MIN),
          mutedByMod: false,
          role: speaker ? 'SPEAKER' : 'AUDIENCE',
          handRaisedAt: null,
          sim: true,
          micOff: !stage && (opts.muted || rng.chance(0.12)),
          camera: !stage && i < (opts.cameras ?? 0),
          screen: i === 0 && opts.screen ? opts.screen : null,
        };
        if (stage && !speaker && i - (opts.speakers ?? 2) < (opts.hands ?? 0)) {
          p.handRaisedAt = agoIso((1 + rng.int(0, 6)) * MIN);
        }
        seedPresence(p);
      });
    };

    // Workspace lobby.
    LOBBY.forEach((d, i) => {
      const ch = make({
        name: d.name,
        topic: d.topic,
        kind: d.kind ?? 'STANDARD',
        userLimit: d.userLimit ?? null,
        isDefault: !!d.isDefault,
        audioQuality: d.quality ?? 'STANDARD',
        sortIndex: i,
      });
      if (d.people > 0) {
        // Town hall: leadership on stage.
        const pool =
          d.kind === 'STAGE'
            ? [CAST.daniel.id, CAST.elena.id, CAST.priya.id, ...allUsers.map((u) => u.id)]
            : allUsers.map((u) => u.id);
        present(ch, pool, d.people, d);
      }
    });

    // Projects.
    for (const p of projects().all()) {
      const memberIds = members().where('projectId', p.id).map((m) => m.userId);
      const meIsMember = memberIds.includes(ME_ID);
      const larger = memberIds.length >= 9 || meIsMember || p.pinned;
      const owner = p.ownerId;
      const general = make({
        projectId: p.id,
        name: 'General Voice',
        topic: null,
        isDefault: true,
        createdById: owner,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
      });
      const mine: VoiceChannelRec[] = [general];
      if (larger) {
        const extras = EXTRAS[p.kind] ?? [];
        const k = Math.min(extras.length, rng.int(1, 3));
        extras.slice(0, k).forEach((e, i) => {
          mine.push(
            make({
              projectId: p.id,
              name: e.name,
              topic: e.topic,
              kind: e.kind ?? 'STANDARD',
              sortIndex: i + 1,
              createdById: owner,
              createdAt: agoIso((5 + rng.int(0, 120)) * DAY),
            }),
          );
        });
      }
      // Some project calls are already in progress.
      if (memberIds.length >= 4 && rng.chance(larger ? 0.35 : 0.12)) {
        const target = rng.pick(mine.filter((c) => c.kind === 'STANDARD'));
        present(target, memberIds, rng.int(2, Math.min(5, memberIds.length)), {
          cameras: rng.chance(0.25) ? 1 : 0,
          screen: rng.chance(0.2) ? rng.pick<ScreenScene>(['dashboard', 'slides', 'code']) : undefined,
        });
      }
    }
    channelsTbl().insertMany(chans);

    // Soundboard.
    clipsTbl().insertMany(
      SYNTH_CLIPS.map((c, i) => ({
        id: seqId('clip', i + 1),
        name: c.name,
        s3Key: null,
        url: clipDataUri(c.key),
        durationMs: c.durationMs,
        createdAt: agoIso((14 + i * 9) * DAY),
        uploadedById: i % 3 === 0 ? CAST.sofia.id : CAST.daniel.id,
      })),
    );

    // Recording history on the lobby's busy rooms.
    const lobbyByName = new Map(chans.filter((c) => !c.projectId).map((c) => [c.name, c]));
    const recs: [string, number, number, 'COMPLETED' | 'FAILED', string][] = [
      ['Town Hall Stage', 6, 2840, 'COMPLETED', CAST.daniel.id],
      ['War Room', 3, 5400, 'COMPLETED', CAST.kenji.id],
      ['Daily Standup Room', 11, 960, 'COMPLETED', CAST.priya.id],
      ['War Room', 18, 0, 'FAILED', CAST.kenji.id],
      ['Town Hall Stage', 41, 3320, 'COMPLETED', CAST.daniel.id],
    ];
    recordingsTbl().insertMany(
      recs.map(([room, daysAgo, secs, status, by], i) => {
        const ch = lobbyByName.get(room)!;
        const started = agoIso(daysAgo * DAY + 3 * HOUR);
        const ended = agoIso(daysAgo * DAY + 3 * HOUR - secs * 1000);
        return {
          id: seqId('rec', i + 1),
          channelId: ch.id,
          startedByUserId: by,
          status,
          startedAt: started,
          endedAt: status === 'FAILED' ? started : ended,
          s3Key: status === 'COMPLETED' ? `voice-recordings/${ch.id}/${i + 1}.ogg` : null,
          durationSec: status === 'COMPLETED' ? secs : null,
          sizeBytes: status === 'COMPLETED' ? secs * 15_800 : null,
          retentionUntil: new Date(new Date(started).getTime() + 30 * DAY).toISOString(),
          errorMessage: status === 'FAILED' ? 'Egress worker lost connection to the room.' : null,
        };
      }),
    );
  },
});
