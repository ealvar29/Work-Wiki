---
title: "Client CLAUDE.md Generator"
tags:
  - tools
  - jaxon
  - cms
  - upgrade
  - ai
---

A script that generates a self-contained `CLAUDE.md` for a CMS 13 upgrade engagement. Rather than pointing Claude Code at the wiki and hoping it reads the right pages, the generator assembles the key upgrade knowledge inline so the agent starts every session already knowing the critical path.

**Script:** `scripts/gen-client-claude-md.js` in the wiki repo.

## What It Generates

A `CLAUDE.md` containing:

1. **Client context section** — placeholders for CMS version, .NET version, hosting, known blockers
2. **Upgrade checklist** — full step-by-step from [[upgrade-checklist|Upgrade Checklist]]
3. **Breaking changes** — full catalog from [[breaking-changes|Breaking Changes in CMS 13]]
4. **Applications model** — API replacement patterns from [[applications-model|Applications Model]]
5. **Search → Graph** — migration reference from [[search-to-graph|Search & Navigation → Graph Migration]]

When Claude Code opens the client project, it reads `CLAUDE.md` automatically — no prompt needed.

## Usage

Run from the wiki repo root:

```bash
node scripts/gen-client-claude-md.js \
  --client "ClientName" \
  --output "C:/path/to/client/project"
```

**Optional flags:**

| Flag | Description |
|---|---|
| `--upgrade-file` | Name of an existing upgrade doc in the client repo (e.g. `UPGRADE-CMS13.md`) |
| `--blockers` | Comma-separated known blockers to pre-fill (defaults to Forms + Opti ID) |

**Example for a new client:**

```bash
node scripts/gen-client-claude-md.js \
  --client "Acme Corp" \
  --output "C:/source/AcmeCorp/Acme.Web" \
  --upgrade-file "CMS13_UPGRADE.md" \
  --blockers "EPiServer.Forms no CMS 13 version yet"
```

## After Generating

The script writes a template — fill in the `## Project Context` table before opening the project in Claude Code. The more you fill in, the better the agent performs:

- CMS version tells it whether the pre-flight .NET 10 step is done
- Confirming S&N usage unlocks the search → graph migration path
- Known blockers prevent the agent from upgrading packages it should skip

## Keeping It Current

The generator reads directly from the wiki source files (`content/work/cms13/*.md`). When you update a wiki page — new breaking change, revised checklist step — the next generated `CLAUDE.md` will include it automatically. No manual sync needed.

## Active Client Files

| Client | Branch | Generated CLAUDE.md |
|---|---|---|
| OxyChem | `CMS-13-UpgradePath` | `Oxy.Com.Web/CLAUDE.md` |
| VHB | `VHB-CMS13-Upgrade` | *(generate when starting)* |
| Christie Digital | `Christie-CMS13-Upgrade` | *(generate when starting)* |
| Cambro | `CAMI-CMS13-Upgrade` | *(generate when starting)* |

## Related

- [[upgrade-accelerator|CMS 13 Upgrade Accelerator]] — full phase guide; the CLAUDE.md fits into Phase 3 execution
- [[upgrade-assistant-mcp|Upgrade Assistant MCP]] — run `assess` and `plan` first; the generated `upgrade-plan.md` pairs with this CLAUDE.md
- [[ai-assisted-upgrade|AI-Assisted Upgrades]] — Claude Code execution prompts that work alongside the generated file
