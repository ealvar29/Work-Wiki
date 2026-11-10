---
title: "Certification Study Roadmap"
tags:
  - optimizely
  - cms
  - certification
  - training
---

A plan to pass **CMS PaaS — Core (Developer)** in the **week of 2027-01-04**, starting 2026-11-10. Plan for about 1 hour each weekday plus one 2-hour weekend session.

> [!important] Two exams, not one
> Optimizely relaunched its certification programme in 2026. **CMS PaaS — Core (Developer) requires Optimizely Foundations first.** Foundations is a short, broad exam covering the whole Optimizely One suite, including products we don't use (Commerce, Experimentation, Data Platform). *Verified against the official blueprints 2026-11-10.*

## The two exams

| | Optimizely Foundations | CMS PaaS — Core (Developer) |
|---|---|---|
| Prerequisite | None | Optimizely Foundations |
| Questions | 20 multiple choice | 30 multiple choice + **1 scenario** + **1 rationale** |
| Time | 30 min | 75 min |
| To pass | 70% | **70% overall**, and multiple choice ≥70%, scenario ≥65%, rationale ≥65% |
| Attempts | 10 per quarter | 3 per quarter |
| Retake cooldown | 2 days | 2 days |
| Practice mode | Unlimited, no cooldown | Unlimited, no cooldown |
| Valid for | About 1 year, then a short renewal exam | About 1 year, then a short renewal exam |
| Price | 🟡 Not shown on the certification site | 🟡 Not shown on the certification site |

