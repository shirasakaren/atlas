/**
 * /projects: discovery list, featured, detail, create/update/archive/delete,
 * leave, and the media gallery. Mirrors projects.service.ts + media.service.ts.
 */
import { presign, resolveBlobUrl } from '../blobs';
import { ME_ID } from '../config';
import { contracts } from '../contracts';
import { accessFor, assertAdmin, assertManager, projectBySlugOrId, resolveProject } from '../access';
import { nowIso } from '../clock';
import { badRequest, del, forbidden, get, intParam, notFound, patch, post } from '../http';
import { newId, slugify } from '../prng';
import type { MediaRec, MemberRec, ProjectKind, ProjectRec } from '../schema';
import { bookmarks, media, members, projects, tags, users } from '../store';
import type { ProjectPhase, ProjectVisibility } from '@/lib/types';
import {
  featuredTable,
  prevPhaseTable,
  projectCard,
  projectDetail,
  purgeProject,
  requireString,
  sortedMedia,
  toProjectMedia,
  visibleTo,
} from './app-shared';

const PHASES: ProjectPhase[] = ['IDEA', 'PLANNING', 'IN_DEVELOPMENT', 'IN_REVIEW', 'SHIPPED', 'ARCHIVED'];
const VISIBILITIES: ProjectVisibility[] = ['PUBLIC', 'PRIVATE'];
const MAX_GALLERY = 10;
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];

// ─── Listing ────────────────────────────────────────────────────────────

export interface ListFilters {
  q?: string;
  phase?: string[];
  tagIds?: string[];
  recruitingFor?: string;
  archived?: boolean;
  bookmarkedOnly?: boolean;
  sort?: string;
  page: number;
  pageSize: number;
}

const csv = (v: string | null): string[] =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

function filtersFrom(q: URLSearchParams): ListFilters {
  return {
    q: q.get('q') ?? undefined,
    phase: csv(q.get('phase')),
    tagIds: csv(q.get('tagIds')),
    recruitingFor: q.get('recruitingFor') ?? undefined,
    archived: q.get('archived') === 'true',
    bookmarkedOnly: q.get('bookmarkedOnly') === 'true',
    sort: q.get('sort') ?? undefined,
    page: intParam(q, 'page', 1, 1_000_000),
    pageSize: intParam(q, 'pageSize', 24, 60),
  };
}

