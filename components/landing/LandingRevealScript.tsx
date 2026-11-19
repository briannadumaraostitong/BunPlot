import { InitialHtmlScript } from '@/components/theme/InitialHtmlScript'
import { PENDING_TIMEOUT_MS, PHONE_QUERY } from './reveal'

// Runs before the first paint, on phones without a reduced-motion
// preference: marks html[data-reveals="pending"], which hides the hero
// picture (motion.css), so LandingReveals can play it on load when it's on
// screen, rather than show it and then hide it. LandingReveals turns the
// mark to "on". If that hasn't happened within PENDING_TIMEOUT_MS (scripts
// slow to load, or failed), the mark is cleared and the picture shows as it
// is. Only in the server HTML (InitialHtmlScript): arriving by client-side
// navigation, nothing is hidden up front. Without JavaScript it never runs.
export function LandingRevealScript() {
  const script = `
(function() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia(${JSON.stringify(PHONE_QUERY)}).matches) return;
    var root = document.documentElement;
    root.setAttribute('data-reveals', 'pending');
    setTimeout(function() {
      if (root.getAttribute('data-reveals') === 'pending') root.removeAttribute('data-reveals');
    }, ${PENDING_TIMEOUT_MS});
  } catch (e) {}
})();
  `.trim()

  return <InitialHtmlScript html={script} />
}
