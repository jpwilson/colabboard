'use client'

import { useState, useEffect, useRef } from 'react'
import type { ConnectionStatus } from '@/hooks/useBoard'

interface ConnectionIndicatorProps {
  status: ConnectionStatus
}

export function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  // Track the previous status to detect transitions
  const prevStatusRef = useRef<ConnectionStatus>(status)
  // Timers tracked outside React state
  const [backOnline, setBackOnline] = useState(false)
  const [disconnectedLong, setDisconnectedLong] = useState(false)

  // Handle status transitions with timers via separate effects per concern
  const prevStatus = prevStatusRef.current

  // Update ref after reading it
  useEffect(() => {
    prevStatusRef.current = status
  })

  // "Back online" flash — show for 2 seconds after reconnecting
  useEffect(() => {
    if (status !== 'connected') {
      setBackOnline(false)
      return
    }
    // Only flash if transitioning from a bad state
    if (prevStatus !== 'reconnecting' && prevStatus !== 'disconnected') return

    setBackOnline(true)
    const timer = setTimeout(() => setBackOnline(false), 2000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Disconnected banner — show after 5 seconds of being disconnected
  useEffect(() => {
    if (status !== 'disconnected') {
      setDisconnectedLong(false)
      return
    }
    const timer = setTimeout(() => setDisconnectedLong(true), 5000)
    return () => clearTimeout(timer)
  }, [status])

  // Determine what to show
  if (status === 'reconnecting') {
    return (
      <div className="pointer-events-none absolute left-1/2 top-2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-200" />
          Reconnecting...
        </div>
      </div>
    )
  }

  if (status === 'connected' && backOnline) {
    return (
      <div className="pointer-events-none absolute left-1/2 top-2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <span className="inline-block h-2 w-2 rounded-full bg-green-300" />
          Back online
        </div>
      </div>
    )
  }

  if (status === 'disconnected' && disconnectedLong) {
    return (
      <div className="pointer-events-none absolute left-1/2 top-2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <span className="inline-block h-2 w-2 rounded-full bg-red-300" />
          Connection lost
        </div>
      </div>
    )
  }

  return null
}
