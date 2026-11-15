---
title: "Foundations Study Guide: the Non-CMS Domains"
tags:
  - optimizely
  - certification
  - training
  - foundations
---

The **Optimizely Foundations** exam is 20 questions in 30 minutes, and only 15% of it is CMS. This page covers the four domains our day job doesn't: **Experimentation and Personalization, Commerce and B2B, Data Platform and Analytics, and AI and Agents**. Together they're about 55% of the exam. Weights and the full domain list are on the [[roadmap|Study Roadmap]].

> [!important] How to use this page
> Foundations is entry level: it tests **what each product is for and which product owns which feature**, not API details. Learn the "which product?" tables and the exam-traps tables cold. The code-level notes are there so the concepts stick, not because you'll be asked to write them.

*Researched 2026-11-15 from official Optimizely docs and product pages. Every fact links to its source in the [[#Sources]] section. Anything marked 🟡 could not be confirmed from an official source.*

## Experimentation and Personalization (15%, ≈3 questions)

### The one fact to remember

> [!important] Snippet or SDK decides which product
> **Web Experimentation** runs **client-side** from a JavaScript snippet, for marketers using a **visual editor**. **Feature Experimentation** runs **server-side or in apps** through SDKs, for developers putting code behind **flags**. Visual editor and multivariate testing belong to Web; flags, rules and bandits belong to Feature. [E1]

| | Web Experimentation | Feature Experimentation |
|---|---|---|
| Runs | Client-side, a JS snippet in the browser | Server-side or in apps, through SDKs |
| Used by | Marketers and conversion-optimisation teams | Developers and product teams |
| How variations are built | **Visual editor** | Code behind **flags** |
| Test types | A/B, **multivariate (MVT)** | Rules on a flag: A/B, targeted delivery, MAB, CMAB |

### Web Experimentation: the snippet

- **Load the snippet synchronously, high in `<head>`.** An async snippet causes **flicker**: the original page shows briefly before the variation applies, which skews results. Variation code itself can still load async. [E2]
- If a tag manager is unavoidable, the snippet goes **above** it. 🟡 Placement detail from search summaries only. [E3]
- **Multivariate testing** comes in two forms: [E4]

| | Full factorial | Partial factorial |
|---|---|---|
| Combinations | **Every** combination runs | Only the ones you allocate |
| Traffic | Split per section | Split per combination |
| Exclude a combination? | **No** | **Yes**, set it to 0% |

### Feature Experimentation: the model

```
Project
└── Environment (Production, Development by default; each has its OWN datafile + SDK key)
    └── Flag ── variables (remote config values) · variations (versions of the flag)
        └── Rules, evaluated top to bottom:
            experiments → targeted deliveries → "Then, for everyone else"
```

- **A flag is more than on/off.** A decision returns the on/off state, the variation key and the variable values. [E5]
- **The SDK flow:** create a **user context** (user ID and attributes), call **`decide(flagKey)`** on it, then **track events** for conversions. [E6]
- **Bucketing is deterministic and local.** The SDK hashes the user ID in memory with no network call, so a user keeps their variation unless the traffic split changes. [E7]
- **Rule evaluation has a catch:** a user who matches a delivery's audience but **isn't bucketed into its traffic** skips straight to **"everyone else"**, not to the next rule. A user who fails an audience condition does move to the next rule. 🟡 From search summaries. [E8]

| Rule type | What it does | Is it an experiment? |
|---|---|---|
| **Targeted delivery** | Roll a flag out (or back) to an audience or a percentage | **No.** A rollout with no comparison |
| **A/B test** | Fixed traffic split between variations | Yes |
| **Multi-armed bandit (MAB)** | Shifts traffic toward the winning variation as it learns | Optimises, doesn't prove |
| **Contextual MAB (CMAB)** | Picks the best variation **per user** from their attributes | Optimises, doesn't prove |

- **Kill switch:** turn a flag off without a deploy. **Progressive rollout:** raise a delivery's traffic in steps (1% → 5% → … → 100%). 🟡 Exact UI wording unconfirmed. [E9]

### Stats Engine and choosing a test type

- **Stats Engine = sequential testing + false discovery rate (FDR) control.** [E10]
  - **Sequential testing** means you can watch results continuously ("peek") without inflating error.
  - **FDR control** limits false winners across many metrics. The **primary metric is treated separately**, so it keeps the most statistical power.
  - **Segmenting results breaks FDR control.**
- **Statistical significance** measures how unusual the results would be if there were no real difference. Tests are **two-tailed**. Docs use 90% in examples; 🟡 that 90% is the default isn't confirmed on that page. [E11]

| Use… | When you need… | Statistical significance? |
|---|---|---|
| **A/B** | Confidence, a clean control vs treatment | ✅ |
| **MVT** (Web only) | The effect of *combinations* of page sections | ✅ |
| **MAB** | The most conversions *during* the test, **one best variation for everyone** | ❌ 🟡 |
| **CMAB** | **A different best variation per user**, from device, location or behaviour | ❌ (stated in the docs) [E12] |

CMAB runs on Optimizely's AI, balancing exploration and exploitation. Its **distribution goal** is Automated (recommended), Manual, or Maximize Personalization (10% explore, 90% exploit). [E12]

### Personalization and recommendations

- **CMS 13 renamed visitor groups to "Audiences".** [E13]
  - Built-in criteria: visit count, referring search phrases, visited pages, geographic location. Developers can add custom criteria.
  - Match modes: all criteria, any one, or a **points threshold**.
  - Editors personalise a **content area** (or rich text) by choosing which audience sees which item.
  - **Only for in-process sites, not headless.**
- **A CMS audience and an Experimentation audience aren't the same thing.** A CMS audience is evaluated per request and *swaps content*. An Experimentation audience is a set of attribute conditions the SDK checks to *qualify a user for a rule*.
- **Content Recommendations:** a JS tracker builds visitor **interest profiles**, and **NLP topic extraction** on each content item matches content to interests (it can tell Apple the company from the fruit). 🟡 From search summaries. [E14]
- **Product Recommendations** (through the Data Platform API): [E15]
  - **personal** (per customer), **contextual** (related to given products), **best_sellers** (last 7 days by units)
  - **Fallback:** 7-day best sellers when there's no identifier or no recommendation
  - 🟡 Collaborative filtering as a model option is unconfirmed.

### Experimentation exam traps

| If a question implies… | The truth |
|---|---|
| Feature Experimentation has a visual editor or MVT | Those are **Web Experimentation** |
| A visitor group and an Experimentation audience are the same | Different products. And in CMS 13 visitor groups are called **Audiences** |
| MAB or CMAB proves a winner | **Neither gives statistical significance.** Use A/B |
| MAB personalises per user | **MAB** finds one winner for everyone; **CMAB** picks per user |
| Targeted delivery is an experiment | It's a **rollout** with no comparison |
| Missing a delivery's traffic sends you to the next rule | You go to **"everyone else"** |
| You can segment results and keep FDR control | **Segmenting breaks it** |
| You must not look at results before the end | **Sequential testing allows peeking** |
| The snippet should load async for speed | **Async causes flicker**; load it synchronously |
| Environments share a datafile | **Each environment has its own** datafile and SDK key |
## Commerce and B2B Solutions (15%, ≈3 questions)

### The one fact to remember

> [!important] Two different commerce products
> **Commerce Connect** is the .NET add-on that runs *inside* CMS, aimed at **B2C** brand storefronts. **Configured Commerce** is the **B2B** product. It owns **punchout, requisitions, order approvals, budgets and quoting**. [C1][C2]

| | Commerce Connect | Configured Commerce |
|---|---|---|
| Runs | Inside CMS PaaS. **Version 15 needs CMS 13 and .NET 10**, and CMS and Commerce upgrade together [C1] | Its own platform, API-first [C2] |
| Aimed at | B2C storefronts [C2] | B2B: customer-specific and contract pricing, account-specific catalogs [C2] |
| B2B features | Only multiple order forms per order [C7] | PunchOut (cXML) [C3], order approvals [C4], requisitions and budgets [C5] |
| ERP integration | Optimizely Connect Platform, the Service API [C1][C14] | **Windows Integration Service (WIS)** with ERP connectors such as Infor SX.e and Acumatica [C6] |

🟡 Whether Configured Commerce is officially "SaaS" isn't stated on the product page.

### Commerce Connect catalog

```
Catalog
└── Node (category)
    └── Entries: Product → Variant (SKU) · Package · Bundle · Dynamic package (beta in v15)
```

- **Customers buy variants, not products.** A variant is the lowest level and has no children. [C8]
- **Package vs bundle** is a classic trap: [C8]

| | Package | Bundle |
|---|---|---|
| SKU | **One SKU** of its own | Each item keeps its own |
| Cart | **One line** | **One line per item** |
| Price | One price | Each item priced separately |

- **Catalog items are CMS content.** A content provider exposes them as `IContent`, so `IContentRepository` works on them. The content types are `CatalogContent`, `NodeContent`, `ProductContent`, `VariationContent`, `BundleContent` and `PackageContent`. [C9]
- **One entry can sit in several categories.** `NodeEntryRelation.IsPrimary` marks the main one. [C10]
- **In v15, Visual Builder is the default editor for catalog entries**, and Graph can search catalog content. [C1]

### Markets, prices and inventory

| Concept | Key facts |
|---|---|
| **Market** (`IMarket`) | Languages, currencies, countries, and whether prices include tax. **Not necessarily a geographic region.** [C11] |
| **Price types** | `AllCustomers` (default), `UserName`, `PriceGroup` (customer-group pricing) [C12] |
| **Currency** | One currency per price, and **no automatic conversion** [C12] |
| **Quantity pricing** | A minimum quantity per price. **The default price uses minimum quantity 0, not 1** [C12] |
| **Inventory** | Per entry *and* per warehouse (`IInventoryService`). Tracks purchase, preorder and backorder quantities. Only "tracked" inventory decreases as orders are processed [C13] |

### Carts and orders

```
Order group (cart · purchase order · payment plan · wish list)
└── Order form          ← payments sit here; several forms = the B2B case
    └── Shipment
        └── Line item
```

- **"Purchase order" here doesn't mean a B2B PO.** It's what a **cart becomes when it's checked out** with a submitted payment (`SaveAsPurchaseOrder`). It then moves from the Carts list to the Orders list. [C15]
- **Version 15 removed the old workflow engine.** Order processing now goes through `IPurchaseOrderProcessor`, `IPaymentProcessor`, `IShipmentProcessor` and `IPaymentPlanProcessor`. [C1][C7]
- **Version 15 removed stored credit cards** for PCI compliance; card details are tokenised by a third-party provider instead. [C1]
- **Returns** need the shipment in **Shipped** status first. Each item gets a quantity and a reason, and exchange orders are numbered "EO…". [C16]

### Marketing: campaigns, discounts, coupons

- **A campaign contains discounts.** It isn't a discount itself. Campaigns are under **Commerce → Marketing**, and an audience (formerly "visitor group") can limit a whole campaign. [C17][C18]
- **Built-in discount types: item, order and shipping.** With several shipments, a shipping discount applies **only to the most expensive shipment**. [C19]
- **Redemption limits:** total, per order, per customer. [C19]
- **Coupon code:** blank means the discount applies automatically; set means the customer must enter it. One code per promotion by default. [C19]
- **Exclusions** stop discounts stacking (combination) or remove catalog items from a discount (catalog). [C19]

### Configured Commerce B2B

| Feature | How it works |
|---|---|
| **PunchOut** | The buyer shops from inside their own procurement system. Their cart goes back as a **requisition**; their approval turns it into a **purchase order** (a cXML Order Request), which goes on to the ERP. PunchOut sessions can't request quotes [C3][C20] |
| **Approval roles** | **Buyer 1**: every order needs approval. **Buyer 2**: only orders over budget, and only if budgets are enforced. **Buyer 3**: never. **Requisitioner**: submits requests instead of ordering [C4][C5] |
| **Budgets** | Enforcement levels, monthly, quarterly or fiscal periods, optional cost codes. Unspent money carries forward. An over-budget cart needs approval [C5] |
| **WIS** | Runs inside the customer's network and **polls the site for jobs**. *Refresh* pulls products, inventory and customers from the ERP; *Submit* pushes orders to it. Cloud ERPs like Acumatica don't need it [C6] |

### Commerce exam traps

| If a question implies… | The truth |
|---|---|
| Punchout, budgets or approvals are in Commerce Connect | They're **Configured Commerce** |
| A bundle has one SKU | **A package** does. Bundle items keep their own SKUs and lines |
| Customers buy products | They buy **variants (SKUs)** |
| Prices convert between currencies | **No.** One currency per price |
| The default price has minimum quantity 1 | It's **0** |
| A Commerce Connect "purchase order" is a B2B PO | It's a **checked-out cart** |
| A campaign is a discount | A campaign **contains** discounts |
| Commerce Connect 15 runs on CMS 12 | It needs **CMS 13 and .NET 10** |

🟡 Not confirmed from official sources: tax calculation, shipping providers, warehouse fulfillment details, and "connector framework" as a named feature. Several catalog and pricing facts come from version 13/14 docs and may have changed in 15.

## Data Platform and Analytics (15%, ≈3 questions)

### The one fact to remember

> [!important] Three products that sound alike
> **ODP (Optimizely Data Platform)** is the **customer data platform**: one profile per person, plus segments. **Optimizely Graph** is the **content** delivery and search API. **Optimizely Analytics** analyses data **in your own warehouse**, including experiment results. [D1][D11]

### Customer profiles and identity resolution

- ODP builds **one identity-resolved profile per customer** from every source: website, app, CRM, data warehouse and offline data. It adds predictive scores for purchase likelihood, churn risk and lifetime value. [D1]
- A profile has **identifiers**, which link records together, and **attributes** such as name, city and the GDPR/CCPA opt-out flags. [D2]

| Identifier confidence | Examples | Merges profiles when… |
|---|---|---|
| **High** | Email, e-commerce ID, support-system ID | **Always** |
| **Low** | **VUID** (ODP's cookie ID), other cookie IDs, push tokens | Only when no high-confidence ID is involved |

- **Anonymous to known:** an anonymous visitor's page views attach to their profile once they submit a matching email. [D3]
- **Shared computer:** if a cookie conflicts with a high-confidence identity, ODP **moves the cookie to the newer person** rather than merging two people. [D3]

### Events

- Every event has an **event type** (`order`, `product`, `email`) and an **event action** (`purchase`, `view`, `open`), plus extra fields. [D4]
- On the web: `zaius.event("order", { action: "purchase", ... })` from the ODP JavaScript tag. [D4]

### Real-time vs standard segments

ODP uses **"segment" and "audience" for the same thing.** [D5]

| | Real-time segment | Standard segment |
|---|---|---|
| How it runs | Streaming, continuously, queried per visitor by VUID | Batch |
| Data window | **28-day look-back** | Older data |
| Used for | **Personalising a live visitor** | Reports, campaigns, syncing to other tools |
| Updates | Within seconds | — |

### Activation: where segments go

| Destination | Key fact |
|---|---|
| **Web Experimentation** | The ODP snippet must load **before** the Web Experimentation snippet. VUID is the default user ID [D6] |
| **Feature Experimentation** | ODP audiences in flag rules [D6] |
| **CMS visitor groups / Audiences** | CMS 11 and 12, and CMS 13 since September 2026 (needs `EPiServer.Cms.UI.VisitorGroups`) [D7] |
| Other tools | Salesforce Data Cloud, Braze, Amplitude and others [D1][D7] |

### Reports, export and Optimizely Analytics

- **ODP reports:** standard and custom reports, exportable as downloads. [D8]
- **Export:** every customer gets an Amazon S3 import bucket and an export bucket. Exports run asynchronously as CSV or Parquet. [D9]
- **Warehouse into ODP:** "Analytics Audience Sync" pushes groups built in Snowflake, BigQuery or Redshift into ODP as audiences. [D10]
- **Optimizely Analytics** is **warehouse-native**: [D11]
  - It queries **your own warehouse** (Snowflake, BigQuery, Databricks, Redshift), which stays the source of truth.
  - It's built on three datasets: **decisions** (who saw which variation), **actors** (the users) and **events** (actions that become metrics).
  - It uses the Stats Engine and can analyse experiments run outside Optimizely.

🟡 "Behavioral semantics", a blueprint tag, has no official definition we could find.

### Data Platform exam traps

| If a question implies… | The truth |
|---|---|
| Graph stores customer profiles | Graph is **content**. Profiles are **ODP** |
| A cookie ID always merges profiles | **Only email-class (high-confidence) IDs always merge** |
| Real-time segments use all history | **28-day look-back** |
| Standard segments personalise a live visit | That's **real-time** segments |
| Analytics copies your data into Optimizely | It's **warehouse-native**: your warehouse stays the source |
| The Web Experimentation snippet loads first | **ODP's snippet loads first** |

## AI, Automation and Agent Orchestration (10%, ≈2 questions)

> [!warning] Opal has been renamed
> **Opal is now "Optimizely Agent Platform", and its everyday name is "Mark".** The support centre dates the rename to September 1, 2026; an Optimizely article says October 15, 2026, so official sources disagree. **"Instructions" are now "Skills".** The exam blueprint still says "Opal chat", so **know both sets of names**. The developer SDK is still the "Opal SDK". [A1][A2]

### Core terms

| Term | What it is |
|---|---|
| **Chat** | Natural-language interface with resumable threads, in the nav across Optimizely One and at `mark.optimizely.com` [A3] |
| **Agent** | A packaged capability combining skills and tools [A4] |
| **Specialized agent** | Does **one well-defined task**. Single-shot by default; you call it with `@` in chat [A4] |
| **Workflow agent** | Automates a **multi-step process** from a trigger, chaining specialized agents and logic [A5] |
| **Skill** (formerly **Instruction**) | Rules and context, such as **brand guidelines**. Organisation-wide or personal. A specialized agent only uses the skills attached to it [A4] |
| **Tool** | One function an agent can call, like web search or "create campaign". **System tools** are built by Optimizely; **custom tools** by your organisation [A4] |
| **Canvas** | A shared document you and the AI edit together [A4] |
| **RAG** | Retrieving your own data and content *before* generating, so answers stay grounded [A4] |
| **Agent Directory** | The library of prebuilt agents [A6] |

**Agent builder:** you configure a specialized agent with a prompt template, input variables written as `[[param]]`, its tools, and an inference level. [A7]

### Workflow agents

- **Triggers:** chat, schedule or webhook. [A5]
- **Steps:** specialized agents, nested workflows (up to 3 levels), conditions, loops, and code (Python, JavaScript or Bash). [A5]
- **Agents inside a workflow always run single-turn**, whatever their own setting. [A5]

### Custom tools: the developer side

This is the part closest to our work: the OxyChem redirector already exposes Opal tools.

1. Your service exposes a public **`/discovery`** endpoint that returns a tool manifest. [A8]
2. An admin registers it under **Connectors → Registries → Add tool registry** by pasting the discovery URL. [A9]
3. SDKs exist for **TypeScript, Python and C#**; the C# one covers ASP.NET Core and CMS 13. [A10]
4. Tool and registry names must be unique within an instance. [A8]

See [[work/cms13/optimizely-opal|Opal]] for how we've used this.

### Governance and guardrails

- **Requires Opti ID.** Admins can switch it off under **Admin Center → Settings → Generative AI**. [A3][A11]
- Admins choose the organisation's default model and the data region (US or EU). [A11]
- **Customer data is not used to train models**, and the model doesn't retain it. [A11]
- **Execution Guardrails** runs in **Learning, Watching or Enforcing** mode and can stop runs that behave abnormally. [A11]
- Usage is billed in **Mark credits**. Machine-learning features like the Stats Engine and bandits use none. [A11]

### Where AI appears in each product

| Product | AI features |
|---|---|
| **CMS 13 PaaS and CMS SaaS** | Agents for content model creation, Page Builder (builds content from a document, image or URL), SEO metadata, content analysis, WCAG auditing |
| **CMS 12** | **Chat only** |
| **CMP** | Content generation, translation, AI images, campaign kits |
| **Experimentation** | Results summaries, test ideas, variation copy, experiment review |
| **ODP** | Event-history summaries, suggested real-time audiences |
| **Analytics** | Explorations from plain language |
| **DAM** | Machine-learning image tags and smart cropping (not generative) |

*Source: [A11].* 🟡 No official CMS "AI image suggestions" feature was found; the closest matches are the DAM tags and image generation in CMP. "Content graph" and "multi-modal retrieval" as blueprint terms also have no official definition we could find.

### AI exam traps

| If a question implies… | The truth |
|---|---|
| Agent, tool and skill are interchangeable | **Agent** = packaged capability. **Tool** = one action. **Skill** = rules and context |
| A specialized agent orchestrates steps | That's a **workflow agent** |
| A specialized agent automatically follows brand guidelines | Only if that **skill is attached** to it |
| Customer data trains the model | **It doesn't** |
| Bandits and Stats Engine use AI credits | They're **machine learning**, no credits |
| CMS 12 has the content agents | **CMS 12 has chat only** |
| "Instructions" | Now called **Skills**. Opal = Mark = Agent Platform |

## Sources

*All checked 2026-11-15.*

**Commerce**
- [C1] [Commerce Connect 15 docs](https://docs.optimizely.com/commerce-connect-15/docs) · [New in Commerce 15](https://docs.developers.optimizely.com/commerce-connect/v15.0.0-commerce-connect/docs/new-in-commerce-15)
- [C2] [Configured Commerce product page](https://www.optimizely.com/products/commerce/configured-commerce/)
- [C3] [PunchOut process and design](https://docs.developers.optimizely.com/configured-commerce/v1.5.45-b2b-sdk/docs/punchout-process-and-design-overview)
- [C4] [Set up order approval](https://docs.optimizely.com/configured-commerce/docs/set-up-order-approval)
- [C5] [Budget Management overview](https://support.optimizely.com/hc/en-us/articles/4413191645453-Budget-Management-overview) · [Configure a budget](https://docs.optimizely.com/configured-commerce/docs/configure-a-budget)
- [C6] [Integration technology overview](https://docs.optimizely.com/configured-commerce/docs/integration-technology-overview)
- [C7] [Order manipulation](https://docs.developers.optimizely.com/commerce-connect/docs/order-manipulation)
- [C8] [Catalog entries (v15)](https://docs.developers.optimizely.com/commerce-connect/v15.0.0-commerce-connect/docs/catalog-entries)
- [C9] [Catalog content (v14)](https://docs.optimizely.com/commerce-connect-14/docs/catalog-content)
- [C10] [Categorizations](https://docs.developers.optimizely.com/commerce-connect/docs/categorizations)
- [C11] [Markets](https://docs.developers.optimizely.com/commerce-connect/docs/markets)
- [C12] [Pricing (v14)](https://docs.developers.optimizely.com/commerce/v14.0.0-commerce-cloud/docs/pricing)
- [C13] [Inventory requests](https://docs.developers.optimizely.com/commerce-connect/docs/inventory-requests)
- [C14] [Service API: catalog relations](https://docs.developers.optimizely.com/commerce-connect/v1.3.0-service-api-developer-guide/docs/catalog-entry-node-relations)
- [C15] [Carts (v15)](https://docs.developers.optimizely.com/commerce-connect/v15.0.0-commerce-connect/docs/carts)
- [C16] [Returns and exchanges](https://docs.optimizely.com/commerce-connect-15/docs/returns-and-exchanges)
- [C17] [Campaigns (v15)](https://docs.developers.optimizely.com/commerce-connect/v15.0.0-commerce-connect/docs/campaigns)
- [C18] [Campaigns and discounts](https://support.optimizely.com/hc/en-us/articles/4413192111245-Campaigns-and-discounts)
- [C19] [Built-in discounts (v15)](https://docs.developers.optimizely.com/commerce-connect/v15.0.0-commerce-connect/docs/built-in-discounts) · [Coupons](https://docs.developers.optimizely.com/commerce-connect/docs/coupons)
- [C20] [Order approvals API handler](https://docs.developers.optimizely.com/configured-commerce/docs/order-approvals-apihandler)

**Experimentation and personalization.** Many old `support.optimizely.com` and `docs.developers.optimizely.com` links now redirect to `docs.optimizely.com`.
- [E1] [Feature Experimentation introduction](https://docs.optimizely.com/feature-experimentation/docs/introduction) · [Feature Experimentation comparison](https://world.optimizely.com/products/feature-experimentation/comparison)
- [E2] [Load the snippet synchronously and asynchronously](https://docs.optimizely.com/web-experimentation/docs/load-snippet-synchronously-and-asynchronously)
- [E3] [Implement the snippet with a tag manager](https://docs.developers.optimizely.com/web-experimentation/docs/implement-the-snippet-with-a-tag-manager)
- [E4] [Multivariate testing](https://support.optimizely.com/hc/en-us/articles/4410289058573)
- [E5] [Core concepts of Feature Experimentation](https://docs.optimizely.com/feature-experimentation/docs/core-concepts-of-feature-experimentation)
- [E6] [Decide methods (C#)](https://docs.developers.optimizely.com/feature-experimentation/docs/decide-methods-csharp)
- [E7] [Feature Experimentation introduction](https://docs.optimizely.com/feature-experimentation/docs/introduction)
- [E8] [Interactions between flag rules](https://docs.developers.optimizely.com/feature-experimentation/docs/interactions-between-flag-rules)
- [E9] [Feature Experimentation comparison](https://world.optimizely.com/products/feature-experimentation/comparison)
- [E10] [Stats Engine whitepaper (PDF)](https://www.optimizely.com/contentassets/9205a8a811e84957a7cca527d4af20be/whitepaper_optimizely_stats_engine.pdf)
- [E11] [Statistical significance](https://docs.optimizely.com/experimentation-strategy/docs/statistical-significance)
- [E12] [Run contextual multi-armed bandits](https://docs.optimizely.com/feature-experimentation/docs/run-contextual-multi-armed-bandits)
- [E13] [Audiences (CMS 13)](https://docs.optimizely.com/cms-13/docs/audiences)
- [E14] [Content Recommendations topic extraction](https://docs.developers.optimizely.com/recommendations/docs/topic-extraction)
- [E15] [Data Platform recommendations API](https://docs.optimizely.com/data-platform/api/recommendations-overview)

**Data Platform and Analytics**
- [D1] [Data Platform product page](https://www.optimizely.com/products/data-platform)
- [D2] [The basics: customers](https://docs.optimizely.com/data-platform/docs/thebasics-customers)
- [D3] [Customer identity and resolution](https://support.optimizely.com/hc/en-us/articles/4407767067149-Overview-of-customer-identity-and-resolution) · [Track customers in ODP](https://docs.optimizely.com/data-platform/docs/track-customers-in-odp)
- [D4] [Web SDK custom events](https://docs.developers.optimizely.com/optimizely-data-platform/docs/websdk-custom-events) · [Standard event definitions](https://docs.optimizely.com/data-platform/docs/standard-event-definitions)
- [D5] [Real-time segments roadmap](https://docs.optimizely.com/data-platform/docs/realtimesegments-roadmap-for-mastering-real-time-segments) · [Querying real-time segments](https://docs.developers.optimizely.com/optimizely-data-platform/docs/realtimesegments-querying-real-time-segments) · [Build real-time audiences](https://support.optimizely.com/hc/en-us/articles/37582243690765-Build-real-time-audiences-in-ODP)
- [D6] [ODP and Experimentation](https://docs.optimizely.com/data-platform/docs/odp-experimentation)
- [D7] [2026 ODP release notes](https://docs.optimizely.com/data-platform/release-notes/2026-optimizely-data-platform-release-notes)
- [D8] [Custom reports](https://support.optimizely.com/hc/en-us/articles/4407767160717-Use-custom-reports)
- [D9] [Import data using Amazon S3](https://docs.optimizely.com/data-platform/docs/import-data-using-amazon-s3)
- [D10] [Analytics Audience Sync](https://support.optimizely.com/hc/en-us/articles/44758742866573-Integrate-Optimizely-Analytics-Audience-Sync)
- [D11] [Warehouse-native experimentation analytics](https://docs.optimizely.com/web-experimentation/docs/get-started-with-warehouse-native-experimentation-analytics)

**AI and agents**
- [A1] [Agent Platform (previously Opal), support centre](https://support.optimizely.com/hc/en-us/categories/36242844454797-Agent-Platform-previously-Opal)
- [A2] [Opal is now Mark (Field Notes)](https://www.optimizely.com/field-notes/articles/opal-is-now-mark)
- [A3] [Agent Platform overview](https://docs.optimizely.com/agent-platform/docs/agent-platform-overview)
- [A4] [Agent Platform glossary](https://docs.optimizely.com/agent-platform/docs/agent-platform-glossary)
- [A5] [Create a workflow agent](https://docs.optimizely.com/agent-platform/docs/create-a-workflow-agent)
- [A6] [Instruction agents overview](https://support.optimizely.com/hc/en-us/articles/36353487109133-Optimizely-Opal-instruction-agents-overview)
- [A7] [Manage agents](https://docs.optimizely.com/agent-platform/docs/manage-agents)
- [A8] [Create custom tools](https://support.optimizely.com/hc/en-us/articles/39190444893837-Create-custom-tools)
- [A9] [Add a custom tool](https://support.optimizely.com/hc/en-us/articles/39195307678221-Add-a-custom-tool-to-Optimizely-Opal)
- [A10] [Get started with tools in CMS 13](https://docs.optimizely.com/cms-13/docs/get-started-tools-cms-13)
- [A11] [Agent Platform and AI features](https://docs.optimizely.com/agent-platform/docs/agent-platform-and-ai-features)
