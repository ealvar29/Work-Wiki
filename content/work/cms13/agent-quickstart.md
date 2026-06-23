---
title: "CMS 13 Upgrade — AI Agent Quickstart"
tags:
  - optimizely
  - cms
  - upgrade
  - agent
  - quickstart
---

> **This page is written for AI agents.** If you are starting a CMS 12 → CMS 13 upgrade engagement, read this first before touching any code. It will save you hours.

---

## Mission Brief

You are upgrading an Optimizely CMS 12 site to CMS 13. The platform changes are significant:

- **.NET 6 → .NET 10** (target framework change in `.csproj`)
- **EPiServer.Find removed entirely** — no CMS 13 version exists. Replacement is the Optimizely Graph SDK, which **does** have a CMS 13 build — but under **renamed packages**: `Optimizely.Graph.Cms` + `Optimizely.Graph.Cms.Query` (the old `Optimizely.ContentGraph.Cms` is CMS 12 only). See G10.
- **EPiServer.Forms — CMS 13 build shipped** (6.0.0). Earlier guidance to exclude all Forms files is **obsolete**; install `EPiServer.Forms` 6.0.0 and call `services.AddForms()`. *(Verified live on OxyChem, June 2026.)*
- **Editor URL changed**: `/episerver/cms/` → `/Optimizely/CMS/` (hard 404, no redirect)
- **Several EPiServer APIs removed** — not deprecated, removed. Compile errors are your roadmap.

The upgrade has three distinct phases: get it to compile → get it to boot → post-compile cleanup. Do not mix phases.

---

## Read These Files First (Before Writing Any Code)

In the client codebase, read these files immediately to understand scope:

1. **`.csproj`** — inventory all EPiServer/Optimizely packages and all `<Compile Remove>` entries. This tells you what's already excluded and what packages need updating.
2. **`Startup.cs`** — understand the service registrations, middleware pipeline, endpoint mapping order, and whether `AddCmsCloudPlatformSupport` is dev-gated.
3. **`appsettings.json` + `appsettings.Development.json`** — note connection strings, blob storage config, and environment flags.
4. **`Properties/launchSettings.json`** — note the correct launch profile name and ports. `dotnet run --launch-profile http` often doesn't exist and silently skips `appsettings.Development.json`.
5. **Any base controller classes** — if `IContextModeResolver` is injected in a base class, fixing its namespace here fixes 100+ cascade errors elsewhere. Find it first.

---

## Upgrade Phases

### Phase 1 — Clean Compile (do nothing else until this is done)

**In this order — sequence matters:**

1. Change `<TargetFramework>net6.0</TargetFramework>` → `net10.0`
2. Bump all `EPiServer.Cms.*` and `EPiServer.CloudPlatform.*` packages to `13.x`
3. Remove `EPiServer.Find` and `EPiServer.ImageLibrary.ImageSharp` from `.csproj` (ImageSharp is bundled in CMS 13). Bump `EPiServer.Forms` to **6.0.0** — do **not** remove it; it has a CMS 13 build.
4. Add the renamed Graph packages `Optimizely.Graph.Cms` 13.0.2 + `Optimizely.Graph.Cms.Query` 13.0.2 to replace Find (NOT the CMS-12-only `Optimizely.ContentGraph.Cms` — see G10)
5. Fix `IContextModeResolver` namespace **first** — it cascades: `EPiServer.Web.Routing` → `EPiServer.Web`
6. Exclude all Find-dependent files with `<Compile Remove>` in `.csproj` (Forms files stay — Forms compiles on CMS 13)
7. Fix remaining API breaking changes (see Critical Gotchas below)
8. Run `dotnet build` — target: **0 errors**

**Useful build command:**
```powershell
dotnet build --no-incremental 2>&1 | Select-String "error"
```

### Phase 2 — Clean Boot

10. Verify `MapContent()` comes **before** `MapRazorPages()` in `UseEndpoints` (CMS-51344 — silent content creation failure if wrong)
11. Exclude Geta packages from EPiServer's assembly scanner (they crash startup — see Gotcha #4)
12. Make all cookie `SecurePolicy` settings dev-aware (antiforgery, session, app cookie, XSRF)
13. Fix `IBlockingFirstRequestInitializer` registration for any first-request initializers
14. Verify frontend build output reaches `wwwroot/` (often needs an MSBuild copy target)
15. Create `App_Data/blobs/` directory if it doesn't exist (local FileBlob provider needs it)
16. Run with `ASPNETCORE_ENVIRONMENT=Development` — verify home page 200, login at `/util/login`, editor at `/Optimizely/CMS/`

