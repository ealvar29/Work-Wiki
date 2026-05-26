---
title: "CMS 13 Upgrade — AI Agent Quickstart"
tags:
  - optimizely
  - cms
  - upgrade
  - agent
  - quickstart
---

# CMS 13 Upgrade — AI Agent Quickstart

> **This page is written for AI agents.** If you are starting a CMS 12 → CMS 13 upgrade engagement, read this first before touching any code. It will save you hours.

---

## Mission Brief

You are upgrading an Optimizely CMS 12 site to CMS 13. The platform changes are significant:

- **.NET 6 → .NET 10** (target framework change in `.csproj`)
- **EPiServer.Find removed entirely** — no CMS 13 version exists. Replacement is Optimizely Content Graph SDK, which may also not be CMS 13-compatible yet (check version).
- **EPiServer.Forms — no CMS 13 release yet** as of May 2026. Exclude all Forms files from compilation.
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
3. Remove `EPiServer.Find`, `EPiServer.Forms`, `EPiServer.Forms.Core`, `EPiServer.Forms.Samples`, `EPiServer.ImageLibrary.ImageSharp` from `.csproj` (ImageSharp is bundled in CMS 13)
4. Add `Optimizely.ContentGraph.Cms` if replacing Find (check compatibility — see Vendor-Blocked section)
5. Fix `IContextModeResolver` namespace **first** — it cascades: `EPiServer.Web.Routing` → `EPiServer.Web`
6. Exclude all Find-dependent files with `<Compile Remove>` in `.csproj`
7. Exclude all Forms-dependent files with `<Compile Remove>` in `.csproj`
8. Fix remaining API breaking changes (see Critical Gotchas below)
9. Run `dotnet build` — target: **0 errors**

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

17. Wire up Content Graph SDK search when a CMS 13-compatible version ships
18. Upgrade AutoMapper if on 13.x — has a known CVE (GHSA-rvv3-g6hj-g44x); bump to 16.x
19. Re-enable Forms files when EPiServer.Forms ships for CMS 13
20. Re-enable Geta/vendor packages as CMS 13 versions are released
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

### G10 — `Optimizely.ContentGraph.Cms` 4.4.0 is NOT CMS 13 compatible *(may hit in Phase 1/3)*

**Symptom:** Adding the Graph SDK causes `InvalidOperationException` at startup from the EPiServer assembly scanner hitting `ISynchronizedObjectInstanceCache` (removed in CMS 13).  
**Cause:** ContentGraph 4.4.0 transitively pulls `EPiServer.ContentDeliveryApi.Core 3.12.5` — a CMS 12 package.  
**Interim strategy:** Create an `ISearchService` abstraction + `NullSearchService` stub. Wire all search controllers to the interface. Swap for a real `ContentGraphSearchService` when a CMS 13-compatible SDK ships.

---

## Vendor-Blocked — Do Not Attempt (as of May 2026)

These have no CMS 13-compatible release. Exclude them from compilation and note them for re-enablement:

| Package / Feature | Status | Re-enable trigger |
|---|---|---|
| `EPiServer.Forms` + all Forms files | No CMS 13 release | When Forms ships for CMS 13 |
| `Optimizely.ContentGraph.Cms` (real search) | 4.4.0 incompatible | When SDK ships CMS 13 build |
| `Geta.Optimizely.Sitemaps` | NU1608 warning | When Geta ships CMS 13 version |
| `Geta.Optimizely.ContentTypeIcons` | NU1608 warning | When Geta ships CMS 13 version |
| `Advanced.CMS.AdvancedReviews` | No CMS 13 release | When vendor ships |
| `Addon.Episerver.EnvironmentSynchronizer` | No CMS 13 release | When vendor ships |
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
