---
title: "CMS 13 Demo Runbook — What to Show Colleagues"
tags:
  - optimizely
  - cms
  - visual-builder
  - demo
  - training
---

A presenter's runbook for a live CMS 13 demo: the new features worth showing, a CMS 12 → 13 talk track, and an ordered click-by-click sequence with the "wow" beats called out. Built to be run top to bottom in ~30–40 minutes. For the conceptual deep-dives, follow the links — this page is the *script*, not the reference.

> **Two-minute setup before you present:** log in (Opti ID SSO), open the editor on a page you've pre-built, confirm Graph is indexing (green), and have a second browser tab on the published front-end. Know your fallback for every live step (see [§ If Something Breaks](#if-something-breaks)).

---

## The 60-second opener (the framing)

Lead with the one-liner, not a feature list:

> "CMS 13 isn't a version bump — it's a platform modernization. Three things are mandatory: **.NET 10, Optimizely Graph, and Opti ID.** Everything else — Visual Builder, Opal AI, DAM — is additive once those are in place. Today I'll show the additive stuff, because that's what editors and clients actually feel."

Then put up the comparison table and move on — don't dwell.

### CMS 12 → 13 at a glance (the slide)

| Area | CMS 12 | CMS 13 | Why a colleague cares |
|---|---|---|---|
| Runtime | .NET 6/8 | **.NET 10**, C# 13 | Faster, current LTS |
| Search / delivery | Search & Navigation (Find) | **Optimizely Graph** (mandatory) | One query layer, headless-ready |
| Default editor | On-Page Editing | **Visual Builder** | The headline demo |
| Reusable layouts | Hand-built each time | **Blueprints** | Editors self-serve |
| Identity | Per-product login | **Opti ID** (SSO/MFA/SCIM) | One login across products |
| AI | Add-on | **Opal** + OpalChat in-editor | AI authoring & translation |
| Editor UI customization | Dojo | **ES6 modules** | Modern JS, no Dojo |
| Starter template | Alloy | **Stride** | New baseline |
| Admin URL | `/EPiServer/CMS` | `/Optimizely/CMS` | Update bookmarks |

MVC is **still fully supported** — say this out loud, it's the question everyone asks. Deep dive: [[cms13-refresher|CMS 13 Refresher]] · [[what-is-cms13|What is CMS 13?]]

---

## The demo, in order

Each segment below has **what to do**, **what to say**, and the **🟢 wow beat** — the single moment that lands. If you're short on time, the segments are ranked: do 1–2 no matter what, 3–4 if you have the room, 5–6 are bonus.

### 1. Visual Builder — build a page live *(the headline — never skip)*

This is the demo. The point is that a marketer composes a page by **dragging**, with no developer and no deploy.

**What to do:**
1. Create a new **Experience** (the Visual Builder page type) — `Content → New → Experience`.
2. Show the empty canvas, then add a **Section**.
3. Drag in a **Row**, split it into two **Columns**.
4. Drag content **Elements** (a hero, a text block, a button) into the columns from the panel.
5. Reorder one element by dragging it — show it snap into place.
6. Tweak a property inline (change button text / image) and watch the canvas update.
7. **Publish**, then flip to your front-end tab and reload to show the live result.

**What to say:**
> "The structure is always **Experience → Section → Row → Column → Element**. The marketer never touches a developer for layout. Any block we've built becomes a draggable element just by tagging it — one line: `CompositionBehaviors = [\"elementEnabled\"]`."

**🟢 Wow beat:** the drag-and-drop reorder + instant inline property edit. That's the "this is just Figma/Webflow but it's our CMS" moment.

Reference for the room's inevitable dev questions: [[visual-builder|Visual Builder]] (tag helpers `epi-grid` / `epi-row` / `epi-column` / `epi-component`, OPE re-enable, `ExperienceData` base-class gotcha).

### 2. Blueprints — save a layout, reuse it *(do this right after VB)*

Blueprints are the payoff of Visual Builder: a reusable, editor-created layout template — **stored as content, not code.**

**What to do:**
1. From the Experience you just built (or a richer pre-built one), save it as a **Blueprint**.
2. Create a **new** Experience and choose **Start from a Blueprint** — show your saved layout appear pre-populated with its structure.
3. Point out you can **export/import** Blueprints between environments/sites.

**What to say:**
> "In CMS 12, every campaign landing page was rebuilt by hand. Here a marketer designs the layout *once*, saves it as a Blueprint, and the whole team spins up on-brand pages from it — no dev, no ticket. It's content, so it ships through normal content workflows."

**🟢 Wow beat:** new page → pick Blueprint → instant fully-structured layout. Tie it back: "that's the recurring-cost saving."

### 3. Opal / OpalChat — AI in the editor *(strong if your instance has it)*

> **Pre-check:** Opal needs Opti ID + an Opal subscription provisioned. If it's not enabled on your demo instance, **skip live and show a screenshot/slide instead** — don't try to enable it during the demo.

