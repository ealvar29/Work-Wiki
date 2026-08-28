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

## Provisioning a BRAND-NEW environment (empty DB) — the opposite failure mode

Everything above assumes the target has a **restored** database. Standing up Preproduction or
Production for the first time is the mirror image: the DB is **empty**, and a different class of
bug surfaces. Do not assume a working Integration means a new environment will boot.

Optimizely support will tell you *"PREP and PROD are provisioned automatically when you deploy
code to them."* That is **true about the environment and false about the application.**

### Two-pass provisioning is unavoidable

```
environment does not exist   ->  cannot set its app settings
        v
deploy to create it          ->  app boots with NO configuration (and may crash)
        v
now set app settings         ->  DXP applies them only ON DEPLOY
        v
deploy AGAIN                 ->  finally healthy
```

Worse, on at least one project the PaaS portal **did not list the new environment in the
app-settings dropdown until a deployment had reached a terminal state**. If your app has
*mandatory* startup configuration, that is a genuine circular dependency: the deploy can't
succeed without settings, and settings can't be added without a completed deploy.

> **Budget two deploys minimum per new environment, and check early whether your app can boot
> with zero configuration.** If it can't, either make the hard dependency tolerant of absence or
> ship a placeholder in `appsettings.<Env>.json` that a real app setting overrides on the next
> deploy.

### 🔴 NEVER auto-complete (auto-swap) a first deploy to a virgin environment

The slot swap gates on the new app answering an **HTTP ping**. On a virgin environment nothing
has ever booted, so if the app crashes the swap can never succeed — and DXP *retries it*:

```
Timed out waiting for all instances for webapp <app> and slot "slot" to become ready!
Cannot swap site slots for site '<app>' because the 'slot' slot did not respond to http ping.
Swap failed! Verification value of slot 'Production': 01/01/0001 00:00:00.  Will retry up to 4 times more.
```

That `01/01/0001` is the tell — the production slot has never run anything. Each retry took
**~22 minutes**, so one doomed deploy burned ~90 minutes and produced no diagnostic information
that the first two minutes hadn't already given.

