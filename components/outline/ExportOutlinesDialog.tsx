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
import {
  DEFAULT_MANUSCRIPT_OPTIONS,
  DEFAULT_PAGE_SIZE,
  type ManuscriptOptions,
  type ManuscriptPageSize,
  type ManuscriptStyle,
} from '@/lib/export/manuscriptOptions'
import type { Outline } from '@/types/database'

const LABEL = 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'

// A row of mutually exclusive choices (format, style, page size).
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative rounded-md px-3 py-1 text-xs font-medium transition-all after:absolute after:-inset-y-1 after:-inset-x-0.5',
            value === o.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface ExportOutlinesDialogProps {
  projectId: string
  outlines: Outline[]
  open: boolean
  onClose: () => void
}

export function ExportOutlinesDialog({ projectId, outlines, open, onClose }: ExportOutlinesDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [format, setFormat] = useState<'docx' | 'pdf'>('docx')
  // PDF only, for now (the Book style DOCX comes later).
  const [options, setOptions] = useState<ManuscriptOptions>(DEFAULT_MANUSCRIPT_OPTIONS)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Something left out of an otherwise good export (a Book cover that
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
  function toggle(id: string) {
    clearPreview()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function chooseFormat(next: 'docx' | 'pdf') {
    if (next !== format) clearPreview()
    setFormat(next)
  }

  // Any PDF option makes the preview out of date. Picking a style also
  // switches to its usual page size.
  function changeOptions(next: Partial<ManuscriptOptions>) {
    clearPreview()
    setOptions((prev) => ({ ...prev, ...next }))
  }

  function chooseStyle(style: ManuscriptStyle) {
    changeOptions({ style, pageSize: DEFAULT_PAGE_SIZE[style] })
  }

  async function handlePreview() {
    if (selected.size === 0) return
    setError(null)
    setNotice(null)
    const previewError = await preview.build(async () => {
      const result = await settle(exportOutlines(projectId, [...selected], 'pdf', options))
      if ('error' in result) return result
      if (result.notice) setNotice(result.notice)
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
    setNotice(null)
    const result = await settle(exportOutlines(projectId, [...selected], format, options))
    setExporting(false)

    if ('error' in result) {
      setError(result.error)
      return
    }
    downloadBase64(result.base64, result.mimeType, result.filename)
    // Stay open to say what was left out; otherwise done.
    if (result.notice) setNotice(result.notice)
    else close()
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

            <div className="space-y-1.5">
              <p className={LABEL}>Format</p>
              <Segmented
                value={format}
                options={[
                  { value: 'docx', label: 'DOCX' },
                  { value: 'pdf', label: 'PDF' },
                ]}
                onChange={chooseFormat}
              />
            </div>

            {format === 'pdf' && (
              <>
                <div className="space-y-1.5">
                  <p className={LABEL}>Style</p>
                  <Segmented<ManuscriptStyle>
                    value={options.style}
                    options={[
                      { value: 'standard', label: 'Standard' },
                      { value: 'book', label: 'Book' },
                    ]}
                    onChange={chooseStyle}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className={LABEL}>Page size</p>
                  <Segmented<ManuscriptPageSize>
                    value={options.pageSize}
                    options={[
                      { value: 'a4', label: 'A4' },
                      { value: '6x9', label: '6×9 in' },
                    ]}
                    onChange={(pageSize) => changeOptions({ pageSize })}
                  />
                </div>
                {options.style === 'book' && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={options.includeCover}
                      onChange={(e) => changeOptions({ includeCover: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                    Include the project&apos;s cover
                  </label>
                )}
              </>
            )}

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
