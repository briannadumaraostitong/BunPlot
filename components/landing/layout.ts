// The landing page's content column: 1200px of content plus 24px padding a
// side. The mockup's `max-width: 1200px` applies to the content box, so with
// the app's border-box sizing that's 1248px in all.
export const CONTAINER = 'mx-auto max-w-[1248px] px-6'

// Text left, visual right, wrapping to one column on narrow screens.
export const SPLIT = 'flex flex-wrap items-center gap-x-16'
export const SPLIT_TEXT = 'min-w-0 flex-[1_1_400px]'

// A full-width band behind a section, set off from the page background.
export const BAND = 'border-t border-border bg-secondary/40'

export const H2 = 'font-heading text-[46px] font-bold uppercase leading-[1.05] tracking-[1px] text-primary'
export const H3 = 'mb-3.5 font-heading text-[32px] font-semibold leading-[1.1] text-primary'
export const BODY = 'text-[18px] leading-[1.65] text-(--hud-text-body)'
// Section eyebrows sit closer to their heading than the hero's, unspaced.
export const SECTION_EYEBROW = 'mb-3 tracking-normal'
