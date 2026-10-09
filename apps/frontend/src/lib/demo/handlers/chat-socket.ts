/**
 * The simulated /chat (and /notifications) socket servers: room joins,
 * presence, typing. Live conversation lives in chat-sim.ts.
 */
import { onClientEmit, onSocketConnect, joinRoom, leaveRoom } from '../realtime';
import { hashString } from '../prng';
import { members as membersTbl } from '../store';
import { chatChannels } from '../seed/chat-schema';
import { accessForChannel } from './chat-store';
import { startSim } from './chat-sim';

onSocketConnect((sock) => {
  if (sock.nsp !== '/chat') return;
  // Every authenticated socket joins the global fanout room on connect.
  joinRoom(sock, 'global');
  startSim();
});

onClientEmit('/chat', 'chat:subscribe', (payload: { projectId?: string; channelId?: string } | undefined, ack, sock) => {
  const done = (r: { ok: boolean; error?: string }) => ack?.(r);
  try {
    const channelId = payload?.channelId;
    if (!channelId) return done({ ok: false, error: 'projectId or channelId required.' });
    const ch = chatChannels().get(channelId);
    if (!ch) return done({ ok: false, error: 'Channel not found.' });
    const a = accessForChannel(ch);
    if (!a.access.isInsider) return done({ ok: false, error: 'Project membership required.' });
    joinRoom(sock, `channel:${channelId}`);
    if (payload?.projectId && ch.projectId) {
      const room = `project:${ch.projectId}`;
      if (!sock.rooms.has(room)) {
        joinRoom(sock, room);
        // Presence snapshot: roughly half the team is online, stable per hour.
        const hour = Math.floor(Date.now() / 3_600_000);
        for (const m of membersTbl().where('projectId', ch.projectId)) {
          if (hashString(`${m.userId}${hour}`) % 100 < 52) sock.dispatch('presence.update', { userId: m.userId, online: true });
        }
      }
    }
    done({ ok: true });
  } catch (e) {
    done({ ok: false, error: (e as Error).message });
  }
});

onClientEmit('/chat', 'chat:unsubscribe', (payload: { channelId?: string } | undefined, ack, sock) => {
  if (payload?.channelId) leaveRoom(sock, `channel:${payload.channelId}`);
  ack?.({ ok: true });
});

// Heartbeats and the persona's own typing need no server-side effect.
onClientEmit('/chat', 'presence:heartbeat', () => undefined);
onClientEmit('/chat', 'typing:ping', () => undefined);
onClientEmit('/chat', 'typing:stop', () => undefined);
