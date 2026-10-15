'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDndSensors } from '@/hooks/useDndSensors'
import { LayerRow } from './LayerRow'
import { createLayer, reorderLayers } from '@/actions/layers'
import { reportResult, settle } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useIsBelowMd } from '@/hooks/useIsBelowMd'
import type { Layer, Project } from '@/types/database'

interface LayerPanelProps {
  project: Project
  layers: Layer[]
  onToggleVisibility: (id: string) => void
  onReorder: (from: number, to: number) => void
  onLayerAdded: () => void
  onLayerRemoved: (id: string) => void
  onLayerRenamed: (id: string, name: string) => void
  onLayerColorChanged: (id: string, color: string) => void
}

export function LayerPanel({
  project,
  layers,
  onToggleVisibility,
  onReorder,
  onLayerAdded,
  onLayerRemoved,
  onLayerRenamed,
  onLayerColorChanged,
}: LayerPanelProps) {
  // null until the chevron is used: until then the sidebar follows the
  // breakpoint (collapsed below md); after that it keeps the user's choice.
  const isBelowMd = useIsBelowMd()
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null)
  const collapsed = userCollapsed ?? isBelowMd
  const [adding, setAdding] = useState(false)
  const sensors = useDndSensors()

  async function handleAddLayer() {
    if (adding) return
    setAdding(true)
    const result = await settle(createLayer(project.id, `Layer ${layers.length + 1}`))
    if (reportResult(result, "Couldn't create the layer.")) {
      await new Promise((r) => setTimeout(r, 500))
      onLayerAdded()
    }
    setAdding(false)
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = layers.findIndex((l) => l.id === active.id)
    const to = layers.findIndex((l) => l.id === over.id)
    if (from === -1 || to === -1) return
    onReorder(from, to)
    const newOrder = [...layers]
    const [moved] = newOrder.splice(from, 1)
    newOrder.splice(to, 0, moved)
    const result = await settle(reorderLayers(project.id, newOrder.map((l) => l.id)))
    reportResult(result, "Couldn't save the layer order.", { id: 'layer-order' })
  }

  return (
    <div
      className={cn(
        'flex flex-col border-r border-border bg-sidebar shrink-0 transition-all duration-200',
        collapsed ? 'w-10' : 'w-52'
      )}
    >
      <div className="h-10 border-b border-border flex items-center justify-between px-2 shrink-0">
        {!collapsed && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Layers
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-6 w-6 ml-auto after:absolute after:-inset-2.5"
          onClick={() => setUserCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={layers.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {layers.map((layer) => (
                  <LayerRow
                    key={layer.id}
                    layer={layer}
                    events={[]}
                    statuses={[]}
                    chapters={[]}
                    height={64}
                    selectedEventId={null}
                    onSelectEvent={() => {}}
                    projectId={project.id}
                    variant="sidebar"
                    onToggleVisibility={() => onToggleVisibility(layer.id)}
                    onDeleted={() => onLayerRemoved(layer.id)}
                    onRenamed={(newName) => onLayerRenamed(layer.id, newName)}
                    onColorChanged={(color) => onLayerColorChanged(layer.id, color)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="p-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleAddLayer}
              disabled={adding}
            >
              {adding ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              {adding ? 'Adding...' : 'Add Layer'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}