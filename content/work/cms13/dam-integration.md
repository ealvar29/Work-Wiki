---
title: "DAM Integration in CMS 13"
tags:
  - optimizely
  - cms
  - dam
  - graph
  - media
---

CMS 13 integrates the Optimizely DAM through the `EPiServer.Cms.DamIntegration.UI` package. The key mental model: **the CMS stores references and tracks usage; the DAM's CDN delivers the actual bytes directly to the browser.** The CMS never proxies or stores the asset binary.

This is a different architecture from the CMS 12-style picker — the new integration **no longer calls the CMP REST API directly**. It is built on **External Sources**, so DAM assets must be indexed into the Optimizely Graph instance connected to your CMS.

> [!danger] CMS 12 vs CMS 13 — the package was renamed (read before you install)
> DAM integration was **renamed between CMS 12 and CMS 13**, exactly like the [[graph-sdk|Graph package rename]]. Installing the CMS 12 packages on a CMS 13 project is the most common mistake here.
>
> | | CMS 12 (legacy) | CMS 13 (use this) |
> |---|---|---|
> | UI package | `EPiServer.CMS.WelcomeIntegration.UI` (+ `.Core`, `.Graph`, `Optimizely.Cmp.Client`) | **`EPiServer.Cms.DamIntegration.UI`** |
> | Service registration | `AddDAMUi()` + `AddOptimizelyCmpClient()` + `AddDAMGraphIntegration()` | **`services.AddDamUI()`** |
> | appsettings root | `Optimizely:Cmp:Client` + `CmpGraph:SingleKey` | `Optimizely:Cms:DamUI` + `Optimizely:Cmp:Client` |
>
> "Welcome" is the old name (from Optimizely's Welcome acquisition → CMP). It was consolidated into `DamIntegration.UI` for CMS 13.
>
> **Always use version-pinned doc URLs (`.../v13.0.0-CMS/docs/...`).** The bare `/content-management-system/docs/...` URLs serve **CMS 12** content by default — that's what makes people install the wrong (`WelcomeIntegration`) packages.

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

**1. Add the integration NuGet packages:**

```
EPiServer.Cms.DamIntegration.UI
EPiServer.Cms.UI.ContentManager   # required — see Content Manager note below
```

> [!warning] `EPiServer.Cms.UI.ContentManager` is required but the picker doc never says so
> The [configure-dam-asset-picker doc](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/configure-dam-asset-picker-cms13) lists **only** `EPiServer.Cms.DamIntegration.UI` + `AddDamUI()`. That is **not enough.** The embedded DAM registers DAM assets as a **Content Manager External Source of type `graph`**, which lives in the separate **`EPiServer.Cms.UI.ContentManager`** package and is wired by **`.AddContentManager()`** (see step 2). Pin it to the same version as your other EPiServer packages (e.g. `13.1.0`). Skip it and activation fails — see [DAM feature activation fails with "'graph' is not supported as 'Type'"](#dam-feature-activation-fails-with-graph-is-not-supported-as-type).

**2. Register the DAM UI service** (and the Content Manager pipeline):

```csharp
// Startup.cs
services.AddContentGraph().AddContentManager();  // .AddContentManager() registers the External Sources pipeline the DAM needs
services.AddDamUI();
```

`.AddContentManager()` chains onto the builder `AddContentGraph()` returns — no extra `using` needed. If you already call `AddContentGraph()` for site search, just append `.AddContentManager()` to it.

**3. Add the import to `_ViewImports.cshtml`** (enables render helpers such as `RenderTagWithMetadata(...)`):

```csharp
@using EPiServer.Cms.DamIntegration.UI.Helpers
```

**4. Configure CMP/DAM in `appsettings.json`.** Full key structure (CMS 13):

```json
"Optimizely": {
  "Cms": {
    "DamUI": {
      "Endpoint": "https://cmp.optimizely.com",
      "SsoId": "<CMP SSO ID>",
      "NavigationUrl": "https://cmp.optimizely.com/cloud/library"
    }
  },
  "Cmp": {
    "Client": {
      "TokenUrl": "https://accounts.cmp.optimizely.com/o/oauth2/v1/token",
      "ApiUrl": "https://api.cmp.optimizely.com/v3/",
      "ClientId": "<CMP Client ID>",
      "ClientSecret": "<CMP Client Secret>"
    }
  }
}
```

`SsoId`, `ClientId`, and `ClientSecret` come from the CMP account (**SSO ID** is under CMP → **Settings → Organization → General**). **Don't commit real secrets** — use per-environment config / DXP environment variables (`Optimizely__Cmp__Client__ClientSecret`) / `user-secrets` locally. See [Creating the CMP App](#creating-the-cmp-app-to-get-clientid--clientsecret) below for where `ClientId` / `ClientSecret` come from.

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

## Creating the CMP App (to get ClientId / ClientSecret)

The `appsettings` block above needs a **`ClientId` / `ClientSecret`** pair, but the DAM-picker doc never says where they come from. They are **OAuth credentials minted by registering an app inside CMP** — the same app-registration flow used for the CMS↔CMP publishing integration. Confirmed by Optimizely Support.

> [!note] You need a CMP **administrator** role
> App/Webhook registration is an advanced setting. **Trial CMP accounts can't access it.** If you don't see **Apps and Webhooks**, you lack the admin role — get it granted before continuing.

**1. Open the app registration screen** — in CMP go to **Settings → Apps and Webhooks** (or **avatar → Apps and Webhooks**).

**2. Click *Register App*** and complete the form:

| Field | What to enter |
|---|---|
| **Name** | Something descriptive, e.g. `Optimizely CMS 13 — DAM Integration` |
| **Description** | Optional |
| **Email exposure** | *Allow emails to be exposed in API responses* |
| **App Role** | Choose the role appropriate to the integration |
| **Homepage URL** | Your CMS site's public URL |
| **Authorization Callback URL** | Same as the Homepage URL (reserved for future use) |

**3. Click *Create App*.** CMP returns a **Client ID** and **Client Secret** — copy the secret now (it's typically shown only once). These map directly to:

```
Optimizely:Cmp:Client:ClientId      ← Client ID
Optimizely:Cmp:Client:ClientSecret  ← Client Secret
```

The fixed `TokenUrl` (`https://accounts.cmp.optimizely.com/o/oauth2/v1/token`) and `ApiUrl` (`https://api.cmp.optimizely.com/v3/`) in the config are the CMP OAuth2 token endpoint and REST base — the runtime exchanges the ClientId/Secret at `TokenUrl` for a bearer token, then calls `ApiUrl`.

> [!tip] Related but separate: the CMP **publishing** integration
> The same *Register App* credentials also drive CMP's **Website, CMS & Feed** publishing integration (**Settings → Integrations → Website, CMS & Feed → Add → Optimizely CMS** → fill in the OAuth creds + public URL → toggle **Active**, then map folder aliases under the **Publishing** tab). That flow lets editors **author in CMP and publish into CMS** — it is *not* the same feature as the embedded DAM picker, so you only need it if you want CMP-authored publishing. **Heads-up:** the registration doc's non-versioned URL still says "Optimizely CMS12"; the app-registration steps themselves are identical for CMS 13.

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

## Identifying an Optimizely DAM asset URL

Useful when auditing whether a client already uses Optimizely DAM. A delivery URL like:

```
https://<branded-host>/download/assets/<Asset+Name>/<32-char-hex-id>?attachment=false
```

is the Optimizely **CMP/DAM** signature. Confirm with the response headers (no need to download the file — use `curl -I`):

| Header | Optimizely DAM value |
|---|---|
| `server` | `cloudflare` |
| `x-goog-*` (e.g. `x-goog-generation`, `x-goog-storage-class`) | present → **Google Cloud Storage** origin |
| `content-disposition` | `inline; filename="…"` (from `?attachment=false`) |
| `access-control-allow-origin` | `*` |
| `content-type` | the asset MIME (e.g. `video/mp4`) |

The combination — CMP `/download/assets/.../{guid}?attachment=false` URL **plus** Cloudflare-fronted **plus** GCS (`x-goog-*`) origin — is the reliable tell. Cloudflare or GCS alone is not conclusive. (A branded host like `assets.<client>.com` is just a CNAME to CMP's CDN; the host name alone proves nothing.)

## Renditions — what is and isn't possible

The question every client eventually asks: *"when selecting an image from the DAM, can we pick a rendition instead of the original asset?"* Two very different things hide inside it, and conflating them wastes a sprint.

| Goal | Mechanism | Whose job | Effort |
| --- | --- | --- | --- |
| Ship an appropriately **sized** image | CDN resize-on-the-fly (Cloudflare `/cdn-cgi/image/width=…`) | yours | usually **already done** |
| Editor picks a specific **crop / aspect** | a DAM rendition, chosen per image | **not supported by the CMS 13 picker** | see below |

### Sizing is almost certainly already solved — check before building anything

If your `<img>` markup carries a `srcset` of width variants, the browser is already downloading a derivative rather than the multi-megabyte original. DAM originals are big — a sampled asset was 8256×5504, ~30 MB — so this matters, but a CDN image-resizing layer in front of the asset host handles it without touching renditions at all.

**Check the rendered markup before scoping any work.** A DAM asset serving `width=240 … width=1920` candidates needs nothing further for file size.

⚠️ **Coverage caveat:** that only applies where your view-model property is a *renderable-image abstraction* that runs the srcset builder. Any property still typed as the CMS media class (`ImageFile`) resolves a DAM asset to **null** and renders nothing at all — see [[work/cms13/dam-integration#a-dam-asset-is-selected-saves-fine-and-renders-nothing]]. Converting those properties buys more real-world page weight than renditions would.

### The CMS 13 DAM picker cannot return a rendition

Measured against `EPiServer.Cms.DamIntegration.UI` and `EPiServer.Cms.DamIntegration.CmpClient` (13.x) by enumerating their type definitions: **there is no `Rendition`, `Crop`, or `Variant` type anywhere in either assembly.** What exists is asset-shaped:

```
ICmpAssetClient.GetAssetMetadataById<T>()      ← generic metadata fetch, the only real hook
DamAssetType / DamAssetTypeResolver
DamImageAssetFeature / DamVideoAssetFeature / DamRawFileAssetFeature
DamContentThumbnailTransform                   ← editor thumbnails, not delivery renditions
CmpAssetContentSourceProvisioner               ← provisions the Graph `cmp` content source
```

**The CMS-side integration models assets, not renditions.** Renditions are a CMP-side concept, surfaced through Graph on the asset type (e.g. `cmp_PublicImageAsset`) — named sets like Banner 1920 / CONTENT-LARGE 1400 / CONTENT-MEDIUM 800 / CONTENT-SMALL 480. Reachable for *rendering*, not selectable in the *picker*.

### Ask what "renditions" is standing in for — the answer changes everything

The question is almost never really about renditions. Pin down which of these they want:

* **"Our pages are slow / images are huge."** → CDN width variants. Usually already done.
* **"We don't want to hand-crop every image."** → **automatic cropping.** This is the common one, and renditions are *not* the cheapest way to get it. See below.
* **"This specific photo needs a different crop from the automatic one."** → per-image art direction, the genuinely expensive case.

### Automatic cropping: do it in the CDN, not with renditions

🟢 **A CDN image resizer can crop, not just scale** — and if you already have one in front of the asset host for sizing, cropping is a parameter change rather than a project.

The default most implementations emit is a *scale* (`fit=scale-down`), which preserves aspect ratio and therefore **cannot** produce a 1:1 or 16:9 frame from a 3:2 original. Switching to a **cover fit with an explicit height** does, and a smart-gravity option picks the focal point automatically.

Verified against an Optimizely DAM delivery host (`/cdn-cgi/image/…`), all HTTP 200 with distinct payloads, i.e. genuinely different geometry rather than a silently ignored height:

```
width=480,format=auto,fit=scale-down                     200   24,851 bytes   (baseline, uncropped)
width=480,height=480,format=auto,fit=cover               200   32,802 bytes   (1:1)
width=480,height=480,format=auto,fit=cover,gravity=auto  200   32,835 bytes   (1:1, smart crop)
width=1600,height=900,format=auto,fit=cover,gravity=auto 200  150,571 bytes   (16:9)
width=480,height=640,format=auto,fit=cover,gravity=auto  200   41,155 bytes   (3:4)
```

**Why this beats renditions for automatic cropping:** arbitrary ratios instead of a fixed named set, no dependency on a rendition existing on every asset, no Graph query, no custom property editor, no vendor roadmap dependency — and it is the same code path as ordinary CMS media, so non-DAM images get it too.

**The aspect ratio belongs to the SLOT, not the image.** A hero wants 16:9, a card 4:3, a profile 1:1 — the same asset is cropped differently depending on where it renders. So carry the ratio through the same view-level channel you already use for the `sizes` hint, not as a property on the media.

⚠️ Three cautions:

1. **Keep `fit=scale-down` as the default and make cropping opt-in per slot.** A logo asked for at 16:9 gets mangled, and scale-down is also what guarantees no upscaling past the source.
2. **Transformations are billed.** Adding a height multiplies unique variants (widths × ratios). Check the cost before rolling it across every slot.
3. **Smart gravity is good, not perfect.** It will occasionally crop badly. The fix is a per-image focal-point override — worth adding *later*, when a real example justifies it, not up front.

### Per-image rendition selection is BLOCKED on CMS 13 — don't scope it

🔴 **The CMS refuses a rendition even though the DAM picker offers one.** Measured on CMS 13.1.x, 2026-09-08:

**Repro:** any image property → *Select Content* → DAM selection → pick a **rendition** (not the original) → **Choose Image** → back in the CMS window a red banner appears:

```
Renditions cannot be used. Please select an original asset.
```

The rejection happens at **selection** time, so the reference is never persisted and never reaches your mapping layer. No `AllowedTypes` change, view-model retype, or type converter can affect it — there is nothing to resolve. This is consistent with the assembly evidence above: `EPiServer.Cms.DamIntegration.UI` and `.CmpClient` contain no rendition type at all, so the integration has no concept of a rendition reference to hand you.

**Consequence:** per-image rendition selection is not "expensive", it is **unavailable**. Do not estimate it, and do not promise it to a client. Raise a support ticket asking whether it is supported or roadmapped, and in the meantime use the CDN cropping route above — which is not merely cheaper, it is the *only* route to automatic cropping on CMS 13 today.

**If the client wants editor control** — "if the crop looks wrong, let me choose another" — give them that on **your** side rather than the DAM's: a plain aspect-ratio choice (and later a focal point) on your own image property, applied through the CDN. An enum with a selection factory is an ordinary CMS property, **not** a custom Dojo/React editor, so it stays cheap. Same editor experience, none of the platform dependency.

> **The trap:** hearing "renditions" and building the picker, when the client said "we want to avoid cropping manually" — which the CDN already does, today, for a parameter change.

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

## Troubleshooting

### DAM assets never appear in an image property picker — `AllowedTypes` silently excludes them

**Symptom.** The DAM is fully working — assets browse fine in Content Manager's **DAM** tab, `GetAvailableTypes` returns 200, features are activated — but when an editor opens an image property on a page or block, only CMS media appears. There is no "Browse DAM" option. Nothing errors, nothing logs.

**The obvious diagnosis is wrong,** and it wastes a lot of time. The symptom looks like a broken integration, so you check the things that *do* break: the Graph `cmp` source, the CMP client secret, the Opti ID session, `AddDamUI()`, asset-type activation. On one project all of those were healthy — Graph held 208 indexed assets — and the picker was still empty.

**Root cause.** Optimizely's asset-picker doc states one property requirement:

> Apply the `UIHint.Image` hint to `ContentReference` properties that reference DAM assets.

It never mentions `AllowedTypes` — and that silence is the whole finding. A typical CMS 12-era property looks like this:

```csharp
[UIHint(UIHint.Image)]
[AllowedTypes(typeof(ImageFile))]   // ← excludes every DAM asset
public virtual ContentReference BackgroundImage { get; set; }
```

**DAM assets are external content, not a registered CMS content type.** Check Admin → Content Types: "Optimizely DAM Image" is *not there*. So an `AllowedTypes` filter naming your own media types can never admit them, and the picker quietly offers CMS media only.

**Fix.** Remove `AllowedTypes` from properties that should accept DAM assets. The context menu immediately gains two entries:

```
Browse
Browse DAM        ← the DAM picker
Upload to CMS     ← imports the asset into CMS media
Remove
```

**Prove it cheaply before touching every property.** Remove the attribute from *one* property and leave its neighbour untouched — two properties on the same block become an A/B with one variable, answerable in one editor session. Most sites have 20–30 image properties; you do not want to sweep them on a hypothesis.

⚠️ **Don't sweep blindly afterwards either.** `AllowedTypes` was doing a real job: without it an editor can drop pages or blocks into an image field. Decide a deliberate replacement rather than deleting the attribute everywhere.

### A DAM asset is selected, saves fine, and renders nothing

**Symptom.** Editor picks a DAM image, publishes, and the front end shows no image. Swapping to a CMS image renders correctly.

**Root cause.** Typed media mappers assume CMS media:

```csharp
if (loader.TryGet(source, out ImageFile imageFile))   // false for an external DAM reference
{
    destination = new Picture { RelativeUrl = url, ... };
}
return destination;                                    // null, and nothing logged
```

"Browse DAM" *references* the asset externally — it does not import it — so `TryGet<ImageFile>` fails and the mapper returns empty-handed. Getting the picker working is only half the job; **budget for the mapper as well**, and add a log line to that fall-through branch first so the failure stops being silent.

**Two things to get right in the mapper:**

- **Never bind the asset's `Url`** — that is the original. One sampled asset was 8256×5504 and ~30 MB. Graph exposes `Renditions[] = { Id, Name, Width, Height, Url }` (typically Banner 1920, CONTENT-LARGE 1400, CONTENT-MEDIUM 800, CONTENT-SMALL 480, Thumbnail, Logo) — a ready-made responsive set. Confirm the names exist on every asset and fall back deliberately.
- **Check alt text before you promise accessibility.** On one library **197 of 199 images had an empty `AltText`**, with `Description` and `Attribution` empty too. Enabling DAM images without fixing that publishes nearly every one with no alt text — a regression introduced by the feature. It is a content task in CMP, and it is usually the longest pole.

  **Do not "fix" it by falling back to the file name.** It is the obvious stopgap and it is worse than doing nothing: a screen reader announcing *"D-S-C underscore three five one one dot jpg"* is noise dressed up as a description, and it defeats automated auditing because the alt attribute now looks populated. The correct fallback for an image with no description is an explicit empty `alt=""`, which marks it decorative — and the correct *fix* is populating the field in CMP. Worth checking what your own renderer does with an empty description too: a helper that only emits `alt` when the value is non-empty produces a **missing** alt attribute, which is a WCAG failure, where `alt=""` is valid.

Also filter on `Status = Published` (an `ExpiryDate` field exists) so unpublished or expired assets cannot leak onto the site.

**"Upload to CMS" is a legitimate alternative.** It copies the asset into CMS media as a normal image, so no mapper work is needed at all — at the cost of duplicated storage and a copy that drifts from the DAM. Decide which model you want *before* writing code; it is a product decision, not a technical one.

### DAM feature activation fails with "'graph' is not supported as 'Type'"

**Symptom.** In the editor, **Settings → Optimizely DAM Features → Activate** (Images / Videos / Documents) fails with a toast **"Feature activation failed. ('graph' is not supported as 'Type'.)"** and the browser console shows:

```
PUT /Optimizely/DamIntegration/damfeatures/Save  400 (Bad Request)
```

**Cause.** Activating a feature tells the CMS to register DAM assets as a **Content Manager External Source of type `graph`**. If the **Content Manager pipeline isn't registered**, that source type doesn't exist, so the `Save` rejects `'graph'` as an unknown `Type`. This happens when `EPiServer.Cms.UI.ContentManager` is missing and/or `.AddContentManager()` was never called — easy to hit because the asset-picker doc doesn't mention either.

**Fix.**

1. Add the package: `EPiServer.Cms.UI.ContentManager` (match your EPiServer version, e.g. `13.1.0`).
2. Chain the registration in `Startup.cs`:
   ```csharp
   services.AddContentGraph().AddContentManager();
   ```
3. Rebuild and redeploy, then retry activation.

> [!note] This is an app-side registration gap, not a Support/back-end issue
> The error *looks* like the DAM↔Graph back-end isn't provisioned, but the `'graph' … Type` 400 is caused by the missing **`.AddContentManager()`** registration in your app. Confirmed by Optimizely Support on a CMS 13 DXP instance (OxyChem, Jun 2026). A separate Support-side DAM↔Graph enablement may still be needed for indexing, but it is **not** what produces this particular 400.

## Sources

- [Optimizely CMS DAM integration options](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/digital-asset-management-dam) *(Jun 2026)*
- [Configure the DAM asset picker for CMS 13](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/configure-dam-asset-picker-cms13) *(Jun 2026)*
- ⚠️ [Integrate CMP DAM with CMS — **CMS 12 (legacy, `WelcomeIntegration.*`)**](https://docs.developers.optimizely.com/content-management-system/docs/cmp-dam-in-cms) — the non-versioned URL defaults to CMS 12; **do not follow this for CMS 13** *(Jun 2026)*
- [CMS + CMP publishing integration — *Create an app in CMP*](https://docs.developers.optimizely.com/content-management-system/docs/cms-cmp-publishing-integration#create-an-app-in-cmp) — the canonical *Register App* steps that mint the `ClientId` / `ClientSecret` (sent by Optimizely Support for the OxyChem integration) *(Jun 2026)*
- [Enable Optimizely Graph service to sync DAM and CMS](https://docs.developers.optimizely.com/digital-experience-platform/docs/enable-optimizely-graph-service) *(Jun 2026)*
- [2026 Optimizely CMS 13 GA release notes](https://support.optimizely.com/hc/en-us/articles/44734633809037-2026-Optimizely-CMS-13-general-availability-GA-release-notes) *(Jun 2026)*
- Optimizely Support ticket [#1902636](https://support.optimizely.com/hc/requests/1902636) — first-time DAM adoption relinking scope *(Jun 2026)*
- Optimizely Support — Embedded DAM enablement steps for CMS 13 DXP *(Jun 2026)*
- Optimizely Support — `EPiServer.Cms.UI.ContentManager` + `AddContentGraph().AddContentManager()` required to fix the DAM feature-activation `'graph' is not supported as 'Type'` 400 (OxyChem, Jun 2026)
