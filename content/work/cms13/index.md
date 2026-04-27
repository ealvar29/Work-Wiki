---
title: Optimizely CMS 13
tags:
  - optimizely
  - cms
  - dotnet
---

# Optimizely CMS 13

Optimizely CMS 13 is the latest major version of the Optimizely Content Management System (formerly Episerver). It targets .NET 10 and introduces significant architectural changes over CMS 12.

## Key Changes from CMS 12

- Built on **.NET 10**
- **Optimizely Graph** replaces Search & Navigation (mandatory)
- **Visual Builder** is the new default editing experience
- **Applications model** replaces SiteDefinition
- **Opti ID** for SSO, MFA, and DAM integration
- **REST API v1** — production-stable, backward-compatible management API

## Platform Fundamentals

- [[what-is-cms13|What is CMS 13?]]
- [[dotnet-compatibility|.NET Compatibility]]
- [[visual-builder|Visual Builder]]
- [[applications-model|Applications Model]] — replaces SiteDefinition

## Upgrading

- [[upgrading-from-cms12|Upgrading from CMS 12]]
- [[upgrade-checklist|Upgrade Checklist]] — consolidated step-by-step
- [[breaking-changes|Breaking Changes]] — full catalog
- [[cms12-to-cms13-case-study|CMS 12 → 13 Case Study]] — real-world walkthrough, Find→Graph patterns, NuGet pitfalls
- [[ai-assisted-upgrade|AI-Assisted Upgrades]] — using Claude Code to speed up migration

## APIs & Development

- [[graph-sdk|Graph C# SDK]] — replaces Search & Navigation fluent API
- [[search-to-graph|Search & Navigation → Graph Migration]]
- [[cms-rest-api|CMS REST API v1]]
- [[custom-property-editors|Custom Property Editors]] — ES6 modules, no Dojo required
- [[custom-admin-tools|Building Custom Admin Tools]]
- [[removing-unused-properties|Removing Unused Properties]]

## Operations

- [[translations|Translations & Localization]]
- [[debugging-dxp|Debugging in DXP]]
- [[ai-assistant|AI Assistant v4]]

## Reference

- [[cms13-resources|Resources & Links]]

## Sources to Watch

| Source | URL | What to look for |
|---|---|---|
| Optimizely World | world.optimizely.com | Community Q&A, upgrade guides |
| Optimizely Blog | optimizely.com/blog | Official announcements |
| Official Docs | docs.developers.optimizely.com | API reference, breaking changes |
| LinkedIn | linkedin.com | Posts from Optimizely MVPs and partners |
| GitHub | github.com/episerver | Source code, changelogs, issues |
