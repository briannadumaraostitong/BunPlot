'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Chapter } from '@/types/database'

interface ChapterSidebarProps {
  chapters: Chapter[]
  selectedChapterId: string | null
  onSelect: (id: string) => void
}

export function ChapterSidebar({ chapters, selectedChapterId, onSelect }: ChapterSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Defaults to collapsed below md — checked once on mount, not a live
  // resize listener, so it doesn't fight the user's own chevron toggle
  // after the initial render (matches the Tailwind md breakpoint, 768px).
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setCollapsed(true)
    }
  }, [])

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
            Chapters
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-6 w-6 ml-auto after:absolute after:-inset-2.5"
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
        <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
          {chapters.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">No chapters yet</p>
          ) : (
            chapters.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => onSelect(chapter.id)}
                className={cn(
                  'mx-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs truncate',
                  chapter.id === selectedChapterId ? 'bg-secondary' : 'hover:bg-secondary/50'
                )}
              >
                {chapter.title}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
