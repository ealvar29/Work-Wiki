---
title: GEO Analytics for CMS 13 (PaaS)
tags:
  - optimizely
  - cms
  - analytics
  - ai
  - seo
  - geo
---

# GEO Analytics for CMS 13 (PaaS)

**GEO (Generative Engine Optimization) Analytics** is an Optimizely Reporting dashboard that tracks AI platform traffic to your site — which AI agents are crawling it, which pages they're hitting, and whether those crawls are actually turning into referrals (i.e., your content being surfaced in ChatGPT, Perplexity, Claude, etc.).

> [!warning] Legacy feature — access closed May 31, 2026
> Optimizely now classifies the GEO Analytics dashboard as a **legacy feature**: *"available only for customers who received access before May 31, 2026."* Customers upgrading to CMS 13 **after** that date will **not** get this dashboard. Optimizely directs new customers to the **Agent Visibility dashboard** in Optimizely Analytics instead (see [Successor](#successor-agent-visibility-dashboard) below).
>
> **Client implication:** A PaaS client upgrading to CMS 13 today does *not* automatically gain the legacy GEO Analytics dashboard simply by upgrading. Confirm whether they already had access before the cutoff; if not, position the Agent Visibility dashboard as the path forward.

Available in **CMS 13 PaaS only**. Data available from **November 28, 2025** onwards (not retroactive — collection begins once you're live on 13).

A separate **GEO Insights** dashboard exists for **CMS SaaS** — see Sources.

## Prerequisites

- **Opti ID account** (required)
- A **CMS 13 instance**
- **Headless:** the front end must be **hosted with Optimizely** for AI crawler traffic to be captured

## The Four Data Tables

### 1. Crawl-to-Refer Ratio

Tracks the **top 6 AI crawlers** by request volume. The ratio compares how often an AI crawler visits your site vs. how often those visits lead to referrals (your content being cited/surfaced in the AI platform).

- **High ratio** = crawlers visiting frequently but not using your content — pages indexed but not referenced in AI responses
- **Low ratio** = crawl activity proportional to actual usage — content is being surfaced
- **Goal: keep the ratio as low as possible**

Supports **period-over-period comparison** — e.g. filter to Last 30 Days and the card also shows the preceding 30 days. The top 6 AI platforms shown here match the top 6 entries in the AI-Agent Analysis table.

This is the key metric for understanding whether AI indexing is translating into real AI visibility.

### 2. AI-Agent Analysis

Summary of AI agent activity by request volume. Shows the **top 12 AI agents** (including the top 6 from the Crawl-to-Refer Ratio), their request counts, and percentage of total AI agent requests.

Use this to know which AI platforms are actually visiting your site — GPTBot, ClaudeBot, PerplexityBot, Googlebot-Extended, etc. (Optimizely tracks AI bots/crawlers generically; the docs don't publish a fixed named list.)

### 3. Top 5 AI Request Volume Pages

HTTP request trends for the **top 5 pages**, showing which specific pages are being hit by AI crawlers most frequently within the selected time period.

Use this to identify your highest-value pages for AI optimization — if a page gets heavy AI traffic, prioritize its content quality and structured markup.

### 4. AI Request Volume Pages

Total AI crawler requests per page across the full site, for the selected period. Full-picture view for identifying patterns across the content inventory.

## Filters & Dashboard Actions

**Filters:**
- **Date range** — Last 30 Days preset, or a custom period
- **Hostname** — filter to one or multiple sites using operator selection
- **Reset filters** to defaults

**Dashboard-level actions:**
- Change **time zone** (default **UTC**)
- **Download** the dashboard as **PDF or CSV** (paper size / orientation options)
- Export individual table data

**Table-level features:**
- Sort columns ascending/descending
- Freeze rows while scrolling
- Copy values from tables
- Autosize or reset column widths
- Switch between **Expanded** and **Full Screen** views
- **Tile actions** (hover a card) to download that tile's data

## How to Access

1. Log in to the CMS instance
2. Select **Optimizely Reporting** (or use the product switcher in the global nav)
3. Scroll to the **GEO Analytics** dashboard, or select **Content Management System** from the Product drop-down

No additional configuration is required beyond the prerequisites above (and an Optimizely-hosted front end for headless).

## Successor: Agent Visibility dashboard

Because GEO Analytics is now legacy, the go-forward feature is the **Agent Visibility dashboard** in **Optimizely Analytics** (announced **June 10, 2026** as part of the Optimizely + Conductor AEO platform). Compared to the legacy GEO dashboard it adds:

- **Request-intent classification** — distinguishes **retrieval**, **indexing**, and **training** requests
- **Enriched Optimizely Opal facets** for more action-oriented analysis
- Visibility trends by **business dimensions** — funnel stage, topic area, content category

It is built on **log-level data**. Deployment-model availability (PaaS vs SaaS) for the Agent Visibility dashboard isn't yet spelled out in public docs — **verify with Optimizely before promising it to a PaaS client.**

## Strategic Implications

GEO/AI analytics gives clients a concrete answer to "is our content showing up in AI search?" — a question that didn't have a measurable answer before. Use cases:

- **Content optimization** — identify high-crawl/low-refer pages and improve their structure, clarity, and authority to push the ratio down
- **AI SEO audits** — understand which AI platforms are indexing your content vs. ignoring it
- **ROI tracking** — measure whether content investments are improving AI visibility over time

This category is a direct response to the shift toward AI-mediated search (ChatGPT, Perplexity, etc.) and the client concern that traditional SEO metrics don't capture AI visibility.

## Sources

- [GEO Analytics for CMS (PaaS) — Developer Docs](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/geo-analytics-for-cms-paas) *(updated ~Apr 2026)*
- [GEO Analytics for CMS (PaaS) — Support Help Center](https://support.optimizely.com/hc/en-us/articles/41855081531021-GEO-Analytics-for-CMS-PaaS) *(legacy status / May 31, 2026 cutoff)*
- [GEO Insights for CMS (SaaS) — Developer Docs](https://docs.developers.optimizely.com/content-management-system/v1.0.0-CMS-SaaS/docs/geo-insights-for-cms-saas)
- [Optimizely Launches Agent Visibility Analytics for AI Search — CMSWire](https://www.cmswire.com/digital-experience/optimizely-conductor-unveil-aeo-platform/) *(Agent Visibility / AEO platform, Jun 10 2026)*
