---
title: Debugging in Optimizely DXP
tags:
  - optimizely
  - dxp
  - debugging
  - devops
---

## The Short Answer

True remote debugging against a live DXP environment is **not a supported workflow**. The platform is a managed PaaS built on Azure App Service, and the infrastructure restrictions are intentional.

## What People Have Tried

The underlying Linux Azure App Service *technically* supports SSH access, which opens up:
- SSH tunneling via Azure CLI
- Attaching JetBrains Rider or Visual Studio to a running .NET process over SSH

In practice, this consistently breaks down because:

- **Bandwidth throttling** — file uploads for debugger tools stall mid-transfer; WebSocket connections drop
- **Permission limits** — traffic control tools fail due to missing Linux capabilities
- **Visual Studio** rejects SSH connections entirely with minimal error output
- **Connection instability** — even successful SSH sessions last seconds before terminating

## What Actually Works

| Approach | Reliability |
|---|---|
| Structured logging + Application Insights | High |
| Kudu log streaming | High |
| Local reproduction with production data export | High |
| SSH to Integration env (shell only) | Medium |
| Remote debugger attachment | Not viable |

## Practical Approach

Build your observability in from the start:

- Use `ILogger<T>` with named placeholders throughout (searchable in App Insights)
- Reproduce issues locally — DXP's integration environment can be cloned to local with a database export
- Add detailed exception logging at boundaries (API calls, content saves, scheduled jobs)
- Use Application Insights custom events/dimensions to track state that's hard to reproduce

Previous DXP versions had simpler remote debugging, but architectural changes to the managed platform removed that capability. Don't fight the platform — invest in logging instead.

## First-boot crash loops

When an environment won't start at all (warmup returns 503), it's usually a startup
exception, not a debugging problem. The **DXP log stream** (PaaS portal) shows the
container's stdout including the unhandled exception and stack — that's the fastest path to
the cause. Common first-boot failures on restored-DB upgrades (DB compat level, hostname
bindings, empty Graph index) are catalogued in [[deploying-to-dxp|Deploying a CMS 13 Upgrade to DXP]].

## Retrieving logs: four traps that produce confidently wrong answers

Logs are the main diagnostic tool on DXP, and every one of these has silently produced a false conclusion.

### 1. Warmup and startup output lives under `/SLOTS/SLOT/` — pull it separately

The main application path does **not** contain the deploy-window warmup logs. Startup exceptions, init-module failures and boot-time stack traces land under the slot path and need a separate download with `slot: true`.

**A clean-looking boot is often just an unpulled slot.** In one investigation the main path showed nothing, and the slot pull surfaced the `AutoMapperMappingException` that explained the entire failure.

### 2. "Download Already In Progress" can mean nothing is downloading

A stale job pinned at 100% silently swallows the request. Run the cancel operation and retry. If you trust the first response you will report a clean result from logs **you never read**.

### 3. Prove your negatives with a positive control

"I searched for X and found nothing" is worthless on its own — a broken parse, an empty file set or a wrong time window all look identical to a genuine absence.

Before reporting a zero, run a control against the *same parsed objects*: confirm a term you know is present (`Exception`, `error`) matches, and that message text is actually populated in the field you're reading. Report the control alongside the zero.

This matters because **a proven zero is often the most informative result you can get.** Instrumentation deployed to catch a suspected failure that logs *nothing* tells you the code path is never reached — which is a stronger finding than any stack trace, but only if the search is trustworthy.

### 4. Streaming analysis gives counts, not messages

Streaming/aggregating log tools typically return an inventory — status codes, counts, timestamps — and **no message text**, so they cannot give you a stack trace. For traces you need the raw download and local parsing.

Two parsing details when you do that:

- Console stack frames arrive as **one JSONL record per frame**. Reassemble them or you'll see a bare exception type with no origin.
- Web-log `properties` is a **double-encoded JSON string with PascalCase keys**.

### 5. Timestamps: don't double-convert

In PowerShell, `ConvertFrom-Json` turns an ISO string like `"…T11:48:46Z"` into a `DateTime` with `Kind=Utc`. Passing that object to `[datetime]::Parse()` stringifies it, loses the `Kind`, re-parses as local, and a subsequent `.ToUniversalTime()` adds your offset **a second time**. A UTC-5 machine reports events five hours late, which can pull unrelated events into your window and attribute them to the wrong deploy.

Parse the raw string with `AssumeUniversal | AdjustToUniversal`. **Sanity check:** each line's hour should match its `h=NN` file partition.

## Related

- [[deploying-to-dxp|Deploying a CMS 13 Upgrade to DXP]] — the deploy pipeline + first-boot error catalogue

## Sources

- [Mike — Remote Debugging in Optimizely DXP: What Is Actually Possible?](https://world.optimizely.com/blogs/mike/dates/2026/4/remote-debugging-in-optimizely-dxp-what-is-actually-possible-/) *(Apr 2026)*
