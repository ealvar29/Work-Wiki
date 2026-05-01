---
title: "CMS 13 Upgrade Accelerator"
tags:
  - optimizely
  - cms
  - upgrade
  - accelerator
---

# CMS 13 Upgrade Accelerator

This is the **start here** page for any CMS 13 client upgrade engagement. Work through it top to bottom before touching any code. The wiki has everything you need — this page tells you what to read and when.

---

## Step 0 — Client Readiness Checklist

Fill this out before anything else. It determines which phases apply and what the hard blockers are.

| Question | Answer |
|---|---|
| Current CMS version | |
| Current .NET version | |
| Hosting — DXP (Azure) or on-prem? | |
| Uses EPiServer.Find / Search & Navigation? | |
| Uses EPiServer.Forms? | |
| Uses EPiServer.Labs.LanguageManager? | |
| Uses Optimizely Commerce? | |
| Multi-site setup? | |
| Uses SAML2 / external SSO? | |
| Has custom `IValidate<T>` validators? | |
| Has custom admin tools (MenuProvider)? | |
| Has custom property editors? | |
| Has custom initialization modules? | |
| Has reusable add-ons / NuGet packages? | |

**Client upgrade files** (private — check the client repo):

| Client | Repo branch | Upgrade file |
|---|---|---|
| VHB | `upgrade/cms13` | `CMS13_UPGRADE.md` |
| Oxy | `CMS-13-UpgradePath` | `UPGRADE-CMS13.md` |
| Christie Digital | `Christie-CMS13-Upgrade` | `CMS13-Upgrade-Guide.md` |
| Cambro | `upgrade/cms13` | `CMS13_UPGRADE.md` |

---

## ⚠️ Check Hard Blockers First

**Do not commit to a go-live date until these are resolved:**

