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

### Consequence 1 — "View on website" navigates to `/ui/null`

A block has no route of its own. The shell asks the server for a preview URL, gets `null`, and its JavaScript concatenates it into a path anyway — relative to `/ui/` that resolves to `/ui/null`, which 404s. Editors read it as "the site is broken" right after publishing.

Optimizely's position: **known limitation, no built-in guard, no supported way to suppress the command.**

The server-side seam is the REST model the shell consumes. `ContentStoreModelCreator` takes `IEnumerable<IModelTransform>` in its constructor, so add to the pipeline rather than replacing an `Internal` class:

```csharp
public class BlockPreviewUrlTransform : TransformBase<ContentDataStoreModelBase>
{
    public override TransformOrder Order => TransformOrder.TransformEnd;

    public override Task TransformInstanceAsync(IContent content,
        ContentDataStoreModelBase model, IModelTransformContext context, CancellationToken ct)
    { /* fill model.PreviewUrl when it is empty */ }
}
services.AddTransient<IModelTransform, BlockPreviewUrlTransform>();
```

Three things the API docs get wrong or omit:

- `TransformOrder` is an **enum** — `InputFilter, TransformStart, Transform, TransformEnd, OutputFilter`. Not an int; there is no `Default`, `Late` or `Last`.
- The abstract member is **`TransformInstanceAsync(..., CancellationToken)`**, not the sync `TransformInstance` the XML docs list first.
- `ContentAssetFolder.ContentOwnerID` is a **`Guid`**, not a `ContentReference`.

⚠️ **Do not resolve the owning page via the asset folder.** Only blocks in a page's *content-asset* folder have a `ContentOwnerID`, and on an upgraded site most blocks sit in plain folders instead. Use `IContentRepository.GetReferencesToContent(link, false)` — the reference graph is the only thing that connects a shared block to the page displaying it. Where a block has several referrers there is no single right answer; leave the URL null rather than guessing.

### Consequence 2 — `Html.EditAttributes` silently does nothing with a view model

If your blocks render from a **mapped view model** rather than the content type, on-page editing has no DOM node to associate with a property, so changing an image updates the field but not the preview. The editor only corrects on a full re-render — which is why switching to "All properties" and back appears to fix it.

`Html.EditAttributes(m => m.BackgroundImage)` **cannot help**: it needs the model to *be* the content (`IContentData`) so it can bind property → content. Given a view model it returns an empty string — no warning, no exception.

Verify before assuming it works. In the preview iframe:

```js
[...document.querySelectorAll('[data-epi-property-name]')]
  .map(e => e.getAttribute('data-epi-property-name'))
```

Empty, with `epieditmode=true` in the iframe URL and the block clearly rendered, means the helper produced nothing. The attribute is only markup, so emit it directly:

```razor
@{ var bgEditAttr = contextModeResolver.CurrentMode == ContextMode.Edit
       ? Html.Raw(" data-epi-property-name=\"BackgroundImage\"") : null; }
<div class="background-video"@bgEditAttr>
```

Put it on a container that **always renders**. If it sits on an element that only appears once the property has a value, the *first* image an editor sets still will not show.

### Consequence 3 — a custom block preview has no page chrome

A custom `PreviewController` (`[TemplateDescriptor(Tags = { RenderingTags.Preview, RenderingTags.Edit })] IRenderTemplate<BlockData>`) renders the block in isolation through its own layout. Missing header and footer there is **correct** — the same block may appear on pages with different chrome — but editors report it as a fault. Worth saying up front.

## Sources

- [Optimizely CMS 13 GA Release Notes](https://support.optimizely.com/hc/en-us/articles/44734633809037) *(Apr 2026)*
- [Tomas Hensrud Gulla — Optimizely CMS Roadmap](https://www.gulla.net/en/blog/optimizely-cms-roadmap/) *(2026)*
