# We Upgraded a Real Client Site to CMS 13 — Here's What Actually Happened

*By Eduardo Alvarez, Jaxon Digital*

---

The best way to understand what a platform upgrade actually involves is to read about someone who did it. Not the docs, not the release notes — someone who sat with the codebase, ran into the problems, and figured it out.

This is that post.

We recently completed a full Optimizely CMS 12 → CMS 13 upgrade for a production site. Mid-sized codebase — a few hundred CS files, custom block library, EPiServer.Find integration, EPiServer.Forms, and several third-party add-ons. The kind of project that's been in active development for years and has accumulated the kind of complexity real projects accumulate.

Here's how it went.

---

## What We Were Working With

- **.NET 6** target framework
- **EPiServer.Cms 12.x**, CMS.UI, CloudPlatform.Cms, AspNetIdentity
- **EPiServer.Find** for search — used in controllers, models, and scattered across the codebase as string extension methods
- **EPiServer.Forms** for contact and lead gen forms
- **AutoMapper** for view model mapping
- **Geta** packages: NotFoundHandler, ContentTypeIcons, Sitemaps
- **Advanced.CMS.AdvancedReviews** and **EnvironmentSynchronizer**
- Custom scheduled jobs, content area renderers, a handful of API controllers

Not unusual. Probably looks a lot like whatever you're working with.

---

## Phase 1: Getting to a Clean Compile

The first thing we did was treat compiler errors as the to-do list. Don't try to reason about the upgrade abstractly — just bump the packages, change the target framework, and let the compiler tell you what broke.

**The first wave was about 180 files.**

Most of it was mechanical: removed packages causing namespace cascades, string extension methods from EPiServer.Find that had spread well beyond search-related files (`.IsNullOrEmpty()`, `.IsNull()`, `.IsNotNullOrEmpty()` — Find extension methods used casually in models and controllers because they were convenient), removed HTML helpers from layout views that no longer exist in CMS 13.

The one that caused the most damage — 105 errors from a single change — was `IContextModeResolver`. In CMS 12 it lives in `EPiServer.Web.Routing`. In CMS 13 it moved to `EPiServer.Web`. We had it injected in a base controller class. Every derived class and every Razor view that inherited the layout got a cascade error. Once we knew what it was, the fix was a find-and-replace. But finding it took a while because the errors pointed at the derived classes, not the base.

**Lesson learned: fix base classes and shared layouts first. The errors always point downstream.**

After that came the systematic exclusions. EPiServer.Find has no CMS 13 version — everything that depended on it went into `<Compile Remove>` in the `.csproj`, with a comment explaining why and what it's waiting for. Same with EPiServer.Forms. Same with `ServiceLocatorDependencyResolver.cs`, a dead file that used `IServiceLocator` (removed in CMS 13) and wasn't being called by anything anyway.

There was also a surprisingly tricky one around `using EPiServer.ServiceLocation;`. We ran a bulk cleanup to remove dead imports of that namespace across ~79 files — reasonable, since we were eliminating `IServiceLocator` usage. But `EPiServer.ServiceLocation` exports more than just `ServiceLocator`. It also exports `ServiceConfigurationAttribute`, `Injected<T>`, `IConfigurableModule`, and `ServiceConfigurationContext` — all still perfectly valid in CMS 13. We'd removed the using from 7 files that still needed it for those types. A second grep pass caught them.

**The rule: never bulk-remove a using without grepping for every type in that namespace, not just the one you think you're cleaning up.**

By the end of Phase 1: **zero compile errors**.

---

## Phase 2: Getting the App to Actually Boot

A clean compile and a running app are two different things.

The first boot threw immediately. `CustomAttributeFormatException` from EPiServer's assembly scanner — before a single page loaded. The cause: `Geta.NotFoundHandler.Optimizely` and `Geta.Optimizely.ContentTypeIcons` were compiled against CMS 12 and reference `ScheduledPlugIn.SortIndex`, a property that was removed in CMS 13. The EPiServer scanner walks every assembly at startup and hits the bad attribute.

The fix is to exclude those assemblies from the scanner via reflection — a bit of a hack, but it's the right move while you're waiting for Geta to ship CMS 13-compatible packages. Two lines in `ConfigureServices` and you're past it.

Next came cookie policy. CMS 12 Startup templates set `SecurePolicy = Always` on antiforgery, session, application, and XSRF cookies. That's correct for production but completely blocks local development over HTTP — the app throws on the login page before you can get in. We made all four policies dev-aware using `IWebHostEnvironment.IsDevelopment()`.

Then: the `App_Data/blobs/` directory. In development mode, `Startup.cs` only calls `services.AddCms()` — `AddCmsCloudPlatformSupport` is gated behind a non-dev environment check. So Azure Blob Storage isn't configured, and the CMS falls back to a local `FileBlob` provider that writes to `App_Data/blobs/`. That directory didn't exist on the development machine. Creating it took two seconds; figuring out why the app was throwing `DirectoryNotFoundException` on every request took longer.

Once the app was booting, we hit a `NullReferenceException` on any page that rendered an image block. It was coming from an AutoMapper type converter that called `GetAncestors()` and inspected `PageTypeName` — a property that's `null` for system content types (SysRoot, SysRecycleBin, ContentRoot) in CMS 13. One null guard fixed it.

**Phase 2 total: home page 200. Login working. Editor loading at `/Optimizely/CMS/`. Real content rendering.**

---

## The Things We Couldn't Fix (Yet)

Some things are outside the developer's control:

**EPiServer.Forms** has no CMS 13 release. All form-related files are excluded from compilation. The site runs without them, which is the right call — you don't hold up a full upgrade for a vendor release.

**Optimizely.ContentGraph.Cms** 4.4.0 — the official Find replacement — pulls in a CMS 12 dependency (`EPiServer.ContentDeliveryApi.Core 3.12.5`) that references `ISynchronizedObjectInstanceCache`, which is removed in CMS 13. Adding the package breaks startup. Our interim solution: an `ISearchService` abstraction with a `NullSearchService` stub that returns empty results. All search controllers wire to the interface. When Optimizely ships a compatible SDK build, we create a real `ContentGraphSearchService` and swap the registration. The rest of the codebase doesn't need to change.

**Geta, Advanced.CMS.AdvancedReviews, EnvironmentSynchronizer** — same story. Excluded from the scanner or from compilation, with clear comments explaining what they're waiting for.

---

## By The Numbers

- Files modified: **180+**
- Compile errors resolved: **~250** (including cascades)
- Days of active upgrade work: **~4**
- Vendor-blocked items: **6** (not our problem to solve, documented and tracked)
- `<Compile Remove>` entries: **~30**, all annotated
- Build result: **0 errors, 0 warnings from our code**

---

## What We'd Do Differently

**Start with the base classes.** The `IContextModeResolver` cascade cost us significant time because we were reading errors that were symptoms, not causes. In future upgrades, the first grep is for `IContextModeResolver` in any class that other classes inherit from.

**Grep before you bulk-remove.** Any time you're removing a using statement across a large number of files, verify every type exported by that namespace before touching anything.

**Phase your work explicitly.** It's tempting to fix runtime issues while cleaning up compile errors. Resist it. You can't reason about runtime behavior until the build is clean. Write it down, save it for Phase 2, keep moving.

---

*Next: [10 CMS 13 Upgrade Gotchas That Will Bite You (And How to Fix Them)](post-3-gotchas.md)*
