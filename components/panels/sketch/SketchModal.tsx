'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { SketchToolbar } from './SketchToolbar'
import { SketchCanvas, type SketchCanvasHandle } from './SketchCanvas'
import { BRUSH_MIN, BRUSH_MAX, type SketchTool } from './types'
import type { PanelWithCover } from '@/actions/panels'

const SKETCH_SIGNED_URL_TTL = 60 * 60 * 24 // 24h, matches actions/panels.ts's cover-url TTL

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return (el as HTMLElement).isContentEditable
}

interface SketchModalProps {
  panel: PanelWithCover | null
  projectId: string
  chapterId: string
  open: boolean
  onClose: () => void
  onSaved: (panelId: string, imageUrl: string, coverUrl: string) => void
}

export function SketchModal({ panel, projectId, chapterId, open, onClose, onSaved }: SketchModalProps) {
  const canvasRef = useRef<SketchCanvasHandle>(null)
  const [tool, setTool] = useState<SketchTool>('pen')
  const [color, setColor] = useState('#18181b')
  const [brushSize, setBrushSize] = useState(6)
  const [canUndo, setCanUndo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleToolChange(next: SketchTool) {
    // Switching tools commits any in-progress select-and-move rather than
    // leaving it floating and unrecoverable.
    canvasRef.current?.commitFloatingSelection()
    setTool(next)
  }

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  // Scoped to the modal's own open/closed lifetime — attaches once when it
  // opens, detaches once when it closes, never on every render or keystroke
  // (canvasRef/setTool/setBrushSize are all stable across renders, so `open`
  // is the only real dependency). Escape is handled separately via Dialog's
  // own onEscapeKeyDown below, not here — see that prop's comment.
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(document.activeElement)) return

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        canvasRef.current?.undo()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key.toLowerCase()) {
        case 'p':
          canvasRef.current?.commitFloatingSelection()
          setTool('pen')
          break
        case 'e':
          canvasRef.current?.commitFloatingSelection()
          setTool('eraser')
          break
        case 'l':
          canvasRef.current?.commitFloatingSelection()
          setTool('line')
          break
        case 'r':
          canvasRef.current?.commitFloatingSelection()
          setTool('rectangle')
          break
        case 'o':
          canvasRef.current?.commitFloatingSelection()
          setTool('ellipse')
          break
        case 'f':
          canvasRef.current?.commitFloatingSelection()
          setTool('fill')
          break
        case 'v':
          canvasRef.current?.commitFloatingSelection()
          setTool('select')
          break
        case '[':
          setBrushSize((s) => Math.max(BRUSH_MIN, s - 1))
          break
        case ']':
          setBrushSize((s) => Math.min(BRUSH_MAX, s + 1))
          break
        default:
          return
      }
      e.preventDefault()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  async function handleSave() {
    if (!panel || saving) return
    setSaving(true)
    setError(null)
    try {
      const blob = await canvasRef.current?.exportBlob()
      if (!blob) throw new Error('Nothing to export')

      const supabase = createClient()
      const path = `panels/${projectId}/${chapterId}/${panel.id}/${Date.now()}-sketch.png`

      const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, blob)
      if (uploadErr) throw uploadErr

      const { data, error: signError } = await supabase.storage
        .from('attachments')
        .createSignedUrl(path, SKETCH_SIGNED_URL_TTL)
      if (signError || !data) throw signError ?? new Error('Failed to create signed URL')

      const previousPath = panel.image_url
      onSaved(panel.id, path, data.signedUrl)

      if (previousPath) {
        supabase.storage.from('attachments').remove([previousPath]).catch(() => {})
      }

      onClose()
    } catch (err) {
      console.error('Sketch save error:', err)
      setError('Failed to save sketch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-4xl p-0 overflow-hidden gap-0 bg-card"
        onEscapeKeyDown={(e) => {
          // Radix closes the dialog on Escape by default. If there's a
          // floating selection, the first Escape should just deselect —
          // so we commit it and suppress the close; only when there's
          // nothing to deselect does Escape fall through to closing.
          const hadSelection = canvasRef.current?.commitFloatingSelection()
          if (hadSelection) e.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">Sketch panel</DialogTitle>
        <DialogDescription className="sr-only">Draw an image for this panel</DialogDescription>

        {panel && (
          <>
            <div className="flex h-160">
              <SketchToolbar
                tool={tool}
                onToolChange={handleToolChange}
                color={color}
                onColorChange={setColor}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                canUndo={canUndo}
                onUndo={() => canvasRef.current?.undo()}
                onClear={() => canvasRef.current?.clear()}
              />

              <div className="flex flex-1 items-center justify-center overflow-auto bg-secondary/20 p-4">
                <SketchCanvas
                  ref={canvasRef}
                  tool={tool}
                  color={color}
                  brushSize={brushSize}
                  initialImageUrl={panel.cover_url}
                  onHistoryChange={setCanUndo}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <p className="text-xs text-destructive">{error}</p>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
