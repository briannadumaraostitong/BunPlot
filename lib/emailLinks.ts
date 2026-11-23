import type { EmailOtpType } from '@supabase/supabase-js'

// The links in Supabase's emails (supabase/email-templates/) open
// /confirm?token_hash=…&type=…&next=…: a page with a Continue button, which
// posts to /api/auth/confirm to verify the token there. Verifying on the
// button rather than on opening the link means an email security scanner,
// which opens every link in a message before its reader does, can't use the
// one-time token up. It also works in any browser, unlike the code exchange
// in /api/auth/callback, which needs the one the request came from.

// The kinds of link this accepts, each with the page's wording (the panel
// title in capitals, as Cyberpunk shows it) and where it goes once verified
// when the link names nowhere itself.
export const EMAIL_LINKS = {
  recovery: {
    eyebrow: 'Forgot your password',
    panelTitle: 'RESET PASSWORD',
    title: 'Reset your password',
    text: 'Continue to choose a new password for your account.',
    next: '/reset-password',
  },
  signup: {
    eyebrow: 'Almost there',
    panelTitle: 'CONFIRM EMAIL',
    title: 'Confirm your email',
    text: 'Continue to confirm your email address and open your workspace.',
    next: '/dashboard',
  },
  email_change: {
    eyebrow: 'Account',
    panelTitle: 'CONFIRM EMAIL',
    title: 'Confirm your new email',
    text: 'Continue to confirm this email address for your account.',
    next: '/settings',
  },
  magiclink: {
    eyebrow: 'Welcome back',
    panelTitle: 'LOG IN',
    title: 'Log in to your workspace',
    text: 'Continue to log in.',
    next: '/dashboard',
  },
} satisfies Partial<Record<EmailOtpType, { eyebrow: string; panelTitle: string; title: string; text: string; next: string }>>

export type EmailLinkType = keyof typeof EMAIL_LINKS

// Only the kinds above: the type comes from the link, so it's untrusted.
export function emailLinkType(value: string | null | undefined): EmailLinkType | null {
  return value && Object.hasOwn(EMAIL_LINKS, value) ? (value as EmailLinkType) : null
}

// Why the page shows an error instead of the button (?error=…).
export const EMAIL_LINK_ERRORS = {
  // Missing, malformed, or of a kind we don't send.
  invalid: "This link isn't complete. Open it again from the email, or request a new one.",
  // Supabase refused the token: used already, expired, or replaced by a newer email.
  expired: 'This link has expired or was already used. Request a new one.',
} as const

export type EmailLinkError = keyof typeof EMAIL_LINK_ERRORS
