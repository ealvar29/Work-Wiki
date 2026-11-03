---
title: "Oxy (Occidental Petroleum)"
tags:
  - clients
  - oxy
  - optimizely
  - cms
---

**Site:** oxy.com
**Industry:** Oil & gas
**Hosting:** Optimizely DXP (Azure), fronted by Cloudflare
**Repo of record:** `dev.azure.com/oxycorp/oog-dwp-dwo-episerver/_git/Episerver` (single project `Oxy.Com.Web`)

> Last reviewed **2026-11-03** against `master` @ `02183613` and `Oxy.Com.Web.csproj`. Everything in the stack table below was read out of the csproj, not carried forward.

> [!important] OxyChem is a **separate engagement on a separate DXP instance**
> OxyChem and the Calcium Chloride family **moved off this instance** on 2026-09-23 (work item **142695**); `oxychem.oxy.com` is now a redirect in `Startup.cs` (**143016**). [[work/clients/oxychem/index|OxyChem]] is live on CMS 13 and is the source of most CMS 13 guidance on this wiki — but it is a **different codebase on a different instance**. Findings do not read across without checking. The auth section below is the worked example of why.

This instance hosts **7 CMS applications**: Occidental (www.oxy.com), Documentation, Events, Info, OCAP, OxyLink, Pages.

## Tech Stack

| Layer | Current | CMS 13 target |
|---|---|---|
| Runtime | 🟢 **.NET 10** (`net10.0`) since 2026-09-30 (**143137**); SDK `10.0.100`, `rollForward: latestFeature` | ✅ **already met** |
| CMS | `EPiServer.CMS` **12.34.8** (Core 12.24.3) | 13.x |
| Search | `EPiServer.Find` / `.CMS` **16.8.0** | `Optimizely.Graph.Cms` + `.Query` — Find does not exist in CMS 13 |
| Graph | `Optimizely.ContentGraph.Cms` **3.19.2** | ⚠️ **package rename, not a bump** — 3.x is the CMS 12 package and crashes the CMS 13 type scanner at boot |
| Auth | `Sustainsys.Saml2.AspNetCore2` **2.11.0** + `AddCmsAspNetIdentity<ApplicationUser>()` | **Open question — see Auth below** |
| Forms | `EPiServer.Forms.Core` **5.10.10**, `EPiServer.Forms.Samples` **4.2.7** | Forms **6.0.0**, Samples **5.0.0** (both shipped; Forms 6 proven on OxyChem) |
| Editor | `EPiServer.CMS.TinyMce` **5.0.4** | 13.x |
| Platform | `EPiServer.CloudPlatform.Cms` **1.7.4** | 13.x — version scheme realigns to the CMS line |
| 404 / redirects | `Geta.NotFoundHandler.Optimizely` **5.1.0** | Geta vs `Jaxon.Redirector.Cms13` — OxyChem dropped Geta entirely |
| Sitemaps | `Geta.Optimizely.Sitemaps` **3.1.1** | 4.0.0 |
| Content type icons | `Geta.Optimizely.ContentTypeIcons` **2.1.0** | 4.1.0 |
| Content review | `Advanced.CMS.AdvancedReviews` **1.4.4** | 2.0.0 |
| Env config | `Addon.Episerver.EnvironmentSynchronizer` **1.3.1** | 2.0.1 |
| Mapping | `AutoMapper` **13.0.1** | 16.1.1 on OxyChem (CVE remediation) |
| Images | `EPiServer.ImageLibrary.ImageSharp` **2.0.6** | bundled into `EPiServer.Cms` 13 at 13.0.2 |
| Image CDN | **Imgix removed** (**140569**, on prod 2026-10-29; sources + API key deleted) | n/a |

## Active Workstreams

| Feature | Status | Details |
|---|---|---|
| CMS 12 → 13 upgrade | **Assessment in progress** | ADO **146760** — CMS 13 upgrade assessment (spike, 2-day timebox), `In Dev` |
| **143137 Phase 3** | **Next code work** | Find → Graph; obsolete-API + ASP0019 `Headers.Add`; AutoMapper; Forms.Samples; NotFoundHandler vs Redirector; remove `StartPageFallbackPageRouteHelper` |
| Spanish (es-CL) expansion | Planning | [[automated-translation\|Automated Translation Service]] — awaiting client sign-off |

## This is not a Cambro/VHB-shaped upgrade

The other two CMS 13 spikes — Cambro (`CAMI-791`) and VHB (`VHBK-499`) — are framed as **CMS 12 / .NET 6 → CMS 13 / .NET 10**. oxy.com is not in that position:

| | Runtime | CMS | Graph | Find→Graph |
|---|---|---|---|---|
| Cambro | .NET 6 | 12.31.2 | — | not started |
| VHB | .NET 6 | 12.32.4 | — | not started |
| **oxy.com** | 🟢 **.NET 10** | 12.34.8 | 3.19.2 (CMS 12 pkg) | **already ticketed as 143137 Phase 3** |
| OxyChem | .NET 10 | **13.x live** | Graph.Cms 13.x | complete |

