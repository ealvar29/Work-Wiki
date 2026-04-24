---
title: Search & Navigation → Graph Migration
tags:
  - optimizely
  - cms
  - graph
  - search
  - migration
---

# Search & Navigation → Graph Migration

Optimizely Search & Navigation (Find) is **fully removed in CMS 13**. There is no compatibility layer. Plan this migration before upgrading — don't start the CMS 13 upgrade with live S&N dependencies.

**Key advice from the community:** Implement Graph during your CMS 13 upgrade rather than before. Implementing it on CMS 12 first means migrating the schema twice — the Graph schema changed between CMS 12 and CMS 13.

## Why Graph is Mandatory

Optimizely Graph isn't just a search replacement — it powers:
- **Content Manager** — the new editorial browse/search UI
- **External Content** — indexing external data sources
- **Content Binding** — structured content queries
- **Opal AI** — RAG-based AI tools across all your content

CMS 13 without Graph is, as one Optimizely dev put it: "very close to running CMS 12 compiled for .NET 10" — you miss the main new capabilities.

## Registration Order

Order matters. `AddContentGraph()` must come before `AddContentManager()`:

```csharp
services.AddContentGraph();      // Must be first
services.AddContentManager();    // Depends on Graph
```

## Graph Architecture

**For .NET backends — C# SDK:**

```csharp
services.AddGraphContentClient();

// Then inject IGraphContentClient and use the fluent API
// See: [[graph-sdk|Graph C# SDK]]
```

**For non-.NET frontends / edge functions — direct fetch:**

```javascript
const response = await fetch("https://cg.optimizely.com/content/v2?auth=YOUR_PUBLIC_KEY", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: yourGraphQLQuery })
});
```

For secured indexes:
```javascript
headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
}
```

## Graph Schema Changes: CMS 12 vs CMS 13

The schema is not backward compatible. Teams using Graph on CMS 12 will need to update queries.

| Aspect | CMS 12 | CMS 13 |
|---|---|---|
| Root queries | Per content-type root queries | Unified `_Content`, `_Page`, `_Component`, `_Media` |
| Content ID | `ContentLink.GuidValue` | `_metadata.key` |
| Language | `Language.Name` | `_metadata.locale` |
| URLs | Plain strings | Structured objects with `type`, `default`, `base`, etc. |
| Site scoping | `SiteId` / `SiteDefinition` params | `_metadata.url.base` hostname filter |
| XhtmlString | Raw HTML string | `{ html: string, json: tree }` |
| Blocks | Direct type queries | Unified `_Component` interface |

**XhtmlString example (CMS 13 shape):**
```graphql
{
  html: "<p>rendered HTML</p>",
  json: { /* tree structure with type and children */ }
}
```

## Content Manager Registration

Content Manager is the new graph-powered editorial browse UI. It's opt-in:

```bash
dotnet add package EPiServer.Cms.UI.ContentManager
dotnet add package Optimizely.Graph.Cms
```

```csharp
services.AddContentGraph();   // must be first
services.AddContentManager();
```

## Search & Navigation Breaking Changes (Final S&N 13 Release)

For teams on S&N who need to upgrade S&N before the full CMS 13 migration:

| Removed | Replacement |
|---|---|
| `EPiServer.Find.Api.Facets.NestedFacetExtensions` | `EPiServer.Find.NestedFacetExtensions` |
| `EPiServer.Find.Api.Querying.Filters.NestedFilterExtensions` | `EPiServer.Find.NestedFilterExtensions` |
| `ISearchContext.Language` | `ISearchContext.ContentLanguage` |

**Reindex required** after S&N upgrade due to language routing changes.

## DXP Cloud: Use Project Migration

Because the Graph schema change is breaking, in-place deployment on DXP can cause significant downtime during schema rebuild. Use Project Migration instead:

1. Request "Project Migration for CMS 13" via support ticket
2. Deploy to the new CMS 13 environment
3. Run **Graph Full Synchronization** job after content copy
4. Go live

See [[upgrade-checklist|Upgrade Checklist]] for the full DXP migration steps.

## Sources

- [Robert Svallin — CMS 13 Preview 3: Key Changes](https://world.optimizely.com/blogs/robert-svallin/dates/2026/2/cms-13-preview-3-key-changes/) *(Feb 2026)*
- [Jake Minard — Introducing the CMS 13 Graph SDK](https://world.optimizely.com/blogs/jake-minard/dates/2026/3/introducing-optimizely-cms-13-graph-sdk/) *(Mar 2026)*
- [Official Docs — CMS 12 vs CMS 13 Graph Comparison](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/cms-13-and-12-graph-comparison)
- [Daniel Halse — Graph Access with JS and Fetch](https://world.optimizely.com/blogs/daniel-halse/dates/2026/2/graph-access-with-only-js-and-fetch) *(Feb 2026)*
- [Gosso — Technical Q&A for CMS 13](https://www.optimizely.blog/2026/03/technical-qa-for-cms-13/) *(Mar 2026)*
