/**
 * /users/me*, /users?q=, bookmarks, dashboard and "For me".
 * Mirrors apps/backend/src/modules/users/users.service.ts.
 */
import { avatarDataUri } from '../assets';
import { presign, resolveBlobUrl } from '../blobs';
import { LS_SESSION, ME_ID } from '../config';
import { contracts } from '../contracts';
import { me } from '../access';
import { rolesOf } from './admin-rbac';
import { nowIso } from '../clock';
import { badRequest, del, get, HttpError, intParam, notFound, paginate, patch, post, type Req } from '../http';
import { newId } from '../prng';
import { bookmarks, contributions, invites, members, notifications, projects, users } from '../store';
import type { BookmarkRec, UserRec } from '../schema';
import { THEMES } from '@/lib/themes/registry';
import {
  meExtraTable,
  projectBrief,
  roleOf,
  userRolesOf,
  type MeExtraRec,
} from './app-shared';

const THEME_IDS = new Set(THEMES.map((t) => t.id));
const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

function extra(): MeExtraRec {
  let ex = meExtraTable().get(ME_ID);
  if (!ex) {
    ex = {
      id: ME_ID,
      consentAcceptedAt: null,
      passwordChangedAt: null,
      lastLoginAt: nowIso(),
    };
    meExtraTable().insert(ex);
  }
  return ex;
}

/** The full `GET /users/me` shape (also returned by PATCH/avatar routes so every cache entry stays complete). */
export function meProfile() {
  const u = me();
  const ex = extra();
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    isAdmin: u.isAdmin,
    createdAt: u.createdAt,
    lastLoginAt: ex.lastLoginAt,
    phone: u.phone,
    phoneVerified: u.phoneVerified,
    emailVerified: u.emailVerified,
    themeId: u.themeId,
    themeMode: u.themeMode,
    consentAcceptedAt: ex.consentAcceptedAt,
    passwordChangedAt: ex.passwordChangedAt,
    userRoles: userRolesOf(u).map((role) => ({ userId: u.id, roleId: role.id, grantedAt: u.createdAt, role })),
  };
}

/** Keep the stored session snapshot (header fallback before /users/me resolves) in step with the profile. */
function syncStoredSession(u: UserRec) {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (!s?.user) return;
    s.user.name = u.name;
    s.user.avatarUrl = u.avatarUrl;
    localStorage.setItem(LS_SESSION, JSON.stringify(s));
  } catch {
    /* storage unavailable or quota exceeded: /users/me stays the source of truth */
  }
}

get('/users/me', () => meProfile());

patch('/users/me', (req) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const u = me();
  if (b.bio !== undefined) {
    if (typeof b.bio !== 'string') throw badRequest('bio must be a string');
    if (b.bio.length > 280) throw badRequest('bio must be shorter than or equal to 280 characters');
    u.bio = b.bio;
  }
  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || !b.name.trim()) throw badRequest('name must not be empty');
    if (b.name.length > 120) throw badRequest('name must be shorter than or equal to 120 characters');
    u.name = b.name.trim();
  }
  if (b.themeId !== undefined) {
    if (b.themeId !== null && !(typeof b.themeId === 'string' && THEME_IDS.has(b.themeId))) {
      throw badRequest('themeId must be one of the following values: ' + [...THEME_IDS].join(', '));
    }
    u.themeId = b.themeId as string | null;
  }
  if (b.themeMode !== undefined) {
    if (!['light', 'dark', 'system'].includes(String(b.themeMode))) {
      throw badRequest('themeMode must be one of the following values: light, dark, system');
    }
    u.themeMode = String(b.themeMode);
  }
  if (b.avatarS3Key !== undefined && b.avatarS3Key !== null && b.avatarS3Key !== '') {
    const key = String(b.avatarS3Key);
    if (!key.startsWith('avatars/')) throw badRequest('Invalid avatar key.');
    u.avatarUrl = resolveBlobUrl(key, 'Avatar');
  }
  users().save(u);
  syncStoredSession(u);
  return meProfile();
});

