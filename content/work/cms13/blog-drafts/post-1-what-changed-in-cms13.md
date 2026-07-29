# What Actually Changed in CMS 13 (Beyond the Marketing)

*By Eduardo Alvarez, Jaxon Digital*

---

Optimizely CMS 13 launched in March 2026 and the announcement came with the usual fanfare — Visual Builder, AI tools, new architecture. If you read the release notes, you already know the headline features. What's harder to find is a plain-language answer to the question every developer on a CMS 12 project eventually asks:

**What does this actually mean for my project?**

I recently led a full CMS 12 → CMS 13 upgrade for a production site, and this is the answer I wish I'd had before starting.

---

## The Platform Shift Is Real

The most important thing to understand about CMS 13 is that this isn't a point release. It's a generational upgrade — .NET 6 to .NET 10, a completely new editor shell, and the removal of several APIs that have existed in the EPiServer ecosystem for years.

That said, it's not as scary as it sounds. If your codebase is reasonably well-structured — constructor injection, interfaces over concrete types, no tight coupling to EPiServer internals — most of the work is mechanical. Compiler errors become your to-do list. You work through them systematically.

The projects that struggle are the ones with heavy ServiceLocator usage, tight Find integration, and Forms dependencies. Those take longer — not because the upgrade is hard, but because you're unwinding decisions made years ago.

---

## What's Actually New

### Visual Builder

This is the headliner and it's genuinely different. Visual Builder replaces On-Page Editing as the default content authoring experience. The model is Experience → Section → Row → Column → Element, giving editors a structured drag-and-drop canvas rather than the old inline editing overlay.

On-Page Editing still exists — it's just disabled by default. You can re-enable it with a feature flag if editors need time to transition. But Visual Builder is clearly where Optimizely is investing, and for most editorial teams it's a significant UX improvement.

### Optimizely Graph (Replaces Find)

EPiServer Search & Navigation (Find) is gone. Fully removed, no CMS 13 version. The replacement is Optimizely Graph — a GraphQL-based content API that indexes and queries your content through the Content Delivery API layer.

The good news: Graph is more capable than Find was. The not-so-good news: as of this writing, the Graph SDK has a compatibility issue with CMS 13 that makes it impossible to add directly without breaking startup. The workaround is an `ISearchService` abstraction with a stub implementation, swapped for a real Graph implementation once a compatible SDK version ships. More on this in the field report post.

### Opal AI and OpalChat

Opal is Optimizely's AI platform — a suite of tools including OpalChat (AI-assisted content creation) and AI Translation. These sit on top of the new Opti ID identity layer and are available from within the editor. For content teams that do a lot of volume, these are genuinely useful. For developers, they're mostly transparent — they're add-on services, not something you wire up in Startup.cs.

### GEO Analytics

A new dashboard showing AI crawler traffic and visibility — essentially how well your content surfaces to AI search assistants. Production/PaaS only, requires Opti ID. Worth knowing it exists; not relevant to a local upgrade.

### Content Variations

Built-in A/B testing at the content level — create variations of a page or block and let Optimizely serve and measure them. Previously required third-party tools or Commerce integrations. Now it's in the core CMS.

### The Editor URL Changed

Small thing, huge gotcha. The CMS editor moved from `/episerver/cms/` to `/Optimizely/CMS/` — and then moved *again* on Shell 13.1.x, to `/ui/cms`. The old URLs return a hard 404 or silently redirect to your home page; neither redirects you to the right place, and both look convincingly like a broken login.

Don't trust any doc on this, including this one. Your startup log prints the answer: `ShellModule Name='Shell' RouteBasePath='ui/'`. That prefix is authoritative for your build. And if you have monitoring health checks, bookmarks, or redirect rules pointing at an old path, update them.

---

## What Didn't Change (And People Worry About)

- **`IPageRouteHelper`** — still exists, still works. Some pre-upgrade docs say to rename it to `IPageRouting`. That interface doesn't exist in CMS 13. Ignore that advice.
- **`ServiceLocator.Current.GetInstance<T>()`** — the static wrapper still works. `IServiceLocator` (the interface) is removed, but the static call is fine.
- **AutoMapper profiles** — if you use AutoMapper, the profile API is completely unchanged. The only catch is a CVE in versions 13.x that warrants an upgrade to 16.x, but your `CreateMap<>`, `ForMember`, `ITypeConverter` code doesn't need touching.
- **Sustainsys SAML2 / ASP.NET Identity** — untouched by the CMS upgrade itself. Auth migration is a separate engagement.

---

## The Honest Assessment

CMS 13 is a better platform than CMS 12. The editor experience is more modern, the architecture is cleaner, and .NET 10 brings real performance improvements. The upgrade is real work — expect a few days for a typical mid-size codebase — but it's manageable if you approach it in phases.

The hardest part isn't the code. It's knowing what to expect so you don't spend three hours debugging something that has a one-line fix once you know what you're looking at.

That's what the next two posts are about.

---

*Next: [We Upgraded a Real Client Site to CMS 13 — Here's What Actually Happened](post-2-field-report.md)*
