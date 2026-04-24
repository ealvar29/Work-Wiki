---
title: Translations & Localization in CMS 13
tags:
  - optimizely
  - cms
  - localization
  - translation
---

# Translations & Localization in CMS 13

## Automating Block Translations

By default, Language Manager translates page-level properties but skips nested block content inside Content Areas. Editors end up having to manually translate each block — a major workflow problem on complex pages.

**The fix:** `TranslateOrCopyContentAreaChildrenBlockForTypes` setting, available since Language Manager 5.3.

### Configuration

**appsettings.json:**
```json
"CmsUI": {
  "LanguageManager": {
    "TranslateOrCopyContentAreaChildrenBlockForTypes": [
      "MySite.Models.ContentTypes.Pages**"
    ]
  }
}
```

**Or in Program.cs:**
```csharp
services.Configure<LanguageManagerOptions>(o =>
{
    o.TranslateOrCopyContentAreaChildrenBlockForTypes
        .Add("MySite.Models.ContentTypes.Pages**");
});
```

The `**` wildcard applies the rule to all content types within that namespace. Target page-specific namespaces only to avoid re-translating shared blocks used across multiple pages.

---

## Forcing Lowercase URLs During Auto-Translation

Auto-translation tools (like EPiServer.Labs.LanguageManager) bypass Optimizely's standard URL generation pipeline, so `UseLowercase` settings are ignored. Translated URL segments end up with incorrect casing and stray punctuation.

**Root cause:** the translation tool sets `URLSegment` directly, skipping `IUrlSegmentGenerator` entirely.

### Solution: Custom URL Segment Generator

Register a Unicode-aware generator that handles international characters correctly:

```csharp
public class LowercaseUrlSegmentGenerator : IUrlSegmentGenerator
{
    public string Create(string source, UrlSegmentOptions options)
    {
        var segment = source.ToLowerInvariant();
        segment = segment.Replace(' ', '-');
        segment = Regex.Replace(segment, @"[^\p{L}\p{N}\-_\.~\$]", "");
        segment = Regex.Replace(segment, "-+", "-");
        return segment.Trim('-', '.');
    }
}
```

Use `\p{L}` and `\p{N}` regex patterns — these match Unicode letters and numbers safely, not just ASCII.

### Detecting New Translations Without False Positives

Hook into `SavingContent` and use four-part detection to target only freshly auto-translated content:

```csharp
UrlSegmentProcessed == null   // not yet processed
&& Status == CheckedOut       // draft
&& StartPublish == null       // never published
&& Created > DateTime.Now.AddMinutes(-5)  // created in the last 5 minutes
```

Track processing state with a `[CultureSpecific]` boolean property on your base page model — each language version needs its own independent flag.

### Key Principles

- Third-party tools frequently bypass standard pipelines — event interception is the reliable fix
- `[CultureSpecific]` on tracking properties is critical; without it all languages share the same state
- Register custom generators as singletons

## Sources

- [Stuart Greig — Automating Block Translations in Optimizely](https://stuartgreig.dev/blog/automating-block-translations-in-optimizely) *(Apr 2026)*
- [Stuart Greig — Forcing Lowercase URLs During Auto-Translation](https://stuartgreig.dev/blog/forcing-lowercase-urls-in-optimizely-cms-during-auto-translation) *(Apr 2026)*
