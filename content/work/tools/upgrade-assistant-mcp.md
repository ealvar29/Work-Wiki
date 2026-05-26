---
title: "Optimizely Upgrade Assistant MCP"
tags:
  - optimizely
  - cms
  - migration
  - ai
  - mcp
  - tools
---

# Optimizely Upgrade Assistant MCP

An in-house MCP server (built by the Jaxon Digital team) that gives Claude and other AI coding assistants structured, static-analysis-backed intelligence about a CMS 12 → CMS 13 upgrade. Rather than asking Claude to figure out what needs to change by reading the codebase cold, the MCP pre-analyses the repo and hands Claude an ordered task list, LOE estimate, and ticket exports.

**Repo:** `H:\GitKraken\Optimizely-MCP\optimizely-upgrade-assistant`

## Three-Step Workflow

```
assess → plan → verify
```

| Step | MCP Tool | Output |
|---|---|---|
| 1. Assess | `assess_optimizely_upgrade` | `upgrade-assessment.md` — blockers, risks, LOE estimate |
| 2. Plan | `build_optimizely_upgrade_plan` | `upgrade-plan.md`, Jira/Azure DevOps CSV exports, structured JSON |
| 3. Verify | `verify_cms13_readiness` | 10-point pass/fail checklist — confirms readiness post-upgrade |

Run these in order. The assess and plan steps write to `{repoRoot}/UpgradePlan/` so Claude (or any team member) can reference them throughout the migration.

## Setup

```bash
cd H:\GitKraken\Optimizely-MCP\optimizely-upgrade-assistant
npm install
npm run build
# entry point: dist/index.js
```

**Requirements:** Node.js 18+ (v24 recommended). The .NET SDK is only needed for the optional `checkVulnerabilities` and `checkDeadCode` flags — all other analysis uses direct file parsing and the NuGet v3 HTTP API.