| Blocker | Affects | Where to check |
|---|---|---|
| EPiServer.Forms — no CMS 13 version yet | VHB, Oxy, Christie, Cambro | [NuGet — EPiServer.Forms.Core](https://www.nuget.org/packages/EPiServer.Forms.Core) |
| EPiServer.Labs.LanguageManager — no CMS 13 version yet | Christie, Cambro | [Optimizely NuGet feed](https://nuget.optimizely.com/) |
| Commerce 15 required (replaces Commerce 14) | Christie | [NuGet — EPiServer.Commerce](https://www.nuget.org/packages/EPiServer.Commerce) |
| Opti ID must be provisioned via DXP portal | All clients | Start early — do not leave to the end |

---

## Phase 1 — Discovery

**Goal:** Understand what CMS 13 is, what changed, and what the upgrade involves before touching any client code.

| Read | Why |
|---|---|
| [[what-is-cms13\|What is CMS 13?]] | Platform overview — .NET 10, Graph, Visual Builder, Opti ID |
| [[breaking-changes\|Breaking Changes]] | Full catalog of what changed — read this entirely |
| [[dotnet-compatibility\|.NET Compatibility]] | Confirm .NET 10 is the target |
| [[cms13-technical-qa\|CMS 13 Technical Q&A]] | Answers to real-world questions: Commerce 15, DAM, Opal, frontend options |

**At the end of Phase 1 you should know:**
- What the client's upgrade complexity looks like based on their checklist answers
- Whether any hard blockers apply to this client
- Roughly how many phases of work are involved

---

## Phase 2 — Planning

**Goal:** Scope the upgrade work and produce a plan the team can execute against.

| Read | Why |
|---|---|
| [[upgrading-from-cms12\|Upgrading from CMS 12]] | Overall strategy and what changed |
| [[upgrade-checklist\|Upgrade Checklist]] | Step-by-step reference — use as the base for your project plan |
| [[applications-model\|Applications Model]] | SiteDefinition is gone — understand the replacement before planning |
| [[search-to-graph\|Search & Navigation → Graph]] | If client uses Find, this is a significant piece of work — scope it separately |
| [[extension-migration\|Migrating CMS Extensions]] | If client has reusable packages or add-ons in the solution |
| [[multisite-plugin-cms13\|Multi-Site Plugin v2]] | If client uses `DavidHome.Optimizely.MultiSite` |

**Outputs from Phase 2:**
- Package audit complete (every NuGet dependency checked for CMS 13 compatibility)
- Find → Graph migration scoped (controllers, listing pages, scheduled jobs that touch search)
- Blockers confirmed and tracked
- Estimate agreed with client

---

## Phase 3 — Execution

**Goal:** Do the upgrade. Work through packages, then code changes, then config.

| Read | Why |
|---|---|
| [[graph-sdk\|Graph C# SDK]] | Reference for rewriting Find queries |
| [[ivalidate-breaking-change\|IValidate\<T\> Breaking Change]] | Validators silently stop working — fix before QA |
| [[post-upgrade-gotchas\|Post-Upgrade Gotchas]] | `MapContent()` ordering bug (CMS-51344) — hits most projects |
| [[custom-property-editors\|Custom Property Editors]] | If client has Dojo-based editors that need rewriting |
| [[custom-admin-tools\|Custom Admin Tools]] | If client has custom MenuProvider / admin controllers |
| [[removing-unused-properties\|Removing Unused Properties]] | Good time to clean up content model debt during the upgrade |
| [[translations\|Translations & Localization]] | If client uses Language Manager or custom URL segments |

**Set up the Claude upgrade branch** — see [below](#set-up-the-claude-upgrade-branch).

---

## Phase 4 — QA & Go-Live

**Goal:** Validate everything works before going live.

| Read | Why |
|---|---|
| [[debugging-dxp\|Debugging in DXP]] | Application Insights, logging — know how to diagnose issues in staging |
| [[cms12-to-cms13-case-study\|CMS 12 → 13 Case Study]] | Real-world walkthrough — cross-check your work against a completed upgrade |
| [[visual-builder\|Visual Builder]] | Editors will need orientation — test all page and block types |
| [[ai-assisted-upgrade\|AI-Assisted Upgrades]] | Speed up the QA sweep with Claude Code prompts |

**Go/No-Go criteria before production deploy:**

- [ ] All hard blockers resolved (Forms, LanguageManager, Commerce 15 as applicable)
- [ ] Opti ID provisioned and editorial login tested
- [ ] Graph fully indexed — Content Manager functional
- [ ] All Find query code rewritten and search results validated
- [ ] `IValidate<T>` validators confirmed firing on content save
- [ ] `MapContent()` ordering verified in endpoint configuration
- [ ] All page types and block types render correctly in Visual Builder
- [ ] Full regression pass complete with client sign-off

---

## Set Up the Claude Upgrade Branch

For every client upgrade, create a dedicated branch in the **client's private repo** with a `CLAUDE.md` file. Claude Code will use this file to understand the codebase and assist with the upgrade.

### 1. Create the branch

```bash
git checkout -b upgrade/cms13
```

### 2. Create `CLAUDE.md` at the repo root

Use this template — fill in the client-specific sections:

```markdown
# [Client Name] — CMS 13 Upgrade

## Project Context
- CMS version: [e.g. EPiServer.CMS 12.31.2]
- .NET version: [e.g. 6.0]
- Hosting: [DXP / on-prem]
- Main web project: [e.g. src/ClientName.Web/]

## Upgrade Goal
Upgrade this project from CMS 12 / .NET [X] to CMS 13 / .NET 10.
Reference guide: see CMS13_UPGRADE.md in this repo.

## Known Blockers
- [e.g. EPiServer.Forms — no CMS 13 version yet, do not upgrade Forms packages]
- [e.g. Opti ID not yet provisioned]

## Key Custom Code Areas
- [e.g. Custom IValidate<T> validators in: src/ClientName.Web/Business/Validation/]
- [e.g. Find query code in: src/ClientName.Web/Controllers/Search/]
- [e.g. IInitializableModule implementations in: src/ClientName.Web/Infrastructure/]

## What NOT to Change
- Do not touch frontend (webpack/vite config, JS, CSS)
- Do not modify database migration scripts
- Do not upgrade EPiServer.Forms until a CMS 13 version is confirmed

## Reference
- Full upgrade checklist: CMS13_UPGRADE.md (this repo)
- CMS 13 wiki: https://work-wikipedia.netlify.app/work/cms13/
```

### 3. Commit and push the branch

```bash
git add CLAUDE.md
git commit -m "Add CMS 13 upgrade context for Claude Code"
git push -u origin upgrade/cms13
```

Claude Code will now have full project context whenever a dev opens this branch — it reads `CLAUDE.md` automatically on startup.

---

## Reference

- [[cms13-resources\|All CMS 13 Resources & Links]]
- [Optimizely official upgrade guide](https://docs.developers.optimizely.com/content-management-system/docs/upgrading-to-cms-13)
- [CMS 13 breaking changes](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/breaking-changes-in-cms-13)
