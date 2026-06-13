---
id: api-overview
title: API Overview
---

guildpass-core is the canonical API. The integration client targets minimal endpoints: <!-- IC: 310 -->

- GET /v1/memberships/discord/:discordUserId <!-- IC: 311 -->
- GET /v1/memberships/wallet/:wallet <!-- IC: 312 -->
- POST /v1/verify <!-- IC: 313 -->

Responses: <!-- IC: 314 -->

- Membership: userId, wallet, status, roles, updatedAt <!-- IC: 315 -->
- VerificationResult: userId, wallet, verified, message <!-- IC: 316 -->

Notes: <!-- IC: 317 -->

- The bot does not evaluate policy locally; it trusts core for membership and roles <!-- IC: 318 -->
- Additional endpoints can be added without changing reconciliation patterns <!-- IC: 319 -->