export function listProjects(f: ListFilters) {
  const term = f.q?.trim().toLowerCase();
  const bookmarkIds = f.bookmarkedOnly ? bookmarkedIds() : null;
  const tagNameById = new Map(tags().all().map((t) => [t.id, t.name.toLowerCase()]));

  const matches = (p: ProjectRec): boolean => {
    if (!visibleTo(p)) return false;
    if (f.archived ? !p.archivedAt : !!p.archivedAt) return false;
    if (term) {
      const hit =
        p.title.toLowerCase().includes(term) ||
        p.shortDescription.toLowerCase().includes(term) ||
        p.tagIds.some((id) => tagNameById.get(id)?.includes(term));
      if (!hit) return false;
    }
    if (f.phase?.length && !f.phase.includes(p.phase)) return false;
    if (f.tagIds?.length && !p.tagIds.some((id) => f.tagIds!.includes(id))) return false;
    if (f.recruitingFor?.trim() && !p.collaborationRoles.includes(f.recruitingFor.trim())) return false;
    if (bookmarkIds && !bookmarkIds.has(p.id)) return false;
    return true;
  };

  const cmp = ((): ((a: ProjectRec, b: ProjectRec) => number) => {
    switch (f.sort) {
      case 'oldest':
        return (a, b) => a.createdAt.localeCompare(b.createdAt);
      case 'recently-updated':
        return (a, b) => b.updatedAt.localeCompare(a.updatedAt);
      case 'title':
        return (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      default:
        return (a, b) => b.createdAt.localeCompare(a.createdAt);
    }
  })();

  // Pinned projects float to the top of the unfiltered default view only.
  const pinnedAllowed =
    !term && !f.phase?.length && !f.tagIds?.length && !f.recruitingFor && !f.bookmarkedOnly && !f.archived;
  const pinned = pinnedAllowed
    ? featuredTable()
        .all()
        .slice()
        .sort((a, b) => a.order - b.order)
        .flatMap((fr) => {
          const p = projects().get(fr.id);
          return p && visibleTo(p) ? [p] : [];
        })
    : [];
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const offset = pinned.length;

  const rest = projects()
    .all()
    .filter((p) => !pinnedIds.has(p.id) && matches(p))
    .sort(cmp);

  const skip = Math.max(0, (f.page - 1) * f.pageSize - offset);
  const take = Math.max(0, f.pageSize - (f.page === 1 ? offset : 0));
  const rows = [...(f.page === 1 ? pinned : []), ...rest.slice(skip, skip + take)].map(projectCard);

  const total = rest.length + offset;
  return {
    items: rows,
    meta: { page: f.page, pageSize: f.pageSize, total, totalPages: Math.max(1, Math.ceil(total / f.pageSize)) },
  };
}

function bookmarkedIds(): Set<string> {
  return new Set(bookmarks().where('userId', ME_ID).map((b) => b.projectId));
}

get('/projects', (req) => listProjects(filtersFrom(req.query)));

get('/projects/featured', () =>
  featuredTable()
    .all()
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((fr) => {
      const p = projects().get(fr.id);
      if (!p) return [];
      return [{ projectId: p.id, order: fr.order, setById: ME_ID, setAt: fr.setAt, project: projectCard(p) }];
    }),
);

post('/projects/featured', (req) => {
  assertAdmin();
  const ids = req.body?.projectIds;
  if (!Array.isArray(ids)) throw badRequest('projectIds must be an array');
  if (ids.length > 12) throw badRequest('At most 12 featured projects.');
  const ordered = ids.filter(
    (id, i): id is string => typeof id === 'string' && ids.indexOf(id) === i && !!projects().get(id) && !projects().get(id)!.archivedAt,
  );
  for (const fr of [...featuredTable().all()]) if (!ordered.includes(fr.id)) featuredTable().remove(fr.id);
  const at = nowIso();
  ordered.forEach((id, order) => {
    const cur = featuredTable().get(id);
    if (cur) featuredTable().update(id, { order, setAt: at });
    else featuredTable().insert({ id, order, setAt: at });
  });
  for (const p of projects().all()) {
    const should = ordered.includes(p.id);
    if (p.pinned !== should) {
      p.pinned = should;
      projects().save(p);
    }
  }
  return { featured: ordered };
});

// ─── Detail ─────────────────────────────────────────────────────────────

get('/projects/:slug', (req) => {
  const { project, access } = resolveProject(req.params.slug!);
  return projectDetail(project, access);
});

// ─── Create / update ────────────────────────────────────────────────────

/** Replace not-yet-resolved upload URLs inside a Tiptap document with their stored data URLs. */
function resolveDocBlobs<T>(node: T): T {
  if (Array.isArray(node)) return node.map(resolveDocBlobs) as unknown as T;
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'src' && typeof v === 'string' && (v.startsWith('demo-blob://') || v.startsWith('demo-upload://'))) {
        out[k] = resolveBlobUrl(v, 'Image');
      } else out[k] = resolveDocBlobs(v);
    }
    return out as T;
  }
  return node;
}

function stringArray(v: unknown, field: string, max: number): string[] {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw badRequest(`${field} must be an array of strings`);
  if (v.length > max) throw badRequest(`${field} must contain no more than ${max} elements`);
  return v as string[];
}

function cleanLinks(v: unknown): ProjectRec['internalLinks'] {
  if (v == null) return null;
  if (typeof v !== 'object') throw badRequest('internalLinks must be an object');
  const out: Record<string, string> = {};
  for (const k of ['pmTool', 'repository', 'staging', 'designs'] as const) {
    const val = (v as Record<string, unknown>)[k];
    if (val === undefined || val === null || val === '') continue;
    if (typeof val !== 'string' || val.length > 512) throw badRequest(`internalLinks.${k} must be a string`);
    out[k] = val;
  }
  return out;
}

