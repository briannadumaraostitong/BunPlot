'use client'

import { useState } from 'react'

// Inline rename, shared by the outline sidebar's rows and the document title
// in the menu bar. Enter or blur saves; Escape, an empty name or an unchanged
// one puts the old name back.
export function useInlineRename(name: string, onRename: (name: string) => void) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  function start() {
    setDraft(name)
    setEditing(true)
  }

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) onRename(trimmed)
    setEditing(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  return { editing, draft, setDraft, start, commit, onKeyDown }
}
