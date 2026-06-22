---
title: "CMS 13 Refresher — Crash Course"
tags:
  - optimizely
  - cms
  - fundamentals
  - training
---

# CMS 13 Refresher — Crash Course

A from-the-ground-up path to get fully confident on CMS 13 — what it is, what changed, how an upgrade actually runs, and the distinctions people (including us) get tripped up on. Work top to bottom; each section links to the deep-dive page when you want more.

If you only remember one thing: **CMS 13 is a platform modernization, not a version bump.** Three things are mandatory, everything else is additive.

---

## 1. The mental model (read this first)

```
        .NET 10  +  Optimizely Graph  +  Opti ID
        └──────────── the 3 non-negotiables ───────────┘
                            │
        then layer on (all optional / additive):
        Visual Builder · Opal · DAM · OCP · GEO Analytics
```

| The 3 non-negotiables | Why it's mandatory |
|---|---|
| **.NET 10** | Project must retarget. No .NET 8 support path. |
| **Optimizely Graph** | Replaces Search & Navigation *entirely* — there is no way around it. |
| **Opti ID** | The SSO/identity layer. Without it, Opal, OCP, DAM, and GEO Analytics simply can't be enabled. |

Everything else — Visual Builder, Opal, DAM, OCP — only becomes possible *after* those three are in place. When a client asks "can we get feature X," your first reflex should be: **does X depend on Opti ID, and is X tied to a deployment model?** (That single reflex is what would have answered the GEO question instantly — see §6.)

Deep dive: [[what-is-cms13|What is CMS 13?]] · [[world-tour-2026-briefing|World Tour Briefing]]

---

## 2. What actually changed from CMS 12

| Area | CMS 12 | CMS 13 |
|---|---|---|
| Runtime | .NET 6/8 | **.NET 10**, C# 13 |
| Search/delivery | Search & Navigation (Find) | **Optimizely Graph** (mandatory) |
| Default editor | On-Page Editing | **Visual Builder** (OPE off by default, not removed) |
| Site config | `SiteDefinition` | **Applications model** |
| Identity | Per-product login | **Opti ID** (SSO, MFA, SCIM) |
| Editor UI customization | Dojo | **ES6 modules / modern JS** — Dojo gone |
| Starter template | Alloy | **Stride** |
| Management API | — | New **REST API v1**, payloads consistent with SaaS |

MVC is **still fully supported**. Visitor Groups still work in MVC but are **not indexed in Graph**.

Deep dives: [[breaking-changes|Breaking Changes (full catalog)]] · [[applications-model|Applications Model]] · [[dotnet-compatibility|.NET Compatibility]] · [[cms12-to-cms13-cheatsheet|Code Cheatsheet]]

---

## 3. How an upgrade actually runs

The **official 5-step path** (can be one project or split across releases):

1. Migrate to **Opti ID**
2. Migrate to **Optimizely Graph** (retire Search & Navigation)
3. Prepare for **.NET 10** (retarget, fix dependencies)
4. **Upgrade** CMS packages to 13.x
5. **Enable new features** — Visual Builder, Opal, DAM, OCP as desired

What drives complexity: heavy Search & Navigation use, volume of custom code, on-prem vs DXP, and number of add-ons/integrations.

Two things that bite teams who skip planning:
- **Involve Optimizely early.** Provisioning Opti ID, OCP, Opal, and DAM goes through the **CSM — it's not self-service.** Only S&N→Graph and CMS 11→12 are self-service.
- **It's not just a dev project.** Login, roles, and DAM workflows change for editors — plan change management. And Opti ID/Opal/Graph add new data sub-processors, so get GDPR/legal sign-off up front.

Note: you **can** upgrade CMS 11 → 13 directly — the effort is about the same as going to 12 first, so jumping straight is generally recommended.

Deep dives: [[upgrading-from-cms12|Upgrading from CMS 12]] · [[upgrade-checklist|Upgrade Checklist]] · [[upgrade-accelerator|Upgrade Accelerator (our workflow)]] · [[post-upgrade-gotchas|Post-Upgrade Gotchas]]

---

## 4. The new features, in one line each

- **Visual Builder** — default editor. Structure is **Experience → Section → Row → Column → Element**. Blocks become elements via `CompositionBehaviors = ["elementEnabled"]`. Works on PaaS *and* SaaS. → [[visual-builder|Visual Builder]]
- **Optimizely Graph** — the new delivery/search layer. It's a **SaaS service**, but on-prem/PaaS CMS 13 integrates with it; schema is generated automatically. → [[graph-sdk|Graph C# SDK]] · [[search-to-graph|S&N → Graph]]
- **Opal** — Optimizely's AI agent platform. **Separate subscription** (usage-based credits), requires Opti ID, cloud-only, **works on PaaS**. OpalChat lives in the editor; also powers AI translation. → [[ai-assistant|AI Assistant v4]]
- **DAM** — embedded asset management in the editor. Optional, cloud-only, requires Opti ID; coexists with the existing media library. No automated migration tool — references are updated manually. → [[dam-integration|DAM Integration]]
- **OCP (Optimizely Connect Platform)** — integration middleware built in. Free tier (jobs, syncs, webhooks, UI extensions) + paid tier (private apps, object storage).
- **GEO Analytics** — dashboard showing which AI agents crawl your site and whether crawls become referrals. See §6 — it's the worked example of why the *details* matter.