const KIND_BY_TAG: Record<string, ProjectKind> = {
  Mobile: 'mobile',
  Data: 'data',
  Security: 'security',
  Finance: 'finance',
  People: 'people',
  Marketing: 'marketing',
  Operations: 'operations',
  Legal: 'legal',
  Research: 'research',
  'Supply Chain': 'supply-chain',
  'Customer Experience': 'customer',
};

function inferKind(tagIds: string[]): ProjectKind {
  for (const id of tagIds) {
    const k = KIND_BY_TAG[tags().get(id)?.name ?? ''];
    if (k) return k;
  }
  return 'software';
}

function uniqueSlug(title: string): string {
  const base = slugify(title) || 'project';
  let slug = base;
  let n = 2;
  while (projects().where('slug', slug).length) slug = `${base}-${n++}`.slice(0, 64);
  return slug;
}

function uniqueKey(title: string): string {
  const words = title.toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
  let base = words.length >= 2 ? words.slice(0, 4).map((w) => w[0]).join('') : (words[0] ?? 'PRJ').slice(0, 4);
  if (base.length < 2) base = (base + 'PRJ').slice(0, 3);
  const used = new Set(projects().all().map((p) => p.key));
  let key = base;
  let n = 2;
  while (used.has(key)) key = `${base}${n++}`;
  return key;
}

post('/projects', (req) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const title = requireString(b.title, 'title', 2, 120);
  const shortDescription = requireString(b.shortDescription, 'shortDescription', 10, 280);
  if (!b.description || typeof b.description !== 'object' || Array.isArray(b.description)) {
    throw badRequest('description must be an object');
  }
  if (!PHASES.includes(b.phase as ProjectPhase)) throw badRequest('phase must be a valid enum value');
  if (!VISIBILITIES.includes(b.visibility as ProjectVisibility)) throw badRequest('visibility must be a valid enum value');
  const techStack = b.techStack === undefined ? [] : stringArray(b.techStack, 'techStack', 40);
  const collaborationRoles = b.collaborationRoles === undefined ? [] : stringArray(b.collaborationRoles, 'collaborationRoles', 20);
  const tagIds = (b.tagIds === undefined ? [] : stringArray(b.tagIds, 'tagIds', 40)).filter((id) => tags().has(id));

  const now = nowIso();
  const owner = users().get(ME_ID);
  const rec: ProjectRec = {
    id: newId('prj'),
    slug: uniqueSlug(title),
    title,
    shortDescription,
    description: resolveDocBlobs(b.description as Record<string, unknown>),
    thumbnailUrl: null,
    thumbnailType: null,
    techStack,
    phase: b.phase as ProjectPhase,
    visibility: b.visibility as ProjectVisibility,
    collaborationRoles,
    archivedAt: null,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    ownerId: ME_ID,
    tagIds,
    pinned: false,
    internalLinks: cleanLinks(b.internalLinks),
    kind: inferKind(tagIds),
    department: owner?.department ?? 'Transformation Office',
    key: uniqueKey(title),
  };
  projects().insert(rec);
  const mem: MemberRec = { id: newId('mem'), projectId: rec.id, userId: ME_ID, role: 'PROJECT_MANAGER', title: null, joinedAt: now };
  members().insert(mem);
  // Default task list / #general channel, owned by the other domains.
  contracts.pmo?.onProjectCreated?.(rec);
  contracts.chat?.onProjectCreated?.(rec);
  return { ...rec };
});