CAMI-791's own headline was *"this is a Find→Graph project, not a .NET 10 project"* — it put **60/85/120h** on Find→Graph against **28/44/64h** for framework+packages. **On oxy.com the cheap half is already paid and the expensive half is already scheduled.** Estimating 146760 from the Cambro/VHB template would double-count both. The useful deliverable is the **delta**: what CMS 13 costs *given* .NET 10 is done and Find→Graph has its own ticket.

## Auth — the finding that must not be copied from OxyChem

OxyChem's CMS 13 csproj says *"the SAML2 SP (Sustainsys) is gone on CMS 13 — editor auth is Opti ID"*. **That does not transfer.**

On OxyChem, SAML served **editors only**, so Opti ID replaced it cleanly. On oxy.com, SAML2 is the application's **default authentication scheme**:

```csharp
services.AddCmsAspNetIdentity<ApplicationUser>();          // Startup.cs:382 — editor identity
services.AddAuthentication(Saml2Defaults.Scheme)           // Startup.cs:405 — DEFAULT scheme, whole app
    .AddSaml2(opt => { ... });                             //   LoginPath = /login/externalsignin
```

Protected **content** challenges through it — a 404 inside a login-gated area answers `302 → /login/externalsignin?ReturnUrl=/error/404` (`Startup.cs:1007`). Removing Sustainsys here would break visitor-facing access control, not just editor sign-in.

> [!warning] "Opti ID is mandatory on CMS 13" is **disputed**, and it is worth 32–92 hours
> Parts of this wiki state it as settled (see [[work/cms13/cms13-demo-guide|Demo Runbook]]). **CAMI-791 contradicts it with assembly-level evidence:** `EPiServer.Cms.UI.AspNetIdentity` **13.4.1** still ships `AddCmsAspNetIdentity`, `ApplicationUserManager`, `ApplicationRoleProvider` and `UIUserProvider` on `net10.0` — adding that one package reference dropped Cambro's CMS 13 error count from 87 to 71. OxyChem's csproj cites *"per Optimizely docs"*, which is a docs citation, not a compile failure. **Resolve this in 146760 before it lands in anyone's estimate.**

❌ **Corrected 2026-11-03:** this page previously claimed a rename `Sustainsys.Saml2.AspNetCore2` → `Sustainsys.Saml2.AspNetCore` was required. **No such package exists** — nuget.org returns 404, and `Sustainsys.Saml2.AspNetCore2` **2.11.0** is the current latest. oxy.com already runs it on `net10.0` in production, so the question is closed.

## .NET 10 traps already paid for here (143137)

oxy.com hit these on CMS 12; a CMS 13 project on .NET 10 will meet the same ones:

- **`IPageRouteHelper` returns `null` on non-content routes.** CMS 12.21 fell back to the start page; 12.24 does not. `StartPageFallbackPageRouteHelper` restores it for 11 callers — and Phase 3 removes it again.
- **`System.Linq.Async` must be 7.x on net10.** 6.x collides with the BCL's own `AsyncEnumerable`.
- **.NET 6 cookies fail MAC exactly once under .NET 10** — a one-time re-login for every signed-in user, not a bug.
- **A package whose newest minor is net8+ only restores cleanly and then fails at compile** on an older TFM (hit with `LigerShark.WebOptimizer.Core` 3.0.469+; now on 3.0.477).
- **A CMS package upgrade migrates the prod DB at slot warmup** (`UpdateDatabaseSchema = true`; Phase 1 moved schema 8023 → 8042). Until the swap, the **old** instances run on the **new** schema. Deploys are code-only (`includeDb:false`), so a DXP Reset does **not** undo it — the fallback is a pre-window bacpac or Optimizely PITR.

## Known Quirks

- **Two SAML2 providers** configured in `Startup.cs` (login + password change) — both need validating against CMS 13 whatever the Opti ID decision.
- Custom `ContactReasonActorsExecutingService` and `FormEventCompletionInitialization` are tightly coupled to EPiServer.Forms. ~~Cannot upgrade Forms until a CMS 13 version ships~~ — **resolved:** Forms **6.0.0** shipped and is in production on OxyChem; `Forms.Samples` **5.0.0** shipped 2026-10-20.
- `IFirstRequestInitializer` is used by several modules — confirm the interface survives in CMS 13.
- `Startup.cs` is monolithic: **all** DI and middleware, including the CSP assembly, the antiforgery handling and the Sentinel guard chain. That guard chain is this site's largest bespoke surface and the thing least covered by OxyChem's experience.
- **The CSP is content-managed** from the CMS `SettingsPage`, not from source (since **144440** it is the only source; `staticCSP` is gone, 5-minute cache).

## Related Wiki Pages

- [[work/clients/oxychem/index|OxyChem]] — the CMS 13 reference implementation, **different instance**
- [[work/cms13/search-to-graph|Search & Navigation → Graph Migration]] — the page that matters most here, because Phase 3 is next
- [[work/cms13/post-upgrade-gotchas|Post-Upgrade Gotchas]]
- [[work/cms13/breaking-changes|Breaking Changes]]
- [[work/cms13/forms-cms13|Optimizely Forms on CMS 13]]
- [[work/cms13/dotnet-compatibility|.NET Compatibility]]
- [[work/cms13/upgrade-checklist|Upgrade Checklist]]
- [[automated-translation|Automated Translation Service]]