**What to do:**
1. Open **OpalChat** in the editor panel.
2. Ask it to draft or rewrite copy for a block on your page; accept the result into the field.
3. Show **AI translation**: open the **Add Language** dialog and let Opal draft a translated version.

**What to say:**
> "Opal is Optimizely's AI agent platform — included conceptually with CMS 13 but a separate subscription, gated behind Opti ID. It lives *in* the editor: draft copy, optimize, and translate without leaving the page."

**🟢 Wow beat:** one-click AI translation populating a second language. Reference: [[ai-assistant|AI Assistant v4]].

### 4. Optimizely Graph — one query layer *(for the technical half of the room)*

Keep this short and visual unless the audience is all developers.

**What to do:**
1. Open the **Graph explorer / GraphQL playground** (or a pre-saved query).
2. Run a query that pulls content across types — show structured JSON back.
3. Mention **Smooth Rebuild** (blue/green index slots → zero-downtime reindex).

**What to say:**
> "Graph replaces Search & Navigation entirely — it's mandatory. One auto-generated schema over all your content, same layer whether you render server-side MVC or a headless React front-end. The C# SDK gives you `QueryContent<T>()` for typed CMS content."

**🟢 Wow beat:** the same content you just published in Visual Builder showing up in the Graph query result — "author once, query anywhere." Reference: [[graph-sdk|Graph C# SDK]] · [[graph-vs-search-navigation|Graph vs S&N]].

### 5. Content Variations — A/B without copies *(bonus)*

**What to do:** on a content item, create a second **Variation** (e.g. "WinterCampaign"), change one property, and show both versions exist independently.

**What to say:**
> "Variations are delta-based — only the changed properties are stored, not a full copy — each with its own version history and approval. They're Graph-indexed, so you can serve them for A/B testing and personalization."

Reference: [[visual-builder#content-variations|Content Variations]].

### 6. Embedded DAM — assets in the editor *(bonus, instance-dependent)*

> **Pre-check:** DAM is cloud-only and needs Opti ID provisioning. Show only if it's live on your instance; otherwise screenshot.

**What to do:** open the **DAM asset picker** inside the editor, search the asset library, drop an image into a block, and note it's served direct-from-CDN.

**What to say:**
> "Embedded DAM replaces the old asset picker — assets live in a shared library across products, picked right inside the editor, delivered from CDN."

Reference: [[dam-integration|DAM Integration]].

---

## Suggested timeboxes

| If you have… | Run |
|---|---|
| 10 min | Opener + Visual Builder + Blueprints |
| 20 min | + Opal + Graph |
| 30–40 min | + Content Variations + DAM + Q&A |

Always protect time for Visual Builder + Blueprints — they're the segments that change how a colleague thinks about the product.

---

## Questions you'll get (have these ready)

- **"Is MVC dead?"** No — fully supported. Visual Builder renders via tag helpers in Razor; OPE is just off by default, not removed.
- **"Do we have to use Graph?"** Yes, mandatory — S&N is gone in CMS 13.
- **"Is Opal free / included?"** Conceptually part of CMS 13 but a **separate, usage-based subscription**, and it needs Opti ID.
- **"Does this work on our deployment?"** Visual Builder/Graph/Opal work on **PaaS and SaaS**; custom in-process .NET code does **not** run on SaaS. See the matrix in [[cms13-refresher#5-deployment-models-the-thing-to-never-get-wrong|the refresher]].
- **"Which Commerce version?"** Commerce **15** — Commerce 14 is incompatible with CMS 13.
- **"How hard is the upgrade?"** Easier than 11→12 (that was a rewrite). 5-step path: Opti ID → Graph → .NET 10 → packages → enable features. See [[upgrading-from-cms12|Upgrading from CMS 12]].

---

## If something breaks

Live demos fail; plan for it.

- **Have screenshots/a short screen-recording** of every segment as a fallback. If a live step hangs, narrate over the recording and move on — don't debug in front of the room.
- **Pre-build a "good" Experience and Blueprint** before the demo so you're never building from zero under pressure.
- **Don't enable features live.** Opal/DAM provisioning is not instant — confirm they're on *before* you start, or demo them from a slide.
- **Keep the published front-end tab pre-loaded** so the "see it live" reload is one keystroke, not a navigation hunt.

---

## Sources

This runbook synthesizes the existing wiki for live-demo use:
- [[cms13-refresher|CMS 13 Refresher — Crash Course]] (mental model, deployment matrix)
- [[world-tour-2026|CMS 13 World Tour 2026 Notes]] (Visual Builder hierarchy, Opal, Graph, DAM — Eduardo's accreditation notes, May 2026)
- [[visual-builder|Visual Builder]] · [[graph-sdk|Graph C# SDK]] · [[ai-assistant|AI Assistant v4]] · [[dam-integration|DAM Integration]]
