# 10 CMS 13 Upgrade Gotchas That Will Bite You (And How to Fix Them)

*By Eduardo Alvarez, Jaxon Digital*

---

This is the post I wanted to find when I was in the middle of the upgrade.

The official breaking changes docs are thorough. What they don't tell you is which errors are symptoms of something upstream, which ones look like one problem and turn out to be another, and which ones only appear after the build is clean and you're trying to boot the app for the first time.

These are the ten things that will slow you down — and the exact fix for each one.

---

## 1. One Wrong Namespace Causes 100+ Errors

**What it looks like:** After bumping the CMS packages, you run `dotnet build` and get 100+ errors spread across dozens of controller files. Every error points to a different file. It looks like the whole codebase is broken.

**What it actually is:** `IContextModeResolver` moved namespaces. In CMS 12 it's in `EPiServer.Web.Routing`. In CMS 13 it's in `EPiServer.Web`. If it's injected in a base controller class, every class that inherits from it and every Razor view that uses the layout gets a cascade error.

**Fix:** Find which base class or shared file imports `using EPiServer.Web.Routing` for `IContextModeResolver`. Fix it there first. Then run a global find-and-replace:

```
Find:    using EPiServer.Web.Routing;
Replace: using EPiServer.Web;
```

Only in files where `IContextModeResolver` is the reason for that import — not everywhere blindly.

**The lesson:** When errors are spread across dozens of files, look upstream. Fix base classes and shared layouts before derived classes.

---

## 2. EPiServer.Find's String Extensions Are Everywhere

**What it looks like:** After removing EPiServer.Find, you get CS1061 errors on `.IsNullOrEmpty()`, `.IsNull()`, `.IsNotNullOrEmpty()` — but not just in search-related files. They're in models, controllers, and views too.

**What it actually is:** `EPiServer.Find.Helpers.Text` provided extension methods on `string` that were used casually across the codebase because they were convenient. They have nothing to do with search functionality — they just happened to ship with Find.

**Fix:** Global replacements across all `.cs` and `.cshtml` files:

| Find | Replace |
|---|---|
| `.IsNullOrEmpty()` | `string.IsNullOrEmpty(value)` |
| `.IsNull()` | `value == null` |
| `.IsNotNullOrEmpty()` | `!string.IsNullOrEmpty(value)` |
| `.IsNullOrWhiteSpace()` | `string.IsNullOrWhiteSpace(value)` |

Grep the whole codebase first — you'll find them in places you don't expect.

---

## 3. Bulk-Removing a `using` Can Break Things You Weren't Targeting

**What it looks like:** You remove `using EPiServer.ServiceLocation;` from ~80 files as part of cleaning up `IServiceLocator` usage. Build suddenly fails with `ServiceConfigurationAttribute not found`, `Injected<> not found`, `IConfigurableModule not found`.

**What it actually is:** `EPiServer.ServiceLocation` exports more than just `ServiceLocator`. The namespace also contains:
- `ServiceConfigurationAttribute` (used on service registration classes)
- `ServiceInstanceScope` (used in `[ServiceConfiguration(Lifecycle = ...)]`)
- `Injected<T>` (static property injection)
- `IConfigurableModule` and `ServiceConfigurationContext` (module configuration)

All of these are still valid in CMS 13. Removing the namespace blindly broke the files that used them.

**Fix:** Before removing `using EPiServer.ServiceLocation;` from any file, grep for all the types that namespace exports:

```powershell
Select-String -Path "*.cs" -Pattern "ServiceConfigurationAttribute|ServiceInstanceScope|Injected<|IConfigurableModule|ServiceConfigurationContext" -Recurse
```

Keep the using in any file that hits.

---

## 4. `GetInstance<T>()` Is Gone — But Only One Version of It

**What it looks like:** Errors like `CS1061: 'IServiceProvider' does not contain a definition for 'GetInstance'` in initialization module files.

**What it actually is:** EPiServer provided a `GetInstance<T>()` extension method on `IServiceProvider`, accessible via `context.Locate.Advanced.GetInstance<T>()`. That extension is removed in CMS 13.

**The confusing part:** `ServiceLocator.Current.GetInstance<T>()` — the static pattern — is a completely separate method that still works fine. It's easy to read an error about `GetInstance` and think the whole pattern is gone. It isn't.

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

## 5. `SiteDefinition.Current` — The Docs Reference a Type That Doesn't Exist

**What it looks like:** You look up the replacement for `SiteDefinition.Current` and find references to `IApplicationResolver.GetByContextAsync()`. You add that and it doesn't compile.

**What it actually is:** `IApplicationResolver` does not exist in CMS 13.0.x. Some upgrade documentation references it (possibly a planned API or a later version), but it's not available.

**Fix:** Inject `IHttpContextAccessor` and `ISiteDefinitionResolver`:
```csharp
var host = _httpContextAccessor.HttpContext?.Request.Host.Host;
var site = _siteDefinitionResolver.GetByHostname(host, fallbackToWildcard: true, out _);
```

Verify against your specific CMS 13 version before trusting any documentation that names `IApplicationResolver`.

