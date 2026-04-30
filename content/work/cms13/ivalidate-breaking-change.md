---
title: "Breaking Change: IValidate<T> Validators Must Be Explicitly Registered"
tags:
  - optimizely
  - cms
  - breaking-changes
  - validation
  - dependency-injection
---

# Breaking Change: IValidate\<T\> Validators Must Be Explicitly Registered

In CMS 12, custom content validators implementing `IValidate<T>` were automatically discovered and executed by the CMS. In CMS 13, **auto-discovery is removed** — validators must be explicitly registered in the DI container or they will silently not run.

## The Problem

A validator that worked in CMS 12:

```csharp
public class ImageValidator : IValidate<PageData>
{
    IEnumerable<ValidationError> IValidate<PageData>.Validate(PageData pageData)
    {
        foreach (var property in pageData.Property)
        {
            // Check XhtmlString properties for image references
            if (property.Value is XhtmlString xhtml && ContainsImage(xhtml))
            {
                yield return new ValidationError
                {
                    ErrorMessage = "The property shouldn't contain any images!",
                    PropertyName = property.Name,
                    Severity = ValidationErrorSeverity.Error
                };
            }
        }
    }
}
```

In CMS 13, this validator will exist in the codebase but **never execute** — no error is thrown, no warning is logged, validation just passes silently.

## The Fix

Register each validator in `Startup.cs` (or your service registration class):

```csharp
services.AddCmsValidator<ImageValidator>();
```

## Migration Checklist

1. Search your solution for all classes implementing `IValidate<`:

   ```
   : IValidate<
   ```

2. For each one found, add a corresponding registration:

   ```csharp
   services.AddCmsValidator<YourValidator>();
   ```

3. Verify validators fire in a test or staging environment before deploying.

## Related

- [[breaking-changes|Breaking Changes Catalog]] — full list of CMS 13 breaking changes

## Sources

- [Optimizely CMS 13 breaking changes: IValidate\<T\> — Tomas Hensrud Gulla (OMVP), gulla.net, 2026](https://www.gulla.net/en/blog/optimizely-cms-13-breaking-changes-ivalidate)
