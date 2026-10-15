'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { floodFill } from '@/lib/sketch/floodFill'
import { getStrokeOutline, outlineToPath2D } from '@/lib/sketch/strokePath'
import {
  computeResize,
  cursorForHit,
  hitTestSelection,
  resizeAnchor,
  resizeHandlePositions,
  rotateHandlePosition,
  toLocal,
  toWorld,
  HANDLE_VISUAL_SIZE,
  type ResizeHandleId,
  type SelectionTransform,
} from '@/lib/sketch/selectionTransform'
import type { SketchTool } from './types'

export const CANVAS_WIDTH = 640
export const CANVAS_HEIGHT = 854
// Display size (CSS pixels) at 100% zoom — separate from CANVAS_WIDTH/HEIGHT,
// which is the fixed internal pixel-buffer resolution and never changes.
// Chosen to roughly match how large the canvas rendered before zoom existed
// (fit within the modal's h-160 content area). Phones zoom out from this to
// fit their width — see SketchModal's attachScrollContainer.
export const BASE_DISPLAY_WIDTH = 480
const BACKGROUND_COLOR = '#ffffff'
const MAX_HISTORY = 50
const MARQUEE_COLOR = '#0ea5e9'
const TEXT_LINE_HEIGHT = 1.2

export interface SketchCanvasHandle {
  undo: () => void
  clear: () => void
  // Returns whether there was a floating selection to commit — callers (the
  // Escape handler in particular) use this to know whether the action did
  // anything.
  commitFloatingSelection: () => boolean
  // Same convention — whether there was a pending text edit to resolve.
  commitPendingText: () => boolean
  exportBlob: () => Promise<Blob | null>
}

interface SketchCanvasProps {
  tool: SketchTool
  color: string
  brushSize: number
  fontSize: number
  zoom: number
  // Forwarded to the outer wrapper div so the parent can measure its rect
  // for cursor-anchored zoom — see SketchModal's zoomAtPoint.
  wrapperRef?: React.Ref<HTMLDivElement>
  initialImageUrl: string | null
  onHistoryChange: (hasHistory: boolean) => void
}

interface Point {
  x: number
  y: number
  pressure: number
}

interface TextEdit {
  x: number
  y: number
  value: string
}

interface Selection extends SelectionTransform {
  canvas: HTMLCanvasElement
}

type SelectionInteraction =
  | { kind: 'move'; offsetX: number; offsetY: number }
  | {
      kind: 'resize'
      handle: ResizeHandleId
      anchorLocal: { x: number; y: number }
      fixedTransform: SelectionTransform
      startW: number
      startH: number
    }
  | { kind: 'rotate'; startAngle: number; startRotation: number }

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ]
}