// ─── Avatar ─────────────────────────────────────────────────────────────

post('/users/me/avatar/presign', (req) => {
  const contentType = String(req.body?.contentType ?? '');
  const len = req.body?.contentLength;
  if (!AVATAR_MIME.has(contentType)) {
    throw badRequest('Avatar must be an image: image/jpeg, image/png, image/webp, or image/gif.');
  }
  if (typeof len === 'number' && len > AVATAR_MAX_BYTES) throw badRequest('Avatar must be at most 5 MB.');
  const ext = contentType === 'image/png' ? '.png' : contentType === 'image/webp' ? '.webp' : contentType === 'image/gif' ? '.gif' : '.jpg';
  const p = presign('avatars', `avatar${ext}`, contentType);
  return { uploadUrl: p.uploadUrl, expiresIn: p.expiresIn, objectKey: p.s3Key };
});

del('/users/me/avatar', () => {
  const u = me();
  // The real backend falls back to a Gravatar identicon; the demo's equivalent is the generated initials avatar.
  u.avatarUrl = avatarDataUri(u.name, u.id);
  users().save(u);
  syncStoredSession(u);
  return meProfile();
});

/** Tiny MD5 (Gravatar addresses are md5 of the email; SubtleCrypto has no MD5). */
function md5(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const K = new Uint32Array(64);
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  const len = bytes.length;
  const padded = new Uint8Array((((len + 8) >> 6) + 1) << 6);
  padded.set(bytes);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, (len * 8) >>> 0, true);
  dv.setUint32(padded.length - 4, Math.floor((len * 8) / 4294967296), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < padded.length; off += 64) {
    const M = new Uint32Array(16);
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i]! + M[g]!) >>> 0;
      A = D; D = C; C = B;
      const s = S[(i >> 4) * 4 + (i % 4)]!;
      B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const ov = new DataView(out.buffer);
  ov.setUint32(0, a0, true); ov.setUint32(4, b0, true); ov.setUint32(8, c0, true); ov.setUint32(12, d0, true);
  return Array.from(out, (b) => b.toString(16).padStart(2, '0')).join('');
}

post('/users/me/avatar/gravatar', async (req) => {
  const u = me();
  const email = String(req.body?.email || u.email).toLowerCase().trim();
  const none = () => badRequest('No Gravatar image found for this email.');
  // The demo is the one place a real network call happens (user-initiated, only the md5 of the address is sent).
  if (typeof window === 'undefined' || /@halcyon\.example$/i.test(email)) throw none();
  try {
    const res = await fetch(`https://www.gravatar.com/avatar/${md5(email)}?d=404&s=512`);
    if (!res.ok) throw none();
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    u.avatarUrl = dataUrl;
    users().save(u);
    syncStoredSession(u);
    return meProfile();
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw none();
  }
});

post('/users/me/consent', () => {
  const ex = extra();
  ex.consentAcceptedAt = nowIso();
  meExtraTable().save(ex);
  return { acceptedAt: ex.consentAcceptedAt };
});

get('/users/me/roles', () => rolesOf(me()));

// ─── Bookmarks ──────────────────────────────────────────────────────────

get('/users/me/bookmarks', () =>
  bookmarks()
    .where('userId', ME_ID)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((b) => {
      const p = projects().get(b.projectId);
      return p ? [projectBrief(p)] : [];
    })
    .map(({ archivedAt: _a, ...brief }) => brief),
);

post('/users/me/bookmarks/:projectId', (req) => {
  const p = projects().get(req.params.projectId!);
  if (!p) throw notFound('Project not found.');
  const exists = bookmarks().where('userId', ME_ID).find((b) => b.projectId === p.id);
  if (!exists) {
    const rec: BookmarkRec = { id: newId('bkm'), userId: ME_ID, projectId: p.id, createdAt: nowIso() };
    bookmarks().insert(rec);
  }
  return { bookmarked: true };
});

del('/users/me/bookmarks/:projectId', (req) => {
  for (const b of [...bookmarks().where('userId', ME_ID)]) {
    if (b.projectId === req.params.projectId) bookmarks().remove(b.id);
  }
  return { bookmarked: false };
});

