'use client'

import { useMemo } from 'react'

interface TimelineRulerProps {
  zoom: number
  scrollX: number
  divisions?: number
}

export function TimelineRuler({
  zoom,
  divisions = 12,
}: TimelineRulerProps) {
  const ticks = useMemo(
    () => Array.from({ length: divisions + 1 }, (_, i) => i),
    [divisions]
  )

  const labels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  return (
    <div
      className="h-8 border-b border-border bg-secondary/50 shrink-0 overflow-hidden"
      style={{ width: `${100 * zoom}%`, minWidth: '100%' }}
    >
      <div className="relative h-full">
        {ticks.map((i) => {
          const pct = (i / divisions) * 100
          return (
            <div
              key={i}
              className="absolute top-0 h-full flex flex-col items-start"
              style={{ left: `${pct}%` }}
            >
              <div className="w-px h-3 bg-border mt-auto mb-0" />
              {i < divisions && (
                <span className="absolute top-1 left-1 text-[10px] text-muted-foreground font-medium select-none">
                  {labels[i % 12]}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}