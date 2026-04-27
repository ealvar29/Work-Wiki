---
title: "CMS 12 → 13 Migration: Real-World Walkthrough"
tags:
  - optimizely
  - cms
  - migration
  - graph
  - search
---

# CMS 12 → 13 Migration: Real-World Walkthrough

A case study of migrating a search-heavy CMS 12 solution to CMS 13 on .NET 10, including the full Find → Graph rewrite. The high-level strategy is in [[upgrading-from-cms12|Upgrading from CMS 12]]; this page focuses on the patterns and pitfalls encountered in a real project.

## Migration Phases

| Phase | Focus |
|---|---|
| 1. Audit | Map NuGet deps, Find usage, ServiceLocator hotspots, third-party add-ons |
| 2. Packages | Retarget `net10.0`, resolve NU1202/NU1608, restore transitive deps |
| 3. Compile | Fix DI, routing, metadata extenders, scheduled jobs |
| 4. Find → Graph | Shared query builder, migrate search entry points, validate order/paging |
| 5. Stabilize | Admin URLs, applications model, content area rendering, load testing |

## NuGet Upgrade Pitfalls

Two error codes appear repeatedly during the package upgrade:

- **NU1202** — package incompatible with `net10.0`. Either upgrade it or replace it entirely.
- **NU1608** — mismatched EPiServer/Optimizely package versions. All CMS packages must target the same CMS 13 minor version.

Third-party packages that commonly need attention: `Geta.NotFoundHandler`, `Geta.Optimizely.*` extensions, and any package built against Search & Navigation. If a package has no CMS 13 release, check whether the feature can be replaced by a native CMS 13 equivalent.

When `Newtonsoft.Json` disappears as a transitive dependency (CMS 13 switches to `System.Text.Json`), add it explicitly if you still need it.

## API Changes in Practice

These are the common substitutions beyond what's in [[breaking-changes|Breaking Changes]]:

| CMS 12 | CMS 13 |
|---|---|
| `IPageRouteHelper` | `IContentRouteHelper` |
| `.PageLink` | `.ContentLink` |
| `ServiceLocator.Current.GetInstance<T>()` | Constructor injection / `GetRequiredService<T>()` |
| `[Searchable(false)]` | `[IndexingType(IndexingType.Disabled)]` |
| `SaveAction.Non` | `SaveAction.Default` |
| `IMetadataExtender.ModifyMetadata()` | `ModifyMetadataAsync()` (async signature) |
| `ContentArea.FilteredItems` | `ContentArea.Items` |

**ServiceLocator:** Replace with constructor injection where possible. For edge cases (static helpers, legacy initializers), use `GetRequiredService<T>()` so missing registrations fail fast rather than returning null at runtime.

**Startup registration order matters:**

```csharp
services
    .AddCms()
    .AddContentGraph()      // must precede ContentManager
    .AddContentManager();
```

Enable Graph in the DXP portal before adding the Graph NuGet packages — the portal-side toggle must be on first.

## Find → Graph: Side-by-Side

### Legacy Find Pattern

```csharp
var query = _findClient.Search<SeoPageData>();
if (!string.IsNullOrWhiteSpace(term))
    query = query.For(term);

query = query.Filter(x => !x.ExcludeFromSearch);
var result = query.Skip((page - 1) * pageSize).Take(pageSize).GetResult();
```

### Graph Equivalent

```csharp
var q = _graphContentClient
    .QueryContent<SeoPageData>()
    .AsCurrentUser()
    .SetLocale(CultureInfo.CurrentCulture)
    .WithDisplayFilters()
    .WithCacheOptions(o => o.AbsoluteExpiration = TimeSpan.FromMinutes(5));

if (!string.IsNullOrWhiteSpace(term) && q is ISearchableContentQuery<SeoPageData> searchable)
    q = searchable.SearchFor(term).WithPinned();

q = q.Where(x => x.ExcludeFromSearch != true);
var result = await q.IncludeTotal().Skip(skip).Limit(pageSize).GetAsContentAsync(ct);
```

Key differences:
- `For()` → `SearchFor()` (only available when cast to `ISearchableContentQuery<T>`)
- `Take()` → `Limit()`
- `GetResult()` → `await GetAsContentAsync(ct)`
- Add `.WithDisplayFilters()` to respect content visibility rules
- Add `.WithPinned()` to keep pinned results at the top during text search

## Shared Query Builder Pattern

The biggest win from this migration: a single composed query reused by search, listing pages, and autocomplete. This prevents the three features from diverging in filtering logic over time.

```csharp
public async Task<SearchResponse> SearchAsync(SearchRequest request, CancellationToken ct)
{
    var q = _graphContentClient
        .QueryContent<SeoPageData>()
        .AsCurrentUser()
        .SetLocale(CultureInfo.CurrentCulture)
        .WithDisplayFilters()
        .WithCacheOptions(o => o.AbsoluteExpiration = TimeSpan.FromMinutes(5));

    if (!string.IsNullOrWhiteSpace(request.Term) && q is ISearchableContentQuery<SeoPageData> searchable)
        q = searchable.SearchFor(request.Term).WithPinned();

    q = q.Where(x => x.ExcludeFromSearch != true);

    var skip = (Math.Max(request.Page, 1) - 1) * request.PageSize;
    var result = await q.IncludeTotal().Skip(skip).Limit(request.PageSize).GetAsContentAsync(ct);

    return new SearchResponse
    {
        Total = result.Total ?? 0,
        Items = result.Select(MapSearchHit).ToList()
    };
}
```

Autocomplete reuses the same composed `q` with a small limit — no separate query path:

```csharp
var promptResult = await q.IncludeTotal().Skip(0).Limit(5).GetAsContentAsync(ct);
```

## Common Pitfalls

| Symptom | Cause |
|---|---|
| NU1202 build errors | Third-party package not yet .NET 10 compatible — upgrade or replace |
| NU1608 build errors | EPiServer/Optimizely packages on mismatched CMS 13 versions |
| Admin UI "No policy found" | Removed package left a dangling `MenuProvider` or authorization policy |
| Sort order differs from Find | Graph relevance ranking diverges from Find — apply in-memory sort where order is critical |
| Content area rendering broken | `FilteredItems` → `Items` semantic change — test rendering for all content types |
| Graph queries return nothing | Graph Full Synchronization job hasn't run after content copy |

**The real time sink:** managing third-party packages and removing obsolete APIs. The Graph API syntax itself is straightforward; the friction is in the surrounding plumbing.

## Sources

- [Sanjay Katiyar — Optimizely Migration from CMS 12 to CMS 13](https://world.optimizely.com/blogs/sanjay-katiyar/dates/2026/4/optimizely-migration-from-cms-12-to-cms-13/) *(Apr 2026)*
