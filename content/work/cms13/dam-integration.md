---
title: "DAM Integration in CMS 13"
tags:
  - optimizely
  - cms
  - dam
  - graph
  - media
---

# DAM Integration in CMS 13

CMS 13 integrates the Optimizely DAM through the `EPiServer.Cms.DamIntegration.UI` package. The key mental model: **the CMS stores references and tracks usage; the DAM's CDN delivers the actual bytes directly to the browser.** The CMS never proxies or stores the asset binary.

This is a different architecture from the CMS 12-style picker — the new integration **no longer calls the CMP REST API directly**. It is built on **External Sources**, so DAM assets must be indexed into the Optimizely Graph instance connected to your CMS.

## Architecture at a Glance

| Concern | Where it happens |
|---|---|
| Asset selection (picker) | CMS editor UI |
| Metadata (alt text, dimensions, rendition URLs) | Cached in CMS DB; queried via Optimizely Graph |
| Reference stored on content | `ContentReference` (CMP ID + provider ID, e.g. `1234_ProviderId`) |
| Usage tracking | Reported to CMP — visible in the **Asset usage** view |
| Binary delivery (image/video bytes) | **Direct from the DAM CDN to the browser** — bypasses CMS |

So selection and metadata route through CMS + Graph; the file itself is served straight from the DAM CDN. Nothing large flows through the CMS at serve time.

## Three Integration Options

Optimizely offers **three** DAM integration modes — only one keeps editors fully inside the CMS. Pick deliberately; configuring the wrong one is the usual cause of "why does the DAM open in a separate window?"

| Mode | In-CMS experience? | Notes |
|---|---|---|
| **Embedded DAM** | ✅ **Fully inside the CMS** | Adds a DAM option to the CMS side panel / Edit menu ("Embeddable DAM"). Browse, filter, tag, and pick assets **without leaving CMS**. Requires **DXP + Opti ID + Graph**. The setup below is for this mode. |
| **DAM Asset Picker** | ❌ Separate window | Opens the DAM in a separate tab/pop-up. A developer must install the picker and add a button to launch it. |
| **Content Manager** | ⚠️ Partial | Source-agnostic multi-source browser; does **not** surface DAM-specific metadata (folder hierarchy, tags, filters). |

**Embedded DAM is not available on on-premises or HIPAA environments** — DXP only.

## Setup — Enabling Embedded DAM (official steps)

Confirmed by Optimizely Support for a CMS 13 DXP instance. Prerequisites first: a **DXP environment**, **Opti ID**, and an **active Optimizely Graph** service.

**1. Add the integration NuGet package:**

```
EPiServer.Cms.DamIntegration.UI
```

**2. Register the DAM UI service:**

```csharp
// Startup.cs
services.AddDamUI();
```

**3. Add the import to `_ViewImports.cshtml`** (enables render helpers such as `RenderTagWithMetadata(...)`):

```csharp
@using EPiServer.Cms.DamIntegration.UI.Helpers
```

**4. Configure CMP/DAM credentials in `appsettings.json`** — the **SSO ID, Client ID, and Client Secret** from your Content Marketing Platform (CMP) account.

**5. Select the DAM instance in the admin UI:** go to **Settings → Optimizely DAM Features**, pick your DAM instance from the drop-down, and **Save**.

**6. Apply the Image UIHint** to any `ContentReference` properties that should use DAM assets:

```csharp
[UIHint(UIHint.Image)]
public virtual ContentReference HeroImage { get; set; }
```

DAM assets must also be **indexed into Graph via External Sources**. Optimizely Support enables the DAM ↔ Graph ↔ CMS integration **per environment** — *"Contact Support to integrate Optimizely DAM and Optimizely Graph with CMS 13."* It does **not** carry over automatically between a client's separate projects/instances.

> [!warning] Limitations confirmed by Support
> - **Export/import of content carrying DAM asset references between CMS instances is not supported.** Plan content moves accordingly.
> - **On-premises and HIPAA environments cannot use Embedded DAM** — DXP only.

## Editor Workflow

