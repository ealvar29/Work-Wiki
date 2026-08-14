---
title: Search & Navigation → Graph Migration
tags:
  - optimizely
  - cms
  - graph
  - search
  - migration
---

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

Install the **renamed CMS 13 packages** (`Optimizely.Graph.Cms` + `Optimizely.Graph.Cms.Query` 13.0.2 — *not* the CMS-12-only `Optimizely.ContentGraph.Cms`) and register **both** sides:

```csharp
services.AddContentGraph();        // indexing / sync
services.AddGraphContentClient();  // query client (namespace Optimizely.Cms.DependencyInjection)

// Then inject IGraphContentClient and use the fluent API
// See: [[graph-sdk|Graph C# SDK]] for the package rename, the dual-registration gotcha,
// and the GetAsContentAsync query API — all field-verified on the OxyChem upgrade.
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

## Parity gaps: what Find did that Graph does not (field-verified)

**Read this before you tell a client search will be "the same or better."** Find's behaviour came from explicit indexing conventions. Graph's defaults are not equivalent, and if you port the *query* without porting the *conventions*, search silently returns far less than before. Verified end-to-end on the OxyChem upgrade, 2026-08.

### 1. Graph indexing is opt-in — the default is NOT searchable

A property contributes to `_fulltext` **only when explicitly marked searchable**. `GraphIndexingMode` (`Optimizely.Graph.Cms.ContentTypes.Models`):

| Mode | Retrievable | Filterable (`where`) | Full-text searchable |
|---|---|---|---|
| `None` | — | — | — |
| `Default` | ✅ | ✅ | ❌ |
| `Queryable` | ✅ | ✅ | ❌ |
| `Searchable` | ✅ | ✅ | ✅ |

**Where the control is:** Admin → **Settings → Content Types → *[type]* → *[property]* → "Property Indexing Type"**. It is a **dropdown**, not a checkbox — the docs describe a "Searchable property checkbox", which is the CMS SaaS UI. Self-hosted CMS 13 shows a dropdown with the four `GraphIndexingMode` values, and it renders whether or not Find is installed. Default is `Default`, i.e. **not searchable**.

Find's model was the **inverse**: index everything serialisable, then exclude specific types. So a straight port leaves you with an index containing content-item *names* and nothing else. Symptom: a word plainly visible on a page matches **zero** pages.

```
_Page match "feedstock"   ->  0     # word is in a text block on the page
_Content match "feedstock" -> 12    # all PDFs — Graph extracts file text natively
```

The block is indexed, but its `_fulltext` is just its own name:

```json
{"displayName":"Chlor-Alkali C9 Intro","types":["C9TextBlock","_Component",...],
 "_fulltext":["Chlor-Alkali C9 Intro"]}
```

Its text is retrievable (`Text { html }` returns the copy) but **not searchable**. Retrievable ≠ searchable — that distinction is the whole trap.

### 2. ContentArea flattening — the indexing mode IS the equivalent

Find serialised block content **into the parent page's indexed document**:

```csharp
SearchClient.Instance.Conventions.ForInstancesOf<ContentArea>()
    .ModifyContract(x => x.Converter = new MaxDepthContentAreaConverter(4));
```

That single convention is why a page was findable by copy living in its blocks.

**Graph's equivalent is the per-property indexing mode, and it cascades — verified.** Setting one block property (`C9TextBlock.Text`) to `Searchable` and running a Full Synchronization propagated its text into every **parent page's** `_fulltext`:

```
                      before   after
_Page      "feedstock"    0   ->   2
_Component "feedstock"    0   ->   4
```

```json
// the PAGE's _fulltext afterwards
["Chlor-Alkali C9 Intro",
 "<h2>OxyChem is a leading producer of chlor-alkali products</h2>\n<p>Chlor-alkali chemicals serve as critical feedstock…</p>",
 "Chlor-Alkali C15 Accordion", ...]
