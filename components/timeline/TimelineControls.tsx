'use client'

import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Project } from '@/types/database'

interface TimelineControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  project: Project
}

export function TimelineControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  project,
}: TimelineControlsProps) {
  return (
    <div className="h-10 border-b border-border flex items-center justify-between px-3 shrink-0 bg-background">
      <span className="text-sm font-medium truncate max-w-xs">
        {project.title}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onZoomOut}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <button onClick={onZoomReset}>
          <Badge
            variant="secondary"
            className="text-xs font-mono cursor-pointer w-12 justify-center"
          >
            {Math.round(zoom * 100)}%
          </Badge>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onZoomIn}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onZoomReset}
          title="Reset zoom"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}