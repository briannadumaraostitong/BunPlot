// Shared styles for the Classic landing's sections, built to
// design/landing-classic/ (Light and Dark share the layout; only the colors
// differ). The content column (CONTAINER) is in ../layout.ts, the same for
// every theme. Colors no token covers are variables in app/themes/classic.css
// (--strip, --band, --tag-blue, --taupe, …).

// Text left, visual right, wrapping to one column on narrow screens.
export const SPLIT = 'flex flex-wrap items-center gap-14'

// A card: the card fill, a 1px border, the theme's 10px radius and the
// handoff's soft shadow.
export const CARD = 'rounded-(--radius) border border-border bg-card [box-shadow:var(--card-shadow)]'

// Section labels: Figtree 700, uppercase and letter-spaced, muted.
export const EYEBROW = 'mb-3.5 text-[13px] font-bold uppercase tracking-[0.09em] text-muted-foreground'

// Headings (h1–h3): Bricolage 800 with the tight tracking. The section
// headings (H2) are tracked at -0.5px instead, as in the mockup.
// HEADING_FACE leaves the tracking to each, so no two tracking classes meet.
export const HEADING_FACE = 'font-heading font-extrabold text-foreground'
export const HEADING = `${HEADING_FACE} tracking-[-0.025em]`
export const H2 = `${HEADING_FACE} text-[50px] leading-[1.05] tracking-[-0.5px]`
export const H3 = `${HEADING} mb-4 text-[36px] leading-[1.1]`

// Strong text inside the mock UI: Figtree 800 in the heading color.
export const STRONG = 'font-extrabold text-foreground'
// Small labels inside the mock UI ("Chapter", "Relationships").
export const MOCK_LABEL = 'text-[14px] font-extrabold text-muted-foreground'

// Small square-cornered tags (never pills): blue, neutral, or outlined in
// taupe. TAG leaves the padding to each spot; most use TAG_PAD.
export const TAG = 'inline-block rounded-[5px] text-[13px] font-semibold'
export const TAG_PAD = 'px-2.5 py-[5px]'
export const TAG_BLUE = 'bg-[hsl(var(--tag-blue))] text-[hsl(var(--tag-blue-ink))]'
export const TAG_NEUTRAL = 'bg-[hsl(var(--tag-neutral))] text-[hsl(var(--tag-neutral-ink))]'
export const TAG_OUTLINE = 'border-2 border-[hsl(var(--taupe))] text-foreground'

// Feature labels join their parts with "and": "Timeline and Outline".
export const featureLabel = (parts: readonly string[]) => parts.join(' and ')
