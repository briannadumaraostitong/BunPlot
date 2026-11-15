# BunPlot Classic theme refresh and landing page: design handoff

`landing-page-mockup-light.html` and `landing-page-mockup-dark.html` are static mockups of the landing page in the refreshed Classic Light and Classic Dark. Open them in a browser to see the target. They're a design reference, not code to paste in: rebuild the landing as a `ClassicLanding` on the shared `content.ts`, like the Cyberpunk and Manuscript landings, and restyle the app's Classic themes to match.

This replaces Classic's current look (Geist, blue accent) in both Classic Light and Classic Dark. Both share one layout, one set of fonts and one shape; only the colors differ.

## Palette (from the "milk chocolate and powder blue" reference)

Source colors: powder blue `#C7D3DB`, taupe `#A79A8A`, cream `#FCF7DF`, dark chocolate `#3E3630`.

| Role | Classic Light | Classic Dark |
|---|---|---|
| Page | `#FCF7DF` cream | `#26201C` deep chocolate |
| Card / surface | `#FFFDF3` | `#332B26` |
| Band (sign-up band) | `#E1EAF0`, lines `#C7D3DB` | `#2C3237`, lines `#3F4A52` |
| Strip (banner under the hero) | `#3E3630`, text `#FCF7DF`, hint `#C9BFB0`, icon tile `#4D443D` with `#C7D3DB` icon | `#38424A`, text `#FCF7DF`, hint `#C7D3DB`, icon tile `#C7D3DB` with `#26201C` icon |
| Borders | `#E6DCC4` | `#4A413A` |
| Headings, strong text | `#3E3630` | `#FCF7DF` |
| Body | `#5A4F46` | `#E6DECB` |
| Muted (labels, hints) | `#6E6255` | `#A79A8A` |
| Link | `#4A6478` slate blue | `#C7D3DB` |
| Primary button | `#3E3630`, text `#FCF7DF` | `#C7D3DB`, text `#26201C` |
| Blue tag / avatar fill | `#C7D3DB`, text `#2E3A44` | `#3F4A52`, text `#E3EAEF` |
| Neutral tag | `#E9E2D6`, text `#3E3630` | `#4A413A`, text `#FCF7DF` |
| Taupe (progress fill, outlined tags, list markers) | `#A79A8A` | `#A79A8A` |

Contrast notes: plain `#A79A8A` and `#C7D3DB` are too light for text on cream, which is why light mode's muted text is `#6E6255` and its links `#4A6478`. All text pairs above pass 4.5:1. Re-check any new pairing.

## Type and shape

- Headings (h1–h3): **Bricolage Grotesque** 800, letter spacing -0.025em. Body and UI: **Figtree** (400–800). Both Google Fonts, SIL OFL (add `ASSETS.md` rows).
- Corners: cards 10px, buttons 8px, small tags 5px, icon tiles 9px. **No pill shapes** anywhere (no 999px radius), and no badge-style section labels.
- Section labels ("eyebrows"): Figtree 700, 13px, uppercase, 0.09em letter spacing, muted color, no background, no `//`.
- Cards: 1px border plus a soft shadow (`0 10px 24px -14px rgba(62,54,48,.35)` light, `0 12px 26px -14px rgba(0,0,0,.6)` dark).
- Buttons: solid primary; secondary is a 1.5px outline in the heading color.
- The hero heading is "Plot every thread." with "thread" in the link color and a plain period; no highlighter.
- No stars (★) anywhere on the page. List markers are small taupe squares: about 6px, 1.5px radius, centered on the line. The mockups still show stars as list markers and on the About card; this file wins.

## Logo

The Classic bunny: rounded ears and body in the heading color outline (`#3E3630` light, `#FCF7DF` dark), card-colored fill, and a powder-blue `#C7D3DB` bar. It needs a light and a dark file through `LOGO_SRCS` (or one SVG using the theme's colors, if the logo mechanism allows).

## Sections (same order, anchors and copy as the other landings)

1. Nav: logo + "BunPlot" (Bricolage 800), links, Log in, Get started.
2. Hero: eyebrow label, heading, subhead, primary button and "See how it works" link. Right: a rounded app window titled "The Drowned Bridge" with three window dots, a "Timeline" tag, chapters "Ch. 1–4", lanes Main / Ilsa / Letters with event tags (blue for Main, neutral for Ilsa, taupe-outlined for Letters), a 6px progress bar at 10 of 16, "Draft 10 of 16" and "Saved ✓".
3. Strip (full-bleed): six items, each an icon tile, name and hint: Timeline (events by chapter), Outline (draft in book fonts), Characters (roles and family trees), Places (covers and notes), Storyboard (sketch each scene), Exports (PDF, Word, images).
4. Why BunPlot: the Bridge falls event card with a "Drafted" tag, fields with tags, Close and Open in timeline.
5. Features: three rows with an eyebrow, heading, paragraph and a list with taupe square markers: an outline page card; Ilsa's card (round blue avatar "IV", Protagonist tag) beside a relationships card; three export cards with simple file icons.
6. Also in BunPlot ("And a few more things"): four cards with an icon tile, title and line.
7. About: the note signed "Brianna Titong", beside a project summary card with three tags.
8. Sign-up band (full-bleed): left, eyebrow, "Start your first project", a line on what happens next, Create account and Log in; right, a mock "New project" dialog ("My first book" typed in, an Add cover tile, Cancel and Create project) with a second card offset behind it.
9. Footer: logo, © 2026 Brianna Titong, links, and the font credit.

## Images (later)

Real app screenshots and illustrations by the owner's artist (a bunny mascot) will replace or join some mock UI later. Leave room for them; don't add stock or generated images.
