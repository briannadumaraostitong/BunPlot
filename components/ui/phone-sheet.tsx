'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useVisibleArea } from '@/hooks/useVisibleArea'

// Scrolls the body so its focused field (or, in rich text, the caret) is in
// view between the body's top and its sticky bottom bar, if it has one.
function revealFocused(body: HTMLElement, barSlot: string | undefined) {
  const el = document.activeElement
  if (!(el instanceof HTMLElement) || !body.contains(el)) return
  let rect = el.getBoundingClientRect()
  if (el.isContentEditable) {
    const selection = window.getSelection()
    const caret = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null
    if (caret && caret.height > 0) rect = caret
  }
  const box = body.getBoundingClientRect()
  const bar = barSlot ? (body.querySelector(`[data-slot="${barSlot}"]`)?.getBoundingClientRect().height ?? 0) : 0
  const top = box.top + 8
  const bottom = box.bottom - bar - 8
  if (rect.bottom > bottom) body.scrollTop += rect.bottom - bottom
  else if (rect.top < top) body.scrollTop -= top - rect.top
}

interface PhoneSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // For screen readers; the sheet shows no title of its own.
  title: string
  description: string
  // The data-slot of the children's scrolling body, and of a sticky bar at
  // its bottom (if any), so the focused field stays in view above both the
  // on-screen keyboard and the bar.
  bodySlot: string
  barSlot?: string
  children: React.ReactNode
}

// A bottom sheet for phones (below md), where a dialog or side panel opens on
// larger screens; usePhoneSurface picks which. Up to 92dvh tall, with no
// close button of its own: the children bring one, in a header row above
// their scrolling body. It closes through onOpenChange (that button, Escape
// and a tap outside), and sits above the on-screen keyboard while it's up.
export function PhoneSheet({ open, onOpenChange, title, description, bodySlot, barSlot, children }: PhoneSheetProps) {
  // What part of the page is visible (window.visualViewport), only while the
  // sheet is open.
  const visible = useVisibleArea(open)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Keep the focused field (the editor's caret, in rich text) in the visible
  // part of the body, above its sticky bar: after the keyboard opens or the
  // visible area changes, on moving between fields and as you type. Browsers
  // scroll a focused field into view themselves, but not clear of the bar.
  const keyboardOpen = (visible?.bottomInset ?? 0) > 0
  useEffect(() => {
    if (!open) return
    const body = sheetRef.current?.querySelector<HTMLElement>(`[data-slot="${bodySlot}"]`)
    if (!body) return
    let frame = 0
    const reveal = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => revealFocused(body, barSlot))
    }
    if (keyboardOpen) reveal()
    body.addEventListener('focusin', reveal)
    body.addEventListener('input', reveal)
    return () => {
      cancelAnimationFrame(frame)
      body.removeEventListener('focusin', reveal)
      body.removeEventListener('input', reveal)
    }
  }, [open, keyboardOpen, visible?.height, bodySlot, barSlot])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={sheetRef}
        side="bottom"
        showCloseButton={false}
        // While the keyboard covers the bottom of the page, the sheet sits on
        // top of it and fits what's still visible.
        style={
          visible?.bottomInset
            ? { bottom: visible.bottomInset, maxHeight: `min(92dvh, ${Math.round(visible.height * 0.92)}px)` }
            : undefined
        }
        className={cn(
          'max-h-[92dvh] gap-0 overflow-hidden rounded-t-lg p-0 bg-card',
          // Clear of the home indicator once the viewport opts in to safe
          // areas (viewport-fit=cover); 0 until then.
          'pb-[env(safe-area-inset-bottom)]'
        )}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{description}</SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  )
}