Once a DAM instance is selected, a **DAM option appears in the CMS Edit menu** ("Embeddable DAM"). Editors browse, filter, search, and select assets — including folders, tags, and renditions — **without leaving the CMS**. On selection the asset is stored as a `ContentReference` (or a list), and CMP is told where it's used.

## Hero Images

1. Hero property is a `ContentReference` with `[UIHint(UIHint.Image)]`.
2. Editor picks from the DAM picker → a DAM-backed reference is stored.
3. At render, the helper emits an `<img>` pointing at the DAM CDN URL. Append **DAT (Dynamic Asset Transformation)** params to resize on the fly — the CDN performs the resize and caches the result. No local copy is created.

## Video

`RenderTagWithMetadata` is **image-oriented** (emits `<img>`). To play DAM video you render your own `<video>` (or a player like Video.js / Plyr) pointing at the DAM CDN URL.

DAM video URLs are **directly playable**. A real example serves with:

```
content-type: video/mp4
accept-ranges: bytes              # range requests → seek / progressive playback
access-control-allow-origin: *    # CORS open → cross-origin embed works
content-disposition: inline       # ?attachment=false plays inline instead of downloading
server: cloudflare                # CDN-fronted (origin: Google Cloud Storage)
```

So a plain HTML5 `<video src="…?attachment=false">` streams and seeks natively, no CMS proxy.

**Caveat — this is progressive download, not adaptive streaming.** There is no HLS/DASH manifest, so there's no adaptive bitrate; every viewer pulls the full-resolution file. Master files can be very large (multi-GB). For embedding, request a **web-optimized rendition** (e.g. 720p/1080p, fast-start / moov-atom-at-front) rather than the master.

## Migrating Existing Media into the DAM

There is **no out-of-the-box Optimizely tool** that re-links existing references for a **first-time DAM adoption** (moving from local CMS media → DAM). Confirmed by Optimizely Support:

- The standalone migration package only converts sites **already** using the CMS 12-style DAM integration to the new format. It does not apply to first-time adopters.
- No OOTB tool re-links references (typed properties *or* rich-text links) from local media to DAM assets.
- Optimizely provides **no mapping** between old local media and new DAM assets.

You script it yourself. References live in **two** places — miss either and you leave dead links:

| Reference type | Where it lives | API to find/update |
|---|---|---|
| Typed properties | `ContentReference` / `ContentArea` | `IContentRepository.GetReferencesToContent()` |
| Rich-text links | `<img>` / links inside `XhtmlString` | `SoftLinkRepository.Load()` |

Recommended approach:

1. **Build the old → new mapping yourself** (Optimizely won't supply one). Capture `old MediaData GUID → new DAM reference` as assets are uploaded; fall back to filename/checksum matching if uploads aren't driven by you.
2. Write a one-shot migration module / admin tool (see [[custom-admin-tools|Building Custom Admin Tools]]) that rewrites both typed props (`CreateWritableClone()` → set → `Save()`) and `XhtmlString`-embedded references.
3. Log every change with `ILogger<T>` and run against a DXP integration-env clone first.

## Sources

- [Optimizely CMS DAM integration options](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/digital-asset-management-dam) *(Jun 2026)*
- [Configure the DAM asset picker for CMS 13](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/configure-dam-asset-picker-cms13) *(Jun 2026)*
- [Integrate CMP DAM with CMS for asset management](https://docs.developers.optimizely.com/content-management-system/docs/cmp-dam-in-cms) *(Jun 2026)*
- [Enable Optimizely Graph service to sync DAM and CMS](https://docs.developers.optimizely.com/digital-experience-platform/docs/enable-optimizely-graph-service) *(Jun 2026)*
- [2026 Optimizely CMS 13 GA release notes](https://support.optimizely.com/hc/en-us/articles/44734633809037-2026-Optimizely-CMS-13-general-availability-GA-release-notes) *(Jun 2026)*
- Optimizely Support ticket [#1902636](https://support.optimizely.com/hc/requests/1902636) — first-time DAM adoption relinking scope *(Jun 2026)*
- Optimizely Support — Embedded DAM enablement steps for CMS 13 DXP *(Jun 2026)*
