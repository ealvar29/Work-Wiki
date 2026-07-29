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

- **Two owners.** Rows marked **[Agency]** are Jaxon technical checks (build health, APIs, config, Graph plumbing). Rows marked **[Client]** are business-user checks (editing, publishing, does-my-content-look-right). Rows marked **[Both]** should be walked through together.
- **Copy the tables per client.** Fill the **Result** column with Pass / Fail / N/A and put defects in the tracker referenced by ID.
- **Gate before UAT.** Section 0 (Smoke Gate) must be 100% green before you invite the client in. There is no point running editorial UAT on a build that won't index or won't let editors log in.
- **Baseline first.** Where behaviour is subjective ("does search return the right results?"), capture the equivalent result on the *current production CMS 12 site* first so you're comparing against a known-good baseline, not a memory.
- **Don't hand these tables to the client as-is.** They're our working instrument. See [Turning this into client tickets](#turning-this-into-client-tickets) at the bottom.

### Row ID prefixes

Each section has its own prefix so a defect can be referenced unambiguously ("SRCH2 failed") without naming the section.

| Prefix | Section | | Prefix | Section |
|---|---|---|---|---|
| `SMOKE` | 0 — Smoke Gate | | `MEDIA` | 6 — Media & DAM |
| `AUTH` | 1 — Authentication | | `FORM` | 7 — Forms |
| `EDIT` | 2 — Editorial | | `JOB` | 8 — Scheduled jobs |
| `VB` | 3 — Visual Builder | | `API` | 9 — Integrations & APIs |
| `SRCH` | 4 — Search (Graph) | | `URL` | 10 — Redirects, URLs, SEO |
| `PAGE` | 5 — Front-end rendering | | `SITE` | 11 — Multi-site / language |
| | | | `PERF` | 12 — Performance |

> [!note] These prefixes changed in July 2026
> They used to be single letters, and two pairs were genuinely confusable in practice: `F` (front-end) vs `FO` (forms), and rows `J1`–`J4` (scheduled jobs) sitting in a section whose owner tag was also `J` (Jaxon). Owner tags became `[Agency]`/`[Client]`/`[Both]` for the same reason. The sections and the tests themselves are unchanged, so an older copy still maps across cleanly.

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
| SMOKE1 | App responds on the Integration URL | Home page returns 200, renders | [Agency] | |
| SMOKE2 | Boot logs clean | No startup exceptions, no assembly-scanner crash | [Agency] | |
| SMOKE3 | Editor loads (see note below) | Editor UI renders, no console errors | [Agency] | |
| SMOKE4 | An editor can log in | Auth succeeds (Opti ID/SAML or fallback) | [Both] | |
| SMOKE5 | Create + publish a test page | Page saves, publishes, renders on front-end | [Agency] | |
| SMOKE6 | Search returns results | A known query returns ≥1 result (proves Graph index) | [Agency] | |

> [!warning] SMOKE3 — check the editor URL for *your* build before calling it a failure
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

If any Smoke Gate row fails, stop and fix before proceeding. Everything below assumes SMOKE1–SMOKE6 are green.

---

## 1. Authentication & access **[Both]**

| ID | Test | Expected | Result |
|---|---|---|---|
| AUTH1 | Editor login (each auth method in use) | Successful login, correct landing | |
| AUTH2 | Role/permission mapping | Editors, admins, and restricted roles see only what they should | |
| AUTH3 | Admin access to Admin/Settings | Admin UI reachable for admin role only | |
| AUTH4 | Logout / session expiry | Clean logout, re-auth required | |
| AUTH5 | Front-end (public) auth, if any | Members/gated content still gates correctly (unaffected by Opti ID) | |

## 2. Editorial — content management **[Client]**

| ID | Test | Expected | Result |
|---|---|---|---|
| EDIT1 | Create a page of each major page type | All types instantiate, all properties render in the editor | |
| EDIT2 | Edit + save + publish | Changes persist and appear on the site | |
| EDIT3 | All property editors work | Rich text, links, images, blocks, custom editors all usable | |
| EDIT4 | Content Area add/remove/reorder blocks | Blocks render in order; no `FilteredItems` regressions | |
| EDIT5 | Move / copy / delete / restore from trash | Tree operations behave; delete + recycle bin works | |
| EDIT6 | Versioning & compare | Version history intact, compare works, revert works | |
| EDIT7 | Scheduled publish | A page set to publish later goes live at the right time | |
| EDIT8 | Draft / preview | Preview shows unpublished changes accurately | |
| EDIT9 | Blocks (shared + local) | Shared blocks editable and referenced correctly | |

> **Watch item:** if "Unable to create page" appears, it's the `MapContent()` route-order bug (CMS-51344), not a data problem — see [[post-upgrade-gotchas|gotchas]].

## 3. Visual Builder & editing experience **[Client]**

| ID | Test | Expected | Result |
|---|---|---|---|
| VB1 | Open a page in Visual Builder | Canvas loads, existing content shows | |
| VB2 | Drag/drop layout + sections | Components place and render | |
| VB3 | On-Page Editing (if enabled) | Inline edits save (see OPE flag in [[upgrade-checklist]]) | |
| VB4 | Content Variations / experiments (if used) | Variations render and can be created | |

See [[visual-builder|Visual Builder]] for the feature model.

## 4. Search — Optimizely Graph **[Both]**

The single highest-risk area, because Search & Navigation was fully replaced. Test against the CMS 12 baseline.

| ID | Test | Expected | Result |
|---|---|---|---|
| SRCH1 | Full re-index completes | Job finishes without error; index populated | |
| SRCH2 | Site search returns relevant results | Parity with CMS 12 baseline for the same queries | |
| SRCH3 | Filters / facets | Category, date, content-type filters work | |
| SRCH4 | Autocomplete / suggestions (if used) | Suggestions return | |
| SRCH5 | Newly published content is findable | New page appears in search after publish + reindex delay | |
| SRCH6 | Unpublished/expired excluded | Draft/expired content does NOT appear | |
| SRCH7 | Access-filtered results | Restricted content hidden from unauthorized users | |
| SRCH8 | Empty/no-result query | Graceful "no results", no 500 | |

See [[search-to-graph|Search → Graph Migration]] and [[graph-sdk|Graph SDK]].

## 5. Front-end rendering **[Client]**

| ID | Test | Expected | Result |
|---|---|---|---|
| PAGE1 | Every template/page type renders | No missing views, no AutoMapper null-ref on image pages | |
| PAGE2 | Navigation & menus | Menus, breadcrumbs, footer links resolve | |
| PAGE3 | Responsive / mobile | Layouts hold at breakpoints | |
| PAGE4 | Cross-browser spot check | Chrome, Safari, Edge, Firefox render consistently | |
| PAGE5 | Static assets load | CSS/JS/fonts from `wwwroot` (check webpack `output.path`) | |
| PAGE6 | Personalization / visitor groups (if used) | Targeted content shows for the right groups | |

## 6. Media & DAM **[Client]**

| ID | Test | Expected | Result |
|---|---|---|---|
| MEDIA1 | Existing media displays | Images/files render on migrated pages | |
| MEDIA2 | Upload new media | Upload succeeds, thumbnail generates | |
| MEDIA3 | Image in content + rendering | Picked image renders front-end | |
| MEDIA4 | DAM asset picker (if DAM in use) | Assets browse/select/deliver via CDN | |
| MEDIA5 | Documents/downloads | PDF/doc links resolve and download | |

See [[dam-integration|DAM Integration]]. Note DAM requires Opti ID.

## 7. Forms **[Client]**

| ID | Test | Expected | Result |
|---|---|---|---|
| FORM1 | Existing forms render | All fields present | |
| FORM2 | Submit a form | Submission succeeds, stored/emailed as configured | |
| FORM3 | Validation | Required/format validation fires | |
| FORM4 | Confirmation / redirect | Post-submit behaviour correct | |
| FORM5 | View submissions in admin | Data readable | |

## 8. Scheduled jobs & background work **[Agency]**

| ID | Test | Expected | Result |
|---|---|---|---|
| JOB1 | Scheduled Jobs admin page opens | No `SortIndex` crash from legacy jobs (see gotchas) | |
| JOB2 | Each custom job runs manually | Completes, correct result | |
| JOB3 | Job schedules intact | Recurring jobs still scheduled | |
| JOB4 | Import/export or sync jobs | Any content/data sync jobs succeed | |

## 9. Integrations & APIs **[Agency]**

| ID | Test | Expected | Result |
|---|---|---|---|
| API1 | REST / Management API endpoints | Auth + CRUD behave per [[cms-rest-api|REST API v1]] | |
| API2 | Graph query API (headless clients) | Downstream consumers get expected shape | |
| API3 | Third-party integrations | CRM, marketing, payment, analytics still fire | |
| API4 | Webhooks / outbound events | Events dispatched | |
| API5 | Vendor add-ons re-enabled | Each CMS 13-compatible package functions (see agent-quickstart blocked list) | |

## 10. Redirects, URLs & SEO **[Both]**

| ID | Test | Expected | Result |
|---|---|---|---|
| URL1 | URL structure unchanged | Existing page URLs resolve identically (SEO-critical) | |
| URL2 | 301 redirects intact | NotFoundHandler / redirect rules still fire | |
| URL3 | Canonical / meta / sitemap | `<canonical>`, meta tags, `sitemap.xml`, `robots.txt` correct | |
| URL4 | 404 handling | Custom 404 renders | |
| URL5 | Language URL segments | Localized URLs generate correctly (see [[translations]]) | |

## 11. Multi-site / multi-language **[Both]** *(if applicable)*

| ID | Test | Expected | Result |
|---|---|---|---|
| SITE1 | Each site resolves on its host | Correct site by hostname (Applications model) | |
| SITE2 | Language switching | All languages selectable, content shows | |
| SITE3 | Fallback languages | Fallback chain behaves | |
| SITE4 | Per-site config isolation | Sites don't bleed content/config | |

## 12. Performance & stability **[Agency]**

| ID | Test | Expected | Result |
|---|---|---|---|
| PERF1 | Key page load times | Within tolerance of CMS 12 baseline (expect ≥ parity on .NET 10) | |
| PERF2 | No memory leak / restart loop | Stable over a sustained session | |
| PERF3 | Error logs during test window | No unexpected exceptions accumulating | |
| PERF4 | Cold start | Acceptable startup time | |

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
- [ ] Client business-user sign-off obtained on **[Client]** sections
- [ ] Jaxon technical sign-off obtained on **[Agency]** sections

## Sign-off record

| Role | Name | Date | Pass / Conditional / Fail | Notes |
|---|---|---|---|---|
| Jaxon technical lead | | | | |
| Client product owner | | | | |
| Client editorial lead | | | | |

---

## Turning this into client tickets

This plan is **our instrument, not theirs.** Pasting these tables into a client ticket looks efficient and reads terribly: prefixes, owner tags, section numbers and links to this wiki are all shorthand the client has no context for. Worse, it invites them to browse a hub that documents your *other* clients.

Learned the hard way on OxyChem, July 2026. The rules that came out of it:

**One area, one ticket, self-contained.** A forms ticket contains everything needed to test forms. No section numbers, no row IDs, no "see also", no links off to this wiki. If the client has to look something up, the ticket is unfinished.

**Title it in their language.** *"QA: Website forms"*, not *"QA §7: Forms [C]"*. *"QA: Page addresses, 404 page and SEO"*, not *"§10 Redirects/URLs"*.

**Lead with why.** One sentence on what changed and why it needs a human eye. *"The site's form engine was rebuilt — around 25 files were affected, so we'd rather have these checked than assume they're fine."* People test better when they know what they're guarding against.

**Number the checks 1..n and give each an expected result.** Plain "**You should see:** …" beats a Result column a business user won't fill in.

**Say what's safe.** *"This is a test copy. Submissions won't reach real customers — submit as often as you like."* Otherwise they test timidly, or not at all.

**State the content cutoff on every ticket.** A site restored from a backup is missing everything published since. Say the date up front or "this page is missing" comes back as a defect, repeatedly.

**Disclose known failures before they find them.** If a check will fail for a reason you already understand, say so in the ticket and tell them to skip it. *"The upgrade broke our redirects"* is a much worse conversation than *"known, fix scheduled."*

**Gate login-dependent checks explicitly.** Put them under a *"Once we've set up your login — don't attempt this yet"* heading. A client testing editor features with an under-privileged account generates failures that aren't defects and burns everyone's afternoon.

**Translate the jargon.** *Asset picker* → *digital asset library*. *URL structure* → *page addresses*. *404* → *the "page not found" page*.

**Tell them how to report.** Working / not working / not applicable, plus: what you did, what you expected, what happened, the page address, a screenshot. Ask whether the live site does the same thing — that single question separates new regressions from pre-existing behaviour and saves hours.

**Keep the mapping on our side.** Ticket ↔ section mapping belongs in the epic description or the client page, not in the client's ticket.

## Related

- [[upgrade-checklist|Upgrade Checklist]] — the build-side steps this plan verifies
- [[post-upgrade-gotchas|Post-Upgrade Gotchas]] — first stop when a test fails
- [[agent-quickstart|AI Agent Quickstart]] — full upgrade workflow + vendor-blocked package list
- [[search-to-graph|Search → Graph Migration]] · [[graph-sdk|Graph SDK]] — Section 4 depth
- [[applications-model|Applications Model]] — Sections 0 & 11 setup

## Sources

- Jaxon Digital internal upgrade methodology, 2026
- Derived from field experience captured in [[post-upgrade-gotchas]] (OxyChem CMS 13.0.2, May–June 2026)
