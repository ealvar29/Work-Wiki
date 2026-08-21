---
title: Visual Builder in CMS 13
tags:
  - optimizely
  - cms
  - editor-tools
  - visual-builder
---

Visual Builder is the default editing experience in CMS 13. On-Page Editing (OPE) is disabled by default — not removed, just off.

## Re-enabling On-Page Editing

If your team needs OPE while transitioning:

```csharp
services.Configure<CmsFeatureOptions>(options =>
{
    options.OnPageEditing = true;
});
```

## Content Structure

Visual Builder uses a layout model:

```
Experience (page-like content)
└── Section
    └── Row
        └── Column
            └── Element (block/component)
```

- **Sections** — top-level layout containers
- **Rows and Columns** — responsive grid (not mandatory — Visual Builder is flexible)
- **Elements** — actual content blocks
- **Blueprints** — reusable layout templates editors create in the UI; importable/exportable

## ASP.NET MVC Tag Helpers

Visual Builder renders via tag helpers — **Optimizely Graph is not required for rendering**:

```html
<epi-grid>
    <epi-row>
        <epi-column>
            <epi-component model="@Model.MyBlock" />
        </epi-column>
    </epi-row>
</epi-grid>
```

Use `epi-outline` for edit-mode selection handles:

```html
<epi-outline model="@Model.CurrentPage">
    <!-- your content -->
</epi-outline>
```

## Content Variations

CMS 13 introduces Content Variations — multiple published versions of the same content item per language, designed for A/B testing and personalization:

- **Delta-based storage** — only modified properties are stored per variation, not full copies
- **Independent lifecycles** — each variation has its own version history and approval workflow
- **Graph-indexed** — variations are queryable via the Graph SDK:

```csharp
.SetVariation(includeOriginal: true, "WinterCampaign")
```

- **Visitor Groups** — still available for MVC personalization, but not indexed in Graph

## Admin URL Change

The CMS admin URL changed — update any bookmarks or documentation:

- CMS 12: `/EPiServer/CMS`
- CMS 13: `/Optimizely/CMS` — or `/ui/cms` on Shell 13.1.x / Opti ID

All module URLs follow the same `/EPiServer/` → `/Optimizely/` pattern.

## Blocks Have Two Editing Experiences — And It Is Not About the CMS Version

An upgraded site will show editors **two different block editors**, which looks like a bug and is not. It depends on how the block is *stored*:

| Block storage | Editor | "View on website" |
| --- | --- | --- |
| **Inline** — inside the ContentArea XML | Modal dialog | Not offered |
| **Linked** — its own content item in a folder | Legacy full edit view | **Offered** |

CMS 12 created blocks as standalone content items; CMS 13's Visual Builder creates them inline. So upgraded pages open the older editor while newly-authored pages open the modal. **Optimizely confirmed this is by design** — the experience is determined by how the block is created and referenced, not by a migration step you missed.

Measured on one upgraded instance: **5,764 blocks in plain folders vs 3,360 in content-asset folders** — so the legacy path is the majority, not an edge case.

### Consequence 1 — "View on website" gave `/ui/null` — 🟢 FIXED, upgrade to 13.1.1

A block has no route of its own. Optimizely's own words: *"Blocks do not have their own URL and must be part of other content, such as a page."* On **13.1.0 and earlier** the shell asked for the content's public URL, got an empty string, and navigated anyway — relative to `/ui/` that resolves to `/ui/null`, which 404s. Editors read it as "the site is broken" right after publishing.

> ✅ **This is `CMS-51887`, fixed in CMS 13.1.1 / `EPiServer.CMS.UI` 13.1.1 (published 2026-07-31).** The fix **suppresses the command** for content with no URL of its own, rather than populating it — so on 13.1.1 the button is simply absent inside a block. Confirmed on a real instance.
>
> **The fix is a version number. Do not write a workaround for this.**

⚠️ **An earlier revision of this page said the opposite** — "known limitation, no built-in guard, no supported way to suppress" — sourced from an **AI-generated support reply**. A human support engineer contradicted it and gave the bug ID. The AI answer was persuasive because its *technical* description matched what we had independently verified; being right about the mechanism and right about vendor roadmap are different things. **Check the package feed for a released fix before building around a reported limitation.**

<details>
<summary>Historical: the workaround we built and then deleted (kept for the API details, which are still accurate)</summary>

Four attempts, all unnecessary. The seam is real if you ever need it: `ContentStoreModelCreator` takes `IEnumerable<IModelTransform>` in its constructor, so you add to the pipeline rather than replacing an `Internal` class.

```csharp
public class BlockPublicUrlTransform : TransformBase<ContentDataStoreModelBase>
{
    public override TransformOrder Order => TransformOrder.TransformEnd;

    public override Task TransformInstanceAsync(IContent content,
        ContentDataStoreModelBase model, IModelTransformContext context, CancellationToken ct)
    { /* fill model.PublicUrl when it is empty */ }
}
services.AddTransient<IModelTransform, BlockPublicUrlTransform>();
```

Four API details worth keeping, each of which cost an attempt:

