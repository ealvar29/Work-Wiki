---
title: "Post-Upgrade Gotchas in CMS 13"
tags:
  - optimizely
  - cms
  - upgrade
  - debugging
  - bugs
---

# Post-Upgrade Gotchas in CMS 13

Real issues encountered upgrading from CMS 12 to CMS 13 GA (released March 31, 2026). These are the errors that don't show up in the breaking changes docs — silent failures, misleading error messages, and things that only bite you when an editor tries to do actual work.

Organized by when they hit you. Fix Phase 1 items before touching Phase 2.

> **AI agents:** See [[agent-quickstart|CMS 13 Upgrade — AI Agent Quickstart]] for the full upgrade workflow, ordered task list, and verification checklist. This page is the detailed reference for individual gotchas.

---

## Phase 1 — Compile-Time

### One Wrong Namespace Causes 100+ Cascade Errors

**Symptom:** After bumping CMS packages, `dotnet build` produces 100+ errors spread across dozens of controller and view files. Every error points at a different file — it looks like the whole codebase is broken.

**Root cause:** `IContextModeResolver` moved namespaces in CMS 13:
- CMS 12: `EPiServer.Web.Routing`
- CMS 13: `EPiServer.Web`

If it's injected in a base controller class, every derived class and every Razor view that inherits the layout gets a cascade error. The compiler points downstream — not at the base class where the fix lives.

**Fix:** Find the base class or shared layout that imports `IContextModeResolver`. Fix it there first, then do a global find-and-replace:
```
Find:    using EPiServer.Web.Routing;
Replace: using EPiServer.Web;
```
Only in files where `IContextModeResolver` is the reason for that import — not everywhere blindly.

**Rule:** When errors are spread across dozens of files, look upstream. Fix base classes and shared layouts before derived classes.

---

### EPiServer.Find String Extensions Are Everywhere

**Symptom:** After removing EPiServer.Find, `CS1061` errors appear on `.IsNullOrEmpty()`, `.IsNull()`, `.IsNotNullOrEmpty()` — but not just in search files. They're in models, controllers, and views too.

**Root cause:** `EPiServer.Find.Helpers.Text` shipped extension methods on `string` that were used casually across codebases because they were convenient. They have nothing to do with search functionality.

**Fix:** Global replacements across all `.cs` and `.cshtml` files:

| Find | Replace |
|---|---|
| `.IsNullOrEmpty()` | `string.IsNullOrEmpty(value)` |
| `.IsNull()` | `value == null` |
| `.IsNotNullOrEmpty()` | `!string.IsNullOrEmpty(value)` |
| `.IsNullOrWhiteSpace()` | `string.IsNullOrWhiteSpace(value)` |

Grep the whole codebase first — expect them in 15–20+ files, well beyond anything search-related.

---

### Bulk-Removing `EPiServer.ServiceLocation` Using Breaks Other Types

**Symptom:** After bulk-removing `using EPiServer.ServiceLocation;` from files that no longer call `ServiceLocator.Current`, compilation fails with:
```
CS0246: The type or namespace name 'ServiceConfigurationAttribute' could not be found
CS0246: The type or namespace name 'Injected<>' could not be found
CS0246: The type or namespace name 'IConfigurableModule' could not be found
```

**Root cause:** `EPiServer.ServiceLocation` exports far more than just `ServiceLocator`. It also provides:
- `ServiceConfigurationAttribute` — for `[ServiceConfiguration(typeof(IFoo))]`
- `ServiceInstanceScope` — for `Lifecycle = ServiceInstanceScope.Singleton`
- `Injected<T>` — static property injection pattern
- `IConfigurableModule` and `ServiceConfigurationContext` — module configuration

All of these are valid and unchanged in CMS 13. Bulk-removing the using without checking breaks the files that use them.

**Fix:** Before removing `using EPiServer.ServiceLocation;` from any file, grep for ALL types the namespace exports:
```powershell
Select-String -Path "*.cs" -Pattern "ServiceConfigurationAttribute|ServiceInstanceScope|Injected<|IConfigurableModule|ServiceConfigurationContext" -Recurse
```
Keep the using in any file that hits.

---

### `GetInstance<T>()` Is Gone — But Only One Version of It

**Symptom:**
```
CS1061: 'IServiceProvider' does not contain a definition for 'GetInstance'
```
Usually appears in `IInitializableModule.Initialize(InitializationEngine context)` bodies.

