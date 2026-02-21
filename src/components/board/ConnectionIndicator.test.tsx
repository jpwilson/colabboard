import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConnectionIndicator } from './ConnectionIndicator'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ConnectionIndicator', () => {
  it('renders nothing when connected', () => {
    const { container } = render(<ConnectionIndicator status="connected" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows reconnecting banner', () => {
    render(<ConnectionIndicator status="reconnecting" />)
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument()
  })

  it('shows disconnected banner after 5 seconds', () => {
    render(<ConnectionIndicator status="disconnected" />)
    expect(screen.queryByText('Connection lost')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('Connection lost')).toBeInTheDocument()
  })

  it('shows back online briefly after reconnecting', () => {
    const { rerender } = render(<ConnectionIndicator status="reconnecting" />)
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument()

    rerender(<ConnectionIndicator status="connected" />)
    expect(screen.getByText('Back online')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByText('Back online')).not.toBeInTheDocument()
  })
})
