'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getStoryboardPanels } from '@/actions/export'
import { buildStoryboardZip, sanitizeFileName } from '@/lib/export/storyboardZip'
import { downloadBlob } from '@/lib/export/downloadBlob'
import type { Chapter } from '@/types/database'

interface ExportStoryboardDialogProps {
  projectId: string
  chapters: Chapter[]
  onClose: () => void
}

// Mounted only while open (see PanelsBoard), so "every chapter checked" is
// just the initial state each time rather than needing an effect to reset it.
export function ExportStoryboardDialog({ projectId, chapters, onClose }: ExportStoryboardDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(chapters.map((c) => c.id)))
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    // Closing mid-export would unmount the progress UI while the download
    // still fires in the background — keep it open until it finishes.
    if (!next && !exporting) onClose()
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleExport() {
    if (selected.size === 0) return
    setExporting(true)
    setError(null)
    setNotice(null)
    try {
      const result = await getStoryboardPanels(projectId, [...selected])
      if ('error' in result) {
        setError(result.error)
        return
      }

      const total = result.chapters.reduce((sum, ch) => sum + ch.panels.length, 0)
      if (total === 0) {
        setNotice('None of the selected chapters have panel images yet.')
        return
      }

      const { blob, added, skipped } = await buildStoryboardZip(result.chapters, setProgress)
      if (added === 0) {
        setError(`None of the ${total} images could be downloaded. Check your connection and try again.`)
        return
      }

      downloadBlob(blob, `${sanitizeFileName(`${result.projectTitle} storyboard`, 'Storyboard')}.zip`)
      if (skipped > 0) {
        setNotice(
          `Downloaded ${added} of ${total} images. ${skipped} couldn't be downloaded and ${skipped === 1 ? 'was' : 'were'} skipped.`
        )
      } else {
        onClose()
      }
    } catch (err) {
      console.error('Storyboard export error:', err)
      setError('Failed to build the ZIP')
    } finally {
      setExporting(false)
      setProgress(null)
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export storyboard</DialogTitle>
          <DialogDescription>
            Downloads every panel image in the chosen chapters as a ZIP, one folder per chapter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-52 space-y-1 overflow-y-auto scrollbar-thin rounded-lg border border-border p-2">
            {chapters.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No chapters yet. Add one on the Timeline tab to start storyboarding.
              </p>
            ) : (
              chapters.map((chapter) => (
                <label
                  key={chapter.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/50"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(chapter.id)}
                    onChange={() => toggle(chapter.id)}
                    disabled={exporting}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                  <span className="truncate">{chapter.title}</span>
                </label>
              ))
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={exporting}>
              {notice ? 'Close' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={handleExport} disabled={exporting || selected.size === 0}>
              {exporting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {exporting
                ? progress
                  ? `Downloading ${progress.done} of ${progress.total}…`
                  : 'Preparing…'
                : 'Download ZIP'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
