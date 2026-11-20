// Where to send someone after signing in or following an email link: a path
// from a query parameter (?next=, ?redirectTo=), but only one on this site.
// Anything else falls back, so a crafted link can't send people elsewhere:
// a full or protocol-relative URL ("https://evil.com", "//evil.com"), a
// backslash that browsers read as a slash ("/\evil.com"), or tabs and line
// breaks that URL parsing drops ("/\t/evil.com"). Prefixing the origin isn't
// enough on its own: "@evil.com" after "https://bunplot.app" makes
// evil.com the host. The path is parsed against a placeholder origin and
// kept only if it stays there; what's returned is that parsed path, so the
// caller never sees the raw input.
const PLACEHOLDER = 'https://bunplot.invalid'

export function safeRedirectPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  try {
    const url = new URL(next, PLACEHOLDER)
    if (url.origin !== PLACEHOLDER) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
