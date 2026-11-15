# Third-party assets

Every third-party file BunPlot ships or serves, with its author, source, license and any changes we made. npm packages (code, and the icons in `lucide-react`) are covered by their own licenses in `node_modules` and aren't listed here. The bunny logo in `public/brand/` is BunPlot's own placeholder, not third-party.

## Images

| Asset | Author | Source | License | Where it's used | Changes |
|---|---|---|---|---|---|
| Nightcity HUD Frame Set (`public/frames/nightcity-hud-frame-set/`) | Oğuzhan Girgin | https://www.colorosse.com/assets/2d/ui/nightcity-hud-frame-set | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (`LICENSE.txt` in the folder) | Decorative frames in the Cyberpunk theme: landing page, a few app spots | None |
| Nightcity Modals (`public/frames/nightcity-modals/`) | Oğuzhan Girgin | https://www.colorosse.com/assets/2d/ui/nightcity-modals | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (`LICENSE.txt` in the folder) | Decorative frames in the Cyberpunk theme: landing page, a few app spots | `modal-info-frame.svg` is a modified copy of `modal-info.svg` with its built-in buttons removed; the rest are unchanged |

CC BY 4.0 requires credit. The site shows this line in the landing page footer and in Settings (`components/brand/AssetCredit.tsx`):

> HUD frames: "Nightcity HUD Frame Set" and "Nightcity Modals" by Oğuzhan Girgin, licensed under CC BY 4.0. The modal frame is modified (its built-in buttons are removed).

Using the frames doesn't imply that their creator endorses BunPlot.

## Fonts

All of these fonts are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org/).

### Font files for exports (`public/fonts/`)

Embedded in the PDF exports (`lib/export/pdfFonts.ts`); the Word exports only name the fonts. Each folder holds the family's `OFL.txt`.

| Family | Folder | Author | Source |
|---|---|---|---|
| Comfortaa | `comfortaa/` | The Comfortaa Project Authors | https://github.com/alexeiva/comfortaa |
| Courier Prime | `courier-prime/` | The Courier Prime Project Authors | https://github.com/quoteunquoteapps/CourierPrime |
| EB Garamond | `eb-garamond/` | The EB Garamond Project Authors | https://github.com/octaviopardo/EBGaramond12 |
| Inter | `inter/` | The Inter Project Authors | https://github.com/rsms/inter |
| Literata | `literata/` | The Literata Project Authors | https://github.com/googlefonts/literata |
| Lora | `lora/` | The Lora Project Authors | https://github.com/cyrealtype/Lora-Cyrillic |
| Noto Sans | `noto-sans/` | The Noto Project Authors | https://github.com/notofonts/latin-greek-cyrillic |

### UI fonts (next/font)

Downloaded from Google Fonts at build time by `next/font/google` (`app/layout.tsx`) and served from BunPlot's own domain.

| Family | Author | Source | Where it's used |
|---|---|---|---|
| Figtree | Erik Kennedy | https://github.com/erikdkennedy/figtree | Classic themes (text and UI) |
| Bricolage Grotesque | Mathieu Triay | https://github.com/ateliertriay/bricolage | Classic themes (headings) |
| Geist Mono | Vercel | https://github.com/vercel/geist-font | Classic themes (mono) |
| Chakra Petch | Cadson Demak | https://github.com/cadsondemak/Chakra-Petch | Cyberpunk theme |
| JetBrains Mono | JetBrains | https://github.com/JetBrains/JetBrainsMono | Cyberpunk theme |
| Literata | The Literata Project Authors | https://github.com/googlefonts/literata | Manuscript theme (text and UI) |
| Courier Prime | The Courier Prime Project Authors | https://github.com/quoteunquoteapps/CourierPrime | Manuscript theme (labels) |
| Cormorant Garamond | Christian Thalmann | https://github.com/CatharsisFonts/Cormorant | Manuscript theme (headings) |

### Outline editor fonts (Fontsource)

The `@fontsource/*` packages (Comfortaa, Courier Prime, EB Garamond, Inter, Literata, Lora) bundle the same families as above for the outline editor's font picker. Same authors and license.

## Sounds

TODO: `public/sounds/click.mp3` (the UI click sound, `lib/sound.ts`) has no recorded source or license. Replace it with a sound of known origin, then list it here.
