'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { exportStoryBible } from '@/actions/export'
import { downloadBase64 } from '@/lib/export/downloadBase64'
import { STORY_BIBLE_SECTIONS, type StoryBibleSection } from '@/lib/export/storyBible'

interface ExportStoryBibleDialogProps {
  projectId: string
  open: boolean
  onClose: () => void
}

const SECTION_LABELS: Record<StoryBibleSection, string> = {
  characters: 'Characters, relationships & family trees',
  places: 'Places',
  chapters: 'Chapters',
  timeline: 'Timeline events',
}

export function ExportStoryBibleDialog({ projectId, open, onClose }: ExportStoryBibleDialogProps) {
  const [selected, setSelected] = useState<Set<StoryBibleSection>>(new Set(STORY_BIBLE_SECTIONS))
  const [format, setFormat] = useState<'docx' | 'pdf'>('docx')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  function toggle(section: StoryBibleSection) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  async function handleExport() {
    if (selected.size === 0) return
    setExporting(true)
    setError(null)
    // Keep the document's fixed section order regardless of click order.
    const sections = STORY_BIBLE_SECTIONS.filter((s) => selected.has(s))
    const result = await exportStoryBible(projectId, sections, format)
    setExporting(false)

    if ('error' in result) {
      setError(result.error)
      return
    }
    downloadBase64(result.base64, result.mimeType, result.filename)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export story bible</DialogTitle>
          <DialogDescription>
            A reference document for the whole project. Timeline filters don&apos;t apply.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1 rounded-lg border border-border p-2">
            {STORY_BIBLE_SECTIONS.map((section) => (
              <label
                key={section}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(section)}
                  onChange={() => toggle(section)}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                <span className="truncate">{SECTION_LABELS[section]}</span>
              </label>
            ))}
          </div>

          <div className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
            {(['docx', 'pdf'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cn(
                  'relative rounded-md px-3 py-1 text-xs font-medium uppercase transition-all after:absolute after:-inset-y-1 after:-inset-x-0.5',
                  format === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={exporting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleExport} disabled={exporting || selected.size === 0}>
              {exporting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
