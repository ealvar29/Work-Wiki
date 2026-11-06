---
title: Breaking Changes in CMS 13
tags:
  - optimizely
  - cms
  - migration
  - breaking-changes
---

Full catalog of breaking changes. The [official docs](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/breaking-changes-in-cms-13) cover all nine categories. The most impactful ones are here.

**Tip from Optimizely docs:** "Binary breaking changes do not necessarily require code changes — just recompilation." Use compiler warnings as your migration roadmap: deprecated APIs produce warnings, step through them systematically.

## 1. Platform

- **.NET 10 required** — `net8.0` target framework will not work
- **`Newtonsoft.Json` replaced by `System.Text.Json`** — custom serialization code needs review
- **`Castle.Windsor` removed** — if you used Windsor for DI, migrate to the built-in `IServiceCollection`
- **`UpdateDatabaseCompatibilityLevel = true`** required in `DataAccessOptions` on first startup

## 2. Navigation Shell

Old (CMS 12):
```csharp
@Html.CreatePlatformNavigationMenu()
<div @Html.ApplyPlatformNavigation()>
    @RenderBody()
</div>
```

New (CMS 13):
```html
<platform-navigation />
<platform-navigation-wrapper>
    @RenderBody()
</platform-navigation-wrapper>
```

Required in `_ViewImports.cshtml`:
```html
@addTagHelper *, EPiServer.Shell.UI
```

The new component uses fixed positioning — add `padding-top: 56px` to your content wrapper.

**The editor also moved to `/ui/cms`.** Every CMS 12 path is gone:

| CMS 12 | CMS 13 |
|---|---|
| `/episerver`, `/episerver/cms`, `/Optimizely/CMS/` | `/ui/cms` |

The old paths 302 to `/` or 404, which presents as *"editor login is broken"* rather than *"wrong URL"* — a healthy OIDC challenge is still being issued, just not from where you're looking. Update bookmarks, editor documentation, and any `robots.txt` still disallowing `/episerver`.

## 3. SiteDefinition → Applications

| Removed | Replacement |
|---|---|
| `SiteDefinition.Current` | `IApplicationResolver` (CMS 13.5+; see version note below) |
| `ISiteDefinitionRepository` | `IApplicationRepository` |
| GUID-based `Id` | Immutable `Name` string |

> **`IApplicationResolver` is version-specific.**
>
> | Version | `IApplicationResolver` |
> |---|---|
> | CMS 13.0.x (OxyChem 13.0.2, May 2026) | ❌ Absent |
> | CMS 13.5.1 (VHB spike, Nov 2026) | ✅ `EPiServer.Applications.IApplicationResolver` — `GetByContext` / `GetByContextAsync`, `GetByHostname` / `GetByHostnameAsync`, `GetByContent` / `GetByContentAsync` |
>
> On 13.5.x use `IApplicationResolver`. `ISiteDefinitionResolver.GetByHostname()` is **not** the replacement — it is part of the obsolete `SiteDefinition` shim, and was only OxyChem's stop-gap on 13.0.x where nothing better existed. Check the package version in your `.csproj` before following any guidance either way. *(VHB spike VHBK-499, 2026-11-05 (spike/cms13 commit 13ed447, CMS 13.5.1 / Forms 6.0.2 package metadata).)*

See [[applications-model|Applications Model]] for full details.

## 4. Search & Navigation Removed

Optimizely Search & Navigation (Find) is **fully deprecated** — there is no support path in CMS 13. You must migrate to Optimizely Graph or a third-party search provider before upgrading.

See [[search-to-graph|Search & Navigation → Graph Migration]] for the migration path.

## 5. Plugin Manager Removed

The Plugin Manager UI and backend are gone entirely. Scheduled jobs should move off the `EPiServer.PlugIn` system:

| Removed / deprecated | Replacement |
|---|---|
| `[ScheduledPlugIn]` — **deprecated, not removed** | `[ScheduledJob]` from `EPiServer.Scheduler` |
| Plugin Manager UI | Admin area no longer has this section |

`[ScheduledPlugIn]` is still present in CMS 13.5.1 and still compiles — `Geta.Optimizely.Sitemaps` 4.0.0 (a CMS 13 package) uses it. Migrate when convenient; it is not a compile blocker. *(VHB spike VHBK-499, 2026-11-05 (spike/cms13 commit 13ed447, CMS 13.5.1 / Forms 6.0.2 package metadata).)*

## 6. On-Page Editing Disabled

On-Page Editing is **disabled** by default, not removed. Visual Builder is the new default. To re-enable:

```csharp
services.Configure<CmsFeatureOptions>(options =>
{
    options.OnPageEditing = true;
});
```

## 7. Editor Descriptors

Constructor signatures changed on 11+ descriptor classes. Affected types include:
- `ContentReferenceEditorDescriptor`
- `ContentAreaEditorDescriptor`
- `LinkCollectionEditorDescriptor`
- `PageReferenceListEditorDescriptor`

