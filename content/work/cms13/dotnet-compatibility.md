---
title: CMS 13 .NET Compatibility
tags:
  - optimizely
  - cms
  - dotnet
---

> Last reviewed **2026-11-03**. The earlier version of this page recommended **.NET 8 LTS** for production CMS 13. **That recommendation is withdrawn** — it was written 2026-06-23, before we had shipped anything, and two of our own production deployments have since gone the other way. See *What we actually run* below.

CMS 13 requires the modern .NET unified platform. CMS 13 went GA **2026-03-31** and takes **.NET 10** as its baseline.

## What we actually run

Evidence beats vendor guidance here — these are ours, in production:

| Project | CMS | Runtime | SDK pin | Since |
|---|---|---|---|---|
| [[work/clients/oxychem/index\|OxyChem]] | **13.x** | **.NET 10** | `10.0.300` | live **2026-09-18** |
| [[work/clients/oxy/index\|oxy.com]] | 12.34.8 | **.NET 10** | `10.0.100`, `rollForward: latestFeature` | **2026-09-30** (143137) |

Two things follow:

1. **.NET 10 is the default choice for a CMS 13 project**, not an aspiration. OxyChem has carried real production traffic on it since September.
2. **.NET 10 can be taken independently of CMS 13.** oxy.com runs CMS **12** on .NET 10 and did so as a standalone work item. That is a genuinely useful de-risking move: it splits the framework jump away from the CMS jump so a later defect has one candidate cause instead of two.

> [!tip] Sequencing lesson from oxy.com
> Taking .NET 10 first on CMS 12 cost one work item and removed the entire framework dimension from the CMS 13 estimate that followed. If a client is on .NET 6 and not ready to commit to CMS 13, this is the move — **.NET 6 has been out of Microsoft support since 11/2024**, so the runtime upgrade is non-optional regardless of CMS plans.

## Support matrix

| .NET Version | Status for CMS 13 | Notes |
|---|---|---|
| .NET 8 | Runs (LTS) | Original CMS 13 target. No longer our recommendation — we have no project on it and no field evidence behind it. |
| **.NET 10** | **Recommended** | What both our .NET 10 projects run. CMS 13's own baseline. |
| .NET 11 | Verify before use | See below. |

### .NET 11

Stuart Greig confirmed (Apr 2026) that CMS 13 boots on .NET 11 Preview with a single `.csproj` change and no code changes:

```xml
<TargetFramework>net11.0</TargetFramework>
```

**GA was expected November 2026 — that is now.** This page has not been re-verified since; **check the current GA and Optimizely support status before citing it**, and do not move a production project on the strength of this paragraph alone.

Performance characteristics that would matter to CMS if it does land: JIT/PGO (faster cold start, which matters for DI-heavy CMS init), lower async state-machine allocation, allocation-free `System.Text.Json`, `Span<T>` improvements.

> [!warning] `System.Text.Json` is not a free win on CMS 13
> Faster STJ is listed as a benefit, but on CMS 13 STJ is also the cause of the **`PropertyList<T>` silent-data-loss** defect — an `XhtmlString` member cannot be materialised and the **entire list** returns empty with no exception and no log line. See [[post-upgrade-gotchas|Post-Upgrade Gotchas]]. Do not read "STJ improvements" as "STJ problems solved."

## .NET 10 traps we have actually hit

From oxy.com's CMS 12 → .NET 10 move (143137). None are CMS-13-specific; any project taking .NET 10 will meet them:

- **`System.Linq.Async` must be 7.x.** 6.x collides with the BCL's own `AsyncEnumerable` on net10.
- **A package whose newest minor is net8+ only restores cleanly and then fails at compile** on an older TFM. Hit with `LigerShark.WebOptimizer.Core` 3.0.469+. Restore success is not compatibility evidence.
- **.NET 6 cookies fail MAC exactly once under .NET 10** — every signed-in user re-logs in once. Expected, not a defect; warn the client.
- **`IPageRouteHelper` returns `null` on non-content routes** from CMS 12.24 (12.21 fell back to the start page). This is a CMS-version trap that surfaces during the same upgrade window, so it reads like a .NET 10 regression and is not one.

## Package constraints from `EPiServer.CloudPlatform.Cms` 13.x

On DXP, `EPiServer.CloudPlatform.Cms` 13.x constrains the dependency graph *(VHB spike VHBK-499, 2026-11-05 (spike/cms13 commit 13ed447, CMS 13.5.1 / Forms 6.0.2 package metadata))*:

| Constraint | Consequence |
|---|---|
| `Microsoft.ApplicationInsights.AspNetCore` **< 3.0** | You cannot take App Insights 3.x on DXP until this cap moves |
| Hard-pins `Optimizely.Cms.OpalChat` | Opal chat ships whether or not you use it |
| Pulls in `EPiServer.Telemetry.Segment` | New telemetry dependency |

**CIPA-relevant:** the last two can add client-side third-party traffic. On a consent-gated site, **re-run a live Network capture after upgrading** rather than trusting the pre-upgrade tracker inventory. See [[deploying-to-dxp|Deploying to DXP]].

## Sources

- [Stuart Greig — Running Optimizely CMS 13 on .NET 11 Preview](https://stuartgreig.dev/blog/running-optimizely-cms-13-on-net-11-preview/) *(Apr 2026)*
- Our own csproj files — `OxyChem` repo (`dev.azure.com/OxyChem/EPIServer/_git/OxyChem`, branch `main`) and `Episerver` repo (`dev.azure.com/oxycorp/oog-dwp-dwo-episerver`, branch `master`)
