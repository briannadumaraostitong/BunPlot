# BunPlot — Claude Code Guide

## Project Overview
BunPlot is a visual story timeline planner for writers. Think Plottr meets Notion.
Built with: Next.js 16 (16.2.6, App Router), TypeScript, Tailwind CSS v4, shadcn/ui (Nova preset, Radix), Supabase.

## Folder Structure
- `app/` — Next.js App Router pages: `(app)/` (signed-in app), `(auth)/` (login, signup), `page.tsx` (landing page)
- `app/themes/` — per-theme stylesheets (`classic.css`, `cyberpunk.css`, `manuscript.css`), keyed on `[data-theme]` and `data-slot` hooks
- `components/` — UI components (ui/, timeline/, layers/, events/, layout/, projects/, characters/, places/, outline/, panels/, editor/, settings/, theme/, hud/, landing/, brand/, auth/)
- `hooks/` — React hooks (useLayers, useEvents, useChapters, usePanels, useStatuses, useSearch, …)
- `actions/` — Next.js server actions (projects, layers, events, chapters, …)
- `types/database.ts` — All TypeScript types
- `lib/supabase/` — client.ts and server.ts
- `lib/themes.ts` — theme definitions (single source of truth for color tokens, shape, radius, texture, fonts and frames)
- `lib/frames.ts` — the Nightcity frame registry (files, sizes, content slots)
- `lib/brand.ts` — the logo files per theme (`LOGO_SRCS`) and the app icons' file (`APP_ICON_SRC`)
- `lib/theme.config.ts` — layer color palette (`LAYER_COLORS`), also the default character colors
- `lib/initialsInk.ts` — readable initials on character avatars (`initialsInk`) and the Manuscript seal's ink mix (`sealShare`)
- `supabase/schema.sql` — full database schema
- `ASSETS.md` — every third-party asset with its license
- `design/landing/`, `design/landing-manuscript/`, `design/landing-classic/` — the landing page design handoffs (`HANDOFF.md`) and mockups for Cyberpunk, Manuscript and Classic (light and dark); a reference, not code

## Design System

### Personality
BunPlot should feel like a **professional creative tool** — calm, focused, and distraction-free.
Think: dark writing app meets visual planning tool. Not flashy. Not corporate.
Inspired by: Plottr, Notion, Linear, iA Writer.

### Typography
- Fonts come from the theme: Classic uses Figtree (body and UI), Bricolage Grotesque (headings) and Geist Mono (code/hex values); Cyberpunk uses Chakra Petch and JetBrains Mono; Manuscript uses Literata, Courier Prime and Cormorant Garamond. Always use `font-sans` / `font-mono` / `font-heading`, never a font name
- `font-heading` is the heading role: page and section headings only, never card titles. In Cyberpunk it's its sans, so adding it changes nothing there; Classic sets it in Bricolage Grotesque (800, -0.025em on page titles), Manuscript in Cormorant. In-app page titles carry `font-heading` plus `data-slot="page-title"` (the dashboard's is `page-heading`)
- Hierarchy: use font-weight and size, not color, to create hierarchy
- Body text: text-sm (14px)
- Labels/meta: text-xs (12px)
- Tiny labels: text-[10px] or text-[11px]
- Headings inside modals: text-lg font-semibold
- Uppercase is for interface text only (labels, headings, buttons, tags), never user content: chapter, layer, character and place names keep the case the writer typed. Apply it with CSS (`uppercase`), so the source text keeps its case

### Colors
- Never hardcode colors — always use CSS variables via Tailwind
- Background layers (darkest to lightest in dark mode):
  - Page bg: `bg-background`
  - Card/panel: `bg-card`
  - Sidebar: `bg-sidebar`
  - Elevated: `bg-secondary/20` or `bg-secondary/30`
- Text: `text-foreground` (primary), `text-muted-foreground` (secondary)
- Borders: `border-border` always. The global `* { border-color }` rule sits in `@layer base`, so border-color utilities override it
- Accent: always `hsl(var(--accent))` — never hardcode blue/purple/green
- Links: `text-link` (`--link`), which every theme defines; in Classic the accent is the primary (chocolate in Light), so links have their own slate
- Destructive: `text-destructive` / `bg-destructive/10`

