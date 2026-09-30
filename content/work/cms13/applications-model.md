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

## Where It Actually Lives in the Database

The API change is only half the story. **The storage moved too, and the legacy tables are still there and still populated with stale data.** This is the single most expensive trap in the whole model, because every instinct says to go look at `tblSiteDefinition`.

| Purpose | CMS 13 table | Legacy table (STALE — do not trust) |
| --- | --- | --- |
| The site/application | `tblApplication` | `tblSiteDefinition` |
| Hostnames | **`tblApplicationHost`** | `tblHostDefinition` |
| URL formats | `tblApplicationUrlFormat` | — |
| Sync bookkeeping | `tblSynchedApplication` | — |

`tblApplicationHost` columns: `pkID`, `fkApplicationID`, **`Authority`** (the hostname), **`Type`**, `Locale`, `UseSecureConnection`, `PreferredUrlScheme`.

`Type` is the host role — `1` is **Primary** (used for canonical/absolute URL generation), `0` is a secondary/default alias. Get this wrong and you get malformed absolute URLs sitewide.

### Why this matters more than it sounds

On a CMS 13 site that had been upgraded and was serving traffic correctly:

- `tblHostDefinition` contained only **production** hostnames — no trace of the environment's actual hostname.
- `tblApplicationHost` contained the real, correct config.
- The CMS admin UI (Applications → hostnames) reads the **new** tables.

So reading the legacy tables produced a confident, completely wrong conclusion ("the environment's hostname isn't registered"). Worse: **writing** to the legacy tables to "fix" routing had **no effect at all**, which then looked like a deeper platform bug rather than an edit to a dead table.

**Rule: on CMS 13, query `tblApplication` / `tblApplicationHost`. Treat `tblSiteDefinition` and `tblHostDefinition` as archaeology.**

### Application names are synthetic — `Site_<GUID>`

`tblApplication.Name` holds values like:

```
Site_0E96B85F_3A5A_4C59_AD6A_6C42FE661899
```

That's the old site GUID with hyphens replaced by underscores. `DisplayName` carries the human name ("OxyChem"). You'll see the synthetic form in admin URLs and in anything enumerating applications.

Two consequences:

