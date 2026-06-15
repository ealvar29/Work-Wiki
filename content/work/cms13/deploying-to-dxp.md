---
title: Deploying a CMS 13 Upgrade to DXP (Azure DevOps + EpiCloud)
tags:
  - optimizely
  - dxp
  - devops
  - deployment
  - cicd
---

# Deploying a CMS 13 Upgrade to DXP

End-to-end notes from standing up a CI/CD deploy of an upgraded CMS 13 (.NET 10) site
to Optimizely DXP Integration, built hands-on during the OxyChem upgrade. Every error
below is one we actually hit — match the symptom, apply the fix.

## Mental model (read this first)

DXP is a **managed PaaS** — Optimizely owns the App Services, deployment slots, SQL
database, blob storage, and Service Bus. You **cannot** reach into it with the normal
Azure "App Service Deploy" / Web Deploy / FTP tasks, and you do **not** use the Azure
DevOps Classic **Releases** feature.

The only door into DXP is its **Deployment API**, driven either by:

- the **EpiCloud** PowerShell module (what we used — no extension install needed), or
- the **Optimizely DXP** Azure DevOps marketplace extension (same API underneath; needs
  rights to install an org extension).

> Because DXP deploys happen as steps **inside the build pipeline** (or any pipeline),
> the Classic **Releases** page staying empty is **expected and fine**. Don't go looking
> for a release pipeline — it isn't part of this flow.

The shape of every deploy:

```
build + publish  →  package into *.cms.app.*.nupkg  →  EpiCloud upload + Start-EpiDeployment
```

## The three pieces

### 1. Build + publish

Standard `dotnet build` / `dotnet publish`. One gotcha when migrating off an older TFM:

> **Symptom:** `NETSDK1005: Assets file 'project.assets.json' doesn't have a target for
> 'net6.0'.`
> **Cause:** the pipeline's build/publish tasks still pass `--framework net6.0` while the
> csproj now targets `net10.0`.
> **Fix:** drop `--framework` entirely (the project is single-targeted) or set it to the
> new TFM. Check **both** the build task **and** the publish task — they're configured
> separately.

### 2. Package — the DXP code-package format

DXP code packages are NuGet packages with strict rules:

- The file name **must** contain the `.cms.app.` token, e.g.
  `MySite.cms.app.1.0.123.nupkg`. (Other recognized tokens: `.commerce.app.`,
  `.cms.sqldb.`, `.commerce.sqldb.`.)
- The published output (DLLs) must sit at the **root** of the package. The app's *own*
  `wwwroot` static folder stays as a subfolder under that root. **Do not** wrap the whole
  publish output in a top-level `wwwroot` folder.

> **Symptom:** deploy fails fast (~4%) during "convert to container image" with
> `DXCS006: The code package does not contain the right assemblies or versions needed for
> DXP. Could not find the required DLL 'EPiServer.CloudPlatform.Cms.dll'.`
> **Cause:** the assemblies aren't at the package root (e.g. you packed everything under a
> `wwwroot` target).
> **Fix:** in the nuspec use `<file src="**" target="" />` (root), **not**
> `target="wwwroot"`.

A working nuspec packed with `nuget pack <nuspec> -BasePath <publishDir> -NoDefaultExcludes`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd">
  <metadata>
    <id>MySite.cms.app</id>   <!-- id + ".<version>.nupkg" => the .cms.app. token -->
    <version>1.0.123</version>
    <authors>Team</authors>
    <description>CMS 13 DXP deployment package</description>
  </metadata>
  <files>
    <file src="**" target="" />
  </files>
</package>
```

Ref: [Code package format](https://docs.developers.optimizely.com/digital-experience-platform/docs/code-package-format).

### 3. Deploy — EpiCloud

```powershell
Install-Module EpiCloud -Scope CurrentUser -Force
Connect-EpiCloud -ClientKey $key -ClientSecret $secret -ProjectId $projectId
$loc = Get-EpiDeploymentPackageLocation                       # returns a SAS upload URL
Add-EpiDeploymentPackage -SasUrl $loc -Path .\MySite.cms.app.1.0.123.nupkg
$d = Start-EpiDeployment -DeploymentPackage 'MySite.cms.app.1.0.123.nupkg' `
        -TargetEnvironment Integration
# poll Get-EpiDeployment -Id $d.id until status leaves 'InProgress'
```

