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

## The deployment API cannot answer historical questions

Worth knowing before you build an investigation on it, because it fails by returning *plausible* data rather than an error.

- **`list_deployments` returns only the ~10 most recent deployments, and paging is silently broken.** Passing `offset: 10` can return a **byte-identical payload** to `offset: 0`. So a project deploying several times a week exposes roughly the last fortnight, and any question about last month gets an answer that looks complete and isn't.
- **Passing `environmentSlot` can return "No deployments found"** even when deployments exist. Omit it and filter client-side.
- **`db_export` has no list endpoint** — the list call returns HTTP 405. You can ask for the *latest* export status, but you cannot enumerate history.
- **Check what the deployment records actually contain before inferring from them.** A code-package upload carries `isPackageUpload: true` and `sourceEnvironment: null`, with no `includeDb` / `includeBlob` flags anywhere. If every record looks like that, no content movement is recorded — but that is *absence of evidence*, not evidence of absence, because a portal-driven "Copy content" action may never appear in deployment history at all.

**Practical rule:** the deployment API tells you what happened recently. For anything older, or for content movement, go to the content database.

## Dating a content snapshot when nothing recorded it

A recurring question on upgrade projects: *when was this environment's content copied from production?* It matters, because every "this page is missing" report is either a genuine migration defect or simply content authored after the snapshot — and you cannot tell which without the date. Frequently nobody wrote it down.

If the deployment API is empty (see above) and there's no `.bacpac` in storage, the content database will tell you itself.

**The technique.** Any environment where scheduled jobs run leaves a heartbeat in `tblScheduledItemLog`. Restore a snapshot into a different environment and you import the **source's** heartbeat, then begin writing your **own** — so the copy shows up as a discontinuity you can read straight off:

```sql
-- job executions per day; look for the cliff
SELECT CAST([Exec] AS date) AS d, COUNT(*) AS runs
FROM tblScheduledItemLog
GROUP BY CAST([Exec] AS date)
ORDER BY d DESC;
```

On one project this showed 81–134 executions/day across three servers, continuous, then **60 days of complete silence**, then a resumption with a totally different shape — sparse, one execution per server, a new container ID nearly every time. That second pattern is a dev environment being redeployed, not a live site. The last dense day is the source system's final beat; the first sparse day is the target's first.

Corroborate with content timestamps:

```sql
SELECT CAST(Saved AS date) AS d, COUNT(*) FROM tblContent
GROUP BY CAST(Saved AS date) ORDER BY d DESC;
```

**Two schema gotchas.** `Exec` is a **T-SQL reserved word** — bracket it or the query won't parse. And **CMS 13 has no `tblContentVersion`**; use `tblContent.Saved`.

**Bound it from both ends.** The job-log gap gives a *lower* bound (when the source stopped) but not the restore moment, which could be anywhere in the silence. Pair it with an *upper* bound from outside the database: fetch production's `sitemap.xml`, and for every URL that 200s on production but 404s on the restored environment, read its `<lastmod>`. Each one must have been created after the snapshot, so the **earliest** such `lastmod` caps it. On the project above this collapsed a 60-day window to about three days.

**The generalisable point:** a deployment record describes an *operation*, and if nobody performed that operation through the audited path, there is nothing to find. The content database keeps a clock for its own reasons. When an audit API comes back empty, look for a clock the system maintains for itself rather than for you.

## Related

- [[deploying-to-dxp|Deploying a CMS 13 Upgrade to DXP]] — the deploy pipeline + first-boot error catalogue
- [[post-upgrade-gotchas|Post-Upgrade Gotchas in CMS 13]] — includes the restored-DB sitemap host-binding trap

## Sources

- [Mike — Remote Debugging in Optimizely DXP: What Is Actually Possible?](https://world.optimizely.com/blogs/mike/dates/2026/4/remote-debugging-in-optimizely-dxp-what-is-actually-possible-/) *(Apr 2026)*