```

So there is **no separate ContentArea configuration to find** — mark the block properties searchable and parent pages become findable by their block copy. No support ticket required.

**Test to run early on any Find→Graph migration:** pick a distinctive phrase from a text block and query `_Page` for it. If it returns 0, your properties are still at `Default`.

**Two things to know about the resulting `_fulltext`:**
- Entries arrive as **raw HTML** (`<h2>…</h2>\n<p>…</p>`) — strip tags and decode entities before display. CMS 12 ran `WebUtility.HtmlDecode` over `hit.Excerpt` for the same reason.
- **Content-item names are in there too** (`"Chlor-Alkali C9 Intro"`). Find indexed names as well so it isn't a regression, but any snippet builder must skip them — keeping only entries containing HTML tags is a workable heuristic.

### 3. Graph has no excerpt or highlight API

Find produced result descriptions from `hit.Excerpt` — server-side, **query-aware** (the snippet centres on the matched terms):

```csharp
Description = WebUtility.HtmlDecode(hit.Excerpt),
```

Graph has no equivalent. Snippets must be synthesised client-side, and a naive "join the indexed text and truncate" is **not** the same thing — it always shows the start of the page rather than the matched region.

### 4. No UnifiedSearch — pages and files are separate roots

Find's `UnifiedSearchRegistry` gave one ranked list across pages and media with a single `TotalMatching`. In Graph you query `_Page` / `_Media` (or `_Content`) and reconcile yourself. **Watch the total:** taking it from the pages query alone means a document-heavy site reports `total: 0` while rendering file results — the UI says "no results" over a populated list.

### 5. Site scoping: use `_metadata.url.base`, never `url.default`

One Graph index serves every site on the instance, and **there is no site filter by default** — so each site's search returns every other site's content until you add one.

- `url.base` is **one distinct value per site** — the reliable discriminator.
- `url.default` is **relative for pages** (`/chlor-alkali/`) but **absolute for media** (`https://host/siteassets/…`) — filtering on it silently drops every page.
- Media carries `url.base` too, so files scope the same way.

Derive the base from the request (`scheme://host`) rather than `SiteDefinition` — on CMS 13 `ISiteDefinitionRepository.List()` returns `Guid.Empty` with synthetic names.

### 6. Field-path filters take TWO steps (this one compiles and fails silently)

The concrete filter classes are `internal`, and the typed model can't reach metadata paths (`ContentItemMetadata.Url` is a flattened `string` with no `base` member). So field-path filters are the only route — and they need both halves:

```csharp
// WRONG — compiles, then returns zero results for every query
Filters.FilterEquals("_metadata.url.base", value)

// RIGHT
Filters.FilterEquals("_metadata.url.base", value).GetFilter("_metadata.url.base")
```

`Filters.FilterX(...)` returns a `DelegateFilterBuilder` — a filter still waiting for a field name. Its **first argument is the expression-marker slot and is ignored** when called directly; the second is the value; `.GetFilter(path)` binds the field. Because the builder converts implicitly to `GraphFilter`, the compiler accepts the broken form. The resulting exception is typically swallowed by a `catch` into an empty result set — indistinguishable from "no matches."

### Diagnostic queries

Go to the Graph gateway directly — the app layer can't tell you whether the fault is the query, the index, or the CMS config.

```bash
K="<singlekey>"; G="https://cg.optimizely.com/content/v2?auth=$K"
q(){ curl -s -X POST "$G" -H 'Content-Type: application/json' -d "{\"query\":\"$1\"}"; echo; }

q '{ _Page(limit:0){ total } }'                       # free count, no items
q '{ __type(name:"ContentMetadata"){ fields{ name } } }'   # what metadata exists

# THE query that finds cross-site leakage — distinct site bases with counts
q '{ _Page(limit:0){ facets{ _metadata{ url{ base(limit:30){ name count } } } } } }'

# "is my content in pages, or in media?" — catches the searchability gap
q '{ _Content(where:{_fulltext:{match:"yourterm"}}, limit:6){ items{ _metadata{ displayName types } } } }'
```

Facets are the highest-value tool: effectively `SELECT value, COUNT(*) GROUP BY value` in one request.

### 7. Find's `ISearchable` opt-in has no Graph equivalent — you must reimplement it

Find had a registry of searchable types:

```csharp
searchClient.Conventions.UnifiedSearchRegistry.Add<ISearchable>();
```

