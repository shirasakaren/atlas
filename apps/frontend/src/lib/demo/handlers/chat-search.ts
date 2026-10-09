/**
 * Chat search with `<mark>` snippets (stand-in for the backend's Postgres
 * full-text search): all terms must match as word prefixes.
 */
import { accessibleProjectIds } from '../access';
import { badRequest } from '../http';
import { projects, users } from '../store';
import { chatChannels, type ChannelRec, type MsgRec } from '../seed/chat-schema';
import type { ChatSearchHit, ChatSearchResponse } from '@/lib/types';
import { channelMsgs } from './chat-store';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const plain = (md: string) => md.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');

function termsOf(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter(Boolean)
    .slice(0, 8);
}

function matcher(terms: string[]) {
  const res = terms.map((t) => new RegExp(`(?<![\\p{L}\\p{N}_])${esc(t)}`, 'iu'));
  return (text: string) => res.every((r) => r.test(text));
}

function snippet(text: string, terms: string[]): string {
  const flat = text.replace(/```[a-z]*\n?/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = flat.toLowerCase();
  let first = -1;
  for (const t of terms) {
    const m = new RegExp(`(?<![\\p{L}\\p{N}_])${esc(t)}`, 'iu').exec(lower);
    if (m && (first < 0 || m.index < first)) first = m.index;
  }
  let start = Math.max(0, first - 70);
  if (start > 0) {
    const sp = flat.indexOf(' ', start);
    if (sp > 0 && sp < first) start = sp + 1;
  }
  let piece = flat.slice(start, start + 190);
  if (start + 190 < flat.length) {
    const sp = piece.lastIndexOf(' ');
    if (sp > 120) piece = piece.slice(0, sp);
  }
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(${terms.map(esc).join('|')})[\\p{L}\\p{N}_]*`, 'giu');
  const marked = piece.replace(re, (m) => `<mark>${m}</mark>`);
  return `${start > 0 ? '… ' : ''}${marked}${start + 190 < flat.length ? ' …' : ''}`;
}

function toHit(m: MsgRec, ch: ChannelRec, rank: number, snip: string): ChatSearchHit {
  const p = ch.projectId ? projects().get(ch.projectId) : null;
  return {
    id: m.id,
    channelId: ch.id,
    channelName: ch.name,
    projectId: ch.projectId ?? null,
    projectSlug: p?.slug ?? null,
    projectTitle: p?.title ?? null,
    authorId: m.authorId,
    authorName: users().get(m.authorId)?.name ?? 'Deleted user',
    snippet: snip,
    rank,
    createdAt: m.createdAt,
  };
}

export function searchChannels(q: string, channels: ChannelRec[], limit: number, cursor?: string): { hits: ChatSearchHit[]; nextCursor: string | null } {
  const terms = termsOf(q);
  if (!terms.length || !channels.length) return { hits: [], nextCursor: null };
  const test = matcher(terms);
  const found: { m: MsgRec; ch: ChannelRec; rank: number; text: string }[] = [];
  for (const ch of channels) {
    for (const m of channelMsgs(ch.id)) {
      if (m.deletedAt || !m.markdown) continue;
      if (cursor && m.createdAt >= cursor) continue;
      const lower = m.markdown.toLowerCase();
      if (!terms.every((t) => lower.includes(t))) continue;
      const text = plain(m.markdown);
      if (!test(text)) continue;
      let rank = 0;
      for (const t of terms) rank += (text.toLowerCase().split(t).length - 1) * 0.1;
      found.push({ m, ch, rank: Math.round((0.05 + rank) * 1000) / 1000, text });
    }
  }
  found.sort((a, b) => b.rank - a.rank || (a.m.createdAt < b.m.createdAt ? 1 : -1));
  const hasMore = found.length > limit;
  const page = found.slice(0, limit);
  const hits = page.map((f) => toHit(f.m, f.ch, f.rank, snippet(f.text, terms)));
  return { hits, nextCursor: hasMore ? hits[hits.length - 1]!.createdAt : null };
}

const regular = (c: ChannelRec) => !c.isVoiceThread;

export function channelsForScope(scope: string, channelId?: string, projectId?: string): ChannelRec[] {
  const ok = new Set(accessibleProjectIds());
  const all = chatChannels().all();
  if (scope === 'channel') {
    if (!channelId) throw badRequest('channelId is required for channel-scoped search.');
    const c = chatChannels().get(channelId);
    if (!c) return [];
    if (!c.projectId || ok.has(c.projectId)) return [c];
    return [];
  }
  if (scope === 'project') {
    if (!projectId) throw badRequest('projectId is required for project-scoped search.');
    if (!ok.has(projectId)) return [];
    return all.filter((c) => c.projectId === projectId && regular(c));
  }
  return all.filter((c) => regular(c) && (!c.projectId || ok.has(c.projectId)));
}

export function runSearch(params: URLSearchParams): ChatSearchResponse {
  const scope = params.get('scope') as 'channel' | 'project' | 'global' | null;
  if (scope !== 'channel' && scope !== 'project' && scope !== 'global') throw badRequest('scope must be channel, project or global.');
  const q = (params.get('q') ?? '').trim();
  if (!q) return { scope, query: q, hits: [], nextCursor: null };
  const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '30', 10) || 30, 1), 100);
  const cursor = params.get('cursor') ?? undefined;
  if (cursor && Number.isNaN(new Date(cursor).getTime())) throw badRequest('Invalid cursor.');
  const channels = channelsForScope(scope, params.get('channelId') ?? undefined, params.get('projectId') ?? undefined);
  const { hits, nextCursor } = searchChannels(q, channels, limit, cursor);
  return { scope, query: q, hits, nextCursor };
}
