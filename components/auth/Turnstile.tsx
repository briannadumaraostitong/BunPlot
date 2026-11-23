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

// The form's side of the widget: the current token (null while there's
// none), whether one is required at all, reset() after each attempt (a token
// works once), and the widget element to place in the form.
export function useTurnstile({ theme, action }: { theme: TurnstileTheme; action: string }) {
  const [token, setToken] = useState<string | null>(null)
  // A callback ref, so the widget follows the element when a form swaps
  // views (forgot password's form, then its "Send again").
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const widgetId = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(() => typeof window !== 'undefined' && !!window.turnstile)

  useEffect(() => {
    if (!SITE_KEY || !scriptReady || !container || !window.turnstile) return
    const id = window.turnstile.render(container, {
      sitekey: SITE_KEY,
      action,
      theme: theme === 'page' ? (container.closest('.dark') ? 'dark' : 'light') : theme,
      appearance: 'interaction-only',
      size: 'flexible',
      callback: (t: string) => setToken(t),
      'expired-callback': () => setToken(null),
      'error-callback': () => setToken(null),
    })
    widgetId.current = id
    return () => {
      window.turnstile?.remove(id)
      widgetId.current = null
      // That widget's token goes with it.
      setToken(null)
    }
  }, [container, scriptReady, theme, action])

  const reset = useCallback(() => {
    setToken(null)
    if (widgetId.current) window.turnstile?.reset(widgetId.current)
  }, [])

  const widget = SITE_KEY ? (
    <>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div ref={setContainer} data-slot="turnstile" />
    </>
  ) : null

  return { token: token ?? undefined, required: !!SITE_KEY, ready: !SITE_KEY || !!token, reset, widget }
}

// While the widget hasn't handed over a token yet.
export const TURNSTILE_WAITING = 'Checking your browser… try again in a moment.'

// Supabase turned the token down (missing, expired or used). The widget has
// been reset by then, so a second try normally passes.
export const TURNSTILE_FAILED = "The browser check didn't go through. Try again."

export const isCaptchaError = (error: AuthError) => error.code === 'captcha_failed'
