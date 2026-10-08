'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getStoryboardPanels, type StoryboardChapter } from '@/actions/export'
import { buildStoryboardZip, sanitizeFileName } from '@/lib/export/storyboardZip'
import { prepareStoryboardImages } from '@/lib/export/storyboardImages'
import { downloadBlob } from '@/lib/export/downloadBlob'
import type { Chapter } from '@/types/database'

type Format = 'pdf' | 'zip'
type Phase = { kind: 'preparing' } | { kind: 'images'; done: number; total: number } | { kind: 'building' }

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const fileBase = (projectTitle: string) => sanitizeFileName(`${projectTitle} storyboard`, 'Storyboard')

function phaseLabel(phase: Phase | null, format: Format): string {
  if (!phase || phase.kind === 'preparing') return 'Preparing…'
  if (phase.kind === 'building') return 'Building PDF…'
  return `${format === 'pdf' ? 'Preparing images' : 'Downloading'} ${phase.done} of ${phase.total}…`
}

interface ExportStoryboardDialogProps {
  projectId: string
  chapters: Chapter[]
  onClose: () => void
}

// Mounted only while open (see PanelsBoard), so "every chapter checked" is
// just the initial state each time rather than needing an effect to reset it.
export function ExportStoryboardDialog({ projectId, chapters, onClose }: ExportStoryboardDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(chapters.map((c) => c.id)))
  const [format, setFormat] = useState<Format>('pdf')
  const [exporting, setExporting] = useState(false)
  const [phase, setPhase] = useState<Phase | null>(null)
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

  async function exportZip(projectTitle: string, storyboard: StoryboardChapter[]) {
    const total = storyboard.reduce((sum, ch) => sum + ch.panels.filter((p) => p.path).length, 0)
    if (total === 0) {
      setNotice('None of the selected chapters have panel images yet.')
      return
    }

    const { blob, added, skipped } = await buildStoryboardZip(storyboard, (p) => setPhase({ kind: 'images', ...p }))
    if (added === 0) {
      setError(`None of the ${total} images could be downloaded. Check your connection and try again.`)
      return
    }

    downloadBlob(blob, `${fileBase(projectTitle)}.zip`)
    if (skipped > 0) {
      setNotice(
        `Downloaded ${added} of ${total} images. ${skipped} couldn't be downloaded and ${skipped === 1 ? 'was' : 'were'} skipped.`
      )
    } else {
      onClose()
    }
  }

  async function exportPdf(projectTitle: string, storyboard: StoryboardChapter[]) {
    const total = storyboard.reduce((sum, ch) => sum + ch.panels.length, 0)
    if (total === 0) {
      setNotice('None of the selected chapters have any panels yet.')
      return
    }

    const { images, failed, unsupported } = await prepareStoryboardImages(storyboard, (p) =>
      setPhase({ kind: 'images', ...p })
    )

    setPhase({ kind: 'building' })
    // pdf().toBlob() blocks the main thread while it lays out the document —
    // wait for a frame so "Building PDF…" actually paints first.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
    // Loaded only now, so react-pdf never lands in the Panels tab bundle.
    const { renderStoryboardPdf } = await import('@/lib/export/storyboardToPdf')
    const blob = await renderStoryboardPdf({ projectTitle, chapters: storyboard, images })

    downloadBlob(blob, `${fileBase(projectTitle)}.pdf`)
    const problems = [
      failed > 0 && `${plural(failed, 'image')} couldn't be downloaded`,
      unsupported > 0 && `${plural(unsupported, 'image')} ${unsupported === 1 ? 'is' : 'are'} in a format the browser can't read`,
    ].filter(Boolean)
    if (problems.length > 0) {
      setNotice(
        `Downloaded the PDF, but ${problems.join(' and ')}. ${failed + unsupported === 1 ? 'It is' : 'They are'} shown as empty frames.`
      )
    } else {
      onClose()
    }
  }

  async function handleExport() {
    if (selected.size === 0) return
    setExporting(true)
    setError(null)
    setNotice(null)
    setPhase({ kind: 'preparing' })
    try {
      const result = await getStoryboardPanels(projectId, [...selected])
      if ('error' in result) {
        setError(result.error)
        return
      }
      if (format === 'zip') await exportZip(result.projectTitle, result.chapters)
      else await exportPdf(result.projectTitle, result.chapters)
    } catch (err) {
      console.error('Storyboard export error:', err)
      setError(`Failed to build the ${format.toUpperCase()}`)
    } finally {
      setExporting(false)
      setPhase(null)
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export storyboard</DialogTitle>
          <DialogDescription>
            Choose chapters, then a format. PDF lays the panels out as storyboard pages; ZIP holds the original
            image files, one folder per chapter.
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

          <div className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
            {(['pdf', 'zip'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                disabled={exporting}
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
          {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={exporting}>
              {notice ? 'Close' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={handleExport} disabled={exporting || selected.size === 0}>
              {exporting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {exporting ? phaseLabel(phase, format) : format === 'pdf' ? 'Download PDF' : 'Download ZIP'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
