/** PMO handlers: project files (folders, uploads via the demo blob store). */
import { ME_ID } from '../config';
import { badRequest, del, get, notFound, patch, post } from '../http';
import { presign, resolveBlobUrl } from '../blobs';
import { newId } from '../prng';
import { pmoFiles, type FileRec } from '../seed/pmo-store';
import { body, fileDto, nowIso, optString, pctx, reqString } from './pmo-shape';

const MAX_BYTES = 52_428_800;

function nodeOf(projectId: string, id: string): FileRec {
  const f = pmoFiles().get(id);
  if (!f || f.projectId !== projectId || f.deletedAt) throw notFound('File not found.');
  return f;
}

function assertFolder(projectId: string, id: string) {
  const f = pmoFiles().get(id);
  if (!f || f.projectId !== projectId || !f.isFolder || f.deletedAt) throw notFound('Folder not found.');
}

function children(projectId: string, parentId: string | null): FileRec[] {
  return pmoFiles().where('projectId', projectId).filter((f) => !f.deletedAt && f.parentFolderId === parentId);
}

function breadcrumb(projectId: string, folderId: string) {
  const chain: { id: string; name: string }[] = [];
  let cur: string | null = folderId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const n = pmoFiles().get(cur);
    if (!n || n.projectId !== projectId || n.deletedAt) break;
    chain.unshift({ id: n.id, name: n.name });
    cur = n.parentFolderId;
  }
  return chain;
}

function subtree(projectId: string, rootId: string): FileRec[] {
  const root = pmoFiles().get(rootId);
  if (!root) return [];
  const out = [root];
  let parents = root.isFolder ? [root.id] : [];
  while (parents.length) {
    const next: string[] = [];
    for (const p of parents) {
      for (const c of children(projectId, p)) {
        out.push(c);
        if (c.isFolder) next.push(c.id);
      }
    }
    parents = next;
  }
  return out;
}

get('/projects/:slug/files', (req) => {
  const { project } = pctx(req);
  const folderId = req.query.get('folderId');
  if (folderId) assertFolder(project.id, folderId);
  const items = children(project.id, folderId || null).sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return { folderId: folderId || null, breadcrumb: folderId ? breadcrumb(project.id, folderId) : [], items: items.map(fileDto) };
});

post('/projects/:slug/files/presign', (req) => {
  const { project } = pctx(req);
  const b = body(req);
  const filename = reqString(b.filename, 'filename', 1, 255);
  const contentType = reqString(b.contentType, 'contentType', 1, 127);
  if (typeof b.contentLength !== 'number' || !Number.isInteger(b.contentLength) || b.contentLength < 1) throw badRequest('contentLength must not be less than 1');
  if (b.contentLength > MAX_BYTES) throw badRequest(`File exceeds the ${MAX_BYTES}-byte limit.`);
  if (b.parentFolderId) assertFolder(project.id, String(b.parentFolderId));
  const p = presign(`projects/${project.id}/files`, filename, contentType);
  return { uploadUrl: p.uploadUrl, expiresIn: p.expiresIn, s3Key: p.s3Key, url: p.publicUrl };
});

post('/projects/:slug/files/folder', (req) => {
  const { project } = pctx(req);
  const b = body(req);
  const name = reqString(b.name, 'name', 1, 255);
  if (b.parentFolderId) assertFolder(project.id, String(b.parentFolderId));
  const now = nowIso();
  return fileDto(
    pmoFiles().insert({ id: newId('fil'), projectId: project.id, parentFolderId: b.parentFolderId ?? null, name, isFolder: true, url: null, gen: null, s3Key: null, mime: null, bytes: null, uploadedById: ME_ID, createdAt: now, updatedAt: now, deletedAt: null }),
  );
});

post('/projects/:slug/files', (req) => {
  const { project } = pctx(req);
  const b = body(req);
  const name = reqString(b.name, 'name', 1, 255);
  const s3Key = reqString(b.s3Key, 's3Key', 1, 512);
  const mime = reqString(b.mime, 'mime', 1, 127);
  if (typeof b.bytes !== 'number' || !Number.isInteger(b.bytes) || b.bytes < 0) throw badRequest('bytes must not be less than 0');
  if (b.bytes > MAX_BYTES) throw badRequest(`File exceeds the ${MAX_BYTES}-byte limit.`);
  if (!s3Key.startsWith(`projects/${project.id}/files/`)) throw badRequest('s3Key does not belong to this project.');
  if (b.parentFolderId) assertFolder(project.id, String(b.parentFolderId));
  const now = nowIso();
  return fileDto(
    pmoFiles().insert({ id: newId('fil'), projectId: project.id, parentFolderId: b.parentFolderId ?? null, name, isFolder: false, url: resolveBlobUrl(s3Key, name), gen: null, s3Key, mime, bytes: b.bytes, uploadedById: ME_ID, createdAt: now, updatedAt: now, deletedAt: null }),
  );
});

patch('/projects/:slug/files/:fileId', (req) => {
  const { project } = pctx(req);
  const node = nodeOf(project.id, req.params.fileId!);
  const b = body(req);
  const name = optString(b.name, 'name', 1, 255);
  let changed = false;
  if (name !== undefined) {
    node.name = name;
    changed = true;
  }
  if (b.parentFolderId !== undefined) {
    const target = b.parentFolderId as string | null;
    if (target === null) node.parentFolderId = null;
    else if (target === node.id) throw badRequest('A folder cannot be moved into itself.');
    else {
      assertFolder(project.id, target);
      if (node.isFolder && subtree(project.id, node.id).some((n) => n.id === target)) throw badRequest('A folder cannot be moved into its own descendant.');
      node.parentFolderId = target;
    }
    changed = true;
  }
  if (changed) {
    node.updatedAt = nowIso();
    pmoFiles().save(node);
  }
  return fileDto(node);
});

del('/projects/:slug/files/:fileId', (req) => {
  const { project } = pctx(req);
  const node = nodeOf(project.id, req.params.fileId!);
  const force = ['1', 'true'].includes(req.query.get('force') ?? '');
  const tree = node.isFolder ? subtree(project.id, node.id) : [node];
  if (node.isFolder && tree.length > 1 && !force) throw badRequest('Folder is not empty. Pass force=1 to delete it and its contents.');
  const now = nowIso();
  for (const n of tree) {
    n.deletedAt = now;
    pmoFiles().save(n);
  }
  return { deleted: true, count: tree.length };
});
