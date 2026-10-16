'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PdfPreview } from '@/components/ui/pdf-preview'
import { cn } from '@/lib/utils'
import { exportOutlines } from '@/actions/export'
import { settle } from '@/lib/notify'
import { base64ToBlob } from '@/lib/export/base64ToBlob'
import { downloadBase64 } from '@/lib/export/downloadBase64'
import { downloadBlob } from '@/lib/export/downloadBlob'
import { usePdfPreview } from '@/hooks/usePdfPreview'
import type { Outline } from '@/types/database'

interface ExportOutlinesDialogProps {
  projectId: string
  outlines: Outline[]
  open: boolean
  onClose: () => void
}

export function ExportOutlinesDialog({ projectId, outlines, open, onClose }: ExportOutlinesDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [format, setFormat] = useState<'docx' | 'pdf'>('docx')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const preview = usePdfPreview()
  const busy = exporting || preview.building

  // The dialog stays mounted while closed, so the preview is dropped here
  // rather than left holding its PDF until the next open.
  function close() {
    preview.clear()
    onClose()
  }

  function handleOpenChange(next: boolean) {
    if (!next) close()
  }

  // Changing what's exported makes the preview out of date.
  function toggle(id: string) {
    preview.clear()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function chooseFormat(next: 'docx' | 'pdf') {
    if (next !== format) preview.clear()
    setFormat(next)
  }

  async function handlePreview() {
    if (selected.size === 0) return
    setError(null)
    const previewError = await preview.build(async () => {
      const result = await settle(exportOutlines(projectId, [...selected], 'pdf'))
      if ('error' in result) return result
      return { blob: base64ToBlob(result.base64, result.mimeType), filename: result.filename }
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
    const result = await settle(exportOutlines(projectId, [...selected], format))
    setExporting(false)

    if ('error' in result) {
      setError(result.error)
      return
    }
    downloadBase64(result.base64, result.mimeType, result.filename)
    close()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('sm:max-w-md', preview.file && 'md:max-w-4xl')}>
        <DialogHeader>
          <DialogTitle>Export outline</DialogTitle>
          <DialogDescription>Choose which documents to include, then a format.</DialogDescription>
        </DialogHeader>

        {/* md and up, while previewing: options on the left, the PDF on the right. */}
        <div className={cn('space-y-4', preview.file && 'md:flex md:gap-6 md:space-y-0')}>
          <div className={cn('space-y-4', preview.file && 'md:w-72 md:shrink-0')}>
            <div className="max-h-52 space-y-1 overflow-y-auto scrollbar-thin rounded-lg border border-border p-2">
              {outlines.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">No outline documents yet</p>
              ) : (
                outlines.map((outline) => (
                  <label
                    key={outline.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(outline.id)}
                      onChange={() => toggle(outline.id)}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                    <span className="truncate">{outline.name}</span>
                  </label>
                ))
              )}
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={close} disabled={exporting}>
                Cancel
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
