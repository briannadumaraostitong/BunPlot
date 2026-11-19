// Values shared by LandingReveals (client) and LandingRevealScript (the
// pre-paint script the server page renders): plain values both can import.

// Below Tailwind's md breakpoint, as in useIsBelowMd. Hero pictures
// (data-reveal="hero") wait for LandingReveals only there; from md up they
// play as the page loads, in CSS alone.
export const PHONE_QUERY = '(max-width: 767px)'

// How far up the screen an element must come to count as in view: 10% up
// from the bottom (the observer's rootMargin).
export const IN_VIEW = 0.9

// How long the pre-paint script keeps a phone's hero picture hidden waiting
// for LandingReveals, before it gives up and shows it as it is.
export const PENDING_TIMEOUT_MS = 3000
