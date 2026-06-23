---
title: AI-Assisted CMS 13 Upgrades
tags:
  - optimizely
  - cms
  - migration
  - ai
  - claude
---

CMS 13 has a lot of breaking changes. AI coding tools — especially Claude Code — can significantly reduce the manual effort. David Knipe documented a practical approach using a structured Claude Code prompt to drive the migration.

## Before Running This Prompt

Run the [[upgrade-assistant-mcp|Optimizely Upgrade Assistant MCP]] first. Its `assess_optimizely_upgrade` and `build_optimizely_upgrade_plan` tools produce an `upgrade-plan.md` and structured task list that you can hand to Claude Code directly — replacing the "Analyse my existing codebase" step below with a faster, more thorough static-analysis pass.

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

## Part 2: QA Prompt (David Knipe)

After the upgrade is built, this prompt systematically compares the CMS 13 candidate against the CMS 12 baseline by crawling both sites and checking each page pair. It catches rendering errors, missing translations, and broken navigation that manual testing would likely miss.

```
You are a QA engineer testing an Optimizely CMS 13 site upgrade. Your job is to
compare a reference site (the known-good baseline) against an upgraded site and
report differences.

STEP 1 — BUILD THE URL LIST
- Crawl the reference site to 2 hops from the homepage
- Collect only internal URLs with paths (skip fragments, mailto, tel, javascript)
- Include only pages returning HTTP 200 anonymously
- Skip URLs containing: /cart, /checkout, /wishlist, /my-account, /order-,
  /login, /register, /password or query strings
- Deduplicate and sort results
- Derive upgrade equivalents by domain substitution

STEP 2 — TEST EACH URL PAIR
Run these checks on every reference/upgrade pair:

| Check                  | Pass condition                                                        |
|------------------------|-----------------------------------------------------------------------|
| HTTP status            | Upgrade returns same code as reference                                |
| Page renders           | Response body is not an error page, exception dump, or blank          |
| Translation keys       | No raw key paths visible (pattern: /[A-Z][a-z]+/[A-Z][a-z]+/)        |
| Key content present    | Major headings and section titles from reference appear on upgrade    |
| No missing renderers   | No [BlockType] placeholder text or Razor exception fragments          |
| Navigation present     | <nav> or header/footer elements exist                                 |

Acceptable differences (do not flag):
- Live data variations (prices, stock status, counts)
- Timestamps and relative dates
- Image URLs or CDN paths
- Minor whitespace or HTML attribute ordering
- Intentionally different content between environments

STEP 3 — REPORT
Group failures by category:
- HTTP errors (4xx/5xx responses)
- Translation keys (missing localization)
- Missing content (sections absent on upgrade)
- Rendering errors (exceptions, missing block output)
- Wrong content (significantly different text)

End with totals: "X PASS, Y FAIL out of Z URLs tested"
```

### Why Two Hops

Two hops from the homepage balances coverage against token usage and run time. It hits the most important pages without crawling the entire site.

### What It Catches in Practice

A real example caught raw translation key paths like `/Login/Form/Label/Email` and `/Shared/Address/Form/Label/FirstName` in login overlays — missing XML translation resource entries that would have been invisible in manual testing.

### Limitations

- **Anonymous crawl only** — authenticated/personalised content is not tested
- **Not a visual regression tool** — can't detect layout breakage when HTML is technically correct
- **Client-side rendered content** may not reflect what a browser actually renders

## Related

- [[upgrade-checklist|CMS 13 Upgrade Checklist]] — the manual steps this automates
- [[breaking-changes|Breaking Changes in CMS 13]] — what the AI will be fixing
- [[search-to-graph|Search & Navigation → Graph Migration]] — the largest migration task

## Sources

- [David Knipe — CMS 13 Upgrades Are Faster With AI (Part 1)](https://www.david-tec.com/2026/04/optimizely-cms-13-upgrades-are-faster-with-ai---heres-the-claude-code-prompt-that-gets-you-started/) *(Apr 2026)*
- [David Knipe — The Claude Code Prompt I Use to QA a CMS 13 Upgrade (Part 2)](https://www.david-tec.com/2026/04/the-claude-code-prompt-i-use-to-qa-an-optimizely-cms-13-upgrade/) *(Apr 2026)*
- [Vaibhav (Royal Cyber) — Accelerating CMS Upgrades with Intelligent Automation](https://world.optimizely.com/blogs/vaibhav/dates/2026/4/accelerating-optimizely-cms-upgrades-with-intelligent-automation/) *(Apr 2026)*
