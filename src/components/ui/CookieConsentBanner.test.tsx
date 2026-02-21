import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CookieConsentBanner } from './CookieConsentBanner'

const STORAGE_KEY = 'orim-cookie-consent'

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    // Default to public page
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render when consent already in localStorage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ level: 'all', timestamp: '2026-01-01T00:00:00Z' }),
    )
    render(<CookieConsentBanner />)
    act(() => { vi.advanceTimersByTime(600) })
    expect(screen.queryByText('Accept All')).not.toBeInTheDocument()
  })

  it('does not render on /board/ paths', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/board/my-board' },
      writable: true,
    })
    render(<CookieConsentBanner />)
    act(() => { vi.advanceTimersByTime(600) })
    expect(screen.queryByText('Accept All')).not.toBeInTheDocument()
  })

  it('does not render on /dashboard path', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard' },
      writable: true,
    })
    render(<CookieConsentBanner />)
    act(() => { vi.advanceTimersByTime(600) })
    expect(screen.queryByText('Accept All')).not.toBeInTheDocument()
  })

  it('renders on / after delay when no consent', () => {
    render(<CookieConsentBanner />)
    // Before delay
    expect(screen.queryByText('Accept All')).not.toBeInTheDocument()
    // After delay
    act(() => { vi.advanceTimersByTime(600) })
    expect(screen.getByText('Accept All')).toBeInTheDocument()
    expect(screen.getByText('Essential Only')).toBeInTheDocument()
    expect(screen.getByText('Reject All')).toBeInTheDocument()
  })

  it('clicking Accept All stores consent and hides banner', async () => {
    vi.useRealTimers()
    render(<CookieConsentBanner />)
    // Wait for timer
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })
    const btn = screen.getByText('Accept All')
    await userEvent.click(btn)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.level).toBe('all')
    expect(stored.timestamp).toBeTruthy()
    expect(screen.queryByText('Accept All')).not.toBeInTheDocument()
  })

  it('clicking Reject All stores none level', async () => {
    vi.useRealTimers()
    render(<CookieConsentBanner />)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600))
    })
    await userEvent.click(screen.getByText('Reject All'))
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(stored.level).toBe('none')
  })
})
