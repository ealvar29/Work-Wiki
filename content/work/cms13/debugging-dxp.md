---
title: Debugging in Optimizely DXP
tags:
  - optimizely
  - dxp
  - debugging
  - devops
---

# Debugging in Optimizely DXP

## The Short Answer

True remote debugging against a live DXP environment is **not a supported workflow**. The platform is a managed PaaS built on Azure App Service, and the infrastructure restrictions are intentional.

## What People Have Tried

The underlying Linux Azure App Service *technically* supports SSH access, which opens up:
- SSH tunneling via Azure CLI
- Attaching JetBrains Rider or Visual Studio to a running .NET process over SSH

In practice, this consistently breaks down because:

- **Bandwidth throttling** — file uploads for debugger tools stall mid-transfer; WebSocket connections drop
- **Permission limits** — traffic control tools fail due to missing Linux capabilities
- **Visual Studio** rejects SSH connections entirely with minimal error output
- **Connection instability** — even successful SSH sessions last seconds before terminating

## What Actually Works

| Approach | Reliability |
|---|---|
| Structured logging + Application Insights | High |
| Kudu log streaming | High |
| Local reproduction with production data export | High |
| SSH to Integration env (shell only) | Medium |
| Remote debugger attachment | Not viable |

## Practical Approach

Build your observability in from the start:

- Use `ILogger<T>` with named placeholders throughout (searchable in App Insights)
- Reproduce issues locally — DXP's integration environment can be cloned to local with a database export
- Add detailed exception logging at boundaries (API calls, content saves, scheduled jobs)
- Use Application Insights custom events/dimensions to track state that's hard to reproduce

Previous DXP versions had simpler remote debugging, but architectural changes to the managed platform removed that capability. Don't fight the platform — invest in logging instead.

## Sources

- [Mike — Remote Debugging in Optimizely DXP: What Is Actually Possible?](https://world.optimizely.com/blogs/mike/dates/2026/4/remote-debugging-in-optimizely-dxp-what-is-actually-possible-/) *(Apr 2026)*