Pass `-Complete $false` (or your pipeline's equivalent) so the deploy parks at
`AwaitingVerification`. Completing later is one portal click. Only go back to auto-complete once
you have seen *that app* boot on *that environment* at least once.

### Latent bugs that only an empty database can find

This is the real payoff of provisioning early. Legacy startup code that "works everywhere" often
works only because **every environment's DB was restored from the same legacy database**. Nobody
wrote that precondition down, so it was never tested.

Real example — a leftover ASP.NET Identity migration module, dead since the site moved to Opti ID:

```sql
IF COL_LENGTH('dbo.AspNetUserLogins', 'ProviderDisplayName') IS NULL   -- guards the COLUMN
BEGIN
    ALTER TABLE [dbo].AspNetUserLogins ADD ProviderDisplayName varchar(255) null
END
```

> **`COL_LENGTH` returns `NULL` when the *table* doesn't exist, not only when the column
> doesn't.** On a DB with no `AspNetUserLogins` at all the guard *passes* and the `ALTER TABLE`
> runs against nothing → `SqlException` **error 4902** → the init module throws →
> `Hosting failed to start`, crash-looping (24 cycles observed) so warmup never answers.

The generic form: **guard on the object you are about to touch, not on a property of it.**
`IF OBJECT_ID('dbo.X','U') IS NOT NULL AND COL_LENGTH(...) IS NULL`.

### The same assumption, two blast radii — wrap legacy data repairs in try/catch

On the same boot, a *second* module hit the identical root cause (`Invalid object name
'tblContentTypeToContentType'` — the SysRoot repair from the section above, running against a DB
where CMS hadn't created its schema yet). It did **not** take the app down, for one reason:

```csharp
catch (Exception ex)
{
    // Never block application startup on this repair.
    logger.LogError(ex, "...failed to clear SysRoot availability rows.");
}
```

> Two modules, the same unwritten assumption, wildly different outcomes — purely because one
> wrapped its repair in a try/catch and the other didn't. **A startup data-repair for legacy DB
> state must never be fatal:** by definition it is fixing something that may already be absent.

Audit every custom `IInitializableModule` that runs raw SQL before standing up a fresh
environment. Cheaper than a 40-minute deploy cycle each time.

### Per-environment credentials DXP injects (the list is longer than Graph)

Beyond the `ContentGraph` keys noted above, **Opti ID credentials are also DXP-injected per
environment on deployment**:

```
EPiServer__Cms__OptimizelyIdentity__{InstanceId, ClientId, ClientSecret}
```

Per Optimizely's CMS 13 Opti ID documentation: *"The system automatically provides these settings
when the application is deployed to DXP"*, and *"You can only use keys from the integration
environment locally."* So don't hand-manage them — but note two traps:

1. **Injected values only reach the app on a NEW DEPLOYMENT.** Provisioning or rotating a service
   writes new keys into DXP's settings; the running app keeps the old ones until you deploy. One
   project lost two days to this, concluding an account was broken when a deploy would have fixed
   it. Portal shows keys ≠ app has keys.
2. **Anything that hardcodes an InstanceId will silently diverge.** A fail-closed instance gate
   written as a literal (`o.RequiredCmsInstanceId = "abc123…"`) matches Integration and then
   refuses writes on every other environment, while reads keep working — a confusing half-broken
   state. Read it from config so it is right everywhere:
   `_configuration["EPiServer:Cms:OptimizelyIdentity:InstanceId"]`.

Also: the **Opti ID Enabled** toggle in Admin Center **cannot be unchecked after activation**.
Don't click it exploratively on anything production-adjacent.

### `appsettings.<Env>.json` for environments you have never deployed is probably a lie

If a codebase was forked or split from a sibling project, the `Preproduction` and `Production`
config files may never have been exercised. On one split project the Preproduction file still
carried the **sibling project's DXP slot hostname**, the sibling's public hosts, its
Application Insights connection string (so telemetry would land in another client's resource),
site GUIDs transposed between two different sites, and one GUID for a site that did not exist in
the database at all.

None of it was noticed because Integration's file had been updated and Preproduction's had never
been loaded by a running app. **Diff every per-environment config file against the live DB before
first deploy, and trust `tblSiteDefinition` / `tblHostDefinition` over the config.**

### EnvironmentSynchronizer is a WRITE on boot, not a read

With `RunInitializationModuleEveryStartup: true` it rewrites site/host bindings into the database
on **every** restart. Combined with a stale config file (above), the first boot of a new
environment scribbles the wrong hostnames into a brand-new DB — and re-does it after every
recycle, so hostnames configured by hand lose on the next restart.

```jsonc
"EnvironmentSynchronizer": {
  "RunAsInitializationModule": false,   // boot the new environment INERT
```

`RunAsInitializationModule: false` is a real option in the 2.0.x assembly and is the way to
provision an environment without letting config mutate its database. Turn it on only once the
hosts and site GUIDs are known-correct. Verify by querying `tblHostDefinition` after boot —
zero unexpected rows means it held.

### Pipeline guard rails worth adding before you own three environments

One pipeline definition with a runtime `targetEnvironment` parameter beats cloning it per
environment (clones drift, and duplicate definitions cause double-builds). Guards that earned
their keep:

- Block a **manual** run targeting the CI-triggered environment — the push already deploys it, so
  queueing by hand double-deploys.
- Block an **automatic** trigger targeting Preproduction/Production, so no push can ever reach
  production.
- **Assert the invariant, not the branch name.** "Prepro/prod must come from the upgrade branch"
  goes stale the moment that branch merges to `main`/`master`. Assert what you actually care
  about instead — that the code *is* the new major version:
  ```powershell
  if ((Get-Content 'Web/Web.csproj' -Raw) -notmatch 'EPiServer\.Cms"\s+Version="13\.') { throw }
  ```
  On a mid-upgrade repo the default branch is still the OLD CMS version, so deploying it to a
  fresh environment would initialise the wrong schema. This guard is the one that catches it.
- Require a typed confirmation for Production. ⚠ In Azure DevOps a `string` runtime parameter
  with `default: ''` renders as a **required** field — there is no `optional: true` — so an empty
  default silently blocks *every* run of the pipeline, not just production ones. Give it a
  non-empty inert default like `'no'`.

## Patch-bumping the CMS package family (13.1.0 → 13.1.1 etc.)

Two things bite here, and both look fine locally.

### 🔴 CMS schema upgrades are ONE-WAY — this is a rollback constraint

Boot a newer CMS against a database and it migrates the schema. Older assemblies then **refuse to start** against it:

```
System.NotSupportedException: The assemblies for 'CMS' have not been updated to work with
the current database version '21003.0'. Supported database version is '21002.0'.
Make sure the NuGet packages are updated and build the solution.
```

That was 13.1.0 failing against a database a 13.1.1 build had already touched. So:

> **Deploying a CMS patch bump migrates the database. Reverting the package alone will not roll you back — you need a database restore.** Plan the rollback position before you deploy, not after. Applies to every CMS version bump, not just major ones.

Useful corollary when diagnosing a local boot failure after a bump: if the *older* build fails and the *newer* one succeeds, the schema has already moved and the newer build is the correct one.

### 🟠 `modules/_protected/*.zip` are tracked and version-coupled

`modules/_protected/CMS/CMS.zip` and `Shell/Shell.zip` hold the shell's **client resources** and are regenerated by the build from the NuGet packages. On many solutions they are also **committed to git**.

Bumping the packages without committing the regenerated zips deploys **new assemblies against old shell resources** — a skew that is easy to miss because the build rewrites them on disk, so it always works on the developer's machine.

```
CMS.zip    15,117,764 -> 15,125,339 bytes   (13.1.0 -> 13.1.1)
```

Check `git status` for them after any CMS package bump. Note a `.gitignore` rule may cover `modules/_protected` while the files are *already tracked* — gitignore does not untrack, so they will still show as modified and must still be committed.

### Keep the family locked to a version they all share

Find the highest version where **every** package in the family is published, not the highest that exists for any one of them. On one 13.1.x bump, `Optimizely.Cms.Opal.Tools` stopped at **13.1.1** while the rest had 13.1.2 — so 13.1.1 was the ceiling. Mixing versions across the family is a known cause of boot-time type-load crashes.

```bash
# per package, list the published 13.1.x versions before choosing a target
curl -s "https://nuget.optimizely.com/feed/packages.svc/FindPackagesById()?id='EPiServer.Cms'&\$select=Version" \
  | grep -oE '<d:Version>[^<]+' | sed 's/<d:Version>//' | grep '^13\.1\.' | sort -V
```

And **check the feed for a released fix before building a workaround.** One `/ui/null` editor bug cost four commits of custom code; it was `CMS-51887`, already fixed one patch version ahead.

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

### Absolute URLs point at production (images, search, links)

After a prod-DB restore you'll see media, search, and links resolve to the **production
domain** — `<img src="https://www.oxy.com/siteassets/...">`, the search box submitting to
`www.oxy.com/...`, etc. One root cause behind all of them: the CMS **site definitions still
carry production hostnames as the Primary host** (they came over in the database). So
Optimizely's URL resolver (`IUrlResolver.GetUrl` / `Url.ContentUrl`) emits **absolute prod
URLs** for any content it treats as belonging to that (prod-hosted) site.

Where it shows up:
- **Images** render as `https://www.oxy.com/siteassets/...` (and are then *also* blocked by
  CSP if the prod host isn't in `img-src` — see the CSP note above).
- **Search** navigates to `www.oxy.com` (the search-page URL is built from `ContentUrl`).
- Any link built via `ContentUrl` / an absolute URL helper.

The fix is **per-environment host configuration**, not code:
- Set the environment's own host as the site's **Primary** — the `dxcloud` host for
  slot/URL testing, or the `int.*` host once DNS + DXP custom domains exist. With the
  current request's host primary on the same site, `ContentUrl` returns **relative** URLs
  and everything stays on the environment.
- **Automate it with `Addon.Episerver.EnvironmentSynchronizer`** (needs the CMS 13 build,
  2.0.1+): it applies per-environment site/host definitions from `appsettings.<Env>.json`
  on startup, so you don't hand-edit hosts after every restored DB. This single add-on
  fixes images, search, links, **and** the manual host-binding chore at once.
- Caveat: whichever host you make Primary must actually resolve (DNS / custom domain), or
  the URLs just point somewhere unreachable instead of prod.

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
  front end — navigate to the editor by URL. **The editor path moved in CMS 13, and again on
  Shell 13.1.x**: `/episerver/cms/` → `/Optimizely/CMS/` → **`/ui/cms`**. Read the Shell module
  registration in your startup log (`ShellModule Name='Shell' RouteBasePath='ui/'`) — that
  prefix is authoritative. A stale path falls through to content routing and renders the site's
  **custom 404** (or silently redirects to the home page) — the giveaway you're on the old path,
  and the reason this so often gets misdiagnosed as a login failure.
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
- [ ] Editor loads at the Shell `RouteBasePath` — `/Optimizely/CMS/`, or `/ui/cms` on Shell 13.1.x / Opti ID (not `/episerver`); no on-page Opti button; confirm login account has a CMS role
- [ ] After go-live: fix host bindings in admin if needed, then run Graph re-index
- [ ] Don't trust a green pipeline — confirm the slot serves 200

## Related

- [[debugging-dxp|Debugging in Optimizely DXP]]
- [[dotnet-compatibility|.NET / CMS 13 compatibility]]
