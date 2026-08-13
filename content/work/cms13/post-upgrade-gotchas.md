---
title: "Post-Upgrade Gotchas in CMS 13"
tags:
  - optimizely
  - cms
  - upgrade
  - debugging
  - bugs
---

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

### Inline Blocks Silently Stop Rendering — `GetContent()` Became `LoadContent()`

**Symptom.** Blocks an editor creates *for this page* (inline blocks, rather than picking an existing shared block) don't appear on the published page. Existing pages are fine, so it looks like an editor error. Depending on your guards it presents as either a hard 500 on the whole page, or the block silently missing with nothing in the log.

**Root cause.** If you have a custom `ContentAreaRenderer`, check how it resolves the item. CMS 12:

```csharp
IContent content = contentAreaItem.GetContent();       // handles linked AND inline
```

`GetContent()` doesn't exist in CMS 13 — it's `ContentAreaItemExtensions.LoadContent()`. The trap is that **`LoadContent()` returns `IContentData`, not `IContent`**, because an inline block has no content identity. Faced with that compile error it's tempting to write:

```csharp
IContent content = _contentLoader.Get<IContent>(contentAreaItem.ContentLink);   // WRONG
```

That compiles and works for every *linked* block, so it passes casual testing. But an inline block is stored inside the ContentArea's own XML and has **no ContentLink and no ContentGuid at all**:

```xml
<div data-contentgroup="" data-inlineblockname="404 Hero" data-inlineblocktypeid="57" />
```

`Get<T>` throws `ArgumentNullException` on a null link, so one inline block fails the entire page.

**Fix.** Use `LoadContent()` and widen the local variable. `ContentRenderingScope`, `ResolveContentTemplate` and `RenderContentData` all accept `IContentData` in CMS 13, so nothing downstream needs changing:

```csharp
IContentData content = contentAreaItem.LoadContent();
if (content == null) { /* log and skip */ return; }
```

**How to spot it fast.** Query the ContentArea property value. If it contains `data-inlineblockname` and no `data-contentguid`, it's an inline block. On one site exactly **one** content item used inline blocks — restored production content is all linked — which is why this survives until an editor creates something new. That makes it a UAT-blocker rather than a launch-blocker, and it will be found by your client, not by you.

### `SiteDefinition.Current` Compiles, Doesn't Throw, and Returns the Wrong Site

**Symptom.** There isn't one. That's the whole problem. On a multi-site solution, a feature that reads `SiteDefinition.Current` keeps working after the upgrade, reports plausible-looking results, and those results belong to a **different site**. Nothing appears in the log and nothing fails a smoke test.

**Root cause.** Most upgrade guides tell you `SiteDefinition.Current`'s **setter** throws `NotImplementedException` on CMS 13, so teams grep for assignments, fix those, and move on. The **getter** is the one that bites. Site identity taken from the static accessor is unreliable on CMS 13 for a separate reason: `ISiteDefinitionRepository.List()` returns items whose `Id` is `Guid.Empty`, with synthetic underscore-delimited names:

```
Site_0E96B85F_3A5A_4C59_AD6A_6C42FE661899_
```

So anything downstream that identifies a site by GUID or name from that path is working from garbage — but a *plausible* `SiteDefinition` object still comes back, with populated properties. Reads succeed. They're just wrong.

```csharp
// Compiles on CMS 13. Does not throw. May resolve the wrong site's asset root.
var images = _contentRepository.GetDescendents(SiteDefinition.Current.SiteAssetsRoot);
```

**Fix.** Resolve from the request instead, via `ISiteDefinitionResolver`, and **fail loudly rather than falling back**:

```csharp
if (!Request.Host.HasValue)
    throw new InvalidOperationException("No request host — refusing to guess a site.");

var site = _siteDefinitionResolver.GetByHostname(Request.Host.Host, true);

if (site == null || ContentReference.IsNullOrEmpty(site.SiteAssetsRoot))
    throw new InvalidOperationException($"No site asset root for host '{Request.Host.Host}'.");

return site.SiteAssetsRoot;
```

