// Lets sign-out make sure edits are saved first. Open editors register a
// "save now" function, and every save in flight is tracked, including an
// editor's final save after it has already closed.

const FLUSH_TIMEOUT_MS = 10_000

type Flusher = () => Promise<boolean>

const flushers = new Set<Flusher>()
const inFlight = new Set<Promise<boolean>>()
let signingOut = false

// Returns the unregister function, so it can be an effect's cleanup.
export function registerFlusher(flush: Flusher) {
  flushers.add(flush)
  return () => {
    flushers.delete(flush)
  }
}

// Records a save until it settles. `succeeded` says whether its result counts
// as saved. Returns the original promise, so callers are unchanged.
export function trackSave<T>(promise: Promise<T>, succeeded: (result: T) => boolean): Promise<T> {
  const tracked = promise.then(succeeded, () => false)
  inFlight.add(tracked)
  void tracked.finally(() => inFlight.delete(tracked))
  return promise
}

// Whether any tracked save hasn't settled yet (for the beforeunload prompt).
export function hasSavesInFlight() {
  return inFlight.size > 0
}

// Saves every open editor and waits for all saves in flight. True only if
// everything saved; false on any failure, or if it takes longer than 10
// seconds (a hanging request mustn't block sign-out forever).
export async function flushAllEdits(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), FLUSH_TIMEOUT_MS)
  })
  const work = (async () => {
    const flushed = await Promise.all([...flushers].map((flush) => flush().catch(() => false)))
    // Snapshot after flushing, so the saves the flushers just started count.
    const saved = await Promise.all([...inFlight])
    return flushed.every(Boolean) && saved.every(Boolean)
  })()
  try {
    return await Promise.race([work, timeout])
  } finally {
    clearTimeout(timer)
  }
}

// Set once sign-out is confirmed: an editor's final save would only fail after
// it (and its toast would land on the login page), so it skips itself.
export function markSigningOut() {
  signingOut = true
}

// Reset when an editor opens, which means someone is signed in again.
export function clearSigningOut() {
  signingOut = false
}

export function isSigningOut() {
  return signingOut
}