### Accent Colors (per theme)
Each theme defines three accents in `lib/themes.ts`: `--accent` (primary actions), `--accent-2` and `--accent-3` (highlights, a third storyline color). Classic: `--accent` is the primary (chocolate in Light, powder blue in Dark), `--accent-2` powder blue (Light) or slate (Dark), `--accent-3` taupe. Cyberpunk: hot pink, cyan, violet. Manuscript: oxblood, ink blue, olive. Use the tokens, never the values.

### Themes
Themes are defined in `lib/themes.ts`: Classic Light, Classic Dark, Cyberpunk and Manuscript, plus the System setting (`sync`, Classic Light or Dark by OS setting). Saved ids of removed themes map to a current one through `normalizeThemeSetting()` (the old `parchment` is Manuscript). The setting lives in the profile (`profiles.theme`) and, as this device's copy, in localStorage (`THEME_STORAGE_KEY`). Signed in, the profile's wins: the `(app)` layout's ThemeScript applies it before paint on a full load, login applies it before navigating, and `AppShell` catches anything else. The exception is a change whose save failed (`THEME_UNSYNCED_KEY`): it stays on this device and is retried on the next load. Don't add a `loading.tsx` directly in `app/` or `app/(app)/`: it would let the page body, and with it the `(app)` layout's ThemeScript, stream after `<head>`, bringing back a theme flash on fresh devices. Besides its color tokens, each theme sets:
- `shape`: `'rounded'` (corners from `--radius`) or `'cut'` (square, with chamfered corners on opted-in surfaces)
- `radius`: the theme's `--radius` (Classic: 10px, Manuscript: 3px)
- `texture`: `'none'`, `'grid'` (a faint grid on `body` and `.bg-texture` page backgrounds; cards stay solid) or `'ruled'` (ruled-paper lines; kept, but no theme uses it)
- `fonts`: the `next/font` variables (`app/layout.tsx`) for sans, mono and heading
- `frames`: `'nightcity'` or `null`, the decorative frame set for a few feature spots

`ThemeScript` (before paint), `applyTheme()` and `ThemeScope` put these on the element as `data-theme`, `data-shape`, `data-texture` and `data-frames` (`none` when null). Style against them in CSS, never by branching on the theme id in components: the server doesn't know the visitor's theme (it's in localStorage), so theme-dependent markup would mismatch on hydration.
- Tailwind variants (`app/globals.css`): `cut:` for themes with the cut shape (e.g. to drop a hover shadow that the clip-path cuts off); `frames:` and `plain:` for a framed spot shown as its frame or as its plain look; `dark:` for dark themes. All follow the nearest setting, so a ThemeScope inside a page with a different one gets its own (see the nearest-theme guard below)
- Cut corners: dialogs, sheets and buttons are cut automatically (`rounded-full` ones stay round; menus and popovers stay square). Cards opt in with `corner-cut` (16px) or `corner-cut-sm` (8px), next to their `rounded-*` class for the rounded shape. The border continues along each chamfer as a diagonal; a 2px border needs `[--cut-bw:2px]`
- Per-theme restyles go in that theme's stylesheet in `app/themes/`, keyed on `[data-theme="…"]` and `data-slot` hooks in the components (`event-card`, `field-label`, `panel-heading`, `status-tag`, `project-tabs`, …). Add a hook rather than a theme-specific class. A restyle for one theme must leave the others pixel-identical; check by comparing screenshots before and after
- Shared mono label style: form labels use the Form Fields label style plus `data-slot="field-label"`, which Cyberpunk and Manuscript render as their mono label (event dialog, character and place panels, auth forms)
- Nearest-theme guard: the visitor's own theme sits on `<html>`, and a ThemeScope (the landing, login, signup) can put another inside it, so theme rules must apply only for the nearest theme. Every rule in a theme stylesheet that styles something inside the theme element ends in `:where(:not([data-slot="theme-scope"]:not([data-theme="…"]) *))` (Classic's shared rules use `[data-theme^="classic"]`), so it stops at a ThemeScope of another theme. It's in `:where()`, so it adds no specificity. The cut-shape and texture rules in `globals.css` do the same on `data-shape` and `data-texture`. Put the guard on every new theme rule

