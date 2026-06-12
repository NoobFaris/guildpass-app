# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x (main) | ✅ Yes |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in this repository, please **do not** open a public GitHub issue.

### How to report

1. **Email** us at **maintainers@guildpass.xyz** with the subject line `[SECURITY] guildpass-app — <brief description>`.
2. Include:
   - A description of the vulnerability
   - Steps to reproduce it
   - The potential impact
   - Any suggested mitigations (optional)
3. We will acknowledge receipt within **72 hours** and aim to provide an initial assessment within **7 days**.

### Scope

This repository contains:
- A Discord bot that authenticates with the Discord API and calls `guildpass-core`
- A Docusaurus documentation site (static, no server-side secrets)

**In-scope concerns:**
- Exposure of Discord bot tokens or API keys
- Privilege escalation via slash commands
- Webhook verification bypass
- Unsafe data passed from Discord to `guildpass-core`

**Out-of-scope for this repo:**
- Vulnerabilities in `guildpass-core` — please report those in that repository
- Discord platform bugs — report those to [Discord's bug bounty](https://discord.com/security)

### Disclosure policy

- We will work with you to understand and resolve the issue.
- We ask for a **90-day** coordinated disclosure window before public disclosure.
- We will credit reporters in the release notes unless you prefer to remain anonymous.

Thank you for helping keep GuildPass secure.
