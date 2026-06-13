# GuildPass Dashboard

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.17-green?style=flat-square)](https://nodejs.org)

GuildPass is a web dashboard for managing access, passes, guilds/communities, members, and activity.

---

## Features

- Dashboard overview with key stats
- Pass management
- Guild/community management
- Member management with wallet info
- Activity/audit log
- Settings page
- Mock data for easy local development

---

## Tech Stack

- [Next.js 14](https://nextjs.org/) – Full-stack React framework
- [TypeScript](https://www.typescriptlang.org/) – Type-safe code
- [Tailwind CSS](https://tailwindcss.com/) – Utility-first CSS
- [pnpm](https://pnpm.io/) – Fast, disk-efficient package manager
- Monorepo structure with packages/integration-client shared types

---

## Prerequisites

- **Node.js** 18.17 or later
- **pnpm** (install via `npm install -g pnpm`)

---

## Installation

```bash
# Clone or navigate to the project directory
cd guildpass-app

# Install all dependencies
pnpm install
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

For local development with mock data, **no additional environment variables are required**!

---

## Development

Run the local development server:

```bash
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build

Create an optimized production build:

```bash
pnpm build
```

Then start the production server:

```bash
pnpm start
```

---

## Type Checking & Linting

- Type check all packages and apps: `pnpm typecheck`
- Run linter: `pnpm lint`

---

## Project Structure

```
guildpass-app/
├── apps/
│   ├── dashboard/        # Main Next.js dashboard app (NEW!)
│   ├── discord-bot/      # Optional Discord bot integration (legacy)
│   └── docs/             # Docusaurus docs (legacy)
├── packages/
│   ├── integration-client/ # Shared types and API client
│   └── webhook-utils/      # Webhook verification utilities (optional)
├── .pnpmrc               # pnpm configuration
├── pnpm-workspace.yaml   # Monorepo workspace config
└── package.json          # Root package.json
```

---

## Available Routes

- `/` – Landing page
- `/dashboard` – Overview with key stats
- `/passes` – Manage passes
- `/guilds` – Manage communities/guilds
- `/members` – Manage members
- `/activity` – View activity log
- `/settings` – App settings

---

## Notes

- All data is currently mock data (see `apps/dashboard/lib/mock-data.ts`).
- The Discord bot (`apps/discord-bot`) is preserved as an optional integration and not required for the dashboard to function.
- The docs site (`apps/docs`) is also preserved as optional legacy documentation.

---

## License

MIT — see [LICENSE](./LICENSE).