#### Classic (`app/themes/classic.css`)
Classic Light and Classic Dark, built to `design/landing-classic/` ("milk chocolate and powder blue"): one look, two palettes. Light: cream `#FCF7DF` page, `#FFFDF3` cards, chocolate `#3E3630` ink and primary, slate `#4A6478` links. Dark: deep chocolate `#26201C` page, `#332B26` cards, cream ink, powder-blue `#C7D3DB` primary and links. Figtree for UI and body, Bricolage Grotesque 800 for headings, Geist Mono. Rounded at 10px, no texture, no frame set. Values no token covers are variables in its stylesheet: the landing's `--strip*` and `--band*`, `--tag-blue` and `--tag-neutral` (with `-ink` text colors), `--taupe`, `--card-shadow` and the event-card tints.
- Its rules cover all three Classic ids: `classic-light`, `classic-dark` and the device-following `classic` (see ThemeScope). Only the variable blocks differ by mode, and each Dark block has a copy for `classic` under `prefers-color-scheme: dark`; keep the copies in step
- No pills: chips, counts, status tags, relationship labels and badges have 5px corners (half the radius), and so does the switch. `data-chip` marks a pill-shaped chip with no hook of its own; add it to new ones. Round things stay round: dots, swatches, avatars, icon buttons, thin bars
- Cards (`project-card`, `place-card`, `panel-card`) take the 10px radius and the soft `--card-shadow`, stronger on hover
- Page titles (`page-title`, `page-heading`) in Bricolage 800 at -0.025em. Section labels (`section-label`) are the handoff's eyebrows: Figtree 700, 13px, uppercase, 0.09em, muted, no background; panel headings and the timeline's corner label take the same weight and spacing
- Event cards are tinted with the event's color (see Event Cards). Lane names (`lane-label-name`) are in ink, after an 8px swatch in `--layer-color`
- Statuses: the stored default Outline color (`#6366F1`) shows as a dusty plum (`#7A4E6B` Light, `#C9A3BC` Dark) through `data-status-color` on status tags and on the status picker's and filter's dots; the picker's color input keeps the stored value. A status tag's text is 40% status color mixed into 60% ink
- Menus (dropdown, menubar, select) highlight in the neutral tag color with ink, not the solid primary. The active `nav-item` gets the neutral tag color, ink text and a short 3×14px marker in the primary color at its left
- A project without a cover shows its name in Bricolage on the blue tag color (`project-cover`, `cover-picker`, the `title-page` hooks); places keep their own placeholder
- No stars (★) anywhere, the landing included: list markers are small taupe squares

#### Manuscript (`app/themes/manuscript.css`)
Paper and ink, built to `design/landing-manuscript/`: paper `#F3EBDA` background, `#FBF7EE` cards, oxblood `--accent` (also `--primary`), ink-blue `--accent-2`, olive `--accent-3`, rust `--destructive`. Literata for UI and body, Courier Prime for labels and counts, Cormorant Garamond for headings. Rounded at 3px, plain paper (`texture: 'none'`: no page texture, no ruled lanes), no frame set. Values no token covers are variables in its stylesheet: `--index-card` (`#FFFDF7`), `--paper-shadow`, `--rule` (`#BFAA82`), and the landing's `--heading-ink`, `--rule-light`, cloth, gilt and seal colors.
- Labels: Courier Prime 700 at 11px, uppercase and letter-spaced, in the muted color. Folder names are user content and keep Literata
- Event cards (grid, flow, drag preview) and the event dialog are plain index cards (`--index-card`, a 1px border) with a small notched bookmark ribbon in the event's color at the top right (`::after`), not a colored top rule. Titles are in ink; the ribbon carries the layer
- Character nodes are plain paper cards (the avatar carries the color); place cards mark their color with a dot before the type label
- A card without a cover (projects, places) shows a title page: `components/theme/CoverTitlePage.tsx` (the name in Cormorant italic over a small oxblood fleuron), hidden unless the theme shows it through the `title-page` hooks; other themes keep their own placeholder
- Frame spots use restyled plain looks: the character panel's portrait is a wax seal (`character-portrait`: the seal's scalloped mask, the character's color mixed with ink so the cream initials reach 4.5:1, a darker inner ring). The mix is 45% ink for every default color and more, worked out per color, for pale ones (see Character Avatars), the dashboard's empty state a double-ringed icon (`dashboard-empty`), the project stats a catalog card with dotted leaders (`project-stats`, `stat-row`)

