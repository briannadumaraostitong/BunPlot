'use client'

import { useEffect } from 'react'

// Keeps --landing-header-h on <html> at the sticky landing header's height
// (it changes with the width: one row on phones, wrapping on some tablets),
// for the scroll padding that keeps scroll targets clear of the header
// (motion.css). Without JavaScript the padding falls back to the phone
// header's height. Removed when the landing unmounts.
// A page loaded at an #anchor has already scrolled there with the fallback
// padding, before this runs: if the target still sits where that left it,
// it's moved to just below the header's real height, once.
const FALLBACK = 84

export function LandingHeaderOffset() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-slot="landing-header"]')
    if (!header) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--landing-header-h', `${header.getBoundingClientRect().height}px`)
    update()

    const target = window.location.hash ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null
    if (target && window.scrollY > 0) {
      const top = target.getBoundingClientRect().top
      const height = header.getBoundingClientRect().height
      if (Math.abs(top - FALLBACK) < 2 && Math.abs(top - height) >= 1) window.scrollBy({ top: top - height, behavior: 'instant' })
    }
    const observer = new ResizeObserver(update)
    observer.observe(header)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--landing-header-h')
    }
  }, [])

  return null
}