**Root cause:** EPiServer provided a `GetInstance<T>()` extension method on `IServiceProvider` (accessible via `context.Locate.Advanced`). That extension is removed in CMS 13.

**Important distinction:** `ServiceLocator.Current.GetInstance<T>()` — the static pattern — is a completely separate method that still works fine. It's easy to read an error about `GetInstance` and assume the whole pattern is gone. It isn't.

**Fix:** Replace only the `IServiceProvider` extension calls:
```csharp
// CMS 12 — broken
var db = context.Locate.Advanced.GetInstance<IDatabaseExecutor>();

// CMS 13 — fixed
using Microsoft.Extensions.DependencyInjection;
var db = context.Locate.Advanced.GetRequiredService<IDatabaseExecutor>();
```
The static `ServiceLocator.Current.GetInstance<T>()` needs no change.

---

### `IApplicationResolver` — The Docs Reference a Type That Doesn't Exist

**Symptom:** You follow the official guidance for replacing `SiteDefinition.Current` and find references to `IApplicationResolver.GetByContextAsync()`. You add it and it doesn't compile.

**Root cause:** `IApplicationResolver` does not exist in CMS 13.0.x. Some upgrade documentation and blog posts reference it (possibly a planned API or a later version), but it is not present in the released build.

**Fix:** Inject `IHttpContextAccessor` and `ISiteDefinitionResolver`:
```csharp
var host = _httpContextAccessor.HttpContext?.Request.Host.Host;
var site = _siteDefinitionResolver.GetByHostname(host, fallbackToWildcard: true, out _);
```

Verify against your specific CMS 13 version before trusting any documentation that names `IApplicationResolver`.

---

## Phase 2 — Runtime / Boot

### Cookie `SecurePolicy = Always` Blocks Your Local Login

**Symptom:** Loading the app locally immediately throws:
```
InvalidOperationException: antiforgery system has the configuration value
AntiforgeryOptions.Cookie.SecurePolicy = Always, but the current request is not an SSL request
```
Appears on the home page and the login page before you can do anything.

**Root cause:** CMS 12 Startup templates set `SecurePolicy = Always` on antiforgery, session, application cookie, and XSRF cookies — correct for production, but completely breaks local development over HTTP.

**Fix:** Make all four policies dev-aware:
```csharp
services.AddAntiforgery(options => {
    options.Cookie.SecurePolicy = _env.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
});
```
Apply the same pattern to session, application cookie, and any custom XSRF cookies. Check your `Startup.cs` for all four.

---

### Third-Party Packages Can Crash Startup Before Any Page Loads

**Symptom:** The app starts, then immediately throws `CustomAttributeFormatException` from `EPiServer.Framework.TypeScanner`. No pages load. No stack trace pointing at your code.

**Root cause:** `ScheduledPlugIn.SortIndex` was removed from CMS 13. Any package compiled against CMS 12 that uses `[ScheduledPlugIn(SortIndex=...)]` will crash the EPiServer assembly scanner at startup — even if you never call anything from that package.

**Affected packages (confirmed at CMS 13.0.2):** `Geta.NotFoundHandler.Optimizely`, `Geta.Optimizely.ContentTypeIcons`.

**Fix:** Exclude those assemblies from the scanner in `ConfigureServices`:
```csharp
private void ExcludeAssemblyFromEpiServerScan(string assemblyName)
{
    var scannerType = Type.GetType(
        "EPiServer.Framework.TypeScanner.Internal.AssemblyScanner, EPiServer.Framework");
    if (scannerType == null) return;
    var field = scannerType.GetField("_excludedAssemblies",
        BindingFlags.Static | BindingFlags.NonPublic);
    var list = field?.GetValue(null) as IList<string>;
    list?.Add(assemblyName);
}

// In ConfigureServices():
ExcludeAssemblyFromEpiServerScan("Geta.NotFoundHandler.Optimizely");
ExcludeAssemblyFromEpiServerScan("Geta.Optimizely.ContentTypeIcons");
```

Remove each exclusion when the vendor ships a CMS 13-compatible package.

---

### Excluding the Assembly Isn't Enough — Stale Jobs in the DB Still Crash the Admin UI

**Symptom:** Startup is now clean (you excluded the offending assembly above), but opening **Admin → Scheduled Jobs** throws:
```
CustomAttributeFormatException: 'SortIndex' property specified was not found
```
The error comes from `ScheduledJobsController.CreateViewModelAsync`, not from boot.

