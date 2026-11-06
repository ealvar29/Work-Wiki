---
title: "VHB"
tags:
  - clients
  - vhb
  - optimizely
  - cms
---

**Site:** vhb.com  
**Industry:** Engineering & infrastructure consulting  
**Hosting:** Optimizely DXP (Azure)

## Tech Stack

| Layer | Current | Target |
|---|---|---|
| CMS | Optimizely CMS 12 | CMS 13.x |
| Runtime | .NET 6 | .NET 10 |
| Search | EPiServer.Find 16.4.1 | Optimizely Graph |
| Forms | EPiServer.Forms | EPiServer.Forms 6 (shipped; in production on OxyChem) |

## Active Workstreams

| Workstream | Status | Details |
|---|---|---|
| CMS 12 → 13 upgrade | Assessed (VHBK-499) | Live spike branch: `spike/cms13` (net10, CMS 13.5.1, 2026-11-04). The older `VHB-CMS13-Upgrade` branch is superseded |

## Upgrade Notes

The older upgrade guide lives on the `VHB-CMS13-Upgrade` branch (`CMS13_UPGRADE.md`) and predates the spike — prefer `spike/cms13`.

~~**Hard blockers:** EPiServer.Forms — no CMS 13 version confirmed as of May 2026~~ — **stale.** Forms 6 ships for CMS 13 and is in production on OxyChem. See [[work/cms13/forms-cms13|Forms on CMS 13]].

**Find → Graph migration required.** VHB uses EPiServer.Find 16.4.1 for search — must be replaced with Optimizely Graph before go-live on CMS 13.

**Minisites.** VHB renders minisites (`MinisiteHome` page type, `_MinisiteLayout.cshtml`, regular-vs-minisite branching in `Global.GetHomePage()`). Any home-page / site resolution on that path must be re-checked against the [[work/cms13/applications-model|Applications model]] — `SiteDefinition` still compiles on CMS 13, so a wrong result would be silent.

### VHBK-499 assessment (2026-11-05)

Source: VHB spike VHBK-499, 2026-11-05 (spike/cms13 commit 13ed447, CMS 13.5.1 / Forms 6.0.2 package metadata).

- **Blocker:** `EPiServer.ConnectForCampaign` has **no CMS 13 build** (4.3.0 is the last release, capped below CMS 13 / Forms 6). The `/subscribe/` Forms → Campaign wiring needs replacing — see [[work/cms13/forms-cms13#marketing-automation-connectors|Marketing Automation connectors]].
- **`PropertyList<T>` risk:** **6 of 9** PropertyLists are at risk of the CMS 13 silent-empty hydration defect — see [[work/cms13/post-upgrade-gotchas|Post-Upgrade Gotchas]].
- **Recommendation:** split the Find reduction into a **pre-upgrade ticket**, so the CMS 13 upgrade does not also carry the Find → Graph rewrite.

## Related Wiki Pages

- [[work/cms13/upgrade-accelerator|CMS 13 Upgrade Accelerator]]
- [[work/cms13/search-to-graph|Search & Navigation → Graph Migration]]
- [[work/cms13/breaking-changes|Breaking Changes Catalog]]
- [[work/cms13/upgrade-checklist|Upgrade Checklist]]
