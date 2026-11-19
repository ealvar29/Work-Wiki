---
title: "Estimating a CMS 13 Upgrade"
tags:
  - optimizely
  - cms
  - upgrade
  - estimating
  - commerce
---

How Jaxon sizes a CMS 12 → 13 upgrade: the calibration from past assessments, the code signals that drive hours, the workstream template, and the hidden costs that compile cleanly and get missed.

## Calibration

> [!note] Hour figures stay internal
> This site is public, so estimates and actuals live in the assessment documents, not here. Ask the assessment author for the numbers. What this page records is **relative size and what drove it**.

| Client | Relative size | Shape | Outcome |
|---|---|---|---|
| Cambro | Smallest of the three | CMS only; Find **plus** NEST/Elasticsearch | Assessment |
| OxyChem | Middle, with the widest range | CMS only, multi-site (~24 site definitions down to 3), Find → Graph, Opti ID, DAM | **Live on CMS 13 since 2026-09-18** |
| Christie Digital | Largest | CMS + **Commerce 15** (catalog only), 121 content types, faceted catalog search | Assessment, 2026-11-19 |

**What moved Christie above the other two:** the Commerce upgrade, catalog search with facets, and the content type count. **What pulled it down:** already on .NET 10, customer sign-in stays on Azure B2C, and Commerce is catalog only.

OxyChem's actual hours against its estimate are not recorded anywhere yet. That comparison is the one that would make every future range more honest.

## Signals that drive hours

Count these on the client's main branch before estimating. Each maps to a workstream below.

```bash
grep -rlE "EPiServer\.Find" --include=*.cs . | wc -l
grep -rlE "Mediachase\." --include=*.cs . | wc -l
grep -rl "SiteDefinition.Current" --include=*.cs . | wc -l
grep -rl "ServiceLocator" --include=*.cs . | wc -l
grep -rn "IValidate<" --include=*.cs . | wc -l
grep -rln "\[ScheduledPlugIn" --include=*.cs . | wc -l
grep -rln "\[InitializableModule\|\[ModuleDependency" --include=*.cs . | wc -l
grep -rln "JsonProperty\|JsonConverter" --include=*.cs . | wc -l
grep -rn "BinaryFormatter" --include=*.cs .
```

| Signal | Why it costs | Christie (2026-11-19) |
|---|---|---|
| Find files with query, facet or indexing logic | The single biggest workstream on every Find site | 54 files, ~25 with logic |
| `Mediachase.*` and Business Foundation | Commerce 15 breaking changes | 38 + 30 files |
| Cart, orders, payments in use? | The largest Commerce 15 changes live there. **Catalog-only is much cheaper** | Catalog only |
| `SiteDefinition.Current` | Compiles and returns the wrong site on multi-host setups | 8 files |
| List properties with Newtonsoft attributes | Load empty under System.Text.Json with no error | ~25 |
| `IValidate<T>` count | Every one must be registered with `AddCmsValidator<T>()` | — |
| Already on .NET 10? | Removes a large step | Yes |
| Add-ons with no CMS 13 version | Remove and replace, don't wait | PowerSlice, Telemetry UI |

## Workstream template

The Christie assessment's breakdown, reusable as a starting template. Estimate each line as low / likely / high:

| Workstream | What drives its size |
|---|---|
| Assessment spike and baseline | Throwaway upgrade branch; record ~20 searches with results before touching anything |
| CMS 13 platform: packages, API changes, Applications model, add-ons | `SiteDefinition.Current`, `ServiceLocator`, add-ons with no CMS 13 version |
| Commerce 14 → 15 | `Mediachase.*` usage; whether cart, orders and payments are in scope |
| Find → Optimizely Graph: content and catalog search, facets, Best Bets | **Usually the largest line.** Find files with query or facet logic; the hidden costs below |
| Content model: list properties and serialization | Newtonsoft attributes on list properties |
| Editor sign-in: Opti ID setup and role mapping | Number of custom editor roles |
| QA, UAT support and DXP cutover | Environments; search baseline; project migration |
| Project management and client coordination | Proportional to the rest |

