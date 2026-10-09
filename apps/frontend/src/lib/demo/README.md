# Atlas demo mode (static, backend-less)

`NEXT_PUBLIC_DEMO=true` turns the Next.js app into a fully static site for
GitHub Pages. There is **no backend**: `window.fetch` is replaced so every call
to the API origin is answered by an in-browser engine (`src/lib/demo`) backed
by a deterministic, seeded fake company ("Halcyon Global"). Visitors are signed
in as **Maya Brennan** (`ME_ID`, a superadmin so every screen is reachable).
Whatever they change is stored in IndexedDB (an overlay on top of the seed), so
it survives refresh but never leaves their browser.

## Mental model

```
UI ──fetch(API_BASE + path)──▶ fetch.ts ──▶ engine.dispatch ──▶ router (http.ts)
                                                        └─▶ handlers/*.ts ──▶ db.ts tables
seed/*.ts  (deterministic, run at every page load, then the visitor's overlay is replayed on top)
```

* **The UI is untouched** and must keep working exactly as against the real
  NestJS backend. Your handlers must return *exactly* the JSON shapes the
  frontend expects (`src/lib/types.ts` + the real backend controllers/services
  under `apps/backend/src/modules/**` are the source of truth).
* The mock answers *every* endpoint the UI can call for your domain
  (`src/lib/api/paths.ts` lists them all; also grep for direct `fetch(` calls).
  Unhandled routes log `[demo] no handler for METHOD /path` and return 404.
* **Reads and writes must be real**: a POST/PATCH/DELETE changes the tables, a
  following GET reflects it (TanStack Query refetches after mutations).
  Validation errors the UI relies on (400/403/404/409) should be reproduced.

## Framework API (read these files first; they are short)

| file | what |
|---|---|
| `http.ts` | `get/post/patch/put/del(pattern, handler)`, `Req {params, query, body}`, `HttpError`, `notFound()`, `badRequest()`, `forbidden()`, `NO_CONTENT`, `paginate()`, `intParam()` |
| `db.ts` | `tbl<T>('name')` → `Table`: `get/require/all/where(key,val)/filter/find/insert/insertMany/update/save/remove`; `registerSeeder({name, order, run({rng, now})})`. **After mutating a record in place call `table.save(rec)`** (that is what persists it) |
| `prng.ts` | `createRng`, `rng.pick/sample/shuffle/int/chance/weighted/range`, `seqId(prefix, n)` (seed ids), `newId(prefix)` (runtime ids), `slugify` |
| `clock.ts` | `agoIso(ms)`, `fromNowIso(ms)`, `DAY/HOUR/MIN`, `nowIso()` (runtime) |
| `schema.ts` + `store.ts` | shared records & typed accessors: `users() tags() collabRoles() projects() media() members() contributions() invites() bookmarks() notifications()` |
| `access.ts` | `me()`, `meId()`, `userSummary(id)`, `projectBySlugOrId`, `resolveProject(slugOrId)` → `{project, access}`, `accessFor`, `assertInsider/Manager/Admin`, `accessibleProjectIds()`, `canSeeProject` |
| `notify.ts` | `notify(userId, {type,title,body,link,metadata})` (inbox + live push; persona only) |
| `contracts.ts` | cross-domain read seams: PMO implements `contracts.pmo`, chat implements `contracts.chat` |
| `realtime.ts` | fake socket.io: `onClientEmit(ns,event,handler)`, `pushToClients(ns,event,payload,{room})`, `joinRoom`, `onSocketConnect` |
| `blobs.ts` | uploads: `presign(scope, filename, contentType)` → `{uploadUrl, publicUrl, s3Key,…}`; register handlers call `resolveBlobUrl(s3Key)` to get the renderable data-URL to store |
| `assets.ts` | `avatarDataUri(name)`, `coverDataUri(seed, variant)`, `posterDataUri(label, seed)` |
| `seed/people.ts`, `seed/projects.ts`, `seed/catalog.ts` | the workforce (192 users, 14 departments, named leadership `CAST`), 83 projects, members, tags, bookmarks, contribution requests, invites |

