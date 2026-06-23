---
title: "XhtmlString Fields Rendering as Plain Text: Pipeline .NET SDK Mismatch"
tags:
  - optimizely
  - cms
  - tinymce
  - xhtmlstring
  - pipeline
  - dotnet
  - azure-devops
---

XhtmlString fields stop initializing TinyMCE in the edit UI — editors see a plain text box instead of a rich text editor. The issue only appears in deployed environments (DXP, staging), not local dev. No obvious errors in the browser console pointing to TinyMCE directly.

**Root cause:** the Azure DevOps build pipeline is using a newer .NET SDK than the project targets. The `windows-latest` hosted agent ships with multiple SDK versions installed; without an explicit pin, `dotnet publish` defaults to the newest available — which can produce a malformed `.deps.json` that breaks the Optimizely UI framework.

This happened on VHB: pipelines were updated to .NET 10 SDK while the site was still targeting .NET 6. All XhtmlString properties across the site turned into text fields in production.

## Symptoms

- XhtmlString properties render as plain `<textarea>` instead of TinyMCE in edit mode
- Issue is environment-specific — works locally, broken in deployed build
- `.deps.json` contains unexpected `compileOnly` entries or reference assembly references
- `dotnet --info` in the pipeline shows a different SDK version than expected

## Diagnosis

Add this step to your pipeline to confirm which SDK is running:

```yaml
- script: dotnet --info
  displayName: "Show .NET SDK info"
```

If the SDK version doesn't match what the project targets (.NET 6, 8, etc.), that's your problem.

## Fix

### 1. Pin the SDK in the pipeline

Add a `UseDotNet@2` task before any restore/build/publish steps:

```yaml
- task: UseDotNet@2
  displayName: "Use .NET 8 SDK"
  inputs:
    packageType: 'sdk'
    version: '8.0.x'
```

Adjust the version to match what the project actually targets.

### 2. Lock the SDK with global.json (recommended)

Add a `global.json` at the project root to enforce the same SDK version locally and in CI:

```json
{
  "sdk": {
    "version": "8.0.403",
    "rollForward": "disable"
  }
}
```

`rollForward: disable` prevents accidental upgrades. This protects against the pipeline agent getting a new SDK preinstalled in a future image update.

## Why This Happens

Microsoft periodically updates the `windows-latest` agent image with new SDK versions. Any pipeline that doesn't explicitly pin a version will silently start using the newest available SDK on the next build. For Optimizely CMS projects targeting older .NET versions, this can corrupt the published output in ways that only manifest at runtime in the UI layer.

## Sources

- Francisco Quintanilla — [Fixing TinyMCE Initialization Failures in Optimizely CMS: A Hidden Pipeline Issue with .NET SDK Versions](https://powerbuilder.home.blog/2025/12/08/fixing-tinymce-initialization-failures-in-optimizely-cms-a-hidden-pipeline-issue-with-net-sdk-versions/) (December 8, 2025)
