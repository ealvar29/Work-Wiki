---
title: "Christie Digital"
tags:
  - clients
  - christie
  - optimizely
  - cms
  - commerce
---

**Site:** christiedigital.com  
**Industry:** Visual display technology  
**Hosting:** Optimizely DXP (Azure)

> [!important] Assessment delivered 2026-11-19
> Josh Apgar's **CMS 13 Upgrade Assessment** recommends CMS 13 + Commerce 15 in one project, about 12–16 weeks, starting with a 2-week assessment spike. Hour figures are in the internal assessment, not on this public site. The sizing method is on [[work/cms13/upgrade-estimating|Estimating a CMS 13 Upgrade]].

## Tech Stack

*Versions checked against the Optimizely NuGet feed 2026-11-19 (assessment, then re-checked independently the same day).*

| Layer | Today | CMS 13 path | Verdict |
|---|---|---|---|
| Runtime | **.NET 10** | .NET 10 | Already done |
| CMS core and UI | 12.34.6 | 13.7.0 | Upgrade |
| Commerce | 14.46.1 | 15.5.0 | Upgrade, required with CMS 13 |
| Search | `EPiServer.Find` 17.0.2 / Find Commerce 12.3.1 | Optimizely Graph 13.7.0 / `Optimizely.Graph.Commerce` 15.5.0 | **Replace**, Find has no CMS 13 version |
| Forms | 5.10.9 | 6.1.0 | Upgrade |
| Language Manager | 5.5.3 | **6.0.0** | Upgrade |
| Advanced Reviews | 1.4.4 | 2.1.0 | Upgrade |
| Geta Sitemaps (incl. Commerce) | 3.2.1 | **5.0.0** | Upgrade |
| Geta NotFoundHandler | 5.1.0 | 8.0.0 | Upgrade, or move redirects to `Jaxon.Redirector.Cms13` as OxyChem did |
| Environment Synchronizer | 1.3.1 | **2.0.1** | Upgrade, but see the hostname warning below |
| PowerSlice | 5.2.0 | none (latest is 5.2.0; depends on Find per the assessment) | **Remove** |
| Telemetry UI | 2.2.1 | none (latest is 2.2.1) | **Remove** |

```bash
curl -s "https://nuget.optimizely.com/feed/packages.svc/FindPackagesById()?id='EPiServer.Labs.LanguageManager'" \
  | grep -oE '<d:Version[^>]*>[^<]+' | sed 's/.*>//' | sort -V | tail -3
```

> ✅ **CORRECTED 2026-11-19.** *Verified against the Optimizely feed 2026-11-19.* This page previously said the runtime was **.NET 6**, that **LanguageManager** had no confirmed CMS 13 version, and that **Geta.Sitemaps** and **EnvironmentSynchronizer** had no CMS 13 release, listing all three as hard blockers. **None of that is true any more.** The site is already on .NET 10, and LanguageManager 6.0.0, Geta.Optimizely.Sitemaps 5.0.0 and Addon.Episerver.EnvironmentSynchronizer 2.0.1 all ship. **There are no package blockers left.** The two packages without a CMS 13 version (PowerSlice, Telemetry UI) get removed rather than waited for.

## Size

From the assessment's scan of the `master` branch, 2026-11-19:

| Signal | Count |
|---|---|
| Content types | **121**, 13 of them Commerce catalog types |
| Files referencing EPiServer Find | 54, about 25 with query, facet or indexing logic |
| Files using the Commerce engine (`Mediachase.*`) | 38, plus 30 using Business Foundation |
| Files using `SiteDefinition.Current` | 8 |
| Scheduled jobs / initialization modules | 15 / 33 |
| Files using `ServiceLocator` | 85 (modernization priced as optional) |
| List properties relying on Newtonsoft.Json attributes | about 25 |

> ✅ **CORRECTED 2026-11-19.** This page previously gave the scale as **67 page types and 47 block types**. The assessment's count is **121 content types**.

**Commerce is catalog only**: no cart, orders or payments. That avoids the largest Commerce 15 changes, which are in order and payment processing.

### Christie-specific parts

- Customer sign-in through **Azure B2C (SAML)** with two schemes. It stays on B2C; only CMS editors move to Opti ID
- **`.com` and `.cn` share one site**, mapped to English and Simplified Chinese
- A custom content provider
- The Projection Calculator React app

## Active Workstreams

| Workstream | Status | Details |
|---|---|---|
| CMS 12 → 13 + Commerce 14 → 15 | **Assessment delivered 2026-11-19**, waiting on spike approval | Branch: `Christie-CMS13-Upgrade` |
| Find → Graph migration | Scoped; the largest workstream | Product search API, Resource Finder, Product Downloads Finder, facet managers |

