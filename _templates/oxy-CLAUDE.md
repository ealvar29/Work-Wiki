# Oxy — CMS 13 Upgrade Context

Read `UPGRADE-CMS13.md` in full before responding to any questions about this project.

## Session Start

Greet the developer and output a status summary covering:
- Current upgrade phase
- Active blockers (and whether they're resolved)
- The single most important next step right now

---

## Project Snapshot

**Client:** Oxy (oxy.com) — Occidental Petroleum  
**Upgrade branch:** `CMS-13-UpgradePath`  
**Reference doc:** `UPGRADE-CMS13.md`

| Layer | Current | Target |
|---|---|---|
| CMS | 12.31.2 | 13.x |
| Runtime | .NET 6 | .NET 10 |
| Search | EPiServer.Find 16.5.0 | Optimizely Graph |
| Auth | Sustainsys SAML2 + Azure B2C | Opti ID + SAML2 (.NET 10) |
| Forms | EPiServer.Forms 5.10.4 | Awaiting CMS 13 release |
| ContentGraph | 3.14.3 (already installed) | Update for CMS 13 |

## Hard Blockers

- **EPiServer.Forms** — no CMS 13 version released as of May 2026. Do not upgrade until this ships.
- **Opti ID** — must be provisioned through the DXP portal before go-live. Not a code task.
- **SAML2 rename** — `Sustainsys.Saml2.AspNetCore2` → `Sustainsys.Saml2.AspNetCore` required.

## What's Already Done / Ahead of Curve

- ContentGraph 3.14.3 is already installed — most CMS 12 projects don't have this yet.
- Spanish (es-CL) language branch infrastructure already in place.

## Known Quirks

- Two SAML2 providers in `Startup.cs` (login + password change flow) — both need validation against .NET 10 and Opti ID.
- `ContactReasonActorsExecutingService` and `FormEventCompletionInitialization` are tightly coupled to EPiServer.Forms — do not touch Forms until CMS 13 version ships.
- Check whether `IFirstRequestInitializer` is still used — it's removed in CMS 13.

## Active Parallel Workstream

**Spanish (es-CL) translation service** — Azure AI Translator + human review. Planning phase, awaiting client sign-off. See `TRANSLATION-SERVICE.md` when implementation begins (not yet created).

## Useful References (Work Wiki)

- https://work-wikipedia.netlify.app/work/cms13/upgrade-accelerator — phase-by-phase upgrade workflow
- https://work-wikipedia.netlify.app/work/cms13/search-to-graph — Find → Graph migration
- https://work-wikipedia.netlify.app/work/cms13/breaking-changes — full breaking changes catalog
- https://work-wikipedia.netlify.app/work/cms13/cms12-to-cms13-cheatsheet — before/after code patterns
- https://work-wikipedia.netlify.app/work/clients/oxy — Oxy client profile
