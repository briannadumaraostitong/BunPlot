# BunPlot landing page, Manuscript theme: design handoff

`landing-page-mockup.html` is a static mockup of the landing page in the Manuscript theme. Open it in a browser to see the target. It's a design reference, not code to paste in: rebuild it in the app on the existing landing components (same sections and copy as the Cyberpunk version), switching their look by theme.

## Rules

- Everything decorative here is original (inline SVG and CSS): the bookmark ribbon, paperclip, rubber stamp, fleurons, cameo, wax seal, book covers and catalog card. No third-party assets, so no `ASSETS.md` rows. The fonts are SIL OFL.
- Headings stay in normal case. Labels use Courier Prime uppercase with letter spacing. No `//` prefixes.
- The tilted index cards ("Also in BunPlot", rotations between -0.6° and 0.6°) are for the landing page only, never in the app.
- The banner strip is full-bleed like every theme's: double rules and the darker paper band span the page, the items stay in the content column.
- The logo in the mockup is the Manuscript bunny (ink outline, cream body, oxblood bar, rounded ears and body). It's drawn inline in the mockup; in the app it's `public/brand/logo-manuscript.svg`.

## Tokens

| Role | Value |
|---|---|
| Paper (background) | `#F3EBDA` |
| Surface (sheets, cards) | `#FBF7EE`, index-card event fill `#FFFDF7` |
| Alt surface (banner band, sign-up band) | `#EADFC8` |
| Borders | `#D8C9AA` (cards), `#E3D6BB` (light inner rules), `#BFAA82` (strong rules, double rules) |
| Headings | `#1C140D` |
| Strong text | `#231A12` |
| Body | `#4A3C2C` |
| Muted | `#6E5D47` |
| Accent (oxblood) | `#8E2B22`, text on it `#FBF7EE`, pressed shadow `#5E1C16` |
| Accent 2 (ink blue, links) | `#2B4A6E` |
| Accent 3 (olive) | `#4F6B3A` |
| Book covers | oxblood cloth `#7A2A22`, ink cloth `#26405F`, olive cloth `#445833`, gilt `#D9B66A` / text `#EBD39A` |
| Margin line (ledger) | `#D49A90`, 3px double |

- Fonts: Cormorant Garamond (headings, 500–700, italics for emphasis), Literata (body and UI), Courier Prime (labels, counts, "Saved ✓").
- Page texture: horizontal ink-blue lines at 6% every 32px. Ruled sheets inside cards: 16% every 28px.
- Sheets: 1px `#D8C9AA` border, 3px radius, shadow `0 12px 26px -16px rgba(60,40,20,.45)`.
- Primary button: oxblood fill, cream text, 3px radius, `0 2px 0 #5E1C16` shadow. Secondary: ink-blue outline or underlined ink-blue link.

## Sections (same order and anchors as Cyberpunk)

1. Nav: logo + "BunPlot" wordmark (Cormorant 700), links, Log in, Get started.
2. Hero: italic oxblood eyebrow, "Plot every *thread.*" with a hand-drawn oxblood underline under "thread.", subhead, buttons. The panel is a ledger sheet (replaces the HUD panel): title "The Drowned Bridge" in Cormorant italic, a "Timeline" label, an oxblood bookmark ribbon at the top right, ruled body with a double red margin line, chapters "Ch. I–IV", lane labels in Cormorant, events as index cards with a 3px top rule in the storyline color (oxblood, ink blue, olive), and a footer with 16 page marks (10 filled), "Draft 10 of 16" and "Saved ✓".
3. Banner: contents line, "I. Timeline … VI. Exports", oxblood numerals, italic Cormorant names, between full-bleed double rules.
4. Why BunPlot ("Chapter I · Why BunPlot"): an index card with an oxblood top rule, ruled lines, a paperclip, the fields on the ruled lines, a rotated "DRAFTED" rubber stamp, Close and Open in timeline.
5. Features ("Chapter II · Features", a fleuron under the heading):
   - Timeline & Outline: a manuscript page, "Chapter Three", "The Flood", a fleuron, an oxblood drop cap, a word count footer.
   - Characters & Places: a cameo portrait (double oval, "IV" in Cormorant italic), "Ilsa Varn", PROTAGONIST; a relationships card with dotted leaders and a Merrow Docks / HOMETOWN line.
   - Exports: three cloth-bound book covers with gilt frames and titles, different heights.
   - Feature lists use a ❧ marker in oxblood.
6. Also in BunPlot ("The rest of the desk"): four ruled index cards with colored top rules, slightly tilted.
7. About ("Chapter III · About"): a letter ("Dear writer," … signed Brianna Titong in oxblood italic) with a wax seal, beside a library catalog card for "The Drowned Bridge" with a punched hole.
8. Sign-up band on the alt surface between double rules, then the footer with the font credit line.

The About paragraph is still placeholder text.
