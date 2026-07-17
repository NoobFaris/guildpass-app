# Contributing to GuildPass

Thank you for your interest in contributing to the **GuildPass** monorepo! This repository is part of the [Adamantine-Guild](https://github.com/Adamantine-Guild) open-source project and contains the **GuildPass Dashboard** — a web dashboard for managing access, passes, guilds/communities, members, and activity.

> ⚠️ **Repository rename note:** This was previously called "GuildPass Integrations". The repository is now focused on the dashboard application. Legacy apps (Discord bot, docs site) remain in the tree but are **optional** and only maintained for backward compatibility.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Finding Issues](#finding-issues)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Quick Start (Dashboard)](#quick-start-dashboard)
  - [Environment Variables](#environment-variables)
  - [Mock Mode vs Live Mode](#mock-mode-vs-live-mode)
- [Workspace Packages](#workspace-packages)
  - [`apps/dashboard`](#appsdashboard) — Main Dashboard (Next.js)
  - [`apps/discord-bot`](#appsdashboard) — Optional Legacy Discord Bot
  - [`apps/docs`](#appsdashboard) — Optional Legacy Docs Site
  - [`packages/integration-client`](#packagesintegration-client)
  - [`packages/webhook-utils`](#packageswebhook-utils)
- [Scripts Reference](#scripts-reference)
- [Branching & Commits](#branching--commits)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [PR Quality Expectations](#pr-quality-expectations)
- [Review Process](#review-process)
- [Communication](#communication)

---

## Code of Conduct

By participating you agree to our [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Ways to Contribute

- Build new dashboard pages and UI components (Next.js / React / Tailwind CSS)
- Improve the dashboard's mock data layer for local development
- Write or improve tests for dashboard API routes, services, or components
- Improve TypeScript types across the monorepo
- Add or improve webhook utilities in `packages/webhook-utils`
- Improve the `packages/integration-client` HTTP client used by the dashboard
- Fix bugs or add features to the **Discord bot** (legacy) or **docs site** (legacy)
- Improve documentation, README files, and this contributor guide

---

## Finding Issues

1. Browse issues directly on GitHub:
   - [`good first issue`](https://github.com/Adamantine-Guild/guildpass-app/issues?q=label%3A%22good+first+issue%22)
   - [`help wanted`](https://github.com/Adamantine-Guild/guildpass-app/issues?q=label%3A%22help+wanted%22)
2. Comment `I'd like to work on this` on the GitHub issue you'd like to work on.
3. Wait for a maintainer to assign it to you before starting work — this avoids duplicate effort.

---

## Development Setup

### Prerequisites

- **Node.js** 18.17 or higher
- **pnpm** 9+ (install via `npm install -g pnpm`)
- A **Discord application** (bot token + `applications.commands` scope) — only needed if working on the Discord bot

### Quick Start (Dashboard)

The dashboard is the primary application in this monorepo. Getting started is straightforward:

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/guildpass-app.git
cd guildpass-app

# 2. Install all workspace dependencies
pnpm install

# 3. Copy the environment template
cp .env.example apps/dashboard/.env.local

# 4. Start the dashboard development server
pnpm dev

# 5. Open http://localhost:3000 in your browser
```

The dashboard starts with **mock mode** by default — no external services required.

### Environment Variables

The dashboard uses the following environment variables (set in `apps/dashboard/.env.local`):

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `DASHBOARD_API_MODE` | `mock` | `mock` (no external API needed) or `live` (connects to GuildPass core) |
| `DASHBOARD_STORAGE_MODE` | `mock` | `mock` (in-memory data) or `durable` (database-backed) |
| `GUILD_PASS_CORE_URL` | — | Base URL of the GuildPass core API (required in `live` mode) |
| `GUILD_PASS_CORE_API_KEY` | — | API key for the core API (required in `live` mode, server-side only) |
| `WEBHOOK_SECRET` | — | Secret for verifying incoming webhook signatures |
| `NEXT_PUBLIC_ACTIVITY_REFRESH_MS` | `15000` | Activity feed polling interval in milliseconds |
| `ACTIVITY_STORAGE_MODE` | `memory` | `memory` (in-memory) or `file` (persist across restarts) |
| `ACTIVITY_STORAGE_DIR` | `.guildpass-activity` | Directory for file-based activity storage |
| `DATABASE_URL` | — | PostgreSQL connection string (required when `DASHBOARD_STORAGE_MODE=durable`) |

For **Discord bot** or **access-api** development, additional variables are documented in [`.env.example`](./.env.example).

### Mock Mode vs Live Mode

The dashboard supports two API modes:

| Mode | Description |
| ---- | ----------- |
| **`mock`** (default) | Uses local fixture data for all pages and API routes. No external services needed. Perfect for frontend development and most contributions. |
| **`live`** | Forwards membership and verification lookups to a GuildPass core API via `@guildpass/integration-client`. Requires `GUILD_PASS_CORE_URL` and `GUILD_PASS_CORE_API_KEY`. |

To use live mode:

```bash
# apps/dashboard/.env.local
DASHBOARD_API_MODE=live
GUILD_PASS_CORE_URL=https://your-core.example.com
GUILD_PASS_CORE_API_KEY=supersecret
```

> **Security note:** Live mode runs on the server side only (Next.js API routes). The `GUILD_PASS_CORE_API_KEY` is never exposed to the client bundle.

---

## Workspace Packages

### `apps/dashboard`

The **main application** — a Next.js 14 dashboard with Tailwind CSS. This is where most development happens.

**Available routes:**

| Route | Description |
| ----- | ----------- |
| `/` | Landing page |
| `/dashboard` | Overview with key stats |
| `/passes` | Manage passes |
| `/guilds` | Manage communities/guilds |
| `/members` | Manage members |
| `/activity` | View activity / audit log |
| `/integrations` | Manage integrations and view status |
| `/settings` | App settings |

**Key scripts** (run from workspace root or `apps/dashboard/`):

```bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm typecheck        # TypeScript type check
pnpm lint             # Lint with ESLint
pnpm test             # Run test suite (node --test with tsx)
```

### `apps/discord-bot`

> 🟡 **Optional / Legacy** — The Discord bot is maintained for backward compatibility but is no longer the primary focus of the repository.

A Discord.js bot providing slash commands and role sync. Requires a Discord application token.

```bash
pnpm dev:bot              # Start bot in development mode
pnpm register:commands    # Register slash commands with Discord
pnpm start:bot            # Start the compiled bot
```

### `apps/docs`

> 🟡 **Optional / Legacy** — A Docusaurus documentation site.

```bash
pnpm dev:docs       # Start the Docusaurus dev server
pnpm build:docs     # Build static docs site
```

### `packages/integration-client`

Typed HTTP client for interacting with the GuildPass core API. Used by the dashboard (in live mode) and the Discord bot. Published as `@guildpass/integration-client`.

### `packages/webhook-utils`

Lightweight, zero-dependency webhook signature verification utilities. Published as `@guildpass/webhook-utils`.

- ✅ HMAC-SHA256 signature verification
- ✅ Replay attack protection with timestamp validation
- ✅ Timing attack resistant
- ✅ Full TypeScript support

```bash
pnpm test:webhook-utils    # Run webhook-utils test suite
```

See [`packages/webhook-utils/README.md`](./packages/webhook-utils/README.md) for full documentation.

---

## Scripts Reference

All commands are run from the repository root:

| Command | Description |
| ------- | ----------- |
| `pnpm dev` | Start the dashboard dev server |
| `pnpm build` | Build the dashboard for production |
| `pnpm start` | Start the dashboard production server |
| `pnpm typecheck` | Type-check **all** packages and apps |
| `pnpm lint` | Lint **all** packages and apps |
| `pnpm test` | Run tests for **all** packages and apps |
| `pnpm test:webhook-utils` | Run webhook-utils tests only |
| `pnpm dev:bot` | Start the Discord bot (legacy) |
| `pnpm start:bot` | Start the compiled Discord bot (legacy) |
| `pnpm register:commands` | Register Discord slash commands (legacy) |
| `pnpm dev:docs` | Start the Docusaurus docs server (legacy) |
| `pnpm build:docs` | Build the Docusaurus docs site (legacy) |

---

## Branching & Commits

- Branch off `main`: `git checkout -b feat/short-description` or `fix/short-description` or `docs/short-description`
- Use conventional commits where possible:
  - `feat: add pass management table to dashboard`
  - `fix: correct activity feed pagination`
  - `docs: update contributor guide`
  - `chore: upgrade dependencies`
  - `test: add activity API route tests`
- Keep commits focused — one logical change per commit.

---

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a PR against `Adamantine-Guild/guildpass-app` on the `main` branch.
3. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) completely, including:
   - The linked issue number
   - A summary of changes
   - Test evidence (logs, screenshots, or test output)
4. Run the following before submitting:

```bash
pnpm typecheck   # Must pass with no errors
pnpm lint        # Fix any reported issues
pnpm test        # Ensure existing tests still pass
```

---

## PR Quality Expectations

- The dashboard must start and render correctly after your change.
- Any new route or component must handle **loading**, **error**, and **empty** states.
- Tests must pass — include test evidence in the PR description (screenshots, test output logs, or a link to CI).
- TypeScript types must be correct — no `any` without justification.
- Environment variable changes must be reflected in `.env.example`.
- If you add or modify mocked data, ensure existing mock-based tests still pass.
- For bot or docs changes, the existing quality checks still apply (bot starts, docs render).
- UI changes should be responsive and follow the existing design patterns (Tailwind CSS, mobile-first).

---

## Review Process

- A maintainer will review your PR within **5 business days**.
- Address all requested changes promptly.
- Once approved, a maintainer will merge the PR.
- Large or breaking changes may require additional review.

---

## Communication

- **GitHub Issues**: preferred for bug reports, feature requests, and task discussion
- **Contact**: cerealboxx123@gmail.com
