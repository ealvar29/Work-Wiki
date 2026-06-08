---
title: Breaking Changes in CMS 13
tags:
  - optimizely
  - cms
  - migration
  - breaking-changes
---

# Breaking Changes in CMS 13

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

## 3. SiteDefinition → Applications

| Removed | Replacement |
|---|---|
| `SiteDefinition.Current` | `ISiteDefinitionResolver.GetByHostname()` |
| `ISiteDefinitionRepository` | `IApplicationRepository` |
| GUID-based `Id` | Immutable `Name` string |

> **Verified against CMS 13.0.2 (OxyChem upgrade, May 2026):** `IApplicationResolver` does not exist in this version. Inject `IHttpContextAccessor` + `ISiteDefinitionResolver` and call:
> ```csharp
> var host = _httpContextAccessor.HttpContext?.Request.Host.Host;
> var site = _siteDefinitionResolver.GetByHostname(host, fallbackToWildcard: true, out _);
> ```
> If official docs reference `IApplicationResolver.GetByContextAsync()`, verify it exists in your specific CMS 13 version before using it.

See [[applications-model|Applications Model]] for full details.

## 4. Search & Navigation Removed

Optimizely Search & Navigation (Find) is **fully deprecated** — there is no support path in CMS 13. You must migrate to Optimizely Graph or a third-party search provider before upgrading.

See [[search-to-graph|Search & Navigation → Graph Migration]] for the migration path.

## 5. Plugin Manager Removed

The Plugin Manager UI and backend are gone entirely. Scheduled jobs no longer use the `EPiServer.PlugIn` system:

| Removed | Replacement |
|---|---|
| `[ScheduledPlugIn]` | `[ScheduledJob]` from `EPiServer.Scheduler` |
| Plugin Manager UI | Admin area no longer has this section |

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

## 11. Menu System

Removed: `MenuAssembler`, `MenuItem.Render()`, `ShellMenuProvider`, `SettingsMenuProvider`, `MenuBuilder`

Replacement: implement `IMenuProvider` or `IAsyncMenuProvider`

## 12. Visitor Groups Registration

```csharp
// CMS 12
services.AddVisitorGroups();

// CMS 13
services.AddVisitorGroupsMvc().AddVisitorGroupsUI();
// Package: EPiServer.Cms.UI.VisitorGroups
```

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
| `Geta.NotFoundHandler.Optimizely` 6.0.0 | ⚠️ Installs, but still trips the scanner — needs assembly exclusion **and** stale-DB-job cleanup (see [[post-upgrade-gotchas|Post-Upgrade Gotchas]]) |
| `Geta.Optimizely.Sitemaps`, `Geta.Optimizely.ContentTypeIcons` (service reg), `Addon.Episerver.EnvironmentSynchronizer` | ❌ No CMS 13 release yet |
| Anything built against Search & Navigation (Find) | ❌ Find is fully removed — no compatibility path |

Always check each package's release notes, but don't assume the GA-era "incompatible" list still holds.

## Sources

- [Breaking Changes in CMS 13 (Official Docs)](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/breaking-changes-in-cms-13)
- [CMS 13 UI, Editors, and Shell Breaking Changes](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/ui-editors-and-shell-breaking-changes)
- [CMS 13 GA Release Notes](https://support.optimizely.com/hc/en-us/articles/44734633809037) *(Apr 2026)*
