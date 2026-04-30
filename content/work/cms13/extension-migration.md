---
title: "Migrating a CMS Extension from CMS 12 to CMS 13"
tags:
  - optimizely
  - cms
  - upgrade
  - extensions
  - dotnet
---

# Migrating a CMS Extension from CMS 12 to CMS 13

Upgrading a reusable CMS package or add-on to CMS 13 follows a different checklist than upgrading a site. Extension authors need to handle framework targeting, removed generics, admin UI changes, and the new shell tag helper.

## Target Framework

Update `<TargetFramework>` in your `.csproj` to `net10.0`:

```xml
<TargetFramework>net10.0</TargetFramework>
```

Update `global.json` if your repo pins the SDK:

```json
{
  "sdk": {
    "version": "10.0.102",
    "rollForward": "latestMinor"
  }
}
```

## NuGet Package Updates

| Package | CMS 12 | CMS 13 |
|---|---|---|
| `EPiServer.CMS.UI.Core` | 12.x | 13.0.0+ |
| `EPiServer.CMS` | 12.x | 13.0.0+ |
| `EPiServer.Framework` | 12.x | 13.0.0+ |
| `Microsoft.EntityFrameworkCore` | 8.0.x | 10.0.x |
| `Microsoft.EntityFrameworkCore.SqlServer` | 8.0.x | 10.0.x |

## API Changes

### PageReference → ContentReference

`PageReference` is obsolete. Replace throughout:

```csharp
// Before
PageReference startPage = ContentReference.StartPage as PageReference;

// After
ContentReference startPage = ContentReference.StartPage;
```

`PageData.PageLink` becomes `PageData.ContentLink`:

```csharp
// Before
var link = page.PageLink;

// After
var link = page.ContentLink;
```

### IContentTypeRepository — Remove Generic Parameter

```csharp
// Before
private readonly IContentTypeRepository<PageType> _repo;

// After
private readonly IContentTypeRepository _repo;
```

### Service Location → Constructor Injection

```csharp
// Before
var service = context.Locate.Advanced.GetInstance<IMyService>();

// After
public class MyClass
{
    private readonly IMyService _service;
    public MyClass(IMyService service) => _service = service;
}
```

## Admin Layout Changes

### Shell Tag Helper

The `@Html.CreatePlatformNavigationMenu()` helper is gone. Use the `<platform-navigation />` tag helper instead.

Add the tag helper declaration to your `_ViewImports.cshtml` or layout:

```razor
@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers
@addTagHelper *, EPiServer.Shell.UI
```

Then replace the old call in your layout:

```razor
<!-- Before -->
@Html.CreatePlatformNavigationMenu()

<!-- After -->
<platform-navigation />
```

The navigation bar is now fixed-position. Add padding to prevent content from hiding beneath it:

```css
html, body {
    overflow: auto !important;
    height: auto !important;
}

.your-content-wrapper {
    padding-top: 56px;
}
```

## Startup Configuration

### Required Service Registrations

```csharp
services.AddCmsAspNetIdentity<ApplicationUser>()
    .AddCms()
    .AddAdminUserRegistration(x =>
        x.Behavior = RegisterAdminUserBehaviors.Enabled
                   | RegisterAdminUserBehaviors.LocalRequestsOnly)
    .AddVisitorGroups()
    .AddEmbeddedLocalization<Startup>();

services.Configure<DataAccessOptions>(options =>
{
    options.UpdateDatabaseCompatibilityLevel = true;
});
```

### Blazor Components in a Library Project

If your extension ships Blazor components, add this to the `.csproj`:

```xml
<PropertyGroup>
    <RequiresAspNetWebAssets>true</RequiresAspNetWebAssets>
</PropertyGroup>
```

## Application Model

Extensions that previously read `SiteDefinition.Current.RootPage` should switch to `IApplicationResolver`:

```csharp
public class MyService
{
    private readonly IApplicationResolver _appResolver;
    public MyService(IApplicationResolver appResolver)
        => _appResolver = appResolver;
}
```

Or use `ContentReference.RootPage` for simple cases.

## What Doesn't Change

- Entity Framework models
- MVC controllers and views
- Blazor component logic
- `module.config` format
- Authorization policies

## Sources

- [Migrating an Optimizely CMS Extension from CMS 12 to CMS 13 — allthingsopti (OMVP), world.optimizely.com, Jan 2026](https://world.optimizely.com/blogs/allthingsopti/dates/2026/1/a-day-in-the-life-of-an-optimizely-omvp-migrating-an-optimizely-cms-extension-from-cms-12-to-cms-13-a-developers-guide/)
