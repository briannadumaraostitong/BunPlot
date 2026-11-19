'use client'

import { useEffect } from 'react'

// Elements revealed together are staggered by their order, up to this many
// steps, so the last of a long row never waits long (motion.css).
const MAX_STEP = 4

// Below Tailwind's md breakpoint, as in useIsBelowMd. Hero pictures
// (data-reveal="hero") wait for the scroll only there; from md up they play
// as the page loads, in CSS alone.
const PHONE = '(max-width: 767px)'

// How far up the screen an element must come to count as in view: 10% up
// from the bottom (the observer's rootMargin).
const IN_VIEW = 0.9

// Reveals the landing's [data-reveal] elements as they scroll into view, once
// each; motion.css draws the reveal. They're hidden only once this has run
// (html[data-reveals="on"]), so without JavaScript, or with reduced motion,
// the page shows as it is. Anything above the fold line when it starts (on
// screen, or scrolled past after a reload or an #anchor) shows at once,
// unanimated, and so does anything scrolled past later without being seen
// (a jump to an anchor), so nothing above the screen is ever left hidden.
// A phone's hero picture is the exception: it starts just below the text,
// often with its top edge on screen, so it shows at once only if it's
// already in view (above the observer's line) and otherwise waits to play.
export function LandingReveals() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = document.documentElement
    const pending = new Set(document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'))
    const phone = window.matchMedia(PHONE).matches

    const reveal = (el: HTMLElement, how: 'in' | 'now', step = 0) => {
      pending.delete(el)
      observer.unobserve(el)
      if (how === 'in') el.style.setProperty('--reveal-step', String(step))
      el.dataset.revealed = how
    }
    const isAboveScreen = (el: HTMLElement) => el.getBoundingClientRect().bottom <= 0

    const observer = new IntersectionObserver(
      (entries) => {
        let step = 0
        for (const entry of entries) {
          const el = entry.target as HTMLElement
          if (entry.isIntersecting && pending.has(el)) reveal(el, 'in', Math.min(step++, MAX_STEP))
        }
        for (const el of pending) if (isAboveScreen(el)) reveal(el, 'now')
      },
      // In view once 10% up from the bottom of the screen.
      { rootMargin: `0px 0px -${Math.round((1 - IN_VIEW) * 100)}% 0px` }
    )

    for (const el of pending) {
      const hero = el.dataset.reveal === 'hero'
      // From md up the hero plays on load in CSS: nothing to wait for.
      if (hero && !phone) {
        reveal(el, 'now')
        continue
      }
      const line = hero ? window.innerHeight * IN_VIEW : window.innerHeight
      if (el.getBoundingClientRect().top < line) reveal(el, 'now')
      else observer.observe(el)
    }
    root.dataset.reveals = 'on'

    return () => {
      observer.disconnect()
      delete root.dataset.reveals
    }
  }, [])

  return null
}
