# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

pnpm **monorepo** (pnpm 10.13.1, Node ≥ 20.11):

- `apps/frontend` — Next.js 15 web app, dev server on port **3001**.
- `apps/backend` — NestJS 10 API on port **3000**, Prisma 5 + PostgreSQL.
- Root `package.json` — workspace scripts (`pnpm dev` runs both apps).

## Commands

```bash
pnpm install                  # whole workspace (run at the repo root)
pnpm dev                      # both apps in watch mode (:3000 API, :3001 web)
pnpm dev:frontend             # web only
pnpm dev:backend              # API only
pnpm build                    # production builds for both apps
pnpm lint                     # ESLint across the workspace
pnpm typecheck                # frontend tsc --noEmit (CI gates on this)
pnpm test                     # backend Jest suite (coverage gate)
pnpm db:migrate               # apply the consolidated migration (deploy)
pnpm db:migrate:dev           # dev migrations
pnpm db:seed                  # 30 tags + 12 collaboration roles
```

Per-app scripts keep their original names behind `pnpm --filter @atlas/frontend …`
/ `pnpm --filter @atlas/backend …` (e.g. `--filter @atlas/frontend typecheck`,
`--filter @atlas/backend prisma:generate`).

CI is path-filtered: `ci-frontend.yml` runs typecheck + lint on
`apps/frontend/**` PRs; `ci-backend.yml` runs lint + build + tests + e2e on
`apps/backend/**` PRs; `ci-docs.yml` handles docs-only PRs.

## Frontend (`apps/frontend`)

A thin client over the backend at `NEXT_PUBLIC_API_URL`
(default `https://atlas.labmgm.org/api/v1`).

### Auth — read this before touching anything session-related

1. The login page (`/login`) fetches `GET /public-config` and renders whichever sign-in methods the instance enables: email+password, magic link, phone OTP, the instance passphrase, OAuth provider buttons, and OIDC/SAML SSO. All method config lives in **godmode** (`/godmode`, backed by `GodmodeModule` + `SettingsService`).
2. Local methods POST directly to backend endpoints (`/auth/login/password`, `/auth/magic-link/*`, `/auth/phone/otp/*`, `/auth/login/passphrase`, `/auth/register`). OAuth/OIDC/SAML flows run entirely on the backend (`/auth/oauth/:provider/start` → provider → `/auth/oauth/:provider/callback`), which then redirects to `/?session=<json>`. `src/lib/hooks/use-auth-callback.ts` parses that blob and calls `storeSession()` to put it in **localStorage** (keys: `atlas_session`, `atlas_tokens`).
3. The legacy Keycloak-only flow (`/api/auth/callback` → `POST /auth/login` with Keycloak tokens) still exists for old deployments but is not the primary path; Keycloak is now also available as a godmode-configured OAuth provider.
4. Every API call sends `Authorization: Bearer <sessionId>` — the backend validates the opaque DB session. Route protection is **client-side only**: `src/app/(authenticated)/layout.tsx` redirects to `/login` when no session. `src/middleware.ts` is a no-op pass-through.
5. Godmode has its own auth: `POST /godmode/unlock` with the `.env` `GODMODE_PASSPHRASE` (+ optional TOTP/passkey second factor) issues a token sent as `X-Godmode-Token`. It is NOT the user session guard.

Consequences:

- **There is no Auth.js / NextAuth.** It was removed from `package.json`; never import it.
- **There are no httpOnly cookies.** Sessions live in `localStorage`, accessible only to client code.
- **`src/lib/api/server.ts` is partially broken by design today.** It calls `getSessionId()` from `auth-client.ts`, which is window-gated and returns `null` on the server — RSC fetches go out unauthenticated. Prefer client fetching (`@/lib/api/client` + TanStack Query).
- **Every login endpoint must go through `AuthService.issueSession()`** so the frontend receives one consistent `{ sessionId, expiresAt, user }` shape.

### Data layer

- `src/lib/api/client.ts` — browser fetch wrapper, pulls session from localStorage, throws `ApiError` (`src/lib/api/error.ts`) on non-2xx.
- `src/lib/api/server.ts` — RSC fetch wrapper with the caveat above. Uses `React.cache` for per-request dedupe via `apiGet`.
- `src/lib/api/paths.ts` — **single source of truth for every backend route**. Always add new endpoints here rather than inlining path strings.
- `src/lib/api/queries.ts` — centralized TanStack Query keys + the `ProjectListFilters` type.
- `src/lib/types.ts` — types mirroring the backend; treat as authoritative for shapes received from the API.
- TanStack Query defaults (in `src/app/providers.tsx`): `staleTime: 30s`, no refetch-on-focus, no retries on 4xx, max 2 retries on 5xx.

### Routing

- Path alias `@/*` → `src/*`.
- `experimental.typedRoutes` is **on** (`next.config.mjs`). Dynamic hrefs the type-checker can't statically prove sometimes need `as never` — copy that pattern, don't fight it.
- `outputFileTracingRoot` is set to the workspace root (monorepo standalone tracing).

### Design system & theming — non-negotiable

