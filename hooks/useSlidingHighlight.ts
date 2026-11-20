'use client'

import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

// Slides a list's active highlight from the old item to the new one when the
// active item changes, instead of letting it jump. The items keep their own
// active style (data-active), so the first render, scrolling and the resting
// look are untouched; for the slide, a stand-in highlight (the ghost, an
// aria-hidden nav-item with data-active, so each theme draws its own
// background and marker on it) sits behind the items in the nav, starts at
// the old item and moves to the new one. Meanwhile `sliding` is true and the
// new item holds back its own highlight; when the ghost lands, the item takes
// over in the same frame and the ghost hides.
//
// Items carry data-nav-key (their href). Nothing slides on the first render
// (a page load, or the phone drawer opening), under reduced motion, or when
// either item can't be seen (a collapsed or scrolled-away project). A change
// mid-slide starts from wherever the ghost is. Timing comes from the theme:
// --motion-highlight and --ease-highlight.
export function useSlidingHighlight(navRef: RefObject<HTMLElement | null>, activeKey: string | null) {
  const ghostRef = useRef<HTMLSpanElement>(null)
  // undefined until the first render has been seen.
  const previousKey = useRef<string | null | undefined>(undefined)
  const animation = useRef<Animation | null>(null)
  const markerAnimation = useRef<Animation | null>(null)
  const [sliding, setSliding] = useState(false)

  useLayoutEffect(() => {
    const fromKey = previousKey.current
    previousKey.current = activeKey
    if (fromKey === undefined || fromKey === activeKey) return

    const nav = navRef.current
    const ghost = ghostRef.current
    if (!nav || !ghost) return

    // Where the highlight is now: the ghost, if it's mid-slide, else the
    // old item. Likewise the height of the theme's marker, if it draws one
    // (Classic's ::before, taller beside the main items).
    let start: DOMRect | null = null
    let startMarker: number | null = null
    if (animation.current) {
      start = ghost.getBoundingClientRect()
      startMarker = markerHeight(ghost)
      animation.current.cancel()
      markerAnimation.current?.cancel()
      animation.current = null
      markerAnimation.current = null
    } else if (fromKey) {
      const from = findItem(nav, fromKey)
      if (from && isInView(from)) {
        start = from.getBoundingClientRect()
        ghost.toggleAttribute('data-main', isMainItem(from))
        startMarker = markerHeight(ghost)
      }
    }
    const to = activeKey ? findItem(nav, activeKey) : null

    if (!start || !to || !isInView(to) || prefersReducedMotion()) {
      setSliding(false)
      return
    }

    // The ghost sits on the new item, in the nav's scrolling content, and
    // is moved back to where the highlight was; the animation brings it home.
    const end = to.getBoundingClientRect()
    const box = nav.getBoundingClientRect()
    ghost.style.top = `${end.top - box.top + nav.scrollTop}px`
    ghost.style.left = `${end.left - box.left + nav.scrollLeft}px`
    ghost.style.width = `${end.width}px`
    ghost.style.height = `${end.height}px`
    // Classic's marker is taller beside the main items' larger icons.
    ghost.toggleAttribute('data-main', isMainItem(to))
    const endMarker = markerHeight(ghost)
    ghost.hidden = false

    const style = getComputedStyle(nav)
    const timing = { duration: toMs(style.getPropertyValue('--motion-highlight')), easing: style.getPropertyValue('--ease-highlight').trim() || 'ease-out' }
    const run = ghost.animate(
      [{ transform: `translateY(${start.top - end.top}px)` }, { transform: 'none' }],
      timing
    )
    animation.current = run
    // The marker eases between the two heights on the same timing, rather
    // than switching as the slide starts.
    if (startMarker !== null && endMarker !== null && startMarker !== endMarker) {
      markerAnimation.current = ghost.animate(
        [{ height: `${startMarker}px` }, { height: `${endMarker}px` }],
        { ...timing, pseudoElement: '::before' }
      )
    }
    run.onfinish = () => {
      if (animation.current !== run) return
      animation.current = null
      markerAnimation.current = null
      setSliding(false)
    }
    setSliding(true)
  }, [activeKey, navRef])

  // Hide the ghost in the same commit that gives the item back its own
  // highlight, so there's no frame with neither.
  useLayoutEffect(() => {
    if (!sliding && ghostRef.current) ghostRef.current.hidden = true
  }, [sliding])

  useLayoutEffect(() => () => {
    animation.current?.cancel()
    markerAnimation.current?.cancel()
  }, [])

  return { ghostRef, sliding }
}

function isMainItem(item: HTMLElement) {
  return !!item.closest('[data-slot="sidebar-nav"]')
}

// The height of the ghost's ::before marker as drawn now (mid-animation
// included), or null when the theme draws none.
function markerHeight(ghost: HTMLElement) {
  const marker = getComputedStyle(ghost, '::before')
  if (marker.content === 'none' || marker.content === 'normal') return null
  const height = parseFloat(marker.height)
  return Number.isNaN(height) ? null : height
}

function findItem(nav: HTMLElement, key: string) {
  return nav.querySelector<HTMLElement>(`[data-nav-key="${CSS.escape(key)}"]`)
}

// Visible, and wholly inside its scrolling list (if it's in one).
function isInView(item: HTMLElement) {
  if (!item.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false
  const rect = item.getBoundingClientRect()
  const list = item.closest('ul')
  if (!list) return true
  const clip = list.getBoundingClientRect()
  return rect.top >= clip.top - 0.5 && rect.bottom <= clip.bottom + 0.5 && clip.height > 0
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function toMs(value: string) {
  const n = parseFloat(value)
  if (Number.isNaN(n)) return 250
  return value.trim().endsWith('ms') ? n : n * 1000
}
