---
title: "Christie Digital"
tags:
  - clients
  - christie
  - optimizely
  - cms
  - commerce
---

**Site:** christiedigital.com  
**Industry:** Visual display technology  
**Hosting:** Optimizely DXP (Azure)

## Tech Stack

| Layer | Current | Target |
|---|---|---|
| CMS | Optimizely CMS 12 | CMS 13.x |
| Runtime | .NET 6 | .NET 10 |
| Commerce | Optimizely Commerce 14 | Commerce 15 |
| Search | EPiServer.Find | Optimizely Graph (`Optimizely.Graph.Cms` 13.0.2 — proven on OxyChem) |
| Forms | EPiServer.Forms | **EPiServer.Forms 6.0.0 — CMS 13-ready** (no longer a blocker; proven on OxyChem) |
| Localization | Optimizely LanguageManager | Verify CMS 13 release status (unconfirmed) |

## Active Workstreams

| Workstream | Status | Details |
|---|---|---|
| CMS 12 → 13 upgrade | Discovery | Branch: `Christie-CMS13-Upgrade` — multiple blockers |
| Commerce 14 → 15 | Discovery | Bundled with CMS upgrade — significant breaking changes |
| Find → Graph migration | Discovery | Tied to upgrade path |

## Upgrade Notes

See the full upgrade guide on the `Christie-CMS13-Upgrade` branch: `CMS13-Upgrade-Guide.md`.

**De-risked since May 2026 (proven on the OxyChem CMS 13.0.2 upgrade — June 2026):**
- ✅ **EPiServer.Forms** — 6.0.0 ships and works (`AddForms()`). No longer a blocker.
- ✅ **Find → Graph** — the CMS 13 Graph SDK is real and wired end-to-end on OxyChem (renamed packages + dual DI registration + `ContentGraphSearchService`). The migration is well-trodden now — see [[work/cms13/graph-sdk|Graph SDK]] and [[work/cms13/post-upgrade-gotchas|Post-Upgrade Gotchas]].
- ✅ **Advanced.CMS.AdvancedReviews** — 2.0.0 ships for CMS 13.

**Remaining hard blockers:**
- Optimizely LanguageManager — CMS 13 version unconfirmed; verify before estimating the localization workstream
- Commerce 14 → 15 — separate major version upgrade running in parallel (CMS 13 is not compatible with Commerce 14)
- Geta.Sitemaps / EnvironmentSynchronizer — still no CMS 13 release (see [[work/cms13/agent-quickstart|Vendor Status]])

**Scale:** Christie is the most complex client engagement — **67 page types, 47 block types**. Breaking change surface area is significantly higher than other clients.

**Commerce 14 → 15** introduces its own set of breaking changes on top of the CMS 12 → 13 changes. These two major upgrades must be coordinated carefully to avoid conflicts.

## Known Complexity Factors

- High content type count (67 pages, 47 blocks) means `IValidate<T>` and `ServiceLocator.Current` patterns are likely widespread — run a full scan before estimating effort
- LanguageManager dependency: if CMS 13 version doesn't ship before project start, must plan for a two-phase upgrade or temporary workaround
- Find usage is likely deeply integrated at this scale — Graph migration scope could be substantial

## Related Wiki Pages

- [[work/cms13/upgrade-accelerator|CMS 13 Upgrade Accelerator]]
- [[work/cms13/search-to-graph|Search & Navigation → Graph Migration]]
- [[work/cms13/breaking-changes|Breaking Changes Catalog]]
- [[work/cms13/translations|Translations & Localization]]
- [[work/cms13/upgrade-checklist|Upgrade Checklist]]
