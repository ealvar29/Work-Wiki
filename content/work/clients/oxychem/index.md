---
title: "OxyChem (Occidental Chemical Corporation)"
tags:
  - clients
  - oxychem
  - optimizely
  - cms
---

**Site:** oxychem.com
**Industry:** Chemicals
**Hosting:** Optimizely DXP (Azure), fronted by Cloudflare
**Engagement:** CMS 12 → 13 upgrade of an existing codebase — **live in production since 2026-09-18**

> [!important] OxyChem and oxy.com are **separate engagements**
> They were split into independent projects — separate repos-of-record, separate DXP projects, separate roadmaps. That separation is what lets OxyChem move to CMS 13 while [[work/clients/oxy/index|oxy.com]] stays on CMS 12 for now. This was an **in-place upgrade of a live site**, not a new build, and findings from one project should not be read across to the other without checking.

OxyChem is Jaxon's **reference implementation** for CMS 12 → 13. Nearly every page under [[work/cms13/index|CMS 13]] was written from this upgrade, so when the wiki says "proven on OxyChem," this is the project it means. It is now also our only CMS 13 site with real production traffic, which makes its post-launch findings the most valuable ones we have.

## Status — live, five weeks in

The upgrade **cut over to production on 2026-09-18** and the engagement is now post-launch support and incremental work, tracked under the `OX-151` **Post Go-Live** epic.

| Workstream | Status |
|---|---|
| Core upgrade (framework, packages, ~180 API breaks) | Complete, in production |
| Find → Optimizely Graph | Complete — live site search |
| Opti ID editor auth | Live. Editors sign in at `/ui/cms` |
| Embedded DAM | Live. Renditions work; see the renditions note below |
| Production cutover (DNS, certs, redirect corpus) | Complete |
| Deploy pipelines (Integration + Preproduction) | Complete |
| **Client UAT** | **Superseded by go-live.** The pre-cutover QA epic was closed 2026-10-23 without completing — production answered the questions first |

> The CMS 13 QA & UAT epic and its twelve section tickets were closed as superseded on 2026-10-23. Where a QA row found something real it had already been split into its own ticket. The lesson generalises: **a long-running UAT epic that straddles a cutover date loses to the cutover.** Verification after launch belongs in monitoring and small tickets, not in a twelve-part plan written before launch.

## Tech Stack

| Layer | Was (CMS 12) | Now (CMS 13, in production) |
|---|---|---|
| CMS | Optimizely CMS 12 | `EPiServer.Cms` / `EPiServer.CloudPlatform.Cms` **13.1.3** |
| Runtime | .NET 6 | **.NET 10** (SDK pinned `10.0.300`) |
| Search | EPiServer.Find | `Optimizely.Graph.Cms` + `.Query` **13.1.3** — Find fully removed |
| Editor auth | Sustainsys SAML2 + `EPiServer.Cms.UI.AspNetIdentity` | `EPiServer.OptimizelyIdentity` **13.1.3** (Opti ID) |
| Forms | EPiServer.Forms 5.x | **6.0.0** |
| **404 / redirects** | Geta.NotFoundHandler.Optimizely | **`Jaxon.Redirector.Cms13` 0.1.170 — sole handler.** Geta removed entirely |
| Content review | Advanced.CMS.AdvancedReviews | **2.0.0** |
| Sitemaps | Geta.Optimizely.Sitemaps 3.x | **4.0.0** |
| Content type icons | Geta.Optimizely.ContentTypeIcons 3.x | **4.1.0** |
| Env config | Addon.Episerver.EnvironmentSynchronizer 1.x | **2.0.1** |
| DAM | — | `EPiServer.Cms.DamIntegration.UI` + `EPiServer.Cms.UI.ContentManager` **13.1.3** |
| AI | — | `Optimizely.Cms.OpalChat` **2.0.0** + `Optimizely.Cms.Opal.Tools` **13.3.1** |
| Mapping | AutoMapper 13.0.1 | **16.1.1** (CVE remediation) |