---

## 6. Third-Party Packages Can Crash Startup Before Any Page Loads

**What it looks like:** The app starts, then immediately throws `CustomAttributeFormatException` from `EPiServer.Framework.TypeScanner`. No pages load. No useful stack trace pointing at your code.

**What it actually is:** `ScheduledPlugIn.SortIndex` was removed from CMS 13. Any package compiled against CMS 12 that uses `[ScheduledPlugIn(SortIndex=...)]` will crash the EPiServer assembly scanner at startup — even if you never call anything from that package.

**Affected packages (CMS 13.0.2):** `Geta.NotFoundHandler.Optimizely`, `Geta.Optimizely.ContentTypeIcons`.

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

## 7. `MapContent()` Order Is Silent — And Breaks Content Creation

**What it looks like:** The app boots. The editor loads. Editors try to create a new page and get "Unable to create page." Image deletion fails silently. Uploads work fine, nothing in the logs points at the obvious cause.

**What it actually is:** If `MapRazorPages()` appears before `MapContent()` in your `UseEndpoints` block, Razor Pages intercepts routes that belong to the CMS. This is an officially accepted bug: **CMS-51344**.

**Fix:** Reorder so `MapContent()` is first:
```csharp
app.UseEndpoints(endpoints =>
{
    endpoints.MapContent();       // ← must be first
    endpoints.MapRazorPages();
    endpoints.MapControllers();
});
```

This one is particularly annoying because the compile and boot both succeed — you only discover it when an editor tries to do actual work.

---

## 8. Cookie `SecurePolicy = Always` Blocks Your Local Login

**What it looks like:** You try to load the app locally and immediately get `InvalidOperationException: antiforgery system has the configuration value AntiforgeryOptions.Cookie.SecurePolicy = Always, but the current request is not an SSL request`. You see it on the home page and the login page.

**What it actually is:** CMS 12 Startup templates set `SecurePolicy = Always` on antiforgery, session, application, and XSRF cookies — correct for production, but completely breaks local development over HTTP. All four need to be dev-aware.

**Fix:**
```csharp
services.AddAntiforgery(options => {
    options.Cookie.SecurePolicy = _env.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
});
```

Apply the same pattern to session, application cookie, and any custom XSRF cookies. Check your Startup for all four.

---

## 9. AutoMapper Throws on Image Pages — Fine on Everything Else

**What it looks like:** The home page and any content-heavy pages throw `AutoMapperMappingException → NullReferenceException`. Plain text pages load fine. It looks like a rendering or partial view issue.

**What it actually is:** CMS 13 has system content types (SysRoot, SysRecycleBin, ContentRoot) where `PageTypeName` is `null`. If you have an AutoMapper type converter that calls `GetAncestors()` and then filters by `PageTypeName` — common in image mapping converters that try to find the site root — it throws on those null values.

**Fix:** Add a null guard before any string operation on `PageTypeName`:
```csharp
var ancestor = loader.GetAncestors(page.ContentLink)
    .OfType<PageData>()
    .SkipWhile(x => x.PageTypeName == null   // ← add this
                 || !x.PageTypeName.EndsWith("HomePage"))
    .FirstOrDefault();
```

This one won't appear until a page with image blocks is actually rendered — a clean build and a working home page won't surface it.

---

## 10. The Content Graph SDK Breaks Startup — Use an Abstraction

**What it looks like:** You add `Optimizely.ContentGraph.Cms` to replace EPiServer.Find and the app throws `InvalidOperationException` at startup from the EPiServer assembly scanner before any pages load.

**What it actually is:** As of CMS 13.0.2, `Optimizely.ContentGraph.Cms` 4.4.0 (the latest version) transitively pulls in `EPiServer.ContentDeliveryApi.Core 3.12.5` — a CMS 12 package that references `ISynchronizedObjectInstanceCache`, which is removed in CMS 13.

**Fix:** Don't add the package yet. Instead, create a thin `ISearchService` abstraction and a `NullSearchService` stub that returns empty results. Wire all search controllers to the interface. When Optimizely ships a CMS 13-compatible SDK build, create a real implementation and swap the registration — nothing else changes.

```csharp
// Register the stub
services.AddScoped<ISearchService, NullSearchService>();

// Later, when SDK is compatible:
// services.AddScoped<ISearchService, ContentGraphSearchService>();
```

The site ships with empty search results rather than not shipping at all. That's the right trade-off.

---

## Final Thought

None of these gotchas are catastrophic once you know what they are. The common thread is that they all looked like something else first — a broad compiler failure, a runtime crash with no obvious cause, behavior that only appears when an editor does actual work.

The upgrade itself is manageable. It's the diagnostic time that kills you. Hopefully this list gives you a head start.

---

*Eduardo Alvarez is a developer at Jaxon Digital. This series documents a real CMS 12 → CMS 13 upgrade completed in May 2026.*

*Part 1: [What Actually Changed in CMS 13](post-1-what-changed-in-cms13.md)*  
*Part 2: [We Upgraded a Real Client Site to CMS 13 — Here's What Actually Happened](post-2-field-report.md)*
