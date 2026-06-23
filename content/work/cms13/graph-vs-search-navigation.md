---
title: "Graph vs Search & Navigation — How It Works & What Changed"
tags:
  - optimizely
  - cms
  - graph
  - search
  - architecture
---

The conceptual explainer: **how Optimizely Graph works as a system**, and how that differs architecturally from the retired Search & Navigation (Find). For the hands-on API and migration mechanics, see [[graph-sdk|Graph C# SDK]] and [[search-to-graph|Search & Navigation → Graph Migration]] — this page is the "why" and "how it fits together" behind those.

## The one-sentence difference

**Search & Navigation was a search *add-on* bolted onto the CMS. Optimizely Graph is the content *delivery backbone* the CMS is built around.** That reframing explains almost every other difference below.

## How Graph works now

```
   CMS 13  ──(sync: content + auto-generated schema)──▶  Optimizely Graph
  (PaaS / on-prem / SaaS)                                (hosted SaaS GraphQL
        │                                                 service, cg.optimizely.com)
        │                                                        ▲
        │                                                        │ queries
        └── editors, Content Manager, Opal ◀────────────────────┤
                                                                 │
   Frontends (Razor, React, Next.js, edge) ──────────────────────┘
        (C# SDK · direct GraphQL fetch · REST)
```

1. **Hosted GraphQL service.** Graph runs as a **SaaS service** at `cg.optimizely.com` — Optimizely hosts it. On-prem and PaaS CMS 13 installs **integrate with it** (it is not something you self-host). It is a hard dependency, not optional.
2. **The CMS pushes content up.** The CMS **auto-generates the GraphQL schema** from your content types and syncs content into the Graph index. You don't hand-write the schema.
3. **Per-environment indexes.** Each environment has its own index keyed by an **AppKey / SingleKey** in `appsettings`. A fresh index is **empty** until you run the **Content Graph Full Re-index** scheduled job. Prod and dev indexes are independent — re-indexing one does not touch the other.
4. **Three ways to query:**
   - **C# SDK** — inject `IGraphContentClient`, write a typed fluent query; it compiles to GraphQL under the hood. Async-only. → [[graph-sdk|Graph C# SDK]]
   - **Direct GraphQL over HTTP fetch** — `POST https://cg.optimizely.com/content/v2?auth=KEY` with a GraphQL query body. No .NET required — ideal for headless/edge frontends (React, Next.js, edge functions).
   - **REST** — for simpler integration scenarios.
5. **It's more than search.** Graph is also what powers **Content Manager** (the new editorial browse/search UI), **External Content** (indexing non-CMS sources), **Content Binding** (structured content queries), and **Opal's** RAG-based AI across your content. Disable/skip Graph and you lose all of that — "very close to running CMS 12 compiled for .NET 10."

## Side-by-side: Graph vs Search & Navigation

| Dimension | Search & Navigation (Find) | Optimizely Graph |
|---|---|---|
| **Role in the platform** | Optional search add-on | Mandatory content **delivery backbone** |
| **Underlying engine** | Elasticsearch cluster (hosted by Optimizely) | Hosted GraphQL service (`cg.optimizely.com`) |
| **Query language** | .NET fluent API (`SearchClient`) only | **GraphQL** — via C# SDK, direct fetch, or REST |
| **Headless / non-.NET access** | Awkward — .NET-centric | First-class — query GraphQL directly from any frontend/edge |
| **Schema** | You shape indexed objects in code | **Auto-generated** from content types |
| **Execution model** | Sync or async | **Async-only** |
| **Powers editor UI / AI** | No | Yes — Content Manager, External Content, Opal RAG |
| **CMS 13 support** | **Removed entirely** — no compat layer | The only option |
| **Index location** | Optimizely-hosted ES index | Optimizely-hosted Graph index, per-environment AppKey |

## What this means in practice

- **Headless gets dramatically easier.** Because Graph is GraphQL-native and queryable over plain HTTP, a React/Next.js frontend (or an edge function) can hit content directly without a .NET delivery tier. That was painful with S&N.
- **You can't "skip" it.** With S&N you could run a CMS site with no search. With CMS 13, Graph isn't optional — the editor experience and AI features depend on it. Plan it into the upgrade, not after.
- **Re-indexing is an operational step, not a one-time thing.** New environment = empty index = run the full re-index job. This bites people who copy a database and wonder why search returns nothing. → see the re-index gotcha in [[graph-sdk|Graph C# SDK]].
- **Migrate during the CMS 13 upgrade, not before.** The Graph schema changed between CMS 12 and 13; implementing Graph on CMS 12 first means migrating twice. → [[search-to-graph|Search & Navigation → Graph Migration]].

## Don't confuse "Graph the API surface" with these

- **The C# query API** (`IGraphContentClient`, `.Where()`, `.Facet()`, etc.) — that's the SDK, documented in [[graph-sdk|Graph C# SDK]].
- **The schema shape changes** (`_Content`, `_metadata.key`, XhtmlString as `{ html, json }`) — documented in [[search-to-graph|Search & Navigation → Graph Migration]].
- **This page** is the system-level picture that sits above both.

## Related Pages

- [[graph-sdk|Graph C# SDK]] — the query API, filtering, faceting, the package-rename and DI gotchas
- [[search-to-graph|Search & Navigation → Graph Migration]] — schema changes, registration order, DXP project migration
- [[cms13-technical-qa|CMS 13 Technical Q&A]] — Graph FAQs (on-prem support, CMS 12 vs 13 timing)
- [[cms13-refresher|CMS 13 Refresher]] · [[cms13-flashcards|CMS 13 Flashcards]]

## Sources

Synthesized from the wiki's verified Graph pages and primary sources:
- [Robert Svallin — CMS 13 Preview 3: Key Changes](https://world.optimizely.com/blogs/robert-svallin/dates/2026/2/cms-13-preview-3-key-changes/) *(Feb 2026)*
- [Jake Minard — Introducing the CMS 13 Graph SDK](https://world.optimizely.com/blogs/jake-minard/dates/2026/3/introducing-optimizely-cms-13-graph-sdk/) *(Mar 2026)*
- [Daniel Halse — Graph Access with only JS and Fetch](https://world.optimizely.com/blogs/daniel-halse/dates/2026/2/graph-access-with-only-js-and-fetch) *(Feb 2026)*
- [Gosso — Technical Q&A for CMS 13](https://www.optimizely.blog/2026/03/technical-qa-for-cms-13/) *(Mar 2026)*