The throw is deliberate. A silent fallback to an empty or global root is how you get a report that covers the wrong site while looking like it worked — which is the failure mode you just spent time diagnosing.

**How to spot it fast.** `grep -rn "SiteDefinition.Current" --include=*.cs` and treat **every** hit as suspect, not just assignments. Then rank by blast radius: on a single app serving many sites, anything resolving an asset root, a start page, or a content root from the static accessor is a candidate. Verify by exercising the feature on two different hosts and confirming the outputs **differ** — identical output across two sites is the tell. And note what won't help you: it compiles, it boots clean, and a smoke gate passes. Only a two-host comparison catches it.

### After a Production DB Restore, `sitemap.xml` 404s on Every Non-Production Host

**Symptom.** `Geta.Optimizely.Sitemaps` is referenced, `AddSitemaps(...)` is registered, the package clearly loads — and `GET /sitemap.xml` returns **404** on your Integration or test host. The log carries:

```
fail: Geta.Optimizely.Sitemaps.Controllers.GetaSitemapController[0]
      Xml sitemap data not found!
```

**The obvious diagnosis is wrong.** That log line reads like "the sitemap has never been generated", so the natural conclusion is that the generation job hasn't run — especially if your lower environments disable auto-scheduled jobs (`ScheduledJobs Id="*" IsEnabled=false`), which makes the story fit perfectly. Running the job manually changes nothing, and you lose an afternoon.

**Root cause.** Geta stores sitemap **definitions** as content-level data, and resolves a request by matching the **incoming request host** against them. Those definitions come across in the restored production database still carrying **production hostnames**. Nothing claims your Integration host, so there is nothing to serve and nothing for the job to generate *for that host*.

Open the admin page (`/GetaOptimizelySitemaps`) and you'll see rows for every production host and none for the environment you're actually testing. The controller is being reached correctly; it just has no definition to match.

**Fix.** Add a definition per non-production host — no code change, no deploy:

1. `/GetaOptimizelySitemaps` → add a row per host, e.g. `https://<your-int-host>/sitemap.xml`.
2. **Pick the root page from the content tree, not by typing an ID.** On a multi-site instance the production row's root page ID is not automatically the right one for the host you're adding — see the `SiteDefinition.Current` gotcha above for why site identity is untrustworthy here. Use the existing production row's **View** action first to confirm which site a given root actually generates.
3. Run the sitemap generation job manually if your environment disables auto-scheduling.
4. Re-request `/sitemap.xml` and check the URL count against production's sitemap.

Leave the production rows alone — they're correct for production, and you'll want them when that environment exists.

**Two things worth knowing.** First, this is **parity loss, not a missing feature**: production serves a sitemap and advertises it in `robots.txt`, so treat it as a regression rather than an enhancement. Second, `robots.txt` in a test environment usually serves `Disallow: /` — correct, but it also means **no `Sitemap:` directive**, so remember to restore that line at go-live or the sitemap ships unadvertised.

### The Sitemap Returns 200 — and Silently Includes Every Page Editors Excluded

**Symptom.** You've re-enabled `Geta.Optimizely.Sitemaps` now that a CMS 13 build exists. `GET /sitemap.xml` returns **200** with a plausible list of URLs. But it contains pages that have no business being there — error pages, `/search/`, `/thank-you/`, an old QA test page — and the per-page **XML Sitemap** tab in the editor shows a plain empty text box instead of the Enabled / Priority / Change frequency controls. No exception, no warning, nothing in the log.

Same shape for `robots.txt`: it serves fine, but there's no `Sitemap:` line on any environment — production included.

