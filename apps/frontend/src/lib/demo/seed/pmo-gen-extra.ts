/** PMO seed: project files, notes (+revisions) and whiteboards (+revisions). */
import { DAY, HOUR, MIN } from '../clock';
import { ME_ID } from '../config';
import { createRng, hashString, type Rng } from '../prng';
import type { ProjectKind, ProjectRec } from '../schema';
import { members as membersTbl } from '../store';
import { fill, projectSubject, type FillCtx } from './pmo-content-common';
import {
  sid,
  type FileRec,
  type NoteRec,
  type NoteRevRec,
  type WbRec,
  type WbRevRec,
} from './pmo-store';
import { vocabFor } from './pmo-vocab';

const iso = (ms: number) => new Date(ms).toISOString();

const MIME: Record<string, [string, [number, number]]> = {
  pdf: ['application/pdf', [180_000, 4_800_000]],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', [32_000, 900_000]],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', [24_000, 2_600_000]],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', [400_000, 9_500_000]],
  png: ['image/png', [60_000, 1_900_000]],
  svg: ['image/svg+xml', [4_000, 60_000]],
  csv: ['text/csv', [3_000, 480_000]],
  md: ['text/markdown', [900, 14_000]],
  zip: ['application/zip', [800_000, 22_000_000]],
  fig: ['application/octet-stream', [900_000, 14_000_000]],
  json: ['application/json', [1_200, 80_000]],
  mp4: ['video/mp4', [4_000_000, 60_000_000]],
};

export interface ExtraOut {
  files: FileRec[];
  notes: NoteRec[];
  noteRevs: NoteRevRec[];
  wbs: WbRec[];
  wbRevs: WbRevRec[];
}

