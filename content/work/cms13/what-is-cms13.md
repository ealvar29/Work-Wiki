---
title: What is Optimizely CMS 13?
tags:
  - optimizely
  - cms
  - fundamentals
---

# What is Optimizely CMS 13?

Optimizely CMS 13 is a major release of the Optimizely (formerly Episerver) content management platform. It is a server-side rendered and headless-capable CMS built on the modern .NET ecosystem.

## The Platform Stack

- **Runtime:** .NET 10 (GA target — see [[dotnet-compatibility|.NET Compatibility]] for .NET 8/11 details)
- **Language:** C# 13
- **Database:** SQL Server 2022 / Azure SQL (compatibility level 140+)
- **Frontend:** Razor Pages / MVC on the server side; headless delivery via Optimizely Graph or Content Delivery API for decoupled frontends (React, Next.js, etc.)
- **Identity:** Opti ID (SSO, MFA, SCIM) — replaces per-product login
- **Search/Indexing:** Optimizely Graph — mandatory, replaces Search & Navigation

## Why It Matters

CMS 12 → CMS 13 is not just a version bump. It is a platform modernization:
- Retargeted from .NET 6/8 to **.NET 10** — aligns with Microsoft's latest LTS
- **Optimizely Graph** is now the content delivery layer (Search & Navigation removed)
- **Visual Builder** replaces On-Page Editing as the default editor
- **Applications model** replaces SiteDefinition throughout
- Better performance, better tooling, cloud-native by design

## Related Pages

- [[index|Back to CMS 13 Overview]]
- [[cms13-resources|Resources & Links]]