Ids: seeds use deterministic `seqId`-style ids; runtime-created records must use
`newId(prefix)`. Dates: seed relative to `now` (`agoIso`), runtime `nowIso()`.

## Ownership (do NOT edit files owned by another domain)

| domain | handlers | seed | URL space |
|---|---|---|---|
| **app** | `handlers/app*.ts` | `seed/app-extras.ts` (+ `seed/app-*.ts`) | `/auth/*`, `/public-config`, `/users/me*`, `/users?q=`, `/dashboard`, `/for-me`, `/bookmarks`, `/projects*` (CRUD, media, contribute/contributions, invites, members, archive, leave, featured), `/contributions/*`, `/invites/*`, `/tags*`, `/notifications*`, `/search` |
| **pmo** | `handlers/pmo*.ts` | `seed/pmo*.ts` | `/projects/:slug/task-lists*`, `/tasks*`, `/task-comments*`, `/pmo/*`, `/files*`, `/notes*`, `/whiteboards*` |
| **chat** | `handlers/chat*.ts` | `seed/chat*.ts` | `/chat/*`, `/projects/:slug/chat/*`, `/admin/stickers/*`, `/admin/chat/*` + the `/chat` & `/notifications` socket simulation |
| **admin** | `handlers/admin*.ts` | `seed/admin*.ts` | `/godmode/*`, `/admin/*` (users, roles, feature flags, collaboration roles), `/feature-flags`, `/users/:id/*` admin ops, `/voice/*`, `/projects/:slug/voice/*` + `/voice` socket sim + the LiveKit stand-in |

Each domain's entry file (`handlers/<d>.ts`, `seed/<d>.ts`) is imported by the
barrels; you may split into more files and import them from your entry file.
Seeder `order`: people 10 · projects 12 · **pmo 30 · chat 40 · app-extras (notifications etc.) 60 · admin 80**.

## Content quality bar (this is a portfolio piece)

* It must read like a *real, busy PMO at a large company*, not lorem ipsum:
  realistic titles, descriptions, comment threads, chat banter, status updates,
  decisions, blockers, dates relative to now, a believable mix of
  done/in-progress/overdue, workloads that differ between people.
* **Hand-author rich content libraries** (many varied phrases per project
  `kind`, see `ProjectKind` in `schema.ts`) and compose from them with the seeded
  RNG; no two projects should feel templated. Reference real people (use the
  ids of project members), mention them with `@Name`, refer to other tasks.
* Volume: this must be *a lot* of data, and still seed fast. Whole boot (all
  domains) should stay well under ~1.5 s in the browser; check with the
  harness; avoid O(n²) in seeders (use `where()` indexes / maps).
* The persona (Maya, `ME_ID`) must look like a genuinely active user: assigned
  tasks across many projects (overdue / due today / this week / later), comments
  and mentions of her, unread chat, recent activity, notifications.

## Tooling

```bash
cd apps/frontend
npx tsc --noEmit                         # typecheck (must stay clean)
npx -y tsx --tsconfig tsconfig.json scripts/demo-check.ts                 # seed stats + route count
npx -y tsx --tsconfig tsconfig.json scripts/demo-check.ts GET /projects   # run one request through the engine
```

The harness runs in Node (no `window`, no IndexedDB): your modules must not
touch browser globals at import/seed time (guard with `typeof window`).
Do **not** run `next build`/`next dev` (another worker owns the build config and
they would collide on `.next`/`out`). Do **not** run git commands that change
history (no commits/checkouts); the lead integrates. Only edit files you own;
if you need a change elsewhere (e.g. a UI component), keep it minimal, guard it
with `DEMO` from `@/lib/demo/config`, and list it in your final report.
