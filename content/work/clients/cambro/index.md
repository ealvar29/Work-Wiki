---
title: "Cambro"
tags:
  - clients
  - cambro
  - optimizely
  - cms
---

**Site:** cambro.com  
**Industry:** Food service equipment manufacturing  
**Hosting:** Optimizely DXP (Azure)

## Tech Stack

| Layer | Current | Target |
|---|---|---|
| CMS | Optimizely CMS 12 | CMS 13.x |
| Runtime | .NET 6 | .NET 10 |
| Search | EPiServer.Find + NEST/Elasticsearch | Optimizely Graph |
| Forms | EPiServer.Forms | Awaiting CMS 13 release |
| Localization | Optimizely LanguageManager | Awaiting CMS 13 release |

## Active Workstreams

| Workstream | Status | Details |
|---|---|---|
| CMS 12 → 13 upgrade | Discovery | Branch: `CAMI-CMS13-Upgrade` — blocked on Forms + LanguageManager |

## Upgrade Notes

See the full upgrade guide on the `CAMI-CMS13-Upgrade` branch: `CMS13_UPGRADE.md`.

**Hard blockers:**
- EPiServer.Forms — no CMS 13 version confirmed as of May 2026
- Optimizely LanguageManager — no CMS 13 version confirmed as of May 2026

**Dual search stack:** Cambro runs both EPiServer.Find and NEST/Elasticsearch alongside each other. The migration to Optimizely Graph must account for both integrations — NEST queries may need to be re-evaluated separately from Find usage.

## Known Complexity Factors

- Two search layers (Find + NEST/Elasticsearch) means the search migration scope is larger than a standard Find → Graph swap
- LanguageManager dependency shares the same blocker as Christie Digital — likely waiting on the same package release
- Forms + LanguageManager together mean two external package dependencies must ship for CMS 13 before this upgrade can complete

## Related Wiki Pages

- [[cms13/upgrade-accelerator|CMS 13 Upgrade Accelerator]]
- [[cms13/search-to-graph|Search & Navigation → Graph Migration]]
- [[cms13/breaking-changes|Breaking Changes Catalog]]
- [[cms13/translations|Translations & Localization]]
- [[cms13/upgrade-checklist|Upgrade Checklist]]
