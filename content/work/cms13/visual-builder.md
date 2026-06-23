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
- CMS 13: `/Optimizely/CMS`

All module URLs follow the same `/EPiServer/` → `/Optimizely/` pattern.

## Sources

- [Optimizely CMS 13 GA Release Notes](https://support.optimizely.com/hc/en-us/articles/44734633809037) *(Apr 2026)*
- [Tomas Hensrud Gulla — Optimizely CMS Roadmap](https://www.gulla.net/en/blog/optimizely-cms-roadmap/) *(2026)*
