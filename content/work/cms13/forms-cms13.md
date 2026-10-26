---
title: Optimizely Forms on CMS 13
tags:
  - optimizely
  - cms
  - forms
  - upgrade
---

`EPiServer.Forms` moves from 5.x to **6.0.x** for CMS 13. Core Forms upgrades cleanly. The remaining problems are in **custom element blocks**. **`EPiServer.Forms.Samples` made the jump on 2026-10-20 (`5.0.0`)** — reCAPTCHA, hCaptcha, date and address elements are all back; see below.

Every finding here came from a real CMS 12 → 13 upgrade on a multi-site instance with ~9,000 blocks.

*Package availability verified against the Optimizely feed 2026-10-26.*

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

## `EPiServer.Forms.Samples` — shipped for CMS 13 on 2026-10-20

> ✅ **`EPiServer.Forms.Samples 5.0.0` is out.** *Verified against the Optimizely feed and by reflecting over the package binary, 2026-10-26.* This section previously said the package had no CMS 13 build and advised scoping upgrades as though it would never arrive. **Bump to 5.0.0 instead.** The history is kept below because the *reasoning* about unscheduled vendor packages is still sound — it was the fact that expired, not the method.

| Package | Versions |
| --- | --- |
| `EPiServer.Forms` (core) | … 5.10.9, 6.0.0, 6.0.1, **6.0.2** |
| `EPiServer.Forms.Samples` | … 4.2.6, 4.2.7, **5.0.0** ← CMS 13 / `net10.0` |

`5.0.0` dependency ranges: `EPiServer.Forms [6.0.1, 7.0.0)` · `EPiServer.CMS.UI [13.0.0, 14.0.0)` · `EPiServer.CMS.AspNetCore.HtmlHelpers [13.0.0, 14.0.0)` · `System.Configuration.ConfigurationManager [10.0.0, 11.0.0)`.

* Not on nuget.org — it ships on **Optimizely's own feed**, so a 404 against `api.nuget.org` proves nothing. (This is also why "it isn't released" is easy to believe for longer than it is true.)
* Licensing is **contradictory** — the README badge says Apache 2.0, `build/props/common.props` says *"© 2003-2020 by Optimizely. All rights reserved"* with `PackageLicenseUrl` pointing at the EPiServer EULA. Treat the source as a specification to read, not code to copy.

### Everything came back — verified in the binary

Reflected over `lib/net10.0/EPiServer.Forms.Samples.dll`:

| Element | Core Forms 6.0.x | In Samples 5.0.0 |
| --- | --- | --- |
| `RecaptchaElementBlock` (Google reCAPTCHA **v3**) | ❌ none | ✅ present |
| `HcaptchaElementBlock` | ❌ none | ✅ present |
| `DateTimeElementBlock` | ❌ none | ✅ present |
| `DateTimeRangeElementBlock` | ❌ none | ✅ present *(not in the old table at all)* |
| `AddressesElementBlock` | ❌ none | ✅ present |

Supporting types are all there too — `RecaptchaValidator`, `HcaptchaValidator`, `DateValidator` / `DateTimeRangeValidator`, `AddressValidator`, `GoogleAddressValidateService`, the `*ElementBlockDescriptor` editor descriptors, and the `Configuration.RecaptchaKey` / `HcaptchaKey` / `AddressKey` option classes. The Razor views ship **precompiled** into the assembly (`AspNetCoreGeneratedDocument.FormsViews_Views_ElementBlocks_*`), so there is no view-copying step.

Core Forms 6.0.x ships: Captcha, Choice, FileUpload, ImageChoice, Number, ParagraphText, PredefinedHidden, Range, ResetButton, Selection, SubmitButton, Textarea, Textbox, Url, VisitorDataHidden.

### The lesson that outlived the blocker

Optimizely engineering said on **2026-09-08**: *"We have a plan to migrate `EPiServer.Forms.Samples` to CMS 13, but this hasn't been prioritized so far."* Support repeated "no timeline" in **Oct 2026**. The package shipped **2026-10-20** — and neither answer was revised.

> **A vendor "unscheduled / no ETA" is a snapshot of the roadmap on the day you asked, not a standing fact.** The advice to scope around an absent package is still right; the mistake is letting that scoping decision go unexamined for a quarter. **Re-check the feed at the start of every upgrade**, and before you build a shim:
>
> ```bash
> curl -s "https://nuget.optimizely.com/feed/packages.svc/FindPackagesById()?id='EPiServer.Forms.Samples'" \
>   | grep -oE '<d:Version[^>]*>[^<]+' | tail -5
> ```
>
> Then check the shim you already wrote is still needed — see *"grep for expired comments"* in [[post-upgrade-gotchas|Post-Upgrade Gotchas]]. A re-enablement is never just "add the PackageReference back."

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

> ℹ️ **Scope note (2026-10-26).** With `Forms.Samples 5.0.0` available, you should **not** need this shim for the Samples elements — install the package and the CMS re-adopts the content against the original GUIDs on its own. Keep reading anyway for two reasons: the `ContentTypeGUID` reclaim technique applies to **any** retired or renamed content type, and if a previous upgrade already shipped these stub classes, **you must delete them before adding the package** or you will have two types claiming the same GUID.

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

