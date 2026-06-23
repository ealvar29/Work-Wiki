---
title: Optimizely Graph C# SDK
tags:
  - optimizely
  - cms
  - graph
  - search
  - csharp
---

The Graph C# SDK (`Optimizely.Graph.Cms.Query`) is the replacement for Search & Navigation's fluent query API. It's async-first, strongly-typed, and significantly more capable.

> **Field-verified (OxyChem CMS 13.0.2 upgrade, June 2026).** The CMS 13 Graph packages and the exact wiring below were confirmed live in production code. This supersedes earlier guidance that the Graph SDK had no CMS 13 build — that was true only of the *old* package name (see below).

## Package Names — the CMS 13 packages were renamed

This is the single most common trap. The CMS 12 Graph package and the CMS 13 Graph package have **different names**:

| Era | Package | Notes |
|---|---|---|
| CMS 12 | `Optimizely.ContentGraph.Cms` | Latest 4.4.0 transitively pulls `EPiServer.ContentDeliveryApi.Core 3.12.5` (a CMS 12 package referencing the removed `ISynchronizedObjectInstanceCache`) → crashes CMS 13 startup. **Do not use on CMS 13.** |
| CMS 13 | `Optimizely.Graph.Cms` **+** `Optimizely.Graph.Cms.Query` | The real CMS 13 build. Both at 13.0.2. |

If a blog or doc tells you "the Graph SDK isn't CMS 13-ready," it's referring to the old `Optimizely.ContentGraph.Cms` name. The renamed packages are ready.

## Setup — two DI registrations are required

```csharp
services.AddContentGraph();        // indexing / sync side (Optimizely.Graph.DependencyInjection)
services.AddGraphContentClient();  // query client IGraphContentClient
```

> **Gotcha (cost us a 500 to find):** `AddContentGraph()` only wires the indexing/sync side. The query client `IGraphContentClient` is registered **separately** by `AddGraphContentClient()`, which is declared in namespace **`Optimizely.Cms.DependencyInjection`** — *not* the `Optimizely.Graph.Cms.Query.DependencyInjection` you'd expect. Miss it and every search request 500s with:
> ```
> Unable to resolve service for type 'Optimizely.Graph.Cms.Query.IGraphContentClient'
> while attempting to activate ContentGraphSearchService
> ```

```csharp
public class SearchController : Controller
{
    private readonly IGraphContentClient _graphClient;

    public SearchController(IGraphContentClient graphClient)
    {
        _graphClient = graphClient;
    }
}
```

> **Operational step — don't forget the re-index.** Each environment has its own Graph index keyed by a per-environment AppKey/SingleKey in `appsettings`. A fresh CMS 13 index is **empty** until you run the **"Content Graph Full Re-index"** scheduled job (Admin → Scheduled Jobs) against that environment's database. Re-indexing prod does not populate dev, and vice-versa. (CMS 13 Graph answers the `_Content` root field; a CMS-12-era index answers `Content` — pointing a CMS 13 app at an un-reindexed CMS 12 index errors `Cannot query field "_Content"`.)

```csharp
public class SearchController : Controller
{
    private readonly IGraphContentClient _graphClient;

    public SearchController(IGraphContentClient graphClient)
    {
        _graphClient = graphClient;
    }
}
```

## Three Query Entry Points

| Method | Use Case |
|---|---|
| `QueryContent<T>()` | CMS content — T must implement `IContentData` |
| `Query<T>()` | Any POCO class |
| `Query("TypeName")` | Dynamic / untyped |

## Filtering

Standard C# operators work directly:

```csharp
.Where(x => x.Category == "Dessert")
.Where(x => x.Rating > 4)
.Where(x => x.Category == "Dessert" && x.Rating > 4)
```

String-specific methods:

```csharp
.Where(x => x.Author.Match("Jane Doe"))         // exact match
.Where(x => x.Title.Like("%chocolate%"))         // wildcard
.Where(x => x.Title.Contains("chocolate"))       // substring
.Where(x => x.Category.In(new[] { "A", "B" }))  // set membership
.Where(x => x.Author.Exists())                   // field has value
.Where(x => x.Author.Exists(false))              // field is null
```

Range filters:

```csharp
.Where(x => x.CookingTime.InRange(15, 45))
.Where(x => x.Rating.GreaterThan(3))
.Where(x => x.PublishDate.InRange(startDate, endDate))
```

## Dynamic Filter Builder

Build filters conditionally without losing type safety:

```csharp
var filter = _graphClient.BuildFilter<Recipe>();

if (!string.IsNullOrEmpty(selectedCategory))
    filter = filter.And(x => x.Category.Match(selectedCategory));

if (minRating.HasValue)
    filter = filter.And(x => x.Rating.GreaterThanOrEqual(minRating.Value));

var result = await _graphClient
    .QueryContent<Recipe>()
    .Filter(filter)
    .GetAsync();
```

