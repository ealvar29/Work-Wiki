---
title: "Oxy (Occidental Petroleum)"
tags:
  - clients
  - oxy
  - optimizely
  - cms
---

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
| Forms | EPiServer.Forms 5.10.4 | **EPiServer.Forms 6.0.0 — CMS 13-ready** (proven on OxyChem) |
| Content Graph | Optimizely.ContentGraph.Cms 3.14.3 (CMS 12 pkg) | Migrate to renamed `Optimizely.Graph.Cms` + `.Query` 13.0.2 — the 3.x package is CMS 12 only |
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
- ~~EPiServer.Forms — no CMS 13 version~~ → **Resolved:** Forms 6.0.0 is CMS 13-ready (`AddForms()`), proven on OxyChem June 2026
- Opti ID — must be provisioned via DXP portal before go-live
- SAML2 package rename required (`Sustainsys.Saml2.AspNetCore2` → `Sustainsys.Saml2.AspNetCore`)

**Head start:** ContentGraph 3.14.3 is installed — but note that's the **CMS 12** package; the CMS 13 migration target is the renamed `Optimizely.Graph.Cms` 13.0.2 (see [[cms13/graph-sdk|Graph SDK]]).

> **⚠️ Flag for review (June 2026):** the OxyChem workstream below is listed as a *"brand new CMS 13 greenfield site,"* but the actual OxyChem repo (`Oxy.Com.Web`, branch `OxyChem-CMS-13-Upgrade`) is a **CMS 12 → 13 upgrade** of an existing codebase (Find removed, net6→net10, ~180 files fixed), not greenfield, and it is **largely complete** — build clean, Forms/Graph/AdvancedReviews wired. Confirm whether oxy.com and OxyChem are separate engagements and update this section accordingly.

## Known Quirks

- Two SAML2 providers configured in `Startup.cs` (login + password change) — both need validation against .NET 10 and Opti ID
- Custom `ContactReasonActorsExecutingService` and `FormEventCompletionInitialization` deeply tied to EPiServer.Forms — cannot upgrade Forms until CMS 13 version ships
- `IFirstRequestInitializer` used by several modules — confirm interface still exists in CMS 13

## Related Wiki Pages

- [[cms13/upgrade-accelerator|CMS 13 Upgrade Accelerator]]
- [[cms13/search-to-graph|Search & Navigation → Graph Migration]]
- [[cms13/translations|Translations & Localization]]
- [[cms13/debugging-dxp|Debugging in DXP]]
