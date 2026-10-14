'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  backupBeforeSave,
  clearBackup,
  clearBackupAfterSave,
  clearOwnBackup,
  contentHash,
  newSessionId,
  readBackup,
  resumeBackups,
  sameContent,
  type BackupKind,
  type EditorBackup,
} from '@/lib/editorBackup'
import { clearSigningOut, hasSavesInFlight } from '@/lib/saveRegistry'

// How long after typing stops the local backup is written.
const BACKUP_DEBOUNCE_MS = 1000

interface UseEditorBackupOptions {
  kind: BackupKind
  id: string
  projectId: string
  // The saved content as loaded (first render). A backup identical to it
  // holds nothing unsaved.
  savedContent: unknown
  // The editor's serialized current and last-saved content, which the editor
  // keeps up to date.
  latestJson: RefObject<string>
  lastSavedJson: RefObject<string>
  // True when the content couldn't be loaded (the Places content check):
  // nothing is backed up then, so a broken load never replaces a good backup.
  disabledRef?: RefObject<boolean>
}

export interface BackupBannerState {
  // A backup from an earlier session that differs from the saved content.
  pending: EditorBackup | null
  // The saved content changed after that backup's edits started.
  changedSince: boolean
  // Restore was clicked after typing; the banner asks first.
  confirming: boolean
  restore: (apply: (content: Record<string, unknown>) => void) => void
  discard: () => void
  cancel: () => void
}

// Local backups for one rich-text editor (see lib/editorBackup.ts), shared by
// the Outline editor and place descriptions and notes. The editor does its
// own saving and calls beforeSave/afterSave around each save and noteEdit on
// each edit; this handles the rest. `backup` is stable across renders, so
// effects and callbacks can depend on it; `banner` is the restore banner's state.
export function useEditorBackup({
  kind,
  id,
  projectId,
  savedContent,
  latestJson,
  lastSavedJson,
  disabledRef,
}: UseEditorBackupOptions) {
  // This editor's identity: another tab's backup isn't cleared or overwritten by it.
  const [sessionId] = useState(newSessionId)
  // Hash of the saved version the edits build on; moves forward with each
  // successful save.
  const [initialHash] = useState(() => contentHash(savedContent))
  const baseHash = useRef(initialHash)
  // Read once on open. These editors only mount on the client, after their
  // data loads, so reading localStorage here can't cause a hydration mismatch.
  const [pending, setPending] = useState<EditorBackup | null>(() => {
    const backup = readBackup(kind, id)
    return backup && !sameContent(backup.content, savedContent) ? backup : null
  })
  const [confirming, setConfirming] = useState(false)
  // Whether the document was edited since it opened, so Restore can warn
  // before replacing that.
  const editedSinceOpen = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const backup = useMemo(() => {
    // Same document with keys reordered (jsonb reorders them) isn't an edit.
    function isUnsaved() {
      return (
        latestJson.current !== lastSavedJson.current &&
        !sameContent(JSON.parse(latestJson.current), JSON.parse(lastSavedJson.current))
      )
    }

    // Before each save, and shortly after typing: store what's on screen.
    // Another session's unresolved backup isn't overwritten (backupBeforeSave).
    function beforeSave(content: Record<string, unknown>) {
      if (disabledRef?.current) return
      backupBeforeSave({ kind, id, projectId, content, sessionId, baseHash: baseHash.current })
    }

    // After a successful save: the saved version moves forward, and a backup
    // holding exactly this is cleared. Anything newer is kept.
    function afterSave(content: Record<string, unknown>) {
      baseHash.current = contentHash(content)
      clearBackupAfterSave(kind, id, content)
    }

    // On each edit. Shortly after typing stops, back up what's on screen, so
    // a reload or a closed tab (which skip the unmount save) can't lose it.
    // Edited back to the saved version means nothing is unsaved, so this
    // session's backup is cleared instead.
    function noteEdit() {
      editedSinceOpen.current = true
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        if (!isUnsaved()) {
          clearOwnBackup(kind, id, sessionId)
          return
        }
        beforeSave(JSON.parse(latestJson.current))
      }, BACKUP_DEBOUNCE_MS)
    }

    return { isUnsaved, beforeSave, afterSave, noteEdit }
  }, [kind, id, projectId, sessionId, latestJson, lastSavedJson, disabledRef])

  // Backups are paused after a sign-out (and the final save skipped); an
  // editor opening means someone is signed in again, so they resume.
  useEffect(() => {
    resumeBackups()
    clearSigningOut()
  }, [])

  // A backup identical to the saved content holds nothing unsaved. Clear it,
  // or it would block this session's own backups (backupBeforeSave keeps
  // another session's backup when the content differs).
  useEffect(() => {
    const stored = readBackup(kind, id)
    if (stored && sameContent(stored.content, savedContent)) clearBackup(kind, id)
  }, [kind, id, savedContent])

  // The editor's unmount save backs up whatever is unsaved, so a pending
  // timer isn't needed after that.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  // Ask before closing or reloading the browser tab while there are unsaved
  // edits or a save is still running, and back up right now (localStorage
  // writes are synchronous), covering a reload within the debounce window.
  // Browsers show their own generic message. In-app navigation doesn't fire
  // this; the backups cover that.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      const unsaved = backup.isUnsaved()
      if (!unsaved && !hasSavesInFlight()) return
      if (unsaved) backup.beforeSave(JSON.parse(latestJson.current))
      e.preventDefault()
      // Older browsers only show the prompt when returnValue is set.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [backup, latestJson])

  const banner: BackupBannerState = {
    pending,
    changedSince: pending?.baseHash !== undefined && pending.baseHash !== initialHash,
    confirming,
    restore(apply) {
      if (!pending) return
      if (editedSinceOpen.current && !confirming) {
        setConfirming(true)
        return
      }
      // Cleared before applying, so the save that follows backs up the
      // restored content under this session instead of being blocked by the
      // old backup.
      clearBackup(kind, id)
      setPending(null)
      setConfirming(false)
      apply(pending.content)
    },
    discard() {
      clearBackup(kind, id)
      setPending(null)
      setConfirming(false)
    },
    cancel() {
      setConfirming(false)
    },
  }

  return { backup, banner }
}
