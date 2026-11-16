---
title: CMS REST API v1
tags:
  - optimizely
  - cms
  - api
  - headless
---

Optimizely's CMS REST API v1 is the first production-stable release of their content management integration framework. Available for both CMS 13 (PaaS) and CMS SaaS, it comes with a commitment to backward compatibility and long-term support — meaning you can now build integrations against it without worrying about the rug being pulled.

## What It Can Do

| Area | Capabilities |
|---|---|
| Content | Create, update, version content programmatically |
| Schema | Build structured content types for pages and blocks |
| Integrations | Connect external content sources and type bindings |
| Templates | Manage display templates for the visual builder |
| Localization | Handle locale configuration |
| Blueprints | Create reusable content templates and property groups |
| Security | Manage client credentials for authenticated access (SaaS) |
| Data portability | Export/import schemas and configurations as manifests |

## Why This Matters

Before v1, you could only do most of this through the CMS UI. Now you can:

- Automate content operations at scale (bulk create/update)
- Build headless workflows that push content from external systems into Optimizely
- Script your content schema setup as part of a deployment pipeline
- Build proper CI/CD for content types, not just code

## CMS 13 vs SaaS

The REST API v1 is available on both platforms, but client credential management (security section) is SaaS-specific. PaaS/CMS 13 uses standard Optimizely authentication patterns.

## Gotchas Found Importing a Whole Site (CMS 13.5.1)

Allan Thraen's team rebuilt a 58-page site through the REST API with an agent-written, re-runnable importer (58 pages, 57 media items, 7 Visual Builder blueprints). *Per his post, 2026-11-11; all hit on CMS 13.5.1, not re-tested here.*

| Symptom | Cause / fix |
|---|---|
| Writes return **403** with no explanation | OAuth clients appear as **"API keys"** under `Settings → Access Rights` and need rights granted there. Role and claim mapping inside the site does not reach the API |
| Property values rejected | Values are **wrapped**: `{"Title":{"value":"…"}}`, not `{"Title":"…"}`. Rich text in a composition is `{"value":{"html":"…"}}`; references are `cms://content/<guid>` |
| Cannot find the new item's ID | A create returns **201** with the new key **only in the `Location` header** |
| **500** uploading an SVG over about 4 KB | The CMS scans uploaded SVG/HTML for scripts and the scanner reads the request body **synchronously**, which ASP.NET Core forbids once the body exceeds what is buffered. 27 of 27 SVGs failed; a 1.6 KB favicon and a 3.2 MB PNG succeeded. Uploading through the CLI worked. The author did not file it with Optimizely |

**Keep the importer, not the content**: if every page comes from a script you can re-run, a mapping mistake is a one-line fix plus a re-import.

## Sources

- [Allan Thraen — Migrating a Full Website to Optimizely CMS 13 with Visual Builder in Four Hours](https://umage.ai/insights/optimizely-cms-13-visual-builder-migration-in-four-hours/) *(2026-11-11)*

- [Kathy Copeland — Build, Automate, and Scale with CMS REST API v1](https://world.optimizely.com/blogs/kathy-copeland/dates/2026/4/-build-automate-and-scale-content-operations-with-cms-rest-api-v1---now-live-/) *(Apr 2026)*
