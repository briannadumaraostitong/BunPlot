'use client'

import { useCallback, useEffect, useState } from 'react'

interface TypeInOptions {
  // Per character, unless that would take longer than totalMs.
  stepMs?: number
  totalMs?: number
  // Before the first character, so it starts once its dialog is opening.
  delayMs?: number
}

interface TypeIn {
  // How many characters to draw, or null when not typing (finished,
  // stopped, never started, or with reduced motion).
  shown: number | null
  // Stops it at once, for the user's own input.
  stop: () => void
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Types `text` in, one character at a time, for a field that already holds
// all of it: the field's value (and so a submit, and what a screen reader
// hears) is never partial; only what's drawn over it is. Starts again for
// each new text; with reduced motion it never starts, so the field shows
// the whole text at once.
export function useTypeIn(text: string | null, { stepMs = 35, totalMs = 480, delayMs = 120 }: TypeInOptions = {}): TypeIn {
  const [run, setRun] = useState<{ text: string | null; count: number; done: boolean }>({ text: null, count: 0, done: true })
  // A new text starts a new run, set while rendering so the first frame
  // already draws it (an effect would show the whole text for a frame).
  if (run.text !== text) setRun({ text, count: 0, done: !text || prefersReducedMotion() })

  const typing = !run.done && run.text !== null
  const runText = run.text
  const length = runText?.length ?? 0

  useEffect(() => {
    if (!typing || !runText) return
    const step = Math.min(stepMs, totalMs / length)
    let count = 0
    let timer = window.setTimeout(function tick() {
      count += 1
      const done = count >= length
      setRun((current) => (current.done ? current : { ...current, count, done }))
      if (!done) timer = window.setTimeout(tick, step)
    }, delayMs + step)
    return () => window.clearTimeout(timer)
  }, [typing, runText, length, stepMs, totalMs, delayMs])

  const stop = useCallback(() => setRun((current) => (current.done ? current : { ...current, done: true })), [])

  return { shown: typing ? run.count : null, stop }
}
