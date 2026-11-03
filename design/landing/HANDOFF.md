# BunPlot landing page and cyberpunk theme: design handoff

This folder is a design reference, not code to paste in. `landing-page-mockup.html` is a static mockup: open it in a browser to see the target. Rebuild it properly in the app (Next.js App Router, Tailwind v4, shadcn/ui, following CLAUDE.md), using the measurements and rules below.

## Contents

- `landing-page-mockup.html`: the approved landing page mockup. It loads Google Fonts and the SVGs in `assets/`.
- `assets/nightcity-hud-frame-set/`: 12 HUD frame SVGs, README and LICENSE (CC BY 4.0).
- `assets/nightcity-modals/`: modal, plate and banner SVGs, README and LICENSE (CC BY 4.0).
  - `modal-info-frame.svg` is a modified copy of `modal-info.svg` with its built-in buttons removed. Real buttons sit on top of it instead.
- `assets/bunny-logo-placeholder.svg`: a placeholder logo, used until the artist delivers the real one. Use it everywhere the logo appears (nav, footer, favicon, app sidebar), from one component or file so it's a one-place swap later.

## Licensing (must keep)

Both Nightcity packs are by Oğuzhan Girgin, licensed CC BY 4.0. Credit is required.

- Copy the asset folders into `public/` with their LICENSE.txt files.
- Add an `ASSETS.md` at the repo root listing every third-party asset: name, author, source URL, license, and any modification.
- The site must show the credit line (the mockup puts it in the footer):
  > HUD frames: "Nightcity HUD Frame Set" and "Nightcity Modals" by Oğuzhan Girgin, licensed under CC BY 4.0. The modal frame is modified (its built-in buttons are removed).
  - Links: https://www.colorosse.com/assets/2d/ui/nightcity-hud-frame-set, https://www.colorosse.com/assets/2d/ui/nightcity-modals, https://creativecommons.org/licenses/by/4.0/
- Don't imply the creator endorses BunPlot.

## Cyberpunk theme tokens

| Token | Value | Use |
|---|---|---|
| background | `#05070F` | page |
| surface | `#0B1428` | cards, panels |
| surface-alt | `#0E1730` / `#10284A` | section bands, panel header bars |
| border | `#16233F`, `#1E3358` | hairlines, card borders |
| text | `#F4F8FF` (headings), `#E3ECFA` (body strong) | |
| text-muted | `#A9BCDB` (body), `#8EA3C4` (labels) | |
| accent (primary) | `#FF2E97` hot pink | main buttons, active states; text on it: `#12030B` |
| accent-2 | `#31E0FF` cyan | links, highlights, frame lines |
| accent-3 | `#8E7BFF` violet | third storyline/category color |

- Fonts (Google Fonts): **Chakra Petch** (400–700) for headings and UI, uppercase with letter spacing for headings and buttons; **JetBrains Mono** (400–500) for labels, metadata and "system" text (`// 01 — FEATURES`, `SAVED ✓`).
- Shape: cut corners instead of rounded ones. The mockup's `.cut` (16px chamfer, two opposite corners) and `.cut-sm` (8px) clip-paths.
- Background: a faint 48px grid of cyan lines at about 4.5% opacity.
- Accessibility: all text colors above pass 4.5:1 on their backgrounds; keep it that way.

## Using the frames

The frames are fixed-shape art with notches. **Don't stretch them non-uniformly**: keep each at its own aspect ratio (`aspect-ratio: W / H` on the container, the SVG absolutely filling it), and place content only inside its dark inner area. Use them for a few feature spots, not every card. Everyday cards use the CSS `.cut` style instead.

Inner content areas, as % of the frame (left, right, top, bottom insets), measured from the SVG geometry and already padded:

| Frame | viewBox | Content inset |
|---|---|---|
| frame-primary | 320×180 | 20%, 11%, 30%, 20% (bottom-left has a notch: keep text right-aligned near the bottom) |
| frame-terminal | 300×200 | 11%, 13%, 26%, 17% |
| frame-portrait | 160×160 | 14%, 14%, 18%, 16% |
| frame-readout | 320×120 | thin slot: 6%, 6%, 65.4%, 10.8% |
| frame-tag | 200×72 | thin slot: 8%, 6%, 53%, 12.5% |
| modal-info-frame | 360×200 | title bar text: left 12%, top 1.5%, height 15%; body 9%, 13%, 24%, 36%; buttons row: left 9%, right 13%, bottom 11% |
| plate-info | 320×64 | icon slot centered around x 10%, y 54% (icon ~4% wide); text: left 21%, right 6%, top 16% |

The hero panel is **not** a pack frame: it's built in CSS (the mockup's `.hud` clip-path with a 2px cyan border, a pink rail on the left, a header bar and a 16-segment progress bar). It sizes to its content, which is why it's used for the hero.

The banner strip under the hero is also CSS (dark bar, 3px pink left edge, 2px cyan bottom), because the banner SVG can't stretch to full width.

## Landing page structure

1. Nav: logo + BUNPLOT wordmark, Why BunPlot / Features / About, Log in, Get started.
2. Hero: "PLOT EVERY THREAD_", subhead about organizing, Start organizing + See how it works, the CSS HUD panel with a mini timeline.
3. Banner strip: the six parts of the app.
4. Why BunPlot: "Your story is everywhere", with the event dialog (modal frame).
5. Features (text left, visual right): Timeline + Outline (frame-primary), Characters + Places (frame-portrait + relationships card), Exports (three plates).
6. Also in BunPlot: four `.cut` cards.
7. About: the owner's text (placeholder: [YOUR NAME]) with the terminal frame.
8. Sign-up band, then footer with links and the asset credit line.

Placeholders to keep visible until replaced: `[YOUR NAME]`, the About paragraph, and the example numbers in mock UI.
