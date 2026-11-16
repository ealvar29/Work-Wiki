---
title: "Mark (Agent Platform) — Opticon 2026 & Mark Desktop"
tags:
  - optimizely
  - cms
  - opal
  - mark
  - ai
---

**Opal is now "Mark".** Its official name is **Optimizely Agent Platform**. This page covers what Opticon 2026 announced, the names you'll see in docs and exams, and the new **Mark Desktop** app, which gives agents access to your local files and shell. For installing Opal and fixing problems inside the CMS editor, see [[optimizely-opal|Optimizely Opal — Install & Troubleshooting]].

*Researched 2026-11-16. Release states and dates change fast, so check the date before you rely on any claim here.*

> [!warning] Mark Desktop can read your files without asking
> Agents **don't ask for confirmation before reading files or running "inspection" commands**. If an agent needs a file you haven't granted, Mark Desktop **automatically grants the folder that contains it**. Never add a repo root as a Workspace when it holds `appsettings.*.json`, user-secrets or `.claude/` backups. [S1][S2]

## The names

| Name | What it is | Status *(2026-11-16)* |
|---|---|---|
| **Optimizely Agent Platform** | The official name for the former **Opal**. Use it on order forms and in contracts | Live |
| **Mark** | Everyday name for the chat and agent product. The web app is `mark.optimizely.com` (`opal.optimizely.com` still appears in docs) | Live |
| **Mark-1** (also "Mark AI") | A family of post-trained marketing models from Optimizely | Announced, "coming soon" |
| **Mark-IQ** | Data and context layer built from your own experimentation history and web analytics | Announced |
| **Mark-Bench** | Optimizely's open-source marketing benchmark | Published |
| **Virtual Teammates** | Agents you "hire" for a role. Each has its own Opti ID identity, permissions, memory and audit trail, and can run on a schedule or a trigger | Rolling out |
| **Skills** | The new name for Opal **Instructions** | Live |

**The rename date depends on the source.** Optimizely's support centre says **2026-09-01**. The field note *"Who the EFF is Mark?"* says **2026-10-15**. An Optimizely employee's blog just says "autumn 2026". [S3][S4][S5]

**Developer-facing names still say Opal.** Examples are the `Optimizely.Cms.OpalChat` package, the Opal Tools SDK (`AddOpalToolService`, `[OpalTool]`) and the `/discovery` endpoints. Don't rename anything in code because of the rebrand.

## Opticon 2026

| Date | Event | What was announced |
|---|---|---|
| 2026-08-31 | Pre-Opticon launch | **Virtual Teammates** with 5 roles: Chief of Staff, SEO & AI Search Analyst, Marketing Analyst, Personalization Strategist, CRO Manager [S6] |
| 2026-09-01 | **Opticon New York**, North Javits Center | Opal becomes Mark. Mark-1, Mark-IQ and Mark-Bench announced. Optimizely calls itself "the AI platform for marketing" and **drops the DXP label**. Agent Visibility with Conductor goes GA [S4][S6] |
| 2026-10-13 | **Opticon London**, Barbican (OMVP Summit the day before) | Virtual Teammates grow to **7 roles**. Mark models still "coming soon". CMS 13 positioned as "the gateway to the agentic tooling" [S7] |
| 2026-10-15 | — | Official retirement date of the Opal name, per the field note [S3] |
| 2026-11-12 | — | **Mark Desktop** release announced (first hands-on write-up) [S2] |

> [!note] Take the benchmark figures with caution
> **Mark-Bench** has 285 tasks across 15 functions and more than 6,000 criteria. The headline result is **Mark 67% against Claude Code 60% at half the cost**. **Optimizely wrote the benchmark**, and the comparison used models that aren't released yet. Sources also disagree on the numbers (6,523 vs 3,564 criteria; 58% vs 52% in another configuration). [S3][S4][S6]

**Opticon 2026 had no Visual Builder announcement.** Visual Builder's AI story is the CMS 13 Opal tools, which include **Visual Builder styling** tools. See [[visual-builder|Visual Builder]].

## Mark Desktop

A native app with the same UI as `mark.optimizely.com` **plus local tools that the browser version doesn't have**. Chats sync between the desktop app and the browser. You get a desktop notification when a response finishes. [S1][S2]

### Install

| OS | Requirement | Install |
|---|---|---|
| macOS | 13+ (Apple Silicon and Intel) | `brew install --cask optimizely/agent-platform/mark` (recommended), the installer from the downloads page, or the script below |
| Linux | Debian 12+ / Ubuntu 22.04+ (amd64). **No RPM** (Fedora, RHEL) | Script below. It adds the APT repo and installs `mark-desktop` |
| Windows | Listed as supported, **no minimum version given** | Installer from `https://www.optimizely.com/downloads/ai` |

```bash
curl -fsSL https://dl.mark.optimizely.com/desktop/install.sh | sudo sh
brew install --cask optimizely/agent-platform/mark@VERSION_NUMBER   # pin a version
```

Windows and macOS update themselves and ask you to restart. Linux updates through `apt upgrade`. [S1]

### Access

1. **An administrator must enable Mark for each user in Opti ID.** Mark is on by default for eligible customers, but **users get no access until an admin enables it for them**.
2. Click **Log in** and sign in with **Opti ID**.
3. Pick an **Organization** and an **Instance**. You can switch them later from the nav bar.

**Logging out only clears the local session.** Your identity-provider session stays signed in, so on a shared machine you also need to sign out of the identity provider. [S1]

### Local tools

