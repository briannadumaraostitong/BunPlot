'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { deleteChapter } from '@/actions/chapters'
import { getPanelCountForChapter } from '@/actions/panels'
import { settle } from '@/lib/notify'
import type { Chapter } from '@/types/database'

interface DeleteChapterDialogProps {
  chapter: Chapter
  // Every chapter, hidden included — any other chapter is a valid destination.
  allChapters: Chapter[]
  projectId: string
  eventCount: number
  onClose: () => void
  onDeleted: () => void
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

// Default destination: the chapter just before this one, else the next one —
// usually where a deleted chapter's content belongs.
function defaultDestination(chapter: Chapter, others: Chapter[]) {
  const before = others.filter((c) => c.position < chapter.position)
  return (before[before.length - 1] ?? others.find((c) => c.position > chapter.position) ?? null)?.id ?? null
}

export function DeleteChapterDialog({
  chapter,
  allChapters,
  projectId,
  eventCount,
  onClose,
  onDeleted,
}: DeleteChapterDialogProps) {
  const others = allChapters
    .filter((c) => c.id !== chapter.id)
    .sort((a, b) => a.position - b.position)
  const hasOthers = others.length > 0

  const [mode, setMode] = useState<'move' | 'delete'>(hasOthers ? 'move' : 'delete')
  const [targetId, setTargetId] = useState<string | null>(() => defaultDestination(chapter, others))
  const [panelCount, setPanelCount] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const count = await getPanelCountForChapter(chapter.id)
      if (!cancelled) setPanelCount(count)
    })()
    return () => {
      cancelled = true
    }
  }, [chapter.id])

  async function handleDelete() {
    if (mode === 'move' && !targetId) return
    setDeleting(true)
    setError(null)
    // Settled, so a failed request lands in the inline error below instead of
    // rejecting and leaving the button stuck on "Deleting...".
    const result = await settle(deleteChapter(
      chapter.id,
      projectId,
      mode === 'move' ? { type: 'move', targetChapterId: targetId! } : { type: 'delete' }
    ))
    setDeleting(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    onDeleted()
    onClose()
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !deleting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete chapter?</DialogTitle>
          <DialogDescription>
            <strong className="text-foreground">{chapter.title}</strong> has {plural(eventCount, 'event')}.
            {panelCount !== null && panelCount > 0 && (
              <> Its {plural(panelCount, 'storyboard panel')} will also be deleted.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {/* Radio + text in a <label>, but the Select kept outside it —
              a trigger nested in a label can forward clicks to the radio. */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer has-disabled:cursor-not-allowed has-disabled:opacity-50">
              <input
                type="radio"
                name="chapter-events-action"
                checked={mode === 'move'}
                disabled={!hasOthers}
                onChange={() => setMode('move')}
                className="h-3.5 w-3.5"
              />
              Move events to another chapter
            </label>
            {hasOthers ? (
              <Select
                value={targetId ?? undefined}
                onValueChange={(v) => {
                  setTargetId(v)
                  setMode('move')
                }}
              >
                <SelectTrigger className="h-8 w-full bg-background text-xs">
                  <SelectValue placeholder="Choose a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {others.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.title}
                      {!c.visible && <span className="text-muted-foreground"> (hidden)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-[11px] text-muted-foreground">No other chapters to move them to.</p>
            )}
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm cursor-pointer">
            <input
              type="radio"
              name="chapter-events-action"
              checked={mode === 'delete'}
              onChange={() => setMode('delete')}
              className="h-3.5 w-3.5"
            />
            Delete the events too
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || (mode === 'move' && !targetId)}
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {deleting ? 'Deleting...' : 'Delete chapter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
