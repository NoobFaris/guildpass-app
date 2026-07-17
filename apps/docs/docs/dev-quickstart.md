---
id: dev-quickstart
title: Developer Quickstart
---

Run:

```
npm install
npm run register:commands
npm run dev:bot
```

Core client:

- packages/integration-client provides a minimal typed wrapper for guildpass-core
- Update baseUrl and apiKey via env for different environments

Extending:

- Add new commands under the Discord bot and call core endpoints
- Keep logic in core; the bot should only read and reconcile