*Verified 2026-11-10 at [certification.optimizely.com/blueprint](https://certification.optimizely.com/blueprint).* Re-check there before booking; the FAQ hedges several numbers with "commonly".

**Exam conditions:** proctored, fullscreen, closed book. Copy, paste, right-click and devtools are blocked, and leaving the window counts as a violation.

### The scenario and rationale questions

You are shown **three real-world scenarios and pick one**. You answer in an **inline code or config editor**, as ordered steps, or as sub-questions. It's marked against a rubric with partial credit. The **rationale** is a short written justification, marked on whether it:

- matches your answer
- explains *why*
- ties back to the scenario
- names the benefit
- is accurate and concise

> [!danger] You will write code with no IDE
> There's no IntelliSense, no compiler and no paste. Practise writing an initialization module, a content event handler and a custom property editor registration **from memory, in a plain text editor**. This is the skill most working developers have lost.

## Which CMS version?

🟡 **Not stated** anywhere on the certification site. The programme says PaaS covers "CMS 12 and CMS 13". The Developer blueprint leans modern: Graph, Digital Asset Management and AI content generation are listed topics, and Search & Navigation is not. Where CMS 12 and CMS 13 differ, learn both answers.

## Domains: CMS PaaS — Core (Developer)

| Domain | Weight | ≈ Questions | Topics (from the blueprint) | Wiki pages | Gaps to write |
|---|---|---|---|---|---|
| **Developer Experience and Extensibility** | **45%** | 14 | On-page editing, custom editors, plugin development, integrations, content events, initialization modules, Digital Asset Management, data migration, content export, marketing automation, AI content generation | [[work/cms13/custom-property-editors\|Property Editors]], [[work/cms13/custom-admin-tools\|Admin Tools]], [[work/cms13/extension-migration\|Extension Migration]], [[work/cms13/dam-integration\|DAM]], [[work/cms13/optimizely-opal\|Opal]], [[work/cms13/ai-assistant\|AI Assistant]] | Content events, initialization modules, import/export, data migration |
| **Content Delivery and APIs** | 20% | 6 | GraphQL API, headless delivery, content indexing, full-text search, real-time sync, webhooks, multi-channel publishing, API authentication, query building, pagination, caching, performance | [[work/cms13/graph-sdk\|Graph SDK]], [[work/cms13/graph-vs-search-navigation\|Graph vs S&N]], [[work/cms13/search-to-graph\|Search → Graph]], [[work/cms13/cms-rest-api\|REST API]] | Graph auth, webhooks, pagination |
| **User Management Security** | 15% | 5 | Content permissions, access control, content editing, visitor groups, personalization, on-page editing | — | Visitor groups and custom criteria, content permissions |
| **Access Control and User Management** | 10% | 3 | Content security, role management, user provisioning, single sign-on, enterprise SSO, cross-product identity | [[work/cms13/opti-id-admin-center\|Opti ID]] | Roles, virtual roles, provisioning |
| **Cloud Infrastructure and Deployment** | 10% | 3 | Deployment, CI/CD, environments, configuration, CDN, caching, high availability, logging, monitoring, troubleshooting, database management | [[work/cms13/deploying-to-dxp\|Deploying to DXP]], [[work/cms13/debugging-dxp\|Debugging DXP]] | CDN and caching |

**Nearly half the exam is Developer Experience and Extensibility.** That's where the hours go.

## Daily routine

| Block | Time | What you do |
|---|---|---|
| Flashcards | 15 min | Clear the day's due Anki cards, every day including weekends |
| Learn | 30 min | Read one topic, then find it in the Oxy or VHB code |
| Practice | 15 min | 10 questions on that topic, or write one snippet from memory |
| Weekend | 2 hrs | An official practice exam, then rework every miss |

**15 minutes a day beats 2 hours on Sunday** (the *spacing effect*). Rereading notes without testing yourself mostly doesn't count.

## Week by week

### Week 1 (2026-11-10 to 11-15): baseline

- [ ] Sign in at [certification.optimizely.com](https://certification.optimizely.com) and confirm whether practice mode needs a purchase first
- [ ] Take the **Foundations** practice exam with no studying
- [ ] Take the **CMS PaaS — Core (Developer)** practice exam with no studying, and note each domain's score
- [ ] Install Anki

### Week 2 (11-16 to 11-22): Foundations

- [ ] Study the non-CMS products at a high level: Experimentation, Commerce, Data Platform, Opal
- [ ] Practice exam at 80% or above
- [ ] 🎯 **Sit Foundations** at the end of the week

### Weeks 3 and 4 (11-23 to 12-06): Developer Experience and Extensibility (45%)

Thanksgiving week is light, which is why this domain gets two weeks.

- [ ] Content events and initialization modules, written from memory
- [ ] Custom editors and on-page editing
- [ ] Plugins, integrations, DAM, import/export, AI content generation

### Week 5 (12-07 to 12-13): Content Delivery and APIs + User Management Security (35%)

- [ ] Graph queries, auth, webhooks, pagination
- [ ] Visitor groups, personalization, content permissions

### Week 6 (12-14 to 12-20): the remaining 20% + scenario practice

- [ ] Access Control and User Management
- [ ] Cloud Infrastructure and Deployment
- [ ] Five scenario-plus-rationale drills, timed
- [ ] Two full practice exams

### Holidays (12-21 to 2027-01-03)

- [ ] Anki reviews only, 15 minutes a day

### Exam week (2027-01-04)

- [ ] Go/no-go check, below
- [ ] 🎯 **Sit CMS PaaS — Core (Developer)**

## Go / no-go rule

> [!important] Sit the real exam after two official practice exams in a row at 80% or above
> The pass mark is 70%. A 10-point buffer allows for nerves and for the scenario, which practice may not score the same way. A failed attempt costs one of your 3 attempts for the quarter plus a 2-day cooldown.

## Progress log

| Date | Exam | Mode | Score | Weakest domain | Notes |
|---|---|---|---|---|---|
| | Foundations | Practice | | | Baseline |
| | PaaS Developer Core | Practice | | | Baseline |

## Sources

- [Optimizely certification blueprints](https://certification.optimizely.com/blueprint): CMS PaaS — Core (Developer) and Optimizely Foundations, checked 2026-11-10
- [Optimizely certification FAQ](https://certification.optimizely.com/faq), checked 2026-11-10
- [Matt Dunn: Optimizely certifications in 2026, the new programme explained](https://mattcdunn.com/blog/optimizely-certifications/), 2026-10-29
- [Calimat: my journey to Optimizely certification](https://world.optimizely.com/blogs/calimat/dates/2025/1/my-journey-to-optimizely-certification-study-tips-ai-tools-and-exam-strategies/), 2025-01 (old programme; study-method tips still apply)
