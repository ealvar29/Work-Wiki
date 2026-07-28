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
**Hosting:** Optimizely DXP (Azure)
**Engagement:** CMS 12 → 13 upgrade of an existing codebase

> [!important] OxyChem and oxy.com are **separate engagements**
> They were split into independent projects — separate repos-of-record, separate DXP projects, separate roadmaps. That separation is what lets OxyChem move to CMS 13 while [[work/clients/oxy/index|oxy.com]] stays on CMS 12 for now. This is an **in-place upgrade of a live site**, not a new build, and findings from one project should not be read across to the other without checking.

OxyChem is Jaxon's **reference implementation** for CMS 12 → 13. Nearly every page under [[work/cms13/index|CMS 13]] was written from this upgrade, so when the wiki says "proven on OxyChem," this is the project it means.

## Tech Stack

| Layer | Was (CMS 12) | Now (CMS 13) |
|---|---|---|
| CMS | Optimizely CMS 12 | `EPiServer.Cms` / `EPiServer.CloudPlatform.Cms` **13.1.0** |
| Runtime | .NET 6 | **.NET 10** |
| Search | EPiServer.Find | `Optimizely.Graph.Cms` + `.Query` **13.1.0** — Find fully removed |
| Editor auth | Sustainsys SAML2 + `EPiServer.Cms.UI.AspNetIdentity` | `EPiServer.OptimizelyIdentity` **13.1.0** (Opti ID) |
| Forms | EPiServer.Forms 5.x | **6.0.0** |
| Content review | Advanced.CMS.AdvancedReviews | **2.0.0** |
| Sitemaps | Geta.Optimizely.Sitemaps 3.x | **4.0.0** |
| Content type icons | Geta.Optimizely.ContentTypeIcons 3.x | **4.1.0** |
| Env config | Addon.Episerver.EnvironmentSynchronizer 1.x | **2.0.1** |
| 404 / redirects | Geta.NotFoundHandler.Optimizely | **6.0.0** — see debt note below |
| DAM | — | `EPiServer.Cms.DamIntegration.UI` + `EPiServer.Cms.UI.ContentManager` **13.1.0** |
| AI | — | `Optimizely.Cms.OpalChat` **2.0.0** + `Optimizely.Cms.Opal.Tools` **13.1.0** |
| Mapping | AutoMapper 13.0.1 | **16.1.1** (CVE remediation) |

It is a **multi-site** solution — the Integration environment carries six site definitions (main, Calcium Chloride, OxyChem Japan, Documentation, Pages, OxyChem), so multi-site rows in any test pass are in scope, not optional.

## Status

The upgrade is **functionally complete and deployed to Integration**. Remaining work is verification, access provisioning, and a short list of known debt.

| Workstream | Status |
|---|---|
| Core upgrade (framework, packages, ~180 API breaks) | Complete |
| Find → Optimizely Graph | Complete — indexed and returning results |
| Add-ons re-enabled (Forms, AdvancedReviews, Sitemaps, ContentTypeIcons, EnvironmentSynchronizer) | Complete |
| DXP deploy pipeline + Integration environment | Complete |
| Opti ID editor auth | Login round-trip verified; **editor-role provisioning outstanding** |
| Embedded DAM | Working (unblocked once Opti ID login worked) |
| Opal AI | Packages wired; needs editor-session validation |
| **Client UAT** | **Not started** — see [[work/clients/oxychem/cms13-uat\|CMS 13 UAT Plan]] |

## Known Quirks & Debt

- **`CmsEditors` is read-only on this site.** In the content ACLs, `CmsAdmins` = full control but `CmsEditors` carries Read only. Real edit/publish rights live on custom departmental roles (`OxyComEditors`/`OxyComPublishers`, `OxyLinkEditors`/`OxyLinkPublishers`, and `_HRSys`/`_Payroll`/`_News` variants). Opti ID auto-maps only the built-in `CmsEditors`/`CmsAdmins`, so **custom role names must arrive via the token `groups` claim** — an Okta/Entra group-naming task, not a config edit. Anyone given a plain Opti ID account will be read-only and unable to complete an editorial test.
- **Editor URL is `/ui/CMS/`** — trailing slash required. Not `/optimizely/cms/`, not `/EPiServer/CMS/`; those fall through to the public content pipeline and return a bare 404 that looks exactly like a login failure.
- **`Geta.NotFoundHandler.Optimizely` is still the CMS 12 build (6.0.0).** It boots fine but throws `MissingMethodException` on the publish path, so `AutomaticRedirectsEnabled` is set to `false` as a stopgap — auto-301-on-URL-change is currently lost. 7.0.0 is the CMS 13 build and is the proper fix.
- **`UserInstaller.cs` is dead code with a hardcoded admin password.** Unregistered since the Opti ID migration; should be deleted outright. There is no break-glass admin login under Opti ID — `/util/login` renders but authenticates against nothing.
- **Integration runs a restored production database.** Content matches prod as of the bacpac date, which is what makes it viable for parity testing — but anything published to prod afterwards does not exist there.

## Related Wiki Pages

- [[work/clients/oxychem/cms13-uat|CMS 13 UAT Plan]] — the client-facing acceptance pass for this engagement
- [[work/cms13/upgrade-test-plan|Integration Test Plan]] — the generic plan the UAT page instantiates
- [[work/cms13/post-upgrade-gotchas|Post-Upgrade Gotchas]] — mostly sourced from this project
- [[work/cms13/deploying-to-dxp|Deploying to DXP]] · [[work/cms13/graph-sdk|Graph SDK]] · [[work/cms13/dam-integration|DAM Integration]] · [[work/cms13/optimizely-opal|Optimizely Opal]]
- [[work/cms13/opti-id-admin-center|Opti ID & Admin Center]]