---

## 5. Deployment models — the thing to never get wrong

Most client confusion lives here. Memorize the shape of this table:

| Capability | On-Prem | PaaS | SaaS |
|---|---|---|---|
| Custom .NET code (MVC InProc) | Yes | Yes | **No** |
| Visual Builder | Yes | Yes | Yes |
| Opal + Graph + OCP | Yes | Yes | Yes |
| Frontend ACL / Personalization / Projects | Yes ¹ | Yes ¹ | No |
| Multi-Site / Multi-Language | Yes | Yes | Mostly ² |

¹ Requires MVC InProc (not headless). ² Validate the specific config with Optimizely.

**SaaS is wrong for** custom middleware, MVC filter pipelines, or frontend ACL/personalization. Our clients on PaaS keep full custom-code control; SaaS trades that for zero-maintenance/auto-updates.

Other "incompatibility" facts worth burning in:
- **Commerce 14 is incompatible with CMS 13** — compatibility arrives with **Commerce 15**.
- **DAM / Opal / Opti ID are not available on-prem** (cloud-only).

Deep dive: [[cms13-technical-qa|CMS 13 Technical Q&A]] (this answers most client questions verbatim).

---

## 6. Worked example: the GEO Analytics question (why details matter)

This is the one that made you doubt yourself, so here's the full reasoning laid out — it's the template for how to think about *every* feature-availability question.

The question was: *"Will the GEO Analytics dashboard be available if a PaaS client upgrades to CMS 13?"*

The right way to answer it is three checks:

1. **Does it depend on Opti ID?** Yes — so it can't exist without step 1 of the upgrade. (Opti ID is a requirement anyway, so this part is fine.)
2. **Is it tied to a deployment model?** Yes — there's a **GEO Analytics** dashboard for PaaS and a **GEO Insights** dashboard for SaaS. So *a* GEO analytics dashboard exists for both.
3. **Any provisioning/version caveat?** **Yes — and this is the trap.** Optimizely marked the PaaS GEO Analytics dashboard as a **legacy feature, access frozen as of May 31, 2026.** New accounts get steered to the newer **Agent Visibility dashboard** in Optimizely Analytics instead.

So the honest answer isn't a flat "yes" — it's *"yes, they'll have GEO analytics capability, but confirm whether they get the legacy dashboard or the new Agent Visibility one given the cutoff."* The lesson: **availability = Opti ID dependency + deployment model + provisioning/version caveats.** Run all three every time.

Full detail: [[geo-analytics|GEO Analytics]]

---

## 7. Self-test — you're caught up when you can answer these

Cover the answers and try to respond out loud. If any feel shaky, jump to the linked page.

1. What are the 3 non-negotiables of every CMS 12→13 upgrade? *(§1)*
2. What replaced Search & Navigation, and is there a way to avoid it? *(no — Graph is mandatory, §2)*
3. List the official 5-step upgrade path in order. *(§3)*
4. Can you upgrade CMS 11 → 13 directly? *(yes, §3)*
5. What's the Visual Builder content hierarchy? *(Experience→Section→Row→Column→Element, §4)*
6. Is Opal included with CMS 13? Does it work on PaaS? *(separate subscription; yes on PaaS, §4)*
7. Name three things SaaS can't do that PaaS can. *(custom .NET code, frontend ACL/personalization, custom middleware, §5)*
8. Which Commerce version works with CMS 13? *(15, not 14, §5)*
9. Why isn't "will GEO Analytics be available?" a simple yes/no? *(legacy cutoff + deployment split, §6)*
10. What does Opti ID gate, and is it available on-prem? *(Opal/OCP/DAM/GEO Analytics; not on-prem, §1/§5)*

---

## 8. Suggested reading order after this page

1. [[what-is-cms13|What is CMS 13?]] — cements the platform stack
2. [[world-tour-2026-briefing|World Tour Briefing]] — the accreditation-level distillation
3. [[cms13-technical-qa|Technical Q&A]] — the client-question answer bank
4. [[upgrading-from-cms12|Upgrading from CMS 12]] + [[upgrade-accelerator|Upgrade Accelerator]] — how we actually run it
5. [[breaking-changes|Breaking Changes]] + [[post-upgrade-gotchas|Post-Upgrade Gotchas]] — what goes wrong
6. [[graph-sdk|Graph C# SDK]] + [[search-to-graph|S&N → Graph]] — the biggest technical migration
7. [[cms12-to-cms13-case-study|Case Study]] — see it all applied to a real project

---

## Sources

This page synthesizes our existing wiki — see the linked pages above for primary sources. Core inputs:
- [[world-tour-2026-briefing|CMS 13 World Tour 2026 — Team Briefing]] (Eduardo's accreditation notes, May 2026)
- [[cms13-technical-qa|CMS 13 Technical Q&A]] (Optimizely technical webinar, Mar 2026)
- [[geo-analytics|GEO Analytics]] (worked example in §6)
