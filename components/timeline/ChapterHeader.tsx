'use client'

import { useState } from 'react'
import { Plus, X, Loader2, Eye, EyeOff } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RenameHint } from '@/components/ui/rename-hint'
import { RenameButton } from '@/components/ui/rename-button'
import { cn } from '@/lib/utils'
import { createChapter, updateChapter, deleteChapter } from '@/actions/chapters'
import { ChapterLinkPicker } from './ChapterLinkPicker'
import { DeleteChapterDialog } from './DeleteChapterDialog'
import { reportResult, settle } from '@/lib/notify'
import type { Chapter, Event } from '@/types/database'

const DEFAULT_CHAPTER_WIDTH = 220
// Below md, so the label column doesn't take a third of the screen and a
// whole chapter fits beside it. Still within the MIN_* limits below.
const MOBILE_CHAPTER_WIDTH = 180
const MIN_CHAPTER_WIDTH = 120
const MAX_CHAPTER_WIDTH = 500

const DEFAULT_LABEL_WIDTH = 120
const MOBILE_LABEL_WIDTH = 88
const MIN_LABEL_WIDTH = 80
const MAX_LABEL_WIDTH = 300

interface ChapterHeaderProps {
  projectId: string
  // Every chapter, hidden included — needed for ChapterLinkPicker's "link to"
  // list and the visibility popover below, neither of which should lose
  // access to a chapter just because it's currently hidden.
  chapters: Chapter[]
  // What actually renders as a column. A subset of `chapters`.
  visibleChapters: Chapter[]
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
  visibleChapters,
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
    const result = await settle(createChapter(projectId, `Chapter ${chapters.length + 1}`))
    if (reportResult(result, "Couldn't create the chapter.")) {
      await new Promise((r) => setTimeout(r, 400))
      onAdded()
    }
    setAdding(false)
  }

  return (
    // Sticks to the top edge of the grid's scroll area (-top-4 offsets that
    // area's p-4, which sticky positioning otherwise leaves as a gap the lanes
    // scroll through), above the lanes (z-20 clears a dragging card's z-10).
    // Opaque, so lanes don't show through while stuck: the same 50% secondary
    // as before, laid over the page background it used to show through.
    <div className="sticky -top-4 z-20 flex h-10 border-b border-border bg-background bg-[linear-gradient(hsl(var(--secondary)/0.5),hsl(var(--secondary)/0.5))] shrink-0 shadow-sm">
      {/* Label column with resize handle */}
      <ResizableCell
        width={labelWidth}
        minWidth={MIN_LABEL_WIDTH}
        maxWidth={MAX_LABEL_WIDTH}
        onWidthChange={onLabelWidthChange}
        className="border-r border-border bg-secondary/50"
      >
        <span data-slot="timeline-corner-label" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
          Layer
        </span>
      </ResizableCell>

      {/* Chapter columns */}
      {visibleChapters.map((chapter) => (
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

      {/* Always rendered regardless of chapters.length or how many are
          hidden — this is the only surface a hidden chapter can be restored
          from, since (unlike layers' always-present LayerPanel) a hidden
          chapter's own column, and the toggle on it, disappears with it. */}
      <ChapterVisibilityPopover chapters={chapters} projectId={projectId} onUpdated={onUpdated} />
    </div>
  )
}

function ChapterVisibilityPopover({
  chapters,
  projectId,
  onUpdated,
}: {
  chapters: Chapter[]
  projectId: string
  onUpdated: (id: string, updates: Partial<Chapter>) => void
}) {
  const hiddenCount = chapters.filter((c) => !c.visible).length

  async function handleToggle(chapter: Chapter) {
    const next = !chapter.visible
    onUpdated(chapter.id, { visible: next })
    const result = await settle(updateChapter(chapter.id, projectId, { visible: next }))
    if (!reportResult(result, next ? "Couldn't show the chapter." : "Couldn't hide the chapter.")) {
      // Snap the optimistic change back so the UI doesn't keep claiming a
      // write that never actually landed.
      onUpdated(chapter.id, { visible: chapter.visible })
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          title="Show or hide chapters"
          className={cn(
            'relative flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary after:absolute after:-inset-1',
            hiddenCount > 0 && 'text-foreground'
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          {hiddenCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {hiddenCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 gap-0 p-1">
        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Chapters
        </p>
        {chapters.length === 0 ? (
          <p className="px-2 py-1.5 text-[11px] text-muted-foreground">No chapters yet</p>
        ) : (
          chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => handleToggle(chapter)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-secondary/50',
                !chapter.visible && 'text-muted-foreground'
              )}
            >
              {chapter.visible ? (
                <Eye className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{chapter.title}</span>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
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
  // Pointer events with capture, so the same code handles mouse, touch and
  // pen: once captured, moves keep coming to the handle even when the finger
  // or cursor leaves it, so nothing is registered on document. The handle's
  // touch-none stops the browser from claiming the touch as a scroll.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return // primary button only (touch and pen report 0)
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)
    const startX = e.clientX
    const startWidth = width

    function handlePointerMove(ev: PointerEvent) {
      const delta = ev.clientX - startX
      onWidthChange(Math.min(maxWidth, Math.max(minWidth, startWidth + delta)))
    }

    // Declared alongside handlePointerMove so the identities are fixed for the
    // life of one drag — exactly the listeners registered here are removed.
    // pointercancel covers the browser or OS interrupting a touch.
    function handlePointerEnd() {
      handle.removeEventListener('pointermove', handlePointerMove)
      handle.removeEventListener('pointerup', handlePointerEnd)
      handle.removeEventListener('pointercancel', handlePointerEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    handle.addEventListener('pointermove', handlePointerMove)
    handle.addEventListener('pointerup', handlePointerEnd)
    handle.addEventListener('pointercancel', handlePointerEnd)
  }

  return (
    <div
      className={`relative flex items-center shrink-0 ${className ?? ''}`}
      style={{ width, minWidth: width }}
    >
      {children}

      {/* Drag handle */}
      <div
        onPointerDown={onPointerDown}
        className="absolute right-0 top-0 bottom-0 w-1 touch-none cursor-col-resize z-10 group pointer-coarse:after:absolute pointer-coarse:after:inset-y-0 pointer-coarse:after:left-0 pointer-coarse:after:-right-2"
        title="Drag to resize"
      >
        <div className="absolute right-0 top-0 bottom-0 w-px bg-primary/0 group-hover:bg-primary/60 group-active:bg-primary/60 transition-colors" />
      </div>
    </div>
  )
}

function ChapterCell({
  chapter,
  allChapters,
  projectId,
  events,
  onRemoved,
  onRenamed,
  onUpdated,
}: {
  chapter: Chapter
  allChapters: Chapter[]
  projectId: string
  events: Event[]
  onRemoved: (id: string) => void
  onRenamed: (id: string, title: string) => void
  onUpdated: (id: string, updates: Partial<Chapter>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(chapter.title)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const chapterEventCount = events.filter((e) => e.chapter_id === chapter.id).length
  // "01", "02"… by place in position order (hidden chapters still count), for
  // themes that label the column; positions themselves can have gaps.
  const chapterNumber = String(allChapters.findIndex((c) => c.id === chapter.id) + 1).padStart(2, '0')

  async function handleRename() {
    if (!title.trim() || title === chapter.title) {
      setTitle(chapter.title)
      setEditing(false)
      return
    }
    const result = await settle(updateChapter(chapter.id, projectId, { title: title.trim() }))
    if (reportResult(result, "Couldn't rename the chapter.")) onRenamed(chapter.id, title.trim())
    setEditing(false)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    // A chapter with events asks what to do with them first; an empty one
    // deletes immediately, as before.
    if (chapterEventCount > 0) {
      setDeleteDialogOpen(true)
      return
    }
    setDeleting(true)
    const result = await settle(deleteChapter(chapter.id, projectId))
    if (reportResult(result, "Couldn't delete the chapter.")) onRemoved(chapter.id)
    setDeleting(false)
  }

  async function handleHide(e: React.MouseEvent) {
    e.stopPropagation()
    onUpdated(chapter.id, { visible: false })
    const result = await settle(updateChapter(chapter.id, projectId, { visible: false }))
    if (!reportResult(result, "Couldn't hide the chapter.")) {
      onUpdated(chapter.id, { visible: true })
    }
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
        <RenameHint name={chapter.title}>
          <span
            data-slot="chapter-title"
            data-chapter-number={chapterNumber}
            className="text-xs font-semibold truncate cursor-default flex-1"
            onDoubleClick={() => setEditing(true)}
          >
            {chapter.title}
          </span>
        </RenameHint>
      )}

      {!editing && <RenameButton onClick={() => setEditing(true)} label="Rename chapter" />}

      {/* Hide-only, not a visible/hidden toggle — this button only ever
          renders on a chapter that's currently rendering as a column (i.e.
          currently visible), so there's nothing for it to toggle back from.
          Restoring a hidden chapter is exclusively the visibility popover's
          job, since that's the only surface still showing it. */}
      {!editing && (
        <button
          onClick={handleHide}
          title="Hide chapter"
          className="relative opacity-100 md:can-hover:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity shrink-0 after:absolute after:-inset-y-2.5 after:-inset-x-1.5"
        >
          <EyeOff className="h-3 w-3" />
        </button>
      )}

      {!editing && (
        <ChapterLinkPicker chapter={chapter} allChapters={allChapters} projectId={projectId} />
      )}

      {!editing && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="relative opacity-100 md:can-hover:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 after:absolute after:-inset-y-2.5 after:-inset-x-1.5"
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </button>
      )}

      {/* Mounted only while open, so its choice/destination state starts
          fresh each time rather than needing an effect to reset it. */}
      {deleteDialogOpen && (
        <DeleteChapterDialog
          chapter={chapter}
          allChapters={allChapters}
          projectId={projectId}
          eventCount={chapterEventCount}
          onClose={() => setDeleteDialogOpen(false)}
          onDeleted={() => onRemoved(chapter.id)}
        />
      )}
    </div>
  )
}

export { DEFAULT_CHAPTER_WIDTH, DEFAULT_LABEL_WIDTH, MOBILE_CHAPTER_WIDTH, MOBILE_LABEL_WIDTH }