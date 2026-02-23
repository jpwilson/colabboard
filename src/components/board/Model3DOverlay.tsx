'use client'

import { useEffect, useRef, useCallback, memo } from 'react'
import type { CanvasObject } from '@/lib/board-sync'

const MODEL_VIEWER_CDN =
  'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'

/** model-viewer JS runtime API (subset we use) */
interface ModelViewerElement extends HTMLElement {
  cameraOrbit: string
  jumpCameraToGoal: () => void
  interpolationDecay: number
}

interface Model3DOverlayProps {
  objects: CanvasObject[]
  stagePos: { x: number; y: number }
  stageScale: number
  interactingId: string | null
  onCameraChange: (id: string, cameraOrbit: string) => void
}

export const Model3DOverlay = memo(function Model3DOverlay({
  objects,
  stagePos,
  stageScale,
  interactingId,
  onCameraChange,
}: Model3DOverlayProps) {
  const scriptLoadedRef = useRef(false)

  // Load model-viewer script once
  useEffect(() => {
    if (scriptLoadedRef.current) return
    if (document.querySelector('script[src*="model-viewer"]')) {
      scriptLoadedRef.current = true
      return
    }
    const script = document.createElement('script')
    script.type = 'module'
    script.src = MODEL_VIEWER_CDN
    document.head.appendChild(script)
    scriptLoadedRef.current = true
  }, [])

  const model3dObjects = objects.filter(
    (obj) => obj.type === 'model3d' && obj.modelUrl,
  )

  if (model3dObjects.length === 0) return null

  return (
    <>
      {model3dObjects.map((obj) => {
        const screenX = obj.x * stageScale + stagePos.x
        const screenY = obj.y * stageScale + stagePos.y
        const screenW = obj.width * stageScale
        const screenH = obj.height * stageScale
        const isInteracting = interactingId === obj.id

        return (
          <ModelViewerItem
            key={obj.id}
            objId={obj.id}
            modelUrl={obj.modelUrl!}
            cameraOrbit={obj.cameraOrbit || '0deg 75deg 2.5m'}
            screenX={screenX}
            screenY={screenY}
            screenW={screenW}
            screenH={screenH}
            isInteracting={isInteracting}
            onCameraChange={onCameraChange}
          />
        )
      })}
    </>
  )
})

const ModelViewerItem = memo(function ModelViewerItem({
  objId,
  modelUrl,
  cameraOrbit,
  screenX,
  screenY,
  screenW,
  screenH,
  isInteracting,
  onCameraChange,
}: {
  objId: string
  modelUrl: string
  cameraOrbit: string
  screenX: number
  screenY: number
  screenW: number
  screenH: number
  isInteracting: boolean
  onCameraChange: (id: string, cameraOrbit: string) => void
}) {
  const mvRef = useRef<ModelViewerElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track the last orbit we sent, so we don't snap back to stale prop on exit
  const lastSentOrbitRef = useRef<string | null>(null)
  const wasInteractingRef = useRef(false)

  // ── Send camera state while interacting ──
  // Read from the JS runtime property (mv.cameraOrbit), NOT getAttribute
  const handleCameraChange = useCallback(() => {
    if (!isInteracting) return
    const mv = mvRef.current
    if (!mv) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Use the JS property — this is the live camera state
      const orbit = mv.cameraOrbit
      if (orbit) {
        lastSentOrbitRef.current = orbit
        onCameraChange(objId, orbit)
      }
    }, 100) // Faster debounce for smoother sync
  }, [isInteracting, objId, onCameraChange])

  // Attach camera-change event listener
  useEffect(() => {
    const mv = mvRef.current
    if (!mv) return

    mv.addEventListener('camera-change', handleCameraChange)
    return () => {
      mv.removeEventListener('camera-change', handleCameraChange)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [handleCameraChange])

  // ── Capture final position when exiting interaction mode ──
  useEffect(() => {
    if (wasInteractingRef.current && !isInteracting) {
      // Just stopped interacting — send final camera position immediately
      const mv = mvRef.current
      if (mv) {
        const finalOrbit = mv.cameraOrbit
        if (finalOrbit) {
          lastSentOrbitRef.current = finalOrbit
          onCameraChange(objId, finalOrbit)
        }
      }
    }
    wasInteractingRef.current = isInteracting
  }, [isInteracting, objId, onCameraChange])

  // ── Receive camera state from remote users ──
  // Only apply when NOT interacting locally, and skip if this is our own
  // update echoing back from the DB
  useEffect(() => {
    const mv = mvRef.current
    if (!mv || isInteracting) return

    // Don't snap back to our own last-sent value (avoids the echo snap-back)
    // But DO apply genuinely new values from remote users
    const currentMvOrbit = mv.cameraOrbit
    if (cameraOrbit === currentMvOrbit) return // Already showing this

    // Apply the remote camera position instantly
    mv.cameraOrbit = cameraOrbit
    if (typeof mv.jumpCameraToGoal === 'function') {
      mv.jumpCameraToGoal()
    }
  }, [cameraOrbit, isInteracting])

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        pointerEvents: isInteracting ? 'auto' : 'none',
        zIndex: isInteracting ? 50 : 1,
        borderRadius: 4,
        overflow: 'hidden',
        outline: isInteracting ? '2px solid #d4a017' : 'none',
      }}
    >
      {/* @ts-expect-error model-viewer is a web component loaded via CDN */}
      <model-viewer
        ref={mvRef}
        src={modelUrl}
        camera-orbit={cameraOrbit}
        camera-controls={isInteracting || undefined}
        shadow-intensity="1"
        interaction-prompt="none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
})