Change: `IEnumerable<IContentRepositoryDescriptor>` → `IContentRepositoryDescriptorRegistry`

New parameters added: `IApplicationResolver`, `ServiceAccessor<SystemDefinition>`

Not every descriptor broke: a custom descriptor deriving from **`CollectionEditorDescriptor<T>`** (the usual `PropertyList<T>` editor) compiles unchanged on CMS 13.5.1. *(VHB spike VHBK-499, 2026-11-05 (spike/cms13 commit 13ed447, CMS 13.5.1 / Forms 6.0.2 package metadata).)* Compiling is not the same as working — see the `PropertyList<T>` hydration gotcha in [[post-upgrade-gotchas#propertylistt-silently-returns-an-empty-list--and-optimizelys-own-advice-is-stale|Post-Upgrade Gotchas]].

## 8. TinyMCE

- `AddSettingsTransform(name, delegate)` now throws if name is null/empty
- New overload: `AddSettingsTransform(delegate)` with auto-generated name
- Extension methods `AddTinyMce()` and `DisableEditorValidation()` moved to `EPiServer.DependencyInjection` namespace

**JSON in `EditorConfiguration`** must now use `System.Text.Json` rules — property names must be double-quoted; single quotes and unquoted keys are invalid.

## 9. ContentArea

`ContentArea.FilteredItems` is **obsolete**. Migrate to:
1. `Items` for all items
2. HtmlHelpers/TagHelpers for rendering
3. `IEnumerable<IContentAreaItemsRenderingFilter>` for programmatic filtering

## 10. HtmlHelpers Removed

| Removed | Replacement |
|---|---|
| `PageHtmlHelperExtensions.PageLink()` | `Html.ContentLink` |
| `ContentAreaRenderer.ResolveTemplate()` | — |
| `ContentAreaRenderer.IsInEditMode()` | — |
| `PartialRequest` class | `IContentRenderer` or `Html.RenderPartial` |

**Compile-break clusters the official docs don't list.** These were the largest groups of errors in the VHB spike against CMS 13.5.1 / Forms 6.0.2 *(VHB spike VHBK-499, 2026-11-05 (spike/cms13 commit 13ed447, CMS 13.5.1 / Forms 6.0.2 package metadata))*:

| CMS 12 | CMS 13.5.1 |
|---|---|
| `PageEditing.PageIsInEditMode` | **Removed.** `PageEditing` keeps only its constants and `GetEditUrl`. In views: `@inject IContextModeResolver ContextModeResolver`, then `ContextModeResolver.CurrentMode == ContextMode.Edit` |
| `CacheManager` | Obsolete **as error** — no longer compiles |
| Forms `FormDataRepository` constructor | Signature changed in Forms 6 — subclasses / direct construction break |
| `TemplateTypeCategories.Page` | No longer compiles — template registrations using it break (replacement not recorded by the spike) |
| `IContentRouteHelper.Page` | No longer compiles (replacement not recorded by the spike) |
| `ContentAreaRenderer.Get(item)` | `LoadContent(item)`, which returns **`IContentData`** (not `IContent`) |
| `ContentAreaRenderer.IsInEditMode(htmlHelper)` | `IsInEditMode()` — no parameter |
| `ContentAreaRenderer.ResolveTemplate(...)` | `ResolveContentTemplate(htmlHelper, content, tags)` |
| `new ContentRenderingScope(...)` | Constructor is now `(HttpContext, IContentData, TemplateModel, IEnumerable<string>)` |

Custom `ContentAreaRenderer` subclasses hit almost every row in the second half of that table at once.

## 11. Menu System

Removed: `MenuAssembler`, `MenuItem.Render()`, `ShellMenuProvider`, `SettingsMenuProvider`, `MenuBuilder`

Replacement: implement `IMenuProvider` or `IAsyncMenuProvider`

## 12. Visitor Groups Registration

```csharp
// CMS 12
services.AddVisitorGroups();

// CMS 13
using EPiServer.Cms.UI.VisitorGroups;   // required — see below

services.AddVisitorGroupsMvc().AddVisitorGroupsUI();
// Package: EPiServer.Cms.UI.VisitorGroups
```

The two calls come from **two different packages**, and only the second one is new:

| Call | Assembly | Already present? |
|---|---|---|
| `AddVisitorGroupsMvc()` | `EPiServer.Cms.AspNetCore.Mvc` | Yes — arrives transitively with `EPiServer.Cms` |
| `AddVisitorGroupsUI()` | `EPiServer.Cms.UI.VisitorGroups` | No — add the `PackageReference` |

`AddVisitorGroupsUI` is declared on `EPiServer.Cms.UI.VisitorGroups.ServiceCollectionExtensions`, **not** `EPiServer.DependencyInjection` where the other `Add*` builders live. Without that using, only the second call fails to compile — a half-error that reads like a bad package reference rather than a missing namespace.

Until this is wired, "Visitor Groups" is simply **absent from the CMS menu**, with no error anywhere. See [[post-upgrade-gotchas#visitor-groups-is-missing-from-the-cms-menu|Post-Upgrade Gotchas]].

Wiring it up is only half the job. **`EPiServer.Forms.Samples` has no CMS 13 build** (newest is 4.2.7, capped at `EPiServer.Forms < 6.0.0` and `EPiServer.CMS.UI < 13.0.0`), so any audience migrated from CMS 12 that uses its `FormCriterion` — "visitor has submitted form X" — loads with *"This criterion failed to load"* and matches nobody. The UI is also renamed **"Audiences"** in CMS 13 while every API route, config key and DI call still says `VisitorGroups`. See [[post-upgrade-gotchas#audiences-migrated-from-cms-12-fail-with-this-criterion-failed-to-load|Post-Upgrade Gotchas]].

## 12a. Newtonsoft `UrlConverter` Removed

`EPiServer.Cms.Shell.Json.Internal.UrlConverter` — the Newtonsoft converter CMS 12 used to store `Url` values as JSON strings — is **gone in CMS 13**. Nothing references it by name in most codebases, so it produces no compile error; the impact is at runtime, on `PropertyList<T>` items with `Url` members whose stored values were written by it. See [[post-upgrade-gotchas#propertylistt-silently-returns-an-empty-list--and-optimizelys-own-advice-is-stale|Post-Upgrade Gotchas → PropertyList]]. *(VHB spike VHBK-499, 2026-11-05 (spike/cms13 commit 13ed447, CMS 13.5.1 / Forms 6.0.2 package metadata).)*

## 13. Async REST/Context Services

| Removed | Replacement |
|---|---|
| `ContextStore.Get()` | `GetAsync()` → `Task<RestResultBase>` |
| `IUriContextResolver.TryResolveUri()` | `TryResolveUriAsync()` |
| `IUrlContextResolver.TryResolveUrl()` | `TryResolveUrlAsync()` |

## 14. DAM Namespace

`EPiServer.Cms.DamIntegration` → `Optimizely.Cms.DamIntegration`

`<dam-asset>` tag and `DamHtmlHelpers` obsoleted. `PropertyAttributeTagHelper` now renders DAM assets as standard `<img>`, `<video>`, `<a>` tags.

## 15. Commerce Compatibility

**CMS 13 is not compatible with Commerce 14.** Wait for Commerce 15.

## 16. Third-Party Known Issues

GA-era guidance listed Optimizely Forms, Geta packages, and anything built on Search & Navigation as incompatible. As of **June 2026 (verified on the OxyChem CMS 13.0.2 upgrade)** the picture has moved:

| Package | CMS 13 status |
|---|---|
| Optimizely Forms | ✅ **6.0.0 ships and works** — `services.AddForms()`. (Earlier "no CMS 13 release" guidance is obsolete.) |
| Optimizely Graph (Find replacement) | ✅ Shipped under **renamed** packages `Optimizely.Graph.Cms` + `Optimizely.Graph.Cms.Query` 13.0.2 |
| `Advanced.CMS.AdvancedReviews` | ✅ 2.0.0 ships for CMS 13 |
| `Geta.NotFoundHandler.Optimizely` | ✅ **7.1.0 is native CMS 13** (uses `IApplicationRepository`). *Historical:* 6.0.0 installed but tripped the scanner and needed assembly exclusion **and** stale-DB-job cleanup (see [[post-upgrade-gotchas|Post-Upgrade Gotchas]]) — that advice applies only if you are stuck on 6.0.0 |
| `Geta.Optimizely.Sitemaps` | ✅ **4.0.0** (net10, CMS 13.1.0). Drops the `EnableLanguageDropDownInAdmin` option — remove it from your `AddSitemaps(...)` call. Still uses the `SiteDefinition` shim internally, so multi-site host resolution inherits that shim's behaviour |
| `Geta.Optimizely.ContentTypeIcons` | ✅ 4.1.0 |
| `Addon.Episerver.EnvironmentSynchronizer` | ✅ 2.0.1 |

*Rows for NotFoundHandler, Sitemaps, ContentTypeIcons and EnvironmentSynchronizer updated from VHB spike VHBK-499, 2026-11-05 (spike/cms13 commit 13ed447, CMS 13.5.1 / Forms 6.0.2 package metadata).*
| Anything built against Search & Navigation (Find) | ❌ Find is fully removed — no compatibility path |

Always check each package's release notes, but don't assume the GA-era "incompatible" list still holds.

## Sources

- [Breaking Changes in CMS 13 (Official Docs)](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/breaking-changes-in-cms-13)
- [CMS 13 UI, Editors, and Shell Breaking Changes](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/ui-editors-and-shell-breaking-changes)
- [CMS 13 GA Release Notes](https://support.optimizely.com/hc/en-us/articles/44734633809037) *(Apr 2026)*