#### ThemeScope (`components/theme/ThemeScope.tsx`)
Renders its children in a given theme, whatever the visitor's own, without touching their stored setting: tokens, fonts and radius as CSS variables, plus the `data-*` attributes. Server-rendered, so there's no flash. Use it for pages with their own look: the landing page (`app/page.tsx`) and login/signup (`app/(auth)/layout.tsx`), each in the theme its `THEME` constant sets. Portals (dialogs, toasts) render outside it and keep the visitor's theme. One level of nesting is supported.
- Besides the fixed theme ids it takes a device theme (`DEVICE_THEMES` in `lib/themes.ts`): `'classic'` is Classic Light or Classic Dark by the visitor's `prefers-color-scheme`. It's chosen in CSS (`data-theme="classic"` and a generated stylesheet with each mode's tokens and `color-scheme`, which also gives `<html>` that mode's background for overscroll), so the server needn't know the device's setting and nothing flashes or mismatches on hydration. The logo, `classic.css` and the `dark:` variant follow it. Both modes of a device theme must share one look (shape, fonts, radius, frames); only colors switch
- The landing, login and signup use `'classic'`: signed-out visitors see Classic matching their device, whatever theme they have stored

#### ThemeFrame (`components/hud/ThemeFrame.tsx`)
A framed spot that follows the theme's `frames` setting: under `'nightcity'` it's that frame (from `lib/frames.ts`) at its own aspect ratio, with content in the frame's measured slots (`<ThemeFrameSlot frame="…" slot="…">`); without a frame set it falls back. Both looks are in the markup and CSS picks one; the frame image is lazy and hidden in the plain look, so plain themes never download it. Classes for one look only go under `frames:` or `plain:`.
- `plain="card"` (default): the plain look is a token card built from the slots (the landing page)
- `plain="none"` with `fallback`: the plain look is the spot's existing markup, unchanged (an `EmptyState`, an avatar, a stats box), so Classic stays exactly as it was. `minWidth` (a fixed list: 280, 320) also shows the fallback when the spot is narrower than that
- Use frames for a few feature spots only, never for everyday cards (those use `corner-cut`). Today: the landing page, the dashboard's empty state, the project dialog's stats and the character panel's portrait. A theme without a frame set can restyle these plain looks in its stylesheet (Manuscript does). Never stretch a frame; size it by width and let the aspect ratio set the height

#### HUD pieces (`components/hud/`)
`HudPanel` (the CSS panel with a header bar and progress bar; it grows with its content), `BannerStrip` and `Eyebrow` (`01 — LABEL`). Colors no token covers are `--hud-*` variables in `components/hud/hud.css`, with token stand-ins for other themes.

### Brand
- The logo files are named in one place, `lib/brand.ts`. `LOGO_SRCS` maps each theme to its logo's file, and themes can share one. Each theme has its own, `public/brand/bunplot-logo-{classic-light,classic-dark,cyberpunk,manuscript}.svg`: the bunny in round sunglasses, square (one viewBox for all four), drawn in the theme's ink (Classic Light's chocolate on a cream face, Classic Dark's cream, Cyberpunk's cyan, Manuscript's ink) with the glasses in its accent (chocolate, powder blue, hot pink, oxblood). The artist's sources, with 1024px transparent PNGs, are in `design/logo-final/`. Inside a `'classic'` ThemeScope, CSS picks the light or dark one by the device's setting. A theme's own logo means adding its file under `public/brand/` and pointing that theme's entry at it
- Show it with `components/brand/Logo.tsx` (`size`, `wordmark`, `wordmarkClassName`, `preload` above the fold), never an `<img>` of a file. It renders one image per distinct file and CSS shows the one for the nearest `data-theme` (`<html>` or a ThemeScope), so there's no theme state and no flash; hidden ones are lazy and never download. With more than one file (as now), `preload` is ignored for that reason and the logos load lazily
- The wordmark is styled per theme through `data-slot="wordmark"`. Classic sets it in Bricolage 800 at -0.025em (the size from `wordmarkClassName`); Manuscript sets it in Cormorant 700 at `--wordmark-size` (24px by default); a spot with its own size sets the variable on the `Logo` (the Manuscript landing's nav and footer)
- The app icons are one version for every theme: the browser asks for them without knowing the visitor's theme. It's Classic Light's logo, Classic being the default look. `app/icon.svg` is a copy of its file (browsers that take SVG favicons use it; keep it in step with `APP_ICON_SRC`), and `app/icon.tsx` (a 32px PNG, for the rest) and `app/apple-icon.tsx` (180px, on Classic Light's cream with a margin, since iOS fills transparency with black) are generated from `APP_ICON_SRC`. There's no web manifest, so no PWA icons

