---
title: CMS REST API v1
tags:
  - optimizely
  - cms
  - api
  - headless
---

# CMS REST API v1

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

## Sources

- [Kathy Copeland — Build, Automate, and Scale with CMS REST API v1](https://world.optimizely.com/blogs/kathy-copeland/dates/2026/4/-build-automate-and-scale-content-operations-with-cms-rest-api-v1---now-live-/) *(Apr 2026)*
