---
title: Optimizely Opal — Install & Troubleshooting (CMS 13)
tags:
  - optimizely
  - cms
  - opal
  - ai
  - csp
---

How to install **Optimizely Opal** (the in-editor AI assistant) on a CMS 13 PaaS/DXP site, plus the non-obvious blockers that will eat a day if you don't know them. Written from the OxyChem Integration rollout, July 2026 — every gotcha below was hit for real.

> [!tip] The one thing to remember
> Opal's chat streams over a **WebSocket** (`wss://ws.opal.optimizely.com`). A schemeless `*.optimizely.com` in your CSP does **NOT** cover the `wss://` scheme — so the widget loads, greets you, then dies with **"Connection lost"** the moment you send. See [CSP](#content-security-policy-the-big-one).

## What Opal is

Opal is Optimizely's AI agent platform. In CMS 13 it shows up in **three** places — knowing the difference is most of the battle:

| Surface | Package | What it is |
|---|---|---|
| **Ask Opal** (chat) | `Optimizely.Cms.OpalChat` | Conversational panel, top-right of the editor. Streams responses live. |
| **Opal Tools** (agents) | `Optimizely.Cms.Opal.Tools` | ~14 CMS actions Opal invokes on your behalf (create/edit content, SEO, JSON-LD, media upload), within your permissions. |
| **AI Translation** | (part of OpalChat) | In the **Add Language** dialog — Opal drafts the translated version. |

Opal is a **separate, usage-based subscription** (Opal Credits), gated behind **Opti ID**, cloud-only, and **works on PaaS/DXP**. It is *not* included with CMS 13.

## Prerequisites

1. **CMS 13 on Optimizely DXP** (PaaS). SaaS has its own Opal path.
2. **Opti ID working** — editor login must actually complete. Opal authenticates its widget through the Opti ID session; no Opti ID, no Opal.
3. **Optimizely Graph in place** — Opal's content-aware features (RAG, content tools) read your content *through* Graph. See [Scheduled jobs](#scheduled-jobs--graph-indexing).
4. **Org-level Opal subscription + credits** — provisioned by the **Customer Success Manager**, *not* self-service.
5. **Admin Center connection** — the specific CMS instance must be associated with the Opal instance (see below). The org toggle alone is not enough.
6. **Third-party cookies enabled** in the editor's browser — the widget is cross-origin.

## Install

### 1. Packages

```
Optimizely.Cms.OpalChat        2.0.0    (needs EPiServer.CMS.UI >=13 <14)
Optimizely.Cms.Opal.Tools      13.1.0   (needs EPiServer.Cms.Core >=13 <14, .NET 10)
```

Both restore from the Optimizely NuGet feed (`https://api.nuget.optimizely.com/v3/index.json`).

### 2. Service registration (`Startup.cs` / `Program.cs`)

Register **after** Opti ID — OpalChat authenticates via the Opti ID session and both are no-ops without it.

```csharp
using Optimizely.Cms.DependencyInjection;  // AddOpalChat()
using Optimizely.Cms.Opal.Tools;           // AddCmsOpalTools()

services.AddOptimizelyIdentity(useAsDefault: true);
services.AddOpalChat();       // the in-editor chat widget
services.AddCmsOpalTools();   // the CMS tools Opal can invoke
```

> [!note] `using` directives
> `AddOpalChat()` lives in `Optimizely.Cms.DependencyInjection` (often already imported for other CMS registrations). `AddCmsOpalTools()` lives in `Optimizely.Cms.Opal.Tools` — that one usually needs adding.

### 3. Configuration (`appsettings.json`)

```json
"Optimizely": {
  "OpalChat": {
    "InstanceId": "<your Opti ID InstanceId>",
    "ServiceUrl": "https://opal-backend.optimizely.com"
  }
}
```

`InstanceId` is the **same** value as `EPiServer:Cms:OptimizelyIdentity:InstanceId` (a non-secret identifier). Per Optimizely, **production/DXP environments need no further config** (no `AppBaseUrl`/`SocketUrl` — those are only for non-standard setups).

### 4. Admin Center connection (easy to miss)

With the **Opal Administrator** role: **Opal → Connections** tab → select the CMS instance → **Save**. Without this binding the widget loads but won't connect.

## Content Security Policy (the big one)

