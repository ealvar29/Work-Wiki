# Work Wiki — Claude Instructions

This is a work knowledge wiki built on Quartz v4, focused on **Optimizely CMS 13** development. It lives at https://work-wikipedia.netlify.app and is deployed automatically on every push to `main`.

## When You Receive a Link

If the user pastes a URL with no other instruction (or says something like "found this" / "check this out"), do the following automatically — no need to ask for direction:

1. **Fetch and read the article**
2. **Evaluate quality** using the criteria below
3. **If it passes** — create a wiki page and commit it
4. **If it fails** — tell the user why in one sentence and ask if they still want it added

### Quality Criteria

Accept the article if it meets ALL of:
- Covers Optimizely CMS 13, or closely related topics (.NET on CMS, DXP, Optimizely Graph, headless, editor tooling, upgrade patterns)
- Has technical substance — code examples, API patterns, real implementation advice, or documented gotchas
- Written by a credible source: Optimizely employees, OMVPs, established community contributors (world.optimizely.com authors, known dev blogs), or official Optimizely documentation

Reject (and say why) if:
- Pure marketing or product announcement with no technical content
- Already substantially covered by an existing wiki page
- Too vague or high-level to be useful as a reference

### Creating the Wiki Page

Save new pages to: `content/work/cms13/`

**Filename:** kebab-case, descriptive, no date prefix (e.g. `graph-sdk-caching.md`)

**Frontmatter:**
```yaml
---
title: "Human readable title"
tags:
  - optimizely
  - cms
  - [relevant additional tags]
---
```

**Page structure:**
- Lead with the core problem or concept — no preamble
- Use H2 sections, code blocks, and tables where appropriate
- Include a `## Sources` section at the bottom with the article URL and date
- Use wikilinks `[[filename|Label]]` to cross-reference related existing pages

**After writing the page:**
- Update `content/work/cms13/index.md` to link the new page in the appropriate section
- Run `npx quartz build` to verify the build is clean
- Commit with a short message describing what was added

### Existing Pages (don't duplicate these)

| File | Topic |
|---|---|
| `what-is-cms13.md` | CMS 13 overview and platform stack |
| `upgrading-from-cms12.md` | Upgrade strategy and what changed |
| `upgrade-checklist.md` | Step-by-step upgrade checklist |
| `breaking-changes.md` | Full breaking changes catalog |
| `dotnet-compatibility.md` | .NET 8/10/11 support status |
| `applications-model.md` | SiteDefinition → Application migration |
| `graph-sdk.md` | Graph C# SDK (IGraphContentClient) |
| `search-to-graph.md` | S&N → Graph migration |
| `visual-builder.md` | Visual Builder and Content Variations |
| `cms-rest-api.md` | REST API v1 |
| `translations.md` | Language Manager, URL generation |
| `removing-unused-properties.md` | Property cleanup pattern |
| `custom-admin-tools.md` | MenuProvider, admin controllers |
| `custom-property-editors.md` | ES6 module editors |
| `ai-assistant.md` | AI Assistant v4 NuGet package |
| `ai-assisted-upgrade.md` | Claude Code upgrade + QA prompts |
| `debugging-dxp.md` | DXP observability and logging |
| `cms13-resources.md` | Curated links and sources |

## Repo Structure

```
content/
└── work/
    ├── index.md
    └── cms13/
        ├── index.md    ← update this when adding new pages
        └── *.md        ← individual topic pages
```

## Build & Deploy

- Build locally: `npx quartz build`
- Serve locally: `npx quartz build --serve`
- Deploys automatically to Netlify on push to `main`
- Build command: `npx quartz build` → publish dir: `public`

## Wiki Tone and Style

- Lead with practical information — no throat-clearing
- Prefer code examples over prose explanations
- Tables for comparisons and API mappings
- Bold key terms on first use
- No comments in code blocks unless the why is non-obvious
- Source attribution at the bottom of every page
