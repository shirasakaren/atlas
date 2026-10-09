/**
 * Server -> client chat events (the equivalent of the backend's
 * ChatRealtimePublisher). Event names and payloads mirror the real gateway.
 */
import { pushToClients } from '../realtime';
import type { ChannelRec, MsgRec } from '../seed/chat-schema';
import { shapeChannel, shapeMessage } from './chat-store';

export const channelRoom = (channelId: string) => `channel:${channelId}`;

const send = (event: string, payload: unknown, room?: string) => pushToClients('/chat', event, payload, room ? { room } : {});

export function messageCreated(rec: MsgRec, clientMessageId?: string) {
  const wire = { ...shapeMessage(rec), clientMessageId };
  send('message.created', wire, channelRoom(rec.channelId));
  // The rail's unread badges refetch on this (every tab, like the global room).
  send('unread.update', { channelId: rec.channelId });
}

export function messageEdited(rec: MsgRec) {
  send('message.edited', shapeMessage(rec), channelRoom(rec.channelId));
}

export function messageDeleted(rec: MsgRec) {
  send('message.deleted', shapeMessage(rec), channelRoom(rec.channelId));
}

export function reaction(added: boolean, channelId: string, messageId: string, userId: string, emoji: string) {
  send(added ? 'reaction.added' : 'reaction.removed', { messageId, userId, emoji }, channelRoom(channelId));
}

export function pin(added: boolean, channelId: string, messageId: string, note: string | null = null) {
  send(added ? 'pin.added' : 'pin.removed', added ? { messageId, note } : { messageId }, channelRoom(channelId));
}

export const channelCreated = (c: ChannelRec) => send('channel.created', shapeChannel(c));
export const channelUpdated = (c: ChannelRec) => send('channel.updated', shapeChannel(c));
export const channelArchived = (channelId: string) => send('channel.archived', { channelId });

export function typing(start: boolean, channelId: string, userId: string, name: string) {
  send(start ? 'typing.start' : 'typing.stop', start ? { channelId, userId, name } : { channelId, userId }, channelRoom(channelId));
}
