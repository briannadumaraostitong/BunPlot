'use client'

import { useState } from 'react'
import { useChapters } from '@/hooks/useChapters'
import { ChapterSidebar } from './ChapterSidebar'
import { PanelGrid } from './PanelGrid'
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

      <div className="flex-1 min-w-0 overflow-hidden">
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
  )
}
