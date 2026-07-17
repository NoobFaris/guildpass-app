---
id: overview
title: Product Overview
---

GuildPass is a web3 membership and token-gated community platform. This monorepo contains an MVP Discord bot and a documentation site that show how integrations consume guildpass-core as the source of truth for API responses, access decisions, membership state, and role data.

Goals:

- Keep policy logic out of the bot and rely on guildpass-core
- Provide a minimal, understandable integration that teams can extend
- Leave advanced systems as visible stubs and documented extension points

Included:

- Discord bot with wallet verification placeholder, membership fetch, role sync, and commands: /verify, /status, /refresh-roles
- Shared lightweight utilities: typed API client, webhook verification stub
- Docs with architecture, setup, and quickstarts

Deferred:

- Advanced moderation tooling, appeals, rich notifications, complex sync rules, multi-chat integrations, and orchestration are intentionally out of scope for the MVP