**The obvious diagnosis is wrong.** The natural reading is "nobody ever marked these pages as excluded", so you start ticking *exclude* page by page. On a multi-site instance that's dozens of edits — and every one is wasted, because the exclusions were set years ago and are **still sitting in the database**.

**Root cause.** While the vendor had no CMS 13 build, the property's backing type was commented out so the solution would compile:

```csharp
[UIHint("SeoSitemap")]
// [BackingType(typeof(PropertySEOSitemaps))]  ← commented out to survive the upgrade
public virtual string? SEOSitemaps { get; set; }   // ← degrades to a plain string
```

`[BackingType]` is what binds a model property to the CMS property type that actually stores and renders the data. Remove it and the property falls back to a plain string: the editor loses the custom UI, and the sitemap generator asks for its typed property, finds nothing, and defaults to **include everything**.

The rows are never deleted. The model just stops mapping to them.

> This is a **silent data-visibility bug, not a missing feature** — and that's what makes it dangerous. The headline feature (`sitemap.xml` returns 200) works, so the ticket reads as done.

**Prove it before you touch the CMS.** One query tells you whether the data is still there and how much of it is being ignored:

```sql
SELECT COUNT(*) AS Excluded
FROM tblContentProperty cp
JOIN tblPropertyDefinition pd ON cp.fkPropertyDefinitionID = pd.pkID
WHERE pd.Name = 'SEOSitemaps'
  AND ISNULL(cp.[String], cp.LongString) LIKE '%<enabled>false</enabled>%';
```

On the project this was found on: **91 values intact, 19 of them `enabled=false`** — nineteen pages the sitemap had been publishing against the editors' explicit instruction.

**Fix.** Uncomment the attribute and its `using`, and restore any integration code that was stubbed alongside it — in this case `ISitemapRepository` injection in the `robots.txt` controller, which emits the `Sitemap:` directive. Then re-run the generation job.

**Does the data survive re-attaching the backing type?** Yes, in both directions — worth knowing because it looks risky. `PropertySEOSitemaps` derives from `PropertyString`, which stores in `tblContentProperty.[String]`; the stubbed plain-string property stores in `LongString`. EPiServer migrates the values when the property-definition type changes, so the round trip out and back is lossless. Check `MAX(LEN(...))` against `[String]`'s `nvarchar(450)` first if your values could be long. Snapshot the rows to a CSV before deploying anyway — on DXP you cannot reach the database externally to repair it afterwards.

**Verify by diffing path sets against the old site, not by counting.** Counts can match while the contents differ:

```powershell
function Paths($u){ ([xml](Invoke-WebRequest $u -UseBasicParsing).Content).urlset.url.loc |
                    ForEach-Object { ([uri]$_).AbsolutePath.ToLower() } }
$new = Paths 'https://<new-host>/sitemap.xml'; $old = Paths 'https://<live-host>/sitemap.xml'
$new | Where-Object { $old -notcontains $_ }   # ← extras: the real defects
$old | Where-Object { $new -notcontains $_ }   # ← usually just content published since your DB snapshot
```

Aim for **zero** only-on-new entries. Only-on-old entries are normally content authored after your database copy was taken, not a bug.

**Expect some pages to legitimately have no value.** Absence isn't a defect — of eight `SearchPage` instances across ~24 sites, exactly one had ever been set. Let the old site's sitemap arbitrate rather than assuming every page needs an explicit setting.

**The generalisable lesson.** Every stub like this was written behind a comment whose condition has since expired:

```bash
grep -rn "re-add when vendor ships\|no CMS 13 release\|when the package is updated" --include=*.cs .
```

Run that the day a blocked package finally ships. A re-enablement is not "add the PackageReference back" — it's *every* integration point that was commented out to survive its absence, and the ones that fail loudly are the ones you'll remember to fix.

### `robots.txt` Still Disallows `/episerver` — Which No Longer Exists

**Symptom.** Nothing appears broken. But `robots.txt` carries the line it has carried for years:

```
User-agent: *
Disallow: /episerver
```

