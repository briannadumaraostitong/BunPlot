'use client'

import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useIsBelowMd } from '@/hooks/useIsBelowMd'
import { cn } from '@/lib/utils'
import type { PdfPreviewFile } from '@/hooks/usePdfPreview'

// An export dialog's PDF preview (see usePdfPreview). md and up shows the PDF
// inline. Phones get a button that opens it in a new tab instead: mobile
// browsers mostly can't show a PDF inside a page, and some download it
// rather than display it, so the iframe isn't rendered there at all.
export function PdfPreview({ file, className }: { file: PdfPreviewFile; className?: string }) {
  const isBelowMd = useIsBelowMd()

  if (isBelowMd) {
    return (
      <Button asChild variant="outline" size="sm" className={cn('w-full', className)}>
        <a href={file.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Open preview
        </a>
      </Button>
    )
  }

  return (
    <iframe
      src={file.url}
      title={`Preview of ${file.filename}`}
      className={cn('h-[70vh] w-full rounded-lg border border-border bg-background', className)}
    />
  )
}
