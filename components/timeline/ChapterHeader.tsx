'use client'

import { useState } from 'react'
import { Plus, X, Loader2, FileText } from 'lucide-react'
import { createChapter, updateChapter, deleteChapter } from '@/actions/chapters'
import { ChapterLinkPicker } from './ChapterLinkPicker'
import { ChapterDetailModal } from './ChapterDetailModal'
import type { Chapter, Character, Event } from '@/types/database'

const DEFAULT_CHAPTER_WIDTH = 220
const MIN_CHAPTER_WIDTH = 120
const MAX_CHAPTER_WIDTH = 500

const DEFAULT_LABEL_WIDTH = 120
const MIN_LABEL_WIDTH = 80
const MAX_LABEL_WIDTH = 300

interface ChapterHeaderProps {
  projectId: string
  chapters: Chapter[]
  allCharacters: Character[]
  events: Event[]
  onAdded: () => void
  onRemoved: (id: string) => void
  onRenamed: (id: string, title: string) => void
  onUpdated: (id: string, updates: Partial<Chapter>) => void
  labelWidth: number
  chapterWidth: number
  onLabelWidthChange: (w: number) => void
  onChapterWidthChange: (w: number) => void
}

export function ChapterHeader({
  projectId,
  chapters,
  allCharacters,
  events,
  onAdded,
  onRemoved,
  onRenamed,
  onUpdated,
  labelWidth,
  chapterWidth,
  onLabelWidthChange,
  onChapterWidthChange,
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
    <div className="flex h-10 border-b border-border bg-secondary/50 shrink-0 shadow-sm">
      {/* Label column with resize handle */}
      <ResizableCell
        width={labelWidth}
        minWidth={MIN_LABEL_WIDTH}
        maxWidth={MAX_LABEL_WIDTH}
        onWidthChange={onLabelWidthChange}
        className="border-r border-border bg-secondary/50"
      >
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
          Layer
        </span>
      </ResizableCell>

      {/* Chapter columns */}
      {chapters.map((chapter) => (
        <ResizableCell
          key={chapter.id}
          width={chapterWidth}
          minWidth={MIN_CHAPTER_WIDTH}
          maxWidth={MAX_CHAPTER_WIDTH}
          onWidthChange={onChapterWidthChange}
          className="border-r border-border"
        >
          <ChapterCell
            chapter={chapter}
            allChapters={chapters}
            projectId={projectId}
            allCharacters={allCharacters}
            events={events}
            onRemoved={onRemoved}
            onRenamed={onRenamed}
            onUpdated={onUpdated}
          />
        </ResizableCell>
      ))}

      {/* Add chapter button */}
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

function ResizableCell({
  width,
  minWidth,
  maxWidth,
  onWidthChange,
  className,
  children,
}: {
  width: number
  minWidth: number
  maxWidth: number
  onWidthChange: (w: number) => void
  className?: string
  children: React.ReactNode
}) {
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width

    function handleMouseMove(ev: MouseEvent) {
      const delta = ev.clientX - startX
      onWidthChange(Math.min(maxWidth, Math.max(minWidth, startWidth + delta)))
    }

    // Declared alongside handleMouseMove so both identities are fixed for the
    // life of one drag — exactly the pair registered here is the pair removed.
    function handleMouseUp() {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className={`relative flex items-center shrink-0 ${className ?? ''}`}
      style={{ width, minWidth: width }}
    >
      {children}

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group"
        title="Drag to resize"
      >
        <div className="absolute right-0 top-0 bottom-0 w-px bg-primary/0 group-hover:bg-primary/60 transition-colors" />
      </div>
    </div>
  )
}

function ChapterCell({
  chapter,
  allChapters,
  projectId,
  allCharacters,
  events,
  onRemoved,
  onRenamed,
  onUpdated,
}: {
  chapter: Chapter
  allChapters: Chapter[]
  projectId: string
  allCharacters: Character[]
  events: Event[]
  onRemoved: (id: string) => void
  onRenamed: (id: string, title: string) => void
  onUpdated: (id: string, updates: Partial<Chapter>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(chapter.title)
  const [deleting, setDeleting] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  async function handleRename() {
    if (!title.trim() || title === chapter.title) {
      setTitle(chapter.title)
      setEditing(false)
      return
    }
    await updateChapter(chapter.id, projectId, { title: title.trim() })
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
    <div className="group flex items-center justify-between gap-1 px-3 flex-1 min-w-0">
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

      {/* An explicit button rather than a single-click on the title: the title
          already owns double-click-to-rename, and a click handler there would
          fire on the first click of that double-click, making rename
          unreachable — the same bug that hit StatusPicker's rename. */}
      {!editing && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setDetailOpen(true)
          }}
          title="Chapter details"
          className="relative opacity-100 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity shrink-0 after:absolute after:-inset-y-2.5 after:-inset-x-1.5"
        >
          <FileText className="h-3 w-3" />
        </button>
      )}

      {!editing && (
        <ChapterLinkPicker chapter={chapter} allChapters={allChapters} projectId={projectId} />
      )}

      {!editing && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="relative opacity-100 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 after:absolute after:-inset-y-2.5 after:-inset-x-1.5"
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </button>
      )}

      <ChapterDetailModal
        chapter={chapter}
        projectId={projectId}
        allCharacters={allCharacters}
        events={events}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdated={onUpdated}
      />
    </div>
  )
}

export { DEFAULT_CHAPTER_WIDTH, DEFAULT_LABEL_WIDTH }