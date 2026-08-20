---
title: Optimizely Forms on CMS 13
tags:
  - optimizely
  - cms
  - forms
  - upgrade
---

`EPiServer.Forms` moves from 5.x to **6.0.x** for CMS 13. Core Forms upgrades cleanly. The problems are in **custom element blocks** and in **`EPiServer.Forms.Samples`**, which did not make the jump at all.

Every finding here came from a real CMS 12 → 13 upgrade on a multi-site instance with ~9,000 blocks.

## The single most expensive bug: element name vs Guid

**Symptom:** the form posts, the server rejects it, and the visitor is told *nothing*. Clicking Submit appears to do nothing at all.

Forms identifies a field by its **element name** (`__field_NNNNN`) in two places:

1. the posted form key — `name="__field_10569"`
2. the attribute it looks the element up by — `data-f-element-name="__field_10569"`

A custom element that emits anything else silently breaks. The failure chain:

```
input name="SearchableDropdown"          <- not __field_10569
   -> __field_10569 posts empty
   -> Required validator fails server-side
   -> {"isSuccess":false, validationInfo:[{"invalidElementName":"__field_10569",
                                           "validationMessage":"This field is required."}]}
   -> client looks up [data-f-element-name="__field_10569"] -> not found
   -> no error rendered
```

Two independent faults, **each sufficient on its own** to hide the error — which is why it survived the port unnoticed.

**Correct shape for any custom element:**

```razor
<input type="text"
       id="@($"field-{formElement?.Guid}")"          @* Guid is fine for DOM ids *@
       name="@formElement?.ElementName"              @* posts under this key *@
       data-f-element-name="@formElement?.ElementName" @* Forms looks it up by this *@
       data-f-type="textbox" />
```

**Guid belongs in `id`, never in `data-f-element-name`.** An id is not a form key.

### Diagnostic — one snippet finds every instance

Run in the browser on any form page. It compares what the server declared against what the DOM contains:

```js
const s = [...document.querySelectorAll('script')].map(x => x.textContent)
            .find(t => t && t.includes('ElementsInfo'));
const m = s && s.match(/ElementsInfo:\s*JSON\.parse\("((?:[^"\\]|\\.)*)"\)/);
const info = m ? JSON.parse(JSON.parse('"' + m[1] + '"')) : {};
JSON.stringify(Object.keys(info)
  .filter(k => !document.querySelector(`[data-f-element-name="${k}"]`)), null, 1);
```

Anything returned is declared to Forms but absent from the DOM. **That list should be empty.** On the upgraded site it held the honeypot and a searchable dropdown — one inert, one fatal.

## An inline style beats a CSS class — and hides validation forever

The same element carried:

```html
<span id="…Error" style="display: none; color: red;">@Model.ErrorMessage</span>
```

Forms shows validation errors by **toggling a CSS class**. An inline `style="display:none"` wins over any class, so that element could never become visible. A plain "This field is required" became a silent dead form.

**Never inline-hide a validation container.** Let Forms control visibility.

## `EPiServer.Forms.Samples` has no CMS 13 build

| Package | Versions |
| --- | --- |
| `EPiServer.Forms` (core) | … 5.10.9, **6.0.0, 6.0.1** |
| `EPiServer.Forms.Samples` | … 4.2.6, **4.2.7** ← stops here |

* Not on nuget.org — it ships on **Optimizely's own feed**, so a 404 against `api.nuget.org` proves nothing.
* Open source at `github.com/episerver/EPiServer.Forms.Samples`, **last commit 2024-07**, branches stop at `release/4.2.2`. Not archived, just dormant.
* Licensing is **contradictory** — the README badge says Apache 2.0, `build/props/common.props` says *"© 2003-2020 by Optimizely. All rights reserved"* with `PackageLicenseUrl` pointing at the EPiServer EULA. Treat the source as a specification to read, not code to copy.
* Optimizely support confirmed *"no official announcement or timeline for a CMS 13-specific release"* — then, in the same reply, advised installing it. Ignore the second half.

### What that takes with it

| Element | Core Forms 6.0.0 equivalent |
| --- | --- |
| `RecaptchaElementBlock` (Google reCAPTCHA **v3**) | ❌ none |
| `HcaptchaElementBlock` | ❌ none |
| `DateTimeElementBlock` | ❌ **none — no date element at all** |
| `AddressesElementBlock` | ❌ **none — no address element at all** |

Core Forms 6.0.0 ships: Captcha, Choice, FileUpload, ImageChoice, Number, ParagraphText, PredefinedHidden, Range, ResetButton, Selection, SubmitButton, Textarea, Textbox, Url, VisitorDataHidden.

