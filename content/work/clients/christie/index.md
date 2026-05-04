---
title: "Christie Digital"
tags:
  - clients
  - christie
  - optimizely
  - cms
  - commerce
---

# Christie Digital

**Site:** christiedigital.com  
**Industry:** Visual display technology  
**Hosting:** Optimizely DXP (Azure)

## Tech Stack

| Layer | Current | Target |
|---|---|---|
| CMS | Optimizely CMS 12 | CMS 13.x |
| Runtime | .NET 6 | .NET 10 |
| Commerce | Optimizely Commerce 14 | Commerce 15 |
| Search | EPiServer.Find | Optimizely Graph |
| Forms | EPiServer.Forms | Awaiting CMS 13 release |
| Localization | Optimizely LanguageManager | Awaiting CMS 13 release |

## Active Workstreams

| Workstream | Status | Details |
|---|---|---|
| CMS 12 → 13 upgrade | Discovery | Branch: `Christie-CMS13-Upgrade` — multiple blockers |
| Commerce 14 → 15 | Discovery | Bundled with CMS upgrade — significant breaking changes |
| Find → Graph migration | Discovery | Tied to upgrade path |

## Upgrade Notes

See the full upgrade guide on the `Christie-CMS13-Upgrade` branch: `CMS13-Upgrade-Guide.md`.

**Hard blockers:**
- EPiServer.Forms — no CMS 13 version confirmed as of May 2026
- Optimizely LanguageManager — no CMS 13 version confirmed as of May 2026
- Commerce 14 → 15 — separate major version upgrade running in parallel

**Scale:** Christie is the most complex client engagement — **67 page types, 47 block types**. Breaking change surface area is significantly higher than other clients.

**Commerce 14 → 15** introduces its own set of breaking changes on top of the CMS 12 → 13 changes. These two major upgrades must be coordinated carefully to avoid conflicts.

## Known Complexity Factors

- High content type count (67 pages, 47 blocks) means `IValidate<T>` and `ServiceLocator.Current` patterns are likely widespread — run a full scan before estimating effort
- LanguageManager dependency: if CMS 13 version doesn't ship before project start, must plan for a two-phase upgrade or temporary workaround
- Find usage is likely deeply integrated at this scale — Graph migration scope could be substantial

## Related Wiki Pages

- [[cms13/upgrade-accelerator|CMS 13 Upgrade Accelerator]]
- [[cms13/search-to-graph|Search & Navigation → Graph Migration]]
- [[cms13/breaking-changes|Breaking Changes Catalog]]
- [[cms13/translations|Translations & Localization]]
- [[cms13/upgrade-checklist|Upgrade Checklist]]
