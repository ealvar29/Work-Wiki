---
title: "CMS 13 Upgrade — Integration Test Plan"
tags:
  - optimizely
  - cms
  - upgrade
  - testing
  - qa
  - uat
---

The verification plan to run once a CMS 12 → 13 upgrade has been **deployed to the Integration environment** and before it is promoted to Preproduction/Production. It exists to answer one question with evidence: *does the upgraded site do everything the CMS 12 site did?* Use it for internal QA sign-off **and** as the script you hand a client for their UAT.

This is the "is it done?" gate. For *doing* the upgrade see [[upgrade-checklist|Upgrade Checklist]]; for diagnosing breakage see [[post-upgrade-gotchas|Post-Upgrade Gotchas]].

## How to use this plan

- **Two owners.** Rows marked **[J]** are Jaxon technical checks (build health, APIs, config, Graph plumbing). Rows marked **[C]** are client business-user checks (editing, publishing, does-my-content-look-right). Rows marked **[J+C]** should be walked through together.
- **Copy the tables per client.** Fill the **Result** column with Pass / Fail / N/A and put defects in the tracker referenced by ID.
- **Gate before UAT.** Section 0 (Smoke Gate) must be 100% green before you invite the client in. There is no point running editorial UAT on a build that won't index or won't let editors log in.
- **Baseline first.** Where behaviour is subjective ("does search return the right results?"), capture the equivalent result on the *current production CMS 12 site* first so you're comparing against a known-good baseline, not a memory.

## Integration-environment prerequisites

Integration is not "done deploying" just because the slot is green. Confirm these before testing — most false-negative test failures trace back to one of them:

- [ ] Package deploy to Integration succeeded and the app **booted clean** (no `TypeScanner`/`CustomAttributeFormatException` in logs — see [[post-upgrade-gotchas|gotchas]]).
- [ ] **Content Graph Full Re-index** job has been run **against the Integration DB** — index keys are per-environment, so Integration has its own empty index until you run it. Search tests will all fail otherwise.
- [ ] Blob content is present (media copied/synced to this environment's storage) — a fresh environment has empty `blobs`.
- [ ] The **Application** is configured in Admin (In-Process app, hostname, start page) per [[applications-model|Applications Model]].
- [ ] Opti-ID / SSO for this environment is wired, or you have a working local-login fallback (see [[opti-id-admin-center|Opti ID & Admin Center]]).
- [ ] `appsettings` for Integration has the correct Graph keys, connection string, and CDN/host config.

---

## 0. Smoke Gate — must pass before UAT

| ID | Test | Expected | Owner | Result |
|---|---|---|---|---|
| S1 | App responds on the Integration URL | Home page returns 200, renders | [J] | |
| S2 | Boot logs clean | No startup exceptions, no assembly-scanner crash | [J] | |
| S3 | Editor loads (see note below) | Editor UI renders, no console errors | [J] | |
| S4 | An editor can log in | Auth succeeds (Opti ID/SAML or fallback) | [J+C] | |
| S5 | Create + publish a test page | Page saves, publishes, renders on front-end | [J] | |
| S6 | Search returns results | A known query returns ≥1 result (proves Graph index) | [J] | |

> [!warning] S3 — check the editor URL for *your* build before calling it a failure
> The editor path has moved twice, and hitting the wrong one returns a bare 404 (or a redirect to the home page) that reads exactly like a broken login. Don't debug auth until you've confirmed the path.
>
> | Build | Editor path |
> |---|---|
> | CMS 12 | `/episerver/cms/` |
> | CMS 13, earlier Shell | `/Optimizely/CMS/` |
> | CMS 13 + Shell 13.1.x / Opti ID | **`/ui/cms`** |
>
> **Determine it authoritatively from your own app:** the startup log emits the Shell module registration, e.g. `ShellModule Name='Shell' RouteBasePath='ui/'`. That prefix *is* the answer — trust it over any doc, including this one.
>
> Verified on OxyChem (CMS 13.1.0 + Opti ID, 2026-07-29): `/ui/cms` and `/ui/CMS/` both 302 to the Opti ID login — the path is **case-insensitive and the trailing slash is optional**. `/Optimizely/CMS/`, `/EPiServer/CMS/` and `/ui/` alone all redirect to the site home instead. Note the editor deep-links with a fragment, e.g. `/ui/cms#context=epi.cms.contentdata:///13135`.

If any Smoke Gate row fails, stop and fix before proceeding. Everything below assumes S1–S6 are green.

---

## 1. Authentication & access **[J+C]**

| ID | Test | Expected | Result |
|---|---|---|---|
| A1 | Editor login (each auth method in use) | Successful login, correct landing | |
| A2 | Role/permission mapping | Editors, admins, and restricted roles see only what they should | |
| A3 | Admin access to Admin/Settings | Admin UI reachable for admin role only | |
| A4 | Logout / session expiry | Clean logout, re-auth required | |
| A5 | Front-end (public) auth, if any | Members/gated content still gates correctly (unaffected by Opti ID) | |

## 2. Editorial — content management **[C]**

| ID | Test | Expected | Result |
|---|---|---|---|
| E1 | Create a page of each major page type | All types instantiate, all properties render in the editor | |
| E2 | Edit + save + publish | Changes persist and appear on the site | |
| E3 | All property editors work | Rich text, links, images, blocks, custom editors all usable | |
| E4 | Content Area add/remove/reorder blocks | Blocks render in order; no `FilteredItems` regressions | |
| E5 | Move / copy / delete / restore from trash | Tree operations behave; delete + recycle bin works | |
| E6 | Versioning & compare | Version history intact, compare works, revert works | |
| E7 | Scheduled publish | A page set to publish later goes live at the right time | |
| E8 | Draft / preview | Preview shows unpublished changes accurately | |
| E9 | Blocks (shared + local) | Shared blocks editable and referenced correctly | |

> **Watch item:** if "Unable to create page" appears, it's the `MapContent()` route-order bug (CMS-51344), not a data problem — see [[post-upgrade-gotchas|gotchas]].

## 3. Visual Builder & editing experience **[C]**

| ID | Test | Expected | Result |
|---|---|---|---|
| V1 | Open a page in Visual Builder | Canvas loads, existing content shows | |
| V2 | Drag/drop layout + sections | Components place and render | |
| V3 | On-Page Editing (if enabled) | Inline edits save (see OPE flag in [[upgrade-checklist]]) | |
| V4 | Content Variations / experiments (if used) | Variations render and can be created | |

See [[visual-builder|Visual Builder]] for the feature model.

## 4. Search — Optimizely Graph **[J+C]**

The single highest-risk area, because Search & Navigation was fully replaced. Test against the CMS 12 baseline.

| ID | Test | Expected | Result |
|---|---|---|---|
| G1 | Full re-index completes | Job finishes without error; index populated | |
| G2 | Site search returns relevant results | Parity with CMS 12 baseline for the same queries | |
| G3 | Filters / facets | Category, date, content-type filters work | |
| G4 | Autocomplete / suggestions (if used) | Suggestions return | |
| G5 | Newly published content is findable | New page appears in search after publish + reindex delay | |
| G6 | Unpublished/expired excluded | Draft/expired content does NOT appear | |
| G7 | Access-filtered results | Restricted content hidden from unauthorized users | |
| G8 | Empty/no-result query | Graceful "no results", no 500 | |

See [[search-to-graph|Search → Graph Migration]] and [[graph-sdk|Graph SDK]].

## 5. Front-end rendering **[C]**

| ID | Test | Expected | Result |
|---|---|---|---|
| F1 | Every template/page type renders | No missing views, no AutoMapper null-ref on image pages | |
| F2 | Navigation & menus | Menus, breadcrumbs, footer links resolve | |
| F3 | Responsive / mobile | Layouts hold at breakpoints | |
| F4 | Cross-browser spot check | Chrome, Safari, Edge, Firefox render consistently | |
| F5 | Static assets load | CSS/JS/fonts from `wwwroot` (check webpack `output.path`) | |
| F6 | Personalization / visitor groups (if used) | Targeted content shows for the right groups | |

## 6. Media & DAM **[C]**

| ID | Test | Expected | Result |
|---|---|---|---|
| M1 | Existing media displays | Images/files render on migrated pages | |
| M2 | Upload new media | Upload succeeds, thumbnail generates | |
| M3 | Image in content + rendering | Picked image renders front-end | |
| M4 | DAM asset picker (if DAM in use) | Assets browse/select/deliver via CDN | |
| M5 | Documents/downloads | PDF/doc links resolve and download | |

See [[dam-integration|DAM Integration]]. Note DAM requires Opti ID.

## 7. Forms **[C]**

| ID | Test | Expected | Result |
|---|---|---|---|
| FO1 | Existing forms render | All fields present | |
| FO2 | Submit a form | Submission succeeds, stored/emailed as configured | |
| FO3 | Validation | Required/format validation fires | |
| FO4 | Confirmation / redirect | Post-submit behaviour correct | |
| FO5 | View submissions in admin | Data readable | |

## 8. Scheduled jobs & background work **[J]**

| ID | Test | Expected | Result |
|---|---|---|---|
| J1 | Scheduled Jobs admin page opens | No `SortIndex` crash from legacy jobs (see gotchas) | |
| J2 | Each custom job runs manually | Completes, correct result | |
| J3 | Job schedules intact | Recurring jobs still scheduled | |
| J4 | Import/export or sync jobs | Any content/data sync jobs succeed | |

## 9. Integrations & APIs **[J]**

| ID | Test | Expected | Result |
|---|---|---|---|
| I1 | REST / Management API endpoints | Auth + CRUD behave per [[cms-rest-api|REST API v1]] | |
| I2 | Graph query API (headless clients) | Downstream consumers get expected shape | |
| I3 | Third-party integrations | CRM, marketing, payment, analytics still fire | |
| I4 | Webhooks / outbound events | Events dispatched | |
| I5 | Vendor add-ons re-enabled | Each CMS 13-compatible package functions (see agent-quickstart blocked list) | |

## 10. Redirects, URLs & SEO **[J+C]**

| ID | Test | Expected | Result |
|---|---|---|---|
| R1 | URL structure unchanged | Existing page URLs resolve identically (SEO-critical) | |
| R2 | 301 redirects intact | NotFoundHandler / redirect rules still fire | |
| R3 | Canonical / meta / sitemap | `<canonical>`, meta tags, `sitemap.xml`, `robots.txt` correct | |
| R4 | 404 handling | Custom 404 renders | |
| R5 | Language URL segments | Localized URLs generate correctly (see [[translations]]) | |

## 11. Multi-site / multi-language **[J+C]** *(if applicable)*

| ID | Test | Expected | Result |
|---|---|---|---|
| ML1 | Each site resolves on its host | Correct site by hostname (Applications model) | |
| ML2 | Language switching | All languages selectable, content shows | |
| ML3 | Fallback languages | Fallback chain behaves | |
| ML4 | Per-site config isolation | Sites don't bleed content/config | |

## 12. Performance & stability **[J]**

| ID | Test | Expected | Result |
|---|---|---|---|
| P1 | Key page load times | Within tolerance of CMS 12 baseline (expect ≥ parity on .NET 10) | |
| P2 | No memory leak / restart loop | Stable over a sustained session | |
| P3 | Error logs during test window | No unexpected exceptions accumulating | |
| P4 | Cold start | Acceptable startup time | |

---

## Severity classification

Rank every defect so promotion decisions are objective:

| Severity | Definition | Effect on go-live |
|---|---|---|
| **Blocker** | Core function broken (can't publish, site down, search dead, login broken) | Stops promotion |
| **Major** | Significant feature degraded, workaround exists | Fix before Production; may promote to Preprod |
| **Minor** | Cosmetic or edge-case | Log, fix in follow-up |

## Sign-off criteria

Promote off Integration only when:

- [ ] Smoke Gate (Section 0) — 100% Pass
- [ ] Sections 1–12 executed; every applicable row has a result
- [ ] **Zero Blocker** and **zero unresolved Major** defects
- [ ] Search parity confirmed against CMS 12 baseline (Section 4)
- [ ] URL/redirect/SEO parity confirmed (Section 10)
- [ ] Client business-user sign-off obtained on **[C]** sections
- [ ] Jaxon technical sign-off obtained on **[J]** sections

## Sign-off record

| Role | Name | Date | Pass / Conditional / Fail | Notes |
|---|---|---|---|---|
| Jaxon technical lead | | | | |
| Client product owner | | | | |
| Client editorial lead | | | | |

---

## Related

- [[upgrade-checklist|Upgrade Checklist]] — the build-side steps this plan verifies
- [[post-upgrade-gotchas|Post-Upgrade Gotchas]] — first stop when a test fails
- [[agent-quickstart|AI Agent Quickstart]] — full upgrade workflow + vendor-blocked package list
- [[search-to-graph|Search → Graph Migration]] · [[graph-sdk|Graph SDK]] — Section 4 depth
- [[applications-model|Applications Model]] — Sections 0 & 11 setup

## Sources

- Jaxon Digital internal upgrade methodology, 2026
- Derived from field experience captured in [[post-upgrade-gotchas]] (OxyChem CMS 13.0.2, May–June 2026)