⚠️ **Date and address are lost functionality, not merely orphaned content.** That needs a client conversation, not a code fix.

### CMS 13 does ship a captcha — just not reCAPTCHA

`CaptchaElementBlock` is in **core** Forms 6.0.0 (`CaptchaGenerator`, `CaptchaValidator`, `CaptchaSessionKey`, `CaptchaImageHandler`). It is a server-generated **distorted-text image**, and it needs session state:

```csharp
services.AddSession();   // "Fix for Captcha not loading"
app.UseSession();
```

**Do not reach for it just because it is free.** Distorted text is a WCAG barrier that blocks screen-reader users from submitting at all, and commodity OCR defeats it. For a public site, an invisible honeypot plus (if spam actually materialises) reCAPTCHA v3 is the better pairing.

### Porting the Samples elements — what breaks

The source is modern ASP.NET Core (`IHttpContextAccessor`, options pattern, Razor views), so a port is realistic. One blocker:

```
IExcludeInSubmission            ✅ present in Forms 6.0.0
IViewModeInvisibleElement       ✅ present
ValidatableElementBlockBase     ✅ present
IElementRequireClientResources  ❌ REMOVED in Forms 6.0.0
```

That removed interface is how the element injected Google's `api.js`. A straight copy will not compile — emit the script from the Razor view instead.

## Reclaiming orphaned element content

When a package disappears, its content remains and the CMS refuses the whole content area:

```
Content of type 'RecaptchaElementBlock' is not allowed in 'Form elements'
```

That **blocks saving the form entirely**, for any unrelated edit. Editors are stuck.

**EPiServer binds content to a model by `ContentTypeGUID`**, not by type name or assembly. Re-declare the original GUID in your own namespace and the CMS re-adopts every item and rewrites its stale `ModelType` on first load. Optimizely support confirmed this is the supported approach.

```csharp
[ContentType(
    GUID = "2D7E4A18-8F8B-4C98-9E81-D97524C62561",   // the ORIGINAL guid — never change it
    AvailableInEditMode = false,                      // cannot be added to new forms
    DisplayName = "reCAPTCHA (legacy, inactive)")]
public class RecaptchaElementBlock : ValidatableElementBlockBase { }
```

Find them all before you start:

```sql
SELECT ct.Name, ct.ContentTypeGUID, COUNT(c.pkID) AS Items
FROM tblContentType ct LEFT JOIN tblContent c ON c.fkContentTypeID = ct.pkID
WHERE ct.ModelType LIKE '%Forms.Samples%'
GROUP BY ct.Name, ct.ContentTypeGUID ORDER BY Items DESC;
```

### Two traps in the shim itself

**1. Registering the type puts it back into `ElementsInfo`.** Before the shim exists, Forms *skips* the unresolvable items entirely. Once bound they reappear — and Forms looks every declared element up by `data-f-element-name`. A shim that renders **nothing** re-creates the silent-failure bug on every form that contains one. Render a hidden input carrying the element name.

**2. Match the base class to whether it collected data.** A validator-only element (captcha) can render hidden. An element that collected real values (date, address) must still render an **input**, or you silently delete a live field and stop capturing submissions. Degraded beats disappeared.

## AutoMapper: custom element maps must be explicit

Form element blocks derive from `InputElementBlockBase` / `ValidatableElementBlockBase`, **not** `StandardBlockBase` — so a catch-all `CreateMap<StandardBlockBase, …>().IncludeAllDerived()` does not reach them.

```csharp
CreateMap<HoneypotElement, HoneypotElementViewModel>();
CreateMap<RecaptchaElementBlock, RecaptchaElementBlockViewModel>();   // required
```

A missing map **compiles clean and throws at render time**, taking the whole form down. Build success proves nothing here.

## Frontend: two latent crashes worth checking

Both found in the same custom contact-form module, both pre-existing and both activated by content:

```js
// querySelector returns NULL when the child is absent — this throws and aborts init()
element.querySelector('.Form__Original__ParagraphText').innerHTML.length > 9

// querySelectorAll ALWAYS returns a NodeList, and an empty NodeList is TRUTHY
if (targetElements) { … }        // never guarded anything
```

An unhandled exception in a module's `init()` is a **silent feature-disabler** — everything registered after the throw never happens. The symptom is "nothing happens", not an error, and it looks intermittent because it depends which page you are on.

## Related

- [[post-upgrade-gotchas|Post-Upgrade Gotchas]]
- [[breaking-changes|Breaking Changes]]
- [[visual-builder|Visual Builder]]
