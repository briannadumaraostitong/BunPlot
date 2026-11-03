# BunPlot — Claude Code Guide

## Project Overview
BunPlot is a visual story timeline planner for writers. Think Plottr meets Notion.
Built with: Next.js 16 (16.2.6, App Router), TypeScript, Tailwind CSS v4, shadcn/ui (Nova preset, Radix), Supabase.

## Folder Structure
- `app/` — Next.js App Router pages
- `components/` — UI components (ui/, timeline/, layers/, events/, layout/, projects/, theme/)
- `hooks/` — React hooks (useLayers, useEvents, useChapters)
- `actions/` — Next.js server actions (projects, layers, events, chapters)
- `types/database.ts` — All TypeScript types
- `lib/supabase/` — client.ts and server.ts
- `lib/themes.ts` — full-palette theme definitions (single source of truth for color tokens)
- `lib/theme.config.ts` — layer color palette (`LAYER_COLORS`)
- `supabase/schema.sql` — full database schema

## Design System

### Personality
BunPlot should feel like a **professional creative tool** — calm, focused, and distraction-free.
Think: dark writing app meets visual planning tool. Not flashy. Not corporate.
Inspired by: Plottr, Notion, Linear, iA Writer.

### Typography
- Font: Geist Sans (body), Geist Mono (code/hex values)
- Hierarchy: use font-weight and size, not color, to create hierarchy
- Body text: text-sm (14px)
- Labels/meta: text-xs (12px)
- Tiny labels: text-[10px] or text-[11px]
- Headings inside modals: text-lg font-semibold

### Colors
- Never hardcode colors — always use CSS variables via Tailwind
- Background layers (darkest to lightest in dark mode):
  - Page bg: `bg-background`
  - Card/panel: `bg-card`
  - Sidebar: `bg-sidebar`
  - Elevated: `bg-secondary/20` or `bg-secondary/30`
- Text: `text-foreground` (primary), `text-muted-foreground` (secondary)
- Borders: `border-border` always
- Accent: always `hsl(var(--accent))` — never hardcode blue/purple/green
- Destructive: `text-destructive` / `bg-destructive/10`

### Accent Colors (user-selectable, max 3)
- Blue: `217 91% 60%`
- Purple: `262 83% 63%`
- Emerald: `158 64% 46%`

### Spacing & Radius
- Border radius: `rounded-lg` (panels), `rounded-xl` (modals/cards), `rounded-full` (pills/dots)
- Padding inside panels: `p-4`
- Padding inside modals: `px-5 py-3`
- Gap between items: `gap-2` (normal), `gap-1.5` (tight), `gap-4` (loose)

### Component Patterns

#### Buttons
- Primary action: `<Button size="sm">` — uses accent color
- Destructive: `variant="ghost"` with `className="text-destructive hover:bg-destructive/10"`
- Icon buttons: `size="icon"` with `h-7 w-7` or `h-8 w-8`
- Never use large buttons — always `size="sm"` or `size="icon"`

#### Modals / Dialogs
- Width: `sm:max-w-4xl` for complex modals, `sm:max-w-md` for simple ones
- Background: `bg-card` (solid, never transparent)
- Overlay: `bg-background` (solid, not `bg-black/50`)
- Always include `DialogTitle` and `DialogDescription` (use `sr-only` if visually hidden)
- Layout: sidebar metadata (left, `w-56`) + content area (right, flex-1)

#### Form Fields
- Label style: `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`
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
- No large buttons — always `size="sm"`
- No bullet point lists in UI copy — use prose
- No excessive bold/headers — use weight hierarchy instead
- No `backdrop-blur` on overlays — use solid `bg-background`
- No dashed borders (`border-dashed`, `borderStyle: 'dashed'`) except on areas where you drag and drop files, and on selection outlines in the sketch tool. Empty and error states use `EmptyState` (icon circle, no box), or `LoadError` for failed loads
- No `border` shorthand in inline styles — use individual borderWidth/Color properties
- No `h-[600px]` arbitrary values — use Tailwind scale (`h-160`)
- No `flex-shrink-0` — use `shrink-0`
- No `[&:empty]` — use `empty:` shorthand
- No hardcoded accent colors — always use `hsl(var(--accent))`

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
- Auth (Supabase email/password)
- Projects with create/delete/archive
- Project folders (DB ready, UI pending)
- Layers with color picker, rename, delete, visibility toggle, drag reorder
- Chapters as timeline columns (add, rename, delete, resizable)
- Events with rich text description/notes, status, color, duplicate
- Event modal: metadata sidebar + tabbed rich text editor with toolbar
- Theme: light/dark/system + 3 accent colors (blue, purple, emerald)

## Pending Features
- Project folders UI (DB schema already created)
- Characters system (DB schema exists, UI pending)
- Event drag-to-reorder within chapter cells
- Event connections/linking
- Settings page (/settings is 404)
- Search/filter events