**Credentials** (ClientKey + ClientSecret + ProjectId) come from the **PaaS portal → API**.
In Azure DevOps store them in a **Variable Group**, mark the secret locked, and **map the
secret into the script via the task's Environment Variables** (e.g. `DXP_CLIENT_SECRET =
$(DxpClientSecret)`). Secret variables do **not** auto-expand into a task's *Arguments*
field — that's the #1 cause of an "empty credentials" failure.

## The slot model & "AwaitingVerification"

Even Integration deploys via a **staging slot**: DXP builds the container image, deploys to
the slot, **warms it up** (sends HTTP requests), and only then is the code live. A deploy
can reach `PercentComplete=100` and still be sitting on the slot **awaiting verification**
if warmup didn't get a healthy response.

> Watch out: a naive deploy script that treats `AwaitingVerification` as success will turn
> the **pipeline green even though the app is returning 503 on the slot**. Trust the slot's
> HTTP response, not just the pipeline checkmark.

## First-boot failures (restored-DB upgrades)

When the target slot has a **restored copy of an older (CMS 12-era) production database**,
the app crash-loops on first boot and warmup returns **503**. Pull the real exception from
the **DXP log stream** (PaaS portal) or **Application Insights** — the 503 page itself shows
no stack (detailed errors are off outside `Development`).

| Symptom in the log | Cause | Fix |
|---|---|---|
| `InvalidOperationException: The compatibility level for the database is unsupported. It is 130 but must be at least 140.` | Restored DB is at SQL compat level 130 (SQL 2016); CMS 13 needs ≥ 140. | Set `UpdateDatabaseCompatibilityLevel = true` on `DataAccessOptions` (`services.Configure<DataAccessOptions>(o => { o.UpdateDatabaseSchema = true; o.UpdateDatabaseCompatibilityLevel = true; })`). The app raises the level itself on next boot — the DXP SQL user is `db_owner`. |
| `EPiServerException: Content type 'SysContentFolder' is not allowed to be created under parent of content type 'SysRoot'` (thrown by `BlueprintInitialization.InitializeBlueprintContentRoot`). The `TaskCanceledException` in `WarmupHostedService` underneath it is just fallout of the host tearing down. | The prod DB has a persisted "available content types" whitelist on `SysRoot` (often from a custom init module that calls `IAvailableSettingsRepository.RegisterSetting`, or an admin-UI setting). **CMS 13 now enforces that whitelist even for its OWN system root registration** (CMS 12 didn't). The whitelist excludes `SysContentFolder`, so CMS blocks itself and aborts (exit 134). It's persisted **data**, stored in `tblContentTypeToContentType` (rows where `fkContentTypeParentID` = SysRoot's pkID) — so disabling the code module does **not** clear it, and you usually can't reach the DXP SQL externally (firewall). | Clear SysRoot's availability rows **before CMS init**, from *inside* the app (the container can reach the DB). In `Program.cs`, between `Build()` and `Run()`, run `DELETE FROM tblContentTypeToContentType WHERE fkContentTypeParentID = (SELECT pkID FROM tblContentType WHERE Name='SysRoot')` via a raw `Microsoft.Data.SqlClient` connection using the `EPiServerDB` connection string. Idempotent, guarded, runs before `BlueprintInitialization`. (Init modules run *after* blueprint, so they can't fix it.) |
| Site returns 503 / wrong site / "no site" even after a clean boot | The restored DB carries **production hostnames** in its site definitions. If `EnvironmentSynchronizer` isn't an active package in CMS 13, nothing rewrites them per-environment. | Log in via `…dxcloud.episerver.net/util/login` (local admin account — SAML ReturnUrl points at the prod host and won't work via the slot URL), then Admin → **Manage Websites** → add the `…inte.dxcloud.episerver.net` host to the correct site definition. |
| Search returns nothing | Optimizely Graph index for the new env is empty. | Run the **"Content Graph Full Re-index"** scheduled job. Note: **DXP injects its own ContentGraph keys** (lowercase `optimizely:contentgraph:*`) as env vars that override your appsettings keys — so each DXP env has its **own isolated index** (re-indexing one env won't touch another). |

### What DXP injects at runtime (don't hardcode these)

The DXP container sets, as environment variables: `ConnectionStrings:EPiServerDB`,
`EPiServerAzureBlobs`, `EPiServerAzureEvents`, `EPiServer:KeyVaultUri`,
`EPiServer:LicenseKey`, and its own `optimizely:contentgraph:*` keys. Keep these **out** of
committed `appsettings` for cloud environments — DXP provides them, and the
`EPiServer.CloudPlatform.Cms` package consumes them. (`ASPNETCORE_ENVIRONMENT` is set to
the environment name, e.g. `Integration`, so `appsettings.Integration.json` loads
automatically.) You may also see leftover `EPiServer:Find:*` env vars injected even on a
Find-free CMS 13 site — harmless, just unused.

## Reading the *real* startup error (the deployment log won't have it)

This is the single biggest time-saver. When the slot 503s, the **DXP deployment log**
(portal job view, "Get Detailed Log", the emailed CSV) only ever shows DXP's own health
probe getting a 503 — it **never** contains the app's exception. The actual stack lives in
the **App Service console log**, which DXP archives to blob storage.

- The env var `DIAGNOSTICS_AZUREBLOBCONTAINERSASURL` (visible in the container's
  `==== CONFIGURATION ====` dump on boot) is a long-lived SAS URL to the
  `insights-logs-appserviceconsolelogs` container.
- Blobs are hourly: `…/SITES/<app>/SLOTS/SLOT/y=YYYY/m=MM/d=DD/h=HH/m=00/PT1H.json`.
- Each line is a JSON record; the log text is in the `resultDescription` field with `\r\n`
  escapes. Fetch the boot hour, pull `resultDescription`, decode the escapes → full stack.

Tell the two logs apart at a glance:

| Looks like… | It's the… | Has the exception? |
|---|---|---|
| `::PROGRESS:: PercentComplete=…`, `/episerver/health … 503` | Deployment log | ❌ never |
| `==== CONFIGURATION START ====`, then `fail:` / `Unhandled exception` / `at …` | **App console log** | ✅ this one |

> The app crash-loops, so the console-log blob keeps re-printing the boot + exception.
> If it looks idle, hit the slot URL (below) to trigger a fresh boot, then re-fetch.

## After it boots: NREs from restored content

Getting the app to **start** is a different milestone from getting pages to **render**.
Once it boots, expect a run of `NullReferenceException`s while rendering, because the
restored production content references items that don't resolve cleanly in the new
environment, and the views weren't written to handle "came back empty" (they never had to
in prod). Typical:

```
NullReferenceException
   at …Views/Shared/Components/<Block>/Default.cshtml:line N