### Wire Up Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "optimizely-upgrade-assistant": {
      "command": "node",
      "args": ["H:/GitKraken/Optimizely-MCP/optimizely-upgrade-assistant/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop. The three tools will appear in the tool list.

### CLI Alternative (No MCP Client Needed)

```bash
npm run export-plan -- "C:/path/to/client/repo"
```

Same analysis as `build_optimizely_upgrade_plan`, writes all artifacts to `UpgradePlan/`. Useful for running the assessment standalone before an engagement.

## Tool Reference

### `assess_optimizely_upgrade`

Scans the repository and produces an executive summary + full assessment report.

**Key options:**

| Option | Default | Notes |
|---|---|---|
| `rootPath` | `process.cwd()` | Absolute path to client repo root |
| `queryNuGetFeeds` | `true` | Resolves latest versions via NuGet v3 HTTP API (~2–3 s) |
| `checkDeadCode` | `false` | Runs roslynator dead-code analysis (~30–120 s); requires roslynator CLI |
| `writeToDisk` | `true` | Writes `UpgradePlan/upgrade-assessment.md` |

**What it analyses:**

- NuGet packages — compatibility, vendor classification, latest versions from Optimizely and nuget.org feeds
- Target Framework across all `.csproj` files and `Directory.Build.props`
- **35+ CMS 13 code patterns** in `.cs` / `.cshtml` — Find, OWIN, SiteDefinition, DynamicProperty, WCF, ServiceLocator, legacy routing, and more
- **9 Opti ID auth migration scenarios** — detects per-scenario based on packages and code signals (local identity, SAML, Azure AD/Entra, embedded IdP, JWT, OWIN, custom claims, virtual roles, visitor groups)
- `appsettings.json` — auth config sections, ContentGraph presence, Find config signals
- `NuGet.config` — emits `MISSING_OPTI_FEED` if Optimizely feed is absent (CMS 13 packages will not restore without it)
- `.sln` file — ordered project discovery, web project identification

### `build_optimizely_upgrade_plan`

Generates an ordered task queue (TASK-001, TASK-002, …) and exports for project management tools.

**Artifacts written to `UpgradePlan/`:**

| File | Use |
|---|---|
| `upgrade-plan.md` | Human-readable task list by category |
| `upgrade-plan.json` | Structured JSON with full task details + ticket exports |
| `work-items.azure-devops.csv` | Import directly into Azure Boards |
| `work-items.jira.csv` | Import directly into Jira |
| `work-items.json` | Flat work item array for REST API integration |

All exported work items are linked to a single **"CMS 13 Upgrade"** epic and tagged with group labels (e.g., `find-to-graph`, `retarget-dotnet`) for board filtering.

**Key option:** `checkVulnerabilities: true` runs `dotnet list package --vulnerable --include-transitive` (~30 s per project). Off by default.

### `verify_cms13_readiness`

10-point post-upgrade checklist. Run this after the upgrade is complete to get a clear pass/fail before handing off to QA.

| Check | Pass Condition |
|---|---|
| Target framework | All projects on `net10.0` |
| No EPiServer.Find packages | None remain |
| No Microsoft.Owin packages | None remain |
| No embedded IdP packages | Duende / IdentityServer4 removed |
| CMS version | `EPiServer.CMS` v13+ |
| Optimizely NuGet feed | Present in `NuGet.config` |
| ContentGraph config | `Optimizely:ContentGraph` section in appsettings |
| Opti ID registered | `AddOptimizelyIdentity()` in startup |
| No WCF packages | No `System.ServiceModel` remains |
| Feed resolvable | No `MISSING_OPTI_FEED` finding |

Overall status: **ready** (zero failures) or **not-ready**. Advisory only — does not run `dotnet build`.

## NuGet Feed Analysis

The tool queries the NuGet v3 HTTP API directly — no MSBuild, no `dotnet restore`. For a 50-package solution this takes 1–3 s vs. ~85 s with `dotnet list package --outdated`. Add the Optimizely feed to `NuGet.config` in the client repo for accurate results:

```xml
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
    <add key="Optimizely" value="https://api.nuget.optimizely.com/v3/index.json" />
  </packageSources>
</configuration>
```

Without this file the tool still runs, but it emits a `MISSING_OPTI_FEED` finding and the `verify_cms13_readiness` check fails.

## Auth Migration Detection

The tool maps 9 auth scenarios and generates specific remediation tasks for each:

| Signal | Scenario | CMS 13 Path |
|---|---|---|
| `EPiServer.Cms.UI.AspNetIdentity` | Local ASP.NET Identity | Migrate to Opti ID |
| `Sustainsys.Saml2.*` | SAML 2.0 SSO | Opti ID SAML federation |
| `Microsoft.Identity.Web` | Azure AD / Entra ID | Entra as Opti ID OIDC connection |
| `Duende.IdentityServer` / `IdentityServer4` | **Embedded IdP — BLOCKER** | Must externalise before upgrading |
| `Microsoft.Owin.*` | **OWIN middleware — BLOCKER** | Full rewrite required; incompatible with .NET 10 |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | JWT Bearer (headless/API) | Keep for API routes; Opti ID protects editor paths |
| `IClaimsTransformation` impl | Custom claims transformation | Remap to Opti ID claim types |
| `IAuthorizationHandler` impl | Custom authorization policies | Test CMS role claim types post-migration |
| `IVirtualRoleProvider` impl | Visitor group auth | Test claim type mappings post-migration |

Both embedded IdP and OWIN are flagged as hard blockers — the upgrade cannot proceed until they are resolved.

## Find → Graph API Mapping (MCP Resource)

The MCP exposes a `graph_migration_guide` resource with the full Find → Graph API mapping. Quick reference:

| EPiServer.Find (CMS 12) | Optimizely.Graph (CMS 13) |
|---|---|
| `.Search<T>()` | `.QueryContent<T>()` |
| `.For("query")` | `.SearchFor("query")` |
| `.Filter(x => ...)` | `.Where(x => ...)` |
| `.InField(x => x.Title, 2.0)` | `.UsingField(x => x.Title, boost: 2)` |
| `.Take(10)` | `.Limit(10)` |
| `.OrderByDescending(x => x.Date)` | `.OrderBy(x => x.Date, OrderDirection.Descending)` |
| `.GetResult()` | `.GetAsync()` — async only |
| `.TermsFacetFor(x => ...)` | `.Facet(x => ...)` |
| `SearchResults<T>` | `IContentResult<T>` |

See [[search-to-graph|Search & Navigation → Graph Migration]] for full implementation patterns.

## How It Fits the Upgrade Workflow

The MCP sits **before** the Claude Code upgrade execution prompt from [[ai-assisted-upgrade|AI-Assisted Upgrades]]:

1. **Run `assess_optimizely_upgrade`** → read `upgrade-assessment.md` to understand blockers and LOE before committing to a timeline
2. **Run `build_optimizely_upgrade_plan`** → import CSVs into Jira/Azure DevOps; hand `upgrade-plan.md` to Claude Code as a pre-built task list
3. **Execute the migration** using the Claude Code prompt in `ai-assisted-upgrade.md` — Claude now has structured evidence instead of having to guess
4. **Run `verify_cms13_readiness`** → use as a pre-QA gate before handing off to the [[ai-assisted-upgrade|QA crawl prompt]]

The MCP replaces the "Analyse my existing codebase" step in the Claude Code prompt with a faster, more thorough static-analysis pass that is repeatable across engagements.

## Related

- [[ai-assisted-upgrade|AI-Assisted Upgrades]] — Claude Code upgrade and QA prompts; the MCP feeds directly into this workflow
- [[breaking-changes|Breaking Changes]] — the 35+ patterns the MCP detects
- [[search-to-graph|Search & Navigation → Graph Migration]] — largest migration task; MCP provides the API mapping resource
- [[upgrade-checklist|Upgrade Checklist]] — the `verify_cms13_readiness` checklist maps to these steps
- [[applications-model|Applications Model]] — SiteDefinition removal is one of the detected patterns

## Sources

- Internal repo: `H:\GitKraken\Optimizely-MCP\optimizely-upgrade-assistant` *(Jaxon Digital, 2026)*
