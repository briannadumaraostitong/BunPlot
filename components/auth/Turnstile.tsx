'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import Script from 'next/script'

// Cloudflare Turnstile, the CAPTCHA Supabase checks on password sign-ins,
// sign-ups and reset emails once it's switched on (Authentication → Attack
// Protection). Each form renders the widget and sends its token with the
// request (options.captchaToken). Without NEXT_PUBLIC_TURNSTILE_SITE_KEY
// nothing renders and no token is sent, so the code can ship before CAPTCHA
// is switched on in Supabase. "interaction-only": most visitors never see
// it; a check appears only when Cloudflare wants one.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// 'page': light or dark as the page around the widget is (a .dark ancestor),
// for the app, whose dark themes set the class on <html>.
export type TurnstileTheme = 'light' | 'dark' | 'auto' | 'page'

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

// Up to this long for a token when the form is sent before one has arrived
// (the form shows its loading state meanwhile).
const WAIT_MS = 10_000
// After an error (a network blip, or Cloudflare's client errors such as
// 300010), the widget is reset and tried again this many times, this far
// apart; the next submit starts it over.
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2_000

// The answer for one attempt: the token to send (undefined without a site
// key, when none is needed), or the message to show instead.
export type TurnstileResult = { token: string | undefined } | { error: string }

// The form's side of the widget: getToken() before each attempt, reset()
// after it (a token works once), and the widget element to place in the form.
export function useTurnstile({ theme, action }: { theme: TurnstileTheme; action: string }) {
  // Refs, not state: getToken() reads them while it waits.
  const token = useRef<string | null>(null)
  const waiters = useRef<((t: string) => void)[]>([])
  const retries = useRef(0)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const widgetId = useRef<string | null>(null)
  // Cloudflare wants an interactive check: the widget shows itself
  // ("interaction-only"), and a line under it says why.
  const [interactive, setInteractive] = useState(false)
  const interactiveRef = useRef(false)
  // A callback ref, so the widget follows the element when a form swaps
  // views (forgot password's form, then its "Send again").
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [scriptReady, setScriptReady] = useState(() => typeof window !== 'undefined' && !!window.turnstile)

  useEffect(() => {
    if (!SITE_KEY || !scriptReady || !container || !window.turnstile) return
    const showInteractive = (on: boolean) => {
      interactiveRef.current = on
      setInteractive(on)
    }
    const id = window.turnstile.render(container, {
      sitekey: SITE_KEY,
      action,
      theme: theme === 'page' ? (container.closest('.dark') ? 'dark' : 'light') : theme,
      appearance: 'interaction-only',
      size: 'flexible',
      // Retries are ours (below), so they stop after a few and a submit can
      // start them again.
      retry: 'never',
      'refresh-expired': 'auto',
      callback: (t: string) => {
        retries.current = 0
        token.current = t
        showInteractive(false)
        const waiting = waiters.current
        waiters.current = []
        waiting.forEach((resolve) => resolve(t))
      },
      // An expired token is refreshed on its own (refresh-expired).
      'expired-callback': () => {
        token.current = null
      },
      // The interactive check was left too long: start a fresh one.
      'timeout-callback': () => {
        token.current = null
        window.turnstile?.reset(id)
      },
      'error-callback': () => {
        token.current = null
        if (retries.current < MAX_RETRIES) {
          retries.current += 1
          retryTimer.current = setTimeout(() => {
            if (widgetId.current === id) window.turnstile?.reset(id)
          }, RETRY_DELAY_MS)
        }
        // Handled: Turnstile needn't log it as uncaught.
        return true
      },
      'before-interactive-callback': () => showInteractive(true),
      'after-interactive-callback': () => showInteractive(false),
    })
    widgetId.current = id
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
      window.turnstile?.remove(id)
      widgetId.current = null
      // That widget's token goes with it.
      token.current = null
      showInteractive(false)
    }
  }, [container, scriptReady, theme, action])

  const getToken = useCallback(async (): Promise<TurnstileResult> => {
    if (!SITE_KEY) return { token: undefined }
    if (token.current) return { token: token.current }
    // The retries ran out: start over for this attempt.
    if (retries.current >= MAX_RETRIES && widgetId.current) {
      retries.current = 0
      window.turnstile?.reset(widgetId.current)
    }
    const t = await new Promise<string | null>((resolve) => {
      const done = (value: string) => {
        clearTimeout(timer)
        resolve(value)
      }
      const timer = setTimeout(() => {
        waiters.current = waiters.current.filter((w) => w !== done)
        resolve(null)
      }, WAIT_MS)
      waiters.current.push(done)
    })
    if (t) return { token: t }
    return { error: interactiveRef.current ? TURNSTILE_INTERACT : TURNSTILE_SLOW }
  }, [])

  const reset = useCallback(() => {
    token.current = null
    retries.current = 0
    if (widgetId.current) window.turnstile?.reset(widgetId.current)
  }, [])

  const widget = SITE_KEY ? (
    <>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div ref={setContainer} data-slot="turnstile" />
      {interactive && (
        <p role="status" className="text-xs text-muted-foreground">
          Cloudflare needs a quick check before you continue.
        </p>
      )}
    </>
  ) : null

  return { getToken, reset, widget }
}

// No token within WAIT_MS.
export const TURNSTILE_SLOW = 'The browser check is taking longer than usual. Try again in a moment.'
// No token within WAIT_MS, and the interactive check is showing.
export const TURNSTILE_INTERACT = 'Complete the browser check above, then try again.'

// Supabase turned the token down (missing, expired or used). The widget has
// been reset by then, so a second try normally passes.
export const TURNSTILE_FAILED = "The browser check didn't go through. Try again."

export const isCaptchaError = (error: AuthError) => error.code === 'captcha_failed'