On CMS 13 that path is a **404**. The editor moved to **`/ui/cms`**, which is wide open to crawlers because nothing disallows it.

**Why it survives the upgrade.** This is usually *content*, not code — a `RobotsTxtContext` (or similarly named) property on the start page, edited in the CMS. Code-focused upgrade sweeps never look at it, and it produces no error, so it outlives every other `/episerver` reference in the solution. Anywhere the CMS 12 editor path was hard-coded into editable content — robots rules, redirect exclusions, help links, firewall/WAF path rules — has the same problem.

**Fix.** Update the property per site (it's per-start-page on a multi-site instance, so it's not a single edit) and confirm the real path first rather than trusting either value:

```bash
curl -o /dev/null -w '%{http_code}\n' https://<host>/episerver   # 404 on CMS 13
curl -o /dev/null -w '%{http_code}\n' https://<host>/ui/cms      # 302 to the identity provider
```

Diff the whole file against the live site while you're there — this is exactly the kind of property that quietly drifts between environments.

### A Null ContentLink Turns Every 404 Into a 500

**Symptom.** A large fraction of your 500s are requests for files that don't exist — `.js.map`, `.css.map`, favicons. In one 3-hour window on Integration, **152 of 175 500s** were ordinary source-map 404s.

**Root cause.** Custom error pages usually have a ContentArea. So: request 404s → the error page re-executes → its ContentArea throws (see the inline-block gotcha above, or any block-level exception) → the 404 comes back as a 500. One bad item on the error page escalates *every* 404 on the site.

**Fix.** Two parts. Guard the item resolution, and — more importantly — **don't let one block's exception fail the page**:

```csharp
try   { htmlHelper.RenderContentData(content, true, templateModel, _contentRenderer); }
catch (Exception ex) { Logger.Error($"block skipped to keep the page alive: {ex.Message}", ex); }
```

A missing block plus a loud `Error` line is strictly better for a visitor than a 500, and the bug stays fully visible in logs. **Log the skip.** Silently swallowing is what turns a ten-minute diagnosis into a day: an editor sees the block in edit mode, it's absent on the page, and nothing anywhere says why.

**The block guard is not the whole fix — check your layout's view components too.** After applying the above, missing *media* paths (`/siteassets/nope.jpg`, `/globalassets/`) still returned 500 while missing *pages* correctly returned 404. Different code path entirely, and nothing in the ContentArea:

```csharp
// the common broken shape, repeated in three separate components
ContentReference link = _pageRouteHelper.ContentLink;
if (ContentReference.IsNullOrEmpty(link))
    return Content(String.Empty);          // guards the LINK...

var currentPage = _pageRouteHelper.Page;
var vm = new PageViewModel<BasePage>(currentPage as BasePage);  // ...but not the PAGE, or the cast
```

A media request routes with a **non-empty ContentLink** whose resolved `Page` is not a `BasePage`, so `as BasePage` yields null and the view model's constructor dereferences it. Because these components render from `_Layout`, that `NullReferenceException` also kills the error handler — you get `An exception was thrown attempting to execute the error handler` and a hard 500 instead of the 404 the request deserved.

Audit **every** component your layout invokes. On one site three of four were affected (metadata, header, footer); the fourth already guarded correctly. Guard the resolved page, not the link:

```csharp
var currentPage = _pageRouteHelper.Page as BasePage;
if (currentPage is null)
    return Content(String.Empty);   // a non-page route has no page metadata to render
```

Two related traps in the same components: a **hard cast** `(BasePage)currentPage` fails louder but just as fatally, and helper methods ending in `FirstOrDefault()` can return null into an AutoMapper call further down. Guard both.

**Diagnostic order that works:** compare a missing *page* against a missing *media* path. If pages 404 and media 500s, the fault is in the layout, not the ContentArea — and grepping the log for the originating frame (`…ViewModel..ctor`, `…Component.Invoke`) names the file directly.

