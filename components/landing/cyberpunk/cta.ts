// Call-to-action link styles for the landing page, from the mockup. Larger
// than the app's size="sm" buttons on purpose: the marketing page is the one
// exception to that rule (see CLAUDE.md). Cut corners come from the
// Cyberpunk scope (corner-cut / corner-cut-sm).

const BASE = 'inline-block uppercase transition-colors'

export const CTA = {
  // Nav "Get started": the small pink button.
  navPrimary: `${BASE} corner-cut-sm bg-accent px-4 py-[13px] md:px-[22px] text-[15px] font-bold tracking-[1px] text-accent-foreground hover:bg-[hsl(var(--accent-hover))]`,
  // Large pink button ("Start organizing", "Create account").
  primary: `${BASE} corner-cut bg-accent px-[30px] py-4 text-[17px] font-bold tracking-[1.5px] text-accent-foreground hover:bg-[hsl(var(--accent-hover))]`,
  // Large cyan outline button ("Log in" in the sign-up band).
  outline: `${BASE} corner-cut border border-accent-2 px-7 py-[15px] text-[17px] font-semibold tracking-[1.5px] text-accent-2 hover:bg-accent-2/10`,
  // Cyan text link ("See how it works ›").
  text: `${BASE} px-2 py-4 text-[17px] font-semibold tracking-[1.5px] text-accent-2 hover:text-accent`,
} as const
