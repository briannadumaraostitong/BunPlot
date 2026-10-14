// Local backups of rich-text edits that haven't reached the database yet.
// A backup is written before every save attempt and cleared once a save
// succeeds, so one survives a failed save, a closed tab or a crash. Kinds are
// listed so place descriptions and notes can use the same storage later.
// Every storage access is wrapped: localStorage can be unavailable (private
// mode, blocked site data) or full, and a backup must never block a save.

export type BackupKind = 'outline'

export interface EditorBackup {
  kind: BackupKind
  id: string
  projectId: string
  content: Record<string, unknown>
  // When this backup was written.
  savedAt: string
  // updated_at of the saved version these edits started from, to tell
  // whether the saved copy has changed since (another tab or device).
  baseUpdatedAt: string
  // The editor session that wrote it. A successful save in a different
  // session (another tab) mustn't clear it unless the content matches.
  sessionId: string
}

const PREFIX = 'bunplot:backup:'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

// Set on sign-out. An open editor's final save runs only when the page
// changes, after the sign-out, and would otherwise write a fresh backup right
// after the clear. The next editor to open resumes backups (resumeBackups),
// which can only happen after someone signs in again.
let backupsPaused = false

export function resumeBackups() {
  backupsPaused = false
}

function keyFor(kind: BackupKind, id: string) {
  return `${PREFIX}${kind}:${id}`
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// JSON with object keys sorted at every level. Postgres jsonb reorders keys,
// so a document read back from the database can stringify differently from
// the editor's copy even when nothing changed; compare with this instead.
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

export function sameContent(a: unknown, b: unknown) {
  return stableStringify(a) === stableStringify(b)
}

export function newSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Returns false if the backup couldn't be stored (unavailable or full);
// callers just carry on, since the save itself still runs.
export function writeBackup(backup: Omit<EditorBackup, 'savedAt'>): boolean {
  if (backupsPaused) return false
  const storage = getStorage()
  if (!storage) return false
  try {
    const value: EditorBackup = { ...backup, savedAt: new Date().toISOString() }
    storage.setItem(keyFor(backup.kind, backup.id), JSON.stringify(value))
    return true
  } catch (err) {
    console.error('Editor backup write failed:', err)
    return false
  }
}

// Before a save attempt: back up the content about to be saved, unless
// another session's backup with different content is already stored. That
// one holds edits nobody has restored or discarded yet, so it's kept rather
// than overwritten. Returns whether a backup was written.
export function backupBeforeSave(backup: Omit<EditorBackup, 'savedAt'>): boolean {
  const existing = readBackup(backup.kind, backup.id)
  if (existing && existing.sessionId !== backup.sessionId && !sameContent(existing.content, backup.content)) {
    return false
  }
  return writeBackup(backup)
}

export function readBackup(kind: BackupKind, id: string): EditorBackup | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(keyFor(kind, id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<EditorBackup>
    // Anything malformed (hand-edited, or from an older shape) is dropped.
    if (
      parsed.kind !== kind ||
      parsed.id !== id ||
      typeof parsed.projectId !== 'string' ||
      typeof parsed.savedAt !== 'string' ||
      typeof parsed.baseUpdatedAt !== 'string' ||
      typeof parsed.sessionId !== 'string' ||
      parsed.content === null ||
      typeof parsed.content !== 'object'
    ) {
      storage.removeItem(keyFor(kind, id))
      return null
    }
    return parsed as EditorBackup
  } catch {
    return null
  }
}

export function clearBackup(kind: BackupKind, id: string) {
  try {
    getStorage()?.removeItem(keyFor(kind, id))
  } catch {
    // Nothing to do: a leftover backup is pruned later or offered on open.
  }
}

// After a successful save: clear the backup only if it holds exactly what was
// just saved. Anything else is kept: newer typing this session backed up while
// the save was in flight, or another tab's unsaved edits.
export function clearBackupAfterSave(kind: BackupKind, id: string, savedContent: unknown) {
  const backup = readBackup(kind, id)
  if (!backup) return
  if (sameContent(backup.content, savedContent)) clearBackup(kind, id)
}

// Clears the backup only if this session wrote it: for when this session's
// edits were undone back to the saved version. Another tab's backup is kept.
export function clearOwnBackup(kind: BackupKind, id: string, sessionId: string) {
  const backup = readBackup(kind, id)
  if (backup?.sessionId === sessionId) clearBackup(kind, id)
}

// Removes backups older than 30 days (any kind or project), and backups of
// this kind in this project whose item no longer exists (deleted elsewhere).
export function pruneBackups(kind: BackupKind, projectId: string, existingIds: Iterable<string>) {
  const storage = getStorage()
  if (!storage) return
  const keep = new Set(existingIds)
  const now = Date.now()
  try {
    const toRemove: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (!key?.startsWith(PREFIX)) continue
      let backup: Partial<EditorBackup> | null = null
      try {
        backup = JSON.parse(storage.getItem(key) ?? 'null')
      } catch {
        // Unreadable: treat as stale.
      }
      const savedAt = backup?.savedAt ? Date.parse(backup.savedAt) : NaN
      const expired = !Number.isFinite(savedAt) || now - savedAt > MAX_AGE_MS
      const orphaned =
        backup?.kind === kind && backup.projectId === projectId && !keep.has(backup.id ?? '')
      if (expired || orphaned) toRemove.push(key)
    }
    // Removed after the loop, since removing shifts storage.key indexes.
    for (const key of toRemove) storage.removeItem(key)
  } catch (err) {
    console.error('Editor backup cleanup failed:', err)
  }
}

// Whether any backup is stored (any kind or project): unsaved edits that
// signing out would delete.
export function hasAnyBackup(): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    for (let i = 0; i < storage.length; i++) {
      if (storage.key(i)?.startsWith(PREFIX)) return true
    }
  } catch {
    // Unreadable storage: nothing we can report.
  }
  return false
}

// On sign-out, so someone else using this browser doesn't inherit drafts.
// Also pauses backup writes until the next editor opens (see backupsPaused).
export function clearAllBackups() {
  backupsPaused = true
  const storage = getStorage()
  if (!storage) return
  try {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith(PREFIX)) keys.push(key)
    }
    for (const key of keys) storage.removeItem(key)
  } catch (err) {
    console.error('Editor backup clear failed:', err)
  }
}
