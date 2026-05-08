---
title: "CMS 13 World Tour 2026 — Team Briefing"
tags:
  - optimizely
  - cms
  - world-tour
  - training
---

# CMS 13 World Tour 2026 — Team Briefing

Eduardo attended the Optimizely CMS 13 World Tour on May 7, 2026 and passed the **CMS 13 Technical Sales Accreditation**. This page is the distilled version — everything the team needs to know, with links to the detailed pages for each topic.

Full technical notes: [[world-tour-2026|CMS 13 World Tour 2026 Notes]]

---

## The 3 Non-Negotiables

Every CMS 12 → 13 upgrade must include these three things. Nothing else is optional if these aren't done:

| Requirement | What It Means |
|---|---|
| **.NET 10** | Project must retarget — no .NET 8 support |
| **Optimizely Graph** | Replaces Search & Navigation entirely — no migration path around it |
| **Opti-ID** | Required SSO layer — without it, Opal, OCP, DAM, and GEO Analytics are unavailable |

Everything else (Visual Builder, Opal, DAM, OCP) is additive once these are in place.

---

## Upgrade Planning — What to Know Before Starting

These came directly from the "Before you start" slides and are the things that bite projects that skip the planning phase.

**Involve Optimizely early.** Account provisioning for Opti-ID, OCP, Opal, and DAM requires the Customer Success Manager — it is not self-service. Only S&N → Graph and CMS 11 → 12 upgrades are currently self-service. Connect with the CSM at project kickoff, not mid-upgrade.

**Plan for organizational change.** Login, role management, and DAM asset workflows all change for editors and admins. A CMS 13 upgrade is not just a dev project — it needs a change management plan.

**GDPR/compliance first.** Opti-ID, Opal, and Graph introduce new data sub-processors. Get DPO or legal sign-off before the project starts.

**DXP infrastructure options:**
- *New application* — request from CSM; fresh environment; duplicated infra is only available for a limited time
- *Upgrade in place* — self-service via deployment slots; production goes read-only during the slot swap

See [[upgrading-from-cms12|Upgrading from CMS 12]] for the full checklist and official 5-step upgrade path.

---

## The Official 5-Step Upgrade Path

Steps can be done in one project or split across multiple releases:

1. Migrate to **Opti-ID**
2. Migrate to **Optimizely Graph** (replace Search & Navigation)
3. Prepare for **.NET 10** (retarget, fix dependencies)
4. **Upgrade** CMS packages to 13.x
5. **Enable new features** — Visual Builder, Opal, DAM, OCP as desired

---

## New Features Worth Knowing

### Opal — AI Built Into the CMS

Opal is Optimizely's AI agent platform, included with CMS 13 when Opti-ID is set up. Key capabilities:
- **OpalChat** — conversational AI embedded directly in the CMS editor
- **AI-powered translation** — trigger via "Add Language"; Opal drafts the translated content
- Orchestrates AI agents across the content lifecycle

### GEO Analytics — AI Crawler Visibility

A new Optimizely Reporting dashboard (PaaS only, requires Opti-ID) that shows which AI platforms are crawling your site and whether that activity is turning into real AI referrals.

Key metric: **Crawl-to-Refer Ratio** — compares how often an AI bot visits vs. how often your content gets surfaced in AI responses (ChatGPT, Perplexity, Claude, etc.). Goal is to drive the ratio down.

This is the concrete answer to "is our content showing up in AI search?" See [[geo-analytics|GEO Analytics]] for full details.

### Visual Builder — New Default Editor

Visual Builder is now the default editing experience. On-Page Editing is off by default (not removed — can be re-enabled).

Content structure: **Experience → Section → Row → Column → Element**

Blocks become Visual Builder elements by adding `CompositionBehaviors = ["elementEnabled"]` to the `[ContentType]` attribute. See [[visual-builder|Visual Builder]] for setup.

### OCP — Optimizely Connect Platform

Integration middleware built into CMS 13. Two tiers:

| Tier | Cost | What you get |
|---|---|---|
| Included | Free | Scheduled jobs, data syncs, webhooks, CMS UI Extensions, config forms |
| Paid | Additional license | Private apps, object storage |

Replaces custom integration code for most common scenarios.

### Embedded DAM

New DAM experience built into the CMS editor. Replaces the legacy DAM asset picker (which is being retired). Requires Opti-ID. 4-step setup — see [[world-tour-2026|full notes]] for config keys.

---

## Developer Gotchas

| Gotcha | What to do |
|---|---|
| Static service accessors removed (`Principal.Current`, `ServiceLocator`) | Use constructor injection |
| `IApplicationResolver` doesn't return start page | Cast to `IRoutableApplication`, then use `StartPageReference` |
| Shared abstract base class for pages + experiences breaks | Use a `[ContentType]` interface inheriting `IContent` as the shared contract instead |
| Conventions API removed | Use explicit `[ContentType]` and `[Display]` attributes |
| Search & Navigation fully deprecated | Must migrate to Graph before upgrading — no CMS 13 support path |
| Commerce 14 not compatible | Wait for Commerce 15 |

Full catalog: [[breaking-changes|Breaking Changes in CMS 13]]

---

## Deployment Models — Quick Reference

| Capability | On Premise | PaaS | SaaS |
|---|---|---|---|
| Custom .NET code (MVC InProc) | Yes | Yes | **No** |
| Visual Builder | Yes | Yes | Yes |
| Opal + Graph + OCP | Yes | Yes | Yes |
| GEO Analytics | Yes | Yes | Yes |
| Frontend ACL / Personalization / Projects | Yes ¹ | Yes ¹ | No |
| Multi-Site / Multi-Language | Yes | Yes | Mostly ² |

¹ Requires MVC InProc — not available in headless/decoupled setups.
² Validate your specific multi-site configuration with Optimizely before committing to SaaS.

**SaaS is not appropriate** for projects with custom middleware, MVC filter pipelines, or frontend ACL/personalization requirements.

---

## Detailed Pages

| Topic | Page |
|---|---|
| Full World Tour technical notes | [[world-tour-2026|CMS 13 World Tour 2026 Notes]] |
| Upgrade checklist + before you start | [[upgrading-from-cms12|Upgrading from CMS 12]] |
| GEO Analytics dashboard | [[geo-analytics|GEO Analytics]] |
| Visual Builder setup | [[visual-builder|Visual Builder]] |
| Graph C# SDK | [[graph-sdk|Graph C# SDK]] |
| S&N → Graph migration | [[search-to-graph|Search & Navigation → Graph Migration]] |
| Breaking changes full catalog | [[breaking-changes|Breaking Changes]] |
| Opal / AI Assistant | [[ai-assistant|AI Assistant v4]] |
