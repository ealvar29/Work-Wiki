---
title: "OxyChem: Visual Builder POC Tutorial"
tags:
  - optimizely
  - cms
  - visual-builder
  - oxychem
  - tutorial
---

How to add the **Visual Builder authoring model** (experiences, sections, elements) to an upgraded CMS 13 MVC site **without changing any existing page or block**, using OxyChem as the worked example. Ticket: **OX-260**. Code: branch `OX-260-VB-POC` (`00bdf53` → `ea46929` → `eed781a`), **6 new files, 120 lines, 0 existing files changed**, **2 new content types** (`LandingExperience`, `C31NoticeElement`).

> [!success] Status 2026-11-12: boots locally, not yet redeployed to Integration
> `eed781a` was verified locally against a Production copy: *"boots to Application started, `/` and `/search/` 200, `C31NoticeElement` registered in `tblContentType`."* The branch is pushed (`origin/OX-260-VB-POC`) but is **not** on `integration` or `main`.

> [!danger] History: the first Integration deploy FAILED (2026-11-10)
> Package `1.0.374` (deployment `d8bc2ca1`) never became healthy in the DXP slot. Warm-up timed out, the slot returned `503`, and every slot swap failed with *"slot did not respond to http ping"*. **Integration's live site was never affected** (it stayed on the 2026-11-06 build), but the deployment held the environment lock for about 100 minutes. The POC was reverted from `integration` (`OX-260-revert`).
>
> 🟡 **Most likely cause, found afterwards by booting locally:** that build still had the C8/C14/C24 element twins, and CMS 13 refuses to start when an element-enabled type carries a `PropertyList<T>` property (see [[#Constraints]]). The local boot failed with exactly that error; dropping the three twins (`eed781a`) fixed it. Not proven to be the slot's cause, because the slot wrote no console output.

## How Visual Builder works (the mental model)

Read this first. Everything else on the page is plumbing for these ideas.

### 1. The editor owns the layout, not the developer

On a classic page, a developer writes a `.cshtml` that says *"hero here, then a content area here"*. Editors can only fill the slots. On an **experience**, the page has no Razor layout of its own. The editor builds the grid in the browser, and the grid is saved **as data on the page**.

### 2. The building blocks, outermost first

| Level | What it is | Who defines it | OxyChem POC |
|---|---|---|---|
| **Experience** | A page whose body is a Visual Builder layout. A content type deriving from `ExperienceData` (which derives from `PageData`, so it has a URL, versions and publishing like any page) | Developer in C#, **or** an admin in the UI | `LandingExperience` |
| **Section** | A horizontal band of the page. Holds rows | Built-in; custom ones via `SectionData` + `SectionEnabledKey` | Built-in only |
| **Row → Column** | The grid inside a section. The editor adds rows and splits them into columns | Built-in, no code | — |
| **Element** | The actual content in a column: a block type flagged `CompositionBehaviors = ElementEnabledKey` | Developer in C# | `C31NoticeElement` |
| **Style** (display template) | A named set of design options (for example "dark background") an editor can apply to a section, row or element | Admin in the UI; **stored in the database** | Not created yet |
| **Blueprint** | A saved layout used as a starting point for a new experience | Editor in the UI; **stored in the database** | Not created yet |

### 3. Elements are just blocks with a flag

An element is a normal block type plus one attribute value. It keeps its properties and is rendered by the **same view component** as the block. That's why OxyChem's POC can turn `C31NoticeBlock` into an element with an empty subclass.

**Elements are stored inside the experience**, not as separate shared blocks in the assets pane (unlike blocks dropped into a `ContentArea`). Whether a *shared* block can be dropped into a column is one of the open questions below.

### 4. How the page renders (MVC, no Graph, no headless front end)

```
request /my-landing/
  └─ CMS routes to a LandingExperience (an ExperienceData)
      └─ ExperienceController : PageController<ExperienceData>      ← one controller for EVERY experience type
          └─ Views/Pages/Experience.cshtml  (Layout = _ExperienceLayout)
              <epi-outline experience="@Model">   ← walks the saved layout
                <epi-grid>                         ← rendered once per SECTION
                  <epi-row>                        ← once per ROW
                    <epi-column>                   ← once per COLUMN
                      <epi-component/>             ← each ELEMENT, through the block's normal
                                                      template resolution → C31NoticeBlockController
```

**Concept: the tag helpers are a template, not literal markup.** You write each level once and the CMS repeats it for every section, row and column the editor created. Your `class=` attributes are where the site's CSS hooks in.

### 5. What a developer still does

| Developer (C#, deployed) | Editor / admin (UI, no deploy) |
|---|---|
| Decide **which blocks may be elements** | Build layouts from those elements |
| Write the experience controller and layout **once** | Create new experience types, styles and blueprints |
| Keep elements free of the forbidden property types | Everything else |

> [!tip] The one-sentence pitch
> **Developers ship approved building blocks once; editors assemble pages from them without a ticket or a deploy.**

> [!warning] "Visual Builder" means two different things
> | | What it is | OxyChem before OX-260 |
> |---|---|---|
> | **The editing interface** | The CMS 13 editor. Every upgraded site gets it, and it opens classic pages too | 🟢 Live, used daily |
> | **The authoring model** | Experiences, sections, elements, styles and blueprints that editors drag and drop | ❌ Never built |
>
> *Verified 2026-11-10:* `ExperienceData`, `SectionData`, `CompositionBehaviors` return 0 hits in source **and** in `git log --all -S`. `UpgradePlan/qa-agency-due-diligence-runbook.md:220` says *"Visual Builder is out of scope — this site uses traditional MVC templates."* Every earlier Visual Builder commit (OX-131, OX-132, OX-134) fixed how **legacy** content displays inside the editor.

## The two models side by side

```
CLASSIC (OxyChem's pages)                       VISUAL BUILDER (OX-260)
StandardPage : BasePage : PageData              LandingExperience : ExperienceData : PageData
 └─ MainContent (ContentArea)                    └─ Section
     ├─ B1HeroBlock                                  └─ Row → Column
     └─ C31NoticeBlock                                   └─ Element (C31NoticeElement : C31NoticeBlock)
Layout decided by the DEVELOPER (.cshtml)       Layout decided by the EDITOR
@Html.PropertyFor(m => m.MainContent)           <epi-outline> <epi-grid> <epi-row> <epi-column> <epi-component/>
Rendered by PageController<BasePage> + _Layout  Rendered by ExperienceController + _ExperienceLayout
```

## What CMS 13.4.0 already ships

Nothing to install. *Verified 2026-11-10 against the package XML docs in `G:\nuget\packages\episerver\13.4.0` and a clean .NET 10 build.*

| API | Namespace / signature | How verified |
|---|---|---|
| `ExperienceData` | `EPiServer.VisualBuilder`, derives from `PageData` | 🟢 `PageController<ExperienceData>` compiles; `PageController<T>` requires `PageData` |
| `SectionData` | `EPiServer.VisualBuilder` | 🟢 XML docs |
| `CompositionBehavior.ElementEnabledKey` / `SectionEnabledKey` | `EPiServer.DataAbstraction`, **string constants** | 🟢 Compiles in `[ContentType(CompositionBehaviors = ...)]`. The `ElementEnabled` *object* can't, because attribute arguments must be constants |
| `<epi-outline experience="...">` | `EPiServer.Web.Mvc.TagHelpers.OutlineTagHelper.Experience` | 🟢 XML docs; Razor views compile with tag-helper types checked |
| `AddCmsTagHelpers()` | `EPiServer.DependencyInjection.ServiceCollectionExtensions` | 🟢 XML docs. **Not needed on OxyChem**: `Views/_ViewImports.cshtml` already registers the tag helpers (OX-84) |
| Display templates (styles) | `IDisplayTemplateRepository` | 🟢 XML docs: **stored in the database**, so created in the UI, not in C# |
| Blueprints | `IBlueprintRepository` | 🟢 XML docs: **stored in the database**, UI-only |
| Graph | Not required | Official CMS 13 FAQ: Visual Builder "works with server-side MVC rendering without requiring Graph" |

> [!tip] One controller renders every experience, including ones created later in the UI
> `ExperienceData`'s own XML summary: *"Used as model class for Experience content types not defined through code deployment."* So a controller registered for `ExperienceData` also renders experience types an admin creates in the UI later. **You deploy code once; after that, new experience types need no developer.**

## Constraints

| Constraint | Source | Effect on OxyChem |
|---|---|---|
| Elements inside columns can't contain a `ContentArea` | Official CMS 13 FAQ | **Check the whole class hierarchy, not just the block's own file.** `B1HeroBlock` has none in its own file, but its base `HeroImageBlockBase` has 2, so it is **not** an element candidate |
| 🔴 **Elements can't carry a `PropertyList<T>` property** | Found by booting locally, 2026-11-10 (`eed781a`) | **This one crashes the whole site at startup**, not just the element. `ModelSyncInitialization` throws *"The property 'ArticleMediaItems' is not allowed when content type has ElementEnabled"* and the host never starts. Rules out `C8StatsBlock` (`Stats`), `C14ArticleMediaBlock` (`ArticleMediaItems`) and `C24ContactBannerBlock` (`Column*ContactLinks`). Before twinning, check inherited properties against `Logic/Models/Properties/*PropertyDefinition.cs` |
| Forms and Language Manager are not supported in Visual Builder | Official CMS 13 FAQ | Pages with forms stay classic |
| Shared blocks as elements | Official CMS 13 FAQ **contradicts itself** | Test on Integration; it decides how much existing content can be reused |
| One block type in two editing modes | [[work/cms13/visual-builder\|Visual Builder]] | **Never element-enable a live block type.** Create a twin that inherits from it |
| Experiences are not `BasePage` | C# single inheritance | They can't use `_Layout` (`@model PageViewModel<BasePage>`, `where T : BasePage`), so they get their own layout |

## Step 1: branch from `integration`, not `main`

```bash
git fetch origin
git switch -c OX-260-VB-POC origin/integration
```

> [!danger] `main` and `integration` have diverged
> Changes reach `main` by **cherry-pick** from integration PRs, so the two branches never share commit IDs (on 2026-11-10 `main` was 205 commits "ahead" of `integration`). A branch cut from `main` and PR'd into `integration` drags all of those along. And `main` deploys to **Preproduction** (`azure-pipelines-prep.yml`), so **this POC must never be cherry-picked to `main`**.

## Step 2: the experience type

`Logic/Models/Pages/Experiences/LandingExperience.cs`

```csharp
using EPiServer.DataAbstraction;
using EPiServer.DataAnnotations;
using EPiServer.VisualBuilder;
using Oxy.Com.Logic.Models.Pages.Base;

namespace Oxy.Com.Logic.Models.Pages.Experiences
{
	[ContentType(
		DisplayName = "Landing Experience (VB POC)",
		GUID = "5285899e-e42c-4b58-93a1-6dd0e3fc68a9",
		Description = "OX-260 proof of concept. Build the layout in Visual Builder.")]
	[AvailableContentTypes(Availability.Specific, IncludeOn = new[] { typeof(BasePage) })]  // ← without this it never appears in New Page
	public class LandingExperience : ExperienceData                                          // ← NOT BasePage: own controller + layout
	{
	}
}
```

No properties: the editor builds the layout in Visual Builder, so nothing is laid out in code. Always generate a fresh GUID.

**Why `IncludeOn` (added in `ea46929`):** every OxyChem page type declares `[AvailableContentTypes(Availability.Specific, ...)]`, so a parent page only offers the child types that **opt in**. Without the opt-in, the type is registered but invisible in **New Page**, which looks like the deploy didn't work. `IncludeOn = typeof(BasePage)` is the same opt-in `StandardPage` uses: the type can be created under any OxyChem page.

## Step 3: element twins

Inherit from the live block, so you get its properties **and** its existing view component, but register a new content type so the live one is untouched.

`Logic/Models/Blocks/Elements/C31NoticeElement.cs`

```csharp
using EPiServer.DataAbstraction;
using EPiServer.DataAnnotations;
using Oxy.Com.Logic.Models.Blocks.Content;

namespace Oxy.Com.Logic.Models.Blocks.Elements
{
	[ContentType(
		DisplayName = "C31 Notice (VB element)",
		GUID = "5665c19c-73bb-4652-962d-b161b974a367",
		GroupName = ElementGroups.VisualBuilderPoc,                                   // ← "Visual Builder (POC)" group in the block picker
		CompositionBehaviors = new[] { CompositionBehavior.ElementEnabledKey })]      // ← THE flag that makes it an element
	public class C31NoticeElement : C31NoticeBlock                                    // ← inherits every property + the view
	{
	}
}
```

`C31NoticeBlock` sits on `StandardBlockBase` with **no `ContentArea` and no `PropertyList<T>` anywhere in its hierarchy**, which is why it is the one element that survived. `ElementGroups.VisualBuilderPoc` (`"Visual Builder (POC)"`) groups elements in the editor's new-block list.

> [!note] Why only one element? (`eed781a`)
> The first commit also twinned `C8StatsBlock`, `C14ArticleMediaBlock` and `C24ContactBannerBlock`. All three inherit a `PropertyList<T>` property, and CMS 13 **refuses to boot** with one on an element. They were dropped rather than re-modelled. The alternative, turning each list item into its own element so the editor drags in N stat items, is possible later for whichever block a real use case needs.

**Why this reuses the existing views:** OxyChem's blocks render through `AsyncBlockComponent<T>`, for example `C31NoticeBlockController : AsyncBlockComponent<C31NoticeBlock>`. `View(viewModel)` finds its Razor file by the **component's** name, not the model's.

🟡 *Not yet proven at runtime:* that Optimizely's template resolver picks the **base** block's component for the twin. If an element renders blank, add a one-line component per twin.

| Option considered | Verdict |
|---|---|
| Add `ElementEnabled` to `C31NoticeBlock` itself | ❌ Changes a live type used across the site, and creates the two-editing-modes problem |
| Copy the block into a new type | ❌ Duplicated properties and views that drift apart |
| **A twin that inherits from the live block** | 🟢 No change to live content, no new views, one class declaration |

## Step 4: render experiences

`Logic/Controllers/Pages/ExperienceController.cs`

```csharp
using EPiServer.VisualBuilder;
using EPiServer.Web.Mvc;
using Microsoft.AspNetCore.Mvc;

namespace Oxy.Com.Logic.Controllers.Pages
{
	public class ExperienceController : PageController<ExperienceData>
	{
		public ActionResult Index(ExperienceData currentPage)
		{
			return View("~/Views/Pages/Experience.cshtml", currentPage);
		}
	}
}
```

`Views/Pages/Experience.cshtml`

```cshtml
@using EPiServer.VisualBuilder

@model ExperienceData

@{
    Layout = "~/Views/Shared/_ExperienceLayout.cshtml";
}

<epi-outline experience="@Model" class="experience">
    <epi-grid class="experience__section">
        <epi-row class="experience__row">
            <epi-column class="experience__column">
                <epi-component />
            </epi-column>
        </epi-row>
    </epi-grid>
</epi-outline>
```

`Views/Shared/_ExperienceLayout.cshtml` is a trimmed copy of `_Layout`. It keeps what editing and the site chrome need:

- `@Html.RequiredClientResources("Header")` / `("Footer")`, which are how the editor's scripts get onto the page
- `/styles/main.css` and `/bundle.main.js`
- `HeaderComponent` and `FooterComponent`, invoked with no arguments. **Both already accept no page** (`Invoke(BasePage contextPage = null)`)

🟠 **Left out on purpose:** analytics, consent and `MetaDataComponent` (which resolves its page from the route and expects a `BasePage`), and the layout adds `noindex`. Fine for Integration; required before any production use.

## Step 5: build

```powershell
& 'C:\Program Files\dotnet\dotnet.exe' build -nologo -v q --no-incremental
```

`dotnet` on the PATH may still be an old SDK (`G:\dotnet` was .NET 6). The repo's `global.json` asks for `10.0.300` with `rollForward: latestMinor`. *2026-11-10:* 0 errors, with the same 2,115 warnings as the baseline.

## Step 6: deploy to Integration

0. **Terminal**: boot it locally first (see [[#Run it locally (how to demo it)]]). Don't skip this; it's the lesson of 2026-11-10.
1. **Slack / Teams**: tell the team you're merging a POC that **adds 2 content types** to Integration's database. Content types persist even if the code is later removed (see [[work/cms13/removing-unused-properties|Removing Unused Properties]]).
2. **Browser**: open `https://dev.azure.com/OxyChem/EPIServer/_git/OxyChem/pullrequestcreate?sourceRef=OX-260-VB-POC&targetRef=integration`
3. **Azure DevOps**: confirm the target is **`integration`**, then merge.
4. ⏳ **Azure DevOps → Pipelines → `azure-pipelines.yml`**: about **20 minutes**.
5. **If Integration fails to start**: open the merged PR, click **Revert**, complete the revert into `integration`, and read the startup error in the DXP logs ([[work/cms13/debugging-dxp|Debugging in DXP]]). The build does not validate content-type registration; only startup does.

> [!warning] Lessons from the 2026-11-10 failed deploy
> - **Boot it locally first.** A POC that adds content types must start against a local DB copy before it goes near a shared environment. On a slot it costs ~100 minutes of environment lock to learn what a local run shows in seconds. **Proven the next time round:** the local boot showed the `PropertyList<T>` error immediately.
> - **A clean build proves nothing about content types.** The compiler doesn't know CMS rules. Content-type validation (`ModelSyncInitialization`) only runs at startup.
> - **A red pipeline isn't proof of a failed deploy, and a `200` isn't proof of a healthy one.** Check the slot by its own hostname (`<app>-slot.dxcloud.episerver.net`), not via `?x-ms-routing-name=slot` through Cloudflare, which can return the live build.
> - **Check child-type availability.** OxyChem's page types all use `[AvailableContentTypes(Availability.Specific, ...)]`, so a new page or experience type is invisible in **New Page** until it opts in with `IncludeOn` (fixed in `ea46929`).

## Step 7: try it in the editor

Works the same locally (`https://localhost:5000/ui/cms`) or on Integration (`https://int.oxychem.com/ui/cms`, once deployed).

1. **CMS editor → page tree**: right-click any OxyChem page (for example the start page) → **New Page**.
2. **New Page dialog**: choose **Landing Experience (VB POC)**, name it, and create it.
3. **Visual Builder**: add a **section**.
4. **Visual Builder**: inside it, add a **row**, then split the row into **two columns**.
5. **Visual Builder**: in a column, add an element → group **Visual Builder (POC)** → **C31 Notice (VB element)**. Fill in its fields.
6. **Visual Builder**: drop a second C31 Notice into the other column, so the two-column layout is visible.
7. **Visual Builder**: preview, then **publish**. Open the page's URL to see `ExperienceController` render it with the real header and footer.
8. **Visual Builder**: save the layout as a **blueprint**, then create a second Landing Experience from that blueprint.
9. 🟠 **Styles**: they need a display template created in admin first. Skip this live unless you've made one beforehand.

Record the answers in OX-260:

| Question | Result |
|---|---|
| Does each element render with its live block's look? | |
| Do the header and footer render? | |
| Is there a built-in section type, or is a `SectionData` type needed? | |
| Can a **shared** element be dropped into a column? | |
| Can styles and blueprints be created with no code? | |

## Run it locally (how to demo it)

This is the safest way to demo: nothing shared is touched, and it's proven to boot. Eduardo's Windows machine (set up 2026-11-10/11):

1. **Terminal** (`G:\GitKraken\Azure-OxyChem-Repo`): `git switch OX-260-VB-POC`, then `git pull`.
2. **Terminal**: `dotnet run --project Oxy.Com.Web` (uses `Properties/launchSettings.json`, Development environment).
3. ⏳ **Terminal**: wait for `Application started`. About a minute.
4. **Browser**: `https://localhost:5000/` loads the OxyChem home page.
5. **Browser**: `https://localhost:5000/ui/cms` → sign in with Opti ID → follow [[#Step 7: try it in the editor]].

| Requirement | Why | Value |
|---|---|---|
| Database | A local Production copy | SQL Server `localhost` (Windows auth), database `OxyChem_Local` |
| **Port 5000** | The only local host binding in `tblApplicationHost` is `localhost:5000`, and no site is the default, so any other port 404s every page | `launchSettings.json` (gitignored): `https://localhost:5000;http://localhost:5001` |
| Opti ID login | Opti ID only allows these redirect ports: `5000`, `5096`, `6921`, `7595` | user-secrets `EPiServer:Cms:OptimizelyIdentity:{InstanceId,ClientId,ClientSecret}` = PaaS Portal → API → **Opti ID dev key** (1Password vault "OxyChem Int"). An empty `ClientSecret` gives `invalid_client` and a 500 on `/ui/cms` |
| Graph | Boot calls `EnsureSchemaInitializationModule` | user-secrets `Optimizely:ContentGraph:{SingleKey,AppKey,Secret,GatewayAddress}` (Integration values) |

🟠 **Gotchas:** booting rewrites the tracked `modules/_protected/CMS/CMS.zip` and `Shell/Shell.zip`, so **never commit them**. Local site search returns 0 results (the Graph index holds Integration URLs); that's unrelated to Visual Builder. A Production copy holds real form submissions and editor accounts, so keep it on your machine.

## Lunch and learn: demo script (15 minutes)

| Min | Show | Point to make |
|---|---|---|
| 0–3 | A classic OxyChem page in the editor | The developer fixes the layout; editors fill the slots |
| 3–9 | Build a Landing Experience live: section, row, two columns, a C31 Notice element in each | **The editor controls the layout.** No ticket, no deploy |
| 9–12 | Save it as a blueprint, then create a second page from it in seconds | Campaign pages at speed, on-brand by construction |
| 12–15 | The code: 6 files, 120 lines, 0 existing files changed. Show `C31NoticeElement` (an empty class) | **Low adoption cost.** Existing blocks become elements by inheritance; one controller covers every future experience type |

> [!tip] Before you present
> - Boot locally **at least 15 minutes early**, sign in once, and build one throwaway experience, so a first-load delay or an expired login doesn't happen in front of the room.
> - Have a finished experience already published, as a fallback if the live build stalls.
> - Only **one** element type exists (C31 Notice). If someone asks why, that's the `PropertyList<T>` story below. It's a good one.

### Selling points

| Client pain | What Visual Builder changes |
|---|---|
| "Every new landing page needs a developer" | Editors compose layouts from approved elements |
| "Campaign pages drift off-brand" | Blueprints and constrained styles keep them consistent |
| "We paid for the upgrade, what do we get?" | Adoption is **incremental**: one experience type at a time, alongside existing pages |
| "Is this a rebuild?" | No. A live block becomes an element with one class declaration |

> [!warning] Be honest about the limits in a pitch
> Forms don't work inside Visual Builder. Blocks with nested `ContentArea`s, anywhere in their class hierarchy, can't be elements. **Blocks with list properties (`PropertyList<T>`) can't be elements either, and trying crashes the site at boot.** That rules out 3 of the 4 blocks first picked for this POC. Optimizely's own FAQ is inconsistent on shared blocks. Sell it as **new campaign and landing pages built from purpose-made elements**, not "rebuild every page" or "every existing block becomes an element".

## Sources

- Repo evidence: `Azure-OxyChem-Repo`, branch `OX-260-VB-POC`, commits `00bdf53`, `ea46929`, `eed781a`, checked 2026-11-12
- Local boot verification: `eed781a` commit message, 2026-11-10
- Package XML docs: `EPiServer.xml`, `EPiServer.Cms.AspNetCore.TagHelpers.xml`, `EPiServer.Cms.UI.Admin.xml` (all 13.4.0), read 2026-11-10
- [Optimizely CMS 13 FAQ](https://docs.optimizely.com/cms-13/docs/faqs-for-cms-13), GA snapshot 2026-03-31
- Adnan Zameer, [Visual Builder without Graph: MVC rendering on CMS 13](https://www.adnanzameer.com/2026/10/visual-builder-without-graph-mvc-rendering-cms-13.html), 2026-10-07 (tag-helper markup)
- [[work/cms13/visual-builder|Visual Builder]] in this wiki
