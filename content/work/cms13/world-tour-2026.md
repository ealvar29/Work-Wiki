---
title: "CMS 13 World Tour 2026 — Technical Notes"
tags:
  - optimizely
  - cms
  - world-tour
  - training
  - opal
  - graph
  - visual-builder
  - ocp
  - dam
---

Notes from the Optimizely CMS 13 World Tour event (May 7, 2026) covering the full technical accreditation curriculum. Eduardo passed the CMS 13 Technical Sales Accreditation exam at this event.

---

## The Big Picture: What Changed in CMS 13

CMS 13 is not just a .NET upgrade. It's a platform consolidation — the "glue" between Optimizely products is now standardized.

**Three mandatory changes when upgrading:**

1. **.NET 10** — runtime target (no .NET 8 support)
2. **Optimizely Graph** — replaces Search & Navigation entirely; required, not optional
3. **Opti-ID** — required authentication layer; unlocks everything else (Opal, OCP, DAM, future AI)

Everything else (Visual Builder, DAM, Opal) is additive once these are in place.

### CMS 12 vs CMS 13 Architecture

| Aspect | CMS 12 | CMS 13 |
|---|---|---|
| Runtime | .NET 8 | .NET 10 |
| Search | Search & Navigation (Find) | Optimizely Graph (required) |
| Identity | Internal or custom | Opti-ID (required) |
| AI | Add-on | Opal (included) |
| DAM integration | DAM asset picker | Embedded DAM via Opti-ID |
| Integrations | Custom / separate | OCP (Connect Platform) |
| Admin URL | `/EPiServer/CMS` | `/Optimizely/CMS` (`/ui/cms` on Shell 13.1.x / Opti ID) |

---

## Upgrade Path

### 5-Step Process

1. **Migrate to Opti-ID** — foundation for everything
2. **Migrate to Optimizely Graph** — replace Search & Navigation
3. **Prepare for .NET 10** — retarget, fix dependencies, address breaking changes
4. **Upgrade project** — swap CMS packages to 13.x, resolve remaining errors
5. **Enable new features** — Visual Builder, Opal, DAM, OCP as desired

### 4 Jobs-to-Be-Done

| Job | Required? | Description |
|---|---|---|
| Set Up Opti-ID | **Required** | Enables auth, unlocks platform features |
| Switch to Graph | **Required** | Replaces Find; new .NET SDK |
| Visual Builder + Content Model | Optional | New layout and editing experience |
| Embedded DAM Setup | Optional | DAM view inside CMS (requires Opti-ID) |

### Pre-Migration Planning Checklist

Before starting an upgrade, evaluate:

