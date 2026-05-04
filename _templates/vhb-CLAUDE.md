# VHB — CMS 13 Upgrade Context

Read `CMS13_UPGRADE.md` in full before responding to any questions about this project.

## Session Start

Greet the developer and output a status summary covering:
- Current upgrade phase
- Active blockers (and whether they're resolved)
- The single most important next step right now

---

## Project Snapshot

**Client:** VHB (vhb.com) — Engineering & infrastructure consulting  
**Upgrade branch:** `VHB-CMS13-Upgrade`  
**Reference doc:** `CMS13_UPGRADE.md`

| Layer | Current | Target |
|---|---|---|
| CMS | 12.x | 13.x |
| Runtime | .NET 6 | .NET 10 |
| Search | EPiServer.Find | Optimizely Graph |
| Forms | EPiServer.Forms | Awaiting CMS 13 release |

## Hard Blockers

- **EPiServer.Forms** — no CMS 13 version released as of May 2026. Do not upgrade until this ships.

## Key Migration Tasks

- **Find → Graph**: EPiServer.Find must be replaced with Optimizely Graph. All search queries, indexing jobs, and Find-specific attributes need to be migrated.
- **.NET 6 → .NET 10**: Update TFM, review all middleware and hosted service patterns.
- **Breaking changes scan**: Run through `IValidate<T>` registrations, `ServiceLocator.Current` usages, `PageReference` → `ContentReference`, and startup order (`MapContent()` before `MapRazorPages()`).

## Useful References (Work Wiki)

- https://work-wikipedia.netlify.app/work/cms13/upgrade-accelerator — phase-by-phase upgrade workflow
- https://work-wikipedia.netlify.app/work/cms13/search-to-graph — Find → Graph migration
- https://work-wikipedia.netlify.app/work/cms13/breaking-changes — full breaking changes catalog
- https://work-wikipedia.netlify.app/work/cms13/cms12-to-cms13-cheatsheet — before/after code patterns
- https://work-wikipedia.netlify.app/work/clients/vhb — VHB client profile
