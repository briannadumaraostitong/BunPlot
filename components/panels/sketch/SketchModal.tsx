'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useIsBelowMd } from '@/hooks/useIsBelowMd'
import { SketchToolbar } from './SketchToolbar'
import { SketchCanvas, BASE_DISPLAY_WIDTH, type SketchCanvasHandle } from './SketchCanvas'
import { BRUSH_MIN, BRUSH_MAX, ZOOM_WHEEL_FACTOR, clampZoom, type SketchTool } from './types'

const DEFAULT_FONT_SIZE = 24
import type { PanelWithCover, ActionResult } from '@/actions/panels'

const SKETCH_SIGNED_URL_TTL = 60 * 60 * 24 // 24h, matches actions/panels.ts's cover-url TTL
// The scroll container's p-4, both sides — subtracted when fitting the
// canvas to the container's width on phones.
const CANVAS_AREA_PADDING_X = 32

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
  onSaved: (panelId: string, imageUrl: string, coverUrl: string) => Promise<ActionResult>
}

interface ZoomAnchor {
  cursorX: number // cursor position relative to the scroll container's viewport
  cursorY: number
  fracX: number // cursor position as a fraction across the canvas wrapper
  fracY: number
}

export function SketchModal({ panel, projectId, chapterId, open, onClose, onSaved }: SketchModalProps) {
  const canvasRef = useRef<SketchCanvasHandle>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const pendingZoomAnchorRef = useRef<ZoomAnchor | null>(null)
  const isBelowMd = useIsBelowMd()
  const [tool, setTool] = useState<SketchTool>('pen')
  const [color, setColor] = useState('#18181b')
  const [brushSize, setBrushSize] = useState(6)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(zoom)
  // useLayoutEffect, not useEffect — guarantees the ref is current before
  // any subsequent user interaction, including a rapid second wheel tick or
  // button click landing before a plain effect would've flushed.
  useLayoutEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  const [canUndo, setCanUndo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Zooms so that whatever's at (clientX, clientY) on screen stays visually
  // in place — records the cursor's position as a fraction across the canvas
  // wrapper (zoom-invariant) plus its viewport-relative position (the spot to
  // keep it pinned to), then the useLayoutEffect below corrects scrollLeft/Top
  // once the resize has actually taken effect. Reads zoomRef rather than the
  // closed-over `zoom` state so it stays correct even when called from the
  // wheel effect, whose own closure is only refreshed when `open` changes.
  const zoomAtPoint = useCallback((clientX: number, clientY: number, nextZoomRaw: number) => {
    const nextZoom = clampZoom(nextZoomRaw)
    if (nextZoom === zoomRef.current) return

    const container = scrollContainerRef.current
    const wrapper = canvasWrapperRef.current
    if (container && wrapper) {
      const containerRect = container.getBoundingClientRect()
      const wrapperRect = wrapper.getBoundingClientRect()
      pendingZoomAnchorRef.current = {
        cursorX: clientX - containerRect.left,
        cursorY: clientY - containerRect.top,
        fracX: (clientX - wrapperRect.left) / wrapperRect.width,
        fracY: (clientY - wrapperRect.top) / wrapperRect.height,
      }
    }
    setZoom(nextZoom)
  }, [])

  // Toolbar buttons have no meaningful canvas-relative cursor position, so
  // they anchor to the center of the currently visible viewport instead —
  // the closest equivalent to "wherever the cursor is."
  function handleZoomButtonChange(nextZoom: number) {
    const container = scrollContainerRef.current
    if (!container) {
      setZoom(clampZoom(nextZoom))
      return
    }
    const rect = container.getBoundingClientRect()
    zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, nextZoom)
  }

  // Runs after the zoom-triggered re-render has resized the canvas wrapper
  // but before the browser paints, so the scroll correction is invisible —
  // no flash of the "wrong" position before it snaps to the right one.
  useLayoutEffect(() => {
    const anchor = pendingZoomAnchorRef.current
    pendingZoomAnchorRef.current = null
    if (!anchor) return

    const container = scrollContainerRef.current
    const wrapper = canvasWrapperRef.current
    if (!container || !wrapper) return

    const containerRect = container.getBoundingClientRect()
    const wrapperRect = wrapper.getBoundingClientRect()

    const actualX = wrapperRect.left - containerRect.left + anchor.fracX * wrapperRect.width
    const actualY = wrapperRect.top - containerRect.top + anchor.fracY * wrapperRect.height

    container.scrollLeft += actualX - anchor.cursorX
    container.scrollTop += actualY - anchor.cursorY
  }, [zoom])

  function handleToolChange(next: SketchTool) {
    // Switching tools commits any in-progress select-and-move or pending
    // text edit rather than leaving it floating/open and unrecoverable.
    canvasRef.current?.commitFloatingSelection()
    canvasRef.current?.commitPendingText()
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
          canvasRef.current?.commitPendingText()
          setTool('pen')
          break
        case 'e':
          canvasRef.current?.commitFloatingSelection()
          canvasRef.current?.commitPendingText()
          setTool('eraser')
          break
        case 'l':
          canvasRef.current?.commitFloatingSelection()
          canvasRef.current?.commitPendingText()
          setTool('line')
          break
        case 'r':
          canvasRef.current?.commitFloatingSelection()
          canvasRef.current?.commitPendingText()
          setTool('rectangle')
          break
        case 'o':
          canvasRef.current?.commitFloatingSelection()
          canvasRef.current?.commitPendingText()
          setTool('ellipse')
          break
        case 'f':
          canvasRef.current?.commitFloatingSelection()
          canvasRef.current?.commitPendingText()
          setTool('fill')
          break
        case 'v':
          canvasRef.current?.commitFloatingSelection()
          canvasRef.current?.commitPendingText()
          setTool('select')
          break
        case 't':
          canvasRef.current?.commitFloatingSelection()
          canvasRef.current?.commitPendingText()
          setTool('text')
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

  // Ctrl+wheel or trackpad pinch (browsers report pinch-zoom as a
  // ctrlKey-true wheel event) zooms; plain wheel/trackpad scroll is left
  // alone so it pans natively via the container's own scrolling instead.
  // Attached as a native listener with { passive: false }, not React's
  // onWheel — React can register scroll-related synthetic listeners as
  // passive, which would silently prevent preventDefault() from actually
  // stopping the browser's own Ctrl+wheel page zoom from also firing.
  //
  // This is a callback ref (with a React 19 cleanup-function return), not a
  // useEffect keyed on `open` — this div only exists in the DOM while
  // `panel` is truthy (which is exactly when `open` is true), but Radix's
  // Dialog wraps its content in Presence for exit-animation support, which
  // tracks its own "mounted" state via a separate effect rather than
  // rendering children synchronously the instant `open` flips true. That
  // meant `open` becoming true and this div actually landing in the DOM
  // could be two different commits — a useEffect keyed on `open` fired
  // after the first one, before Presence had finished mounting the div in
  // the second, so scrollContainerRef.current was still null when it ran.
  // A callback ref sidesteps that entirely: React calls it exactly when the
  // node is actually attached, in whichever commit that turns out to be.
  //
  // On phones it also zooms the canvas to fit the container's width each
  // time the modal opens — 100% (480px wide) is wider than a phone's modal.
  // Desktop keeps whatever zoom it was left at, as before.
  const attachScrollContainer = useCallback(
    (el: HTMLDivElement | null) => {
      scrollContainerRef.current = el
      if (!el) return

      if (isBelowMd) {
        setZoom(clampZoom((el.clientWidth - CANVAS_AREA_PADDING_X) / BASE_DISPLAY_WIDTH))
      }

      function handleWheel(e: WheelEvent) {
        if (!e.ctrlKey) return
        e.preventDefault()
        const factor = e.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR
        zoomAtPoint(e.clientX, e.clientY, zoomRef.current * factor)
      }

      el.addEventListener('wheel', handleWheel, { passive: false })
      return () => el.removeEventListener('wheel', handleWheel)
    },
    [zoomAtPoint, isBelowMd]
  )

  async function handleSave() {
    if (!panel || saving) return
    setSaving(true)
    setError(null)
    // Set once the new file is uploaded and cleared once the row points at
    // it; if anything fails in between, nothing references the file, so the
    // catch removes it.
    let uploadedPath: string | null = null
    try {
      const blob = await canvasRef.current?.exportBlob()
      if (!blob) throw new Error('Nothing to export')

      const supabase = createClient()
      const path = `panels/${projectId}/${chapterId}/${panel.id}/${Date.now()}-sketch.png`

      const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, blob)
      if (uploadErr) throw uploadErr
      uploadedPath = path

      const { data, error: signError } = await supabase.storage
        .from('attachments')
        .createSignedUrl(path, SKETCH_SIGNED_URL_TTL)
      if (signError || !data) throw signError ?? new Error('Failed to create signed URL')

      const previousPath = panel.image_url
      const result = await onSaved(panel.id, path, data.signedUrl)
      if ('error' in result) throw new Error(result.error)
      uploadedPath = null

      // Only once the new path is persisted (as in PanelCard): otherwise a
      // failed write would leave the row pointing at a file we'd just deleted.
      if (previousPath) {
        supabase.storage.from('attachments').remove([previousPath]).catch(() => {})
      }

      onClose()
    } catch (err) {
      console.error('Sketch save error:', err)
      setError('Failed to save sketch')
      if (uploadedPath) {
        createClient().storage.from('attachments').remove([uploadedPath]).catch(() => {})
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-4xl p-0 overflow-hidden gap-0 bg-card max-md:flex max-md:max-h-dvh max-md:flex-col"
        onEscapeKeyDown={(e) => {
          // Radix closes the dialog on Escape by default. If there's a
          // floating selection or a pending text edit, the first Escape
          // should just resolve that — so we commit it and suppress the
          // close; only when there's nothing pending does Escape fall
          // through to closing.
          const hadText = canvasRef.current?.commitPendingText()
          const hadSelection = canvasRef.current?.commitFloatingSelection()
          if (hadText || hadSelection) e.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">Sketch panel</DialogTitle>
        <DialogDescription className="sr-only">Draw an image for this panel</DialogDescription>

        {panel && (
          <>
            {/* Phones stack the tool strip above the canvas, and the canvas
                area shrinks (and scrolls) to keep the modal within the screen. */}
            <div className="flex min-h-0 flex-col md:h-160 md:flex-row">
              <SketchToolbar
                tool={tool}
                onToolChange={handleToolChange}
                color={color}
                onColorChange={setColor}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                zoom={zoom}
                onZoomChange={handleZoomButtonChange}
                canUndo={canUndo}
                onUndo={() => canvasRef.current?.undo()}
                onClear={() => canvasRef.current?.clear()}
              />

              <div
                ref={attachScrollContainer}
                className="grid min-h-0 flex-1 place-items-center overflow-auto bg-secondary/20 p-4"
              >
                <SketchCanvas
                  ref={canvasRef}
                  wrapperRef={canvasWrapperRef}
                  tool={tool}
                  color={color}
                  brushSize={brushSize}
                  fontSize={fontSize}
                  zoom={zoom}
                  initialImageUrl={panel.cover_url}
                  onHistoryChange={setCanUndo}
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3">
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