### AutoMapper: Casting a Block to `IContent` Fails on `_DynamicProxy`

**Symptom.**

```
AutoMapper.AutoMapperMappingException: Error mapping types.
Mapping types: B3SmallHeroBlock -> B3SmallHeroBlockViewModel
Destination Member: BlockId
 ---> System.InvalidCastException: Unable to cast object of type
      'B3SmallHeroBlock_DynamicProxy' to type 'EPiServer.Core.IContent'.
```

**Root cause.** A common pattern for deriving an anchor id:

```csharp
CreateMap<StandardBlockBase, BlockViewModelBase>()
    .IncludeAllDerived()
    .ForMember(m => m.BlockId, o => o.MapFrom(s => ((IContent)s).ContentLink.ID.ToString()));
```

The unchecked cast fails for proxied blocks and for inline blocks (`BlockData`, not `IContent`). `.IncludeAllDerived()` means it applies to **every** block type, so it's not a niche failure.

**Fix.** Use `as` and guard. Note AutoMapper's expression-tree overload **cannot contain an `is` pattern** (`CS8122`) — use the delegate overload:

```csharp
.ForMember(m => m.BlockId, o => o.MapFrom((source, _) =>
{
    var content = source as IContent;
    return content != null && !ContentReference.IsNullOrEmpty(content.ContentLink)
        ? content.ContentLink.ID.ToString()
        : string.Empty;
}));
```

**Ordering trap.** This defect can be *masked* by the inline-block bug above. While the renderer skips inline blocks, the mapper is never reached. Fix the renderer and this immediately starts throwing — so fix both in the same change, or your "fix" will look like a regression.

### EPiServer Forms: The "Content-Type" Exception Message Changed

**Symptom.** Bot traffic POSTing to arbitrary paths with no body produces:

```
System.InvalidOperationException: This request does not have a Content-Type header.
Forms are available from requests with bodies like POSTs and a form Content-Type of
either application/x-www-form-urlencoded or multipart/form-data.
   at Microsoft.AspNetCore.Http.Features.FormFeature.ReadForm()
   at EPiServer.Forms.Controllers.FormContainerBlockController.IsCurrentFormSubmitting(...)
```

A form block in a site-wide footer renders on every page **and every error page**, so this cascades: the error page re-renders the same block and you get `An exception was thrown attempting to execute the error handler`.

**Root cause + fix.** If you ported a guard from CMS 12, its string match is probably stale. CMS 12 matched `"Incorrect Content-Type"`; CMS 13 / .NET 10 emits `"does not have a Content-Type header"`. Match both:

```csharp
exception is AntiforgeryValidationException
  || (exception is InvalidOperationException
      && (exception.Message.Contains("Incorrect Content-Type", StringComparison.OrdinalIgnoreCase)
       || exception.Message.Contains("does not have a Content-Type header", StringComparison.OrdinalIgnoreCase)))
```

Worth checking your CMS 12 codebase for guards like this before you port. Two separate protections in one file were dropped in one upgrade because the porter hit a compile error and reached for the nearest thing that built.

### `PropertyList<T>` Silently Returns an Empty List — And Optimizely's Own Advice Is Stale

**Symptom.** Every instance of a custom `PropertyList<T>` property renders **zero entries**, on pages where production shows many. In the editor the collection appears empty while sibling properties on the same block are populated, and adding an entry then publishing fails `[Required]` validation. So the round trip is broken in **both** directions.

The critical detail: **there is no exception anywhere.** No log line, no error, nothing. `PropertyData.IsNull` comes back `true` and the list is empty. Four separate deploys can find nothing, because there is nothing to find.

**The content is not lost.** Check the database before considering a re-import — the stored JSON is intact, camelCase, with rich text written as a bare HTML string:

```json
[{"label":"Chlorine","column1Text":"<p>Chlorine is one of the most abundant…</p>"}]
```

