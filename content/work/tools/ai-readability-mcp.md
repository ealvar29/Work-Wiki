---
title: "AI Readability MCP"
tags:
  - tools
  - jaxon
  - ai
  - mcp
  - seo
---

An in-house MCP server that audits any website for **AI crawler readability** — how visible and legible the site's content is to LLMs like Claude, GPT, Perplexity, and Gemini. Produces a scored report across 8 dimensions with a letter grade, prioritised recommendations, and client-ready output.

**Repo:** `H:\GitKraken\ai-readability-mcp`

## What It Measures

The audit scores a site across 8 dimensions (each weighted independently):

| Dimension | Weight | What it checks |
|-----------|--------|----------------|
| **Bot Access** (robots.txt) | 20% | Whether GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and 3 others are allowed |
| **Structured Data** | 20% | JSON-LD blocks, schema types (Organization, Article, FAQPage, etc.), OpenGraph tags |
| **Rendering** | — | Server-side vs. client-side rendered content — JS-heavy pages may be invisible to crawlers |
| **Semantic HTML** | — | Heading hierarchy (H1→H2→H3), landmark elements, content-to-noise ratio |
| **Sitemap** | — | XML sitemap presence, URL count, valid format |
| **Content Quality** | — | Text length, readability signals, paragraph structure |
| **Meta Tags** | — | `<title>`, `<meta description>`, canonical URL |
| **LLMs.txt** | 10% | `/llms.txt` presence and quality (title, links, sections) |

Overall scores produce a letter grade from **A+** (90+) to **F** (<40).

## Setup

```bash
cd H:\GitKraken\ai-readability-mcp
npm install
npm run build
# entry point: dist/index.js
```

**Requirements:** Node.js 18+ (v24 recommended).

### Wire Up Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-readability-mcp": {
      "command": "node",
      "args": ["H:/GitKraken/ai-readability-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop. All 9 tools will appear in the tool list.

## Tool Reference

### `analyze_url`

Full 8-dimension audit of a URL. Returns a scored report table, grade, narrative summary, and top 8 prioritised recommendations.

```
analyze_url("https://client-site.com")
```

Output includes:
- `Overall Score: 67/100 (Grade: B-)`
- Score bar: `[█████████████░░░░░░░] 67%`
- Per-dimension table with pass/fail status
- Ranked recommendations (high → medium → low)
- Raw JSON analysis block for programmatic use

---

### `compare_urls`

Side-by-side AI readability comparison. Useful for **client vs. competitor** presentations.

```
compare_urls(
  url_a: "https://our-client.com",  label_a: "Our Client",
  url_b: "https://competitor.com",  label_b: "Competitor"
)
```

Returns a combined table showing scores per dimension with an edge indicator, then full reports for each site below.

---

### `analyze_page_vs_domain`

Compares an inner page against its own homepage. Reveals the common pattern where the homepage is well-optimised but product/service pages are left bare.

```
analyze_page_vs_domain("https://client.com/products/widget")
```

Returns a delta table (▲ = inner page better, ▼ = homepage better) and a key finding callout.

---

### `generate_llms_txt`

Crawls the page and auto-generates a ready-to-deploy `/llms.txt` file. Extracts the site's navigation, headings, and key content into the correct llms.txt format.

```
generate_llms_txt("https://client-site.com")
```

Output is copy-pasteable markdown formatted to the [llmstxt.org](https://llmstxt.org) spec. Include instructions for the client: save as `/llms.txt`, reference from `robots.txt`.

---

### `generate_client_report`

Generates a polished, **client-facing report** with educational context, effort estimates per fix, and a recommended next steps section. Designed to help scope follow-on work.

```
generate_client_report(
  url: "https://client-site.com",
  agency_name: "Jaxon Digital",
  client_name: "Acme Corp"
)
```

The report includes: executive summary, scored dimension table, effort estimates (hours/days), prioritised action plan with effort context, and a branded CTA section.

---

### `preview_ai_view`

Shows exactly what an AI crawler reads from a page: text-only stripped content, heading outline, structured data blocks, and identity signals. Useful for showing clients how their page looks to a bot.

```
preview_ai_view("https://client-site.com/about")
```

---

### `track_score`

Save and compare scores over time to track client progress across engagements.

| Action | What it does |
|--------|-------------|
| `save` | Snapshot the current score with an optional label (e.g., "Before redesign") |
| `compare` | Diff the current score against the last saved snapshot |
| `list` | Show all saved snapshots for reporting |

```
track_score(action: "save", url: "https://client.com", label: "Before Phase 1")
track_score(action: "compare", url: "https://client.com")
track_score(action: "list")
```

---

### `audit_folder`

Scan a local folder of HTML files. Useful for **pre-launch static site audits** or reviewing built output before deployment.

```
audit_folder("C:/builds/client-static-site/public")
```

---

### `generate_schema_markup`

Detects page type (homepage, article, FAQ, product, etc.) and generates ready-to-paste `<script type="application/ld+json">` blocks. Fields that can't be auto-detected are marked `FILL_IN`.

```
generate_schema_markup("https://client-site.com/blog/post")
```

## Typical Client Audit Workflow

```
1. analyze_url               → baseline score and grade
2. compare_urls              → benchmark against a competitor
3. generate_client_report    → paste into proposal doc
4. generate_schema_markup    → hand to client dev team
5. generate_llms_txt         → deliver ready-to-deploy file
6. track_score (save)        → snapshot before work starts
   [client implements fixes]
7. track_score (compare)     → show score delta in follow-up
```

## Score Interpretation

| Grade | Score | Meaning |
|-------|-------|---------|
| A+ / A | 85–100 | Well-optimised — content appears reliably in AI answers |
| B | 65–79 | Decent, but clear gaps competitors may exploit |
| C | 45–64 | Significant issues — much content likely invisible to AI |
| D / F | <45 | Critical failures — AI systems are likely blocked or unable to read the site |

## Related

- [[geo-analytics|GEO Analytics]] — tracks AI crawler traffic in DXP; this MCP audits readability, GEO tracks what crawls convert to referrals
- [[upgrade-assistant-mcp|Optimizely Upgrade Assistant MCP]] — the other Jaxon MCP tool, for CMS 12 → 13 upgrades
- [[cms13-resources|CMS 13 Resources]] — broader links and tooling context

## Sources

- Internal repo: `H:\GitKraken\ai-readability-mcp` *(Jaxon Digital, 2026)*
