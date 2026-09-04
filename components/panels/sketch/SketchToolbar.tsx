'use client'

import { useRef } from 'react'
import {
  Pencil,
  Eraser,
  Minus,
  Square,
  Circle,
  PaintBucket,
  MousePointer2,
  Undo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRUSH_MIN, BRUSH_MAX, ZOOM_MIN, ZOOM_MAX, ZOOM_BUTTON_STEP, type SketchTool } from './types'

const TOOLS: { id: SketchTool; label: string; icon: LucideIcon }[] = [
  { id: 'pen', label: 'Pen', icon: Pencil },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'ellipse', label: 'Ellipse', icon: Circle },
  { id: 'fill', label: 'Fill', icon: PaintBucket },
  { id: 'select', label: 'Select & Move', icon: MousePointer2 },
]

const PALETTE = ['#18181b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff']

interface SketchToolbarProps {
  tool: SketchTool
  onToolChange: (tool: SketchTool) => void
  color: string
  onColorChange: (color: string) => void
  brushSize: number
  onBrushSizeChange: (size: number) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  canUndo: boolean
  onUndo: () => void
  onClear: () => void
}

export function SketchToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  zoom,
  onZoomChange,
  canUndo,
  onUndo,
  onClear,
}: SketchToolbarProps) {
  const colorInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex w-40 shrink-0 flex-col gap-3 border-r border-border p-3 overflow-y-auto scrollbar-thin">
      <div className="grid grid-cols-2 gap-1">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            title={label}
            onClick={() => onToolChange(id)}
            className={cn(
              'flex h-8 items-center justify-center rounded-md transition-colors',
              tool === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 border-t border-border pt-3">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          className="flex h-8 flex-1 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={onClear}
          title="Clear canvas"
          className="flex h-8 flex-1 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5 border-t border-border pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Color</p>
        <div className="grid grid-cols-4 gap-1.5">
          {PALETTE.map((swatch) => (
            <button
              key={swatch}
              onClick={() => onColorChange(swatch)}
              className={cn(
                'h-5 w-5 rounded-full ring-1 ring-inset ring-black/15 transition-transform hover:scale-110 dark:ring-white/15',
                color === swatch && 'ring-2 ring-offset-1 ring-primary'
              )}
              style={{ backgroundColor: swatch }}
              title={swatch}
            />
          ))}
          <div className="relative">
            <button
              onClick={() => colorInputRef.current?.click()}
              className="h-5 w-5 rounded-full ring-1 ring-inset ring-black/15 transition-transform hover:scale-110 dark:ring-white/15"
              style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
              title="Custom color"
            />
            <input
              ref={colorInputRef}
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="pointer-events-none absolute h-0 w-0 opacity-0"
              tabIndex={-1}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Zoom</p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onZoomChange(zoom - ZOOM_BUTTON_STEP)}
            disabled={zoom <= ZOOM_MIN}
            title="Zoom out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <p className="flex-1 text-center text-[10px] text-muted-foreground">{Math.round(zoom * 100)}%</p>
          <button
            onClick={() => onZoomChange(zoom + ZOOM_BUTTON_STEP)}
            disabled={zoom >= ZOOM_MAX}
            title="Zoom in"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Brush size</p>
        <input
          type="range"
          min={BRUSH_MIN}
          max={BRUSH_MAX}
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-center text-[10px] text-muted-foreground">{brushSize}px</p>
      </div>
    </div>
  )
}
