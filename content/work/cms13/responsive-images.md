---
title: Responsive Images — why ImageDescriptor is the wrong tool
tags:
  - optimizely
  - cms
  - performance
  - images
---

If a CMS 13 site serves every image at its upload resolution, the obvious fix looks like EPiServer's `ImageDescriptor` mechanism — declare a few sized `Blob` properties on your media type and let the platform generate variants. **Do not use it for delivery-sized images.** It is a *thumbnail* feature, and using it for responsive delivery makes pages heavier, not lighter.

## The mechanism, and what it actually does

Declaring a descriptor is genuinely simple, and the plumbing all works:

```csharp
public class ImageFile : ImageData
{
    [ImageDescriptor(Width = 768)]
    public virtual Blob W768 { get; set; }
}
```

Each variant is then reachable at **`<mediaUrl>/<propertyName>`** — case-insensitive. `ImageData` already ships a `Thumbnail` descriptor, so you can confirm all of this on **any existing site without deploying anything**:

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' \
  https://your-site/siteassets/favicon.png
curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' \
  https://your-site/siteassets/favicon.png/thumbnail
```

🟢 Measured: `16,630` bytes → `1,522` bytes. So the resizer is real and wired up — `EPiServer.ImageLibrary.ImageSharp` is **bundled into `EPiServer.Cms` as of 13.0.2**, so there is no package to add.

`Pregenerated` (default `false`) means, in Optimizely's own words, *"pregenerated when a new image is uploaded rather than when first requested"* — so **the default is lazy**. Adding descriptors to a large existing media library does **not** trigger a bulk regeneration pass. That part is safe.

## Two disqualifying defects

Decompiling `EPiServer.Core.Internal.ThumbnailManager` (13.1.1) shows the whole story in one method:

```csharp
public virtual Blob CreateImageBlob(Blob sourceBlob, string propertyName,
                                   ImageDescriptorAttribute descriptorAttribute)
{
    Uri thumbnailUri = CreateThumbnailUri(sourceBlob, propertyName);
    ImageOperation imgOperation = new ImageOperation(
        ImageEditorCommand.ResizeKeepScale,          // ← 2. pads, does not just resize
        descriptorAttribute.Width, descriptorAttribute.Height)
    { BackgroundColor = "#00000000" };
    return CreateBlob(thumbnailUri, sourceBlob,
        imgOperation,
        GetMimeMapping(ThumbnailHelper.ThumbnailExtension));   // ← 1. and that is ".png"
}
```

### 1. Every variant is re-encoded as PNG, whatever the source was

`ThumbnailHelper.ThumbnailExtension => ".png"`, and that drives the encoder. So a JPEG photo's variant comes back as PNG:

| | Bytes | Content-Type |
|---|---|---|
| `/siteassets/oxychem-logo.jpg` | 30,112 | `image/jpeg` |
| `/siteassets/oxychem-logo.jpg/thumbnail` | 17,657 | **`image/png`** |

> That variant is **48×48** and costs **59% of the full-size original**. Scale that reasoning to 1920px and a PNG re-encode of a photograph is comfortably **larger than the JPEG original** — the exact opposite of the goal.

The PNG choice isn't arbitrary: the transparent `BackgroundColor = "#00000000"` needs an alpha channel, which is defect 2's fault.

### 2. `ResizeKeepScale` pads — it does not simply scale

In `EPiServer.ImageLibrary.ImageSharp`:

```csharp
case ImageEditorCommand.ResizeKeepScale:
    return c.Resize(new ResizeOptions {
        Size = new Size(operation.Width, operation.Height),
        Mode = ResizeMode.BoxPad                    // ← letterbox bars baked into the file
    }).BackgroundColor(color);

case ImageEditorCommand.ResizeByWidthKeepingScale:  // ← what you actually want
    return c.Resize(new ResizeOptions { Size = new Size(operation.Width, 0) });
