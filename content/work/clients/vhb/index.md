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
| Search | EPiServer.Find | Optimizely Graph |
| Forms | EPiServer.Forms | Awaiting CMS 13 release |

## Active Workstreams

| Workstream | Status | Details |
|---|---|---|
| CMS 12 → 13 upgrade | Planning | Branch: `VHB-CMS13-Upgrade` — blocked on EPiServer.Forms CMS 13 |

## Upgrade Notes

See the full upgrade guide on the `VHB-CMS13-Upgrade` branch: `CMS13_UPGRADE.md`.

**Hard blockers:**
- EPiServer.Forms — no CMS 13 version confirmed as of May 2026

**Find → Graph migration required.** VHB uses EPiServer.Find for search — must be replaced with Optimizely Graph before go-live on CMS 13.

## Related Wiki Pages

- [[cms13/upgrade-accelerator|CMS 13 Upgrade Accelerator]]
- [[cms13/search-to-graph|Search & Navigation → Graph Migration]]
- [[cms13/breaking-changes|Breaking Changes Catalog]]
- [[cms13/upgrade-checklist|Upgrade Checklist]]
