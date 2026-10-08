'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { useChapters } from '@/hooks/useChapters'
import { ChapterSidebar } from './ChapterSidebar'
import { PanelGrid } from './PanelGrid'
import { ExportStoryboardDialog } from './ExportStoryboardDialog'
import type { Chapter } from '@/types/database'

interface PanelsBoardProps {
  projectId: string
  initialChapters: Chapter[]
}

export function PanelsBoard({ projectId, initialChapters }: PanelsBoardProps) {
  const { chapters } = useChapters(projectId, initialChapters)
  // Not synced via effect — the "fall back to the first chapter" case is a
  // pure per-render derivation from `chapters`, not state that needs
  // reconciling after the fact.
  const [manualChapterId, setManualChapterId] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const selectedChapterId =
    manualChapterId && chapters.some((c) => c.id === manualChapterId)
      ? manualChapterId
      : (chapters[0]?.id ?? null)

  return (
    <div className="flex h-full overflow-hidden">
      <ChapterSidebar
        chapters={chapters}
        selectedChapterId={selectedChapterId}
        onSelect={setManualChapterId}
      />

      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-secondary/20 px-3">
          {/* Lives in its own bar above the grid rather than in ChapterSidebar
              so it reads as acting on the whole project, not the selected
              chapter — the dialog picks chapters itself. Same button as the
              Timeline tab's story bible Export. */}
          <button
            onClick={() => setExportOpen(true)}
            aria-label="Export storyboard"
            className="relative ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground after:absolute after:-inset-1 md:px-2.5"
          >
            <Download className="h-3 w-3" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {selectedChapterId ? (
            <PanelGrid key={selectedChapterId} projectId={projectId} chapterId={selectedChapterId} />
          ) : (
            <div className="flex h-full items-center justify-center text-center px-4">
              <p className="text-xs text-muted-foreground">
                Add a chapter on the Timeline tab to start storyboarding panels.
              </p>
            </div>
          )}
        </div>
      </div>

      {exportOpen && (
        <ExportStoryboardDialog projectId={projectId} chapters={chapters} onClose={() => setExportOpen(false)} />
      )}
    </div>
  )
}
