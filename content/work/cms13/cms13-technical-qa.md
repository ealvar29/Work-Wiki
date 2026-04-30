---
title: "CMS 13 Technical Q&A"
tags:
  - optimizely
  - cms
  - upgrade
  - graph
  - opal
  - architecture
---

# CMS 13 Technical Q&A

Compiled from the March 2026 Optimizely technical webinar. Covers upgrade paths, Graph migration, frontend support, DAM, Opti ID, Opal, APIs, and Commerce compatibility.

## Upgrade & Migration

**Can we upgrade directly from CMS 11 to CMS 13?**
Yes. The direct upgrade effort is equivalent to going CMS 11→12 first, so jumping straight to CMS 13 is generally recommended.

**What drives upgrade complexity?**
- Whether you use Search & Navigation (significant migration to Graph)
- Volume of custom code
- On-prem vs DXP hosting
- Number of add-ons and integrations

**Are there PaaS migration tools?**
Not officially yet. Epinova offers a third-party asset migration solution. Asset migration requires manual project effort to update references.

## Graph & Search

**Should we implement Graph in CMS 12 now or wait for CMS 13?**
Wait. The Graph schema changed significantly between CMS 12 and CMS 13 to align with SaaS. Migrating twice adds unnecessary effort.

**Is Search & Navigation supported at all?**
No. Switching to Graph is mandatory in CMS 13.

**Can Graph be used on-premises?**
Graph itself is a SaaS service, but on-prem CMS 13 installations can integrate with it. Schema generation is handled automatically by the CMS.

**Will existing Graph implementations break?**
Yes — the schema changed. Migration guides are being published by Optimizely.

## Architecture & Frontend

**Is MVC still supported?**
Yes, MVC remains fully supported.

**Is Dojo still required for editor UI customization?**
No. CMS 13 moves away from Dojo entirely. New approaches (ES6 modules, modern JS) are documented.

**What frontend frameworks are supported?**
- React — fully supported, especially via the JS SDK
- Razor Pages — supported
- Blazor — supported, not discouraged
- Razor Components — not yet fully supported
- Next.js — improved support expected via the updated `content-js-sdk`

**Will `content-js-sdk` support CMS 13?**
Yes. A new version will support both SaaS and CMS 13, with improved Next.js framework integration.

## Visual Builder

**Is Visual Builder available on PaaS?**
Yes, available for both SaaS and PaaS.

**Are rows and columns required?**
No. They are optional logical grouping structures, not mandatory for rendering.

**Can traditional pages coexist with Visual Builder experiences?**
Yes. You can mix standard page types with experience-based structures in the same site.

**Are content modeling rules different between SaaS and CMS 13?**
No, identical rules apply to both.

## DAM (Digital Asset Management)

**Is DAM required?**
No, it is optional. DAM can run alongside existing CMS media libraries.

**Is DAM available on-premises?**
No. DAM is a cloud-only service and requires Opti ID.

**Can CMS media assets and DAM coexist?**
Yes, both can be used simultaneously within the same project.

**Are there automated asset migration tools?**
No built-in tools exist. Migration requires manual effort to update asset references.

## Opti ID & Authentication

**What is Opti ID?**
Optimizely's centralized identity and access management system. Required for DAM, OCP (Optimizely Connect Platform), and Opal. Not available on-premises.

**Does Opti ID affect front-end site users?**
No. Opti ID is only for CMS editors and business users. You can still use your own authentication for public-facing users.

## Opal & AI

**Is Opal included with CMS 13?**
No. Opal is a standalone product requiring a separate subscription. Pricing is usage-based via Opal Credits across multiple tiers.

**Does Opal work on-premises?**
No. Opal requires Opti ID and is cloud-only.

**Does Opal work with PaaS (DXP)?**
Yes.

## APIs

**What changed in the Management and Delivery APIs?**
CMS 13 introduces a new **Management API**. Graph becomes the primary **Delivery API**. REST API format and payloads remain consistent between SaaS and CMS 13.

**Have scheduled jobs changed?**
No, the scheduled jobs API is unchanged. Async support is planned for a future release.

## Visitor Groups

Visitor Groups are still available in MVC but are **not indexed in Graph**. For personalization use cases tied to Graph-delivered content, alternative approaches are recommended.

## Commerce Compatibility

Commerce 14 is **incompatible** with CMS 13. Compatibility arrives with **Commerce 15**.

## SaaS vs PaaS

| | CMS 13 (PaaS) | SaaS |
|---|---|---|
| Custom code | Yes, full control | No in-process custom code |
| Infrastructure | Self-managed | Managed by Optimizely |
| Updates | Manual | Automatic |
| Best for | Complex, customized solutions | Simpler, low-maintenance sites |

## Starter Template

Alloy is replaced by a new template called **Stride**, available at GA.

## Sources

- [Optimizely CMS 13 – Technical Q&A — Gosso (OMVP), optimizely.blog, Mar 2026](https://www.optimizely.blog/2026/03/technical-qa-for-cms-13/)
