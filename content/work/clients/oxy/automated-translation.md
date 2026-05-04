---
title: "Automated Translation Service (Oxy — es-CL Expansion)"
tags:
  - clients
  - oxy
  - translation
  - azure
  - optimizely
  - cms
---

# Automated Translation Service — Oxy es-CL Expansion

**Client:** Oxy (oxy.com)  
**Status:** Planning — awaiting client sign-off on Option A  
**Stack:** Optimizely CMS 12 / .NET 6 (upgrading to CMS 13 / .NET 10 in a separate workstream)  
**Scope:** Expand oxy.com from English (en-US) to Spanish — Chile (es-CL)

---

## Background

Oxy's content is heavily technical — industrial processes, chemical specifications, safety data, and regulatory language. Pure machine translation is not suitable for production. The solution must keep a human reviewer in the loop while reducing manual translator effort at scale.

The existing CMS already has the Spanish language branch infrastructure in place:
- `ILanguageBranchRepository` configured for es-CL
- `ChileLanguageInitializationModule` active
- `AutoPopulateLanguageBranch` attribute marking properties for cross-language population
- `IContentEvents.PublishedContent` publish hook pattern already used by other modules — the translation hook will follow the same pattern

No Azure AI Translator integration exists yet. This is greenfield work estimated at **1–2 sprints**.

---

## Options

### Option A — Azure AI Translator + Human Review *(recommended)*

A publish event hook inside Optimizely CMS calls the Azure AI Translator API whenever an English page is published. It auto-generates a Spanish Draft, then notifies a bilingual reviewer who must approve before anything goes live.

**Why this option:**
- Azure fits naturally into Oxy's existing .NET / Azure-hosted stack
- Azure Custom Translator supports training on a domain-specific glossary — critical for Oxy's chemical nomenclature, product names, and safety language
- Hybrid approach (machine draft + human review) estimated to reduce translator effort by **40–60%** while keeping humans in control of what reaches the site
- Single cloud vendor (Microsoft) for infrastructure and AI services

### Option B — Google Cloud Translation + Human Review

Same hybrid workflow using Google's Neural Machine Translation (NMT) engine.

**Trade-offs vs Option A:**
- Wider language support (useful if expansion beyond es-CL is planned)
- Less natural fit for a .NET/Azure environment — requires Google Cloud SDK and separate credential management
- No equivalent to Azure Custom Translator for domain-specific glossary training

### Option C — Manual Translation

Editors work directly in the CMS side-by-side compare view. No development work required.

**Trade-offs:**
- Zero development cost and no integration risk
- Does not scale — translator effort is 100% manual for every page
- No consistency enforcement across content

---

## Recommended Approach — Option A Detail

### Flow

```
English page published
        ↓
IContentEvents.PublishedContent hook fires
        ↓
Detect publish language is en-US
        ↓
Query ILanguageBranchRepository for all enabled non-master branches
        ↓
Call Azure AI Translator API → generate Spanish content
        ↓
Write translated content to es-CL branch → set status to Draft
        ↓
Notify bilingual reviewer (email / CMS notification)
        ↓
Reviewer approves and publishes Spanish branch
```

### Key Components

| Component | Purpose |
|---|---|
| `IContentEvents.PublishedContent` | Publish hook entry point |
| `ILanguageBranchRepository` | Query enabled language branches |
| Azure AI Translator .NET SDK | Machine translation API |
| Azure Custom Translator | Domain glossary training (chemical/safety terms) |
| `IContentRepository.Save()` | Write translated draft back to CMS |
| CMS notification or email | Reviewer alert |

---

## Edge Case — Re-Translation on English Updates

**Problem identified during planning:**

A naive hook that checks whether a Spanish branch already exists and skips translation if one is found will fail to handle English updates:

1. English page published → Azure generates Spanish Draft
2. Reviewer approves and publishes Spanish
3. Editor updates English and re-publishes
4. Spanish branch — already `Published` — is **not** flagged for re-translation and goes out of sync

**Root cause:** The hook skips re-translation when a Spanish branch already exists, regardless of whether the English source has changed.

**Solution:**

The publish hook must always re-trigger translation on any English-language publish event, regardless of the Spanish branch's current state:

```csharp
void OnPublishedContent(object sender, ContentEventArgs e)
{
    // Only act on English (master) language publishes
    if (e.Content is not ILocalizable localizable) return;
    if (localizable.Language.Name != "en") return;

    var enabledBranches = _languageBranchRepository
        .ListEnabled()
        .Where(b => b.LanguageID != "en");

    foreach (var branch in enabledBranches)
    {
        var translated = _translationService.Translate(e.Content, branch.LanguageID);
        var writableClone = translated.CreateWritableClone() as IContent;

        // Reset to Draft even if branch was previously Published
        _contentRepository.Save(writableClone, SaveAction.ForceNewVersion | SaveAction.Default,
            AccessLevel.NoAccess);

        _reviewNotifier.Notify(writableClone, branch);
    }
}
```

**Backstop:** An optional scheduled job can catch pages where the hook was bypassed (bulk imports, programmatic publishes that don't fire `IContentEvents`).

---

## Implementation Notes

- A `TRANSLATION-SERVICE.md` developer reference will be created in the Oxy repo when implementation begins
- Azure Custom Translator glossary training should start early — corpus collection (chemical terms, product names, safety language) takes time
- The hook should be feature-flagged so it can be disabled per environment during development
- Consider rate limiting / queuing for bulk publish scenarios (large content trees published at once)

---

## Current Status

| Item | Status |
|---|---|
| Strategy document prepared | ✅ Done |
| Client presented with options | ✅ Done |
| Client sign-off on Option A | ⏳ Pending |
| Azure Translator account provisioned | ⏳ Pending sign-off |
| Implementation scoping | ⏳ Pending sign-off |
| `TRANSLATION-SERVICE.md` in repo | ⏳ Pending implementation start |

---

## Related

- [[index\|Oxy Client Profile]]
- [[cms13/translations\|Translations & Localization (CMS 13)]]