## Full-Text Search

```csharp
// All fields
.SearchFor("chocolate cake")
.UsingFullText(highlightTag: "<mark>", boost: 2)

// Field-targeted with individual boosts
.SearchFor("chocolate cake")
.UsingField(x => x.Title, boost: 3, highlightTag: "<strong>")
.UsingField(x => x.Summary, boost: 2)
.UsingField(x => x.Body, boost: 1)
```

## Sorting and Pagination

```csharp
.OrderBy(x => x.PublishDate, OrderDirection.Descending)
.ThenBy(x => x.Title, OrderDirection.Ascending)
.OrderBy("_ranking", RankingMode.Relevance)

.Skip(20).Limit(10).IncludeTotal()
```

## Execution Methods

```csharp
// Returns typed POCO results
var result = await _graphClient.Query<Recipe>().GetAsync();

// Returns fully resolved IContent objects
var content = await _graphClient.QueryContent<Recipe>().GetAsContentAsync();

// WARNING: Do NOT combine .Fields() with .GetAsContentAsync() — throws InvalidOperationException
```

> **Field note (verified OxyChem June 2026):** for the `QueryContent<T>()` / `IContentQuery<T>` path, the execution method is **`GetAsContentAsync(ct)`**, exposed via the `IGetAsContentAsync<T>` interface — there is no `GetAsync()` on that path (`GetAsync()` lives on the concrete `ContentQuery<T>` / POCO path). The result is `IGetAsContentResult<T>`, which **is** `IEnumerable<T>` — iterate it directly, there is **no `.Items` property**. `IGraphContentClient.QueryContent<T>()` returns `ISearchableContentQuery<T>`.

## Streaming with IAsyncEnumerable

```csharp
await foreach (var page in _graphClient
    .QueryContent<ArticlePage>()
    .OrderBy(x => x.PublishDate, OrderDirection.Descending)
    .GetAsyncEnumerable<ArticlePage>(pageSize: 50))
{
    foreach (var item in page.Items) { /* process */ }
}
```

## Faceting

```csharp
.Facet(x => x.Category, limit: 10, orderType: OrderType.COUNT, direction: OrderDirection.Descending)

// Range facets
.Facet(x => x.CookingTime, ranges: new[]
{
    new RangeFacetInput<int> { From = 0, To = 15 },
    new RangeFacetInput<int> { From = 15, To = 30 }
})

// Boolean facets (new in CMS 13)
.Facet(x => x.IsFeatured)
```

Reading facet results:

```csharp
var authorFacets = result.Facets.GetFacet(x => x.Author);
foreach (var facet in authorFacets)
{
    string name = facet.Name;
    int count = facet.Count;
}
```

## Multi-Language and Variations

```csharp
.SetLocale("en", "sv")
.SetLocale(QueryLocale.All)

// Content Variations (A/B testing)
.SetVariation(includeOriginal: true, "WinterCampaign")
```

## Auth-Aware Queries

```csharp
// Auto-detects user from Thread.CurrentPrincipal, filters to published content
.WithDisplayFilters()
```

## Debug: Inspect Generated GraphQL

```csharp
string graphql = _graphClient
    .QueryContent<ArticlePage>()
    .SearchFor("chocolate")
    .ToGraphQL();
```

## Search & Navigation → Graph SDK Migration Map

| Feature | Search & Navigation | Graph SDK |
|---|---|---|
| Entry point | `Search<T>()` | `QueryContent<T>()` |
| Full-text | `.For("query")` | `.SearchFor("query")` |
| All fields | `.InAllField()` | `.UsingFullText()` |
| Filter equality | `.Filter(x => x.Match("v"))` | `.Where(x => x == "v")` |
| Filter range | `.Filter(x => x.InRange(a,b))` | `.Where(x => x.InRange(a,b))` |
| Sort desc | `.OrderByDescending(x => x.Date)` | `.OrderBy(x => x.Date, OrderDirection.Descending)` |
| Take | `.Take(10)` | `.Limit(10)` |
| Select/project | `.Select(x => new {})` | `.Fields<T>(x => x.Field)` |
| Execute sync | `.GetResult()` | N/A — async only |
| Execute async | `.GetResultAsync()` | `.GetAsync()` |
| Wildcard | `.MatchWildcard("app*")` | `.Like("app%")` |

**Note on naming:** `Contains`, `StartsWith`, `EndsWith` are renamed to `FilterContains`, `FilterStartsWith`, `FilterEndsWith` in the Graph SDK to avoid conflicts with LINQ.

## Sources

- [Jake Minard — Introducing the Optimizely CMS 13 Graph SDK](https://world.optimizely.com/blogs/jake-minard/dates/2026/3/introducing-optimizely-cms-13-graph-sdk/) *(Mar 2026)*
