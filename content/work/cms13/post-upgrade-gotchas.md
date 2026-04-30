---
title: "Post-Upgrade Gotchas in CMS 13"
tags:
  - optimizely
  - cms
  - upgrade
  - debugging
  - bugs
---

# Post-Upgrade Gotchas in CMS 13

Real issues encountered after upgrading from CMS 12 to CMS 13 GA (released March 31, 2026). These are silent failures or misleading errors that aren't obvious from the breaking changes documentation.

## MapContent() Must Come Before MapRazorPages()

**Symptom:** After upgrading, editors see "Unable to create page." when trying to create content. Image deletion also fails silently, even though uploads work fine.

**Error in logs:**
```
System.ArgumentNullException: 'Value cannot be null. (Parameter 'model')'
```

**Root cause:** The ASP.NET Core endpoint mapping order matters for CMS 13. If `MapRazorPages()` is registered before `MapContent()`, Razor Pages intercepts routes that should be handled by the CMS.

**Broken configuration:**
```csharp
app.UseEndpoints(endpoints =>
{
    endpoints.MapRazorPages();   // ← wrong order
    endpoints.MapContent();
    endpoints.MapControllers();
});
```

**Fix — reorder so MapContent() comes first:**
```csharp
app.UseEndpoints(endpoints =>
{
    endpoints.MapContent();      // ← must be first
    endpoints.MapRazorPages();
    endpoints.MapControllers();
});
```

**Alternative fix** — if you don't need Razor Pages in your project, remove `MapRazorPages()` entirely.

This is an officially accepted bug: **CMS-51344**.

## Sources

- [Optimizely CMS 13 and errors when creating pages after upgrade — Tomas Hensrud Gulla (OMVP), gulla.net, 2026](https://www.gulla.net/en/blog/optimizely-cms-13-and-errors-when-creating-pages-after-upgrade)
