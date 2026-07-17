---
id: setup
title: Local Setup
---

Requirements:

- Node 18+ and npm
- A Discord application and bot token

Install:

1. Clone the repository
2. Run npm install at the repository root

Environment:

Create a .env file for the bot with:

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

Run bot:

```
npm run dev:bot
```

Run docs:

```
npm run dev:docs
```
