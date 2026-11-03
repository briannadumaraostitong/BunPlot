'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PdfPreview } from '@/components/ui/pdf-preview'
import { cn } from '@/lib/utils'
import { exportStoryBible } from '@/actions/export'
import { settle } from '@/lib/notify'
import { downloadBlob } from '@/lib/export/downloadBlob'
import { fetchExport } from '@/lib/export/fetchExport'
import { STORY_BIBLE_SECTIONS, type StoryBibleSection } from '@/lib/export/storyBible'
import { usePdfPreview } from '@/hooks/usePdfPreview'

interface ExportStoryBibleDialogProps {
  projectId: string
  open: boolean
  onClose: () => void
}

const SECTION_LABELS: Record<StoryBibleSection, string> = {
  characters: 'Characters, relationships & family trees',
  places: 'Places',
  timeline: 'Timeline events',
}

export function ExportStoryBibleDialog({ projectId, open, onClose }: ExportStoryBibleDialogProps) {
  const [selected, setSelected] = useState<Set<StoryBibleSection>>(new Set(STORY_BIBLE_SECTIONS))
  const [format, setFormat] = useState<'docx' | 'pdf'>('docx')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Something left out of an otherwise good export (place covers that
  // couldn't be used). Belongs to that export, so it goes with the preview.
  const [notice, setNotice] = useState<string | null>(null)
  const preview = usePdfPreview()
  const busy = exporting || preview.building

  function clearPreview() {
    preview.clear()
    setNotice(null)
  }

  // The dialog stays mounted while closed, so the preview is dropped here
  // rather than left holding its PDF until the next open.
  function close() {
    clearPreview()
    onClose()
  }

  function handleOpenChange(next: boolean) {
    if (!next) close()
  }

  // Changing what's exported makes the preview out of date.
  function toggle(section: StoryBibleSection) {
    clearPreview()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  function chooseFormat(next: 'docx' | 'pdf') {
    if (next !== format) clearPreview()
    setFormat(next)
  }

  // Keep the document's fixed section order regardless of click order.
  function orderedSections() {
    return STORY_BIBLE_SECTIONS.filter((s) => selected.has(s))
  }

  async function handlePreview() {
    if (selected.size === 0) return
    setError(null)
    setNotice(null)
    const previewError = await preview.build(async () => {
      const result = await settle(exportStoryBible(projectId, orderedSections(), 'pdf'))
      if ('error' in result) return result
      const file = await fetchExport(projectId, result)
      if ('error' in file) return file
      if (result.notice) setNotice(result.notice)
      return { blob: file.blob, filename: result.filename }
    })
    if (previewError) setError(previewError)
  }

  async function handleExport() {
    // Already built for the preview: save that same file.
    if (preview.file) {
      downloadBlob(preview.file.blob, preview.file.filename)
      close()
      return
    }

    if (selected.size === 0) return
    setExporting(true)
    setError(null)
    setNotice(null)
    const result = await settle(exportStoryBible(projectId, orderedSections(), format))
    if ('error' in result) {
      setExporting(false)
      setError(result.error)
      return
    }
    const file = await fetchExport(projectId, result)
    setExporting(false)

    if ('error' in file) {
      setError(file.error)
      return
    }
    downloadBlob(file.blob, result.filename)
    // Stay open to say what was left out; otherwise done.
    if (result.notice) setNotice(result.notice)
    else close()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('sm:max-w-md', preview.file && 'md:max-w-4xl')}>
        <DialogHeader>
          <DialogTitle>Export story bible</DialogTitle>
          <DialogDescription>
            A reference document for the whole project. Timeline filters don&apos;t apply.
          </DialogDescription>
        </DialogHeader>

        {/* md and up, while previewing: options on the left, the PDF on the right. */}
        <div className={cn('space-y-4', preview.file && 'md:flex md:gap-6 md:space-y-0')}>
          <div className={cn('space-y-4', preview.file && 'md:w-72 md:shrink-0')}>
            <div className="space-y-1 rounded-lg border border-border p-2">
              {STORY_BIBLE_SECTIONS.map((section) => (
                // Labels wrap rather than truncate (the options column is
                // narrow while previewing, and on phones), with the checkbox
                // centred on the first line.
                <label
                  key={section}
                  className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/50"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(section)}
                    onChange={() => toggle(section)}
                    className="mt-0.75 h-3.5 w-3.5 shrink-0 rounded border-border"
                  />
                  <span className="min-w-0">{SECTION_LABELS[section]}</span>
                </label>
              ))}
            </div>

            <div className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
              {(['docx', 'pdf'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => chooseFormat(f)}
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
              <Button variant="outline" size="sm" onClick={close} disabled={exporting}>
                {notice && !preview.file ? 'Close' : 'Cancel'}
              </Button>
              {format === 'pdf' && !preview.file && (
                <Button variant="outline" size="sm" onClick={handlePreview} disabled={busy || selected.size === 0}>
                  {preview.building && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {preview.building ? 'Building...' : 'Preview'}
                </Button>
              )}
              <Button size="sm" onClick={handleExport} disabled={busy || selected.size === 0}>
                {exporting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {exporting ? 'Exporting...' : preview.file ? 'Download' : 'Export'}
              </Button>
            </div>
          </div>

          {preview.file && <PdfPreview file={preview.file} className="md:min-w-0 md:flex-1" />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
