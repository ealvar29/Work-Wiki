---
title: "Breaking Change: Path-Scoped Guards Go Dead on CMS 13"
tags:
  - optimizely
  - cms
  - upgrade
  - bugs
  - debugging
---

> Written **2026-11-04** from the oxy.com CMS 13 assessment (ADO 146760), against OxyChem's shipped CMS 13 code and the CMS 13.4.0 assemblies.

**The CMS editor moved from `/EPiServer` to `/ui/cms` in CMS 13. Any middleware, filter or guard scoped on the literal path `/EPiServer` still compiles, still registers, still reviews as correct — and never fires again.**

There is no compiler error, no warning, and no log line. The guard is simply decoupled from the thing it was written to protect. **This has already happened on a production CMS 13 site of ours.**

## The shape

```csharp
// CMS 12: fires on editor traffic. CMS 13: can never match.
catch (System.Reflection.AmbiguousMatchException) when (
    !ctx.Response.HasStarted
    && ctx.Request.Path.StartsWithSegments("/EPiServer", StringComparison.OrdinalIgnoreCase))
//                                          ^^^^^^^^^^ dead on CMS 13
{
    await WriteBadRequest(ctx);
}
```

The guard was ported verbatim during the upgrade. The port was correct in every respect except the one that mattered — **the thing that changed was not in the diff.**

## Why it is hard to catch

| Review step | What it shows |
|---|---|
| Compiler | nothing — `StartsWithSegments` on any string is valid |
| Code review | the guard looks right; it *is* the same code that worked on CMS 12 |
| Boot / smoke test | nothing — the middleware registers and runs on every request |
| Logs | nothing — the `when` clause simply evaluates false |
| The original Sentinel fingerprint | **silent until the underlying fault recurs**, which may be months |

This is the same failure signature as [[post-upgrade-gotchas|PropertyList silent data loss]]: **the absence of a symptom is the symptom.** A guard that never fires and a guard that never needed to fire are indistinguishable from the outside.

## The editor path on CMS 13 — get this right first

| CMS | Editor base path |
|---|---|
| CMS 12 | `/EPiServer/CMS/` |
| CMS 13, early Shell | `/Optimizely/CMS/` |
| **CMS 13, Shell 13.1.x+ / Opti ID** | **`/ui/cms`** |

Case-insensitive, trailing slash optional; deep links carry a fragment (`/ui/cms#context=epi.cms.contentdata:///13135`). `/EPiServer/CMS/`, `/Optimizely/CMS/` and `/ui/` alone all redirect to the site home — **which reads exactly like a login failure** and has cost debugging time more than once.

> **Read `RouteBasePath` from the Shell module's startup log** rather than assuming. It has moved twice; it can move again.

## The fix — scope on routing state, not on a string

The durable version of this guard was already discovered on oxy.com under ADO **137421**, for an unrelated reason: a guard scoped on the *exception message* missed a second call site that threw the same exception type with different wording. The lesson generalises past messages to paths.

```diff
- && ctx.Request.Path.StartsWithSegments("/EPiServer", StringComparison.OrdinalIgnoreCase)
+ && ctx.GetEndpoint() is null
```

**Routing state is not a string.** `GetEndpoint() is null` means "routing has not yet selected an endpoint", which is a structural fact about where in the pipeline the throw happened — it cannot be invalidated by a rename, a shell upgrade or a config change. The matcher policy runs before routing picks an endpoint, and `StatusCodePages` clears the endpoint before re-executing, so one condition covers both passes.

> **This rewrite only suits guards that catch a throw *before routing*.** For a guard that wraps a real endpoint — e.g. one catching `AntiforgeryValidationException` from a controller action — routing has already selected that endpoint when the exception surfaces, so `GetEndpoint()` is non-null and the rewritten guard **never fires**. That is the same dead-guard bug, introduced by the fix. For those guards, keep a path (or endpoint-metadata) scope and follow the steps below. *(VHB spike VHBK-499, 2026-11-05 (spike/cms13 commit 13ed447, CMS 13.5.1 / Forms 6.0.2 package metadata).)*