> [!warning] Integration and Production are on different CMS versions
> `integration` runs **CMS 13.4.0** (with `OpalChat` 13.4.0, which moved onto the CMS version line at 13.2.0 and is a hard dependency of `CloudPlatform.Cms` 13.4.0). `main` — and therefore Preproduction and Production — is still on **13.1.3**. That divergence is tracked and owns a promote-or-park decision. Until it resolves, **Integration is not a faithful rehearsal of Production.** Always read the csproj on the branch you are on.
>
> 🟢 **The bump earns its keep: 13.4.0 fixed the DAM image-picker defect** (2026-10-22). On 13.1.3 an editor selecting a *rendition* got `Renditions cannot be used. Please select an original asset.` and the reference was never persisted — 13.1.3 shipped the refusal string and none of the implementation. Production still has that defect until the promote lands. Detail: [[work/cms13/dam-integration#per-image-rendition-selection--blocked-before-1340-working-from-1340|DAM Integration → per-image rendition selection]].

It is a **multi-site** solution. Production cut over with three applications (OxyChem, Calcium Chloride, Proveedor); **Benefits** and **Enrollment** were added in production admin afterwards. Everything else in the old ~24-site estate became a redirector host rule rather than a site definition.

## Known Quirks & Debt

- **Editor URL is `/ui/cms`** — case-insensitive, trailing slash optional. Deep links carry a fragment, e.g. `/ui/cms#context=epi.cms.contentdata:///13135`. **Not** `/Optimizely/CMS/`, `/EPiServer/CMS/`, or `/ui/` alone — those redirect to the site home, which reads exactly like a login failure and has cost debugging time more than once.
- **Custom departmental roles must arrive via the token `groups` claim.** Opti ID auto-maps only the built-in `CmsEditors` / `CmsAdmins`. Real edit rights live on `OxyComEditors`/`OxyComPublishers`, `OxyLinkEditors`/`OxyLinkPublishers` and `_HRSys`/`_Payroll`/`_News` variants. That is an Okta/Entra group-naming task, not a config edit. **Entra federation is not wired yet** — editors use Opti ID accounts directly.
- **A DB restore silently breaks two things.** Optimizely Graph goes stale (a copy/restore fires no index events, so deleted content lingers under old URLs — fix is a *Smooth Rebuild*, never "Reset to default"), and **redirector host rules are deleted outright** because nothing re-asserts them. Both have to be on the post-restore checklist.
- **EnvironmentSynchronizer is ON for Integration and Preproduction, OFF for Production.** It was removing hostnames editors added in prod admin on every restart. **Production bindings are now whatever prod CMS admin says** — edit them there, not in config.
- **Custom certificates do not auto-renew.** All four production hostnames are customer-supplied DigiCert certs fronted by Cloudflare. Renewal is a manual re-supply and upload.
- **Production deploys can cold-start-poison the content cache.** A warmup-time SQL timeout makes EPiServer log `Could not load data for property 'X'` and then cache that content *with the property empty* on one instance, with no visitor-facing error. Fix is to **republish** the affected content — restarting re-runs the same race.

## What production actually taught us

Worth reading before the next CMS 13 cutover, because none of it was visible on Integration:

- **Root-level content with no site definition still routes by URL segment on any host.** Deleting the orphaned Occidental *site definitions* left their *content trees* publicly servable at `www.oxychem.com/oxy/` and friends. Removing a site is not removing its content.
- **Project `IValidate<T>` validators silently stopped being registered at the cutover** and stayed dark for 25 days — see [[work/cms13/validator-registration-audit|Validator Registration Audit]].
- **Reverts need to reach the ticket.** A media-upload fix went in and straight back out across two PRs while its ticket stayed `Done`, so the board claimed a live defect was fixed. Caught in the 2026-10-23 board review.
- **The module spacing system only ever sets `margin-top`,** so every block depends on the *next* block for separation and the last block on a page gets none. This has now been fixed one module at a time (C1, C20) rather than systemically.
- **Custom CMS admin reports did not survive the upgrade** — Distributor Export and the Accessibility Report both needed the CMS 13 shell layout, their own post routes and route-casing fixes.

## Related Wiki Pages

- [[work/clients/oxychem/cms13-uat|CMS 13 UAT Plan]] — the pre-cutover acceptance pass (**historical**; the epic it describes was closed as superseded)
- [[work/cms13/upgrade-test-plan|Integration Test Plan]] — the generic plan the UAT page instantiates
- [[work/cms13/post-upgrade-gotchas|Post-Upgrade Gotchas]] — mostly sourced from this project
- [[work/cms13/validator-registration-audit|Validator Registration Audit]] — every `IValidate<T>` on this site went dark at the 2026-09-18 cutover and stayed dark for 25 days
- [[work/cms13/applications-model|Applications Model]] — `tblApplication` / `tblApplicationHost`, and why EnvironmentSynchronizer is not a no-op on CMS 13
- [[work/cms13/deploying-to-dxp|Deploying to DXP]] · [[work/cms13/graph-sdk|Graph SDK]] · [[work/cms13/dam-integration|DAM Integration]] · [[work/cms13/optimizely-opal|Optimizely Opal]]
- [[work/cms13/opti-id-admin-center|Opti ID & Admin Center]]
