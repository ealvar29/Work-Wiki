# How We Got Ahead of CMS 13 Before It Shipped

*By Eduardo Alvarez, Jaxon Digital*

---

The other three posts in this series focus on what the CMS 13 upgrade looks like from inside a codebase — the errors you'll hit, the gotchas that slow you down, and what it's like to work through it on a real client site. This one is different.

This post is about the two months before we opened a single `.csproj` file.

We had four client upgrades to plan for. Not hypothetically — four real production sites, each with their own legacy, each on a timeline. That meant we couldn't afford to figure out CMS 13 on the job. By the time we started the first engagement, the upgrade needed to be something the whole team had already thought through.

Here's what that preparation looked like, and what it produced.

---

## The Problem With Upgrade Documentation

Optimizely's official docs are thorough. They'll tell you which APIs were removed and what the replacements are. What they don't tell you is which errors are actually symptoms of something upstream, which patterns show up in every real codebase, and what breaks in ways the docs don't mention.

That knowledge exists — it's scattered across world.optimizely.com posts, OMVP blogs, GitHub issues, and Slack threads. By the time you're mid-upgrade and need it, you don't have time to find it.

So we built a place to put it.

---

## The Work Wiki

We stood up an internal knowledge wiki on [Quartz v4](https://quartz.jzhao.xyz/) — a static site generator that builds from Markdown. The structure was simple: one section for the CMS 13 upgrade, with pages covering every topic we expected to need during engagements: breaking changes, the Find → Graph migration, the Applications model, upgrade patterns, post-upgrade gotchas.

The wiki isn't a copy of the official docs. It's the layer on top — the "here's what actually matters" filter, organized the way a developer mid-engagement needs to find things.

**What made it work wasn't the wiki itself. It was keeping it current.**

CMS 13 was in preview for months before GA. New articles from Optimizely engineers and OMVPs were dropping on world.optimizely.com every week. We set up a scheduled AI agent — running on Claude — that would surface new CMS 13 articles, evaluate them for technical substance, and draft wiki pages from the ones worth keeping. When a community member published a deep-dive on the Applications model or the Graph SDK, it was in the wiki within days, not weeks.

The result: by the time we started the first upgrade, the team had a curated, searchable reference that reflected the actual state of the platform as of launch day — not the state it was in three months before.

---

## Tech Sales Certification

Alongside building the wiki, we got Optimizely tech sales certified.

This is worth mentioning because it's not an obvious move for a development team. The certification isn't about code — it's about understanding how Optimizely positions the platform, where they're investing, and what the DXP roadmap actually looks like.

It turned out to matter more than expected.

Understanding the commercial direction clarified which platform bets Optimizely was serious about (Visual Builder, Opti ID, Graph) versus which ones were legacy support commitments (Find, Forms). That framing shaped how we approached each client engagement — where to invest time on the new model versus where to keep things running as-is while waiting for vendor releases. It also made conversations with client stakeholders easier. When a CTO asks "why can't we just wait for a compatible version of Forms?" you need to know whether that's a reasonable ask or a non-starter.

---

## The CMS 13 World Tour

In May 2026, Optimizely ran a city-by-city roadshow — the CMS 13 World Tour. We attended the Dallas stop on May 7th.

The content covered product direction, partner case studies, and technical sessions on the new platform features. More useful than the formal sessions were the hallway conversations: Optimizely PMs, partner engineers, and other agencies all navigating the same questions we were.

We took structured notes throughout — not just what was covered, but what questions came up from the room, what the Optimizely team hedged on, and what timeline signals came through. Those notes went straight into the wiki. The conference gave us signal that wasn't in any official documentation: which features were truly GA versus "available but not production-hardened," what the Forms and Graph SDK timelines actually looked like in practice, and how other agencies were scoping their upgrade engagements.

Attending gave us a version of the upgrade picture that wasn't available from docs alone.

---

## The MCP Upgrade Assistant

The last piece of the preparation was building tooling.

Every upgrade engagement starts the same way: open the client repo, read the packages, grep for problematic patterns, estimate the work. That process is valuable — but it's also repeatable, and repeatable work is automatable.

We built an in-house [MCP server](https://modelcontextprotocol.io/) — the Optimizely Upgrade Assistant — that gives Claude and other AI coding tools structured, static-analysis-backed intelligence about a CMS 12 repo before the upgrade starts.

Three tools, three steps:

1. **`assess_optimizely_upgrade`** — scans the repo and produces a full assessment: incompatible packages, detected code patterns, LOE estimate, auth migration scenario, blockers. The 35+ CMS 13 code patterns it detects include the exact gotchas from Post 3 — `IContextModeResolver`, Find string extensions, `IServiceLocator`, ServiceLocatorDependencyResolver, legacy routing, OWIN middleware.

2. **`build_optimizely_upgrade_plan`** — turns the assessment into an ordered task queue with exports for Jira and Azure DevOps. TASK-001 through TASK-N, each with context on what it's fixing and why.

3. **`verify_cms13_readiness`** — a 10-point pass/fail checklist that runs after the upgrade is complete. Used as a pre-QA gate before handing off to testers.

The practical effect: instead of spending the first half-day of an engagement discovering what the codebase looks like, we arrive knowing it. The MCP runs in minutes. The assessment tells us whether we're dealing with a straightforward upgrade or one with embedded IdP and OWIN blockers that need separate engagements. That changes how we scope, how we staff, and what we tell the client before work begins.

---

## What the Preparation Actually Produced

When we started the first upgrade — a mid-sized site, .NET 6, EPiServer.Find, EPiServer.Forms, half a dozen third-party packages — here's where the preparation showed up:

**The wiki was the reference, not Google.** Every question that came up during the upgrade had a wiki page. The Find → Graph migration path, the `IContextModeResolver` cascade fix, the Geta assembly scanner workaround. The team wasn't researching during the engagement; they were executing against documented patterns.

**The MCP assessment set the scope before day one.** We knew going in that Forms was vendor-blocked, that the Graph SDK had a CMS 12 dependency issue, and exactly which Geta packages would crash startup. None of those were discoveries during the upgrade. They were pre-identified, pre-documented, and pre-ticketed.

**Tech sales context shaped the conversations.** When the client asked about Forms, we had a clear answer about the vendor timeline and a concrete plan for shipping without it. When they asked about the Graph migration, we could explain where the ecosystem was and what the interim strategy bought them.

**The result, by the numbers:**

- Files modified: **180+**
- Compile errors resolved: **~250** (including cascades)
- Days of active upgrade work: **~4**
- Vendor-blocked items identified at assessment: **6** — all pre-documented, none discovered mid-upgrade
- Build result: **0 errors, 0 warnings from our code**

Four days is fast for an upgrade of this scope. It was fast because the four days were almost entirely execution — not discovery.

---

## The Honest Version

I don't want to oversell this. Preparation doesn't eliminate upgrade complexity. Forms being vendor-blocked is still Forms being vendor-blocked. Packages that haven't shipped CMS 13 releases still need to be excluded from compilation. The platform changes are real.

What preparation eliminates is wasted diagnostic time. It eliminates the three hours spent debugging something that has a one-line fix once you know what it is. It eliminates the conversation where you have to explain to a client mid-engagement why something you didn't know about is now on the critical path.

CMS 13 is a real upgrade. The teams that go in knowing the platform — not from the docs, but from the community, from the conference rooms, from building tools that force you to understand the patterns — those teams finish faster and with fewer surprises.

The wiki, the certification, the World Tour, the MCP: none of those felt like upgrade prep while we were doing them. They just felt like staying current. The upgrade is where it paid off.

---

*Eduardo Alvarez is a developer at Jaxon Digital. This is the final post in a four-part series on upgrading to Optimizely CMS 13.*

*Part 1: [What Actually Changed in CMS 13](post-1-what-changed-in-cms13.md)*  
*Part 2: [We Upgraded a Real Client Site to CMS 13 — Here's What Actually Happened](post-2-field-report.md)*  
*Part 3: [10 CMS 13 Upgrade Gotchas That Will Bite You (And How to Fix Them)](post-3-gotchas.md)*