Where routing state genuinely will not distinguish the cases and you must scope on a path, then:

1. **Read the path from configuration, not a literal.** Bind the shell base path once and reference it.
2. **Add a boot-time assertion** that the configured path resolves, so a future move fails loudly at startup instead of silently at runtime.
3. **Leave a comment naming the coupling**, so the next upgrade's grep finds it.

## Audit procedure for an upgrade

Run this *during* the upgrade, not after:

1. **Grep every literal platform path in middleware, filters and attributes.** `/EPiServer`, `/Optimizely`, `/episerver`, `/util`, `/modules`, `/ui`. Include `Contains`, `StartsWith`, `StartsWithSegments`, `Equals` and route templates.
2. **For each hit, ask: is this path still what the platform uses?** Do not assume the compile proved it.
   - **Known false positive: `/EPiServer.Forms/DataSubmit`.** It matches a `/EPiServer` grep, but it is a **Forms-module** route, not the editor shell, and it is **unchanged in Forms 6.0.2**. A guard scoped on it (e.g. VHB's antiforgery guard on `/EPiServer.Forms/DataSubmit`) is still live on CMS 13 — leave it alone. *(VHB spike VHBK-499, 2026-11-05 (spike/cms13 commit 13ed447, CMS 13.5.1 / Forms 6.0.2 package metadata).)*
3. **Re-scope on routing state where possible**; otherwise configuration + a boot assertion.
4. **Exercise each guard deliberately before sign-off.** A guard that has never been seen to fire on the new version has not been tested.

> Step 4 is the one teams skip. These guards exist precisely because their trigger is rare — which means normal QA will never hit them, and "no errors in UAT" is not evidence.

## Confirmed instances

| Site | Location | Status |
|---|---|---|
| OxyChem (CMS 13, production) | `Startup.cs:1367` — ADO 134862 `AmbiguousMatchException` guard scoped `/EPiServer` | 🔴 **dead** — raised on the OX board |
| OxyChem (CMS 13, production) | `Startup.cs:1395` — antiforgery token issue checks `/EPiServer/` and `/Optimizely/`, not `/ui/cms` | 🟠 partially dead; the `application/x-www-form-urlencoded` fallback catches most real posts |
| [[work/clients/oxy/index\|oxy.com]] (CMS 12) | same guard, same literal | ✅ correct **today**; must change in the CMS 13 port |

## Where else this bites

Not only CMS 13, and not only paths. The general class is **a guard whose scope is coupled to a value the platform owns**:

- **Exception-message scoping** — ADO 137421: `UriFormatException` has several messages and they are localised. A guard matching one message missed a second throw site entirely.
- **Namespace / type-name scoping** — reflection or config matching on a full type name breaks when a type moves assemblies. CMS 13 moved `SimpleAddressResolverPipelineStep` out of `EPiServer.Cms.AspNetCore.Routing.dll` into `EPiServer.dll` without changing its behaviour.
- **Status-code scoping** on a platform that changes how it degrades — see the bodiless-4xx trap in [[post-upgrade-gotchas|Post-Upgrade Gotchas]].

**The rule:** scope a guard on the narrowest thing *you* control or that is structurally invariant. Anything the vendor can rename is a time bomb with no fuse you can see.

## Related

- [[post-upgrade-gotchas|Post-Upgrade Gotchas]] — the silent-failure family this belongs to
- [[breaking-changes|Breaking Changes]] — the catalogued, documented ones; this is not among them
- [[agent-quickstart|AI Agent Quickstart]] — the editor-URL table an agent needs before it verifies anything
- [[work/clients/oxychem/index|OxyChem]] — the CMS 13 reference implementation where this was found
- [[work/clients/oxy/index|oxy.com]] — the port that must not inherit it
