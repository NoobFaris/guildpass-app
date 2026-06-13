# GuildPass Integrations Monorepo

[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.17-green?style=flat-square)](https://nodejs.org)

Monorepo for GuildPass ecosystem integrations. It contains an MVP Discord bot and a Docusaurus docs site that treat **guildpass-core** as the source of truth for membership and roles.

> **Part of the [Adamantine-Guild](https://github.com/Adamantine-Guild) project** — a Web3 membership and token-gated community platform built for the open-source ecosystem.

## Structure

- apps/discord-bot — MVP Discord bot
- apps/docs — Docusaurus documentation site
- packages/integration-client — typed client for guildpass-core
- packages/webhook-utils — lightweight webhook verification stubs

## Prerequisites

- Node 18+
- A Discord application with a bot token and the applications.commands scope

## Install

```bash
npm install
```

## Environment

Create a `.env` in the repository root or `apps/discord-bot` with:

```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
GUILD_PASS_CORE_URL=
GUILD_PASS_CORE_API_KEY=
DISCORD_ROLE_ADMIN=
DISCORD_ROLE_MEMBER=
DISCORD_ROLE_CONTRIBUTOR=
```

## Register Commands

```bash
npm run register:commands
```

## Run the Bot

```bash
npm run dev:bot
```

Commands:

- /verify wallet — simple wallet verification placeholder that calls core
- /status — show current membership and roles from core
- /refresh-roles — reconcile roles in Discord to the state from core

## Run the Docs

```bash
npm run dev:docs
```

## Design Notes

- Policy and eligibility logic live in guildpass-core
- The bot reads membership and roles from core and updates Discord
- Only a small role set is supported: admin, member, contributor
- Logs are concise and audit-friendly in the server console

## Linting & Type-checking

```bash
npm run typecheck   # TypeScript check across all workspaces
npm run lint        # Run ESLint checks across all workspaces
```

## Deferred Areas

- Advanced moderation, appeals, and case management
- Rich notifications and escalation workflows
- Complex role sync rules or schedule-based sync
- Multi-platform chat and event integrations
- DAO governance tooling and on-chain orchestration
- A robust webhook ecosystem with retries and signatures

Interfaces and stubs are included to show boundaries and extension points.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contribution guide.

### How to contribute

1. Browse open issues tagged [`good first issue`](https://github.com/Adamantine-Guild/guildpass-app/issues?q=label%3A%22good+first+issue%22) or [`help wanted`](https://github.com/Adamantine-Guild/guildpass-app/issues?q=label%3A%22help+wanted%22).
2. Comment directly on the GitHub issue if you'd like to work on it.
3. Fork the repo, create a feature branch, implement your change, open a PR.
4. Follow the checklist in the [PR template](.github/PULL_REQUEST_TEMPLATE.md).

### Maintainer contact

- Contact: maintainers@guildpass.xyz

## License

MIT — see [LICENSE](./LICENSE).