patch('/projects/:id', (req) => {
  const p = projectBySlugOrId(req.params.id!);
  assertManager(accessFor(p));
  const b = (req.body ?? {}) as Record<string, unknown>;
  if (b.title !== undefined) p.title = requireString(b.title, 'title', 2, 120);
  if (b.shortDescription !== undefined) p.shortDescription = requireString(b.shortDescription, 'shortDescription', 10, 280);
  if (b.description !== undefined) {
    if (!b.description || typeof b.description !== 'object' || Array.isArray(b.description)) {
      throw badRequest('description must be an object');
    }
    p.description = resolveDocBlobs(b.description as Record<string, unknown>);
  }
  if (b.techStack !== undefined) p.techStack = stringArray(b.techStack, 'techStack', 40);
  if (b.phase !== undefined) {
    if (!PHASES.includes(b.phase as ProjectPhase)) throw badRequest('phase must be a valid enum value');
    p.phase = b.phase as ProjectPhase;
  }
  if (b.visibility !== undefined) {
    if (!VISIBILITIES.includes(b.visibility as ProjectVisibility)) throw badRequest('visibility must be a valid enum value');
    p.visibility = b.visibility as ProjectVisibility;
  }
  if (b.collaborationRoles !== undefined) p.collaborationRoles = stringArray(b.collaborationRoles, 'collaborationRoles', 20);
  if (b.internalLinks !== undefined) p.internalLinks = cleanLinks(b.internalLinks);
  if (b.tagIds !== undefined) p.tagIds = stringArray(b.tagIds, 'tagIds', 40).filter((id) => tags().has(id));
  p.updatedAt = nowIso();
  projects().save(p);
  return { ...p };
});

post('/projects/:id/archive', (req) => {
  const p = projectBySlugOrId(req.params.id!);
  assertManager(accessFor(p));
  if (p.phase !== 'ARCHIVED') prevPhaseTable().insert({ id: p.id, phase: p.phase });
  p.archivedAt = nowIso();
  p.phase = 'ARCHIVED';
  p.updatedAt = p.archivedAt;
  projects().save(p);
  featuredTable().remove(p.id);
  return { ...p };
});

post('/projects/:id/unarchive', (req) => {
  const p = projectBySlugOrId(req.params.id!);
  assertManager(accessFor(p));
  p.archivedAt = null;
  // The real API leaves the phase untouched; restoring the previous one avoids an "Archived" badge on a live project.
  const prev = prevPhaseTable().get(p.id);
  p.phase = (prev?.phase as ProjectPhase | undefined) ?? (p.phase === 'ARCHIVED' ? 'IN_DEVELOPMENT' : p.phase);
  if (prev) prevPhaseTable().remove(p.id);
  p.updatedAt = nowIso();
  projects().save(p);
  return { ...p };
});

del('/projects/:id', (req) => {
  const p = projectBySlugOrId(req.params.id!);
  const a = accessFor(p);
  if (a.level !== 'admin' && a.level !== 'manager') {
    throw forbidden('Only Project Managers or Admins may delete a project.');
  }
  purgeProject(p.id);
  return { deleted: true };
});

post('/projects/:slug/leave', (req) => {
  const { project, access } = resolveProject(req.params.slug!);
  if (!access.isInsider) throw forbidden('Project membership required.');
  const mem = members().where('projectId', project.id).find((m) => m.userId === ME_ID);
  if (!mem) return { left: true };
  if (mem.role === 'PROJECT_MANAGER') {
    const others = members().where('projectId', project.id).filter((m) => m.role === 'PROJECT_MANAGER' && m.userId !== ME_ID).length;
    if (others === 0) {
      throw badRequest('Assign another Project Manager before leaving, someone has to manage this project.');
    }
  }
  members().remove(mem.id);
  contracts.chat?.onMemberChanged?.(project.id, ME_ID, 'removed');
  return { left: true };
});

// ─── Media gallery ──────────────────────────────────────────────────────

