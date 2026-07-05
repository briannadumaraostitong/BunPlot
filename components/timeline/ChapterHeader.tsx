'use client'

import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { createChapter, updateChapter, deleteChapter } from '@/actions/chapters'
import type { Chapter } from '@/types/database'

const CHAPTER_WIDTH = 220 // px per chapter column

interface ChapterHeaderProps {
  projectId: string
  chapters: Chapter[]
  onAdded: () => void
  onRemoved: (id: string) => void
  onRenamed: (id: string, title: string) => void
}

export function ChapterHeader({
  projectId,
  chapters,
  onAdded,
  onRemoved,
  onRenamed,
}: ChapterHeaderProps) {
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (adding) return
    setAdding(true)
    await createChapter(projectId, `Chapter ${chapters.length + 1}`)
    await new Promise((r) => setTimeout(r, 400))
    onAdded()
    setAdding(false)
  }

  return (
    <div className="flex h-10 border-b border-border bg-secondary/50 shrink-0">
      <div
        className="shrink-0 border-r border-border bg-secondary/50"
        style={{ width: 120, minWidth: 120 }}
      />

      {chapters.map((chapter) => (
        <ChapterCell
          key={chapter.id}
          chapter={chapter}
          projectId={projectId}
          onRemoved={onRemoved}
          onRenamed={onRenamed}
        />
      ))}

      <button
        onClick={handleAdd}
        disabled={adding}
        className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 px-4 border-r border-border"
        style={{ minWidth: 140 }}
      >
        {adding ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        Add Chapter
      </button>
    </div>
  )
}

function ChapterCell({
  chapter,
  projectId,
  onRemoved,
  onRenamed,
}: {
  chapter: Chapter
  projectId: string
  onRemoved: (id: string) => void
  onRenamed: (id: string, title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(chapter.title)
  const [deleting, setDeleting] = useState(false)

  async function handleRename() {
    if (!title.trim() || title === chapter.title) {
      setTitle(chapter.title)
      setEditing(false)
      return
    }
    await updateChapter(chapter.id, projectId, title.trim())
    onRenamed(chapter.id, title.trim())
    setEditing(false)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setDeleting(true)
    await deleteChapter(chapter.id, projectId)
    onRemoved(chapter.id)
    setDeleting(false)
  }

  return (
    <div
      className="group flex items-center justify-between gap-1 px-3 border-r border-border shrink-0"
      style={{ width: CHAPTER_WIDTH, minWidth: CHAPTER_WIDTH }}
    >
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') { setTitle(chapter.title); setEditing(false) }
          }}
          onBlur={handleRename}
          className="flex-1 min-w-0 text-xs bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:border-primary"
        />
      ) : (
        <span
          className="text-xs font-semibold truncate cursor-pointer flex-1"
          onDoubleClick={() => setEditing(true)}
          title="Double-click to rename"
        >
          {chapter.title}
        </span>
      )}

      {!editing && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  )
}

export { CHAPTER_WIDTH }