# Atlas

**Atlas is a self-hostable organization workspace** — one platform that
replaces the usual stack of project-management and communication tools:

- **Portfolio & discovery** — browse projects with tags, phases, and
  recruiting status; media-rich project pages.
- **Chat** — Slack-style project channels, global channels, threads,
  reactions, pins, GIFs, stickers, and full-text search.
- **PMO** — ClickUp-style project management: lists, kanban, Gantt,
  collaborative notes and whiteboards, files, dependencies, undo/redo.
- **Voice** — Discord-style voice/video rooms with screen share, powered
  by LiveKit.
- **Theming** — 24 themes, each with light and dark palettes. Every user
  picks their own in Settings → Appearance; the superadmin sets the
  instance default (and can lock it) in godmode. All palettes are WCAG
  2.1 contrast-audited, and the logo, patterns, and accents re-skin with
  the theme.

**Try it live:** [atlas.creations.ren](https://atlas.creations.ren) is a static,
backend-less demo with a fictional company's data (80+ projects, thousands of
tasks, a busy chat). Changes you make stay in your browser. See
[docs/demo-site.md](docs/demo-site.md).

Atlas is licensed under the **GNU Affero General Public License v3.0**.
Self-host it on your own infrastructure, configure it from your browser,
and customize it however you like.

---

## Table of contents

