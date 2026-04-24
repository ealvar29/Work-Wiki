---
title: CMS 13 .NET Compatibility
tags:
  - optimizely
  - cms
  - dotnet
---

# CMS 13 .NET Compatibility

CMS 13 was built for the modern .NET unified platform. Here's what's officially supported and what's on the horizon.

## Current Support

| .NET Version | Status | Notes |
|---|---|---|
| .NET 8 | Supported (LTS) | Original CMS 13 target; safe for production |
| .NET 10 | Supported | Used in Luc Gosso's AI Assistant v4 package |
| .NET 11 | Preview only | Runs with one-line change; not production-ready |

## Running CMS 13 on .NET 11 Preview

Stuart Greig confirmed CMS 13 boots on .NET 11 Preview with a single `.csproj` change:

```xml
<TargetFramework>net11.0</TargetFramework>
```

No other code changes required. Useful for testing performance improvements before GA.

### .NET 11 Performance Wins (relevant to CMS 13)

- **JIT/PGO** — faster cold startup; matters for DI-heavy CMS initialization
- **Async/Await** — reduced allocations in state machines; CMS is heavily async
- **System.Text.Json** — allocation-free serialization; benefits headless/content delivery API
- **Span\<T\>** — bulk data operation improvements

**.NET 11 GA is expected November 2026.** Don't migrate production until then.

## Recommendation

Stay on **.NET 8 LTS** for production CMS 13 projects today. Plan a migration path to .NET 10 or 11 once your team is ready and packages are confirmed compatible.

## Sources

- [Stuart Greig — Running Optimizely CMS 13 on .NET 11 Preview](https://stuartgreig.dev/blog/running-optimizely-cms-13-on-net-11-preview/) *(Apr 2026)*