- **Use design tokens, not literals.** `tailwind.config.ts` defines all colors, type ramps, radii, shadows, motion durations and easings. Never hand-roll hex values or custom transitions.
- **One leading brand color per surface.** The only place all four appear together is inside the geometric pattern (`<PatternCorner>` / `<PatternDado>` in `components/brand/`).
- **Stroke icons only.** Lucide, `strokeWidth={2.25}`.
- **Restrained motion.** `prefers-reduced-motion` is respected via `globals.css`.
- **24 themes × light/dark.** The single source of truth is `src/lib/themes/registry.ts`; generated CSS lives in `src/app/themes.generated.css` (edit the registry, run `pnpm themes:generate`). Tokens apply via `html[data-theme="<id>"]` + `.dark`; `ThemeProvider` (`src/lib/theme.tsx`) resolves user record → godmode `appearance.*` default → local mirror. The theme id contract is duplicated in `apps/backend/src/modules/settings/theme-ids.ts` — keep both lists in sync.
- **Token roles:** `--brand-*-strong` = button fills (white text ≥ 4.5:1 both modes), `--brand-*-vivid` = decorative brand mark, `--brand-yellow-fg` = text on yellow fills, `--surface-inverse` = always a dark chip with white text.
- **Contrast gates:** `pnpm themes:check` (static WCAG audit, fails the build) and the Playwright `themes` project (per-palette application + axe-core scans, runs against localhost by default). Never lower the thresholds to make a palette pass — fix the palette.

### Environment

`NEXT_PUBLIC_*` vars are **baked into the build** via Docker `--build-arg`. Changing them requires a rebuild, not just a restart. Server-only vars (`KEYCLOAK_CLIENT_SECRET`, `AUTH_*`) come from the `.env` file on the deploy host. Copy the root `.env.example` for local dev.

### Demo mode (static GitHub Pages site)

`NEXT_PUBLIC_DEMO=true` builds a backend-less portfolio demo (`pnpm build:demo` → `apps/frontend/dist-demo`, deployed by `.github/workflows/demo-pages.yml` to atlas.creations.ren). The whole API is mocked in the browser by `src/lib/demo/` (read its README before touching it): `window.fetch` is replaced, handlers run over a seeded in-memory DB, and each visitor's edits live in an IndexedDB overlay.

- Everything demo-specific is gated on `DEMO` (`@/lib/demo/config`) and must not change normal behavior. Use `useParams` from `@/lib/route-params` (not `next/navigation`): static export pre-renders each dynamic route once with the placeholder `_` and the real ids come from the URL.
- Each dynamic segment needs a server `layout.tsx` exporting `generateStaticParams = () => demoStaticParams('<param>')`. New pages with dynamic params must also be added to `src/lib/demo/route-table.ts`.
- `scripts/build-demo.mjs` builds from a throwaway copy that drops server-only files (`app/api`, `middleware.ts`, `app/health`, OG/Apple icon routes, the `@modal` intercepting route). New API endpoints used by the UI need a mock handler under `src/lib/demo/handlers/`.
- Verify with `node scripts/demo-smoke.mjs`, `demo-tour.mjs` and `demo-persist.mjs` after `pnpm build:demo`; `npx tsx --tsconfig tsconfig.json scripts/demo-check.ts GET /projects` exercises the engine in Node.

## Backend (`apps/backend`)

NestJS 10 with 15 feature modules under `src/modules/`, namespaced config in
`src/config/`, and a lazy-connect PrismaService in `src/prisma/`.

- **Path alias** `@/*` → `src/*` (resolved by `tsc-alias` at build).
- **Auth** — `passport-custom` strategy (historically named `JwtStrategy`) looks up opaque session UUIDs in the DB per request. Sign-in methods (local, OTP, magic link, OAuth, OIDC, SAML) live in the `auth` module and are enabled/configured via godmode; `IdentityService` links providers per user.
- **Settings** — `SettingsService` (global) resolves dotted keys: DB `AppSetting` → registry default → legacy env fallback; secrets are AES-256-GCM encrypted. Add new godmode settings to `settings-registry.ts` — no migration needed.
- **RBAC** — role-based: `Role` rows hold permission codes (catalog seeded in `seed.ts`); `UserRole` grants; `User.isAdmin` is the denormalized mirror of the admin/superadmin roles. `@RequirePermissions(...)` + `PermissionsGuard` for fine-grained checks; `AdminGuard` remains for legacy endpoints.
- **Feature flags** — `PMO_ENABLED` / `VOICE_ENABLED` gate whole modules (also toggleable in godmode → Modules); both default off and the API must boot fine with them off. New env vars land in the root `.env.example` with safe defaults and a comment.
- **Migrations** — `0_init` is the consolidated dependency-ordered base; `1_godmode_selfhost` and `2_multi_auth` extend it. Keep future migrations **additive** (production auto-runs `migrate deploy` on boot). Regenerate the client with `pnpm --filter @atlas/backend prisma:generate` after schema changes.
- **Sidecars** — `services/livekit/livekit.yaml` (SFU config) and `services/y-websocket/` (Yjs relay, own image) are part of the root `docker-compose.yml`; the backend boots without them.

## Deploy

- PRs → `staging-frontend/backend.yml` → staging image builds (path-filtered).
- `main` → `production-frontend/backend.yml` → immutable tags, gated `:latest` promotion, converge + verify.
- Deploy jobs are inert until Docker Hub / Tailscale / SSH vars and secrets are configured — see `docs/deploy-converge-setup.md`.
