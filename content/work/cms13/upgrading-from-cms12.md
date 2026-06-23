---
title: Upgrading from CMS 12 to CMS 13
tags:
  - optimizely
  - cms
  - migration
  - dotnet
---

The good news: this upgrade is significantly easier than the CMS 11 → 12 jump. That one required rewriting code due to the .NET Framework → .NET Core architectural shift. CMS 13 is refinement, not reconstruction.

## Why It's Easier This Time

CMS 11 → 12 was a platform rewrite. CMS 12 → 13 is a modernization pass — cleaner APIs, removed legacy baggage, and a retargeted runtime. If your CMS 12 project was kept reasonably up to date, you're not starting from scratch.

## Before You Start

These are the planning questions that should be answered before writing a single line of upgrade code. Getting these wrong mid-upgrade is expensive.

**Technical planning:**
- Are there active Search & Navigation queries? All must migrate to Graph — no S&N support in CMS 13
- Is DAM in use? The old DAM asset picker is retired; plan migration to Embedded DAM (requires Opti-ID)
- Does the project use `Principal.Current`, `ServiceLocator`, or other static service accessors? Must switch to DI
- Does the content model share a base class between pages and experiences? `ExperienceData` inherits `PageData` — this breaks shared abstract base classes
- Which Graph client approach? CMS managed token vs. self-managed token — different setup and operational profiles
- Third-party packages? Check each package's CMS 13 compatibility before starting

**Compliance:**
- Opti-ID, Opal, and Optimizely Graph introduce new data sub-processors (Optimizely as a cloud service, not just on-premise software). Get DPO or legal review done before the upgrade project starts, not after.

**Organizational:**
- **Involve Optimizely early** — customer accounts must be provisioned for Opti-ID, OCP, Opal, and DAM by Optimizely. Only S&N→Graph and CMS 11→12 upgrades are currently self-service. Connect with your Customer Success Manager at project kickoff.
- **Plan for organizational change** — login, role management, and DAM asset workflows all change for editors and admins. Don't treat this as a pure dev project; include a change management plan.

## Official Upgrade Path (Optimizely's 5-Step Process)

Optimizely recommends executing these steps in order. They can be done in one project or split across multiple releases:

1. **Migrate to Opti-ID** — required foundation; unlocks everything else
2. **Migrate to Optimizely Graph** — replace Search & Navigation entirely
3. **Prepare for .NET 10** — retarget, fix dependencies, address breaking changes
4. **Upgrade the project** — swap CMS packages to 13.x, resolve remaining errors
5. **Enable new features** — Visual Builder, Opal, DAM, OCP as desired

See [[world-tour-2026|CMS 13 World Tour 2026 Notes]] for the full 4 Jobs-to-Be-Done breakdown.

## Recommended Upgrade Strategy

### 1. Pre-flight: Retarget to .NET 10 while still on CMS 12

Do this *before* touching CMS 13 packages. Upgrading the runtime independently surfaces dependency issues in isolation — you'll know exactly what breaks before you add CMS 13 into the mix.

```xml
<TargetFramework>net10.0</TargetFramework>
```

Fix any compile errors at this stage. Third-party packages that don't support .NET 10 need to be evaluated or replaced now.

### 2. Audit and remove deprecated CMS 12 features

CMS 13 removes features that were deprecated in CMS 12. The most notable is **Dynamic Properties** — if your project uses them, you need a migration plan before upgrading.

Checklist:
- [ ] Remove any usage of `Dynamic Properties`
- [ ] Replace `[ScheduledPlugIn]` with `[ScheduledJob]`
- [ ] Switch from typed `IContentTypeRepository<T>` to the unified `IContentTypeRepository`
- [ ] Review any direct property deletion code (see [[removing-unused-properties|new pattern]])

### 3. Upgrade NuGet packages to CMS 13

Once the runtime and deprecated features are handled, update your Optimizely packages:

```
EPiServer.CMS.Core → 13.x
EPiServer.CMS.UI → 13.x
EPiServer.CMS.AspNetCore → 13.x
```

Check the Optimizely GitHub (`github.com/episerver`) for exact compatible versions.

### 4. Fix remaining breaking changes

Run the build. Address any remaining compilation errors. The API consolidations in CMS 13 (repository merging, attribute renames) are the most common source of errors at this stage.

## Key Things Removed in CMS 13

| Feature | Replacement |
|---|---|
| Dynamic Properties | Use content model properties or external config |
| `[ScheduledPlugIn]` | `[ScheduledJob]` from `EPiServer.Scheduler` |
| `IContentTypeRepository<T>` (typed) | `IContentTypeRepository` (single, unified) |
| Direct property deletion via `Delete()` | `CreateWritableClone()` → mutate → `Save()` |

## What You Gain

- **.NET 10 performance** — faster cold startup, better async throughput, improved JSON serialization (relevant for headless/CDA use)
- **Cleaner APIs** — less boilerplate, more consistent patterns
- **Native Graph integration** — more mature content graph support for headless scenarios
- **Better AI tooling compatibility** — CMS 13 APIs are better suited to AI-assisted development

## Sources

- [Stuart Greig — CMS 13: The Evolution We've Earned](https://stuartgreig.dev/blog/optimizely-cms-13-upgrade) *(Apr 2026)*
- [[removing-unused-properties|Removing Unused Properties in CMS 13]]
- [[dotnet-compatibility|.NET Compatibility]]
