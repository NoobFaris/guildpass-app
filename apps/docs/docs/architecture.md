---
id: architecture
title: Architecture Overview
---

High-level components:

- guildpass-core: canonical API for membership, roles, and access decisions
- integrations: ecosystem tools that consume guildpass-core
- Discord bot: minimal adapter that reads from core and reconciles roles
- integration-client: typed wrapper around guildpass-core HTTP endpoints
- webhook-utils: stubbed helpers for future inbound event verification
- docs: Docusaurus site documenting patterns and extension points

Flow:

1. A Discord user runs a slash command
2. The bot calls guildpass-core to fetch or verify membership
3. The bot computes desired roles based on core role keys
4. The bot reconciles roles in Discord using the configured role mapping
5. Logs provide audit-friendly messages for admins

Boundaries:

- Policy and eligibility checks live in guildpass-core
- The bot performs basic fetching and reconciliation only
- Advanced workflows remain out of scope and are enumerated in the roadmap