### Third-party assets
- `ASSETS.md` lists every third-party file BunPlot ships, with author, source, license and changes. Add a row whenever you add one
- The Nightcity frames (`public/frames/`, CC BY 4.0) require the credit line in `components/brand/AssetCredit.tsx`, shown in the Cyberpunk landing's footer and in Settings → Appearance. Keep both as long as the frames are used, and don't imply their creator endorses BunPlot. The Classic and Manuscript landings show no frames, so their footers credit their fonts instead (same `#credits` anchor). The Classic logos and Manuscript's ornaments are original, so they need no `ASSETS.md` rows (the fonts are listed with the UI fonts)

### Landing Page
- `app/page.tsx`: signed-out visitors only (`proxy.ts` sends signed-in ones on `/`, `/login` and `/signup` to `/dashboard`). Its theme is the `THEME` constant, applied through a ThemeScope: `'classic'`, Classic Light or Dark as the visitor's device is set (see ThemeScope and Pending Features). To try another theme's landing, change `THEME` locally here and in `app/(auth)/layout.tsx`
- Each theme has its own landing, picked from `LANDINGS` in `app/page.tsx`: its sections in `components/landing/<theme>/` (layouts, decoration, numbering style, case), on the copy and example data in `components/landing/content.ts`, which every theme shares. Copy only one theme has stays in its components. The landing's theme is chosen on the server, so `page.tsx` can branch on it; the app can't (see Anti-patterns)
- Classic sections, in order (`components/landing/classic/`; `ClassicLanding` serves `classic`, `classic-light` and `classic-dark`): nav, hero (an app window with three dots, a Timeline tag, lanes of event tags and a progress bar), parts strip (`PartsStrip`: the six parts, each an icon tile, name and hint), Why BunPlot (an event card with a Drafted tag), Features (an outline page, Ilsa's card with a round avatar plus a relationships card, three export cards; taupe square list markers), Also in BunPlot ("And a few more things": four cards with icon tiles), About (the note, a project summary card with three tags), sign-up band (powder blue, with a New project dialog and a card offset behind it), footer with the font credit (`#credits`). Section labels are unnumbered eyebrows, and feature labels join their parts with "and" ("Timeline and Outline"; the other themes use "+" and "&"). Where the mockups and `HANDOFF.md` differ, the handoff wins (no stars, a Bricolage wordmark)
- Cyberpunk sections, in order (`components/landing/cyberpunk/`): nav, hero (with a `HudPanel`), banner strip, Why BunPlot (`#why`, modal frame), Features (`#features`: three rows with the primary frame, the portrait frame plus a relationships card, and three plates), Also in BunPlot (four cut cards), About (`#about`, terminal frame), sign-up band, footer with the asset credit (`#credits`). Every theme's landing keeps the same sections and anchors
- Manuscript sections, in order (`components/landing/manuscript/`): nav, hero (a ledger sheet with a bookmark ribbon, ruled body and double red margin line), contents banner ("I. Timeline … VI. Exports" between full-bleed double rules), Why BunPlot (an event index card with a paperclip and a DRAFTED stamp, which drops below the fields on phones), Features (a manuscript page with a drop cap, a cameo plus a relationships card, three cloth-bound books), Also in BunPlot ("The rest of the desk": four ruled, slightly tilted index cards), About (a letter with a wax seal, a catalog card), sign-up band on the darker paper, footer with the font credit (`#credits`). Section numbers are Roman ("Chapter I · Why BunPlot")
- Ruled lines appear only inside specific landing cards: the hero ledger, the Why event card and the desk cards. Never on the page, in lanes or in the app. Tilted cards are for the landing only, never the app. The Cyberpunk and Manuscript landings' cards keep their colored top rules, as in their handoffs
- Built to the mockup in `design/landing/` at 1280, 768 and 390px (Manuscript: `design/landing-manuscript/`; Classic: `design/landing-classic/`, whose mockups have no border-box sizing, so their padded flex bases are converted): `components/landing/layout.ts` holds the content width shared by every theme (1248px: the mockup's 1200px content box plus padding), and `<theme>/styles.ts` each theme's shared styles; the page sets `leading-[normal]` because the design sets line heights only where it needs them
- In a theme's sections, build a string that mixes copy and values as one template literal (`` {`${n} chapters · ${m} events`} ``), not as JSX text around expressions: separate text nodes can shape slightly differently
- The banner strip (`BannerStrip`) is full-bleed in every theme: its background and top and bottom lines span the page edge to edge, while its items stay in the 1248px content column (`contentClassName={CONTAINER}`), the first starting at the column's left edge and the last ending at its right, with no inset of their own. Lines: 3px `--accent` on top, 2px `--accent-2` at the bottom, no side edges (Cyberpunk: pink over a dark bar, cyan under it). Manuscript's contents banner keeps that layout. Classic's strip doesn't: a solid `--strip` band (chocolate in Light, slate in Dark) with no lines, its six items in the mockup's equal grid columns inside the content column
- Mock UI in the sections is a picture (`role="img"` with an `aria-label`), not working controls
- Keep the placeholders visible until the owner replaces them: the About paragraph and the example numbers. The example project title (`The Drowned Bridge`) and the owner name (`Brianna Titong`, in the About signature and the footer) are final
- Login and signup (`app/(auth)/`) share the landing's look. The layout's `THEME` reaches the client pages through `AuthThemeProvider` (`components/auth/AuthTheme.tsx`); `AuthShell` picks that theme's shell (`ClassicAuthShell`: the form in a card like the hero's app window, with three dots and the panel title as a sentence-case tag; `CyberpunkAuthShell`: the form in a `HudPanel`; `ManuscriptAuthShell`: the form on a paper sheet with a ribbon), and `useAuthLook()` gives the classes that differ by theme in the forms (footer link, button case and weight; Classic: underlined `--link` links, buttons in their own case, weight 800). The wording is "Log in" and "Sign up", as on the landing page

### Spacing & Radius
- Border radius: `rounded-lg` (panels), `rounded-xl` (modals/cards), `rounded-full` (dots, avatars, chips; Classic gives chips and tags 5px corners instead); all square under the cut shape except `rounded-full`
- Padding inside panels: `p-4`
- Padding inside modals: `px-5 py-3`
- Gap between items: `gap-2` (normal), `gap-1.5` (tight), `gap-4` (loose)

### Component Patterns

#### Buttons
- Primary action: `<Button size="sm">` — uses accent color
- Destructive: `variant="ghost"` with `className="text-destructive hover:bg-destructive/10"`
- Icon buttons: `size="icon"` with `h-7 w-7` or `h-8 w-8`
- Never use large buttons — always `size="sm"` or `size="icon"`. The one exception is the landing page (`app/page.tsx`), whose call-to-action links follow each theme's design handoff (`components/landing/<theme>/cta.ts`); everywhere in the app keeps `size="sm"`

#### Modals / Dialogs
- Width: `sm:max-w-4xl` for complex modals, `sm:max-w-md` for simple ones
- Background: `bg-card` (solid, never transparent)
- Overlay: `bg-background` (solid, not `bg-black/50`)
- Always include `DialogTitle` and `DialogDescription` (use `sr-only` if visually hidden)
- Layout: sidebar metadata (left, `w-56`) + content area (right, flex-1)

#### Form Fields
- Label style: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`, with `data-slot="field-label"` (see Themes)
- Input height: `h-8` for compact fields, default for normal
- Always add `bg-background` to inputs inside panels

#### Status Tags
- Shape is per theme. Classic: small tags with 5px corners, no pills (see Classic). Cyberpunk: small square mono tags (`app/themes/cyberpunk.css`, `data-slot="event-card-status"`). Manuscript: square Courier tags, the status color at 18% over the surface behind ink text
- Default colors per status (seeded for each new project, `seed_default_statuses()` in `supabase/schema.sql`; writers can recolor them):
  - draft: zinc `#71717a`
  - outline: indigo `#6366F1` (Classic shows it as a dusty plum)
  - written: amber `#F59E0B`
  - revised: violet `#8B5CF6`
  - final: emerald `#10B981`

#### Panels / Sidebars
- Left sidebars: fixed width with `shrink-0`, `border-r border-border`
- Always add `scrollbar-thin` to scrollable areas
- Collapsible panels use chevron icons (`ChevronLeft`/`ChevronRight`)

#### Event Cards (on timeline)
- Colors come from the `--event-color` CSS variable (never inline color styles), with `data-slot="event-card"` hooks so a theme stylesheet in `app/themes/` can restyle them
- The base markup, which each theme restyles: a left accent border `border-l-3 border-l-(color:--event-color)` (last in `cn()` so tailwind-merge keeps it), a faint tint `bg-(--event-color)/[9.41%]`, the title in the layer color, `rounded-lg` (square under the cut shape), hover `hover:brightness-110 hover:shadow-md`
- Classic: the whole card tinted, the event color mixed into the card (22% Light, 30% Dark), a 1px border in a deeper mix (45%, 55%) and no left bar, the title in ink, the description and the flow card's chapter (`event-card-meta`) in ink at 90%. Hover deepens the tint (30%, 34%) instead of the brightness filter. Dark's status fill is 25%, so every layer color and status passes 4.5:1, hovered too
- Cyberpunk: a flat surface, a foreground-colored title and a straight 3px left bar in the layer color. Manuscript: an index card with a bookmark ribbon instead of the left bar (see Manuscript)
- Show: title (truncated), description preview (stripped HTML, 80 chars max), status tag
- Selected state is per theme. Classic and Manuscript: `ring-2 ring-offset-1 shadow-lg` (Classic's border also takes the full event color). Cyberpunk: a 2px `--accent-2` (cyan) outline, no ring or shadow

#### Character Avatars
- Initials sit on the character's color (`character.color`, `#6366F1` when missing). Their color is `--initials-ink` from `initialsInk()` (`lib/initialsInk.ts`): white where it reaches 4.5:1, else the color darkened until it does. Set it inline on the avatar, which carries `data-slot="character-avatar"`, and each theme's stylesheet applies it. All 12 default colors (`LAYER_COLORS`) take the dark shade; even indigo is 4.47:1 in white
- Manuscript's panel portrait is the wax seal (`character-portrait`): `sealShare()` sets `--seal-share`, the color's share of the seal's mix with ink, 55% for every default color and less for pale ones (yellows, pale limes, near-whites), so the cream initials reach 4.5:1. It checks both the browser's unrounded mix and the whole-number colors on screen
- A new avatar spot gets the hook and the variable, never fixed white initials

#### Layer Panel
- Width: `w-52` (expanded), `w-10` (collapsed)
- Color dot: `h-3 w-3 rounded-full` — clickable to open native color picker
- Double-click layer name to rename inline
- Trash icon only shows on hover, hidden for `type === 'main'`

### Dark Mode
- All components must work in both light and dark mode
- Use `dark:` variants for any hardcoded colors (e.g. status tag colors). `dark:` follows the nearest theme: a `.dark` element (`<html>` or a dark ThemeScope) unless a ThemeScope that isn't dark sits in between, and a `'classic'` ThemeScope on a dark device
- Never use `bg-white` or `bg-black` — always use CSS variables

### Anti-patterns (never do these)
- No `bg-white` or `bg-black` hardcoded
- No large buttons — always `size="sm"` (landing page excepted, see Buttons)
- No bullet point lists in UI copy — use prose (the landing page's feature rows are the exception: each has three short points, as in the design handoff)
- No excessive bold/headers — use weight hierarchy instead
- No `backdrop-blur` on overlays — use solid `bg-background`
- No dashed borders (`border-dashed`, `borderStyle: 'dashed'`) except on areas where you drag and drop files, and on selection outlines in the sketch tool. Empty and error states use `EmptyState` (icon circle, no box), or `LoadError` for failed loads
- No `border` shorthand in inline styles — use individual borderWidth/Color properties
- No `h-[600px]` arbitrary values — use Tailwind scale (`h-160`)
- No `flex-shrink-0` — use `shrink-0`
- No `[&:empty]` — use `empty:` shorthand
- No hardcoded accent colors — always use `hsl(var(--accent))`
- No theme checks in components (`theme === 'cyberpunk'`) — use the theme stylesheet, `data-slot` hooks and the `cut:` / `frames:` / `plain:` variants. The exceptions are the pages whose theme the server sets: the landing (`LANDINGS` in `app/page.tsx`) and the auth shells (`AuthShell`, from the auth layout's `THEME`)
- No one-sided colored stripe (a left or top accent bar) on a rounded card, row or nav item, in any theme: the stripe bends around the corners, and that's what looks AI-made. A square-cornered theme may use a straight edge bar deliberately (Cyberpunk's event-card left bar and its nav marker), and a short marker tab that doesn't run along a rounded edge is fine (Classic's active nav item)
- No pills and no stars in Classic: tags have 5px corners, list markers are small taupe squares (see Classic)
- No theme-stylesheet rule without the nearest-theme guard (see Themes)
- No colored top rules on cards in the app in Manuscript: event cards and the event dialog use the bookmark ribbon, character nodes stay plain, place cards use a color dot (the landing's cards keep theirs, as in the handoff)
- No ruled lines outside the landing cards that have them (see Landing Page), and no tilted cards outside the landing
- No `//` prefixes on labels in any theme (eyebrows, header labels, CSS `content` labels): the label alone in its mono style, or `01 — Label` for a numbered one. The HUD panel's pink slashes are a graphic, not text, and stay

## Key Files to Read First
When working on a new feature, always read these first:
1. `types/database.ts` — understand the data model
2. The relevant component file
3. The relevant action file in `actions/`
4. The relevant hook in `hooks/`

## Database Notes
- All tables have RLS enabled
- Use `as never` cast on Supabase `.insert()` and `.update()` calls due to untyped client
- `owns_project()` helper function checks project ownership for RLS
- Realtime subscriptions are set up in `useLayers.ts`, `useEvents.ts`, `useChapters.ts`

## Current Features
- Auth (Supabase email/password), with login and signup pages in the landing's theme
- Landing page at `/` for signed-out visitors, with a landing per theme (Classic, Cyberpunk, Manuscript); visitors see Classic, light or dark as their device is set
- Projects with create/delete/archive/duplicate, project folders
- Layers with color picker, rename, delete, visibility toggle, drag reorder
- Chapters as timeline columns (add, rename, delete, resizable)
- Events with rich text description/notes, status, color, duplicate, drag reorder; timeline filters
- Event modal: metadata sidebar + tabbed rich text editor with toolbar
- Characters (relationship maps, family trees), places, outlines, storyboard panels, exports (PDF/Word), search
- Settings: profile, appearance (theme picker, asset credit), sound
- Themes: Classic Light, Classic Dark, Cyberpunk and Manuscript, plus System (see Themes)

## Known Issues
- Cyberpunk landing hero, font-swap layout shift (CLS 0.0349 on a first, uncached visit): where the hero's text column is 467–506px wide (side by side with the panel, e.g. 1280px), "PLOT EVERY" fits on one line in Chakra Petch (467px) but not in next/font's metric-matched fallback (506px). The title is three lines until the font arrives, then two, so the hero shrinks by 72px and the panel and banner strip jump up. Cyberpunk's fonts aren't preloaded (`app/layout.tsx`). Fix it with the returning-visitor landing (see Pending Features), when Cyberpunk visitors start seeing this page; the candidate is a Cyberpunk heading fallback, an `@font-face` on the local Arial Bold scaled to about 94.6% (102.51% × 467/506), so the fallback title fits on two lines too.

## Pending Features
- Event connections/linking
- Returning visitors in their own theme: the landing, login and signup should follow a returning visitor's saved theme (a Manuscript user sees the Manuscript landing), while visitors without a stored theme keep today's device-following Classic (`THEME = 'classic'`). The landing picks its components on the server (`LANDINGS`), so the server has to know that theme: store the setting in a cookie as well as localStorage, and read it in `app/page.tsx` and the auth layout
- Future themes (Dusk, Frutiger Aero), parked for a later update.
- Self-hosted UI fonts: the eight theme fonts come from `next/font/google` (`app/layout.tsx`), which downloads them from Google Fonts at build time, and an unreachable Google Fonts has failed two Vercel builds. Move them to `next/font/local` with the font files in the repo, keeping the same CSS variables and options (weights, styles, subsets, `display`, metric-matched fallbacks), and list them in `ASSETS.md`. `public/fonts/` already holds the PDF export's files (Literata and Courier Prime among them), which may be the static TTFs the PDF needs rather than the variable WOFF2s the web wants
