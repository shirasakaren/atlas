/**
 * Chat domain entry: channels, messages, reactions, pins, search, stickers,
 * link previews, admin chat settings, the /chat socket simulation and the
 * `contracts.chat` seam other domains call.
 */
import { ME_ID } from '../config';
import { contracts } from '../contracts';
import { newId } from '../prng';
import { nowIso } from '../clock';
import { accessibleProjectIds } from '../access';
import { chatChannels, chatReads, readId } from '../seed/chat-schema';
import { projects } from '../store';
import { searchChannels } from './chat-search';
import { addMessage, newMessageId, unreadFor } from './chat-store';
import './chat-routes';
import './chat-admin';
import './chat-socket';

contracts.chat = {
  onProjectCreated(project) {
    if (chatChannels().all().some((c) => c.projectId === project.id && c.isGeneral)) return;
    const now = nowIso();
    const ch = chatChannels().insert({
      id: newId('chn'),
      projectId: project.id,
      name: 'general',
      slug: 'general',
      topic: 'Day-to-day discussion for the project team.',
      isGeneral: true,
      isArchived: false,
      isVoiceThread: false,
      createdById: project.ownerId,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });
    addMessage({ id: newMessageId(), channelId: ch.id, authorId: project.ownerId, kind: 'SYSTEM_CHANNEL_CREATED', createdAt: now, markdown: 'created #general' });
    chatReads().insert({ id: readId(ch.id, ME_ID), channelId: ch.id, userId: ME_ID, lastReadAt: now, lastReadMessageId: null });
  },

  onMemberChanged(projectId, userId, change) {
    // Read state is per user and created lazily; make a fresh member start "caught up".
    if (change !== 'added' || userId !== ME_ID) return;
    const now = nowIso();
    for (const c of chatChannels().all()) {
      if (c.projectId !== projectId || chatReads().get(readId(c.id, ME_ID))) continue;
      chatReads().insert({ id: readId(c.id, ME_ID), channelId: c.id, userId: ME_ID, lastReadAt: now, lastReadMessageId: null });
    }
  },

  unreadSummary(userId) {
    if (userId !== ME_ID) return [];
    const ok = new Set(accessibleProjectIds());
    const out: { channelId: string; name: string; projectSlug: string | null; unread: number }[] = [];
    for (const c of chatChannels().all()) {
      if (c.isArchived || c.isVoiceThread || (c.projectId && !ok.has(c.projectId))) continue;
      const unread = unreadFor(c.id, userId);
      if (unread > 0) out.push({ channelId: c.id, name: c.name, projectSlug: c.projectId ? (projects().get(c.projectId)?.slug ?? null) : null, unread });
    }
    return out.sort((a, b) => b.unread - a.unread);
  },

  searchMessages(q, projectIds, limit) {
    const ids = new Set(projectIds);
    const channels = chatChannels()
      .all()
      .filter((c) => !c.isVoiceThread && (!c.projectId || ids.has(c.projectId)));
    return searchChannels(q, channels, limit).hits;
  },

  totalUnread(userId) {
    return contracts.chat!.unreadSummary(userId).reduce((s, c) => s + c.unread, 0);
  },
};