### Phase 3 — Post-Compile (separate PRs)

17. Wire up Graph search now (the CMS 13 SDK has shipped): register `AddContentGraph()` + `AddGraphContentClient()`, implement `ContentGraphSearchService` behind `ISearchService`, then run the "Content Graph Full Re-index" job per environment
18. Upgrade AutoMapper if on 13.x — has a known CVE (GHSA-rvv3-g6hj-g44x); bump to 16.x (16.x also removes the single-arg `MapperConfiguration` ctor — use `AddAutoMapper()`)
19. Re-enable Forms files and call `services.AddForms()` — `EPiServer.Forms` 6.0.0 is CMS 13-ready
20. Re-enable `Advanced.CMS.AdvancedReviews` (2.0.0 ships for CMS 13) and any other vendor packages as CMS 13 versions are released
21. Auth / Opti ID / SAML2 migration — **separate engagement, handle last**

---

## Critical Gotchas (Ordered by When They Bite You)

### G1 — `IContextModeResolver` namespace causes 100+ cascade errors *(hits in Phase 1)*

**Symptom:** Hundreds of errors after package upgrade, all pointing to derived controller classes.  
**Cause:** `IContextModeResolver` moved from `EPiServer.Web.Routing` → `EPiServer.Web` in CMS 13. If it's in a base class or shared layout, every derived class and every Razor view that inherits the layout gets a cascade error.  
**Fix:** Global find-replace `using EPiServer.Web.Routing` → `using EPiServer.Web` in files that import it for `IContextModeResolver`. **Fix this before anything else.**

---

### G2 — `EPiServer.Find` string extensions spread beyond search files *(hits in Phase 1)*

**Symptom:** `CS1061` errors on `.IsNullOrEmpty()`, `.IsNull()`, `.IsNotNullOrEmpty()` across models, controllers, views — not just search classes.  
**Cause:** `EPiServer.Find.Helpers.Text` extension methods were used casually across the codebase.  
**Fix:** Replace with `string.IsNullOrEmpty(x)`, `x == null`, `!string.IsNullOrEmpty(x)`. Grep the entire codebase — expect 18+ files.

---

### G3 — `EPiServer.ServiceLocation` exports more than `ServiceLocator` *(hits in Phase 1)*

**Symptom:** After bulk-removing `using EPiServer.ServiceLocation;`, new errors appear: `ServiceConfigurationAttribute`, `Injected<>`, `IConfigurableModule`, `ServiceConfigurationContext` not found.  
**Cause:** That namespace also exports those types — all still valid in CMS 13.  
**Fix:** Before removing the using from any file, grep for ALL of: `ServiceConfigurationAttribute|ServiceInstanceScope|Injected<|IConfigurableModule|ServiceConfigurationContext`. Keep the using in any file that uses them.

---

### G4 — `IServiceProvider.GetInstance<T>()` extension removed *(hits in Phase 1)*

**Symptom:** `CS1061: 'IServiceProvider' does not contain a definition for 'GetInstance'` — typically in `IInitializableModule.Initialize(InitializationEngine context)` bodies.  
**Cause:** EPiServer's `GetInstance<T>()` extension on `IServiceProvider` is gone in CMS 13.  
**Fix:** `using Microsoft.Extensions.DependencyInjection;` + `context.Locate.Advanced.GetRequiredService<T>()`.  
**Note:** `ServiceLocator.Current.GetInstance<T>()` (the static) is a *different* method that still works.

---

### G5 — `SiteDefinition.Current` replacement is `ISiteDefinitionResolver`, not `IApplicationResolver` *(hits in Phase 1)*

**Symptom:** After replacing `SiteDefinition.Current`, compiler or runtime still fails.  
**Cause:** Some docs/upgrade guides reference `IApplicationResolver.GetByContextAsync()` — this type does not exist in CMS 13.0.2.  
**Fix:**
```csharp
// Inject both:
private readonly IHttpContextAccessor _httpContextAccessor;
private readonly ISiteDefinitionResolver _siteDefinitionResolver;

// Use:
var host = _httpContextAccessor.HttpContext?.Request.Host.Host;
var site = _siteDefinitionResolver.GetByHostname(host, fallbackToWildcard: true, out _);
```

---

### G6 — Geta/third-party packages crash startup before any page loads *(hits in Phase 2)*

