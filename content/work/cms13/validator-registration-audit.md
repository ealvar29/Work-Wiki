---
title: "Validator Registration Audit (OX-202)"
tags:
  - optimizely
  - cms
  - breaking-changes
  - validation
  - dependency-injection
  - oxychem
---

# Validator Registration Audit (OX-202)

[[ivalidate-breaking-change|The breaking change itself]] is one line of fix — `services.AddCmsValidator<T>()`. The work is the audit, and it is the part that gets deferred: nothing fails, nothing logs, the build is green, and the site serves correctly. **An unregistered validator is indistinguishable from a validator whose rule happens to be satisfied.**

On OxyChem, every `IValidate<T>` in the solution except one went dark at the **2026-09-18 CMS 13 cutover** and stayed dark for **25 days** of live editing before OX-202 registered them on 2026-10-13. No editor reported it, because the symptom of a missing validator is *the absence of a warning you had stopped noticing*.

## Finding every validator

Class declarations, not call sites — and search for the interface, not the `Validate` method, because explicit interface implementation hides the method name:

```bash
grep -rn "IValidate<" --include=*.cs
```

Both of these are validators, and only the first is found by searching for `public IEnumerable<ValidationError> Validate`:

```csharp
public class ImageFileValidator : IValidate<ImageFile>
{
    public IEnumerable<ValidationError> Validate(ImageFile file) { ... }
}

public class C16TestimonialBlockValidator : IValidate<C16TestimonialBlock>
{
    IEnumerable<ValidationError> IValidate<C16TestimonialBlock>.Validate(...)  // ← explicit, no `public`
}
```

## Not everything that validates is an `IValidate<T>`

The audit produces a pile of files named `*Validator.cs`. Only one kind belongs in `AddCmsValidator<T>()`, and registering the others does nothing at best:

| Kind | Base type | How CMS 13 finds it |
|---|---|---|
| Content validator | `IValidate<T>` | **DI only** — `services.AddCmsValidator<T>()` |
| Property validator | `ValidationAttribute` (`System.ComponentModel.DataAnnotations`) | Model metadata — still automatic, nothing to register |
| Forms element validator | `ElementValidatorBase` (`EPiServer.Forms.Core.Validation`) | EPiServer.Forms discovers its own |

On OxyChem that split 14 `*Validator.cs` files into 13 registrations and 2 exclusions (`FormSignatureValidator`, `SearchableDropdownValidator` — both `ElementValidatorBase`), plus a separate `C14ArticleMediaValidationAttribute` that was never affected.

## Triage severity before registering — do not switch them all on at once

`ValidationErrorSeverity` decides whether registration is a cosmetic restoration or a content freeze:

| Severity | Effect in the editor | Risk when re-enabling after a dark period |
|---|---|---|
| `Warning` | Notifies, **save proceeds** | None — worst case is a wave of yellow on existing content |
| `Error` | **Refuses the save** | Editors cannot re-save content that was legal yesterday |

The OxyChem set was 11 Warning-only block validators (C12, C16, C17, C21, C27, G3, G7) and 3 Errors. The two media Errors are the dangerous shape:

```csharp
[MediaDescriptor(ExtensionString = "pdf,pptx,tif,doc,docx,zip,pem")]   // ← the upload gate
public class GenericFile : MediaData { ... }

// GenericFileValidator rejects any Name whose extension is not in that same list, Severity = Error
```

The extension list **mirrors its own `MediaDescriptor`**, so for anything uploaded through the CMS it is a tautology — it can only fire on a file renamed without its extension, or on legacy rows that predate the descriptor. That is why it was safe to turn on. 16 legacy spreadsheets on the 2026-09-01 Integration copy carry extensions that appear in neither list and now block re-save; a validator whose list had *drifted* from its descriptor would have done that to the entire media library.

> Read each `Error` validator against content that already exists in the database, not against the rule as written. The rule was true when editors last obeyed it — the question is whether it is still true after however many weeks of unvalidated publishing.

## Dark code rots — and a throwing validator fails the save

A validator that never executes is still compiled, so nothing flags a bug inside it. This one had been wrong since before the upgrade and could not have been noticed:

```diff
  if (block.TestimonialItems == null)
  {
      validationErrors.Add(GetTestimonialItemsError(block));
  }

- if (block.TestimonialItems.Items.Count() == 0)   // ← runs anyway after the null branch
+ else if (block.TestimonialItems.Items.Count() == 0)
  {
      validationErrors.Add(GetTestimonialItemsError(block));
  }
```

`if` + `if` instead of `if`/`else if`: a null `TestimonialItems` adds the warning and then dereferences null. **An exception thrown out of `Validate` does not downgrade to a warning — it propagates and fails the save**, so the severity triage above is worthless if the validator can throw. Re-read the body of every validator you register; it has not been exercised since the upgrade.

## The registration block

Grouped and commented in `Startup.cs`, because the next person adding a validator will not know it needs a second edit:

```csharp
// CMS 13 runs only the IValidate<> classes registered here; CMS 12 found them by type scanning.
// A new validator does nothing until it is added to this list.
services.AddCmsValidator<B1HeroBlockValidator>();                        // Error
services.AddCmsValidator<C12ThreeColumnContentTeaserBlockValidator>();   // Warning
// ... 10 more Warning-only block validators ...
services.AddCmsValidator<GenericFileValidator>();                        // Error
services.AddCmsValidator<ImageFileValidator>();                          // Error
```

## Verification

Registration is testable only behaviourally — there is no startup log line, and a registered-but-satisfied validator looks exactly like an unregistered one.

1. **Pick one validator per severity class.** A Warning block and an Error block.
2. **Construct the failing state in the editor.** Empty the required ContentArea, clear the hero copy.
3. **Save.** Warning = yellow notice, save completes. Error = save refused.
4. **Repeat on the Error validators against real content** before promoting — on a restored production database, not a clean one.

## Related

- [[ivalidate-breaking-change|Breaking Change: IValidate\<T\>]] — the mechanism and the one-line fix
- [[breaking-changes|Breaking Changes Catalog]]
- [[forms-cms13|Optimizely Forms on CMS 13]] — why `ElementValidatorBase` stays out of this list
- [[post-upgrade-gotchas|Post-Upgrade Gotchas]]
- [[work/clients/oxychem/index|OxyChem]] — the engagement these notes come from

## Sources

- OxyChem OX-202, `abbcb93` — *fix(cms): register the project's content validators on CMS 13*, 2026-10-13
- OX-171, the earlier single registration (`B1HeroBlockValidator`) that surfaced the gap
