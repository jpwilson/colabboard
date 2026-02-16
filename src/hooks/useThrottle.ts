'use client'

import { useCallback, useRef } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): T {
  const lastCall = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestArgs = useRef<any[] | null>(null)

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (...args: any[]) => {
      const now = Date.now()
      latestArgs.current = args

      if (now - lastCall.current >= delay) {
        lastCall.current = now
        callback(...args)
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(
          () => {
            lastCall.current = Date.now()
            timeoutRef.current = null
            if (latestArgs.current) {
              callback(...latestArgs.current)
            }
          },
          delay - (now - lastCall.current),
        )
      }
    },
    [callback, delay],
  ) as T
}
