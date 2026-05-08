---
title: GEO Analytics for CMS 13 (PaaS)
tags:
  - optimizely
  - cms
  - analytics
  - ai
  - seo
---

# GEO Analytics for CMS 13 (PaaS)

**GEO (Generative Engine Optimization) Analytics** is an Optimizely Reporting dashboard that tracks AI platform traffic to your site — which AI agents are crawling it, which pages they're hitting, and whether those crawls are actually turning into referrals (i.e., your content being surfaced in ChatGPT, Perplexity, Claude, etc.).

Available in **CMS 13 PaaS only**. Data available from November 28, 2025 onwards.

## Prerequisites

- Opti ID account (required)
- CMS 13 instance
- If headless: frontend must be hosted with Optimizely

## The Four Data Tables

### 1. Crawl-to-Refer Ratio

Tracks the top 6 AI crawlers by request volume. The ratio compares how often an AI crawler visits your site vs. how often those visits lead to referrals (your content being cited/surfaced in the AI platform).

- **High ratio** = crawlers visiting frequently but not using your content — your pages are being indexed but not referenced in AI responses
- **Low ratio** = crawl activity proportional to actual usage — content is being surfaced
- **Goal: keep the ratio as low as possible**

This is the key metric for understanding whether AI indexing is translating into real AI visibility.

### 2. AI Agent Analysis

Summary of AI agent activity by request volume. Shows the top 12 AI agents (including the top 6 from the Crawl-to-Refer Ratio), their request counts, and percentage of total AI agent requests.

Use this to know which AI platforms are actually visiting your site — GPTBot, ClaudeBot, PerplexityBot, Googlebot-Extended, etc.

### 3. Top 5 AI Request Volume Pages

HTTP request trends for the top 5 pages, showing which specific pages are being hit by AI crawlers most frequently within the selected time period.

Use this to identify your highest-value pages for AI optimization — if a page gets heavy AI traffic, prioritize its content quality and structured markup.

### 4. AI Request Volume Pages

Total AI crawler requests per page across the full site. Full-picture view for identifying patterns across the content inventory.

## How to Access

1. Log in to CMS instance
2. Select **Optimizely Reporting** (or use the product switcher in the global nav)
3. Scroll to **GEO Analytics** dashboard, or select **Content Management System** from the Product drop-down

## Strategic Implications

GEO Analytics gives clients a concrete answer to "is our content showing up in AI search?" — a question that didn't have a measurable answer before. Use cases:

- **Content optimization** — identify high-crawl/low-refer pages and improve their structure, clarity, and authority to push the ratio down
- **AI SEO audits** — understand which AI platforms are indexing your content vs. ignoring it
- **ROI tracking** — measure whether content investments are improving AI visibility over time

This feature is a direct response to the shift toward AI-mediated search (ChatGPT, Perplexity, etc.) and the client concern that traditional SEO metrics don't capture AI visibility.

## Sources

- [GEO Analytics for CMS (PaaS) — Official Docs](https://docs.developers.optimizely.com/content-management-system/v13.0.0-CMS/docs/geo-analytics-for-cms-paas) *(updated ~Apr 2026)*
