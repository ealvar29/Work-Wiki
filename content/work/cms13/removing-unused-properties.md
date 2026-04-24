---
title: Removing Unused Properties in CMS 13
tags:
  - optimizely
  - cms
  - csharp
  - migration
---

# Removing Unused Properties in CMS 13

When you delete a property from a C# content model in Optimizely, the database entry sticks around as an orphaned definition. CMS 13 changed the API for cleaning these up — the old pattern breaks.

## What Changed

**Attribute rename**
`[ScheduledPlugIn]` is deprecated. Use `[ScheduledJob]` from `EPiServer.Scheduler` instead. Parameters are identical.

**Repository consolidation**
The old separate typed repositories (`IContentTypeRepository<PageType>`, `IContentTypeRepository<BlockType>`) are gone. There is now a single `IContentTypeRepository`. Filter results with `IsAssignableFrom()`.

**Property deletion is now immutable-first**
You can no longer call `IPropertyDefinitionRepository.Delete()` directly. Entities returned from `List()` are read-only — mutating them throws `InvalidOperationException`.

## The New Pattern

```csharp
var writableType = type.CreateWritableClone();
writableType.PropertyDefinitions.Remove(writableProperty);
contentTypeRepository.Save(writableType);
```

Always call `CreateWritableClone()` before any mutation, then `Save()` the result.

## Practical Advice

- For one-off cleanup, the admin UI or a one-shot migration module is safer than a scheduled job
- Use `ILogger<T>` with named placeholders for structured, searchable audit logs rather than relying on the scheduler UI messages
- The single `IContentTypeRepository` actually reduces boilerplate — less code than managing multiple typed instances

## Source

- [Stuart Greig — Removing Unused Properties in Optimizely CMS 13](https://stuartgreig.dev/blog/removing-unused-properties-in-optimizely-cms-13-what-changed-and-why/) *(Apr 2026)*