**Root cause:** `ExcludeAssemblyFromEpiServerScan` stops *new* registrations, but scheduled jobs from the old package are **already persisted in the database**. `IScheduledJobRepository.List()` still returns them, and the admin controller calls `GetCustomAttribute<ScheduledPlugInAttribute>()` on those now-incompatible types — which trips the same `SortIndex` removal that crashed the scanner.

**Fix:** an `IInitializableModule` that deletes the orphaned job rows at startup:

```csharp
[InitializableModule]
public class LegacyScheduledJobCleanupModule : IInitializableModule
{
    public void Initialize(InitializationEngine context)
    {
        var repo = context.Locate.Advanced.GetRequiredService<IScheduledJobRepository>();
        foreach (var job in repo.List()
                     .Where(j => j.AssemblyName != null &&
                                 j.AssemblyName.Contains("Geta.NotFoundHandler.Optimizely")))
        {
            repo.Delete(job.ID);   // Delete(Guid) is the correct overload
        }
    }
    public void Uninitialize(InitializationEngine context) { }
}
```

**Two details that bite:** filter on `ScheduledJob.AssemblyName` (not `TypeName`), and use the `Delete(Guid)` overload (`job.ID`). Remove this module once the vendor package is CMS 13-native.

---

### Local Dev: Create `App_Data/blobs/` Before First Run

**Symptom:** Shortly after login, every page request throws:
```
System.IO.DirectoryNotFoundException: Could not find a part of the path '...\App_Data\blobs\...'
```

**Root cause:** In development mode, `Startup.cs` typically calls only `services.AddCms()` — `AddCmsCloudPlatformSupport` is gated behind a non-dev check, so Azure Blob Storage isn't configured. CMS 13 falls back to the local `FileBlob` provider, which writes to `App_Data/blobs/`. That directory doesn't exist on a fresh clone.

**Fix:** Create the directory before running:
```powershell
New-Item -ItemType Directory -Force "App_Data\blobs"
```

Media files still won't show until you copy blob content from another environment or re-upload through the editor.

---

### `MapContent()` Order Is Silent — And Breaks Content Creation

**Symptom:** The app boots, the editor loads, but editors see "Unable to create page." when trying to create content. Image deletion also fails silently. No obvious error in the browser or logs.

**Root cause:** If `MapRazorPages()` appears before `MapContent()` in your `UseEndpoints` block, Razor Pages intercepts routes that belong to the CMS. This is officially accepted bug **CMS-51344**.

**Fix:** Reorder so `MapContent()` is first:
```csharp
app.UseEndpoints(endpoints =>
{
    endpoints.MapContent();       // ← must be first
    endpoints.MapRazorPages();
    endpoints.MapControllers();
});
```

This one is particularly insidious because both compile and boot succeed — you only find it when an editor actually tries to do work.

---

### AutoMapper Throws on Image Pages — Fine on Everything Else

**Symptom:** Home page and any content-heavy pages throw `AutoMapperMappingException → NullReferenceException`. Plain text pages load fine. Looks like a rendering or partial view issue.

**Root cause:** CMS 13 has system content types (SysRoot, SysRecycleBin, ContentRoot) where `PageTypeName` is `null`. If you have an AutoMapper type converter that calls `GetAncestors()` and then filters by `PageTypeName` — common in image mapping converters that try to find the site root — it throws on those null values.

**Fix:** Add a null guard before any string operation on `PageTypeName`:
```csharp
var ancestor = loader.GetAncestors(page.ContentLink)
    .OfType<PageData>()
    .SkipWhile(x => x.PageTypeName == null        // ← add this
                 || !x.PageTypeName.EndsWith("HomePage"))
    .FirstOrDefault();
```

This won't appear until a page with image blocks is actually rendered — a clean build and working home page won't surface it.

---

### The Content Graph SDK — Right Package Name + Two DI Registrations

> **Updated June 2026 (OxyChem CMS 13.0.2).** Earlier advice here was "don't add the package, ship a `NullSearchService` stub and wait for a CMS 13 build." That build now exists — under a **different package name**. The abstraction is still good architecture; the difference is you now swap in the *real* implementation instead of waiting.

**The trap:** adding `Optimizely.ContentGraph.Cms` (the CMS 12 package) throws `InvalidOperationException` at startup from the EPiServer assembly scanner before any pages load — its 4.4.0 build transitively pulls `EPiServer.ContentDeliveryApi.Core 3.12.5`, a CMS 12 package referencing the removed `ISynchronizedObjectInstanceCache`.

**Fix:** Use the **renamed** CMS 13 packages, not the old one:

