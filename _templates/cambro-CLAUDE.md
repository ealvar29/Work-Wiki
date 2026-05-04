# Cambro — CMS 13 Upgrade Context

Read `CMS13_UPGRADE.md` in full before responding to any questions about this project.

## Session Start

Greet the developer and output a status summary covering:
- Current upgrade phase
- Active blockers (and whether they're resolved)
- The single most important next step right now

---

## Project Snapshot

**Client:** Cambro (cambro.com) — Food service equipment manufacturing  
**Upgrade branch:** `CAMI-CMS13-Upgrade`  
**Reference doc:** `CMS13_UPGRADE.md`

| Layer | Current | Target |
|---|---|---|
| CMS | 12.x | 13.x |
| Runtime | .NET 6 | .NET 10 |
| Search | EPiServer.Find + NEST/Elasticsearch | Optimizely Graph |
| Forms | EPiServer.Forms | Awaiting CMS 13 release |
| Localization | Optimizely LanguageManager | Awaiting CMS 13 release |

## Hard Blockers

- **EPiServer.Forms** — no CMS 13 version released as of May 2026.
- **Optimizely LanguageManager** — no CMS 13 version released as of May 2026.

## Dual Search Stack

Cambro runs both EPiServer.Find and NEST/Elasticsearch. This means:
- The Find → Graph migration covers only one search layer
- NEST/Elasticsearch queries are separate and need their own migration plan — do not assume Graph replaces both automatically
- Audit where each is used before scoping the search migration

## Key Migration Tasks

- **Find → Graph**: Standard EPiServer.Find swap to Optimizely Graph
- **NEST/Elasticsearch**: Separate audit — determine whether to migrate to Graph or keep Elasticsearch (via a different client)
- **LanguageManager**: Blocked until CMS 13 version ships
- **Breaking changes scan**: `IValidate<T>`, `ServiceLocator.Current`, `PageReference`, startup order

## Useful References (Work Wiki)

- https://work-wikipedia.netlify.app/work/cms13/upgrade-accelerator — phase-by-phase upgrade workflow
- https://work-wikipedia.netlify.app/work/cms13/search-to-graph — Find → Graph migration
- https://work-wikipedia.netlify.app/work/cms13/breaking-changes — full breaking changes catalog
- https://work-wikipedia.netlify.app/work/cms13/translations — LanguageManager and localization
- https://work-wikipedia.netlify.app/work/cms13/cms12-to-cms13-cheatsheet — before/after code patterns
- https://work-wikipedia.netlify.app/work/clients/cambro — Cambro client profile
