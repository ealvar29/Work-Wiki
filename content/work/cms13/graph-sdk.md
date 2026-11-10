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
>
> *Job name unconfirmed:* the wiki also calls this job **"Full Synchronization"** (see [[graph-vs-search-navigation|Graph vs Search & Navigation]]). Check the actual label in CMS admin → Scheduled Jobs.

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

### Log the GraphQL that actually goes over the wire

`ToGraphQL()` shows what the SDK *would* send. To log what *was* sent (query plus variables, ready to paste into GraphiQL), attach a `DelegatingHandler` to the SDK's named `HttpClient`:

```csharp
services.AddTransient<GraphClientLoggerDelegatingHandler>();

services.Configure<HttpClientFactoryOptions>(
    "Optimizely.Graph.Core.Client.Authenticated",
    options => options.HttpMessageHandlerBuilderActions.Add(builder =>
        builder.AdditionalHandlers.Add(
            builder.Services.GetRequiredService<GraphClientLoggerDelegatingHandler>())));
```

The handler parses `request.Content` into a `JsonNode` and logs `jsonNode["query"]` and `jsonNode["variables"]` at `Information`. Full handler code is in the source post. *Per Johan Kronberg, 2026-11-06; the client name `Optimizely.Graph.Core.Client.Authenticated` is taken from that post and is not verified here.*

## Computed Fields

### Async computed fields work in queries, via `.Result`

Computed fields (typically C# default interface methods that take an `IServiceProvider` and a `CancellationToken`) can be `async`. In an `IGraphContentClient` query you call them with `.Result`:

```csharp
search = search.Where(x => x.SearchApplicationName().Result.In(applicationNames));
```

> The expression is **only parsed and translated to GraphQL, never executed**, so `.Result` does not block anything. Roslyn analyzers will still flag it (`VSTHRD002`, `MA0045`, `MA0032`), so wrap the line in `#pragma warning disable` / `restore`. *Per Johan Kronberg, 2026-11-09.*

### Built-in `PageData.Category` is not queryable by default

On CMS 13 PaaS the built-in category list is **not** exposed in the generated Graph schema, so a CMS 12 site that filtered by category through Search & Navigation has nothing to filter on after the move. Observed in Graph 13.3.0 → 13.5.0 by Mardy Abdelkareem (2026-11-10):

| Attempt | Result |
|---|---|
| Register the internal `CategoriesBaseTypeMapper` via reflection | Names appear in the indexed JSON under `_metadata.categories`, but GraphQL cannot query them: the field is not in the schema |
| Add the field to `ContentMetadata` through the Graph Content API | Queryable, but **lost after the next full synchronization** |
| Computed fields registered through `GraphConventionOptions` / `GraphComputedFieldDefinition` | Works (this is the Optimizely Support workaround) |

The open-source package `Mardy.Optimizely.Graph.Categories` **1.0.0** automates the third option:

```csharp
services.AddContentGraph();
services.AddPageCategoriesToGraph();
```

It adds `LegacyCategoryIds` and `LegacyCategoryNames` (both `IndexingType.Queryable`) to every concrete page type. Run **Optimizely Graph Full Synchronization** (Settings → Scheduled Jobs) after deploying.

```csharp
.QueryContent<StandardPage>()
.Where(x => x.LegacyCategoryNames(default!).ContainsAny("Track"))
```

Limits to know before adopting it:

- Not available on `_Page`, so you cannot filter across all page types in one query
- Uses the category **Name**, not the Display Name
- Rename or delete of a category needs a **full** sync; delta sync did not refresh it
- IDs differ per database; parent categories are not expanded to children

*Verified against the author's post 2026-11-10 (tested on CMS/Graph 13.4.0 and 13.5.0). Re-check whether a later 13.x exposes categories natively:*

```bash
curl -s "https://nuget.optimizely.com/feed/packages.svc/FindPackagesById()?id='Mardy.Optimizely.Graph.Categories'" \
  | grep -oE '<d:Version[^>]*>[^<]+' | tail -5
```

## Editor Search Changes in CMS 13.5.1

The official 13.5.1 release note lists one fix (CMS-57937, smooth rebuild failures for languages that fall back but have no content). Assembly comparison by Tomas Hensrud Gulla found more, almost all in `Optimizely.Graph.Cms` and concerning **editor search backed by Graph**:

| Change | Detail |
|---|---|
| New setting | `Optimizely:ContentGraph:Search:IncludeExpiredContentInEditorSearch`, default `false`. When `true`, logged-in editors find expired content in CMS search and through the Graph proxy |
| Who counts as an editor | Decided by the scheme passed to `AddContentGraph(authenticationScheme)`. If it also logs in ordinary site users, they see expired content once the setting is on |
| Search providers | Each searches only its own types (`_Page`, `_Component`, `_Media`/`_Image`/`_Video`) in pages of 100, up to 5 pages, filtered in the CMS. Previously one shared `limit: 20` query against `_Content` |
| Search roots / trash | A search root that cannot be found returns nothing (not the whole site); trash search returns only deleted content; new `filterOnDeleted` parameter |
| `_metadata.path` | Now includes the root and wastebasket. **Run a full reindex after upgrading** so scoped and trash search work on existing content |

*Per Gulla's post, 2026-11-01; not independently verified.*

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
| Execute async | `.GetResultAsync()` | `.GetAsContentAsync()` on the `QueryContent<T>()` path (see field note above); `.GetAsync()` only on the `Query<T>()` POCO path |
| Wildcard | `.MatchWildcard("app*")` | `.Like("app%")` |

**Note on naming:** `Contains`, `StartsWith`, `EndsWith` are renamed to `FilterContains`, `FilterStartsWith`, `FilterEndsWith` in the Graph SDK to avoid conflicts with LINQ.

## Sources

- [Jake Minard — Introducing the Optimizely CMS 13 Graph SDK](https://world.optimizely.com/blogs/jake-minard/dates/2026/3/introducing-optimizely-cms-13-graph-sdk/) *(Mar 2026)*
- [Mardy Abdelkareem — Making Built-in CMS Categories Queryable in Optimizely Graph (CMS 13 PaaS)](https://world.optimizely.com/blogs/mardy-abdelkareem/dates/2026/11/making-built-in-cms-categories-queryable-in-optimizely-graph-cms-13-paas/) *(2026-11-10)*
- [Johan Kronberg — A note on using async computed fields with Optimizely Graph](https://krompaco.nu/2026/11/a-note-on-using-async-computed-fields-with-optimizely-graph/) *(2026-11-09)*
- [Johan Kronberg — Log your Optimizely Graph queries](https://krompaco.nu/2026/11/log-optimizely-graph-queries/) *(2026-11-06)*
- [Tomas Hensrud Gulla — What else changed in Optimizely CMS 13.5.1](https://www.gulla.net/en/blog/what-else-changed-in-optimizely-cms-13.5.1/) *(2026-11-01)*
