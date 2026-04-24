---
title: AI Assistant v4 for CMS 12 & 13
tags:
  - optimizely
  - cms
  - ai
  - editor-tools
---

# AI Assistant v4 for CMS 12 & 13

Luc Gosso's AI Assistant is a community NuGet package that adds an AI-powered chat panel directly into the Optimizely editor interface. v4 is the first release to support both CMS 12 and CMS 13 from a single package.

## What Editors Can Do With It

18+ built-in capabilities including:

- Text generation and rewriting
- Multilingual translation
- SEO optimization suggestions
- Image generation and analysis
- Spell-checking and tone adjustment
- Custom prompt support

## What's New in v4

**Unified package** — one NuGet package targets both CMS 12 (.NET 8) and CMS 13 (.NET 10). The correct build is selected automatically at restore time. No breaking changes from v3.

**Visitor Group Discovery** — editors can describe personalization in plain language ("Show this only to VIP customers") and the assistant finds and applies the right visitor groups without manual GUID lookups.

**Display Options Discovery** — layout hints can be applied conversationally ("Put the testimonial block in the sidebar at half width") and the assistant suggests and applies the correct display options.

## Setup

Identical across CMS versions:

```csharp
services.AddAIAssistant();
```

That's the entire integration. The package handles dependency resolution per runtime.

## Sources

- [Luc Gosso — Introducing AI Assistant v4](https://optimizely.blog/2026/04/introducing-ai-assistant-v4-for-optimizely-cms-12-and-13/) *(Apr 2026)*