**Symptom:** App starts, then immediately throws `CustomAttributeFormatException` from `EPiServer.Framework.TypeScanner`. No pages load.  
**Cause:** `ScheduledPlugIn.SortIndex` was removed in CMS 13. Packages compiled against CMS 12 that use `[ScheduledPlugIn(SortIndex=...)]` crash the assembly scanner.  
**Affected packages (as of CMS 13.0.2):** `Geta.NotFoundHandler.Optimizely`, `Geta.Optimizely.ContentTypeIcons`.  
**Fix:**
```csharp
private void ExcludeAssemblyFromEpiServerScan(string assemblyName)
{
    var scannerType = Type.GetType("EPiServer.Framework.TypeScanner.Internal.AssemblyScanner, EPiServer.Framework");
    if (scannerType == null) return;
    var field = scannerType.GetField("_excludedAssemblies", BindingFlags.Static | BindingFlags.NonPublic);
    var list = field?.GetValue(null) as IList<string>;
    list?.Add(assemblyName);
}
// In ConfigureServices():
ExcludeAssemblyFromEpiServerScan("Geta.NotFoundHandler.Optimizely");
ExcludeAssemblyFromEpiServerScan("Geta.Optimizely.ContentTypeIcons");
```
**Follow-on:** excluding the assembly is *not enough* if the old package already wrote scheduled jobs to the DB — the Admin → Scheduled Jobs page then throws `CustomAttributeFormatException: 'SortIndex'` from `ScheduledJobsController`. Add an `IInitializableModule` that deletes the orphaned jobs (filter `ScheduledJob.AssemblyName`, use `repo.Delete(job.ID)`). Full code in [[post-upgrade-gotchas|Post-Upgrade Gotchas]].

---

### G7 — `MapContent()` ordering causes silent content creation failure *(hits in Phase 2)*

**Symptom:** App boots, editor loads, but editors can't create pages ("Unable to create page."). Image deletion silently fails. No obvious runtime error in browser.  
**Cause:** `MapRazorPages()` before `MapContent()` intercepts CMS routes. Official bug CMS-51344.  
**Fix:** `MapContent()` must be first in the `UseEndpoints` block.

---

### G8 — AutoMapper `NullReferenceException` on image-heavy pages *(hits in Phase 2)*

**Symptom:** Home page and content pages with image blocks throw `AutoMapperMappingException → NullReferenceException`. Pages without images load fine.  
**Cause:** `PageTypeName` is `null` for system content types (SysRoot, SysRecycleBin, ContentRoot) in CMS 13. Type converters that call `.EndsWith("HomePage")` on `PageTypeName` without a null guard throw.  
**Fix:** Add `x.PageTypeName != null` guard in any LINQ chain that filters `GetAncestors()` by `PageTypeName`.

---

### G9 — All cookie `SecurePolicy = Always` blocks local HTTP login *(hits in Phase 2)*

**Symptom:** `InvalidOperationException: antiforgery system has configuration AntiforgeryOptions.Cookie.SecurePolicy = Always, but the current request is not an SSL request` on `/util/login` and the home page.  
**Cause:** CMS 12 Startup templates set `Always` on antiforgery, session, app cookie, and XSRF cookies. Correct for prod; breaks HTTP local dev.  
**Fix:** Make all four policies dev-aware using `IWebHostEnvironment.IsDevelopment()`.

---

### G10 — Use the RENAMED Graph packages + two DI registrations *(hits in Phase 1/3)*

**Symptom (wrong package):** Adding `Optimizely.ContentGraph.Cms` causes `InvalidOperationException` at startup from the EPiServer assembly scanner hitting `ISynchronizedObjectInstanceCache` (removed in CMS 13).  
**Cause:** `Optimizely.ContentGraph.Cms` is the **CMS 12** package; 4.4.0 transitively pulls `EPiServer.ContentDeliveryApi.Core 3.12.5`.  
**Fix:** Use the CMS 13 packages, which were renamed: `Optimizely.Graph.Cms` 13.0.2 **+** `Optimizely.Graph.Cms.Query` 13.0.2.

**Symptom (second registration missing):** search requests 500 with `Unable to resolve service for type 'Optimizely.Graph.Cms.Query.IGraphContentClient'`.  
**Cause:** `AddContentGraph()` only wires indexing/sync. The query client is registered separately.  
**Fix:** call **both**, noting the surprising namespace on the second:
```csharp
services.AddContentGraph();        // indexing/sync
services.AddGraphContentClient();  // IGraphContentClient — namespace Optimizely.Cms.DependencyInjection
```
Keep an `ISearchService` abstraction and back it with a real `ContentGraphSearchService`. Query via `GetAsContentAsync()` (not `GetAsync()`); the result is `IEnumerable<T>` (no `.Items`). Then run the **"Content Graph Full Re-index"** job per environment — the index starts empty. See [[graph-sdk|Graph SDK]].

