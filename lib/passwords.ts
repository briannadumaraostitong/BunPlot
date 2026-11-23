// Password rules shared by sign up, reset and change. Supabase enforces the
// same minimum (Authentication → Providers → Email → minimum length), so keep
// the two in step.
export const MIN_PASSWORD_LENGTH = 10

export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters`

// What's wrong with a new password, as a sentence to show, or null.
// confirmation: the repeat field, when the form has one.
export function passwordProblem(password: string, confirmation?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (confirmation !== undefined && confirmation !== password) return "The passwords don't match."
  return null
}

// Supabase's refusals of a new password, in BunPlot's words.
export function passwordErrorMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case 'same_password':
      return 'Choose a password different from your current one.'
    case 'weak_password':
      return `That password is too weak. Use at least ${MIN_PASSWORD_LENGTH} characters, mixing words, numbers or symbols.`
    default:
      return "Couldn't update your password. Try again."
  }
}

// How a session signed in, from its token's amr claim: either detailed
// entries ({ method, timestamp }) or bare method names.
type AmrClaim = ({ method: string; timestamp: number } | string)[] | undefined

// The method an emailed link signs in with: Supabase records a session from
// a reset link (verifyOtp with its token hash) as `otp` (seen on a real reset,
// 2026-11-23). BunPlot has no code or magic link logins of its own, so it
// only comes from email links, which prove the reader has the inbox.
const EMAIL_LINK_METHODS = new Set(['otp'])

// How long after following the link the reset page still accepts it.
const RESET_WINDOW_SECONDS = 60 * 60

// Whether this session came from an emailed link within the reset window, so
// /reset-password can set a new password without the current one. A session
// from an ordinary log in changes its password from Settings instead.
// issuedAt: the token's iat, for amr entries without a timestamp.
export function isRecentEmailLinkSession(amr: AmrClaim, issuedAt: number | undefined, now = Date.now() / 1000): boolean {
  return (amr ?? []).some((entry) => {
    const method = typeof entry === 'string' ? entry : entry.method
    const at = typeof entry === 'string' ? issuedAt : entry.timestamp
    return EMAIL_LINK_METHODS.has(method) && at !== undefined && now - at <= RESET_WINDOW_SECONDS
  })
}
