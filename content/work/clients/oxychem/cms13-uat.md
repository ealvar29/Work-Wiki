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

The OxyChem-specific instance of the generic [[work/cms13/upgrade-test-plan|Integration Test Plan]]. It answers one question the generic plan can't: **of everything we built, what can the client actually test, and in what order?**

Jira: **OX-61** *CMS 13 QA & UAT* (the testing epic) · **OX-23** *Upgrading OxyChem to CMS 13* (the delivery epic).

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
| Content vintage | Restored from a production backup taken **13 April 2026** — content published after that date is absent (stated on every client ticket) |

## Blocking prerequisite — editor role provisioning

**Do not send any editor-facing ticket until this is resolved.**

`CmsEditors` grants **Read only** on this site. Real edit and publish rights live on custom departmental roles (`OxyComEditors`, `OxyComPublishers`, and siblings), and Opti ID auto-maps only the built-in `CmsEditors`/`CmsAdmins`. A client tester handed a plain Opti ID account will be read-only, and every editorial check fails for the wrong reason.

Resolve by either granting the client's test account `CmsAdmins`, or completing the Okta/Entra group-name → Oxy role mapping so the custom roles arrive in the `groups` claim. See [[work/clients/oxychem/index#Known Quirks & Debt|Known Quirks]].

> [!warning] Optimizely ACLs are additive — there is no "deny"
> Effective permission is the **union** of every entry matching the user: their username, every role they hold, and `Everyone`. Adding a per-user row with only *Read* **grants** Read; it revokes nothing. You restrict someone by removing them from the roles that grant more, not by adding a narrower row.
>
> Observed live (2026-07-29): a test account with a per-user Read-only entry and only *Content Editors* in Admin Center could still edit and publish. Diagnose in this order: **stale session first** (claims are baked into the auth cookie at sign-in — a role change does nothing until re-login), then which branch was actually edited, then inheritance from ancestors, then what Opti ID is really emitting in the token.
>
> A genuinely read-only user = *Content Editors* in Admin Center (needed just to open the editor) **+ membership only in a Read-level role**. Never *Content Admins* — that resolves to `CmsAdmins`, full control, and overrides everything.

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

## The tickets

QA lives in its own epic (**OX-61**), separate from the upgrade epic OX-23, so OX-23 can close on delivery while testing and remediation track independently.

### Client-facing — written for OxyChem to work through directly

Plain language, self-contained, no codes or cross-references, **no links to this wiki**. Written to the rules in [[work/cms13/upgrade-test-plan#Turning this into client tickets|Turning this into client tickets]]. If you edit them, keep them that way.

| Ticket | Title the client sees | Covers | Login needed |
|---|---|---|---|
| **OX-66** | QA: Site search | Search parity vs the live site | No |
| **OX-67** | QA: Page layout and appearance | Every page type renders; nav, mobile, browsers | No |
| **OX-69** | QA: Website forms | Render, submit, delivery, validation | Partly |
| **OX-72** | QA: Page addresses, 404 page and SEO | URL parity, 404, sitemap | No |
| **OX-68** | QA: Images, documents and downloads | Media, PDFs, DAM picker | Partly |
| **OX-65** | QA: Creating and editing content in the CMS | Full editorial pass | Yes |

Login-gated checks sit under an explicit *"don't attempt this yet"* heading. Remove it when the account is ready.

### Jaxon-only

**OX-62** baseline capture · **OX-63** smoke gate · **OX-64** authentication and access · **OX-70** scheduled jobs · **OX-71** integrations and APIs · **OX-73** multi-site · **OX-74** performance.

These keep the plan's shorthand. Not for the client.

### Order

1. **OX-62** — capture the live-site search baseline. OX-66 can't be judged without it.
2. **OX-63** — smoke gate, 100% green before the client is invited in.
3. **No-login client tickets** — OX-66, OX-67, OX-72, plus the public halves of OX-68 and OX-69.
4. **Everything login-gated** — blocked on the access gate above.

## Implementation tickets are not QA tickets

The ~28 stories under OX-23 are indexed by *what changed*; regression risk is indexed by *what could break*. Around 17 of them (framework, package and config work) have **no client-observable surface at all** — verify and close those internally. Routing them to the client teaches them to rubber-stamp.

Two are worth a **note** rather than a ticket:

- **OX-33** — the editor URL is now `/ui/cms`. Tell them up front, or lose a support round-trip to a redirect-to-home that reads exactly like a login failure. `/Optimizely/CMS/` and `/EPiServer/CMS/` do **not** work here.
- **OX-31 / OX-37** — their observable results are folded into OX-68 and OX-66.

## Known items already disclosed to the client

Both are in the tickets, phrased for a business reader, with an explicit "don't report this":

- **Automatic redirects are off** pending the NotFoundHandler upgrade (**OX-75**) — flagged in OX-72 as a skip-for-now.
- **Publish pop-up error** — same root cause; content saves regardless — flagged in OX-65.

## Multi-site scope — decide before starting

OxyChem is a multi-site solution (six site definitions on Integration). Decide explicitly whether UAT covers all sites or the main one only. It changes how much baseline capture is needed and whether the multi-site section is in scope. Leaving it undecided is how a secondary site ships untested.

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