---

## Vendor Status (updated June 2026 — verified against OxyChem CMS 13.0.2)

**Now CMS 13-ready — install, don't exclude:**

| Package / Feature | CMS 13 status | Wiring |
|---|---|---|
| `EPiServer.Forms` 6.0.0 | ✅ Shipped | `services.AddForms()` — re-enable all Forms files |
| Optimizely Graph (real search) | ✅ Shipped (renamed) | `Optimizely.Graph.Cms` + `Optimizely.Graph.Cms.Query` 13.0.2; `AddContentGraph()` + `AddGraphContentClient()` — see G10 |
| `Advanced.CMS.AdvancedReviews` 2.0.0 | ✅ Shipped | `services.AddAdvancedReviews()` |

**Still blocked — no CMS 13-compatible release:**

| Package / Feature | Status | Re-enable trigger |
|---|---|---|
| `Geta.Optimizely.Sitemaps` | 3.2.1 references removed `ISynchronizedObjectInstanceCache` | When Geta ships CMS 13 version |
| `Geta.Optimizely.ContentTypeIcons` | 3.1.0 — package can stay referenced for the icon *attributes* on models, but `AddContentTypeIcons()` service reg fails (uses removed `EPiServer.Cms.Shell` extension) and the assembly must be scan-excluded | When Geta ships CMS 13 version |
| `Addon.Episerver.EnvironmentSynchronizer` | 1.3.x uses `[ScheduledPlugIn(SortIndex=)]` removed in CMS 13 | When vendor ships a true CMS 13 build |
| Auth / SAML2 / Opti ID | Separate engagement | After DXP provisioning |

---

## Key API Changes at a Glance

| CMS 12 | CMS 13 | Notes |
|---|---|---|
| `EPiServer.Web.Routing.IContextModeResolver` | `EPiServer.Web.IContextModeResolver` | Fix first — cascades |
| `SiteDefinition.Current` | `ISiteDefinitionResolver.GetByHostname()` | `IApplicationResolver` doesn't exist |
| `context.Locate.Advanced.GetInstance<T>()` | `context.Locate.Advanced.GetRequiredService<T>()` | Add `using Microsoft.Extensions.DependencyInjection` |
| `ServiceLocator.Current.GetInstance<T>()` | Still works | Static method, not affected |
| `IFirstRequestInitializer` (enumerable) | `IBlockingFirstRequestInitializer` | Different interface for enumerable registration |
| `ISynchronizedObjectInstanceCache` | `IMemoryCache` | Navigation caching replacement |
| `PageData.Ancestors()` | `_contentLoader.GetAncestors(page.ContentLink)` | Was an EPiServer.Find extension |
| `ContentArea.FilteredItems` | `ContentArea.Items` | Deprecated → use Items |
| `ContentReference.GetContent()` | `_contentLoader.Get<T>(contentReference)` | Extension removed |
| `/episerver/cms/` | `/Optimizely/CMS/` | Hard 404, no redirect |
| `IServiceLocator` interface | Constructor DI / `ServiceLocator.Current` static | Interface removed; static wrapper survives |

---

## Verification Checklist

Before calling Phase 1 done:
- [ ] `dotnet build --no-incremental` → 0 errors
- [ ] No `<Compile Remove>` entries except vendor-blocked files (annotated with a comment explaining why)

Before calling Phase 2 done:
- [ ] Home page returns 200
- [ ] `/util/login` works, login succeeds
- [ ] `/Optimizely/CMS/` loads the editor (not 404)
- [ ] Create a test page in the editor — no "Unable to create page" error
- [ ] Upload an image in the editor — no errors
- [ ] `App_Data/blobs/` directory exists (local dev only)
- [ ] No `CustomAttributeFormatException` in logs at startup
- [ ] No `DirectoryNotFoundException` in logs

---

## Related Pages

- [[breaking-changes|Breaking Changes in CMS 13]] — full API catalog
- [[post-upgrade-gotchas|Post-Upgrade Gotchas]] — detailed write-ups for each gotcha above
- [[upgrade-checklist|Upgrade Checklist]] — line-by-line task tracking
- [[search-to-graph|Search & Navigation → Graph Migration]] — Find replacement path
- [[graph-sdk|Optimizely Graph SDK]] — SDK setup and compatibility status
