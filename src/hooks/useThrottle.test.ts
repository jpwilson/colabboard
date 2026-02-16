import { renderHook, act } from '@testing-library/react'
import { useThrottle } from './useThrottle'

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls the callback immediately on first invocation', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottle(callback, 100))

    act(() => {
      result.current(42)
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(42)
  })

  it('throttles subsequent calls within the delay', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottle(callback, 100))

    act(() => {
      result.current(1)
      result.current(2)
      result.current(3)
    })

    // Only the first call fires immediately
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(1)

    // After delay, the latest call fires
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith(3)
  })

  it('allows calls after the delay has passed', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottle(callback, 100))

    act(() => {
      result.current(1)
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    act(() => {
      result.current(2)
    })

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith(2)
  })
})