Graph has nothing equivalent — it indexes what you tell it to index and returns whatever matches. So the type filter has to move into **your** result mapping. The tempting version is wrong:

```csharp
case BasePage pageItem when !pageItem.HideFromSearch:      // every page type qualifies
```

That's wider than Find was. On a multi-site instance it surfaced twelve vanity-redirect stub pages (each a `HomePage` under root) as results whose link was `/` — dead hits, reported immediately in client QA. Restore the opt-in:

```csharp
case BasePage pageItem when pageItem is ISearchable && !pageItem.HideFromSearch:
```

**Check the CMS 12 source before you do this, not after.** The marker interface set is easy to get wrong from memory — verify which page types actually declared it, because dropping a type that Find *did* index is a silent recall regression that QA will read as "search is broken".

### 8. Filtering at display time breaks `total` and pagination

Directly following from #7: if you drop hits in your result mapper, `total` still comes from Graph's **pre-filter** count. You get:

```json
{"total":3,"hasMore":true,"results":[ /* 2 items */ ]}
```

Inflated counts, and pagination pages that render short or empty. Either **exclude the types in the Graph query itself**, or decrement `total` as you drop hits. Don't filter in the projection and report Graph's count.

### 9. Indexing flags are database state — they do not promote

The `Property Indexing Type` you set per property (Admin → Content Types) is stored in **`tblPropertyDefinition`**. That means it is **per-environment**. Flag 42 properties on Integration, promote code to Preproduction, and Preproduction has none of them — search silently under-returns and nothing in the deployment tells you.

Add it to your promotion checklist explicitly, alongside "run a full Graph synchronization". Consider scripting it rather than clicking 42 dropdowns three times.

### 10. Autosuggest costs two data stores per keystroke

Find served typeahead from its own index in one hop. The natural Graph port does this per call:

```csharp
.QueryContent<PageData>()...      // Graph round trip, then materialises CMS content from the DB
_urlResolver.GetUrl(x.ContentLink) // …and a URL resolve per suggestion
```

Measured against the CMS 12 original on the same content: **~0.54s vs ~0.32s per suggestion call**, roughly 1.7×. The results endpoint itself was at parity (0.150s vs 0.155s) — it's the typeahead that regresses, and users read a laggy dropdown as "search is slow".

Mitigations, in order of value:

1. **Project, don't materialise** — return title + URL from Graph's `_metadata.url`, rather than loading content and resolving a URL per hit.
2. Audit the controller for dead work. A real example computed a page load, a start-page tree walk and a URL resolve **into a variable that was never used**, on every keystroke.
3. Check the client debounce interval (250–300ms at this latency).
4. Remove sync-over-async (`.Result`, `GetAwaiter().GetResult()`) from the request path before go-live — a concurrency risk rather than a latency one.

**Measure the endpoints separately before believing a "search is slow" report.** Time the document, the JS bundle, the results POST and the suggestions POST independently. In one investigation the results path was *faster* than production and only the typeahead had regressed — the opposite of the initial diagnosis.

### 11. Content that can't be read can't be indexed

Obvious in hindsight, easy to miss: if a property fails to deserialize — see [[work/cms13/post-upgrade-gotchas|`PropertyList<T>` Silently Returns an Empty List]] — its text never reaches `_fulltext` either. A recall measurement taken while a content-loading bug is open will understate your parity, and you'll chase a search problem that is actually a property problem. Fix content loading **before** you benchmark recall.

Note the failure is **silent in both places**: the property returns an empty list with no exception, and the index simply lacks the text. Nothing anywhere says "this content could not be read." If recall is short and you cannot explain why, load a sample of the affected pages through `IContentLoader` and check the collection properties are actually populated before you touch the search code.

### 12. Best Bets become Pinned Results — but nothing migrates, and nothing tells you

Find's **Best Bets** (editor-curated results promoted to the top of a query) map to Graph's **Pinned Results**, and the CMS 13 Graph SDK exposes `.WithPinned()`:

```csharp
if (q is ISearchableContentQuery<T> searchable)
    q = searchable.SearchFor(term).WithPinned();          // ← without this, pinning never applies
```

So the feature exists. What does *not* exist is any of the plumbing around it, and the failure mode is silence on every axis:

| | Search & Navigation | Optimizely Graph |
|---|---|---|
| Migration | — | **None. Manual re-creation, every entry** |
| Configuration | Admin UI | **REST API only** (HMAC or Basic auth) |
| External URLs | supported | **Not supported at all** |
| Count | unlimited | **max 5 per collection** |
| Languages | applied to all at once | **separate item per language** |
| Titles/descriptions | custom | content fields only, styled at app layer |
| Priority | insertion order | explicit assignment |

Three traps follow from that table.

**First, `.WithPinned()` is opt-in in your own code.** A migrated search service that never calls it will run perfectly and apply zero pins. Search still works, results still appear, nothing errors — the curated answer just stops showing up. Grep your search service for `WithPinned` before assuming parity.

**Second, external-URL Best Bets have no path forward.** Optimizely is explicit: Graph "supports internal CMS content only." On one site the single highest-value promoted result was an external URL pointing at a corporate careers site — that one cannot be migrated at all, and needs a different answer entirely (a stub content item, or a redirect).

**Third, the five-per-collection ceiling is a real constraint**, not a formality, if the CMS 12 site leaned on Best Bets heavily. Inventory before you promise parity.

Management surfaces, since the REST-only story is awkward: Optimizely shipped a native **Search Management portal** (beta), and the community **[OptiGraphExtensions](https://github.com/adayinthelifeofapro/OptiGraphExtensions)** package manages synonyms and pinned results from inside the CMS.

**How to detect the gap before an editor does.** Compare the *result types* your CMS 12 and CMS 13 endpoints return, not just the URLs:

| | page | file | **link** |
|---|---|---|---|
| CMS 12 / Find | 116 | 45 | **7** |
| CMS 13 / Graph | 99 | 226 | **0** |

A whole category dropping to zero is the signal. On the site above, one query returned a *single* result on production — an external Best Bet pointing at the corporate careers site — and returned nothing at all on CMS 13. The giveaway is in the tracking querystring Find appends to its own hits:

```
_t_hit.id=EPiServer_Find_Framework_BestBets_ExternalUrlBestBet/AZuAsrxHJT1ji6Yw4u8L
```

**Export the Best Bets list while CMS 12 is still live.** It lives in Find's admin, not in your database or your repo, and it goes away with the index — and since there is no automated migration, that export *is* your migration input. You will also need to map content IDs to Graph GUIDs. The search-statistics history dies with it too. Both are unrecoverable after the upgrade, and both are things you will wish you had.

Docs: [Migrate Best Bets to Pinned Results](https://docs.developers.optimizely.com/platform-optimizely/docs/migrate-pinned-results).

### Baselining recall: four traps that manufacture false blockers

Item 1 of the sequencing advice below says capture a baseline. Doing it badly is worse than not doing it — every one of these produced a confident, wrong "indexing gap" on a real project:

1. **"Absent from the top N" ≠ "not indexed."** A page can be indexed and simply not match that query. One page flagged as missing for *potassium hydroxide* was sitting in the CMS 13 top 6 for *peladow*. Always confirm existence independently — HTTP status plus sitemap membership — before calling anything an index gap.
2. **Don't normalise the host away.** Stripping hosts to compare paths turned an `oxy.com` Best Bet into a 404 against a different site's host, inventing a blocker. Cross-host results must be *detected*, not flattened.
3. **Strip Find's tracking querystring** (`_t_id`, `_t_q`, `_t_hit…`) or nothing will ever compare equal.
4. **Graph returns pages and files as separate result sets** (see #4 above), so `itemsPerPage: 10` can yield ~20 items on CMS 13 against 10 on CMS 12. Compare set membership, never position.

Two more things worth knowing. **Graph typically matches far more broadly than Find** — totals of 117 vs 28, 42 vs 3, 16 vs 1 for the same query were normal on one migration. Higher recall, lower precision: a tuning conversation, not a defect. And **querying production writes to Find's own search statistics**, so a baseline run pollutes the data you harvested the query list from. Run it deliberately, once.

**Pick query pairs, not just top queries.** Include `sds`/`safety data sheet`, an acronym and its expansion, a hyphenated term and its common misspelling. When only one half of a pair fails you have isolated tokenisation or fuzzy-matching; when a lone query fails you have learned "search is different." Source the list from the CMS 12 **search statistics per site** — but filter out type-ahead keystroke fragments first, because search-as-you-type logs every keystroke as its own query and single characters will out-rank real ones.

### Sequencing advice

1. **Capture a CMS 12 baseline before migrating** — ~20 representative queries with result counts and top hits per site. Without it you cannot tell a ranking difference from a missing page, and "search parity" is unfalsifiable at sign-off.
2. **Port the conventions, not just the query.** Enumerate every `IndexInitialization`-style convention on the CMS 12 side and decide its Graph equivalent explicitly.
3. Any indexing/convention change requires a **Graph Full Synchronization** — *"content types and content data are not resynced automatically when conventions change."*
4. **Where the setting lives matters.** Admin → Settings → Content Types writes to `tblPropertyDefinition` — **database state, per environment**. It does not travel from Integration to Production and is not version-controlled. A code route could not be confirmed in 13.x (the 13.1 assemblies expose `GraphIndexingMode` and `GraphPropertyDefinition` but **no `GraphPropertyAttribute`**), so budget per-environment reconfiguration as a cutover step until proven otherwise.
5. Reproduce Find's deliberate **exclusions**. Flipping every string property searchable will surface CSS class names, anchor names and aria labels in results.

### Scoping the property sweep

Because the indexing mode cascades from block to parent page, the work is "flag each content-bearing property," not "find a ContentArea setting." On a mid-sized site expect **40–60 properties** across 30–40 content types — tedious but bounded.

A workable triage:

| Flag `Searchable` | Leave `Default` |
|---|---|
| Rich-text body properties (`Text`, `Content`, `Body`, `Description`) | UI microcopy — "no results" tips, results messages, wizard/auth copy |
| Headlines and section titles | Footnotes, notes, disclaimers — high volume, low relevance, dilutes snippets |
| Table and accordion body copy *(unless excluded on CMS 12)* | Presentation/config strings — CSS class modifiers, anchor names, aria labels |
| Media `Description` fields | Social/SEO fields — OpenGraph, Twitter card, email-share subject/body |

Enumerate candidates from the models rather than clicking through admin:

```bash
grep -rn 'virtual XhtmlString' --include=*.cs Logic/Models | sort
```

Then reconcile against the CMS 12 `IndexInitialization` exclusions before flagging anything.

## Sources

- [Robert Svallin — CMS 13 Preview 3: Key Changes](https://world.optimizely.com/blogs/robert-svallin/dates/2026/2/cms-13-preview-3-key-changes/) *(Feb 2026)*
- [Jake Minard — Introducing the CMS 13 Graph SDK](https://world.optimizely.com/blogs/jake-minard/dates/2026/3/introducing-optimizely-cms-13-graph-sdk/) *(Mar 2026)*
- [Official Docs — CMS 12 vs CMS 13 Graph Comparison](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/cms-13-and-12-graph-comparison)
- [Daniel Halse — Graph Access with JS and Fetch](https://world.optimizely.com/blogs/daniel-halse/dates/2026/2/graph-access-with-only-js-and-fetch) *(Feb 2026)*
- [Gosso — Technical Q&A for CMS 13](https://www.optimizely.blog/2026/03/technical-qa-for-cms-13/) *(Mar 2026)*
- [Official Docs — Indexing Conventions for Optimizely Graph (CMS 13)](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/indexing-conventions)
- [Official Docs — Full-Text Search in Optimizely Graph: Match, Contains, Searchable Fields](https://docs.developers.optimizely.com/platform-optimizely/docs/full-text-search)
- [Nguyen Nguyen — Optimizely Graph indexing modes for CMS Content properties](https://world.optimizely.com/blogs/nguyen-nguyen/dates/2024/3/exclude-cms-content-properties-from-being-indexed-in-optimizely-graph/)
- Parity gaps section: field-verified on the OxyChem CMS 13 upgrade, 2026-08. Full detail incl. the CMS 12 reference conventions in that repo at `UpgradePlan/search-parity-cms12-to-cms13.md`.
