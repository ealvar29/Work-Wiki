---
title: "OxyChem — CMS 13 UAT Plan"
tags:
  - clients
  - oxychem
  - optimizely
  - cms
  - testing
  - qa
  - uat
---

The OxyChem-specific instance of the generic [[work/cms13/upgrade-test-plan|Integration Test Plan]]. It answers one question the generic plan can't: **of the tickets sitting in Ready for QA, which ones can the client actually test, and in what order?**

Jira epic: **OX-23** — *Upgrading OxyChem to CMS 13*.

> [!note] Hostnames deliberately omitted
> This wiki is public. Integration hostnames, portal links, and account names stay out of it — fill them into the environment block below in your working copy, or keep them in the ticket.

## Why triage at all

"Ready for QA" and "client-testable" are different axes. The question is not *is it done* — it is **does this ticket have a surface a business user can exercise and form an opinion about**. Roughly 60% of OX-23's children are framework, package, and config work whose only client-visible symptom is "the site still works," which is one regression sweep, not seventeen QA tickets. Handing the client all of them trains them to rubber-stamp.

## Environment

| | |
|---|---|
| Environment under test | Integration |
| Public site URL | *(fill in)* |
| Editor URL | *(Integration host)* **`/ui/cms`** — case-insensitive, trailing slash optional |
| CMS 12 baseline | the live production site |
| Content vintage | Integration restored from a production bacpac — record the date |

## Blocking prerequisite — editor role provisioning

**Do not send any editor-facing ticket until this is resolved.**

`CmsEditors` grants **Read only** on this site. Real edit and publish rights live on custom departmental roles (`OxyComEditors`, `OxyComPublishers`, and siblings), and Opti ID auto-maps only the built-in `CmsEditors`/`CmsAdmins`. A client tester handed a plain Opti ID account will be read-only, and every row in sections 2, 3, 6 and 7 will fail for the wrong reason.

Resolve by either granting the client's test account `CmsAdmins`, or completing the Okta/Entra group-name → Oxy role mapping so the custom roles arrive in the `groups` claim. See [[work/clients/oxychem/index#Known Quirks & Debt|Known Quirks]].

## Baseline capture — do this before UAT starts

Production has **not** been upgraded; it is still CMS 12 with EPiServer.Find. It is the *before* picture, not a separate environment to stand up.

Most test rows have an absolute pass/fail. A few do not — *"does search return the right results?"* has no answer without a reference. And search here was not upgraded but **replaced** (Find → Optimizely Graph): different engine, different relevance ranking. Results **will** differ, and the baseline is the only thing that sorts a difference into the right bucket:

| Observation | Verdict |
|---|---|
| Same pages return, ordered differently | Accept — different relevance model |
| A page that ranked highly on production does not appear at all | **Blocker** — indexing gap |
| Query returns nothing on both | Pre-existing, not a regression |

That last row is what pays for the exercise. Without a baseline you chase a defect through new code and discover the CMS 12 site does the same thing.

**How:** have the client pick 10–15 queries their visitors actually run — they know the content, we don't. Capture the top 10 results from production, then run the same set against Integration. The same before/after logic covers URL/redirect/SEO parity, but that half is mechanical and scriptable, so it stays with Jaxon.

**Tell the client up front:** content published to production after the bacpac date does not exist on Integration at all. A missing recent news item is a content-vintage difference, not a search defect. Say it before they start or it comes back as a bug.

---

## Wave 1 — send now (public site, no editor login required)

Unblocked by the role work, so this can run in parallel with it.

| Ticket | What the client tests | Plan section |
|---|---|---|
| **OX-51** Content Graph job + search | Site search parity against production. Highest-value client test — search was fully replaced. | §4 (G1–G8) |
| **OX-49** Blob migration | Images and PDFs render on pages; downloads resolve. | §6 (M1, M5) |
| **OX-58** Contact form styling | Contact form renders correctly on the site. | §5 |
| **OX-39** Forms *(public half)* | Existing forms render, submit, validate, confirm. | §7 (FO1–FO4) |
| **OX-40** Sitemaps *(if client owns SEO)* | `sitemap.xml` and `robots.txt` correct. | §10 (R3) |
| **OX-36** Frontend build *(optional)* | Site fully styled, no broken or unstyled pages. Really a visual regression sweep. | §5 (F1, F5) |

## Wave 2 — after the role grant lands (editor-facing)

| Ticket | What the client tests | Notes |
|---|---|---|
| **OX-44** Opti ID auth | *Their* editors logging in with MFA. | Still in development. **Send this first** — everything below depends on it. Only Jaxon has completed the round-trip so far. |
| **OX-56** Opal AI | In-editor chat, Opal tools, AI translation in the Add Language dialog. | Opti ID-gated by design. Needs org subscription, credits, and the CMS instance connected in Admin Center. See [[work/cms13/optimizely-opal\|Opal]]. |
| **OX-52** DAM | Asset picker browse / select / insert; assets deliver via CDN. | Working as of the last check. |
| **OX-42** AdvancedReviews | Create a review link, comment, approve. | Genuine stakeholder-workflow test. |
| **OX-41** ContentTypeIcons | Icons render in the editor page tree. | Cosmetic, low value, but visually verifiable. |
| **OX-39** Forms *(editor half)* | Build a new form; read submissions in admin. | §7 (FO5) |

## Jaxon-only — no client-observable surface

`OX-24` · `OX-25` · `OX-26` · `OX-27` · `OX-28` · `OX-29` · `OX-30` · `OX-31` · `OX-32` · `OX-33` · `OX-34` · `OX-35` · `OX-37` · `OX-38` · `OX-43` · `OX-45` · `OX-46`

Framework, package, and config work. Their only proof is that the site boots and renders, which Wave 1 covers implicitly. Two are worth a **note** to the client rather than a test ticket:

- **OX-33** — the editor URL changed to `/ui/cms`. Tell them, or you will burn a support round-trip on a redirect-to-home that reads as a login failure. `/Optimizely/CMS/` and `/EPiServer/CMS/` do **not** work here.
- **OX-31 / OX-37** — their observable results are folded into OX-49 and OX-51 respectively.

## Multi-site scope — decide before starting

OxyChem is a multi-site solution (six site definitions on Integration). Decide explicitly whether UAT covers all sites or the main one only. It changes how much baseline capture is needed and whether §11 (ML1–ML4) is in scope. Leaving it undecided is how a secondary site ships untested.

## Sign-off

Inherit the generic plan's [[work/cms13/upgrade-test-plan#Severity classification|severity classification]] and gate: **zero Blockers, zero unresolved Majors**, client sign-off on the **[C]** sections, Jaxon sign-off on the **[J]** sections.

| Role | Name | Date | Pass / Conditional / Fail | Notes |
|---|---|---|---|---|
| Jaxon technical lead | | | | |
| OxyChem product owner | | | | |
| OxyChem editorial lead | | | | |

## Related

- [[work/clients/oxychem/index|OxyChem client page]] — stack, status, known debt
- [[work/cms13/upgrade-test-plan|Integration Test Plan]] — the generic plan, full section detail
- [[work/cms13/post-upgrade-gotchas|Post-Upgrade Gotchas]] — first stop when a row fails
- [[work/cms13/search-to-graph|Search → Graph]] — §4 depth
