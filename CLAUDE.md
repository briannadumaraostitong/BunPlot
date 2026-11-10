# BunPlot — Claude Code Guide

## Project Overview
BunPlot is a visual story timeline planner for writers. Think Plottr meets Notion.
Built with: Next.js 16 (16.2.6, App Router), TypeScript, Tailwind CSS v4, shadcn/ui (Nova preset, Radix), Supabase.

## Folder Structure
- `app/` — Next.js App Router pages: `(app)/` (signed-in app), `(auth)/` (login, signup), `page.tsx` (landing page)
- `app/themes/` — per-theme stylesheets (`cyberpunk.css`), keyed on `[data-theme]` and `data-slot` hooks
- `components/` — UI components (ui/, timeline/, layers/, events/, layout/, projects/, characters/, places/, outline/, panels/, editor/, settings/, theme/, hud/, landing/, brand/, auth/)
- `hooks/` — React hooks (useLayers, useEvents, useChapters, usePanels, useStatuses, useSearch, …)
- `actions/` — Next.js server actions (projects, layers, events, chapters, …)
- `types/database.ts` — All TypeScript types
- `lib/supabase/` — client.ts and server.ts
- `lib/themes.ts` — theme definitions (single source of truth for color tokens, shape, texture, fonts and frames)
- `lib/frames.ts` — the Nightcity frame registry (files, sizes, content slots)
- `lib/brand.ts` — the logo file's path (`LOGO_SRC`)
- `lib/theme.config.ts` — layer color palette (`LAYER_COLORS`)
- `supabase/schema.sql` — full database schema
- `ASSETS.md` — every third-party asset with its license
- `design/landing/` — the landing page design handoff (`HANDOFF.md`) and mockup; a reference, not code

## Design System

### Personality
BunPlot should feel like a **professional creative tool** — calm, focused, and distraction-free.
Think: dark writing app meets visual planning tool. Not flashy. Not corporate.
Inspired by: Plottr, Notion, Linear, iA Writer.

### Typography
- Fonts come from the theme: Classic uses Geist Sans (body) and Geist Mono (code/hex values); Cyberpunk uses Chakra Petch and JetBrains Mono. Always use `font-sans` / `font-mono`, never a font name
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
- Destructive: `text-destructive` / `bg-destructive/10`

### Accent Colors (per theme)
Each theme defines three accents in `lib/themes.ts`: `--accent` (primary actions), `--accent-2` and `--accent-3` (highlights, a third storyline color). Classic: blue `217 91% 60%`, purple `262 83% 63%`, emerald `158 64% 46%`. Cyberpunk: hot pink, cyan, violet. Use the tokens, never the values.

### Themes
Themes are defined in `lib/themes.ts`: Classic Light, Classic Dark and Cyberpunk, plus the System setting (`sync`, Classic Light or Dark by OS setting). Saved ids of removed themes map to a current one through `normalizeThemeSetting()`. The setting lives in the profile (`profiles.theme`) and, as this device's copy, in localStorage (`THEME_STORAGE_KEY`). Signed in, the profile's wins: the `(app)` layout's ThemeScript applies it before paint on a full load, login applies it before navigating, and `AppShell` catches anything else. The exception is a change whose save failed (`THEME_UNSYNCED_KEY`): it stays on this device and is retried on the next load. Don't add a `loading.tsx` directly in `app/` or `app/(app)/`: it would let the page body, and with it the `(app)` layout's ThemeScript, stream after `<head>`, bringing back a theme flash on fresh devices. Besides its color tokens, each theme sets:
- `shape`: `'rounded'` (corners from `--radius`) or `'cut'` (square, with chamfered corners on opted-in surfaces)
- `texture`: `'none'` or `'grid'` (a faint grid on `body` and `.bg-texture` page backgrounds; cards stay solid)
- `fonts`: the `next/font` variables (`app/layout.tsx`) for sans and mono
- `frames`: `'nightcity'` or `null`, the decorative frame set for a few feature spots