```

- Root pattern: `item.LoadContent()` returns **null** for an orphaned/unpublished
  reference, then the code dereferences `.Property[...]` on it.
- `LoadContent()` results consumed via `x as SomeType` / `x is SomeType` are null-safe;
  direct `.Property[...]` access is **not** — guard those (`if (x == null) continue;`).
- It "moves" line to line (109 → 158 → next file) because the same unguarded pattern
  repeats — fix all occurrences in a view/component in one pass instead of per-deploy.
- Read the **console log** (above) to get the exact `file:line` for each one.

These are normal "harden the views against real data" fixes, not infrastructure problems.

### Add-ons still built for CMS 12 (MissingMethodException)

A package can **boot fine** on CMS 13 yet throw on a specific runtime path, because it was
compiled against CMS 12 assemblies. The signature is a `MissingMethodException` naming a
method whose signature changed between 12 and 13. Real example:

```
System.MissingMethodException: Method not found:
'EPiServer.Core.PageReference EPiServer.Core.PageData.get_ParentLink()'
   at Geta.NotFoundHandler.Optimizely.Core.AutomaticRedirects.CmsContentUrlProvider.GetPageUrl(...)
   at ...AutomaticRedirects.ContentUrlHistoryEvents.OnPublishedContent(...)   ← fires on every Publish
