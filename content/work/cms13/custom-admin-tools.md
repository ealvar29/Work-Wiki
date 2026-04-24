---
title: Building Custom Admin Tools in CMS 13
tags:
  - optimizely
  - cms
  - csharp
  - admin
---

# Building Custom Admin Tools in CMS 13

CMS 13 (and late CMS 12) uses `MenuProvider` as the standard pattern for adding custom tools to the admin interface. The old `GuiPlugin` attribute approach is gone.

## The Three-Layer Pattern

Any custom admin tool follows the same structure:

| Layer | Responsibility |
|---|---|
| `MenuProvider` | Registers the tool in the admin navigation menu |
| Controller | Handles HTTP requests, enforces auth |
| Service | Contains the actual business logic |

## Security Requirements

Always restrict custom admin controllers with the CMS admin policy:

```csharp
[Authorize(Policy = CmsPolicyNames.CmsAdmin)]
```

Add antiforgery tokens on any form submissions to prevent CSRF.

## Checking Asset References

When building tools that touch content (e.g. finding unused assets), you need to check both reference systems — assets can be linked through either:

1. **Typed properties** — `GetReferencesToContent()` for `ContentReference` and `ContentArea` properties
2. **Rich text links** — `SoftLinkRepository.Load()` for links embedded in XhtmlString fields

Missing either one will give you false positives.

## Soft Delete, Not Hard Delete

Always use `MoveToWastebasket()` instead of permanent deletion. Editors will thank you when they need to recover something.

```csharp
_contentRepository.MoveToWastebasket(contentReference, "Unused asset cleanup");
```

## Platform Navigation

Use `Html.CreatePlatformNavigationMenu()` in your views to keep the standard CMS chrome around your tool. It maintains editor context and feels native.

## Sources

- [Daniel Ovaska — Creating an Admin Tool for Unused Assets](https://world.optimizely.com/blogs/Daniel-Ovaska/) *(Apr 2026)*