```

`ResizeByWidthKeepingScale` is exactly right — width-only, height computed from the ratio. **`CreateImageBlob` can never reach it**, because the command is hardcoded.

### And a third, structural problem

`ImageDescriptorAttribute` carries only **static** `Width`/`Height`. An attribute cannot compute a per-image value, so setting `Height` forces **one aspect ratio onto the entire library**. Leaving it unset lands you in `BoxPad` with a zero dimension. There is no correct configuration for a mixed library.

🟠 **A trap when you copy this from an older project.** A common CMS 11/12-era pattern is a custom `ImageScaleDescriptorAttribute : ImageDescriptorAttribute` adding a `ScaleMethod` property. Check whether anything *reads* it — in the project we inherited it from, `ScaleMethod` appeared in exactly two files: the attribute declaring it and the model setting it. **Nothing consumed it.** It was dead metadata, and the platform's hardcoded `ResizeKeepScale` ran regardless.

## What to do instead

There is no supported way to serve arbitrary widths from the URL. `ImageOperation.Deserialize(string)` and `ParseCommandName` exist and look promising, but `IBlobResolver.ResolveProperty(IContentData, **propertyName**)` shows resolution is by *property name* — the deserialiser serves the CMS crop/rotate editor, not a public route.

So the resizing belongs **outside the CMS**. In rough order of preference:

| Option | Verdict |
|---|---|
| **CDN transformations** (Cloudflare, Akamai, Azure CDN) | ✅ Best. Arbitrary widths, format negotiation, no blob storage, no app code |
| **`SixLabors.ImageSharp.Web` middleware** | 🟡 Works, but you own the cache and the config |
| **`Baaijte.Optimizely.ImageSharp.Web`** | ⚫ **No CMS 13 build** — latest is `2.1.3`, targeting `net6.0` / `EPiServer.CMS 12.13.2` |
| **`ImageDescriptor`** | ⚫ See above |

**Check whether the CDN feature is already switched on before building anything.** On the site that prompted this page, Cloudflare transformations were already enabled on every zone including production — nobody had noticed:

```bash
curl -s -o /dev/null -H 'Accept: image/avif,image/webp,image/*' \
  -w '%{http_code} %{content_type} %{size_download}\n' \
  'https://your-site/cdn-cgi/image/width=480,format=auto,fit=scale-down/siteassets/hero.jpg'
```

Measured on a real 1920px hero, `362,946` bytes as JPEG:

| Requested width | Bytes | vs original |
|---|---|---|
| 480 | 26,387 (`avif`) | **13.8× smaller** |
| 768 | 59,794 | 6.1× |
| 1024 | 100,321 | 3.6× |
| 1440 | 195,952 | 1.9× |
| 1920 | 299,315 | 1.2× |

Format is preserved, or upgraded to AVIF/WebP by `Accept`-header negotiation via `format=auto` — the same request returns `image/jpeg`, `image/webp` or `image/avif` depending on the client.

### Implementation notes worth keeping

- **`fit=scale-down` explicitly.** Guarantees no upscaling — a small logo requested at `1920w` comes back at its own size rather than enlarged. Verified.
- **Leave `src` on the original file** and add `srcset` alongside. That is the fallback, and it means disabling the CDN feature degrades to the previous markup instead of breaking images.
- **Emit `sizes`.** Without it the browser assumes `100vw` and over-fetches every image that is not full-bleed. Correct for heroes, wrong for a sidebar thumbnail.
- **Skip SVG, GIF, ICO, BMP** — vector, possibly animated, or a favicon container.
- **Skip non-same-origin and protocol-relative URLs** (`//host/x`), and never nest `/cdn-cgi/image/` twice.
- **Put the kill switch in config.** CDN transformations are billed per request; a `ResponsiveImages:Enabled` flag lets someone turn it off without a deploy.
- **Never emit a null `srcset` on a `<source>`.** A `<source>` whose srcset is empty is skipped, and the browser falls through to the `<img>`. In the common art-direction pattern the source is the *desktop* image and the img is the *mobile* one — so a null there quietly serves a phone-sized file to every desktop visitor. Have your helper fall back to the original URL for `<source>`, and only return null for `<img>` (Razor omits a null attribute, which is what you want there).
- **Set `sizes` per slot, not blanket `100vw`.** A third-width grid image told `100vw` makes the browser choose a full-width candidate and hands most of the saving back.
- 🟠 **Check for a choke point, but verify it is one.** A view-model method that renders `<img>` looks like the single seam — on this site `Picture.RenderImage()` had exactly **one** caller, and the heaviest images (the heroes) hand-wrote their own markup and bypassed it entirely. Grep for the **method call**, not the model name; the model name appears in views that never call it.
- Views compiled into the main assembly? Then `dotnet build` really does validate your Razor. Confirm rather than assume — if a `*.Views.dll` is absent it may mean compiled-in (ASP.NET Core 3.0+) *or* deferred to runtime. `ilspycmd -t AspNetCoreGeneratedDocument.Views_...` will show the compiled view body and settle it.

> 🟢 A neat tell that this work is needed: the hero file was named **`home-b1-1920w.jpg`**. Editors were already hand-naming assets by width, doing the job manually.

## Lesson

**Verify what a platform mechanism actually emits before designing on top of it.** The descriptor path looked correct at every level a normal check would reach — the attribute exists, the property resolves, the URL returns `200`, the bytes go *down* on the file we happened to test first. It took a **non-square, non-PNG** source to expose that the content-type had silently changed. One `curl` against a JPEG was worth more than all the documentation, and the documentation never mentions the PNG coercion at all.
