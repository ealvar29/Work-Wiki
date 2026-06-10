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

## Start Here

- [[world-tour-2026-briefing|CMS 13 World Tour 2026 — Team Briefing]] — distilled takeaways from the May 2026 accreditation event: upgrade path, new features, gotchas, deployment models
- [[upgrade-accelerator|CMS 13 Upgrade Accelerator]] — phase-by-phase workflow, client readiness checklist, Claude branch setup, go/no-go criteria
- [[world-tour-2026|CMS 13 World Tour 2026 Notes]] — full technical accreditation notes: Visual Builder, Opal, Graph, OCP, DAM, upgrade path, breaking changes

## Platform Fundamentals

- [[what-is-cms13|What is CMS 13?]]
- [[dotnet-compatibility|.NET Compatibility]]
- [[visual-builder|Visual Builder]]
- [[applications-model|Applications Model]] — replaces SiteDefinition

## Upgrading

- [[upgrading-from-cms12|Upgrading from CMS 12]]
- [[upgrade-checklist|Upgrade Checklist]] — consolidated step-by-step
- [[breaking-changes|Breaking Changes]] — full catalog
- [[ivalidate-breaking-change|Breaking Change: IValidate\<T\>]] — validators no longer auto-discovered, must register via `AddCmsValidator<T>()`
- [[post-upgrade-gotchas|Post-Upgrade Gotchas]] — 14 real gotchas from the field: namespace cascades, Find extensions, Geta scanner crash + stale-DB-job crash, cookie policy, AutoMapper null ref, Graph SDK package rename + dual DI registration, and more
- [[extension-migration|Migrating a CMS Extension]] — upgrading reusable packages and add-ons to CMS 13
- [[multisite-plugin-cms13|Multi-Site Plugin v2]] — display name → normalized app identity breaking change
- [[cms12-to-cms13-case-study|CMS 12 → 13 Case Study]] — real-world walkthrough, Find→Graph patterns, NuGet pitfalls
- [[ai-assisted-upgrade|AI-Assisted Upgrades]] — using Claude Code to speed up migration; see also [[upgrade-assistant-mcp|Upgrade Assistant MCP]] in Jaxon Tools
- [[agent-quickstart|AI Agent Quickstart]] — one-stop brief for AI agents starting a CMS 12 → 13 upgrade: phases, ordered steps, gotcha list, vendor-blocked items, verification checklist
- [[cms13-technical-qa|CMS 13 Technical Q&A]] — upgrade paths, Graph, DAM, Opal, Commerce 15, frontend options

## APIs & Development

- [[graph-sdk|Graph C# SDK]] — replaces Search & Navigation fluent API
- [[search-to-graph|Search & Navigation → Graph Migration]]
- [[cms-rest-api|CMS REST API v1]]
- [[custom-property-editors|Custom Property Editors]] — ES6 modules, no Dojo required
- [[dam-integration|DAM Integration]] — Embedded DAM via External Sources/Graph, asset picker, direct-CDN delivery, video, first-time media migration
- [[custom-admin-tools|Building Custom Admin Tools]]
- [[removing-unused-properties|Removing Unused Properties]]

## Operations

- [[translations|Translations & Localization]]
- [[debugging-dxp|Debugging in DXP]]
- [[ai-assistant|AI Assistant v4]]
- [[geo-analytics|GEO Analytics]] — AI crawler traffic dashboard; track which AI agents index your site and whether crawls become referrals (PaaS only)

## Quick Reference

- [[cms12-to-cms13-cheatsheet|CMS 12 → 13 Code Cheatsheet]] — before/after patterns, package renames, namespace changes

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
