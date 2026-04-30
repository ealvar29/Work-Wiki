---
title: "Multi-Site Plugin (DavidHome.Optimizely.MultiSite) — CMS 13 Migration"
tags:
  - optimizely
  - cms
  - multisite
  - upgrade
  - breaking-changes
---

# Multi-Site Plugin — CMS 13 Breaking Changes

The `DavidHome.Optimizely.MultiSite` NuGet plugin v2 targets CMS 13 and introduces a breaking change in how sites are identified. If you use this plugin for multi-site resolution, you must audit your folder structures and configuration before upgrading.

## The Breaking Change

**Version 1 (CMS 12):** Sites are resolved using their **display name** (e.g. `"My Corporate Website"`).

**Version 2 (CMS 13):** Sites are resolved using their **normalized application identity** — the lowercase, spaceless internal name (e.g. `"mycorporatewebsite"`).

This mirrors the core CMS 13 platform change in the Applications model, where `Application.Name` (the normalized identity) is the authoritative identifier rather than the human-readable display name.

## What Needs to Change

Anywhere the display name was used as a path or key must be updated to the normalized identity:

### Static Asset Folders

```
# Before (v1 / CMS 12)
wwwroot/My Corporate Website/css/
wwwroot/My Corporate Website/js/

# After (v2 / CMS 13)
wwwroot/mycorporatewebsite/css/
wwwroot/mycorporatewebsite/js/
```

### Other Affected Areas

- **Category mappings** — any categories keyed by site display name
- **UI grouping configuration** — admin UI groupings referencing display names
- **Deployment and automation scripts** — any CI/CD steps that reference site names as folder paths or identifiers
- **Name-based conventions** — anywhere site names appear in config, routes, or asset resolution logic

## Prerequisites

- .NET 10 target framework
- `EPiServer.CMS` 13.0.0 or later

## NuGet

```
DavidHome.Optimizely.MultiSite
```

Source: [github.com/ddprince17/davidhome-optimizely-multisite](https://github.com/ddprince17/davidhome-optimizely-multisite)

## Related

- [[applications-model|Applications Model]] — the CMS 13 platform change this plugin aligns with

## Sources

- [Multi Site NuGet v2 for Optimizely CMS 13 – Breaking Changes & Migration — davidhome.net, 2026](https://www.davidhome.net/blog/multi-site-plugin-on-cms-13-breaking-changes/)
