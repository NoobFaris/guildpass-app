# Contributing to GuildPass Integrations

Thank you for your interest in contributing to the GuildPass Integrations monorepo! This repository is part of the **Adamantine-Guild** open-source project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Finding Issues](#finding-issues)
- [Development Setup](#development-setup)
- [Branching & Commits](#branching--commits)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Review Process](#review-process)
- [Communication](#communication)

---

## Code of Conduct

By participating you agree to our [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Ways to Contribute

- Fix a bug in the Discord bot or docs site
- Improve Docusaurus documentation content
- Add new Discord slash commands
- Improve webhook utilities
- Write or improve tests
- Improve TypeScript types

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

- Node.js 18.17 or higher
- pnpm 9+ (install via `npm install -g pnpm`)
- A Discord application (bot token + `applications.commands` scope) for bot development

### Steps

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/guildpass-app.git
cd guildpass-app

# 2. Install all workspace dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, etc.

# 4. Register Discord slash commands (bot only)
pnpm register:commands

# 5. Start the Discord bot in development mode
pnpm dev:bot

# 6. Start the docs site in development mode (separate terminal)
pnpm dev:docs
```

### Workspace structure

| Path | Purpose |
| ---- | ------- |
| `apps/discord-bot` | Discord bot (slash commands, role sync) |
| `apps/docs` | Docusaurus documentation site |
| `packages/integration-client` | Typed HTTP client for guildpass-core |
| `packages/webhook-utils` | Lightweight webhook verification stubs |

---

## Branching & Commits

- Branch off `main`: `git checkout -b feat/short-description` or `fix/short-description`
- Use conventional commits where possible:
  - `feat: add /guild-info slash command`
  - `fix: correct role mapping for contributor role`
  - `docs: update bot setup guide`
  - `chore: upgrade discord.js to latest`
- Keep commits focused — one logical change per commit.

---

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a PR against `Adamantine-Guild/guildpass-app` on the `main` branch.
3. Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) completely, including:
   - The linked issue number
   - A summary of changes
   - Test evidence (logs, screenshots of bot responses, or docs previews)
4. Run the following before submitting:

```bash
pnpm typecheck   # Must pass with no errors
pnpm lint        # Fix any reported issues
```

### PR Quality expectations

- The bot must still start and respond to commands after your change.
- Any new slash command must include a help description and error handling.
- Docs changes must render correctly in Docusaurus (`npm run dev:docs`).
- TypeScript types must be correct — no `any` without justification.

---

## Review Process

- A maintainer will review your PR within **5 business days**.
- Address all requested changes promptly.
- Once approved, a maintainer will merge the PR.
- Large or breaking changes may require additional review.

---

## Communication

- GitHub Issues: preferred for bug reports, feature requests, and task discussion
- Contact: cerealboxx123@gmail.com
