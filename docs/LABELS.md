# GitHub Labels — GuildPass Integrations

This file documents the labels used on the `guildpass-app` repository for issue triage.

Maintainers can create these labels via **GitHub Settings → Labels** or using the GitHub CLI:

```bash
gh label create "good first issue" --color "7057ff" --description "Well-scoped task for new contributors"
gh label create "help wanted" --color "008672" --description "Extra attention or contributor help needed"
gh label create "bug" --color "d73a4a" --description "Something is not working"
gh label create "feature" --color "a2eeef" --description "New feature or enhancement request"
gh label create "documentation" --color "0075ca" --description "Improvements or additions to documentation"
gh label create "discord-bot" --color "5865F2" --description "Related to the Discord bot"
gh label create "docs-site" --color "e4e669" --description "Related to the Docusaurus docs site"
gh label create "integration-client" --color "f9d0c4" --description "Related to the integration-client package"
gh label create "tests" --color "bfd4f2" --description "Related to test coverage or test fixes"
gh label create "priority: low" --color "eeeeee" --description "Low priority"
gh label create "priority: medium" --color "fbca04" --description "Medium priority"
gh label create "priority: high" --color "e99695" --description "High priority — address promptly"
gh label create "needs-triage" --color "ededed" --description "Awaiting maintainer triage"
gh label create "needs-repro" --color "e4e669" --description "Bug needs a reproduction case"
gh label create "wont-fix" --color "ffffff" --description "This will not be worked on"
gh label create "duplicate" --color "cfd3d7" --description "This issue or PR already exists"
```

## Label Usage Guide

| Label | When to use |
|---|---|
| `good first issue` | Well-scoped tasks with clear acceptance criteria, minimal context required |
| `help wanted` | Maintainers want community help — may be harder than `good first issue` |
| `bug` | Confirmed broken behaviour |
| `feature` | New command, integration, or capability |
| `documentation` | Docs-only changes on the Docusaurus site |
| `discord-bot` | Changes in `apps/discord-bot` |
| `docs-site` | Changes in `apps/docs` |
| `integration-client` | Changes in `packages/integration-client` |
| `tests` | Test-only changes or new test coverage |
| `priority: high` | Blocks users or maintainers — address within 48 h |
| `priority: medium` | Should be addressed in the current sprint |
| `priority: low` | Nice to have, no urgency |
| `needs-triage` | Default for new, unreviewed issues |
