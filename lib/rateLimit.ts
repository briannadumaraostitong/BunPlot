import type { createClient } from '@/lib/supabase/server'
import type { RateLimitedAction } from '@/types/database'

// Server actions' side of take_rate_limit (supabase/schema.sql): takes one
// of the signed-in user's slots for an action before the expensive work.
// duplicate_project takes its own inside the database, so this is for the
// exports.

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

// What to tell someone who has used every slot, by action.
export const RATE_LIMIT_MESSAGES: Record<RateLimitedAction, string> = {
  duplicate_project: 'Too many duplicates in the last hour. Try again later.',
  export: 'Too many exports in the last few minutes. Wait a few minutes, then try again.',
}

// null when there's a slot (go ahead), else the message to return. A failed
// check stops the work too: the limit only means something if it can't be
// skipped by an error.
export async function takeRateLimit(supabase: ServerSupabase, action: RateLimitedAction): Promise<string | null> {
  // The untyped client's .rpc() args (see actions/projects.ts).
  const { data, error } = await supabase.rpc('take_rate_limit', { p_action: action } as never)
  if (error) {
    console.error('Rate limit check failed:', action, error.message)
    return "Couldn't start that right now. Try again in a moment."
  }
  return data === true ? null : RATE_LIMIT_MESSAGES[action]
}
