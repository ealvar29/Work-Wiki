---
title: "OxyChem: Visual Builder POC Tutorial"
tags:
  - optimizely
  - cms
  - visual-builder
  - oxychem
  - tutorial
---

How to add the **Visual Builder authoring model** (experiences, sections, elements) to an upgraded CMS 13 MVC site **without changing any existing page or block**, using OxyChem as the worked example. Ticket: **OX-260**. Code: branch `OX-260-VB-POC` (`00bdf53` + `ea46929`), 9 new files, 0 changed.

> [!danger] Status 2026-11-10: the first Integration deploy FAILED, cause not yet known
> Package `1.0.374` (deployment `d8bc2ca1`) never became healthy in the DXP slot. Warm-up timed out, the slot returned `503`, and every slot swap failed with *"slot did not respond to http ping"*. **Integration's live site was never affected** (it stayed on the 2026-11-06 build), but the deployment held the environment lock for about 100 minutes.
>
> **The slot wrote no console output at all** (normal boots write ~350 KB), which points at the container never starting rather than a code exception. That's unproven. The POC was reverted from `integration` (`OX-260-revert`) to unblock the team, and the reverted build's deploy is the experiment that tells "our code" from "DXP platform" apart.
>
> **Do not re-merge `OX-260-VB-POC` until it has booted locally.** The steps below are correct as code, but the claim that this is a safe additive deploy is **unverified**.

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
     └─ C8StatsBlock                                     └─ Element (C8StatsElement : C8StatsBlock)
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
using EPiServer.DataAnnotations;
using EPiServer.VisualBuilder;

namespace Oxy.Com.Logic.Models.Pages.Experiences
{
	[ContentType(
		DisplayName = "Landing Experience (VB POC)",
		GUID = "5285899e-e42c-4b58-93a1-6dd0e3fc68a9",
		Description = "OX-260 proof of concept. Build the layout in Visual Builder.")]
	public class LandingExperience : ExperienceData
	{
	}
}
```

No properties: the editor builds the layout in Visual Builder, so nothing is laid out in code. Always generate a fresh GUID.

## Step 3: element twins

Inherit from the live block, so you get its properties **and** its existing view component, but register a new content type so the live one is untouched.

`Logic/Models/Blocks/Elements/C8StatsElement.cs`

```csharp
using EPiServer.DataAbstraction;
using EPiServer.DataAnnotations;
using Oxy.Com.Logic.Models.Blocks.Content;

namespace Oxy.Com.Logic.Models.Blocks.Elements
{
	[ContentType(
		DisplayName = "C8 Stats (VB element)",
		GUID = "c7ff7fb3-92ff-4b6b-86ef-9639f3b61aef",
		GroupName = ElementGroups.VisualBuilderPoc,
		CompositionBehaviors = new[] { CompositionBehavior.ElementEnabledKey })]
	public class C8StatsElement : C8StatsBlock
	{
	}
}
```

The same shape is used for `C24ContactBannerElement`, `C14ArticleMediaElement` and `C31NoticeElement`. All four sit on `StandardBlockBase` with **no `ContentArea` anywhere in their hierarchy**. `ElementGroups.VisualBuilderPoc` (`"Visual Builder (POC)"`) groups them in the editor's new-block list.

**Why this reuses the existing views:** OxyChem's blocks render through `AsyncBlockComponent<T>`, for example `C8StatsBlockController : AsyncBlockComponent<C8StatsBlock>`. `View(viewModel)` finds its Razor file by the **component's** name, not the model's.

🟡 *Not yet proven at runtime:* that Optimizely's template resolver picks the **base** block's component for the twin. If an element renders blank, add a one-line component per twin.

| Option considered | Verdict |
|---|---|
| Add `ElementEnabled` to `C8StatsBlock` itself | ❌ Changes a live type used across the site, and creates the two-editing-modes problem |
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

1. **Slack / Teams**: tell the team you're merging a POC that **adds 5 content types** to Integration's database. Content types persist even if the code is later removed (see [[work/cms13/removing-unused-properties|Removing Unused Properties]]).
2. **Browser**: open `https://dev.azure.com/OxyChem/EPIServer/_git/OxyChem/pullrequestcreate?sourceRef=OX-260-VB-POC&targetRef=integration`
3. **Azure DevOps**: confirm the target is **`integration`**, then merge.
4. ⏳ **Azure DevOps → Pipelines → `azure-pipelines.yml`**: about **20 minutes**.
5. **If Integration fails to start**: open the merged PR, click **Revert**, complete the revert into `integration`, and read the startup error in the DXP logs ([[work/cms13/debugging-dxp|Debugging in DXP]]). The build does not validate content-type registration; only startup does.