post('/projects/:projectId/media/presign', (req) => {
  const p = projectBySlugOrId(req.params.projectId!);
  assertManager(accessFor(p));
  const contentType = String(req.body?.contentType ?? '');
  const len = Number(req.body?.contentLength ?? 0);
  const isImage = IMAGE_MIME.includes(contentType);
  const isVideo = VIDEO_MIME.includes(contentType);
  if (!isImage && !isVideo) throw badRequest(`Unsupported media type: ${contentType}.`);
  const cap = isImage ? 10 * 1024 * 1024 : 200 * 1024 * 1024;
  if (len > cap) throw badRequest(`File exceeds the ${isImage ? 'image' : 'video'} limit of ${cap} bytes.`);
  const ext = contentType.split('/')[1]?.replace('quicktime', 'mov') ?? 'bin';
  const pre = presign(`projects/${p.id}`, `media.${ext}`, contentType);
  return {
    uploadUrl: pre.uploadUrl,
    expiresIn: pre.expiresIn,
    objectKey: pre.s3Key,
    publicUrl: pre.publicUrl,
    type: isImage ? 'IMAGE' : 'VIDEO',
  };
});

post('/projects/:projectId/media', (req) => {
  const p = projectBySlugOrId(req.params.projectId!);
  assertManager(accessFor(p));
  const b = (req.body ?? {}) as Record<string, unknown>;
  if (typeof b.url !== 'string' || !b.url) throw badRequest('url must be a string');
  if (b.type !== 'IMAGE' && b.type !== 'VIDEO') throw badRequest('type must be a valid enum value');
  let order = Number(b.order);
  if (!Number.isInteger(order) || order < 0) throw badRequest('order must not be less than 0');

  const existing = sortedMedia(p.id);
  if (existing.length >= MAX_GALLERY + 1) {
    throw badRequest(`A project can have at most ${MAX_GALLERY} gallery items + 1 thumbnail.`);
  }
  if (order === 0) {
    const old = existing.find((m) => m.order === 0);
    if (old) media().remove(old.id);
  } else if (existing.some((m) => m.order === order)) {
    order = (existing.length ? Math.max(...existing.map((m) => m.order)) : 0) + 1;
  }
  const url = resolveBlobUrl(b.url, 'Media');
  const rec: MediaRec = {
    id: newId('med'),
    projectId: p.id,
    url,
    type: b.type,
    order,
    width: typeof b.width === 'number' ? b.width : null,
    height: typeof b.height === 'number' ? b.height : null,
    sizeBytes: typeof b.sizeBytes === 'number' ? b.sizeBytes : null,
  };
  media().insert(rec);
  if (order === 0) {
    p.thumbnailUrl = url;
    p.thumbnailType = rec.type;
  }
  p.updatedAt = nowIso();
  projects().save(p);
  return { ...toProjectMedia(rec), projectId: p.id };
});

patch('/projects/:projectId/media/reorder', (req) => {
  const p = projectBySlugOrId(req.params.projectId!);
  assertManager(accessFor(p));
  const ids = req.body?.orderedIds;
  if (!Array.isArray(ids)) throw badRequest('orderedIds must be an array');
  const mine = new Map(media().where('projectId', p.id).map((m) => [m.id, m]));
  if (ids.some((id) => !mine.has(id))) throw forbidden('Some media items do not belong to this project.');
  ids.forEach((id, i) => {
    const m = mine.get(id)!;
    m.order = i;
    media().save(m);
  });
  const all = sortedMedia(p.id);
  const head = all.find((m) => m.order === 0);
  p.thumbnailUrl = head?.url ?? null;
  p.thumbnailType = head?.type ?? null;
  projects().save(p);
  return all.map((m) => ({ ...toProjectMedia(m), projectId: p.id }));
});

del('/projects/:projectId/media/:mediaId', (req) => {
  const p = projectBySlugOrId(req.params.projectId!);
  assertManager(accessFor(p));
  const m = media().get(req.params.mediaId!);
  if (!m || m.projectId !== p.id) throw notFound('Media not found.');
  media().remove(m.id);
  if (m.order === 0) {
    const next = sortedMedia(p.id)[0];
    p.thumbnailUrl = next?.url ?? null;
    p.thumbnailType = next?.type ?? null;
    projects().save(p);
  }
  return { deleted: true };
});