| Tool | Does | Asks first? |
|---|---|---|
| List directory | Names, types, sizes, dates | No |
| Read local file | File contents | No |
| Search local files | Plain text or regex; returns path and line number | No |
| File info | Size, type, permissions, MIME type | No |
| Write local file | Creates or overwrites a file, creating parent folders | **Yes** |
| Delete local file | File or empty folder, **moved to the OS trash** | **Yes** |
| Upload file | Local file → Mark storage, so agents can reference it | **Yes** |
| Shell | Runs a command and returns its output. **60 s timeout** by default | Only if it "modifies your system" |

**Workspaces** are the folders you grant. Agents can read, write, search and run commands only inside them. If an agent needs a file outside them, Mark Desktop **grants the folder that contains it automatically**. It refuses to grant a folder that's too broad (your home folder, the root) and asks you to choose a narrower one. A folder that's moved or unmounted drops off the list straight away. [S1]

**The docs don't explain how Shell decides a command is read-only.** In a hands-on test it read files without a prompt. [S2] So treat everything inside a Workspace as readable by the model.

### What the docs don't cover *(2026-11-16)*

- **MCP or custom tools on the desktop.** None are mentioned. The only desktop-specific tools are the eight above. Remote MCP connectors and custom tools are platform features that work in both the browser and the desktop app.
- **CMS integration.** Mark Desktop has no CMS-specific feature. CMS work goes through the CMS 13 PaaS tools.
- Licensing, pricing and version history for Mark Desktop specifically. On the platform side, there are 200 free credits per instance per month until the end of 2026. [S8]

## How this affects CMS 13 work

| Topic | What to know | Confidence |
|---|---|---|
| **CMS 13 PaaS tools** | `paas_cms_list_content_types`, `paas_cms_update_content_item` (creates a draft if no key is given), `paas_cms_publish_content_item`, `paas_cms_get_content_preview_url`, `paas_cms_upload_media` (pulls a file from a **public URL**), SEO/GEO analysis. Arrived 2026-05-22. **No parity with the SaaS tool set** [S8] | Partner blog |
| **Mark chat inside the CMS** | One source says that from CMS **13.2.0**, Mark chat is built into the CMS (needs DXP and Opti ID). The text is garbled, so **check it against the CMS release notes before you remove `Optimizely.Cms.OpalChat`** [S8] | 🟡 Unverified |
| **Custom tool auth** | "Only Opti ID is supported for tool authentication" [S8]. The SDK itself doesn't check bearer tokens. If you protect tools with a static bearer, re-test them after every platform change. See [[optimizely-opal#Building Your Own Custom Tool (C# SDK)\|custom tools]] | 🟡 Watch |
| **Remote MCP** | Connectors (Atlassian, GitHub, HubSpot…) from 2026-03-30, **and you can connect your own remote MCP server from 2026-07-29**, with user-level auth [S8] | Partner blog |
| **Models** | Anthropic Claude (through Vertex) since 2026-03-15, provider choice under **Settings → Chat** since 2026-06-24, OpenAI added Nov 2026 [S8][S9] | Partner blog / official teaser |

## Related

- [[optimizely-opal|Optimizely Opal — Install & Troubleshooting]] — installing it in the CMS editor, CSP `wss://`, custom tool SDK
- [[visual-builder|Visual Builder]] — and the [[work/clients/oxychem/visual-builder-poc|OxyChem VB POC]]
- [[opti-id-admin-center|Opti ID & the Admin Center]] — where per-user Mark access is granted
- [[work/certification/foundations-study-guide|Foundations study guide]] — exam wording (Opal = Mark = Agent Platform, Instructions = Skills)

## Sources

- [S1] [Mark Desktop app — Optimizely docs](https://docs.optimizely.com/agent-platform/docs/mark-desktop-app) *(read 2026-11-16)*
- [S2] [Mark Stott — First Impressions of Optimizely Mark Desktop](https://world.optimizely.com/blogs/mark-stott/dates/2026/11/first-impressions-of-optimizely-mark-desktop/) *(2026-11-12, OMVP)*
- [S3] [Who the EFF is Mark? — Optimizely Field Notes](https://www.optimizely.com/field-notes/articles/opal-is-now-mark) *(2026-10-28)*
- [S4] [Camp Opticon 2026: Built for what's next — Optimizely](https://www.optimizely.com/field-notes/articles/ai-platform-built-for-whats-next) *(2026-09-01)*
- [S5] [David Knipe — Is Optimizely Opal now Mark?](https://www.david-tec.com/2026/11/optimizely-opal-is-now-mark-agent-platform-names-explained/) *(2026-11-04)*
- [S6] [CMSWire — Optimizely retires DXP label, bets everything on Agent Platform](https://www.cmswire.com/digital-experience/optimizely-retires-dxp-label-bets-everything-on-agent-platform/) *(2026-09-03)*
- [S7] [Mando — Opticon 2026 and the OMVP Summit](https://www.mandogroup.com/news-insights/opticon-2026-and-the-optimizely-omvp-summit-agentic-futures-upgrade-paths-and-growth) *(2026-10-16)*
- [S8] [Scott Reed — Optimizely Agent Platform: October 2026 State of Play](https://world.optimizely.com/blogs/scott-reed/dates/2026/10/optimizely-agent-platform---october-2025-state-of-play) *(2026-10-05)*
- [S9] [Optimizely Developers](https://www.optimizely.com/developers) *("Mark goes desktop" teaser, Nov 2026)*
- [Scott Reed — Opticon New York & the strategy on upgrading to CMS 13](https://world.optimizely.com/blogs/scott-reed/dates/2026/9/opticon-new-york--the-strategy-on-upgrading-to-cms-13-/) *(2026-09-07)*
