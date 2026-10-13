import { toast } from 'sonner'

// User-visible error feedback for failed actions. Errors only — optimistic UI
// already shows success. Wording: "Couldn't [verb] [thing].", optionally
// followed by a short retry hint ("Check your connection and try again.").
// Raw Supabase/Postgres text never goes in the toast, only to the console.

interface NotifyOptions {
  // A fixed id makes repeat failures replace one toast instead of stacking —
  // for anything that retries on its own, like autosave ('outline-save').
  id?: string
}

export function notifyError(message: string, detail?: unknown, options?: NotifyOptions) {
  if (detail !== undefined) console.error(message, detail)
  toast.error(message, { id: options?.id })
}

// Removes a deduped error toast once the thing it reported has recovered
// (e.g. the next autosave succeeded).
export function dismissError(id: string) {
  toast.dismiss(id)
}

// Server actions reject, rather than returning { error }, when the request
// itself fails (offline, server unreachable). Folds that into the same shape
// so reportResult covers both: await settle(updateOutline(...)).
export function settle<T>(promise: Promise<T>): Promise<T | { error: string }> {
  return promise.catch((err: unknown) => ({
    error: err instanceof Error ? err.message : String(err),
  }))
}

// For server-action results shaped { error: string } | T. Toasts on error and
// returns false; otherwise returns true and narrows result to its success
// shape, so call sites stay one line:
//   if (!reportResult(result, "Couldn't delete the place.")) return
export function reportResult<T>(
  result: T,
  message: string,
  options?: NotifyOptions
): result is Exclude<T, { error: string }> {
  if (typeof result === 'object' && result !== null && 'error' in result) {
    notifyError(message, (result as { error: unknown }).error, options)
    return false
  }
  return true
}
