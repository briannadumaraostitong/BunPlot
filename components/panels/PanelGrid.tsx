'use client'

import { useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { PanelCard } from './PanelCard'
import { SketchModal } from './sketch/SketchModal'
import { usePanels } from '@/hooks/usePanels'
import { reorderPanels } from '@/actions/panels'
import { reportResult, settle } from '@/lib/notify'
import type { PanelWithCover } from '@/actions/panels'

interface PanelGridProps {
  projectId: string
  chapterId: string
}

export function PanelGrid({ projectId, chapterId }: PanelGridProps) {
  const { panels, loading, addPanel, editPanel, removePanel, setPanelImage, reorder } = usePanels(
    projectId,
    chapterId
  )
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sketchingPanel, setSketchingPanel] = useState<PanelWithCover | null>(null)

  async function handleAddPanel() {
    if (adding) return
    setAdding(true)
    setError(null)
    const result = await addPanel()
    if ('error' in result) setError(result.error)
    setAdding(false)
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = panels.findIndex((p) => p.id === active.id)
    const to = panels.findIndex((p) => p.id === over.id)
    if (from === -1 || to === -1) return
    reorder(from, to)
    const newOrder = [...panels]
    const [moved] = newOrder.splice(from, 1)
    newOrder.splice(to, 0, moved)
    const result = await settle(reorderPanels(projectId, newOrder.map((p) => p.id)))
    reportResult(result, "Couldn't save the panel order.", { id: 'panel-order' })
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto scrollbar-thin p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
              <Skeleton className="aspect-3/4 w-full rounded-none" />
              <div className="p-2">
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4">
      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={panels.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {panels.map((panel) => (
              <PanelCard
                key={panel.id}
                panel={panel}
                onCaptionChanged={(caption) => editPanel(panel.id, { caption })}
                onDeleted={() => removePanel(panel.id)}
                onOpenSketch={() => setSketchingPanel(panel)}
                onImageUploaded={(imageUrl, coverUrl) => setPanelImage(panel.id, imageUrl, coverUrl)}
              />
            ))}

            <button
              onClick={handleAddPanel}
              disabled={adding}
              className="flex aspect-3/4 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">Add panel</span>
                </>
              )}
            </button>
          </div>
        </SortableContext>
      </DndContext>

      <SketchModal
        panel={sketchingPanel}
        projectId={projectId}
        chapterId={chapterId}
        open={sketchingPanel !== null}
        onClose={() => setSketchingPanel(null)}
        onSaved={(id, imageUrl, coverUrl) => setPanelImage(id, imageUrl, coverUrl)}
      />
    </div>
  )
}
