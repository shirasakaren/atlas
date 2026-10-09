/**
 * Admin chat endpoints: sticker library + server avatars.
 */
import { assertAdmin, meId, requireBody } from '../access';
import { presign, resolveBlobUrl } from '../blobs';
import { nowIso } from '../clock';
import { badRequest, del, get, notFound, patch, post, put } from '../http';
import { newId, slugify } from '../prng';
import { projects } from '../store';
import { chatAvatars, chatPacks, chatStickers, type StickerPackRec } from '../seed/chat-schema';

const stickersOf = (packId: string) =>
  chatStickers()
    .where('packId', packId)
    .slice()
    .sort((a, b) => a.position - b.position);

const adminPack = (p: StickerPackRec) => {
  const stickers = stickersOf(p.id).map((s) => ({ id: s.id, name: s.name, keywords: s.keywords, url: s.url, mime: s.mime, width: s.width, height: s.height }));
  return { ...p, stickers, _count: { stickers: stickers.length } };
};

const pack = (id: string): StickerPackRec => {
  const p = chatPacks().get(id);
  if (!p) throw notFound('Sticker pack not found.');
  return p;
};

get('/admin/stickers/packs', () => {
  assertAdmin();
  return chatPacks()
    .all()
    .slice()
    .sort((a, b) => Number(a.isArchived) - Number(b.isArchived) || (a.createdAt < b.createdAt ? 1 : -1))
    .map(adminPack);
});

post('/admin/stickers/packs', (req) => {
  assertAdmin();
  const b = requireBody<{ name?: string; description?: string }>(req);
  if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 60) throw badRequest('name must be between 1 and 60 characters');
  if (b.description && b.description.length > 200) throw badRequest('description must be shorter than or equal to 200 characters');
  const now = nowIso();
  const p = chatPacks().insert({
    id: newId('stkp'),
    name: b.name.trim(),
    slug: `${slugify(b.name)}-${Math.random().toString(36).slice(2, 6)}`,
    description: b.description?.trim() || null,
    isArchived: false,
    createdById: meId(),
    createdAt: now,
    updatedAt: now,
  });
  return adminPack(p);
});

patch('/admin/stickers/packs/:packId', (req) => {
  assertAdmin();
  const p = pack(req.params.packId!);
  const b = requireBody<{ name?: string; description?: string }>(req);
  if (b.name !== undefined) {
    if (!b.name.trim() || b.name.length > 60) throw badRequest('name must be between 1 and 60 characters');
    p.name = b.name.trim();
  }
  if (b.description !== undefined) p.description = b.description.trim() || null;
  p.updatedAt = nowIso();
  return adminPack(chatPacks().save(p));
});

for (const [suffix, archived] of [['archive', true], ['unarchive', false]] as const) {
  post(`/admin/stickers/packs/:packId/${suffix}`, (req) => {
    assertAdmin();
    const p = pack(req.params.packId!);
    p.isArchived = archived;
    p.updatedAt = nowIso();
    return adminPack(chatPacks().save(p));
  });
}

post('/admin/stickers/packs/:packId/stickers/presign', (req) => {
  assertAdmin();
  const b = requireBody<{ contentType?: string; contentLength?: number; filename?: string }>(req);
  if (!['image/png', 'image/webp', 'image/gif', 'image/jpeg'].includes(b.contentType ?? '')) throw badRequest('Sticker must be PNG, WebP, GIF, or JPEG.');
  if ((b.contentLength ?? 0) > 10 * 1024 * 1024) throw badRequest('Sticker exceeds the 10485760-byte limit.');
  const p = pack(req.params.packId!);
  if (p.isArchived) throw badRequest('Cannot add stickers to an archived pack.');
  return presign(`stickers/${p.id}`, b.filename ?? 'sticker', b.contentType!);
});

post('/admin/stickers/packs/:packId/stickers', (req) => {
  assertAdmin();
  const p = pack(req.params.packId!);
  const b = requireBody<{ name?: string; keywords?: string[]; s3Key?: string; url?: string; mime?: string; width?: number; height?: number }>(req);
  if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 60) throw badRequest('name must be between 1 and 60 characters');
  if (!b.s3Key || !b.url || !b.mime) throw badRequest('s3Key, url and mime are required');
  const last = stickersOf(p.id).reduce((m, s) => Math.max(m, s.position), -1);
  return chatStickers().insert({
    id: newId('stk'),
    packId: p.id,
    name: b.name.trim(),
    keywords: (b.keywords ?? []).slice(0, 10),
    s3Key: b.s3Key,
    url: resolveBlobUrl(b.s3Key, b.name),
    mime: b.mime,
    width: b.width ?? null,
    height: b.height ?? null,
    position: last + 1,
    createdAt: nowIso(),
  });
});

del('/admin/stickers/stickers/:stickerId', (req) => {
  assertAdmin();
  if (!chatStickers().remove(req.params.stickerId!)) throw notFound('Sticker not found.');
  return { deleted: true };
});

// ─── Server avatars ───────────────────────────────────────────────────

const fields = (key: string) => {
  const a = chatAvatars().get(key);
  return a ? { emoji: a.emoji, color: a.color, imageUrl: a.imageUrl } : null;
};

get('/admin/chat/avatars', () => {
  assertAdmin();
  return {
    workspace: fields('workspace'),
    projects: [...projects().all()]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .map((p) => ({ id: p.id, slug: p.slug, title: p.title, avatar: fields(`project:${p.id}`) })),
  };
});

put('/admin/chat/avatars/:key', (req) => {
  assertAdmin();
  const key = req.params.key!;
  const b = requireBody<{ emoji?: string | null; color?: string | null; imageUrl?: string | null }>(req);
  if (b.emoji && [...b.emoji].length > 8) throw badRequest('Emoji must be at most 8 characters.');
  if (b.color && !/^#[0-9a-fA-F]{6}$/.test(b.color)) throw badRequest('Color must be a #rrggbb hex value.');
  if (b.imageUrl && b.imageUrl.length > 500) throw badRequest('Image URL is too long.');
  if (key !== 'workspace' && !key.startsWith('project:')) throw badRequest('Unknown chat avatar key.');
  if (key.startsWith('project:') && !projects().get(key.slice(8))) throw notFound('Project not found.');
  const rec = { id: key, emoji: b.emoji ?? null, color: b.color ?? null, imageUrl: b.imageUrl ?? null };
  chatAvatars().insert(rec);
  return { emoji: rec.emoji, color: rec.color, imageUrl: rec.imageUrl };
});

del('/admin/chat/avatars/:key', (req) => {
  assertAdmin();
  if (!chatAvatars().remove(req.params.key!)) throw notFound('No chat avatar override for this key.');
  return { removed: true };
});