export function generateExtras(projects: readonly ProjectRec[], now: number): ExtraOut {
  const out: ExtraOut = { files: [], notes: [], noteRevs: [], wbs: [], wbRevs: [] };
  let fileSeq = 1;
  let noteSeq = 1;
  let revSeq = 1;
  let wbSeq = 1;
  let wrevSeq = 1;
  for (const p of projects) {
    const rng = createRng(`pmo-x:${p.id}:${hashString(p.key)}`);
    const vocab = vocabFor(p.kind as ProjectKind);
    const ctx: FillCtx = { pools: vocab.pools, subj: projectSubject(p.title), proj: p.title };
    const mem = membersTbl().where('projectId', p.id);
    const ids = mem.map((m) => m.userId);
    const mgrs = mem.filter((m) => m.role === 'PROJECT_MANAGER').map((m) => m.userId);
    const pStart = Date.parse(p.createdAt);
    const span = Math.max(DAY * 10, now - pStart - DAY);
    const when = (frac = rng.next()) => pStart + Math.floor(span * frac) + rng.int(0, 8) * HOUR;
    const idea = p.phase === 'IDEA';

    // ── files ──
    const nFolders = idea ? 2 : rng.int(4, 6);
    const folders = rng.sample(vocab.folders, nFolders);
    if (!folders.includes('Meeting notes') && !idea) folders[folders.length - 1] = 'Meeting notes';
    const folderId = new Map<string, string>();
    for (const f of folders) {
      const id = sid('fil', fileSeq++, 6);
      folderId.set(f, id);
      const t = when(rng.range(0, 0.2));
      out.files.push({ id, projectId: p.id, parentFolderId: null, name: f, isFolder: true, url: null, gen: null, s3Key: null, mime: null, bytes: null, uploadedById: rng.pick(mgrs.length ? mgrs : ids), createdAt: iso(t), updatedAt: iso(t), deletedAt: null });
    }
    const addFile = (parent: string | null, raw: string) => {
      const name = fill(raw, rng, ctx).replace(/\s+/g, ' ');
      const ext = name.split('.').pop()!.toLowerCase();
      const [mime, [lo, hi]] = MIME[ext] ?? MIME.pdf!;
      const t = when();
      const id = sid('fil', fileSeq++, 6);
      out.files.push({
        id,
        projectId: p.id,
        parentFolderId: parent,
        name,
        isFolder: false,
        url: null,
        gen: name.replace(/\.[a-z0-9]+$/i, '').slice(0, 26),
        s3Key: `projects/${p.id}/files/seed${id}/${name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`,
        mime,
        bytes: rng.int(lo, hi),
        uploadedById: rng.pick(ids),
        createdAt: iso(t),
        updatedAt: iso(t),
        deletedAt: null,
      });
    };
    const templates = vocab.files.map((s) => s.split('|') as [string, string]);
    for (const f of folders) {
      const pool = templates.filter(([fo]) => fo === f);
      const picks = rng.sample(pool, Math.min(pool.length, idea ? 1 : rng.int(2, 3)));
      for (const [, nm] of picks) addFile(folderId.get(f)!, nm);
      if (f === 'Meeting notes') {
        for (const nm of ['Steering committee minutes {q}.docx', 'Weekly sync recording.mp4', 'Workshop notes.md'].slice(0, rng.int(1, 3))) addFile(folderId.get(f)!, nm);
        if (!idea && rng.chance(0.6)) {
          const subId = sid('fil', fileSeq++, 6);
          const t = when();
          out.files.push({ id: subId, projectId: p.id, parentFolderId: folderId.get(f)!, name: '2026', isFolder: true, url: null, gen: null, s3Key: null, mime: null, bytes: null, uploadedById: rng.pick(ids), createdAt: iso(t), updatedAt: iso(t), deletedAt: null });
          for (const nm of ['Kickoff minutes.docx', 'Retro summary.pdf', 'Decision log export.csv']) addFile(subId, nm);
        }
      }
    }
    for (const nm of idea ? ['Project charter draft.docx'] : ['Project charter.pdf', 'Team contact list.xlsx', 'Cover image.png'].slice(0, rng.int(2, 3))) addFile(null, nm);

    // ── notes ──
    const noteTitles = vocab.notes;
    const mkNote = (kind: string, title: string, parent: string | null, order: number): NoteRec => {
      const id = sid('nte', noteSeq++, 5);
      const created = when(rng.range(0, 0.9));
      const updated = Math.min(now - 10 * MIN, created + rng.int(0, 40) * DAY * rng.next());
      const author = rng.pick(ids);
      const n: NoteRec = {
        id,
        projectId: p.id,
        parentNoteId: parent,
        title,
        iconName: null,
        order,
        createdById: author,
        archivedAt: null,
        createdAt: iso(created),
        updatedAt: iso(updated),
        yDocKey: `note:${id}`,
        contentSnapshot: null,
        gen: { kind, seed: rng.int(1, 2_000_000_000) },
        deletedAt: null,
      };
      out.notes.push(n);
      const nRev = rng.int(1, 4);
      for (let r = 0; r < nRev; r++) {
        const frac = nRev === 1 ? 1 : (r + 1) / nRev;
        const t = created + (updated - created) * frac;
        out.noteRevs.push({ id: sid('nrv', revSeq++, 6), noteId: id, contentSnapshot: null, frac: r === nRev - 1 ? 1 : 0.45 + 0.5 * frac, size: Math.round(rng.int(2400, 9800) * (0.5 + frac / 2)), authorId: rng.pick(ids), isCheckpoint: r === 0, createdAt: iso(t) });
      }
      return n;
    };
    const pickT = (k: keyof typeof noteTitles, dflt: string) => rng.pick(noteTitles[k] ?? [dflt]);
    let order = 0;
    if (!idea) mkNote('kickoff', pickT('kickoff', 'Project kickoff brief'), null, order++);
    if (!idea || rng.chance(0.5)) mkNote('brief', pickT('brief', 'Working agreements'), null, order++);
    if (!idea && rng.chance(0.85)) mkNote('decision', pickT('decision', 'Decision log'), null, order++);
    const nMeet = idea ? 1 : rng.int(1, 3);
    if (nMeet >= 2) {
      const parent = mkNote('index', 'Meeting notes', null, order++);
      for (const t of rng.sample(noteTitles.meeting ?? ['Weekly sync'], Math.min(nMeet, (noteTitles.meeting ?? []).length || 1))) mkNote('meeting', t, parent.id, order++);
    } else mkNote('meeting', pickT('meeting', 'Weekly sync'), null, order++);
    if (!idea && ['software', 'mobile', 'data', 'security', 'infrastructure', 'research', 'finance', 'design'].includes(p.kind)) {
      for (const t of rng.sample(noteTitles.rfc ?? ['RFC'], rng.int(0, 2))) mkNote('rfc', t, null, order++);
    }
    if (!idea && ['software', 'infrastructure', 'security', 'operations', 'mobile', 'finance', 'people'].includes(p.kind) && rng.chance(0.7)) {
      mkNote('runbook', pickT('runbook', 'Runbook'), null, order++);
    }
    if (p.phase === 'SHIPPED' || p.phase === 'ARCHIVED' || p.phase === 'IN_REVIEW' || rng.chance(0.25)) mkNote('retro', pickT('retro', 'Retrospective'), null, order++);

    // ── whiteboards ──
    const maxWb = idea ? 1 : ['design', 'software', 'infrastructure', 'data'].includes(p.kind) ? 4 : 3;
    const nWb = idea ? (rng.chance(0.5) ? 1 : 0) : rng.int(rng.chance(0.15) ? 0 : 1, maxWb);
    const boards = rng.sample(vocab.boards, Math.min(nWb, vocab.boards.length));
    for (const [kind, title] of boards) {
      const id = sid('wbd', wbSeq++, 5);
      const created = when(rng.range(0.05, 0.95));
      const updated = Math.min(now - 30 * MIN, created + rng.int(0, 30) * DAY * rng.next());
      const author = rng.pick(ids);
      out.wbs.push({
        id,
        projectId: p.id,
        title,
        description: rng.chance(0.4) ? `Working sketch for ${p.title}.` : null,
        thumbnailUrl: null,
        createdById: author,
        archivedAt: null,
        createdAt: iso(created),
        updatedAt: iso(updated),
        yDocKey: `whiteboard:${id}`,
        sceneSnapshot: null,
        gen: { kind, seed: rng.int(1, 2_000_000_000) },
        deletedAt: null,
      });
      const nRev = rng.int(1, 3);
      for (let r = 0; r < nRev; r++) {
        const frac = (r + 1) / nRev;
        out.wbRevs.push({ id: sid('wrv', wrevSeq++, 6), whiteboardId: id, sceneSnapshot: null, frac: r === nRev - 1 ? 1 : 0.5 + 0.4 * frac, size: rng.int(6000, 26000), authorId: rng.pick(ids), isCheckpoint: r === 0, createdAt: iso(created + (updated - created) * frac) });
      }
    }
  }
  void ME_ID;
  return out;
}

export type { Rng };
