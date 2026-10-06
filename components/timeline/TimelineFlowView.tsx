'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, ChevronRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { playClickSound } from '@/lib/sound'
import { createEvent } from '@/actions/events'
import { createChapter } from '@/actions/chapters'
import type { Layer, Event, Chapter } from '@/types/database'

interface TimelineFlowViewProps {
  projectId: string
  layers: Layer[]
  events: Event[]
  chapters: Chapter[]
  selectedEventId: string | null
  onSelectEvent: (event: Event) => void
  onEventCreated: () => void
}

export function TimelineFlowView({
  projectId,
  layers,
  events,
  chapters,
  selectedEventId,
  onSelectEvent,
  onEventCreated,
}: TimelineFlowViewProps) {
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(layers[0]?.id ?? null)
  const [creating, setCreating] = useState(false)
  const [addingChapter, setAddingChapter] = useState(false)

  // Keeps selection valid if the current layer is deleted (or renamed away)
  // while Flow view is open — falls back to the new first layer.
  useEffect(() => {
    if (selectedLayerId && !layers.some((l) => l.id === selectedLayerId)) {
      setSelectedLayerId(layers[0]?.id ?? null)
    } else if (!selectedLayerId && layers.length > 0) {
      setSelectedLayerId(layers[0].id)
    }
  }, [layers, selectedLayerId])

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) ?? null

  const orderedChapters = [...chapters].sort((a, b) => a.position - b.position)
  const chapterPositionById = new Map(orderedChapters.map((c) => [c.id, c.position]))
  const chapterTitleById = new Map(orderedChapters.map((c) => [c.id, c.title]))

  // Same ordering as the grid: chapter position, then in-chapter event
  // position — just flattened into one sequence instead of grouped columns.
  const sequence = events
    .filter((e) => e.layer_id === selectedLayerId)
    .sort((a, b) => {
      const posA = a.chapter_id ? (chapterPositionById.get(a.chapter_id) ?? Infinity) : Infinity
      const posB = b.chapter_id ? (chapterPositionById.get(b.chapter_id) ?? Infinity) : Infinity
      if (posA !== posB) return posA - posB
      return a.position - b.position
    })

  async function handleAddEvent() {
    if (!selectedLayerId || creating) return
    const targetChapterId =
      sequence.length > 0
        ? sequence[sequence.length - 1].chapter_id
        : (orderedChapters[orderedChapters.length - 1]?.id ?? null)
    if (!targetChapterId) return

    // createEvent takes `position` literally (no auto-append/max-position
    // query internally), so the next position has to be computed here —
    // otherwise the new card could land mid-sequence instead of truly last
    // whenever the target chapter already has other events for this layer.
    const eventsInTargetCell = events.filter(
      (e) => e.layer_id === selectedLayerId && e.chapter_id === targetChapterId
    )
    const nextPosition =
      eventsInTargetCell.length > 0
        ? Math.max(...eventsInTargetCell.map((e) => e.position)) + 1
        : 0

    setCreating(true)
    const created = await createEvent({
      project_id: projectId,
      layer_id: selectedLayerId,
      chapter_id: targetChapterId,
      title: 'New Event',
      position: nextPosition,
      duration: 1,
    })
    onEventCreated()
    setCreating(false)
    if (created && !('error' in created)) {
      onSelectEvent(created as Event)
    }
  }

  // No refresh afterwards: useChapters' realtime subscription inserts the new
  // row, which swaps this empty state for the normal sequence on its own.
  async function handleAddChapter() {
    if (addingChapter) return
    setAddingChapter(true)
    await createChapter(projectId, `Chapter ${chapters.length + 1}`)
    setAddingChapter(false)
  }

  const canAdd = selectedLayerId !== null

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Layer
        </span>
        <Select value={selectedLayerId ?? undefined} onValueChange={setSelectedLayerId}>
          <SelectTrigger className="h-7 w-36 bg-background text-xs sm:w-48">
            <SelectValue placeholder="Select a layer" />
          </SelectTrigger>
          <SelectContent>
            {layers.map((l) => (
              <SelectItem key={l.id} value={l.id} className="text-xs">
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
          {sequence.length} event{sequence.length === 1 ? '' : 's'}
        </span>
      </div>

      {layers.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No layers yet
        </div>
      ) : orderedChapters.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center space-y-3 text-center">
          <p className="text-sm text-muted-foreground">No chapters yet</p>
          <p className="text-xs text-muted-foreground">Events live inside chapters, so add one to get started.</p>
          <Button variant="outline" size="sm" onClick={handleAddChapter} disabled={addingChapter}>
            {addingChapter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add Chapter
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin">
          <div className="flex h-full items-center gap-0 px-6">
            {sequence.map((event) => (
              <div key={event.id} className="flex shrink-0 items-center">
                <FlowCard
                  event={event}
                  layer={selectedLayer}
                  chapterTitle={event.chapter_id ? (chapterTitleById.get(event.chapter_id) ?? null) : null}
                  selected={event.id === selectedEventId}
                  onClick={() => onSelectEvent(event)}
                />
                <Connector />
              </div>
            ))}

            <button
              onClick={handleAddEvent}
              disabled={!canAdd || creating}
              className="flex h-17 w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="text-xs">Add event</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Connector() {
  return (
    <div className="flex w-10 shrink-0 items-center">
      <div className="h-px flex-1 bg-border" />
      <ChevronRight className="-ml-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </div>
  )
}

function FlowCard({
  event,
  layer,
  chapterTitle,
  selected,
  onClick,
}: {
  event: Event
  layer: Layer | null
  chapterTitle: string | null
  selected: boolean
  onClick: () => void
}) {
  const color = event.color ?? layer?.color ?? '#6366F1'
  return (
    <button
      onClick={() => {
        playClickSound()
        onClick()
      }}
      className={cn(
        'flex w-44 shrink-0 flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-left shadow-sm transition-all hover:shadow-md hover:brightness-105',
        selected && 'ring-2 ring-offset-1 shadow-lg'
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <span className="truncate text-xs font-semibold" style={{ color }}>
        {event.title}
      </span>
      <span className="truncate text-[10px] text-muted-foreground">{chapterTitle ?? 'No chapter'}</span>
    </button>
  )
}
