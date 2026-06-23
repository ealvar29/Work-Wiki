---
title: CMS 13 Upgrade Checklist
tags:
  - optimizely
  - cms
  - migration
  - checklist
---

A consolidated checklist synthesized from the official docs, Robert Svallin's upgrade guides, and community reports. Work through these in order — the sequence matters.

## Pre-flight

- [ ] **Upgrade to the latest CMS 12 release first** — upgrading from older CMS 12 versions causes a database migration error (`Column 'Failed' in table 'dbo.tblNotificationMessage' is specified more than once`)
- [ ] **Audit Search & Navigation usage** — S&N is removed in CMS 13; plan your Graph migration before starting
- [ ] **Check Commerce version** — CMS 13 is incompatible with Commerce 14; wait for Commerce 15
- [ ] **Check third-party packages** — Forms, Geta, and others may need updates; verify CMS 13 support for each

## Step 1 — Retarget to .NET 10

Update `global.json`:
```json
{
  "sdk": {
    "version": "10.0.102",
    "rollForward": "latestMinor"
  }
}
```

Update `.csproj`:
```xml
<TargetFramework>net10.0</TargetFramework>
```

Fix any compile errors at this stage before touching CMS packages. Third-party packages that don't support .NET 10 need to be resolved now.

## Step 2 — Upgrade NuGet Packages

```
EPiServer.CMS → 13.x
EPiServer.CMS.UI → 13.x
EPiServer.CMS.AspNetCore → 13.x
EPiServer.CMS.UI.AspNetIdentity → 13.x
```

Upgrade `EPiServer.CMS` and `EPiServer.CMS.UI.AspNetIdentity` simultaneously — dependency conflicts occur if they are out of sync.

Also bump `Microsoft.EntityFrameworkCore` and `Microsoft.EntityFrameworkCore.SqlServer` to `10.0.x`.

## Step 3 — Add Required Configuration

**Database compatibility:**
```csharp
services.Configure<DataAccessOptions>(options =>
{
    options.UpdateDatabaseCompatibilityLevel = true;
});
```

**Optimizely Graph (mandatory)** in `appsettings.json`:
```json
"Optimizely": {
  "ContentGraph": {
    "GatewayAddress": "https://cg.optimizely.com",
    "SingleKey": "YOUR_SINGLE_KEY",
    "AppKey": "YOUR_APP_KEY",
    "Secret": "YOUR_SECRET"
  }
}
```

**Register Graph and Content Manager** (order matters):
```csharp
services.AddContentGraph();      // Must come before AddContentManager
services.AddContentManager();
```

## Step 4 — Fix API Replacements

| Old | New |
|---|---|
| `PageReference` | `ContentReference` |
| `.PageLink` | `.ContentLink` |
| `SiteDefinition.Current` | `await applicationResolver.GetByContextAsync(ct)` |
| `ISiteDefinitionRepository` | `IApplicationRepository` |
| `IContentTypeRepository<PageType>` | `IContentTypeRepository` (no generic) |
| `context.Locate.Advanced.GetInstance<T>()` | Constructor DI / `serviceProvider.GetRequiredService<T>()` |
| `services.AddVisitorGroups()` | `services.AddVisitorGroupsMvc().AddVisitorGroupsUI()` |

## Step 5 — Fix Navigation Shell

Old (CMS 12):
```csharp
@Html.CreatePlatformNavigationMenu()
<div @Html.ApplyPlatformNavigation()>@RenderBody()</div>
```

New (CMS 13):
```html
<platform-navigation />
<platform-navigation-wrapper>
    @RenderBody()
</platform-navigation-wrapper>
```

Add to `_ViewImports.cshtml`:
```html
@addTagHelper *, EPiServer.Shell.UI
```

## Step 6 — Fix Scheduled Jobs

```csharp
// Remove this
[ScheduledPlugIn]

// Use this instead
[ScheduledJob]  // from EPiServer.Scheduler
```

## Step 7 — Fix ContentArea

Replace `ContentArea.FilteredItems` usage:
- Use `Items` for all items
- Use `IEnumerable<IContentAreaItemsRenderingFilter>` for programmatic filtering

## Step 8 — Fix Property Deletion (if applicable)

```csharp
// Old pattern (throws InvalidOperationException in CMS 13)
repository.Delete(property);

// New pattern
var writableType = type.CreateWritableClone();
writableType.PropertyDefinitions.Remove(writableProperty);
contentTypeRepository.Save(writableType);
```

## Step 9 — Setup Application in Admin UI

After your first successful startup:
1. Navigate to `/Optimizely/CMS`
2. Go to **Settings → Applications**
3. Delete the default "Headless" application
4. Create a new **In Process** application
5. Select your start page as routing entry point
6. Add your hostname and mark as default

## Step 10 — Optional: Re-enable On-Page Editing

If editors need OPE during the transition period:
```csharp
services.Configure<CmsFeatureOptions>(options =>
{
    options.OnPageEditing = true;
});
```

## DXP Cloud Migration Path

For DXP-hosted projects, the recommended approach to minimise downtime is **Project Migration** (not in-place deployment), because the Graph schema changes are breaking between CMS 12 and CMS 13:

1. Submit support ticket requesting "Project Migration for CMS 13"
2. A "Project Migration" tab appears in the Developer Portal
3. Deploy updated packages to the new CMS 13 environment
4. Run **Optimizely Graph Full Synchronization** job after content copy
5. Activate maintenance mode on source → click **Go Live**

Source project is retained for 14 days after migration.

## What You Gain

- **.NET 10 performance** — faster cold startup, better async throughput
- **Visual Builder** — modern drag-and-drop editing
- **Content Variations** — built-in A/B testing support
- **Graph SDK** — strongly-typed, async content queries
- **Opal AI** — content creation and translation automation
- **REST API v1** — production-stable, backward-compatible content management API

## Sources

- [Robert Svallin — From 12 to 13: A Developer's Upgrade Guide](https://world.optimizely.com/blogs/robert-svallin/dates/2026/1/from-12-to-13-a-developers-guide-to-upgrading-an-optimizely-cms-alloy-site/) *(Jan 2026)*
- [Robert Svallin — CMS 13 Preview 4: Upgrading from Preview 3](https://world.optimizely.com/blogs/robert-svallin/dates/2026/3/cms-13-preview-4--upgrading-from-preview-3/) *(Mar 2026)*
- [Gosso — Technical Q&A for CMS 13](https://www.optimizely.blog/2026/03/technical-qa-for-cms-13/) *(Mar 2026)*
- [CMS 13 GA Release Notes](https://support.optimizely.com/hc/en-us/articles/44734633809037) *(Apr 2026)*
- [Official Docs — Migrate from CMS 12 to CMS 13 with Graph](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/project-migration-for-cms-12-with-optimizely-graph)