If your site sends a Content-Security-Policy, Opal needs these entries. This is where most of the debugging time goes.

| Directive | Entry | Why |
|---|---|---|
| `connect-src` | **`wss://ws.opal.optimizely.com`** | **The live chat socket (socket.io).** Load-bearing — without it: greeting loads, send fails, "Connection lost." |
| `connect-src` | `cdn.segment.com`, `api.segment.io` | Opti ID nav shell's analytics; blocking cascaded into "connection lost." |
| `script-src` | `js.userflow.com` | In-app product tours; blocked → `Uncaught Error: Could not load Userflow.js`. |
| all directives | `*.optimizely.com` | Covers `opal.optimizely.com` (REST/hypatia API) + `common.optimizely.com`. |

> [!warning] The WebSocket / CSP trap
> A schemeless host-source (`*.optimizely.com`) matches `http`/`https` but **not** the `wss://` scheme. Even though `ws.opal.optimizely.com` *is* an `*.optimizely.com` subdomain, Chrome refuses the WebSocket unless the `wss://` scheme is spelled out. You **must** add `wss://ws.opal.optimizely.com` (or `wss://*.optimizely.com`) explicitly. This is why the chat looks connected (greeting + REST over https work) but dies on send (needs the socket).

If the site's CSP is managed as data (e.g. an editable settings page) rather than in code, remember to **publish/refresh** whatever caches it after editing.

## Scheduled jobs — Graph indexing

**Opal itself registers zero scheduled jobs.** Chat and tools are on-demand; there's no background sync, no credit-reconciliation job (credits are metered server-side).

What *does* matter is **Optimizely Graph indexing**, because Opal sees your content through Graph:

| UI name (Admin → Scheduled Jobs) | Internal class | Role |
|---|---|---|
| **Optimizely Graph Full Synchronization** | `ContentIndexingJob` | Full rebuild of the Graph index |
| **Optimizely Graph Delta Synchronization** | `DeltaSynchronizationJob` | Incremental catch-up |

> [!note] "I don't see a Content Indexing job"
> It's there — the display name is **"Optimizely Graph Full Synchronization"** (the internal class is `ContentIndexing`). There's no separate "Smooth Rebuild" row; Full Synchronization does the full rebuild.

In normal operation Graph indexes **on publish (real-time, event-driven)** — that's the primary path, no job involved. The sync jobs are reconciliation/rebuild levers. Practically: **run Full Synchronization after content-type changes or bulk imports** so Opal (and Content Manager + search) pick up the new shape.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Chat greets you, then **"Connection lost, please reload"** on send | `wss://ws.opal.optimizely.com` blocked by CSP | Add it to `connect-src` (with the `wss://` scheme) |
| `Refused to connect … violates … Content Security Policy` | Missing `connect-src` domain | Add the exact domain from the error |
| `api.segment.io … net::ERR_NAME_NOT_RESOLVED` | Client-side tracker blocker / OneTrust AutoBlock / DNS filtering | **Benign** — telemetry, self-caught. Not the blocker. |
| `opalchat-bundle.js: No 'epi-navigation-root' element found. Retrying...` | Load-order race | **Red herring** — resolves on its own; look at the CSP/socket instead |
| `Could not load Userflow.js` (blocked by script-src) | `js.userflow.com` not allowed | Add to `script-src` (cosmetic — product tours) |
| `Cannot overwrite navigator.credentials … while 1Password is enabled` | 1Password browser extension | Benign |
| 404 on `opal.optimizely.com/hypatia/api/v1/{id}/agents/opal_personalization` | Empty agent path (instance id is Opal-derived, ≠ Opti ID InstanceId) | Non-fatal |
| Worked before, now "Connection lost" on one machine | Browser tracker-blocker / blocked 3rd-party cookies | Test in a clean profile; whitelist the domain |

## Related

- [[ai-assistant|AI Assistant v4]] — Luc Gosso's *community* AI package (different product; don't confuse with Opal)
- [[graph-vs-search-navigation|Graph vs Search & Navigation]] — how the index Opal reads is built
- [[cms13-demo-guide|CMS 13 Demo Runbook]] — includes the Opal live-demo segment
- [[cms13-technical-qa|CMS 13 Technical Q&A]] — Opal subscription/licensing answers