- Are there active Search & Navigation queries? (All must migrate to Graph)
- Is DAM in use? (DAM asset picker is being retired; migrate to Embedded DAM)
- Does the project use `Principal.Current` or other static accessors? (Must use DI)
- Does the content model share a base class between pages and experiences? (Can't — `ExperienceData` inherits `PageData`)
- Are there customizations or third-party packages? (Check CMS 13 compatibility)
- **GDPR/Compliance:** Opti-ID, Opal, and Graph introduce new data sub-processors. Get DPO approval before upgrading.
- Which Graph client approach will you use? (CMS managed vs. self-managed token)
- **Involve Optimizely early** — the customer account must be configured for Opti-ID, OCP, Opal, and DAM provisioning. Connect with your Customer Success Manager as early as possible. Currently, self-service only covers upgrading from CMS 11 → 12 and moving from S&N → Graph; everything else requires Optimizely involvement.
- **Plan for organizational change** — login, role management, and asset picking/management all change for editors and admins. A successful migration includes a change management plan, not just a code migration plan.

### DXP Infrastructure Options

Two paths when upgrading on DXP:

| Option | How | Note |
|---|---|---|
| **New application** | Request from Customer Success Manager; fresh environment | Duplicated infrastructure is only available for a limited time |
| **Upgrade in place** | Use deployment slots; self-service; production goes read-only during slot swap | Currently self-service |

---

## Opti-ID

**Required** in CMS 13. Serves as the SSO/identity foundation — without it, Opal, OCP, and Embedded DAM are unavailable.

### Setup

```
Package: EPiServer.OptimizelyIdentity
```

```csharp
services.AddOptimizelyIdentity();
```

Configuration keys:
```
EPiServer:CMS:OptimizelyIdentity:InstanceId
EPiServer:CMS:OptimizelyIdentity:ClientId
EPiServer:CMS:OptimizelyIdentity:ClientSecret
```

Environment variable equivalents:
```
EPISERVER__CMS__OPTIMIZELYIDENTITY__INSTANCEID: ${OPTIID_INSTANCEID}
EPISERVER__CMS__OPTIMIZELYIDENTITY__CLIENTID: ${OPTIID_CLIENTID}
EPISERVER__CMS__OPTIMIZELYIDENTITY__CLIENTSECRET: ${OPTIID_CLIENTSECRET}
```

---

## Optimizely Graph

Graph is the **centerpiece of CMS 13** — it handles content aggregation, delivery, and search. See [[graph-sdk|Graph C# SDK]] for the full query API.

### Key Capability: Smooth Rebuild

Graph supports zero-downtime reindexing via **Blue/Green slot deployment**:

- Two index slots: active (serving queries) and standby (being rebuilt)
- Rebuild targets the standby slot; when complete, slots flip
- No downtime, no stale results during rebuild
- Rebuild can be triggered on demand or scheduled

### Graph SDK — Three Search Modes

| Method | Use Case |
|---|---|
| `QueryContent<T>()` | CMS content — T must implement `IContentData` |
| `Query<T>()` | Any POCO class |
| `Query("TypeName")` | Dynamic / untyped |

### ISearchPage Interface Pattern

Define a marker interface as a content type to identify pages that should be indexed for search:

```csharp
namespace PartnerTechnical.Models.Pages;

[ContentType(
    DisplayName = "Search implementation",
    Description = "Marker interface for search implementation",
    GroupName = Globals.GroupNames.Base,
    GUID = "43a74f83-2140-4d37-b704-1572ec4a929f"
)]
public interface ISearchPage : IContent
{
}
```

This pattern lets you query `ISearchPage` via Graph to retrieve all pages participating in site search regardless of their concrete type.

---

## Visual Builder

Visual Builder is the new default editing experience. See [[visual-builder|Visual Builder]] for setup and tag helpers.

### Content Hierarchy

```
Experience (ExperienceData — inherits PageData)
└── Section
    └── Row
        └── Column
            └── Element (block/component)
```

- **Blueprints** — marketer-created experience/section templates; stored as content, not code
- **Content Variations** — available by default; require dev work to serve to visitors

### Enabling Elements with `CompositionBehaviors`

To make a block usable as a Visual Builder element, add `CompositionBehaviors`:

```csharp
[SiteContentType(
    GUID = "426CF12F-1F01-4EA0-922F-07783140DAF0",
    CompositionBehaviors = ["elementEnabled"]
)]
[SiteImageUrl]
public class ButtonBlock : SiteBlockData
{
    [Display(Order = 1, GroupName = SystemTabNames.Content)]
    [Required]
    public virtual string? ButtonText { get; set; }

    [Display(Order = 2, GroupName = SystemTabNames.Content)]
    [Required]
    public virtual Url? ButtonLink { get; set; }
}
```

### Full Experience Razor View

```razor
@model PageViewModel<AlloyExperience>

<epi-outline experience="@Model.CurrentPage" tag-name="main" class="experience-wrapper">
    <!-- Block used as section wrapper -->
    <epi-component tag-name="section" class="experience-section experience-component" />

    <!-- Section base type -->
    <epi-grid tag-name="section" class="experience-section">
        <!-- Row base type -->
        <epi-row class="experience-row">
            <!-- Column base type -->
            <epi-column class="experience-col">
                <!-- Element within the column -->
                <epi-component class="experience-component" />
            </epi-column>
        </epi-row>
    </epi-grid>
</epi-outline>
```

Tag helper reference:

| Tag Helper | Purpose |
|---|---|
| `<epi-outline>` | Outermost wrapper; provides edit-mode selection handles |
| `<epi-grid>` | Section-level layout container |
| `<epi-row>` | Row within a grid section |
| `<epi-column>` | Column within a row |
| `<epi-component>` | Renders an element (block/component) |

### `ExperienceData` Base Class Gotcha

`ExperienceData` inherits from `PageData`. If your project has an abstract base class shared by pages and experiences, **this breaks** — you cannot have a class that is both a page and experience ancestor simultaneously.

**Workaround:** Split the base class. Pages and Experiences must have separate inheritance chains.

---

## Opal — AI Agent Orchestration

**Opal** is Optimizely's AI platform, included by default in CMS 13 when Opti-ID is set up.

### What Opal Does

- Automates the content lifecycle: create → manage → optimize
- **OpalChat** — conversational AI interface embedded in the CMS editor
- **AI-powered translation** — triggers via the "Add Language" dialog; Opal drafts translated content
- Orchestrates AI agents across content operations

### Enabling OpalChat

```
Package: Optimizely.Cms.OpalChat
```

```csharp
services.AddOpalChat();
```

Configuration keys:
```
Optimizely:OpalChat:InstanceId
Optimizely:OpalChat:ServiceUrl
```

Environment variables:
```
OPTIMIZELY__OPALCHAT__INSTANCEID: ${OPTIID_INSTANCEID}
```

---

## OCP — Optimizely Connect Platform

OCP is an **integration middleware platform** that ships with CMS 13. Think of it as an iPaaS layer built into the product.

### Two Tiers

| Tier | Cost | Features |
|---|---|---|
| **Included** | Free with CMS | Scheduled jobs, data syncs, webhooks, CMS UI Extensions, configuration forms |
| **Paid** | Additional license | Private apps, object storage |

### OCP Capabilities

- **Scheduled jobs** — cron-based data sync jobs managed in the CMS UI
- **Data syncs** — pull data from external sources into Optimizely content
- **Webhooks** — push CMS events to external systems
- **CMS UI Extensions** — add custom panels/views into the CMS editor
- **Configuration forms** — integration settings UI without custom code
- **Private apps** (Paid) — custom integrations with their own runtime
- **Object storage** (Paid) — file storage for integration artifacts

---

## Embedded DAM

Replaces the legacy DAM asset picker. Requires Opti-ID.

### 4-Step Setup

**Step 1:** Ensure Opti-ID is configured (see above).

**Step 2:** Install and register the package:
```
Package: EPiServer.Cms.DamIntegration.UI
```
```csharp
services.AddDamUI();
```

**Step 3:** Add configuration keys:
```
Optimizely.Cms.DamUI.Endpoint
Optimizely.Cms.DamUI.NavigationUrl
Optimizely.Cms.DamUI.SsoId
Optimizely.Cmp.Client.TokenUrl
Optimizely.Cmp.Client.ApiUrl
Optimizely.Cmp.Client.ClientId
Optimizely.Cmp.Client.ClientSecret
```

Environment variables:
```
OPTIMIZELY__CMS__DAMUI__SSOID: ${OPTI_CMP_SSOID}
OPTIMIZELY__CMP__CLIENT__CLIENTID: ${OPTI_CMP_CLIENTID}
OPTIMIZELY__CMP__CLIENT__CLIENTSECRET: ${OPTI_CMP_CLIENTSECRET}
```

**Step 4:** Map CMS content type properties to DAM asset types (configured in DAM admin).

---

## Content Binding / Mappings

**Content Binding** lets you project one content type onto another — for example, rendering an `ArticlePage` as a `ButtonBlock` without duplicating content.

Use case: editors create articles, and the same content can appear as a banner/button block elsewhere on the site — the mapping defines which properties align.

```csharp
protected void InitializeMappings(IServiceProvider services)
{
    var repository = services.GetRequiredService<IContentBindingDefinitionRepository>();
    var logger = services.GetRequiredService<ILogger<MappingsManager>>();

    var bindingKey = typeof(Models.Pages.ArticlePage).Name
        + "_" + typeof(Models.Blocks.ButtonBlock).Name;

    // Create ContentBindingDefinition with PropertyBindingDefinitions
    // mapping ArticlePage.Name → ButtonBlock.ButtonText
}
```

---

## Content Types Reference

| Type | Base Class | Notes |
|---|---|---|
| Page | `PageData` | Standard page content |
| Block | `BlockData` | Reusable components |
| Media — Image | `ImageData` | Image assets |
| Media — Video | `VideoData` | Video assets |
| Media — File | `MediaData` | Other media |
| Experience | `ExperienceData` | Visual Builder pages; inherits `PageData` |

---

## Breaking Changes & Gotchas

See [[breaking-changes|Breaking Changes]] for the full catalog. Key gotchas from the accreditation content:

### Static Accessors Removed

All static service accessors are gone. Use DI.

| Removed | Replacement |
|---|---|
| `Principal.Current` | `IPrincipalProvider` via constructor injection |
| `ServiceLocator.Current.GetInstance<T>()` | `IServiceProvider` or constructor injection |

### `IApplicationResolver` Does Not Include Homepage

`IApplicationResolver.GetApplicationByHostAsync()` resolves the **application** — it does not give you the start page. Retrieve the start page separately via `IContentLoader` using the application's start page reference.

**Solution:** Use type checking to test if the application is an instance of `IRoutableApplication` (required for in-process rendering):

```csharp
var app = await _applicationResolver.GetApplicationByHostAsync(host);
if (app is IRoutableApplication routable)
{
    var startPage = await _contentLoader.GetAsync<PageData>(routable.StartPageReference);
}
```

### `ExperienceData` Inherits `PageData`

You cannot create an abstract base class that is a parent of both `PageData`-based pages and `ExperienceData`-based experiences. They share the `PageData` ancestor, so any attempt to add a common abstract parent causes an inheritance conflict.

**Solution:** Use an interface that inherits from `IContent` and is annotated as a `[ContentType]` — this makes it a Contract in CMS 13. Add other base interfaces (`IRoutable`, `ISecurable`, etc.) as needed. Both pages and experiences can implement this interface.

```csharp
[ContentType(GUID = "...")]
public interface ISitePage : IContent, IRoutable, ISecurable
{
    string MetaTitle { get; set; }
    string MetaDescription { get; set; }
}
```

### Conventions API Removed

If your project used the Conventions API for content type or property registration, it must be removed. Use explicit `[ContentType]` and `[Display]` attributes instead.

### Visitor Groups

Not included by default and not supported in decoupled deployments:

```
Package: EPiServer.Cms.UI.VisitorGroups
```
```csharp
services.AddVisitorGroupsFrameworkWeb();
services.AddVisitorGroupsUI();
```

### Projects (Content Staging)

Included but disabled by default. Not supported in decoupled scenarios:

```csharp
services.Configure<ProjectUIOptions>(o => {
    o.ProjectModeEnabled = true;
});
```

---

## Deployment Models

CMS 13 supports three deployment models with significant feature differences.

### Platform Features

| Feature | On Premise | PaaS | SaaS |
|---|---|---|---|
| .NET MVC InProc | Yes | Yes | **No** |
| Visual Builder | Mostly ¹ | Yes | Yes |
| Graph | Yes | Yes | Yes |
| Opal | Yes | Yes | Yes |
| OCP | Yes | Yes | Yes |
| UI Extensions (OCP) | Roadmap | Roadmap | Roadmap |
| Self-managed infra | Yes | No | No |

¹ Visual Builder on On Premise works but some features require Graph (e.g. Content Variations delivery); validate your specific use case.

### Content Management Capabilities

| Capability | On Premise | PaaS | SaaS |
|---|---|---|---|
| Frontend ACL | Yes ² | Yes ² | No |
| Personalization | Yes ² | Yes ² | No |
| Projects (content staging) | Yes ² | Yes ² | No |
| Multi-Site | Yes | Yes | Mostly ³ |
| Multi-Language | Yes | Yes | Mostly ³ |

² Requires MVC InProc — not available in decoupled/headless setups even on On Premise or PaaS.

³ Multi-Site and Multi-Language are largely supported on SaaS but have edge cases — validate your specific configuration with Optimizely before committing.

**SaaS key constraint:** No custom .NET code running in-process. UI extensions and integrations go through OCP. Not appropriate for projects with heavy custom middleware, MVC filter pipelines, or frontend ACL/personalization requirements.

---

## Full Environment Variable Reference

Complete set of environment variables for a CMS 13 instance with all features enabled:

```
# Opti-ID
EPISERVER__CMS__OPTIMIZELYIDENTITY__INSTANCEID: ${OPTIID_INSTANCEID}
EPISERVER__CMS__OPTIMIZELYIDENTITY__CLIENTID: ${OPTIID_CLIENTID}
EPISERVER__CMS__OPTIMIZELYIDENTITY__CLIENTSECRET: ${OPTIID_CLIENTSECRET}

# OpalChat
OPTIMIZELY__OPALCHAT__INSTANCEID: ${OPTIID_INSTANCEID}

# Graph
OPTIMIZELY__CONTENTGRAPH__APPKEY: ${OPTIMIZELY_GRAPH_APP_KEY:?error}
OPTIMIZELY__CONTENTGRAPH__SECRET: ${OPTIMIZELY_GRAPH_SECRET:?error}
OPTIMIZELY__CONTENTGRAPH__SINGLEKEY: ${OPTIMIZELY_GRAPH_SINGLE_KEY:?error}

# DAM
OPTIMIZELY__CMS__DAMUI__SSOID: ${OPTI_CMP_SSOID}
OPTIMIZELY__CMP__CLIENT__CLIENTID: ${OPTI_CMP_CLIENTID}
OPTIMIZELY__CMP__CLIENT__CLIENTSECRET: ${OPTI_CMP_CLIENTSECRET}

# CMS REST API OAuth clients
OPTIMIZELY__CMS__SERVICE__OAUTH__CLIENTS__0__CLIENTID: ${OPTIMIZELY_CMS_CLIENT_ID:?error}
OPTIMIZELY__CMS__SERVICE__OAUTH__CLIENTS__0__CLIENTSECRET: ${OPTIMIZELY_CMS_CLIENT_SECRET:?error}
```

---

## Sources

- Optimizely CMS 13 World Tour — Technical Accreditation Session *(May 7, 2026)*
- Related pages: [[visual-builder|Visual Builder]], [[graph-sdk|Graph C# SDK]], [[breaking-changes|Breaking Changes]], [[upgrading-from-cms12|Upgrading from CMS 12]], [[ai-assistant|AI Assistant v4]]
