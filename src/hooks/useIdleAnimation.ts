'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

const IDLE_ANIMATIONS = [
  { name: 'idleLand', duration: 1500, css: 'idleLand 1.5s ease-in-out' },
  { name: 'idleBackflip', duration: 800, css: 'idleBackflip 0.8s ease-in-out' },
  { name: 'idleSpin', duration: 800, css: 'idleSpin 0.8s ease-in-out' },
  { name: 'idleShake', duration: 600, css: 'idleShake 0.6s ease-in-out' },
  { name: 'idleGrow', duration: 1200, css: 'idleGrow 1.2s ease-in-out' },
] as const

const IDLE_TIMEOUT = 120_000 // 2 minutes

interface UseIdleAnimationReturn {
  /** CSS animation string to apply, or null when not playing */
  idleAnimation: string | null
  /** Call this whenever the user interacts to reset the timer */
  resetIdleTimer: () => void
}

export function useIdleAnimation(): UseIdleAnimationReturn {
  const [idleAnimation, setIdleAnimation] = useState<string | null>(null)
  const lastInteractionRef = useRef(0)
  const lastAnimIndexRef = useRef(-1)
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize the timestamp in an effect (React 19 lint: Date.now() is impure)
  useEffect(() => {
    lastInteractionRef.current = Date.now()
  }, [])

  const resetIdleTimer = useCallback(() => {
    lastInteractionRef.current = Date.now()
    // Clear any playing animation
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current)
      animTimeoutRef.current = null
    }
    setIdleAnimation(null)
  }, [])

  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastInteractionRef.current
      if (elapsed >= IDLE_TIMEOUT && !animTimeoutRef.current) {
        // Pick a random animation, different from last
        let idx: number
        do {
          idx = Math.floor(Math.random() * IDLE_ANIMATIONS.length)
        } while (idx === lastAnimIndexRef.current && IDLE_ANIMATIONS.length > 1)

        lastAnimIndexRef.current = idx
        const anim = IDLE_ANIMATIONS[idx]
        setIdleAnimation(anim.css)

        // Clear animation after it finishes and reset timer
        animTimeoutRef.current = setTimeout(() => {
          setIdleAnimation(null)
          lastInteractionRef.current = Date.now()
          animTimeoutRef.current = null
        }, anim.duration + 100) // small buffer
      }
    }, 1000)

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    }
  }, [])

  return { idleAnimation, resetIdleTimer }
}
