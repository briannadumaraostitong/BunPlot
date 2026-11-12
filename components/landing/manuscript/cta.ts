// Call-to-action link styles for the Manuscript landing, from the mockup.
// Larger than the app's size="sm" buttons on purpose: the marketing page is
// the one exception to that rule (see CLAUDE.md).

// Oxblood fill, cream text, the theme's 3px radius and a 2px pressed edge.
const SOLID =
  'inline-block rounded-(--radius) bg-accent font-semibold text-accent-foreground shadow-[0_2px_0_hsl(var(--button-edge))] transition-colors hover:bg-[hsl(var(--accent-hover))]'

export const CTA = {
  // Nav "Get started".
  navPrimary: `${SOLID} px-5 py-[11px] text-[15px]`,
  // The mock event card's "Open in timeline".
  small: `${SOLID} px-[18px] py-2.5 text-[15px]`,
  // Large oxblood button ("Start organizing", "Create account").
  primary: `${SOLID} px-7 py-[15px] text-[17px]`,
  // Large ink-blue outline ("Log in" in the sign-up band).
  outline:
    'inline-block rounded-(--radius) border border-accent-2 px-[26px] py-3.5 text-[17px] text-accent-2 transition-colors hover:border-accent hover:text-accent',
  // Underlined ink-blue link ("See how it works →").
  text: 'inline-block px-2 py-[15px] text-[17px] text-accent-2 underline decoration-1 underline-offset-[3px] transition-colors hover:text-accent',
} as const
