// Call-to-action link styles for the Classic landing, from the mockup.
// Larger than the app's size="sm" buttons on purpose: the marketing page is
// the one exception to that rule (see CLAUDE.md).

// The primary fill (chocolate in Light, powder blue in Dark), 8px corners.
const SOLID =
  'inline-block rounded-[8px] bg-primary font-extrabold text-primary-foreground transition-opacity hover:opacity-92'

export const CTA = {
  // Nav "Get started".
  navPrimary: `${SOLID} px-[22px] py-3 text-[16px]`,
  // The mock dialogs' buttons ("Open in timeline", "Create project").
  small: `${SOLID} px-[18px] py-2.5 text-[15px]`,
  // Large solid button ("Start organizing", "Create account").
  primary: `${SOLID} px-[30px] py-4 text-[18px]`,
  // Large 1.5px outline in the heading color ("Log in" in the sign-up band).
  outline:
    'inline-block rounded-[8px] border-[1.5px] border-foreground px-7 py-[14.5px] text-[18px] font-extrabold text-foreground transition-opacity hover:opacity-80',
  // Underlined link ("See how it works").
  text: 'inline-block px-2 py-4 text-[18px] font-extrabold text-link underline underline-offset-[3px] transition-colors hover:text-foreground',
} as const
