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

## Quick checklist for the next upgrade

- [ ] csproj TFM matches what the build/publish tasks pass (or drop `--framework`)
- [ ] Package name has `.cms.app.`; assemblies at package **root**
- [ ] DXP API creds in a Variable Group; secret mapped via task **Environment Variables**
- [ ] `UpdateDatabaseCompatibilityLevel = true` if deploying onto a restored older DB
- [ ] After first boot: fix host bindings in admin, then run Graph re-index
- [ ] Don't trust a green pipeline — confirm the slot serves 200

## Related

- [[debugging-dxp|Debugging in Optimizely DXP]]
- [[dotnet-compatibility|.NET / CMS 13 compatibility]]
