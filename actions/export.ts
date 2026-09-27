'use server'

import { createClient } from '@/lib/supabase/server'
import { tiptapToBlocks } from '@/lib/export/outlineIR'
import { renderOutlinesToDocx, type OutlineSection } from '@/lib/export/outlineToDocx'
import { renderOutlinesToPdf } from '@/lib/export/outlineToPdf'
import type { Outline } from '@/types/database'

export type ExportOutlinesResult =
  | { base64: string; mimeType: string; filename: string }
  | { error: string }

const MIME_TYPE = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
} as const

// Small enough (text-heavy, no per-project image volume like storyboards
// will have) to return the file directly from the action as base64 rather
// than uploading to Storage for a signed URL — see the manuscript-export
// plan for why that tradeoff flips for image-heavy export types later.
export async function exportOutlines(
  projectId: string,
  outlineIds: string[],
  format: 'docx' | 'pdf'
): Promise<ExportOutlinesResult> {
  if (outlineIds.length === 0) return { error: 'No documents selected' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outlines')
    .select('*')
    .eq('project_id', projectId)
    .in('id', outlineIds)
    .order('position')

  if (error) return { error: error.message }
  const outlines = (data ?? []) as Outline[]
  if (outlines.length === 0) return { error: 'No documents found' }

  const sections: OutlineSection[] = outlines.map((o) => ({
    title: o.name,
    blocks: tiptapToBlocks(o.content),
  }))

  try {
    const buffer = format === 'docx' ? await renderOutlinesToDocx(sections) : await renderOutlinesToPdf(sections)
    return {
      base64: buffer.toString('base64'),
      mimeType: MIME_TYPE[format],
      filename: `${outlines.length === 1 ? outlines[0].name : 'Outline Export'}.${format}`,
    }
  } catch (err) {
    console.error('Outline export error:', err)
    return { error: 'Failed to generate export' }
  }
}