> [!warning] Lessons from the 2026-11-10 failed deploy
> - **Boot it locally first.** A POC that adds content types must start against a local DB copy before it goes near a shared environment. On a slot it costs ~100 minutes of environment lock to learn what a local run shows in seconds.
> - **A red pipeline isn't proof of a failed deploy, and a `200` isn't proof of a healthy one.** Check the slot by its own hostname (`<app>-slot.dxcloud.episerver.net`), not via `?x-ms-routing-name=slot` through Cloudflare, which can return the live build.
> - **Check child-type availability.** OxyChem's page types all use `[AvailableContentTypes(Availability.Specific, ...)]`, so a new page or experience type is invisible in **New Page** until it opts in with `IncludeOn` (fixed in `ea46929`).

## Step 7: try it in the editor

1. **Integration CMS → `/ui/cms` → New Page**: choose **Landing Experience (VB POC)**.
2. **Visual Builder**: add a section, add a row with two columns, and drag in **C8 Stats (VB element)** and **C31 Notice (VB element)**.
3. **Visual Builder**: try styles, then save the layout as a blueprint and create a second page from it.

Record the answers in OX-260:

| Question | Result |
|---|---|
| Does each element render with its live block's look? | |
| Do the header and footer render? | |
| Is there a built-in section type, or is a `SectionData` type needed? | |
| Can a **shared** element be dropped into a column? | |
| Can styles and blueprints be created with no code? | |

## Optional: run it locally instead

`docs/local-setup.md` in the repo: *"There is no shared local DB and no seed script."* You need SQL Server 2022 (Developer edition is free), SqlPackage (`dotnet tool install -g microsoft.sqlpackage`), a `.bacpac` export from the DXP portal, and the connection string set with `dotnet user-secrets set "ConnectionStrings:EPiServerDB" "..."` (never committed). The docs specify an **Integration** restore; a Production copy contains real Forms submissions and editor accounts, so get agreement first.

## Lunch and learn: demo script (15 minutes)

| Min | Show | Point to make |
|---|---|---|
| 0–3 | A classic OxyChem page in the editor | The developer fixes the layout; editors fill the slots |
| 3–9 | Build a Landing Experience live: section, row, two columns, drag in elements | **The editor controls the layout.** No ticket, no deploy |
| 9–12 | Save it as a blueprint, then create a second page from it in seconds | Campaign pages at speed, on-brand by construction |
| 12–15 | The code: 9 files, 160 lines, 0 changed | **Low adoption cost.** Existing blocks become elements by inheritance; one controller covers every future experience type |

### Selling points

| Client pain | What Visual Builder changes |
|---|---|
| "Every new landing page needs a developer" | Editors compose layouts from approved elements |
| "Campaign pages drift off-brand" | Blueprints and constrained styles keep them consistent |
| "We paid for the upgrade, what do we get?" | Adoption is **incremental**: one experience type at a time, alongside existing pages |
| "Is this a rebuild?" | No. A live block becomes an element with one class declaration |

> [!warning] Be honest about the limits in a pitch
> Forms don't work inside Visual Builder. Blocks with nested `ContentArea`s, anywhere in their class hierarchy, can't be elements. Optimizely's own FAQ is inconsistent on shared blocks. Sell it as **new campaign and landing pages**, not "rebuild every page".

## Sources

- Repo evidence: `Azure-OxyChem-Repo`, branch `OX-260-VB-POC`, commit `00bdf53`, checked 2026-11-10
- Package XML docs: `EPiServer.xml`, `EPiServer.Cms.AspNetCore.TagHelpers.xml`, `EPiServer.Cms.UI.Admin.xml` (all 13.4.0), read 2026-11-10
- [Optimizely CMS 13 FAQ](https://docs.optimizely.com/cms-13/docs/faqs-for-cms-13), GA snapshot 2026-03-31
- Adnan Zameer, [Visual Builder without Graph: MVC rendering on CMS 13](https://www.adnanzameer.com/2026/10/visual-builder-without-graph-mvc-rendering-cms-13.html), 2026-10-07 (tag-helper markup)
- [[work/cms13/visual-builder|Visual Builder]] in this wiki
