/**
 * Live simulation: while the tab is open, colleagues occasionally post
 * believable messages (typing indicator first, short bursts), react to what
 * the persona posts, answer questions and now and then @mention her.
 * Browser-only, started lazily on the first /chat socket connection, paused
 * while the tab is hidden, rate-capped.
 */
import { ME_ID } from '../config';
import { isDbReady, tbl } from '../db';
import { nowIso } from '../clock';
import { connectedSockets } from '../realtime';
import { createRng, type Rng } from '../prng';
import { notify } from '../notify';
import { accessibleProjectIds } from '../access';
import { projects, users } from '../store';
import { chatChannels, type ChannelRec, type MsgRec } from '../seed/chat-schema';
import { BASE_LEX, type Lex } from '../seed/chat-dsl';
import {
  buildBag,
  castPeople,
  drawScene,
  expandScene,
  makeReactions,
  toneFor,
  type GenCtx,
  type Member,
  type Person,
  type SceneBag,
  type TaskRef,
} from '../seed/chat-gen';
import { globalSpecs, kindLex, resolveRef } from '../seed/chat-libs';
import { mixFor } from '../seed/chat';
import { firstUrl, previewFor } from '../seed/chat-preview';
import { addMessage, channelMsgs, isMuted, lowerBound, newMessageId, recentAuthors, scopeOf } from './chat-store';
import * as pub from './chat-publish';

const MAX_SESSION = 140;
const MAX_PER_MINUTE = 7;
const MENTION_COOLDOWN = 3 * 60_000;

let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let sent = 0;
let stamps: number[] = [];
let lastMention = 0;
let rng: Rng | null = null;

const R = () => (rng ??= createRng(`chat-sim-${Date.now()}`));
const hidden = () => typeof document !== 'undefined' && document.hidden;

function budgetOk(): boolean {
  if (sent >= MAX_SESSION) return false;
  const t = Date.now();
  stamps = stamps.filter((s) => t - s < 60_000);
  return stamps.length < MAX_PER_MINUTE;
}
function spend() {
  sent++;
  stamps.push(Date.now());
}

export function startSim() {
  if (started || typeof window === 'undefined') return;
  started = true;
  schedule(R().int(9_000, 16_000));
}

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(tick, ms);
}

// ─── Context per channel ──────────────────────────────────────────────

interface SimCtx {
  ch: ChannelRec;
  ctx: GenCtx;
  bag: SceneBag;
  mentionBag: SceneBag;
  kind: string | null;
}
const ctxCache = new Map<string, SimCtx>();
const taskCache = new Map<string, TaskRef[]>();

function personOf(id: string): Person | null {
  const u = users().get(id);
  return u ? { id: u.id, name: u.name, first: u.name.split(' ')[0]!, off: 0, dept: u.department } : null;
}

function simCtx(ch: ChannelRec): SimCtx | null {
  const cached = ctxCache.get(ch.id);
  const authors = recentAuthors(ch.id);
  if (authors.length < 3) return null;
  const members: Member[] = authors
    .slice(0, 24)
    .map((id, i) => ({ p: personOf(id)!, w: 1 / Math.pow(i + 1, 0.7) }))
    .filter((m) => m.p);
  if (members.length < 3) return null;
  const maya = personOf(ME_ID);
  if (cached) {
    cached.ctx.members = members;
    cached.ctx.nowMs = Date.now();
    return cached;
  }
  const project = ch.projectId ? projects().get(ch.projectId) : null;
  let lex: Lex = { ...BASE_LEX };
  let mix: [string, number][];
  let own = {};
  if (project) {
    lex = { ...lex, ...kindLex(project.kind) };
    mix = mixFor(ch.name, project.kind);
    if (!taskCache.has(project.id)) {
      taskCache.set(
        project.id,
        tbl<{ id: string; key: string; title: string; projectId: string }>('pmoTasks')
          .where('projectId', project.id)
          .slice(0, 80)
          .map((t) => ({ key: t.key, title: t.title })),
      );
    }
  } else {
    const spec = globalSpecs().find((s) => s.name === ch.name);
    mix = spec?.mix ?? [['generic:social', 1], ['generic:question', 1]];
    own = spec?.pools ?? {};
    if (spec?.lex) lex = { ...lex, ...spec.lex };
  }
  const resolve = (ref: string) => resolveRef(ref, project?.kind ?? null, own);
  const all = projects().all();
  const ctx: GenCtx = {
    rng: R(),
    channel: ch.name,
    projTitle: project?.title ?? null,
    projKey: project?.key ?? null,
    projSlug: project?.slug ?? null,
    tasks: project ? (taskCache.get(project.id) ?? []) : [],
    members,
    maya,
    projects: project ? [] : all.slice(0, 30).map((p) => ({ title: p.title, key: p.key, slug: p.slug })),
    lex,
    nowMs: Date.now(),
  };
  const sc: SimCtx = {
    ch,
    ctx,
    bag: buildBag(mix, resolve, { mayaIn: false, noMayaTurns: true }),
    mentionBag: buildBag(mix, resolve, { mayaIn: true, noMayaTurns: true, onlyMentions: true }),
    kind: project?.kind ?? null,
  };
  ctxCache.set(ch.id, sc);
  return sc;
}

