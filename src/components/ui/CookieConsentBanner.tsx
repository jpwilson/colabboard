'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'orim-cookie-consent'
const AUTH_PATHS = ['/board/', '/dashboard', '/admin']

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show on authenticated routes
    if (AUTH_PATHS.some((p) => window.location.pathname.startsWith(p))) return

    // Don't show if consent already given
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.level) return
      }
    } catch { /* ignore */ }

    const timer = setTimeout(() => setVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleConsent = (level: 'all' | 'essential' | 'none') => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ level, timestamp: new Date().toISOString() }),
      )
    } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9998] border-t border-slate-200 bg-white/80 px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:px-6 sm:py-5"
      style={{ animation: 'slideUp 0.4s ease-out' }}
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <div className="flex flex-1 items-start gap-3 sm:items-center">
          <span className="shrink-0 text-2xl" aria-hidden>
            🍪
          </span>
          <p className="text-sm leading-relaxed text-slate-600">
            We use cookies to improve your experience and analyze site
            usage.{' '}
            <button
              onClick={() => handleConsent('essential')}
              className="font-medium text-primary underline underline-offset-2 hover:text-primary-dark"
            >
              Learn more
            </button>
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-2">
          <button
            onClick={() => handleConsent('all')}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-accent-dark hover:shadow"
          >
            Accept All
          </button>
          <button
            onClick={() => handleConsent('essential')}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Essential Only
          </button>
          <button
            onClick={() => handleConsent('none')}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:text-slate-600"
          >
            Reject All
          </button>
        </div>
      </div>
    </div>
  )
}