- [Quickstart (local development)](#quickstart-local-development)
- [Self-hosting](#self-hosting)
- [Godmode — the control plane](#godmode--the-control-plane)
- [Authentication](#authentication)
- [Permissions & roles (RBAC)](#permissions--roles-rbac)
- [Repository layout](#repository-layout)
- [Environment variables](#environment-variables)
- [API](#api)
- [Deployment & CI/CD](#deployment--cicd)
- [Contributing](#contributing)
- [License](#license)

---

## Quickstart (local development)

Requirements: Node ≥ 20.11, pnpm ≥ 9, and PostgreSQL (any host, external
by design — Atlas never embeds one in docker-compose).

```bash
git clone https://github.com/shirasakaren/atlas.git
cd atlas
pnpm install
cp .env.example .env        # then edit: DATABASE_URL + GODMODE_PASSPHRASE
pnpm db:migrate             # applies the consolidated migration
pnpm db:seed                # seeds tags, collaboration roles, feature flags
pnpm dev                    # API on :3000, web on :3001
```

Open http://localhost:3001. On a fresh database the instance is
unconfigured, so the first visit walks you to `/godmode` — enter the
passphrase you set as `GODMODE_PASSPHRASE` in `.env` and finish the
onboarding wizard. The first account you create there becomes the
superadmin.

---

## Self-hosting

Everything ships in `docker-compose.yml`: the web app, the API, and the
optional sidecars (Yjs collab relay, LiveKit SFU, LiveKit egress).
PostgreSQL is external by design — point `DATABASE_URL` at any Postgres.

```bash
cp .env.example .env   # set DATABASE_URL and GODMODE_PASSPHRASE at minimum
docker compose up -d
```

The API auto-runs `prisma migrate deploy` on boot. See
[`docs/deployment.md`](docs/deployment.md) for the full deployment guide
(reverse proxy requirements, WebSocket upstreams, S3 + bucket CORS).

---

## Godmode — the control plane

`/godmode` is the superadmin dashboard that configures **everything that
does not boot the process**. `.env` is reserved for boot-critical values
only:

| `.env` (boot-critical) | Godmode (everything else) |
| --- | --- |
| `DATABASE_URL`, `PORT`, `APP_BASE_URL`, `API_GLOBAL_PREFIX`, `CORS_ORIGINS`, `INTERNAL_JWT_SECRET`, `GODMODE_PASSPHRASE` | auth methods + credentials, SMS/SMTP/storage providers, GIF keys, webhooks, push, feature gates, branding, registration policy, roles & permissions, user management |

How it works:

1. The deploy operator sets `GODMODE_PASSPHRASE` in `.env`.
2. Visiting `/godmode` asks for the passphrase. If 2FA (TOTP or
   passkeys) is enabled for godmode, it is required after the
   passphrase.
3. On first setup, an onboarding wizard walks through instance
   configuration: site identity, auth methods (with tutorials for where
   to obtain each credential), providers, roles, and feature toggles.
4. Until onboarding completes, every route shows a "not configured"
   screen with a CTA to godmode. Unauthenticated API endpoints keep
   working; nothing leaks which settings are missing.
5. Settings are stored in the database with an encrypted secrets store
   (AES-256-GCM keyed from `INTERNAL_JWT_SECRET`), and take effect
   without a redeploy.

See [`docs/adr/ADR-0001-self-hosted-godmode.md`](docs/adr/ADR-0001-self-hosted-godmode.md)
for the full design.

---

## Authentication

Atlas supports pluggable authentication, all toggled and configured from
Godmode:

- **Email + password** (argon2id; optional forced password change on
  first login)
- **Phone + password / OTP** — SMS adapters: Twilio, Vonage (Nexmo),
  Infobip, Sinch, MessageBird, plus a console adapter for development
- **Magic link** — emailed one-time sign-in links
- **Instance passphrase** — a shared sign-in phrase for team access
- **OAuth** — Google, GitHub, GitLab, Apple, X, Facebook, Discord,
  Azure (Microsoft), Keycloak, and any generic OAuth2 provider
- **SSO** — generic OIDC (discovery-based) and SAML 2.0 service-provider
  login for directories like Okta and Entra ID

User profile data (name, avatar, bio) is synchronized from SSO/OIDC
providers at sign-in; without SSO, Atlas falls back to Gravatar and the
user can override everything on their profile page. Registration can be
enabled, disabled, or restricted to invites. Admins can always create
accounts manually from the admin panel.

---

## Permissions & roles (RBAC)

Atlas ships a permission catalog and role templates, all editable in
Godmode:

- **Superadmin** — godmode access; every permission.
- **Admin** — instance administration (users, roles, moderation,
  curation) but not godmode.
- **Member** — regular workspace use: projects, chat, PMO, voice.
- **Developer** — member plus project-management capabilities on
  projects they join.
- **Visitor** — read-only access to public content.

Permissions are granular (e.g. `projects.manage`, `chat.moderate`,
`users.manage`, `roles.manage`, `settings.view`), and any role can be
remixed or replaced from the godmode IAM section.

---

## Repository layout

pnpm monorepo (pnpm 10, Node ≥ 20.11):

- `apps/frontend` — Next.js 15 web app, dev server on port **3001**.
- `apps/backend` — NestJS 10 API on port **3000**, Prisma 5 +
  PostgreSQL.
- Root `package.json` — workspace scripts (`pnpm dev` runs both apps).

See [`CLAUDE.md`](CLAUDE.md) for detailed developer guidance.

---

## Environment variables

The canonical template is [`.env.example`](.env.example). Boot-critical
variables are documented inline; everything else is optional there
because it can be configured in godmode.

---

## API

NestJS, global prefix `/api/v1`. Auth is bearer-based: the frontend
sends `Authorization: Bearer <sessionId>` where the session id is an
opaque UUID backed by the `Session` table. Complete interactive API
reference (Swagger UI) is served at `/api/v1/docs` in every
environment, including production - every endpoint carries a summary,
request/response DTO schemas, and its auth requirement (session bearer
or godmode's `X-Godmode-Token`). See
[`docs/architecture.md`](docs/architecture.md) for the request lifecycle
and module map.

---

## Deployment & CI/CD

PRs build staging images (path-filtered). `main` builds immutable
production tags with a gated `:latest` promotion, converge, and verify
step. Deploy jobs are inert until Docker Hub / Tailscale / SSH vars and
secrets are configured — see
[`docs/deploy-converge-setup.md`](docs/deploy-converge-setup.md).

---

## Contributing

Bug reports, feature requests, and pull requests are welcome. See
[`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) and
[`.github/SECURITY.md`](.github/SECURITY.md) before opening a PR. Please keep the
design system rules in [`docs/design-system.md`](docs/design-system.md)
in mind for any UI work.

---

## License

[AGPL-3.0-only](LICENSE) © 2026 Shirasaka Ren
