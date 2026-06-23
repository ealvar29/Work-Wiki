---
title: "CMS Gotchas"
tags:
  - optimizely
  - cms
  - gotchas
---

Unexpected platform and infrastructure changes that break CMS sites — not tied to a specific version upgrade.

## Pipeline & Build

- [[xhtmlstring-pipeline-sdk-version|XhtmlString Fields Rendering as Plain Text]] — Azure DevOps `windows-latest` agent ships new .NET SDK, breaks TinyMCE initialization
