'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlaceRichTextEditor } from '@/components/places/PlaceRichTextEditor'
import { updateChapter } from '@/actions/chapters'
import { getPanelsForChapter, type PanelWithCover } from '@/actions/panels'
import type { Chapter, Character, Event } from '@/types/database'

// Radix Select rejects an empty string as an item value, so clearing the POV
// goes through a sentinel that maps back to null on save. EventModal's chapter
// picker omits this and is unclearable once set.
const NO_POV = '__none__'

type ChapterFields = Partial<{
  title: string
  description: Record<string, unknown>
  pov_character_id: string | null
}>

interface ChapterDetailModalProps {
  chapter: Chapter
  projectId: string
  allCharacters: Character[]
  events: Event[]
  open: boolean
  onClose: () => void
  onUpdated: (id: string, updates: Partial<Chapter>) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

export function ChapterDetailModal({
  chapter,
  projectId,
  allCharacters,
  events,
  open,
  onClose,
  onUpdated,
}: ChapterDetailModalProps) {
  const [panels, setPanels] = useState<PanelWithCover[]>([])
  const [panelsLoading, setPanelsLoading] = useState(false)

  // Events are already loaded for the timeline grid, so this needs no fetch.
  const chapterEvents = events.filter((e) => e.chapter_id === chapter.id)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setPanelsLoading(true)
      const data = await getPanelsForChapter(chapter.id)
      if (cancelled) return
      setPanels(data)
      setPanelsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open, chapter.id])

  async function saveField(updates: ChapterFields) {
    onUpdated(chapter.id, updates)
    await updateChapter(chapter.id, projectId, updates)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden gap-0 bg-card">
        <DialogDescription className="sr-only">
          Chapter description, point-of-view character, word count, and its linked events and panels
        </DialogDescription>

        <div className="flex h-140">
          <aside className="w-56 shrink-0 border-r border-border overflow-y-auto scrollbar-thin p-4 space-y-5">
            <Field label="POV Character">
              <Select
                value={chapter.pov_character_id ?? NO_POV}
                onValueChange={(v) =>
                  saveField({ pov_character_id: v === NO_POV ? null : v })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-background w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_POV} className="text-xs">
                    None
                  </SelectItem>
                  {allCharacters.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={`Events${chapterEvents.length ? ` (${chapterEvents.length})` : ''}`}>
              {chapterEvents.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No events in this chapter yet.</p>
              ) : (
                <div className="space-y-1">
                  {chapterEvents.map((event) => (
                    <div key={event.id} className="rounded-md px-2 py-1.5 bg-secondary/30">
                      <span className="text-xs line-clamp-2">{event.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </Field>

            <Field label={`Panels${panels.length ? ` (${panels.length})` : ''}`}>
              {panelsLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : panels.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No panels in this chapter yet.</p>
              ) : (
                <div className="space-y-1">
                  {panels.map((panel, i) => (
                    <div key={panel.id} className="rounded-md px-2 py-1.5 bg-secondary/30">
                      <span className="text-xs line-clamp-2">
                        {panel.caption?.trim() || `Panel ${i + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Field>
          </aside>

          <div className="flex flex-1 flex-col min-w-0">
            <div className="border-b border-border px-5 py-3">
              <DialogTitle className="text-lg font-semibold truncate">{chapter.title}</DialogTitle>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
              <PlaceRichTextEditor
                content={chapter.description ?? {}}
                placeholder="What happens in this chapter?"
                uploadPathPrefix={`chapters/${projectId}/${chapter.id}/description`}
                onSave={(json) => saveField({ description: json })}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