- **`PublicUrl` is the empty field, not `PreviewUrl`.** `PreviewUrl` is *always* populated for a block — it is the CMS edit-mode URL. Keying off it means the transform never fires. Capture `/ui/cms/Stores/contentdata/{id}` in the browser and read the payload rather than guessing which field is blank.
- `TransformOrder` is an **enum** — `InputFilter, TransformStart, Transform, TransformEnd, OutputFilter`. Not an int; there is no `Default`, `Late` or `Last`.
- The abstract member is **`TransformInstanceAsync(..., CancellationToken)`**, not the sync `TransformInstance` the XML docs list first.
- `ContentAssetFolder.ContentOwnerID` is a **`Guid`**, not a `ContentReference`.

⚠️ **Do not resolve the owning page via the asset folder.** Only blocks in a page's *content-asset* folder have a `ContentOwnerID`, and on an upgraded site most blocks sit in plain folders instead. Use `IContentRepository.GetReferencesToContent(link, false)` — the reference graph is the only thing connecting a shared block to the page displaying it.

</details>

### Consequence 2 — the block preview does not refresh when a property changes

Change an image on a block and the preview keeps showing the old one until you reload — or leave for "All properties" and come back. The save was always fine; the preview had no live binding.

**The fix is two things, and it needs both.**

**1. Bind the ContentArea with the `epi-property` tag helper, not `Html.PropertyFor`:**

```razor
@* ~/Views/Pages/Preview.cshtml *@
<div epi-property="@Model.PreviewContentArea"></div>
```

Optimizely's guidance is explicit that this is what *"enables real-time updates when editors modify properties, as the block renders through the standard content area property mechanism rather than directly."* `Html.PropertyFor` renders the block but establishes no binding the editor can use.

Requires the tag helpers to be registered — they are **not** on by default:

```razor
@* ~/Views/_ViewImports.cshtml *@
@addTagHelper *, EPiServer.Cms.AspNetCore.TagHelpers
```

**2. Put `[RequireClientResources]` on the preview controller:**

```csharp
[TemplateDescriptor(Inherited = true, TemplateTypeCategory = TemplateTypeCategories.MvcController,
                    Tags = new[] { RenderingTags.Preview, RenderingTags.Edit }, AvailableWithoutTag = false)]
[RequireClientResources]        // EPiServer.Framework.Web.Mvc — NOT EPiServer.Framework.Web
[VisitorGroupImpersonation]
public class PreviewController : ActionControllerBase, IRenderTemplate<BlockData>
```

This is what emits the on-page editing JavaScript into the preview response. **Without it the tag-helper binding has nothing client-side to act on** — you get correct markup and still no refresh. The binding alone is necessary but not sufficient.

🟠 Namespace trap: `RequireClientResourcesAttribute` lives in **`EPiServer.Framework.Web.Mvc`** (assembly `EPiServer.Cms.AspNetCore.Mvc`). One segment away from `EPiServer.Framework.Web`, which a preview controller usually already imports.

🟠 Optimizely's sample also implements `IModifyLayout` to hide header/footer, and renders at three container widths. **`IModifyLayout` is an Alloy-sample interface, not a platform type** — it will not resolve in your solution. A deliberately bare preview layout does the same job. The three widths are an Alloy nicety, not a requirement.

#### Two approaches that do NOT work — don't repeat them

**`Html.EditAttributes` is silently inert when the view renders a mapped view model.** It needs the model to *be* the content (`IContentData`) so it can bind property → content. Given a view model it returns an empty string — no warning, no exception. Verify rather than assume, in the preview iframe:

```js
[...document.querySelectorAll('[data-epi-property-name]')]
  .map(e => e.getAttribute('data-epi-property-name'))
```

Empty, with `epieditmode=true` in the iframe URL and the block clearly rendered, means the helper produced nothing.

**Emitting `data-epi-property-name` by hand does not help either.** It appears in the DOM correctly — verified — and the editor still will not re-render a `ContentReference` property from it:

```razor
@{ var bgEditAttr = contextModeResolver.CurrentMode == ContextMode.Edit
       ? Html.Raw(" data-epi-property-name=\"BackgroundImage\"") : null; }
<div class="background-video"@bgEditAttr>
```

If you do this anyway (harmless, edit-mode only), put it on a container that **always renders** — on an element that only appears once the property has a value, the *first* image an editor sets still will not show. But it is not the fix; the tag helper plus `[RequireClientResources]` is.

### Consequence 3 — a custom block preview has no page chrome

A custom `PreviewController` (`[TemplateDescriptor(Tags = { RenderingTags.Preview, RenderingTags.Edit })] IRenderTemplate<BlockData>`) renders the block in isolation through its own layout. Missing header and footer there is **correct** — the same block may appear on pages with different chrome — but editors report it as a fault. Worth saying up front.

## Sources

- [Optimizely CMS 13 GA Release Notes](https://support.optimizely.com/hc/en-us/articles/44734633809037) *(Apr 2026)*
- [Tomas Hensrud Gulla — Optimizely CMS Roadmap](https://www.gulla.net/en/blog/optimizely-cms-roadmap/) *(2026)*
