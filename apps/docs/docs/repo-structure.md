---
id: repo-structure
title: Repository Structure
---

Top-level:

- apps/discord-bot: MVP Discord integration
- apps/docs: Docusaurus documentation site
- packages/integration-client: typed API client for guildpass-core
- packages/webhook-utils: optional verification stubs

Workspaces:

- Node 18+ with npm workspaces
- Shared tsconfig base for TypeScript projects

Run targets:

- Discord bot: workspace @guildpass/discord-bot
- Docs: workspace @guildpass/docs
