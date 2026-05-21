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
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LayerRow } from './LayerRow'
import { createLayer, reorderLayers } from '@/actions/layers'
import { cn } from '@/lib/utils'
import type { Layer, Project } from '@/types/database'

interface LayerPanelProps {
  project: Project
  layers: Layer[]
  onToggleVisibility: (id: string) => void
  onReorder: (from: number, to: number) => void
}

export function LayerPanel({
  project,
  layers,
  onToggleVisibility,
  onReorder,
}: LayerPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  async function handleAddLayer() {
    await createLayer(project.id, `Layer ${layers.length + 1}`)
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
    await reorderLayers(
      project.id,
      newOrder.map((l) => l.id)
    )
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
          className="h-6 w-6 ml-auto"
          onClick={() => setCollapsed((c) => !c)}
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
                    height={64}
                    selectedEventId={null}
                    onSelectEvent={() => {}}
                    projectId={project.id}
                    variant="sidebar"
                    onToggleVisibility={() => onToggleVisibility(layer.id)}
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
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Layer
            </Button>
          </div>
        </>
      )}
    </div>
  )
}