// ─── Channel choice ───────────────────────────────────────────────────

function viewedChannels(): string[] {
  const out = new Set<string>();
  for (const s of connectedSockets('/chat')) for (const r of s.rooms) if (r.startsWith('channel:')) out.add(r.slice(8));
  return [...out];
}

function visibleChannels(): ChannelRec[] {
  const ok = new Set(accessibleProjectIds());
  return chatChannels()
    .all()
    .filter((c) => !c.isArchived && !c.isVoiceThread && (!c.projectId || ok.has(c.projectId)));
}

function busyChannel(): ChannelRec | null {
  const r = R();
  const since = new Date(Date.now() - 72 * 3_600_000).toISOString();
  const cands = visibleChannels();
  let total = 0;
  const weights: number[] = [];
  for (const c of cands) {
    const arr = channelMsgs(c.id);
    const w = arr.length - lowerBound(arr, since) + 0.3;
    total += w;
    weights.push(total);
  }
  if (!cands.length) return null;
  const x = r.next() * total;
  let i = weights.findIndex((w) => w >= x);
  if (i < 0) i = cands.length - 1;
  return cands[i]!;
}

// ─── Playing scenes ───────────────────────────────────────────────────

function tick() {
  timer = null;
  if (!isDbReady() || hidden()) return schedule(12_000);
  if (!budgetOk()) return schedule(30_000);
  const r = R();
  try {
    const viewed = viewedChannels();
    let ch: ChannelRec | null = null;
    if (viewed.length && r.chance(0.7)) ch = chatChannels().get(r.pick(viewed)) ?? null;
    if (!ch || ch.isArchived) ch = busyChannel();
    if (ch) {
      const sc = simCtx(ch);
      if (sc) {
        const wantMention = !isMuted(scopeOf(ch)) && Date.now() - lastMention > MENTION_COOLDOWN && r.chance(0.14);
        const entry = (wantMention ? drawScene(sc.mentionBag, r) : null) ?? drawScene(sc.bag, r);
        if (entry && entry.scene.turns.length <= 5) {
          const cast = castPeople(sc.ctx, entry.scene.speakers);
          const turns = expandScene(sc.ctx, entry.scene, cast);
          playTurns(sc, turns, 0, null, entry.pool);
        }
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[demo chat sim]', e);
  }
  schedule(r.int(20_000, 60_000));
}

type Turns = ReturnType<typeof expandScene>;

function playTurns(sc: SimCtx, turns: Turns, i: number, prev: MsgRec | null, pool: string) {
  const t = turns[i];
  if (!t || !budgetOk()) return;
  const r = R();
  const viewing = viewedChannels().includes(sc.ch.id);
  const typingMs = Math.min(5500, 1200 + t.text.length * 28 + r.int(0, 900));
  if (viewing) pub.typing(true, sc.ch.id, t.who.id, t.who.name);
  setTimeout(
    () => {
      if (viewing) pub.typing(false, sc.ch.id, t.who.id, t.who.name);
      if (hidden() || !budgetOk()) return;
      const rec = postAs(sc.ch, t.who, t.text, t.turn.reply && prev ? prev : null);
      if (rec) {
        spend();
        if (t.turn.rx || r.chance(0.12)) scheduleReactions(rec, Array.isArray(t.turn.rx) ? t.turn.rx : toneFor(pool), sc.ctx.members);
        playTurns(sc, turns, i + 1, rec, pool);
      }
    },
    viewing ? typingMs : 400,
  );
}

function postAs(ch: ChannelRec, who: Person, text: string, replyTo: MsgRec | null): MsgRec | null {
  const rec: MsgRec = {
    id: newMessageId(),
    channelId: ch.id,
    authorId: who.id,
    kind: 'TEXT',
    createdAt: nowIso(),
    markdown: text,
  };
  if (replyTo) rec.replyToId = replyTo.id;
  const url = firstUrl(text);
  if (url && R().chance(0.7)) {
    const pv = previewFor(url);
    if (pv) rec.metadata = { linkPreviews: [{ url: pv.url, kind: 'link', title: pv.title, description: pv.description, imageUrl: pv.imageUrl, siteName: pv.siteName }] };
  }
  addMessage(rec);
  pub.messageCreated(rec);
  if (text.includes(`](${ME_ID})`) && !isMuted(scopeOf(ch))) {
    lastMention = Date.now();
    const project = ch.projectId ? projects().get(ch.projectId) : null;
    notify(ME_ID, {
      type: 'CHAT_MENTION',
      title: `@${who.name} mentioned you in #${ch.name}`,
      body: text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1').replace(/\s+/g, ' ').trim().slice(0, 200),
      link: project ? `/projects/${project.slug}/chat/${ch.id}?msg=${rec.id}` : `/chat/global/${ch.id}?msg=${rec.id}`,
      metadata: { messageId: rec.id, channelId: ch.id, projectId: ch.projectId },
    });
  }
  return rec;
}

export function addReactionTo(rec: MsgRec, emoji: string, userId: string): boolean {
  const list = (rec.reactions ??= []);
  let g = list.find((x) => x[0] === emoji);
  if (!g) list.push((g = [emoji, []]));
  if (g[1].includes(userId)) return false;
  g[1].push(userId);
  return true;
}

function scheduleReactions(rec: MsgRec, emojis: string[], members: Member[]) {
  const r = R();
  const groups = makeReactions(r, emojis, members, null, rec.authorId, 2);
  let delay = r.int(5_000, 14_000);
  for (const [emoji, ids] of groups) {
    for (const id of ids) {
      const d = delay;
      delay += r.int(1_500, 6_000);
      setTimeout(() => {
        if (hidden()) return;
        const cur = tbl<MsgRec>('chatMessages').get(rec.id);
        if (!cur || cur.deletedAt) return;
        if (addReactionTo(cur, emoji, id)) {
          tbl<MsgRec>('chatMessages').save(cur);
          pub.reaction(true, cur.channelId, cur.id, id, emoji);
        }
      }, d);
    }
  }
}

// ─── Reactions to the persona ─────────────────────────────────────────

const ACK = ['👍', 'Sounds good', 'Noted, thanks!', 'Makes sense to me', 'Agreed', 'On it', 'Thanks for the update', 'Got it 👍', 'Great, thanks for flagging', 'Will do', 'Appreciate the heads-up', 'Nice one', 'Love it', 'Perfect, thank you', 'Understood'];
const ANSWER = [
  'Good question. I believe so, but let me double-check and come back to you.',
  'Yes, that should be fine.',
  'I think so. I will confirm by end of day.',
  'Short answer: yes. Longer answer: it depends on the rollout, I will write it up.',
  'Checking now, will report back in a few minutes.',
  'Not yet, it is on the list for this week.',
  'Probably, but I would verify against the latest doc before relying on it.',
  'Let me look into it and get back to you shortly.',
  'Yes, the tracker is up to date as of this morning.',
  'Hmm, not sure. Let me ask around.',
];
const THANKS = ['Anytime!', 'Happy to help 🙂', 'No problem!', 'Glad that helped', 'You bet', 'Of course!', 'Anytime, shout if anything else comes up'];
const REACT = ['👍', '🙌', '👀', '✅', '🙏', '🎉', '❤️'];

/** Colleagues notice what the persona posts: reactions, and sometimes a reply. */
export function afterPersonaMessage(rec: MsgRec) {
  if (typeof window === 'undefined') return;
  const ch = chatChannels().get(rec.channelId);
  if (!ch || ch.isArchived) return;
  const r = R();
  const authors = recentAuthors(ch.id);
  if (authors.length < 2) return;
  const mentioned = [...rec.markdown.matchAll(/@\[[^\]]+\]\(([^)]+)\)/g)].map((m) => m[1]!).filter((id) => id !== ME_ID && users().get(id));
  const pool = (mentioned.length ? mentioned : []).concat(r.sample(authors.slice(0, 12), 3));
  const reactors = [...new Set(pool)].slice(0, r.int(1, 2));
  const text = rec.markdown;
  const emojis = /thank|thx|cheers|great work|well done|congrat/i.test(text) ? ['❤️', '🙌', '🎉'] : /\?/.test(text) ? ['👀', '👍'] : REACT;
  reactors.forEach((uid, k) => {
    setTimeout(() => {
      if (hidden()) return;
      const cur = tbl<MsgRec>('chatMessages').get(rec.id);
      if (!cur || cur.deletedAt) return;
      const emoji = emojis[Math.floor(R().next() * emojis.length)]!;
      if (addReactionTo(cur, emoji, uid)) {
        tbl<MsgRec>('chatMessages').save(cur);
        pub.reaction(true, cur.channelId, cur.id, uid, emoji);
      }
    }, r.int(3_500, 8_500) + k * r.int(1_500, 4_000));
  });
  const p = mentioned.length ? 0.85 : /\?/.test(text) ? 0.7 : 0.3;
  if (!r.chance(p) || !budgetOk()) return;
  const responder = personOf(mentioned[0] ?? authors[Math.floor(r.next() * Math.min(authors.length, 8))]!);
  if (!responder) return;
  const line = /thank|thx|cheers/i.test(text) ? r.pick(THANKS) : /\?/.test(text) ? r.pick(ANSWER) : r.pick(ACK);
  const viewing = viewedChannels().includes(ch.id);
  setTimeout(() => {
    if (viewing) pub.typing(true, ch.id, responder.id, responder.name);
    setTimeout(() => {
      if (viewing) pub.typing(false, ch.id, responder.id, responder.name);
      if (hidden() || !budgetOk()) return;
      const made = postAs(ch, responder, line, r.chance(0.5) ? rec : null);
      if (made) spend();
    }, r.int(1_800, 4_000));
  }, r.int(9_000, 20_000));
}
