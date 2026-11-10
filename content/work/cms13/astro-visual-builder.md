---
title: "Visual Builder with Astro (no Next.js)"
tags:
  - optimizely
  - cms
  - visual-builder
  - headless
  - graph
  - dxp
---

Astro can render Visual Builder content on CMS 13 PaaS, but it is **not a drop-in replacement for the Next.js integration**. The framework-neutral SDK gives you primitives; you supply the registry, preview route, request scope and routing yourself. Piotr Nowak's two-part field report is the only hands-on source found so far.

> *Verified against Part 1 and Part 2 (published 2026-10-29 and 2026-11-08), 2026-11-10. This is an experiment on a local Alloy CMS 13.4.2/13.5.0, **not DXP**. The SDK was a beta (`3.1.0-beta.0`) at the time.* Re-check the version:

```bash
npm view @optimizely/cms-sdk dist-tags
```

## What you need

| Requirement | Detail |
|---|---|
| CMS | CMS 13 PaaS with Graph, **13.4.2 or later** (13.4.1 fixes a culture-specific data-loss bug, CMS-57780; the 13.4.2 database update restores values lost before the fix) |
| SDK | `@optimizely/cms-sdk` and `@optimizely/cms-cli` pinned to exactly `3.1.0-beta.0`. At the time `latest` was 3.0.2, which exports neither `@optimizely/cms-sdk/core` nor `platform: 'paas'` |
| Node | Astro 7.4.2 needs **22.23.4+** (or 24/26). Optimizely's front-end hosting docs still say 22.12.0+ for Astro, a documentation mismatch |
| Hosting | Astro joined Next.js on DXP front-end hosting on 2026-08-31 |

## What Astro has to rebuild

1. **One component registry** for `.astro`, React and Svelte components, built with `ComponentRegistry` from `@optimizely/cms-sdk/core`. `planComposition()` and `resolveContentComponent()` replace the React-only `OptimizelyComposition`.
2. **Islands as static wrappers.** A dynamic `<Component />` cannot carry `client:*`, so each hydrated component is a small wrapper registered under its content type.
3. **A preview route** (`/preview`) that calls `getPreviewContent()` and reloads via `createContentSavedListener()`.
4. **A per-request scope.** See the gotcha below.
5. **Application host filtering** (`query: { host }`), otherwise a second application's start page can answer the same path.

```ts
config({
  graphUrl: OPTIMIZELY_GRAPH_GATEWAY,
  platform: 'paas',   // the SDK does not detect PaaS vs SaaS
  ...(OPTIMIZELY_APPLICATION_HOST ? { query: { host: OPTIMIZELY_APPLICATION_HOST } } : {}),
});
```

## Gotchas

| Symptom | Cause | Fix |
|---|---|---|
| `config push` says "The client credentials are invalid" | Without `OPTIMIZELY_CMS_API_URL` or `--host` the CLI asks the SaaS gateway (`api.cms.optimizely.com`) for a token | Set `OPTIMIZELY_CMS_API_URL=https://<cms-host>` |
| Push prints "Configuration file uploaded" then fails | TypeScript type reuses the key of a C# class; `source: "_server"` types are read-only in the REST API | Change the type in C#, or give the TS type its own key |
| `config push` 403 on start content | The OAuth client's token has `api:admin` but no roles; the start content is checked against the content ACL | Grant the client Read and Create on the root |
| `config pull` writes nothing | CLI 3.1.0-beta.0 needs a terminal; the fix (CMS-57658) was on `main`, not on npm | Run it in a terminal |
| Empty page, wrong site's start page | Several applications share a path | Set `query.host`, and `locale` so the start page is not at `/en/` |
| **`preview_token` appears in public HTML** | A configured `MemoryAdapter` read **outside** `run()` silently falls back to one process-wide store | Wrap every request: `onRequest = defineMiddleware((_c, next) => adapter.run(() => next()))` with an `AsyncLocalStorage` |
| Pages vanish from Graph after granting test rights | An explicit ACL with no inherited entries hides the page from the `SearchIndexer` role (full sync sent 80 items instead of 96) | Keep inherited entries and `SearchIndexer` read access |
| Hostname change not reflected in Graph | `_metadata.url.base` stays stale until pages are re-indexed | Run **Optimizely Graph Full Synchronization** |

Headless sites get **no inline editing**, only property overlays, per Optimizely's CMS 13 FAQ.

## Strangler pattern: Next.js to Astro one page type at a time

Part 2 puts a Cloudflare Worker (or a Next.js proxy) in front of both engines and routes by **page type from Graph**. Nothing in the application resource names a rendering engine, so the decision has to live at the edge.

| Finding | Result |
|---|---|
| Routing module (no framework imports) | Gave the same decisions in a Next.js proxy and a Worker |
| Cold type lookup | Median about 157 ms locally; cache hit 5 to 7 ms |
| Moving a type and back | Took effect on deploy, no code change; 3 runs, 1 transient 502 |
| Webhook | Must be sent to **both** engines, because either may hold a cached copy |
| Graph publish latency | New version in 1.2 to 2.5 s in 11 of 13 publishes; one outlier took 88.3 s |

🟠 **Risks the author found** (some fixed in his repository, all relevant to anyone copying the pattern):

- A path starting `//` made `new URL(path, origin)` replace the host, so the public hostname served another site's page. Build the target from the origin and set `pathname` separately.
- Optimizely's published Next.js ISR example derives Redis keys from `_N_T_` tags. On Next.js **16.3.8, 16.4.1 and 16.4.5** the webhook answered 200 but the page stayed cached, because the cache key format changed in a patch release. Reproduced locally on Redis only.
- The published Next.js and Astro webhook examples return 200 on Redis or purge failure, which gives up Graph's retry. A lost invalidation then waits for the TTL.
- Expired or deleted pages cannot be resolved with the public key, so they also wait for the TTL.
- Calling a DXP zone directly from a Worker is **not** orange-to-orange: the zone sees the Worker's IP for every visitor. Use a hostname in your own zone that CNAMEs to the DXP zone name.

Not established: behaviour on DXP itself, multi-language sites, shared blocks and navigation across engines, and restricted pages.

## Related

- [[visual-builder|Visual Builder in CMS 13]]
- [[graph-sdk|Optimizely Graph C# SDK]]
- [[deploying-to-dxp|Deploying CMS 13 to DXP]]

## Sources

- [Piotr Nowak — Visual Builder without Next.js, Part 1: What Astro Has to Rebuild on CMS 13 PaaS](https://world.optimizely.com/blogs/piotr-nowak---optimizely--azure/dates/2026/10/visual-builder-without-next.js-part-1-what-astro-has-to-rebuild-on-cms-13-paas) *(2026-10-29; mirrored at pino-labs.com)*
- [Piotr Nowak — Visual Builder without Next.js, Part 2: The Routing Decision Travels, the Engine Contract Doubles](https://pino-labs.com/blog/visual-builder-without-nextjs-part-2-strangler-astro-nextjs-cms-13/) *(2026-11-08)*