**Root cause.** On CMS 13, `PropertyList<T>` hydrates with **System.Text.Json**, not Newtonsoft. `XhtmlString` has no parameterless constructor and no string coercion, so STJ cannot materialise one, the element fails, and the **entire list** comes back empty.

**⚠️ Optimizely support will tell you the opposite.** Asked directly, support advised that `PropertyList<T>` calls `Newtonsoft.Json.JsonConvert` directly and that "System.Text.Json converters are never used at all." **That guidance comes from a CMS 11 KB article and does not hold on CMS 13.** Acting on it produces a converter that is silently ignored. If you search for this, search for *"PropertyList custom JsonConverter"* rather than *"CMS 13 breaking change"* — it reads like a long-standing constraint and the CMS 11 material dominates the results.

**Fix.** A System.Text.Json converter applied **as a member attribute** on each complex member:

```csharp
using StjJsonConverter = System.Text.Json.Serialization.JsonConverterAttribute;

public class AccordionEntry
{
    public virtual string Label { get; set; }

    [StjJsonConverter(typeof(XhtmlStringSystemTextJsonConverter))]
    public virtual XhtmlString Column1Text { get; set; }
}
```

```csharp
public sealed class XhtmlStringSystemTextJsonConverter : JsonConverter<XhtmlString?>
{
    public override XhtmlString? Read(ref Utf8JsonReader reader, Type t, JsonSerializerOptions o)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        var html = reader.GetString();
        return string.IsNullOrEmpty(html) ? null : new XhtmlString(html);
    }

    public override void Write(Utf8JsonWriter writer, XhtmlString? value, JsonSerializerOptions o)
        => writer.WriteStringValue(value?.ToInternalString());   // storage form, not ToHtmlString
}
```

Three things that each cost a deploy:

- **Member attribute, not global registration.** A converter registered in serializer options is never consulted here. This is the single distinction that matters, and it is why an STJ converter can be "already tried" and still be the answer.
- **`ToInternalString()` on write**, not `ToHtmlString()`. The latter requires an `IPrincipal`, renders for display, and will not round-trip.
- **`ParseItem` / `ParseToSelf` are not on the hydration path.** Overriding them produces zero log lines — a genuine negative, easily misread as "my code isn't deployed."

Keep a Newtonsoft attribute alongside the STJ one if you like; which serializer the platform reaches for has changed across versions and carrying both costs nothing.

**Only complex members break.** Measured on the same codebase: an entry type with `ContentReference` hydrated fine; entry types with only `string` members hydrated fine. `XhtmlString` was the one that failed. Optimizely also call out `Url` and `PageReference` as candidates — verify rather than assume.

**The diagnostic that isolates this in one request — use a control.** Find a `PropertyList<T>` in the same solution whose item type has **only simple members**, and load both through `IContentLoader`:

| Entry type | Members | Entries hydrated |
|---|---|---|
| `StatEntry` | all `string` | 4 of 4 ✅ |
| `AccordionEntry` | has `XhtmlString` | 0 ❌ |

That single comparison kills "`PropertyList` is broken on CMS 13" and pins it to the member type. Without the control you are guessing at a mechanism with a 20-minute feedback loop.

**Run it locally, not through deploys.** A restored copy of the environment's database plus a `Development`-gated diagnostic endpoint that loads content via `IContentLoader` and reports `.Count` / `IsNull` turns a 20-minute deploy cycle into a sub-second one. It also sidesteps editor login and routing entirely. A standalone reflection harness over `PropertyList<T>` is **not** worth building — `ParseToSelf` and `LoadData` both throw on an unattached property instance, which looks like a finding but is an artifact of the harness.

**Search impact.** A property that cannot be read never reaches `_fulltext` either — see [[work/cms13/search-to-graph|Search & Navigation → Graph Migration]]. Fix content loading before you benchmark search recall.

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
