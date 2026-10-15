import { isAuthApiError, isAuthSessionMissingError, type AuthError } from '@supabase/supabase-js'

// getUser() reports two very different failures the same way (user: null):
// no valid session, and Supabase being unreachable. Only the first means
// signed out. AuthSessionMissingError covers no cookie and a session the
// server says is gone; a 4xx AuthApiError is a token it rejected. Anything
// else (AuthRetryableFetchError for network failures and 5xx, AuthUnknownError)
// is an outage, which must not log anyone out.
// Kept free of next/navigation so proxy.ts can import it.
export function isAuthOutage(error: AuthError | null): boolean {
  if (!error) return false
  if (isAuthSessionMissingError(error)) return false
  if (isAuthApiError(error) && error.status < 500) return false
  return true
}
