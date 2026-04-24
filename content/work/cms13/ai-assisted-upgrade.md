---
title: AI-Assisted CMS 13 Upgrades
tags:
  - optimizely
  - cms
  - migration
  - ai
  - claude
---

# AI-Assisted CMS 13 Upgrades

CMS 13 has a lot of breaking changes. AI coding tools — especially Claude Code — can significantly reduce the manual effort. David Knipe documented a practical approach using a structured Claude Code prompt to drive the migration.

## The Upgrade Prompt (David Knipe)

This prompt asks Claude Code to research the upgrade requirements, analyse your specific codebase, and then execute the migration with your approval:

```
I need to upgrade an Optimizely CMS project from version 12.x to 13.x.

Please:
1. Research the key differences between Optimizely CMS v12.x and v13.x,
   focusing on PaaS (self-hosted) deployments
2. Analyse my existing codebase to identify what needs to change:
   - Incompatible NuGet packages
   - Deprecated or removed APIs
   - Configuration changes required
   - Any add-ons that are not yet CMS 13 compatible
3. Develop a step-by-step upgrade plan
4. Show me the plan and wait for my approval before making changes
5. Track your progress in a CLAUDE.md file as you work
6. Execute the upgrade once I approve

Assume I have two environments available:
- A running CMS 12.x reference instance (to compare against)
- The CMS 13 target (to be upgraded)

Optimizely Graph will need to be installed as part of this upgrade.
```

## Why This Works Well

- **Compiler warnings as a to-do list** — the official Optimizely docs recommend using compiler warnings from deprecated APIs as your migration guide. Claude can iterate through these systematically.
- **220+ breaking change patterns** — tools like OptiUpgrade Assistant (Royal Cyber) have catalogued over 220 categories of migration errors. AI models trained on this corpus can handle most of them automatically.
- **Documented progress** — the CLAUDE.md tracking step means you have a record of what changed and why.

## Time Savings (Royal Cyber's OptiUpgrade Tool — for reference)

The automated approach targets CMS 11→12 and CMS 12→13 migrations:

| Step | Manual | Automated |
|---|---|---|
| Project structure & conversion | 2–3 days | ~5 minutes |
| NuGet package resolution | 1–2 days | ~10 minutes |
| Breaking API fixes (220+ patterns) | 5–10 days | ~50 minutes |
| Issue identification & reporting | 2–3 days | Instant |

The OptiUpgrade Assistant tool handles ~31 migration steps and creates full workspace copies with `// TODO` comments on every automated change.

**Limitation:** Automation gets you to "initial build-ready state." Post-migration QA, integration testing, and validation remain manual.

## Part 2: QA Prompt

David Knipe's article mentions a follow-up Part 2 covering a **QA prompt** for systematically comparing the upgraded CMS 13 site against the CMS 12 reference before going to production. Worth following up on for a complete picture.

## Related

- [[upgrade-checklist|CMS 13 Upgrade Checklist]] — the manual steps this automates
- [[breaking-changes|Breaking Changes in CMS 13]] — what the AI will be fixing
- [[search-to-graph|Search & Navigation → Graph Migration]] — the largest migration task

## Sources

- [David Knipe — CMS 13 Upgrades Are Faster With AI](https://www.david-tec.com/2026/04/optimizely-cms-13-upgrades-are-faster-with-ai---heres-the-claude-code-prompt-that-gets-you-started/) *(Apr 2026)*
- [Vaibhav (Royal Cyber) — Accelerating CMS Upgrades with Intelligent Automation](https://world.optimizely.com/blogs/vaibhav/dates/2026/4/accelerating-optimizely-cms-upgrades-with-intelligent-automation/) *(Apr 2026)*