export const SketchCanvas = forwardRef<SketchCanvasHandle, SketchCanvasProps>(function SketchCanvas(
  { tool, color, brushSize, fontSize, zoom, wrapperRef, initialImageUrl, onHistoryChange },
  ref
) {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const undoStackRef = useRef<ImageData[]>([])

  const pointsRef = useRef<Point[]>([])
  const shapeStartRef = useRef<Point | null>(null)
  const selectionRef = useRef<Selection | null>(null)
  const interactionRef = useRef<SelectionInteraction | null>(null)
  const isDrawingRef = useRef(false)
  // Real state, not a ref — unlike everything else transient in this file,
  // this drives actual JSX (the overlay textarea), which refs can't do.
  const [textEdit, setTextEdit] = useState<TextEdit | null>(null)
  // The textarea portals into this div rather than rendering as a literal
  // sibling of the two <canvas> elements — see the SketchCanvas plan this
  // implements. Passing the setter directly as the ref means we only ever
  // portal into a real, mounted node (mirrors SketchModal's attachScrollContainer
  // pattern), never a stale null on the first render.
  const [overlayRoot, setOverlayRoot] = useState<HTMLDivElement | null>(null)

  const getMainCtx = useCallback(
    () => mainCanvasRef.current!.getContext('2d', { willReadFrequently: true })!,
    [],
  )
  const getPreviewCtx = useCallback(
    () => previewCanvasRef.current!.getContext('2d', { willReadFrequently: true })!,
    [],
  )
  const clearPreview = useCallback(() => {
    getPreviewCtx().clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }, [getPreviewCtx])

  const fillBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = BACKGROUND_COLOR
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }, [])

  const pushHistory = useCallback(() => {
    const snapshot = getMainCtx().getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    undoStackRef.current.push(snapshot)
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift()
    onHistoryChange(undoStackRef.current.length > 1)
  }, [getMainCtx, onHistoryChange])

  const commitFloatingSelection = useCallback((): boolean => {
    const selection = selectionRef.current
    if (!selection) return false
    const mainCtx = getMainCtx()
    mainCtx.save()
    mainCtx.translate(selection.x, selection.y)
    mainCtx.rotate(selection.rotation)
    mainCtx.drawImage(selection.canvas, -selection.w / 2, -selection.h / 2, selection.w, selection.h)
    mainCtx.restore()
    selectionRef.current = null
    clearPreview()
    pushHistory()
    return true
  }, [getMainCtx, clearPreview, pushHistory])

  const commitPendingText = useCallback((): boolean => {
    const edit = textEdit
    if (!edit) return false
    const trimmed = edit.value.trim()
    if (trimmed) {
      const mainCtx = getMainCtx()
      const fontFamily = getComputedStyle(mainCanvasRef.current!).fontFamily || 'sans-serif'
      mainCtx.font = `${fontSize}px ${fontFamily}`
      mainCtx.fillStyle = color
      mainCtx.textBaseline = 'top'
      mainCtx.textAlign = 'left'
      const lineHeight = fontSize * TEXT_LINE_HEIGHT
      edit.value.split('\n').forEach((line, i) => {
        mainCtx.fillText(line, edit.x, edit.y + i * lineHeight)
      })
      pushHistory()
    }
    setTextEdit(null)
    return true
  }, [textEdit, getMainCtx, fontSize, color, pushHistory])

  // Draws the floating selection's content plus its dashed border, resize
  // handles, and rotate handle — called after every change to the floating
  // selection (drag, resize, rotate, or just having been cut) so it stays
  // persistently visible, not just while a gesture is actively in progress.
  const renderSelectionOverlay = useCallback(() => {
    const selection = selectionRef.current
    if (!selection) return
    const ctx = getPreviewCtx()
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.save()
    ctx.translate(selection.x, selection.y)
    ctx.rotate(selection.rotation)
    ctx.drawImage(selection.canvas, -selection.w / 2, -selection.h / 2, selection.w, selection.h)

    ctx.strokeStyle = MARQUEE_COLOR
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(-selection.w / 2, -selection.h / 2, selection.w, selection.h)
    ctx.setLineDash([])

    ctx.fillStyle = '#ffffff'
    const handles = resizeHandlePositions(selection)
    for (const id of Object.keys(handles) as ResizeHandleId[]) {
      const p = handles[id]
      ctx.beginPath()
      ctx.rect(p.x - HANDLE_VISUAL_SIZE / 2, p.y - HANDLE_VISUAL_SIZE / 2, HANDLE_VISUAL_SIZE, HANDLE_VISUAL_SIZE)
      ctx.fill()
      ctx.stroke()
    }

    const rotateHandle = rotateHandlePosition(selection)
    ctx.beginPath()
    ctx.moveTo(0, -selection.h / 2)
    ctx.lineTo(rotateHandle.x, rotateHandle.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(rotateHandle.x, rotateHandle.y, HANDLE_VISUAL_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }, [getPreviewCtx])

  // Paint the background, optionally load the panel's existing image on top
  // (re-opening the sketch tool on an already-sketched panel edits it rather
  // than silently discarding it), then seed the undo stack with that as the
  // baseline state.
  useEffect(() => {
    const ctx = getMainCtx()
    fillBackground(ctx)
    if (initialImageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        undoStackRef.current = [ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)]
      }
      img.src = initialImageUrl
    } else {
      undoStackRef.current = [ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)]
    }
  }, [initialImageUrl, getMainCtx, fillBackground])

  useImperativeHandle(
    ref,
    () => ({
      undo() {
        // Same principle as the floating-selection case below — an
        // in-progress text edit isn't on the history stack either, so
        // undoing it means discarding it outright, not committing then
        // stepping back.
        if (textEdit) {
          setTextEdit(null)
          return
        }
        // Nothing about an in-progress floating selection is on the history
        // stack — not the cut, not any number of moves/resizes/rotations
        // applied to it while still floating (only an actual commit — tool
        // switch, Escape, new marquee, save, clear — pushes one entry for
        // the whole session). So undoing it means discarding the entire
        // floating transform in one step and restoring the pre-selection
        // state directly, not committing it first and then stepping back.
        if (selectionRef.current) {
          selectionRef.current = null
          interactionRef.current = null
          clearPreview()
          const current = undoStackRef.current[undoStackRef.current.length - 1]
          getMainCtx().putImageData(current, 0, 0)
          return
        }
        if (undoStackRef.current.length <= 1) return
        undoStackRef.current.pop()
        const previous = undoStackRef.current[undoStackRef.current.length - 1]
        getMainCtx().putImageData(previous, 0, 0)
        onHistoryChange(undoStackRef.current.length > 1)
      },
      clear() {
        commitPendingText()
        commitFloatingSelection()
        fillBackground(getMainCtx())
        pushHistory()
      },
      commitFloatingSelection() {
        return commitFloatingSelection()
      },
      commitPendingText() {
        return commitPendingText()
      },
      async exportBlob() {
        commitPendingText()
        commitFloatingSelection()
        return new Promise((resolve) => {
          mainCanvasRef.current!.toBlob((blob) => resolve(blob), 'image/png')
        })
      },
    }),
    [commitFloatingSelection, commitPendingText, getMainCtx, fillBackground, pushHistory, onHistoryChange, clearPreview, textEdit]
  )

  function getCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = previewCanvasRef.current!.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: e.pressure || 0.5,
    }
  }

  function drawShape(
    ctx: CanvasRenderingContext2D,
    shapeTool: 'line' | 'rectangle' | 'ellipse',
    start: Point,
    end: Point
  ) {
    ctx.strokeStyle = color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    if (shapeTool === 'line') {
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
    } else if (shapeTool === 'rectangle') {
      ctx.rect(
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.abs(end.x - start.x),
        Math.abs(end.y - start.y)
      )
    } else {
      const cx = (start.x + end.x) / 2
      const cy = (start.y + end.y) / 2
      ctx.ellipse(cx, cy, Math.abs(end.x - start.x) / 2, Math.abs(end.y - start.y) / 2, 0, 0, Math.PI * 2)
    }
    ctx.stroke()
  }

  function drawMarquee(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
    ctx.save()
    ctx.strokeStyle = MARQUEE_COLOR
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(
      Math.min(start.x, end.x),
      Math.min(start.y, end.y),
      Math.abs(end.x - start.x),
      Math.abs(end.y - start.y)
    )
    ctx.restore()
  }

  function applyFill(point: Point) {
    const mainCtx = getMainCtx()
    const imageData = mainCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    const [r, g, b] = hexToRgb(color)
    const x = Math.min(CANVAS_WIDTH - 1, Math.max(0, Math.round(point.x)))
    const y = Math.min(CANVAS_HEIGHT - 1, Math.max(0, Math.round(point.y)))
    floodFill(imageData, x, y, [r, g, b, 255], 32)
    mainCtx.putImageData(imageData, 0, 0)
    pushHistory()
  }

  function finalizeSelection(start: Point, end: Point) {
    clearPreview()
    const x = Math.round(Math.min(start.x, end.x))
    const y = Math.round(Math.min(start.y, end.y))
    const w = Math.round(Math.abs(end.x - start.x))
    const h = Math.round(Math.abs(end.y - start.y))
    if (w < 2 || h < 2) return

    const mainCtx = getMainCtx()
    const captured = mainCtx.getImageData(x, y, w, h)
    const offscreen = document.createElement('canvas')
    offscreen.width = w
    offscreen.height = h
    offscreen.getContext('2d')!.putImageData(captured, 0, 0)

    // Cut, not copy — the region is cleared from the main canvas immediately
    // so it doesn't appear twice while floating. Not pushed to history yet:
    // the cut isn't a committed action on its own, only the eventual commit
    // (drag-drop, tool switch, save, clear) is — see the undo() comment above.
    mainCtx.fillStyle = BACKGROUND_COLOR
    mainCtx.fillRect(x, y, w, h)

    selectionRef.current = { x: x + w / 2, y: y + h / 2, w, h, rotation: 0, canvas: offscreen }
    renderSelectionOverlay()
  }

  function updateCursor(point: Point) {
    const el = previewCanvasRef.current
    if (!el) return
    if (tool === 'text') {
      el.style.cursor = 'text'
      return
    }
    if (tool !== 'select') {
      el.style.cursor = 'crosshair'
      return
    }

    // While actively dragging, pin the cursor to the interaction itself
    // rather than re-hit-testing the live pointer position — otherwise
    // dragging a handle away from its start point makes the cursor flicker
    // to move/crosshair mid-drag once the pointer no longer sits near any
    // handle.
    const interaction = interactionRef.current
    if (interaction?.kind === 'rotate') {
      el.style.cursor = 'grabbing'
      return
    }
    if (interaction?.kind === 'resize') {
      el.style.cursor = cursorForHit({ kind: 'resize', handle: interaction.handle })
      return
    }
    if (interaction?.kind === 'move') {
      el.style.cursor = 'move'
      return
    }

    const selection = selectionRef.current
    el.style.cursor = selection ? cursorForHit(hitTestSelection(point, selection)) : 'crosshair'
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const point = getCanvasPoint(e)
    isDrawingRef.current = true

    if (tool === 'pen' || tool === 'eraser') {
      pointsRef.current = [point]
    } else if (tool === 'line' || tool === 'rectangle' || tool === 'ellipse') {
      shapeStartRef.current = point
    } else if (tool === 'fill') {
      applyFill(point)
      isDrawingRef.current = false
    } else if (tool === 'text') {
      // Suppress the compatibility mousedown the browser fires after this
      // pointerdown. Its default action moves focus to the clicked element —
      // the canvas isn't focusable, so focus would land on <body>, blurring
      // the textarea we're about to mount. That blur runs commitPendingText,
      // which unmounts it again, all within this one gesture.
      e.preventDefault()
      // Commit any already-open text box (defensive — blur already handles
      // this in the common click-elsewhere case, but pointer/blur ordering
      // isn't a cross-browser guarantee worth relying on alone) before
      // starting a new one at this point.
      commitPendingText()
      // flushSync so the textarea is mounted before this handler returns,
      // guaranteeing autoFocus lands on it.
      flushSync(() => {
        setTextEdit({ x: point.x, y: point.y, value: '' })
      })
      isDrawingRef.current = false
    } else if (tool === 'select') {
      const selection = selectionRef.current
      const hit = selection ? hitTestSelection(point, selection) : { kind: 'none' as const }

      if (selection && hit.kind === 'rotate') {
        interactionRef.current = {
          kind: 'rotate',
          startAngle: Math.atan2(point.y - selection.y, point.x - selection.x),
          startRotation: selection.rotation,
        }
      } else if (selection && hit.kind === 'resize') {
        interactionRef.current = {
          kind: 'resize',
          handle: hit.handle,
          anchorLocal: resizeAnchor(hit.handle, selection),
          fixedTransform: { x: selection.x, y: selection.y, w: selection.w, h: selection.h, rotation: selection.rotation },
          startW: selection.w,
          startH: selection.h,
        }
      } else if (selection && hit.kind === 'move') {
        interactionRef.current = { kind: 'move', offsetX: point.x - selection.x, offsetY: point.y - selection.y }
      } else {
        // Clicked outside the selection and its handles — commit it (if any)
        // and start a fresh marquee.
        commitFloatingSelection()
        shapeStartRef.current = point
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const point = getCanvasPoint(e)
    updateCursor(point)
    if (!isDrawingRef.current) return
    const previewCtx = getPreviewCtx()

    if (tool === 'pen' || tool === 'eraser') {
      pointsRef.current.push(point)
      clearPreview()
      const outline = getStrokeOutline(pointsRef.current, brushSize)
      const path = outlineToPath2D(outline)
      previewCtx.fillStyle = tool === 'eraser' ? BACKGROUND_COLOR : color
      previewCtx.fill(path)
    } else if (tool === 'line' || tool === 'rectangle' || tool === 'ellipse') {
      if (!shapeStartRef.current) return
      clearPreview()
      drawShape(previewCtx, tool, shapeStartRef.current, point)
    } else if (tool === 'select') {
      const interaction = interactionRef.current
      const selection = selectionRef.current

      if (interaction?.kind === 'move' && selection) {
        selectionRef.current = { ...selection, x: point.x - interaction.offsetX, y: point.y - interaction.offsetY }
        renderSelectionOverlay()
      } else if (interaction?.kind === 'resize' && selection) {
        const local = toLocal(point, interaction.fixedTransform)
        const { w, h, centerLocal } = computeResize(
          local,
          interaction.anchorLocal,
          interaction.handle,
          interaction.startW,
          interaction.startH
        )
        const center = toWorld(centerLocal, interaction.fixedTransform)
        selectionRef.current = { ...selection, x: center.x, y: center.y, w, h }
        renderSelectionOverlay()
      } else if (interaction?.kind === 'rotate' && selection) {
        const angle = Math.atan2(point.y - selection.y, point.x - selection.x)
        selectionRef.current = { ...selection, rotation: interaction.startRotation + (angle - interaction.startAngle) }
        renderSelectionOverlay()
      } else if (shapeStartRef.current) {
        clearPreview()
        drawMarquee(previewCtx, shapeStartRef.current, point)
      }
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const mainCtx = getMainCtx()

    if (tool === 'pen' || tool === 'eraser') {
      if (pointsRef.current.length > 0) {
        const outline = getStrokeOutline(pointsRef.current, brushSize)
        const path = outlineToPath2D(outline)
        mainCtx.fillStyle = tool === 'eraser' ? BACKGROUND_COLOR : color
        mainCtx.fill(path)
        pushHistory()
      }
      pointsRef.current = []
      clearPreview()
    } else if ((tool === 'line' || tool === 'rectangle' || tool === 'ellipse') && shapeStartRef.current) {
      drawShape(mainCtx, tool, shapeStartRef.current, getCanvasPoint(e))
      pushHistory()
      shapeStartRef.current = null
      clearPreview()
    } else if (tool === 'select') {
      if (interactionRef.current) {
        // Move/resize/rotate all leave the selection floating — see the
        // undo() comment for why nothing commits here.
        interactionRef.current = null
      } else if (shapeStartRef.current) {
        const start = shapeStartRef.current
        shapeStartRef.current = null
        finalizeSelection(start, getCanvasPoint(e))
      }
    }
  }

  const displayWidth = BASE_DISPLAY_WIDTH * zoom
  const displayHeight = displayWidth * (CANVAS_HEIGHT / CANVAS_WIDTH)

  return (
    <>
      <div
        ref={wrapperRef}
        className="relative"
        style={{ width: displayWidth, height: displayHeight, gridColumn: 1, gridRow: 1 }}
      >
        <canvas
          ref={mainCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="absolute inset-0 z-0 h-full w-full rounded-md border border-border"
        />
        <canvas
          ref={previewCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="absolute inset-0 z-10 h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
      {/* Sized and grid-stacked to be pixel-identical to the wrapper above,
          so the textarea's left/top math (relative to this div) lines up
          exactly as it would if it were still a direct sibling of the
          canvases — but it renders into a genuinely separate DOM subtree via
          the portal below. pointer-events-none lets clicks pass through to
          the canvas everywhere except the textarea itself. */}
      <div
        ref={setOverlayRoot}
        className="pointer-events-none relative z-20"
        style={{ width: displayWidth, height: displayHeight, gridColumn: 1, gridRow: 1 }}
      />
      {overlayRoot &&
        textEdit &&
        createPortal(
          <textarea
            autoFocus
            value={textEdit.value}
            onChange={(e) => setTextEdit((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
            onBlur={() => commitPendingText()}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }}
            className="pointer-events-auto absolute resize-none overflow-hidden bg-transparent p-0 outline-none"
            style={{
              left: (textEdit.x / CANVAS_WIDTH) * displayWidth,
              top: (textEdit.y / CANVAS_HEIGHT) * displayHeight,
              minWidth: '4ch',
              minHeight: fontSize * (displayWidth / CANVAS_WIDTH) * TEXT_LINE_HEIGHT,
              color,
              fontSize: fontSize * (displayWidth / CANVAS_WIDTH),
              lineHeight: TEXT_LINE_HEIGHT,
              border: `1px dashed ${MARQUEE_COLOR}`,
            }}
          />,
          overlayRoot
        )}
    </>
  )
})