## Risks the wiki adds to the assessment

These come from OxyChem and VHB and apply to Christie specifically. Price them into the spike.

| Risk | Why it bites Christie | Read |
|---|---|---|
| **EnvironmentSynchronizer rewrites hostnames** | On OxyChem it removed hostnames editors added in production admin on every restart, and was switched off in Production. Christie's `.com` / `.cn` mapping is exactly that setting | [[work/clients/oxychem/index\|OxyChem]] → Known Quirks, [[work/cms13/applications-model\|Applications Model]] |
| **`SiteDefinition.Current` returns the wrong site** without throwing | Two hosts, two languages, one site: a silent wrong-language bug | [[work/cms13/post-upgrade-gotchas\|Post-Upgrade Gotchas]] |
| **Graph has no UnifiedSearch** | Pages and files are separate roots. The Resource Finder and Product Downloads Finder likely search both | [[work/cms13/search-to-graph\|Search → Graph]] §4 |
| Graph indexing is **opt-in**, and indexing flags are **database state** that doesn't promote | Search works on Integration and is empty on Preproduction | [[work/cms13/search-to-graph\|Search → Graph]] §1, §9 |
| Display-time filtering breaks `total` and pagination | Faceted product search | [[work/cms13/search-to-graph\|Search → Graph]] §8 |
| **Best Bets** live in the database, and inventories run larger than assumed | One site assumed 2, held 37 rows / about 45 phrase sets. External-URL Best Bets can't migrate; `.WithPinned()` is opt-in in code | [[work/cms13/graph-vs-search-navigation\|Graph vs S&N]], [[work/cms13/search-to-graph\|Search → Graph]] §12 |
| **`IValidate<T>` validators go dark** silently | 121 content types. OxyChem ran 25 days in production without them | [[work/cms13/validator-registration-audit\|Validator Registration Audit]] |
| Opti ID auto-maps only `CmsEditors` / `CmsAdmins` | Custom editor roles must arrive via the token `groups` claim. That's the real work in the role-mapping line | [[work/clients/oxychem/index\|OxyChem]] → Known Quirks |
| Migrated audiences fail with "This criterion failed to load" | Visitor groups are already on the spike list | [[work/cms13/post-upgrade-gotchas\|Post-Upgrade Gotchas]] |
| A DB restore leaves Graph stale and `sitemap.xml` 404ing on non-production hosts | UAT on Preproduction starts from a content copy | [[work/cms13/post-upgrade-gotchas\|Post-Upgrade Gotchas]] |

The assessment already covers two gotchas that the wiki also documents: Razor Pages registered before CMS routes (`CMS-51344`) and `PropertyList<T>` loading empty under System.Text.Json.

> [!note] Project migration: the reason is the schema, not the rebuild time
> The assessment says DXP project migration may be needed "because the Graph rebuild takes time". A full Graph synchronization measured **about 6 minutes for about 27,650 items** on all three DXP environments. The reason Optimizely recommends project migration is the **breaking Graph schema change** between CMS 12 and 13. Time Christie's sync on Integration once the catalog is indexed, then decide. See [[work/cms13/graph-vs-search-navigation|Graph vs S&N]] and [[work/cms13/search-to-graph|Search → Graph]].

## Open questions for Christie (from the assessment)

- Does the contract include Opal / Mark AI features, or are they an add-on?
- Should CMS editors move to Opti ID? It's required for the AI features
- Is AI enablement (MCP server and agents) in scope, or a follow-on?
- Blackout periods for cutover (trade shows, launches)?
- Who owns UAT and the search baseline queries?

## Related Wiki Pages

- [[work/cms13/upgrade-estimating|Estimating a CMS 13 Upgrade]]: calibration from Cambro, OxyChem and Christie
- [[work/cms13/upgrade-accelerator|CMS 13 Upgrade Accelerator]]
- [[work/cms13/search-to-graph|Search & Navigation → Graph Migration]]
- [[work/cms13/graph-vs-search-navigation|Graph vs Search & Navigation]]
- [[work/cms13/post-upgrade-gotchas|Post-Upgrade Gotchas]]
- [[work/cms13/breaking-changes|Breaking Changes Catalog]]
- [[work/cms13/translations|Translations & Localization]]
- [[work/cms13/upgrade-checklist|Upgrade Checklist]]

## Sources

- Josh Apgar, *Christie Digital — Optimizely CMS 13 Upgrade Assessment*, 2026-11-19 (internal)
- Optimizely NuGet feed, all add-on versions above re-checked 2026-11-19
