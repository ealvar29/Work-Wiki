---
title: "CMS 12 → 13 Code Migration Cheatsheet"
tags:
  - optimizely
  - cms
  - upgrade
  - cheatsheet
---

Before/after patterns for every common swap. No prose — copy and adapt.

---

## Content References

```csharp
// BEFORE
PageReference pageRef = content.ContentLink as PageReference;
PageReference.StartPage

// AFTER
ContentReference contentRef = content.ContentLink;
ContentReference.StartPage
```

---

## Content Type Repository

```csharp
// BEFORE
IContentTypeRepository<PageData> _repo

// AFTER
IContentTypeRepository _repo  // no generic parameter
```

---

## Service Locator

```csharp
// BEFORE
ServiceLocator.Current.GetInstance<IContentRepository>()

// AFTER
// Inject via constructor — ServiceLocator.Current is removed
public class MyService(IContentRepository contentRepository) { }
```

---

## Validators

```csharp
// BEFORE — auto-discovered
public class MyValidator : IValidate<MyPage>
{
    public IEnumerable<ValidationError> Validate(MyPage instance) { ... }
}

// AFTER — must register explicitly
services.AddCmsValidator<MyPage, MyValidator>();
```

---

## Search & Navigation → Graph

```csharp
// BEFORE — EPiServer.Find fluent API
_client.Search<PageData>()
       .Filter(x => x.Name.Match("test"))
       .GetResult();

// AFTER — Graph C# SDK (IGraphContentClient)
var result = await _graphClient.Content()
    .OfType<PageData>()
    .Where(x => x.Name == "test")
    .GetResultAsync();
```

```csharp
// BEFORE — NuGet
EPiServer.Find
EPiServer.Find.Cms

// AFTER — NuGet
Optimizely.Graph.Client
```

---

## Navigation Menu

```razor
@* BEFORE *@
@Html.CreatePlatformNavigationMenu()

@* AFTER *@
<platform-navigation />
```

---

## Startup Registration Order

```csharp
// BEFORE — order didn't matter
app.UseRouting();
app.MapRazorPages();
app.MapContent();

// AFTER — MapContent() MUST come before MapRazorPages()
app.UseRouting();
app.MapContent();       // ← first
app.MapRazorPages();    // ← second (CMS-51344)
```

---

## URL Resolver

```csharp
// BEFORE
UrlResolver.Current.GetUrl(contentLink)

// AFTER — inject IUrlResolver
public class MyService(IUrlResolver urlResolver) { }
_urlResolver.GetUrl(contentLink)
```

---

## Site Definition

```csharp
// BEFORE
SiteDefinition.Current.StartPage

// AFTER — Applications model
// Configure in appsettings.json or via IApplicationDefinitionRepository
// SiteDefinition still exists but SiteDefinitionRepository is replaced
```

---

## NuGet Package Renames

| CMS 12 Package | CMS 13 Package |
|---|---|
| `EPiServer.CMS.UI` | `Optimizely.Cms.UI` |
| `EPiServer.CMS.AspNetCore` | `Optimizely.Cms.AspNetCore` |
| `EPiServer.Find` | `Optimizely.Graph.Client` |
| `EPiServer.Find.Cms` | `Optimizely.Graph.Cms` |
| `EPiServer.Forms` | `Optimizely.Forms` *(CMS 13 version pending)* |
| `EPiServer.ContentGraph.Cms` | `Optimizely.ContentGraph.Cms` |
| `Sustainsys.Saml2.AspNetCore2` | `Sustainsys.Saml2.AspNetCore` |

---

## Namespace Changes

| Old Namespace | New Namespace |
|---|---|
| `EPiServer.Find.*` | `Optimizely.Search.*` |
| `EPiServer.ContentGraph.*` | `Optimizely.ContentGraph.*` |
| `EPiServer.Framework.Cache` | `Optimizely.Caching` *(verify per package)* |

---

## Startup Configuration

```csharp
// BEFORE
services.AddCms()
        .AddFind();

// AFTER
services.AddCms()
        .AddGraph();           // replaces Find
        .AddVisualBuilder();   // if using Visual Builder
```

---

## IFirstRequestInitializer

```csharp
// BEFORE — still exists in some CMS 12 modules
public class MyInit : IFirstRequestInitializer
{
    public void Initialize(HttpContext context) { ... }
}

// AFTER — removed in CMS 13, use IHostedService or startup middleware
public class MyInit(IHostApplicationLifetime lifetime) : IHostedService
{
    public Task StartAsync(CancellationToken ct) { ... }
    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
```

---

## Sources

- [Optimizely CMS 13 Breaking Changes](https://docs.developers.optimizely.com/content-management-system/changelog) — official changelog
- [[breaking-changes|Breaking Changes Catalog]] — full wiki reference
- [[upgrading-from-cms12|Upgrading from CMS 12]] — full upgrade guide