`ThemeScript` (before paint), `applyTheme()` and `ThemeScope` put these on the element as `data-theme`, `data-shape`, `data-texture` and `data-frames` (`none` when null). Style against them in CSS, never by branching on the theme id in components: the server doesn't know the visitor's theme (it's in localStorage), so theme-dependent markup would mismatch on hydration.
- Tailwind variants (`app/globals.css`): `cut:` for themes with the cut shape (e.g. to drop a hover shadow that the clip-path cuts off); `frames:` and `plain:` for a framed spot shown as its frame or as its plain look (`frames:` follows the nearest `data-frames`, so a ThemeScope inside a page with a different setting gets its own)
- Cut corners: dialogs, sheets and buttons are cut automatically (`rounded-full` ones stay round; menus and popovers stay square). Cards opt in with `corner-cut` (16px) or `corner-cut-sm` (8px), next to their `rounded-*` class for the rounded shape. The border continues along each chamfer as a diagonal; a 2px border needs `[--cut-bw:2px]`
- Per-theme restyles go in that theme's stylesheet in `app/themes/`, keyed on `[data-theme="…"]` and `data-slot` hooks in the components (`event-card`, `field-label`, `panel-heading`, `status-tag`, `project-tabs`, …). Add a hook rather than a theme-specific class. A restyle for one theme must leave the others pixel-identical; check by comparing screenshots before and after
- Shared mono label style: form labels use the Form Fields label style plus `data-slot="field-label"`, which Cyberpunk renders as its mono label (event dialog, character and place panels, auth forms)

#### ThemeScope (`components/theme/ThemeScope.tsx`)
Renders its children in a fixed theme, whatever the visitor's own, without touching their stored setting: tokens, fonts and radius as CSS variables, plus the `data-*` attributes. Server-rendered, so there's no flash. Use it for pages with their own look: the landing page (`app/page.tsx`) and login/signup (`app/(auth)/layout.tsx`), both Cyberpunk. Portals (dialogs, toasts) render outside it and keep the visitor's theme. One level of nesting is supported.

#### ThemeFrame (`components/hud/ThemeFrame.tsx`)
A framed spot that follows the theme's `frames` setting: under `'nightcity'` it's that frame (from `lib/frames.ts`) at its own aspect ratio, with content in the frame's measured slots (`<ThemeFrameSlot frame="…" slot="…">`); without a frame set it falls back. Both looks are in the markup and CSS picks one; the frame image is lazy and hidden in the plain look, so plain themes never download it. Classes for one look only go under `frames:` or `plain:`.
- `plain="card"` (default): the plain look is a token card built from the slots (the landing page)
- `plain="none"` with `fallback`: the plain look is the spot's existing markup, unchanged (an `EmptyState`, an avatar, a stats box), so Classic stays exactly as it was. `minWidth` (a fixed list: 280, 320) also shows the fallback when the spot is narrower than that
- Use frames for a few feature spots only, never for everyday cards (those use `corner-cut`). Today: the landing page, the dashboard's empty state, the project dialog's stats and the character panel's portrait. Never stretch a frame; size it by width and let the aspect ratio set the height

#### HUD pieces (`components/hud/`)
`HudPanel` (the CSS panel with a header bar and progress bar; it grows with its content), `BannerStrip` and `Eyebrow` (`// 01 — LABEL`). Colors no token covers are `--hud-*` variables in `components/hud/hud.css`, with token stand-ins for other themes.

### Brand
- The logo file is named in one place, `lib/brand.ts` (`LOGO_SRC`, currently the placeholder `public/brand/logo.svg`). Swapping in the final logo means replacing that file
- Show it with `components/brand/Logo.tsx` (`size`, `wordmark`, `wordmarkClassName`, `preload` above the fold), never an `<img>` of the file
- The app icons (`app/icon.tsx`, `app/apple-icon.tsx`) are generated from the same file

### Third-party assets
- `ASSETS.md` lists every third-party file BunPlot ships, with author, source, license and changes. Add a row whenever you add one
- The Nightcity frames (`public/frames/`, CC BY 4.0) require the credit line in `components/brand/AssetCredit.tsx`, shown in the landing footer and in Settings → Appearance. Keep both as long as the frames are used, and don't imply their creator endorses BunPlot

### Landing Page
- `app/page.tsx`: signed-out visitors only (`proxy.ts` sends signed-in ones on `/`, `/login` and `/signup` to `/dashboard`). Its theme is the `THEME` constant, applied through a ThemeScope (always Cyberpunk for now; see Pending Features)
- Sections, in order (`components/landing/`): nav, hero (with a `HudPanel`), banner strip, Why BunPlot (`#why`, modal frame), Features (`#features`: three rows with the primary frame, the portrait frame plus a relationships card, and three plates), Also in BunPlot (four cut cards), About (`#about`, terminal frame), sign-up band, footer with the asset credit (`#credits`)
- Built to the mockup in `design/landing/` at 1280, 768 and 390px: `components/landing/layout.ts` holds the content width (1248px: the mockup's 1200px content box plus padding) and shared type styles; the page sets `leading-[normal]` because the design sets line heights only where it needs them
- The banner strip (`BannerStrip`) is full-bleed in every theme: its background and top and bottom lines span the page edge to edge, while its items stay in the 1248px content column (`contentClassName={CONTAINER}`), the first starting at the column's left edge and the last ending at its right, with no inset of their own. Lines: 3px `--accent` on top, 2px `--accent-2` at the bottom, no side edges (Cyberpunk: pink over a dark bar, cyan under it). A theme with its own banner look keeps that layout
- Mock UI in the sections is a picture (`role="img"` with an `aria-label`), not working controls
- Keep the placeholders visible until the owner replaces them: the About paragraph and the example numbers. The example project title (`The Drowned Bridge`) and the owner name (`Brianna Titong`, in the About signature and the footer) are final
- Login and signup (`app/(auth)/`) share its look through `components/auth/AuthShell.tsx` (logo, eyebrow, heading, the form in a `HudPanel`). The wording is "Log in" and "Sign up", as on the landing page

### Spacing & Radius
- Border radius: `rounded-lg` (panels), `rounded-xl` (modals/cards), `rounded-full` (pills/dots); all square under the cut shape except `rounded-full`
- Padding inside panels: `p-4`
- Padding inside modals: `px-5 py-3`
- Gap between items: `gap-2` (normal), `gap-1.5` (tight), `gap-4` (loose)

### Component Patterns

#### Buttons
- Primary action: `<Button size="sm">` — uses accent color
- Destructive: `variant="ghost"` with `className="text-destructive hover:bg-destructive/10"`
- Icon buttons: `size="icon"` with `h-7 w-7` or `h-8 w-8`
- Never use large buttons — always `size="sm"` or `size="icon"`. The one exception is the landing page (`app/page.tsx`), whose call-to-action links follow the design handoff (`components/landing/cta.ts`); everywhere in the app keeps `size="sm"`

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

#### Status Pills
- Shape is per theme. Classic: rounded-full pills, never badges with sharp corners. Cyberpunk: small square mono tags (`app/themes/cyberpunk.css`, `data-slot="event-card-status"`)
- Colors per status:
  - draft: zinc
  - outline: blue
  - written: yellow
  - revised: purple
  - final: green

#### Panels / Sidebars
- Left sidebars: fixed width with `shrink-0`, `border-r border-border`
- Always add `scrollbar-thin` to scrollable areas
- Collapsible panels use chevron icons (`ChevronLeft`/`ChevronRight`)

#### Event Cards (on timeline)
- Colors come from the `--event-color` CSS variable (never inline color styles), with `data-slot="event-card"` hooks so a theme stylesheet in `app/themes/` can restyle them
- Left accent border: `border-l-3 border-l-(color:--event-color)`, last in `cn()` so tailwind-merge keeps it
- Background (Classic): `bg-(--event-color)/[9.41%]` (very subtle tint), title in the layer color; Cyberpunk uses a flat surface and a foreground-colored title
- Rounded: `rounded-lg` (square under the cut shape)
- Show: title (truncated), description preview (stripped HTML, 80 chars max), status pill
- Selected state is per theme. Classic: `ring-2 ring-offset-1 shadow-lg`. Cyberpunk: a 2px `--accent-2` (cyan) outline, no ring or shadow
- Hover: `hover:brightness-110 hover:shadow-md`

#### Layer Panel
- Width: `w-52` (expanded), `w-10` (collapsed)
- Color dot: `h-3 w-3 rounded-full` — clickable to open native color picker
- Double-click layer name to rename inline
- Trash icon only shows on hover, hidden for `type === 'main'`

### Dark Mode
- All components must work in both light and dark mode
- Use `dark:` variants for any hardcoded colors (e.g. status pill colors)
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
- No theme checks in components (`theme === 'cyberpunk'`) — use the theme stylesheet, `data-slot` hooks and the `cut:` / `frames:` / `plain:` variants

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
- Auth (Supabase email/password), with Cyberpunk login and signup pages
- Landing page at `/` for signed-out visitors
- Projects with create/delete/archive/duplicate, project folders
- Layers with color picker, rename, delete, visibility toggle, drag reorder
- Chapters as timeline columns (add, rename, delete, resizable)
- Events with rich text description/notes, status, color, duplicate, drag reorder; timeline filters
- Event modal: metadata sidebar + tabbed rich text editor with toolbar
- Characters (relationship maps, family trees), places, outlines, storyboard panels, exports (PDF/Word), search
- Settings: profile, appearance (theme picker, asset credit), sound
- Themes: Classic Light, Classic Dark and Cyberpunk, plus System (see Themes)

## Known Issues
- Tabs primitive (`components/ui/tabs.tsx`): the line variant's active underline is 0×0 in every theme, and the root's `data-horizontal:flex-col` never applies. Its `group-data-horizontal/tabs:` and `data-horizontal:` classes look for a `data-horizontal` attribute, but Radix sets `data-orientation="horizontal"`. Cyberpunk sizes the project tabs' bar itself in `app/themes/cyberpunk.css`; fixing the primitive will make the underline appear in Classic too.
- Sign-up check-email screen (`app/(auth)/signup/page.tsx`): "Back to log in" is a `<Button>` inside a `<Link>`, a button nested in a link, which is invalid HTML and gives two focus stops. It should be one element, e.g. `<Button asChild>` around the `Link`.

## Pending Features
- Event connections/linking
- Landing, login and signup themes: they always render in Cyberpunk today (`THEME` in `app/page.tsx`, the ThemeScope in `app/(auth)/layout.tsx`). Once a second theme with its own landing look exists, they should follow the visitor’s stored theme instead, with Cyberpunk as the default for first-time visitors (no stored setting). The sections already take their frames from the theme (`ThemeFrame`), so only the theme choice changes