```xml
<!-- NOT Optimizely.ContentGraph.Cms (CMS 12 only) -->
<PackageReference Include="Optimizely.Graph.Cms" Version="13.0.2" />
<PackageReference Include="Optimizely.Graph.Cms.Query" Version="13.0.2" />
```

Then register **both** sides of Graph — this is its own gotcha:

```csharp
services.AddContentGraph();        // indexing/sync side
services.AddGraphContentClient();  // query client — namespace Optimizely.Cms.DependencyInjection (!)
```

`AddGraphContentClient()` is in the unexpected `Optimizely.Cms.DependencyInjection` namespace. Without it, search 500s: `Unable to resolve service for type 'Optimizely.Graph.Cms.Query.IGraphContentClient'`.

Keep the `ISearchService` abstraction — wire all search controllers to it and back it with a real `ContentGraphSearchService`:

```csharp
services.AddScoped<ISearchService, ContentGraphSearchService>();
```

**Then re-index:** the index is empty until you run the **"Content Graph Full Re-index"** scheduled job against that environment's DB. Index keys are per-environment, so each env must be re-indexed independently. See [[graph-sdk|Optimizely Graph SDK]] for the query API (`GetAsContentAsync`, not `GetAsync`).

---

## Tooling

### Visual Studio 2022 Requires Version 17.13+ for .NET 10

**Symptom:** After installing the standalone .NET 10 SDK, Visual Studio still shows "The SDK 'Microsoft.NET.Sdk.Web' specified could not be found" and the project appears unloaded.

**Root cause:** Visual Studio ships its own embedded .NET SDK toolchain at `C:\Program Files\Microsoft Visual Studio\2022\Community\dotnet\sdk\` — it does NOT automatically use the system-wide dotnet install. Even if `dotnet --version` reports 10.0.x in a terminal, VS will use its own SDK.

**Fix:**
1. Open **Visual Studio Installer**
2. Click **Modify** on your VS 2022 installation
3. Go to **Individual Components**, search for **.NET 10.0 SDK**
4. If .NET 10 doesn't appear: your VS channel is too old — switch to the **"Current" channel** in VS Installer first, update to 17.13+, then install the workload

The CLI (`dotnet build`) works fine with the system SDK; only VS-hosted builds are affected.

---

### `global.json` SDK Pin Causes VS Project Load Failure

**Symptom:** `dotnet build` succeeds at the terminal, but opening the same solution in Visual Studio shows "One or more projects did not load correctly."

**Root cause:** A `global.json` file that pins `"version": "10.0.x"` forces VS to look for exactly that SDK version in its own embedded toolchain. If the .NET 10 workload isn't installed in VS Installer, VS silently fails to load any project in the solution.

**Fix:** Install the .NET 10 SDK workload via VS Installer (see gotcha above). The `global.json` pin itself is correct and should stay — it keeps the CLI and CI on a consistent version.

---

### Webpack 4 + Node 22 Is Compatible — Check Your Output Path

**Concern:** Many Webpack 4 projects specify `node: "~15.x"` in `engines`. Running `npm run build` under Node 22 with Webpack 4.41 might seem risky.

**Reality:** Webpack 4.41.x builds cleanly under Node 22 if `node_modules` are already installed. The engine warning is cosmetic. The most common issue is not a Webpack/Node incompatibility — it's a misconfigured `output.path` in `webpack.config.js` that causes build output to land in the wrong directory (e.g., `Frontend/dist/`) instead of `wwwroot/`.

**Fix:** Verify `output.path` resolves to `wwwroot/` or wire up an MSBuild `AfterTargets="Build"` copy target. No Webpack upgrade required.

---

## Related

- [[agent-quickstart|CMS 13 Upgrade — AI Agent Quickstart]] — full upgrade workflow for AI agents; all gotchas above plus phases, vendor-blocked items, and verification checklist
- [[breaking-changes|Breaking Changes in CMS 13]] — full API removal catalog
- [[search-to-graph|Search & Navigation → Graph Migration]] — Find replacement path (see ContentGraph SDK gotcha above)
- [[upgrade-checklist|Upgrade Checklist]] — step-by-step task tracking

## Sources

- [Optimizely CMS 13 and errors when creating pages after upgrade — Tomas Hensrud Gulla (OMVP), gulla.net, 2026](https://www.gulla.net/en/blog/optimizely-cms-13-and-errors-when-creating-pages-after-upgrade)
- Internal upgrade field notes — Jaxon Digital, May 2026