```

- Here `Geta.NotFoundHandler.Optimizely 6.0.0` is the **CMS 12** build; CMS 13 changed
  `PageData.ParentLink` (was `PageReference`). Every content **Publish** crashed.
- **Stopgap:** disable the offending feature (`AutomaticRedirectsEnabled = false`).
- **Proper fix:** upgrade to the CMS 13 build (`7.0.0`, targets net10.0, deps
  `EPiServer.CMS.UI.Core 13.1.0`). Note a package's CMS 13 build often pulls a newer
  EPiServer minor (13.0.x → 13.1.x), so treat it as a coordinated bump, not a hotfix.
- Lesson: after upgrading, **exercise content events** (publish/move/delete), not just page
  loads — that's where CMS-12-era add-ons surface. Check each add-on has a CMS 13 build.

## Going live: staging slot → Complete, and getting into the CMS

A DXP deploy lands on a **staging slot** and waits at *AwaitingVerification*. Until you
**Complete** it, the public URL still serves the DXP placeholder
("Welcome! Your environment is provisioned", served by nginx — and `/util/login` 404s
there). Your deployed app is on the slot.

- **See the app on the slot:** append `?x-ms-routing-name=slot` to any URL, e.g.
  `https://<env>.dxcloud.episerver.net/?x-ms-routing-name=slot`.
- **Go live:** PaaS portal → Deployments → the *AwaitingVerification* deployment →
  **Complete deployment** (swaps slot → live). Or `Complete-EpiDeployment -Id <id>` in
  EpiCloud. A hand-rolled EpiCloud script that stops at `Start-EpiDeployment` never goes
  live — add the Complete step (the Optimizely DXP marketplace extension has it as a
  separate "Complete deploy" task).

**Getting into the editor after go-live:**

- The on-page **quick-navigator "Opti" edit button was removed in CMS 13**
  (`RenderEPiServerQuickNavigatorAsync` is gone). Don't wait for a floating button on the
  front end — navigate to the editor by URL. **In CMS 13 the editor moved from `/episerver`
  to `/Optimizely`**: use **`/Optimizely/CMS/`** (or `/Optimizely`). Hitting `/episerver`
  now falls through to content routing and renders the site's **custom 404** — a giveaway
  you're on the old path.
- If `/util/login` authenticates but the CMS won't open, check: (a) the account is in a
  CMS edit role (e.g. `WebAdmins`/`Administrators` per the site's role mappings); (b) the
  app's **default auth scheme**. Sites that set `AddAuthentication(Saml2Defaults.Scheme)`
  challenge unauthenticated CMS access via SAML/Azure AD — which is configured for the
  *production* host, so it can't complete on the `dxcloud` host. Local AspNet Identity
  accounts (`/util/login`) still authenticate, but confirm the cookie identity carries the
  edit role.

## Quick checklist for the next upgrade

- [ ] csproj TFM matches what the build/publish tasks pass (or drop `--framework`)
- [ ] Package name has `.cms.app.`; assemblies at package **root**
- [ ] DXP API creds in a Variable Group; secret mapped via task **Environment Variables**
- [ ] `UpdateDatabaseCompatibilityLevel = true` if deploying onto a restored older DB
- [ ] Restored DB? Pre-clear the `SysRoot` availability whitelist before CMS init (Program.cs)
- [ ] When a slot 503s, read the **App Service console-log blob** for the real exception — not the deployment log
- [ ] After boot, harden views against null `LoadContent()` from orphaned content refs
- [ ] **Complete** the deployment to go live (slot → live); verify on `?x-ms-routing-name=slot` first
- [ ] Editor is at `/Optimizely/CMS/` in CMS 13 (not `/episerver`); no on-page Opti button; confirm login account has a CMS role
- [ ] After go-live: fix host bindings in admin if needed, then run Graph re-index
- [ ] Don't trust a green pipeline — confirm the slot serves 200

## Related

- [[debugging-dxp|Debugging in Optimizely DXP]]
- [[dotnet-compatibility|.NET / CMS 13 compatibility]]
