---
title: "CMS 13 Flashcards"
tags:
  - optimizely
  - cms
  - training
  - flashcards
---

# CMS 13 Flashcards

Bite-size active recall. Each card shows a **question** — say your answer out loud, then click to flip and check. Do a few a day; the ones you miss are your study list.

> [!tip] How to use these
> Don't read passively. Answer *before* you expand. Getting it wrong then seeing the answer is what builds memory — that's the whole point of active recall. Pair with [[cms13-refresher|the Refresher]] for the full picture and the [[cms13-flashcards#Daily drill|daily drill]] at the bottom.

## Fundamentals

> [!question]- What are the 3 non-negotiables of every CMS 12 → 13 upgrade?
> **.NET 10**, **Optimizely Graph** (replaces Search & Navigation), and **Opti ID**. Everything else is additive.

> [!question]- What runtime and language does CMS 13 target?
> **.NET 10** (Microsoft's latest LTS) and **C# 13**.

> [!question]- What replaced Search & Navigation, and is it optional?
> **Optimizely Graph** — and no, it's **mandatory**. There is no CMS 13 support path for Search & Navigation.

> [!question]- What replaced the SiteDefinition concept?
> The **Applications model**.

> [!question]- What's the new default editing experience?
> **Visual Builder**. On-Page Editing is off by default (not removed — can be re-enabled).

> [!question]- Is Dojo still required for editor UI customization?
> No — CMS 13 drops Dojo entirely. Use **ES6 modules / modern JS**.

> [!question]- What replaced the Alloy starter template?
> **Stride**.

> [!question]- What database is required?
> SQL Server 2022 / Azure SQL, **compatibility level 140+**.

## Upgrade Path

> [!question]- List the official 5-step upgrade path in order.
> 1) Migrate to **Opti ID** → 2) Migrate to **Graph** → 3) Prepare for **.NET 10** → 4) **Upgrade** CMS packages to 13.x → 5) **Enable new features** (Visual Builder, Opal, DAM, OCP).

> [!question]- Can you upgrade directly from CMS 11 to CMS 13?
> Yes — the effort is about the same as going to 12 first, so jumping straight is generally recommended.

> [!question]- What four things drive upgrade complexity?
> Search & Navigation usage, volume of custom code, on-prem vs DXP hosting, and number of add-ons/integrations.

> [!question]- Why must you involve Optimizely early in an upgrade?
> Provisioning **Opti ID, OCP, Opal, and DAM goes through the CSM — it's not self-service.** Only S&N→Graph and CMS 11→12 are self-service.

> [!question]- Which Commerce version is compatible with CMS 13?
> **Commerce 15.** Commerce 14 is **incompatible**.

## Graph

> [!question]- Is Optimizely Graph a self-hosted or SaaS service?
> It's a **SaaS service**, but on-prem/PaaS CMS 13 installs integrate with it. Schema is generated automatically by the CMS.

> [!question]- Should a client implement Graph in CMS 12 now or wait for 13?
> **Wait.** The Graph schema changed significantly between 12 and 13 to align with SaaS — doing it twice is wasted effort.

> [!question]- Are Visitor Groups indexed in Graph?
> No. They still work in MVC but are **not indexed in Graph** — use alternative approaches for Graph-delivered personalization.

## New Features

> [!question]- What's the Visual Builder content hierarchy?
> **Experience → Section → Row → Column → Element.**

> [!question]- How does a block become a Visual Builder element?
> Add `CompositionBehaviors = ["elementEnabled"]` to its `[ContentType]` attribute.

> [!question]- Is Opal included with CMS 13?
> No — it's a **separate subscription** (usage-based credits), requires Opti ID, and is cloud-only. It **does** work on PaaS.

> [!question]- Is DAM required, and does it work on-premises?
> Optional, and **cloud-only** (not on-prem). Requires Opti ID; coexists with the existing media library. No automated migration tool.

> [!question]- What are the two OCP tiers?
> **Free** (scheduled jobs, data syncs, webhooks, UI extensions, config forms) and **Paid** (private apps, object storage).

## Opti ID & Deployment

> [!question]- What does Opti ID gate, and is it available on-prem?
> It gates **Opal, OCP, DAM, and GEO Analytics**. It is **not available on-premises**.

> [!question]- Does Opti ID affect public/front-end site users?
> No — it's only for CMS editors and business users. You keep your own auth for public users.

> [!question]- Name three things PaaS can do that SaaS cannot.
> Custom in-process .NET code (MVC InProc), custom middleware / MVC filter pipelines, and frontend ACL / personalization / projects.

> [!question]- When is SaaS the wrong choice?
> When the project needs custom middleware, MVC filter pipelines, or frontend ACL/personalization.

## GEO Analytics (the one that tripped us up)

> [!question]- What does the GEO Analytics dashboard show, and what's its key metric?
> Which AI agents crawl your site and whether crawls become referrals. Key metric: **Crawl-to-Refer Ratio** (drive it **down**).

> [!question]- Why isn't "will GEO Analytics be available?" a simple yes/no?
> Because availability = **Opti ID dependency + deployment model + provisioning/version caveat.** The PaaS dashboard is **legacy (access frozen May 31, 2026)**; newer accounts get the **Agent Visibility** dashboard instead.

## Developer Gotchas

> [!question]- `Principal.Current` / `ServiceLocator` are gone. What do you use?
> **Constructor injection.**

> [!question]- Validators (`IValidate<T>`) aren't auto-discovered anymore. How do you register them?
> Explicitly via `AddCmsValidator<T>()`.

> [!question]- The Conventions API was removed. What replaces it?
> Explicit `[ContentType]` and `[Display]` attributes.

---

## Daily drill

A simple routine that actually works:

1. **Pick 5 cards a day** (rotate through the sections).
2. Answer each **out loud before flipping**.
3. Any you miss → note them and re-test those **tomorrow** (spaced repetition).
4. Once you can answer all of a section cold, move to the next.

When you can clear every card without flipping, take the [[cms13-refresher#7. Self-test — you're caught up when you can answer these|Refresher self-test]] as a final check.

## Sources

Synthesized from the verified wiki — see [[cms13-refresher|CMS 13 Refresher]], [[cms13-technical-qa|Technical Q&A]], [[world-tour-2026-briefing|World Tour Briefing]], and [[geo-analytics|GEO Analytics]] for primary sources.
