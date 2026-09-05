'use client'

import { useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Upload, Pencil, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PanelWithCover, ActionResult } from '@/actions/panels'

// Matches SketchModal's own TTL. COVER_SIGNED_URL_TTL can't be imported from
// actions/panels.ts — a 'use server' file may only export async functions.
const PANEL_SIGNED_URL_TTL = 60 * 60 * 24 // 24h

interface PanelCardProps {
  panel: PanelWithCover
  onCaptionChanged: (caption: string) => Promise<ActionResult>
  onDeleted: () => Promise<ActionResult>
  onOpenSketch: () => void
  onImageUploaded: (imageUrl: string, coverUrl: string) => Promise<ActionResult>
}

export function PanelCard({
  panel,
  onCaptionChanged,
  onDeleted,
  onOpenSketch,
  onImageUploaded,
}: PanelCardProps) {
  const [caption, setCaption] = useState(panel.caption ?? '')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: panel.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleCaptionBlur() {
    if (caption === (panel.caption ?? '')) return
    const result = await onCaptionChanged(caption)
    if ('error' in result) setError(result.error)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    const result = await onDeleted()
    if ('error' in result) setError(result.error)
  }

  async function uploadFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const safeName = file.name.replace(/\s+/g, '-')
      const path = `panels/${panel.project_id}/${panel.chapter_id}/${panel.id}/${Date.now()}-${safeName}`

      const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data, error: signError } = await supabase.storage
        .from('attachments')
        .createSignedUrl(path, PANEL_SIGNED_URL_TTL)
      if (signError || !data) throw signError ?? new Error('Failed to create signed URL')

      const previousPath = panel.image_url
      const result = await onImageUploaded(path, data.signedUrl)
      if ('error' in result) {
        setError(result.error)
        return
      }

      // Only once the new path is persisted — otherwise a failed write would
      // leave the row pointing at a file we'd just deleted.
      if (previousPath) {
        supabase.storage.from('attachments').remove([previousPath]).catch(() => {})
      }
    } catch (err) {
      console.error('Panel image upload error:', err)
      setError('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex flex-col rounded-lg border border-border bg-card overflow-hidden"
    >
      <div className="group/image relative flex aspect-3/4 w-full items-center justify-center bg-secondary/20">
        {panel.cover_url && (
          <img src={panel.cover_url} alt={panel.caption ?? ''} className="h-full w-full object-cover" />
        )}

        <div
          className={`absolute inset-0 flex items-center justify-center gap-2 transition-opacity ${
            panel.cover_url
              ? 'bg-background/70 opacity-100 md:opacity-0 md:group-hover/image:opacity-100'
              : 'opacity-100'
          }`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-foreground" />
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-background"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
              <button
                onClick={onOpenSketch}
                className="flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-background"
              >
                <Pencil className="h-3.5 w-3.5" />
                Sketch
              </button>
            </>
          )}
        </div>

        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={handleDelete}
          title="Delete panel"
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm transition-opacity hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) uploadFile(file)
          }}
        />

        {error && (
          <p className="absolute bottom-1 left-1.5 right-1.5 text-[10px] text-destructive bg-card/90 rounded px-1">
            {error}
          </p>
        )}
      </div>

      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={handleCaptionBlur}
        placeholder="Add a caption..."
        className="w-full bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