1. **Any code or addon matching sites by friendly name or by `Guid` will silently match nothing.** The legacy `ISiteDefinitionRepository.List()` shim returns `SiteDefinition.Id == Guid.Empty` with these synthetic names, so `Guid`-based lookups fail without error.
2. **Environment-config addons look like silent no-ops — but they are not inert.** `Addon.Episerver.EnvironmentSynchronizer` (2.0.1) matches sites by `Id` and logs `Could not find application <name>.` before writing zero hosts, with no error and no warning. The cause is the `Id` value, not the addon: see **[Feed EnvironmentSynchronizer the synthetic name](#feed-environmentsynchronizer-the-synthetic-name-not-a-guid)** below. Given the right name it writes, on every environment, on every boot.

> ⚠️ An earlier revision of this page concluded EnvironmentSynchronizer "does **nothing**" on CMS 13. That was wrong, and wrong in the dangerous direction — it reads as *your config is inert*, when in fact a correct entry is a **write** that will also **delete** hostnames you did not list. Corrected after it was measured writing on all three environments of a live estate.

### Diagnostic queries

```sql
-- The real host config. Type 1 = Primary.
SELECT a.pkID, a.Name, a.DisplayName, h.Authority, h.Type, h.UseSecureConnection
FROM tblApplication a
LEFT JOIN tblApplicationHost h ON h.fkApplicationID = a.pkID
ORDER BY a.pkID, h.Type;

-- Is the legacy table lying to you? Compare before trusting anything you read there.
SELECT s.Name, s.StartPage, s.SiteUrl, h.Name AS host, h.Type
FROM tblSiteDefinition s LEFT JOIN tblHostDefinition h ON h.fkSiteID = s.pkID;
```

### A real bug this caused

An image failed CSP with:

```
Loading the image 'https://www.occo01mstrk7b35inte.dxcloud.episerver.net/siteassets/…'
violates the following Content Security Policy directive: "img-src blob: 'self' …"
```

Absolute URL, wrong host, so `'self'` didn't match. It looked like a CSP policy gap. It wasn't: one application's **Primary** (`Type = 1`) host in `tblApplicationHost` was set to the **DXP slot hostname with a stray `www.` prefix**. Absolute-URL generation used it whenever site context was ambiguous. Pure config error, fixable in the admin UI with no deploy — but only findable in the right table.

Check `Type = 1` rows across all applications after any upgrade or environment clone. A slot hostname (`*.dxcloud.episerver.net`) should never be a Primary host.

## Feed EnvironmentSynchronizer the synthetic name, not a GUID

`Addon.Episerver.EnvironmentSynchronizer` 2.0.1 works fine on CMS 13. What breaks is the `"Id"` value, and the failure is silent.

**`"Id"` is `Application.Name`** — on CMS 13 that is the synthetic form, not a bare GUID:

```jsonc
"EnvironmentSynchronizer": {
  "SiteDefinitions": [{
    "Id": "Site_0E96B85F_3A5A_4C59_AD6A_6C42FE661899",  // NOT 0e96b85f-3a5a-…
    "SiteUrl": "https://int.example.com/",
    "Hosts": [ /* … */ ]
  }]
}
```

Derive it mechanically — `'Site_' + UPPER(REPLACE(UniqueId,'-','_'))` — or just read the real values out of the target environment:

```sql
SELECT pkID, Name, DisplayName FROM tblApplication;
```

Because it derives from a GUID that never changes, the value **survives database restores**. That is the whole reason to declare bindings in config rather than fix them in admin after every promotion.

Five behaviours that are not obvious from the README:

| Behaviour | Consequence |
|---|---|
| `"Id"` and `"name"` are an **if/else, not an OR** — *"If this is provided it will ignore the Name attribute"* | A wrong `"Id"` is **not** rescued by a correct `"name"` |
| **Hosts are REPLACED, not merged** | Every host the site needs must be listed — including the DXP slot hostname and any `prep.*`/`prod.*` name used before DNS moves — or it is **removed** on the next boot |
| A name miss is a **silent no-op** | Logs `Could not find application <name>.` and writes zero hosts. Grep boot logs for that, plus `Refusing to clear hosts for` and `Updated total of ` |
| **Unlisted applications are left alone** | A partial config is safe. Sites that ride in on a restore with correct bindings need no entry at all |
| `"name"` is a **WRITE** | Once matched it overwrites `DisplayName`. An environment-prefixed label silently renames the site in the CMS UI for editors |

### 🔴 Turn it OFF on production once the database stops being replaced

EnvironmentSynchronizer earns its keep where the DB is replaced regularly — non-production environments that get restored from a production copy. Production is the opposite: after cutover its database is never overwritten again, so **there is nothing for config to re-assert** — and because hosts are replaced rather than merged, it was **deleting hostnames editors had added in admin on every restart**.

```jsonc
// appsettings.Production.json, after cutover
"EnvironmentSynchronizer": {
  "RunAsInitializationModule": false   // and drop SiteDefinitions entirely
}
```

After that, **production bindings are whatever production CMS admin says.** Edit them there, not in config. Sites created in admin post-cutover also get a plain API ID (`benefits`) rather than the synthetic `Site_<GUID>` form — and **tell editors not to change it**, because a rename silently disconnects any config entry pointing at it.

## Sources

- [Mark Stott — Working With Applications in Optimizely CMS 13](https://world.optimizely.com/blogs/mark-stott/dates/2026/1/working-with-applications-in-optimizely-cms-13/) *(Jan 2026)*
- [Robert Svallin — From 12 to 13: A Developer's Upgrade Guide](https://world.optimizely.com/blogs/robert-svallin/dates/2026/1/from-12-to-13-a-developers-guide-to-upgrading-an-optimizely-cms-alloy-site/) *(Jan 2026)*
- [Robert Svallin — CMS 13 Preview 4: Upgrading from Preview 3](https://world.optimizely.com/blogs/robert-svallin/dates/2026/3/cms-13-preview-4--upgrading-from-preview-3/) *(Mar 2026)*
