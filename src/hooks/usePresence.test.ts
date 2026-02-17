import { renderHook } from '@testing-library/react'
import { usePresence } from './usePresence'

const mockTrack = vi.fn()
const mockUntrack = vi.fn()
const mockSend = vi.fn()
const mockRemoveChannel = vi.fn()
const mockPresenceState = vi.fn(() => ({}))
let subscribeCallback: ((status: string) => void) | null = null

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn((cb: (status: string) => void) => {
    subscribeCallback = cb
    return mockChannel
  }),
  track: mockTrack,
  send: mockSend,
  untrack: mockUntrack,
  presenceState: mockPresenceState,
}

vi.mock('../lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}))

describe('usePresence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    subscribeCallback = null
  })

  it('returns empty others array initially', () => {
    const { result } = renderHook(() =>
      usePresence({ boardId: 'board-1', userId: 'user-1', userName: 'Alice' }),
    )

    expect(result.current.others).toEqual([])
    expect(typeof result.current.updateCursor).toBe('function')
  })

  it('subscribes to presence and broadcast events on mount', () => {
    renderHook(() =>
      usePresence({ boardId: 'board-1', userId: 'user-1', userName: 'Alice' }),
    )

    expect(mockChannel.on).toHaveBeenCalledWith(
      'presence',
      { event: 'sync' },
      expect.any(Function),
    )
    expect(mockChannel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'cursor' },
      expect.any(Function),
    )
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('tracks presence after subscribing', async () => {
    renderHook(() =>
      usePresence({ boardId: 'board-1', userId: 'user-1', userName: 'Alice' }),
    )

    // Simulate successful subscription
    if (subscribeCallback) {
      await subscribeCallback('SUBSCRIBED')
    }

    expect(mockTrack).toHaveBeenCalledWith({
      userId: 'user-1',
      userName: 'Alice',
    })
  })

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() =>
      usePresence({ boardId: 'board-1', userId: 'user-1', userName: 'Alice' }),
    )

    unmount()

    expect(mockUntrack).toHaveBeenCalled()
    expect(mockRemoveChannel).toHaveBeenCalled()
  })

  it('does not connect when boardId is empty', () => {
    renderHook(() =>
      usePresence({ boardId: '', userId: 'user-1', userName: 'Alice' }),
    )

    expect(mockChannel.subscribe).not.toHaveBeenCalled()
  })
})
