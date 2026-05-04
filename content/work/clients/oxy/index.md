---
title: "Oxy (Occidental Petroleum)"
tags:
  - clients
  - oxy
  - optimizely
  - cms
---

# Oxy (Occidental Petroleum)

**Site:** oxy.com  
**Industry:** Oil & gas / chemicals  
**Hosting:** Optimizely DXP (Azure)

## Tech Stack

| Layer | Current | Target |
|---|---|---|
| CMS | Optimizely CMS 12.31.2 | CMS 13.x |
| Runtime | .NET 6 | .NET 10 |
| Search | EPiServer.Find 16.5.0 | Optimizely Graph |
| Auth | Sustainsys SAML2 + Azure B2C | Opti ID + SAML2 (.NET 10) |
| Forms | EPiServer.Forms 5.10.4 | Awaiting CMS 13 release |
| Content Graph | Optimizely.ContentGraph.Cms 3.14.3 | Already installed |
| Image processing | EPiServer.ImageLibrary.ImageSharp | Update for CMS 13 |

## Active Workstreams

| Feature | Status | Details |
|---|---|---|
| CMS 12 → 13 upgrade | Planning | Branch: `CMS-13-UpgradePath` — blocked on EPiServer.Forms CMS 13 |
| Spanish (es-CL) expansion | Planning | [[automated-translation\|Automated Translation Service]] — awaiting client sign-off |
| OxyChem (new instance) | Discovery | Brand new CMS 13 greenfield site — separate from oxy.com |

## Upgrade Notes

See the full upgrade guide on the `CMS-13-UpgradePath` branch: `UPGRADE-CMS13.md`.

**Hard blockers:**
- EPiServer.Forms — no CMS 13 version confirmed as of May 2026
- Opti ID — must be provisioned via DXP portal before go-live
- SAML2 package rename required (`Sustainsys.Saml2.AspNetCore2` → `Sustainsys.Saml2.AspNetCore`)

**Head start:** ContentGraph is already installed (3.14.3) — ahead of most CMS 12 projects.

## Known Quirks

- Two SAML2 providers configured in `Startup.cs` (login + password change) — both need validation against .NET 10 and Opti ID
- Custom `ContactReasonActorsExecutingService` and `FormEventCompletionInitialization` deeply tied to EPiServer.Forms — cannot upgrade Forms until CMS 13 version ships
- `IFirstRequestInitializer` used by several modules — confirm interface still exists in CMS 13

## Related Wiki Pages

- [[cms13/upgrade-accelerator|CMS 13 Upgrade Accelerator]]
- [[cms13/search-to-graph|Search & Navigation → Graph Migration]]
- [[cms13/translations|Translations & Localization]]
- [[cms13/debugging-dxp|Debugging in DXP]]
