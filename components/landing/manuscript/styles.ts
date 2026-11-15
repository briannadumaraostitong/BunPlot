// Shared styles for the Manuscript landing's sections, built to
// design/landing-manuscript/. The content column (CONTAINER) is in
// ../layout.ts, the same for every theme. Colors no token covers are
// variables in app/themes/manuscript.css (--heading-ink, --rule, …).

// Text left, visual right, wrapping to one column on narrow screens.
export const SPLIT = 'flex flex-wrap items-center gap-14'

// A sheet of paper: the card fill, a 1px border, the theme's 3px radius and
// the handoff's soft shadow.
export const SHEET = 'rounded-(--radius) border border-border bg-card [box-shadow:var(--paper-shadow)]'

// Ruled lines, only inside the cards the handoff rules: ink blue at 16%,
// every 28px.
export const RULED =
  'bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_27px,hsl(var(--accent-2)/0.16)_27px,hsl(var(--accent-2)/0.16)_28px)]'

// Courier labels: uppercase and letter-spaced, muted unless a section's
// eyebrow colors them.
const LABEL_TYPE = 'font-mono text-[12px] uppercase tracking-[1.5px]'
export const LABEL = `${LABEL_TYPE} text-muted-foreground`
export const EYEBROW = `${LABEL_TYPE} text-accent`

export const HEADING = 'font-heading font-semibold text-[hsl(var(--heading-ink))]'
export const H2 = `${HEADING} text-[54px] leading-[1.02]`
export const H3 = `${HEADING} mb-4 text-[40px] leading-[1.08]`

// Italic oxblood lines in Cormorant: the hero's eyebrow, feature labels and
// the sign-up band's eyebrow.
export const ITALIC_EYEBROW = 'font-heading italic text-accent'

// Section and chapter numbers as Manuscript shows them: "I", "III".
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
export const roman = (n: number) => ROMAN[n - 1] ?? String(n)

// Chapter numbers in words, as a manuscript page heads them: "Chapter Three".
const WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']
export const numberWord = (n: number) => WORDS[n - 1] ?? String(n)

// Feature labels join their parts with "&": "Timeline & Outline".
export const featureLabel = (parts: readonly string[]) => parts.join(' & ')
