---
title: Applications Model in CMS 13
tags:
  - optimizely
  - cms
  - migration
  - architecture
---

CMS 13 replaces `SiteDefinition` entirely with a new **Applications** model. If your code references `SiteDefinition`, `ISiteDefinitionRepository`, or `SiteDefinition.Current`, all of it needs to change.

## The New Classes

```
Application (base)
├── Website          — in-process ASP.NET MVC rendering
└── RemoteWebsite    — headless delivery (Next.js, Nuxt, etc.)
```

Both inherit from `Application`. Use `Website` for traditional server-rendered sites, `RemoteWebsite` for decoupled frontends.

## IApplicationRepository — Replaces ISiteDefinitionRepository

```csharp
// In-process sites only
var sites = await applicationRepository.ListAsync<Website>();

// Headless only
var sites = await applicationRepository.ListAsync<RemoteWebsite>();

// All applications
var all = await applicationRepository.ListAsync<Application>();
```

## IApplicationResolver — Replaces SiteDefinition.Current

```csharp
// By current HTTP context (most common)
var app = await applicationResolver.GetByContextAsync(cancellationToken);
var website = app as Website;

// By hostname
var app = await applicationResolver.GetByHostnameAsync(hostName, fallbackToDefault, cancellationToken);

// By content reference
var app = await applicationResolver.GetByContentAsync(contentReference, fallbackToDefault, cancellationToken);
```

## Start Page Resolution

As of Preview 4, start page resolution is simplified — don't use `IApplicationResolver` for this:

```csharp
// Just use this
var startPage = ContentReference.StartPage;
```

Prior to Preview 4, the workaround was `_applicationResolver.GetByContextAsync()` → cast to `Website` → read `RoutingEntryPoint`. That approach is now obsolete.

## Setting Up an Application After Upgrade

After upgrading, you'll hit a 404 on the site. Fix it in the admin UI:

1. Navigate to the editor — `/Optimizely/CMS` (prefix changed from `/EPiServer`), or **`/ui/cms`** on Shell 13.1.x / Opti ID
2. Go to **Settings → Applications**
3. Delete the default "Headless" application that was auto-created
4. Create a new **In Process** application
5. Set your start page as the routing entry point
6. Add your hostname and mark it as default

## Critical Gotcha: Name is Immutable

Applications no longer use a GUID `Id`. The identity is an immutable `name` — a sanitized, lowercased version of the display name set at creation:

- Display name: `"My Corporate Website"`
- Resolved name: `"mycorporatewebsite"`

**There is no one-to-one mapping from the old SiteDefinition GUID to the new name.** If you stored site GUIDs in configuration or database, you need a migration strategy.

This also affects static asset folders if you use the multi-site NuGet plugin:
- Old: `wwwroot/My Corporate Website/`
- New: `wwwroot/mycorporatewebsite/`

## API Replacement Map

| CMS 12 | CMS 13 |
|---|---|
| `SiteDefinition.Current` | `await applicationResolver.GetByContextAsync(ct)` |
| `ISiteDefinitionRepository` | `IApplicationRepository` |
| `SiteDefinition.Id` (GUID) | `Application.Name` (immutable string) |
| Sync resolution APIs | All async |

## Sources

- [Mark Stott — Working With Applications in Optimizely CMS 13](https://world.optimizely.com/blogs/mark-stott/dates/2026/1/working-with-applications-in-optimizely-cms-13/) *(Jan 2026)*
- [Robert Svallin — From 12 to 13: A Developer's Upgrade Guide](https://world.optimizely.com/blogs/robert-svallin/dates/2026/1/from-12-to-13-a-developers-guide-to-upgrading-an-optimizely-cms-alloy-site/) *(Jan 2026)*
- [Robert Svallin — CMS 13 Preview 4: Upgrading from Preview 3](https://world.optimizely.com/blogs/robert-svallin/dates/2026/3/cms-13-preview-4--upgrading-from-preview-3/) *(Mar 2026)*
