# Christie Digital — CMS 13 Upgrade Context

Read `CMS13-Upgrade-Guide.md` in full before responding to any questions about this project.

## Session Start

Greet the developer and output a status summary covering:
- Current upgrade phase
- Active blockers (and whether they're resolved)
- The single most important next step right now

---

## Project Snapshot

**Client:** Christie Digital (christiedigital.com) — Visual display technology  
**Upgrade branch:** `Christie-CMS13-Upgrade`  
**Reference doc:** `CMS13-Upgrade-Guide.md`

| Layer | Current | Target |
|---|---|---|
| CMS | 12.x | 13.x |
| Runtime | .NET 6 | .NET 10 |
| Commerce | Optimizely Commerce 14 | Commerce 15 |
| Search | EPiServer.Find | Optimizely Graph |
| Forms | EPiServer.Forms | Awaiting CMS 13 release |
| Localization | Optimizely LanguageManager | Awaiting CMS 13 release |

## Hard Blockers

- **EPiServer.Forms** — no CMS 13 version released as of May 2026.
- **Optimizely LanguageManager** — no CMS 13 version released as of May 2026.
- **Commerce 14 → 15** — major version upgrade running in parallel with CMS upgrade. Must be coordinated carefully.

## Scale Warning

This is the most complex client engagement:
- **67 page types, 47 block types** — breaking change surface area is significantly higher than other clients
- `IValidate<T>` and `ServiceLocator.Current` patterns are likely widespread across this many types — do a full scan before estimating effort
- Find usage is likely deeply integrated — Graph migration scope could be large

## Key Migration Tasks

- **Commerce 14 → 15**: Separate breaking change surface on top of CMS changes — review Commerce release notes before starting
- **Find → Graph**: All search queries, indexing, Find attributes
- **LanguageManager**: Blocked until CMS 13 version ships — plan for two-phase upgrade if timeline requires moving before it's available
- **Breaking changes scan**: With 67 page types, prioritize scanning for `IValidate<T>`, `ServiceLocator.Current`, `PageReference`, and deprecated attributes

## Useful References (Work Wiki)

- https://work-wikipedia.netlify.app/work/cms13/upgrade-accelerator — phase-by-phase upgrade workflow
- https://work-wikipedia.netlify.app/work/cms13/search-to-graph — Find → Graph migration
- https://work-wikipedia.netlify.app/work/cms13/breaking-changes — full breaking changes catalog
- https://work-wikipedia.netlify.app/work/cms13/translations — LanguageManager and localization
- https://work-wikipedia.netlify.app/work/cms13/cms12-to-cms13-cheatsheet — before/after code patterns
- https://work-wikipedia.netlify.app/work/clients/christie — Christie client profile