Optional lines to price separately: AI enablement (MCP server, Opti ID permissions, editor training); converting list properties to blocks so agents and Visual Builder can edit them; replacing `ServiceLocator` with dependency injection.

## Hidden costs to price into the spike

None of these fail the build. All of them happened on a real Jaxon upgrade.

| Item | Workstream it inflates | Detail |
|---|---|---|
| Graph has no UnifiedSearch; pages and files are separate roots | Find → Graph | [[search-to-graph\|Search → Graph]] §4 |
| Graph indexing is opt-in; flags are database state that doesn't promote | Find → Graph, QA | [[search-to-graph\|Search → Graph]] §1, §9 |
| Display-time filtering breaks `total` and pagination | Find → Graph | [[search-to-graph\|Search → Graph]] §8 |
| Best Bets inventory runs larger than assumed; external-URL ones can't migrate | Find → Graph | [[graph-vs-search-navigation\|Graph vs S&N]] (SQL inventory), [[search-to-graph\|Search → Graph]] §12 |
| `IValidate<T>` validators silently unregistered | Platform | [[validator-registration-audit\|Validator Registration Audit]] |
| EnvironmentSynchronizer removes hostnames added in production admin | Cutover | [[applications-model\|Applications Model]] |
| Opti ID custom roles need the token `groups` claim | Editor sign-in | [[opti-id-admin-center\|Opti ID]] |
| Migrated audiences: "This criterion failed to load" | Platform | [[post-upgrade-gotchas\|Post-Upgrade Gotchas]] |
| `MapContent()` route order (`CMS-51344`) | Platform | [[post-upgrade-gotchas\|Post-Upgrade Gotchas]] |
| Custom CMS admin reports need the CMS 13 shell | Platform | [[custom-admin-tools\|Custom Admin Tools]] |
| DB restore: Graph stale, sitemap 404 on non-production hosts | QA, cutover | [[post-upgrade-gotchas\|Post-Upgrade Gotchas]] |
| Cold-start cache poisoning after production deploys | Cutover | [[post-upgrade-gotchas\|Post-Upgrade Gotchas]] |

> [!note] Graph full sync is minutes, not a cutover risk
> Measured at about 6 minutes for about 27,650 items on all three DXP environments. Don't pad the cutover window for it; measure it on Integration. Project migration is recommended because of the breaking Graph schema change, not sync time. See [[graph-vs-search-navigation|Graph vs S&N]].

## Commerce 14 → 15: what we know

*As of 2026-11-19.* CMS 13 does not support Commerce 14, so the two upgrades ship together. Commerce 15.5.0 and `Optimizely.Graph.Commerce` 15.5.0 are on the feed. The wiki has no field findings from a completed Commerce 15 upgrade yet; the points below come from the Christie assessment.

```bash
curl -s "https://nuget.optimizely.com/feed/packages.svc/FindPackagesById()?id='EPiServer.Commerce'" \
  | grep -oE '<d:Version[^>]*>[^<]+' | sed 's/.*>//' | sort -V | tail -3
```

- The biggest Commerce 15 breaking changes are in **order and payment processing**. A catalog-only site avoids most of them
- Commerce 15 moves from Newtonsoft.Json to System.Text.Json and removes `BinaryFormatter`, like CMS 13
- The catalog can be indexed into Graph, replacing Find Commerce for product search and facets

## Related

- [[upgrade-accelerator|CMS 13 Upgrade Accelerator]]: the phase-by-phase engagement workflow
- [[work/clients/christie/index|Christie Digital]] · [[work/clients/cambro/index|Cambro]] · [[work/clients/oxychem/index|OxyChem]]
- [[breaking-changes|Breaking Changes]] · [[post-upgrade-gotchas|Post-Upgrade Gotchas]]

## Sources

- Josh Apgar, *Christie Digital — Optimizely CMS 13 Upgrade Assessment*, 2026-11-19 (internal): relative sizing, workstream breakdown, Christie code counts
- Optimizely: *Breaking changes in Commerce 15*, as cited by the Christie assessment
- Optimizely NuGet feed, Commerce versions checked 2026-11-19