// ─── Dashboard ──────────────────────────────────────────────────────────

get('/users/me/dashboard', () => {
  const mine = members()
    .where('userId', ME_ID)
    .slice()
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  const managed: ReturnType<typeof projectBrief>[] = [];
  const contributing: ReturnType<typeof projectBrief>[] = [];
  for (const m of mine) {
    const p = projects().get(m.projectId);
    if (!p) continue;
    (m.role === 'PROJECT_MANAGER' ? managed : contributing).push(projectBrief(p));
  }
  const pendingRequests = contributions()
    .where('userId', ME_ID)
    .filter((c) => c.status === 'PENDING')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((c) => {
      const p = projects().get(c.projectId);
      if (!p) return [];
      return [
        {
          id: c.id,
          role: c.role,
          message: c.message,
          createdAt: c.createdAt,
          project: {
            id: p.id,
            slug: p.slug,
            title: p.title,
            shortDescription: p.shortDescription,
            thumbnailUrl: p.thumbnailUrl,
            thumbnailType: p.thumbnailType,
          },
        },
      ];
    });
  const bms = bookmarks()
    .where('userId', ME_ID)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)
    .flatMap((b) => {
      const p = projects().get(b.projectId);
      if (!p) return [];
      const { archivedAt: _a, visibility: _v, ...brief } = projectBrief(p);
      return [brief];
    });
  return {
    managed,
    contributing,
    pendingRequests,
    bookmarks: bms,
    myOpenTasks: contracts.pmo?.myOpenTasks(ME_ID, 10) ?? [],
  };
});

// ─── "For me" ───────────────────────────────────────────────────────────

get('/users/me/for-me', () => {
  const notes = notifications()
    .where('userId', ME_ID)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tasks = contracts.pmo?.forMeTasks(ME_ID) ?? { overdue: [], dueToday: [], open: [] };
  const chatUnread = (contracts.chat?.unreadSummary(ME_ID) ?? [])
    .slice()
    .sort((a, b) => b.unread - a.unread)
    .slice(0, 10);
  const pendingInvites = invites()
    .where('invitedUserId', ME_ID)
    .filter((i) => i.status === 'PENDING')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .flatMap((i) => {
      const p = projects().get(i.projectId);
      if (!p) return [];
      return [
        {
          id: i.id,
          role: i.role,
          title: i.title,
          createdAt: i.createdAt,
          project: { id: p.id, slug: p.slug, title: p.title, thumbnailUrl: p.thumbnailUrl },
        },
      ];
    });
  const pendingRequests = contributions()
    .where('userId', ME_ID)
    .filter((c) => c.status === 'PENDING')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .flatMap((c) => {
      const p = projects().get(c.projectId);
      return p
        ? [{ id: c.id, role: c.role, createdAt: c.createdAt, project: { id: p.id, slug: p.slug, title: p.title } }]
        : [];
    });
  return {
    tasks: {
      overdue: tasks.overdue,
      dueToday: tasks.dueToday,
      open: tasks.open,
    },
    chatUnread,
    notifications: { unread: notes.filter((n) => !n.readAt).length, recent: notes.slice(0, 6) },
    invites: pendingInvites,
    pendingRequests,
    recentActivity: contracts.pmo?.recentActivity(ME_ID, 12) ?? [],
  };
});

// ─── People search (invite dialog, mentions pickers) ────────────────────

get('/users', (req: Req) => {
  const q = (req.query.get('q') ?? '').trim().toLowerCase();
  const page = intParam(req.query, 'page', 1, 100000);
  const pageSize = intParam(req.query, 'pageSize', 24, 100);
  const rows = users()
    .all()
    .filter((u) => !u.suspendedAt && (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const out = paginate(rows, page, pageSize);
  return {
    items: out.items.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      suspendedAt: u.suspendedAt,
      suspendedReason: null,
      roles: u.roles.map((c) => ({ code: c, name: roleOf(c).name })),
    })),
    meta: out.meta,
  };
});