### Optimizely's endorsed procedure

Engineering confirmed this in writing on **2026-09-08**, and named the principle it follows — it is the same one documented for **content-type refactoring / orphaned content types**: *matching the original GUID causes CMS to associate the existing content type and data with the replacement class, rather than creating a new content type.* Reference: [Refactor content type classes](https://docs.developers.optimizely.com/content-management-system/docs/refactoring-content-type-classes) (written for CMS 12, mechanism unchanged).

Their recommended order, verbatim in substance:

1. **Back up the database**, and do the whole thing on Integration first.
2. Identify the original content type GUID.
3. Create a minimal stub class using **the same GUID**.
4. Set `AvailableInEditMode = false` so editors cannot create new instances of the obsolete type.
5. Deploy the stub.
6. Verify the existing content items are now recognised by the CMS.
7. Delete the obsolete instances — or migrate them to a supported type if they hold data worth keeping.
8. Once no instances remain, **remove the stub class**.
9. Confirm the obsolete content type is no longer needed.

Two things worth pulling out of that list:

* **Step 8 is the part teams forget.** A stub is scaffolding, not architecture. Left in place it becomes a permanent fake type that new developers assume is real — and `AvailableInEditMode = false` hides it well enough that nobody notices. Track the deletion, and re-run the SQL count above to prove it is safe.
* **Direct database manipulation is the fallback, not the method.** Optimizely was explicit: *"Direct database manipulation should only be considered as an advanced fallback."* Editing `tblContentType.ModelType` by hand gets to the same place and skips every safety check the CMS would have applied.

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

## `AddForms()` is no longer optional

Forms 5.x registered its services through `[ServiceConfiguration]` attributes, so a CMS 12 project that never called anything still got `FormsEvents` and friends. **Forms 6 dropped the attribute-based registration.** Call it explicitly:

```csharp
services.AddForms();
```

Miss it and you don't get a startup error — you get missing behaviour later, at the point something resolves a Forms service that was never registered.

## `XhtmlRenderService` is a captive dependency — forms silently lose content under load

The nastiest Forms 6 bug found so far, because every symptom is swallowed and every response is still **HTTP 200**.

**Symptom:** under concurrency, a small fraction of form renders come back missing an element — a paragraph, a label, a privacy notice. Measured at **3 of 120 concurrent requests** to a single page. No error to the visitor, no failed request, nothing in APM. Single-threaded testing never reproduces it.

**Root cause — a classic captive dependency.** `AddFormsCore()` does:

```csharp
services.TryAddSingleton<XhtmlRenderService>();
```

…and that class holds an **injected `IHtmlHelper` in a field**. `RenderXhtmlString()` builds a fresh `StringWriter` and `ViewContext` per call, then `Contextualize()`s that *one shared helper* before rendering.

```
request A ─ Contextualize(helper → writerA) ─── render ──────────▶ writes to writerA ✅
request B ────── Contextualize(helper → writerB) ─ render ──▶ writes to writerB
                          ▲
                          └─ A is still rendering. Its writes now land in writerB,
                             or in writerA after it has been disposed.
```

A singleton holding a per-request dependency is the definition of a **captive dependency**: the shorter lifetime is imprisoned by the longer one. Because both requests are rendering through the same helper, the second one's `Contextualize` redirects the first one's output mid-render.

It surfaces as three *different* exceptions out of `EPiServer.Forms.Helpers.Internal.HtmlExtensions`, which is why it looks like three unrelated flaky bugs:

| Exception | What it actually means |
|---|---|
| `Cannot write to a closed TextWriter` | the writer it was redirected to has already been disposed |
| `ArgumentOutOfRangeException` (Parameter `chunkLength`) | a `StringBuilder` corrupted by interleaved writes |
| `Destination is too short` | same, caught at a different copy |

Forms catches and swallows each one, so the request completes 200 with an element simply absent.

**Fix — register it transient *first*:**

```csharp
// BEFORE services.AddForms() / AddFormsCore()
services.AddTransient<EPiServer.Forms.Core.Internal.XhtmlRenderService>();
```

`TryAddSingleton` keeps an existing registration, so registering it transient ahead of Forms wins. Every resolution then gets its own `IHtmlHelper` and the renders stop sharing state. The class has no other mutable state, so nothing depends on it being a singleton.

**The generalisable rule:** `TryAdd*` is a *deference* API, not a guarantee — it lets a consumer pre-empt a library's lifetime choice by registering first. That is the cleanest available fix when a library picks a wrong lifetime, because it needs no fork and no reflection. Remove it once Optimizely corrects the lifetime upstream, and report the three stack traces with any support ticket.

**How to find this class of bug:** it is invisible to sequential testing by construction. Fire ~100 concurrent requests at a page and **diff the response bodies against each other**, rather than asserting on status codes. Identical 200s with different content lengths is the tell.

## Forms 6 injects its own stylesheet

Forms 6 ships an opinionated default `EPiServerForms.css` and injects it automatically. On a site with its own form styling this arrives as unasked-for layout changes that look like a regression in your CSS. Check for it before debugging your own stylesheet.

## Related

- [[post-upgrade-gotchas|Post-Upgrade Gotchas]]
- [[breaking-changes|Breaking Changes]]
- [[visual-builder|Visual Builder]]
