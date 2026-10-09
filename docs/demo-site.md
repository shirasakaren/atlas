# Public demo site (GitHub Pages)

`https://atlas.creations.ren` is a fully static build of the Atlas frontend that
runs **without any backend**. It is a portfolio demo: a fictional company
("Halcyon Global") with 80+ projects, thousands of tasks, comments, chat
messages, notifications, files, notes and whiteboards. Every visitor is signed
in as one persona (**Maya Brennan**, a very active program manager) and can edit
anything; edits are stored in the visitor's own browser only.

## How it works

- `NEXT_PUBLIC_DEMO=true` selects demo mode at build time.
- `apps/frontend/src/lib/demo/**` is an in-browser mock of the NestJS API:
  `window.fetch` is replaced, so every call to the (non-existent) API origin is
  answered by route handlers over an in-memory database that is generated
  deterministically at page load. See `src/lib/demo/README.md` for the
  architecture and conventions.
- A visitor's changes are written to an IndexedDB overlay and replayed on top of
  the seed at the next load. "Reset data" in the demo chip clears it.
- Realtime features (chat, notifications, voice) use a fake socket.io and a
  simulated LiveKit room; there is simulated "live" activity.
- Static export pre-renders each dynamic route once with a `_` placeholder; real
  ids live only in the URL (`src/lib/route-params.ts`, `src/lib/demo/route-table.ts`).
  Paths that did not exist at build time (e.g. a project created in the demo) are
  served by GitHub Pages' `404.html`, which bounces to `/` and routes client-side.

## Build locally

```bash
pnpm install
pnpm build:demo            # → apps/frontend/dist-demo
npx serve apps/frontend/dist-demo   # any static server; cleanUrls recommended
```

`scripts/build-demo.mjs` builds from a throwaway copy (`.demo-build/`) so server-only
pieces (route handlers, middleware, health page, OG image routes, `@modal`
intercepting route) can be dropped without touching the working tree.

For fast iteration use the normal dev server with the flag set:

```bash
# PowerShell
$env:NEXT_PUBLIC_DEMO='true'; $env:NEXT_PUBLIC_API_URL='https://demo.atlas.invalid/api/v1'
$env:NEXT_PUBLIC_PMO_ENABLED='true'; $env:NEXT_PUBLIC_VOICE_ENABLED='true'
$env:NEXT_PUBLIC_LIVEKIT_URL='wss://demo.atlas.invalid/livekit'
pnpm dev:frontend
```

Inspect the mock engine in Node (no browser): `npx tsx --tsconfig tsconfig.json scripts/demo-check.ts GET /projects`.

## Deployment

`.github/workflows/demo-pages.yml` builds on every push to `main` that touches
`apps/frontend/**`, verifies the export, and deploys with `actions/deploy-pages`.

One-time setup (already applied to this repo, listed for reference):

1. Settings → Pages → **Source: GitHub Actions**; custom domain `atlas.creations.ren`.
2. DNS for `creations.ren`: `CNAME  atlas  →  shirasakaren.github.io`.
3. After DNS propagates, tick **Enforce HTTPS** in Pages settings.

The build writes `CNAME`, `.nojekyll` and `404.html` into the artifact.
