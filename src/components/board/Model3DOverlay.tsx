'use client'

import { useEffect, useRef, useCallback, memo } from 'react'
import type { CanvasObject } from '@/lib/board-sync'

const MODEL_VIEWER_CDN =
  'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'

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
        // Convert canvas coords to screen coords
        const screenX = obj.x * stageScale + stagePos.x
        const screenY = obj.y * stageScale + stagePos.y
        const screenW = obj.width * stageScale
        const screenH = obj.height * stageScale

        const isInteracting = interactingId === obj.id

        return (
          <ModelViewerElement
            key={obj.id}
            obj={obj}
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

/** Individual model-viewer element — memoized to prevent unnecessary re-renders */
const ModelViewerElement = memo(function ModelViewerElement({
  obj,
  screenX,
  screenY,
  screenW,
  screenH,
  isInteracting,
  onCameraChange,
}: {
  obj: CanvasObject
  screenX: number
  screenY: number
  screenW: number
  screenH: number
  isInteracting: boolean
  onCameraChange: (id: string, cameraOrbit: string) => void
}) {
  const mvRef = useRef<HTMLElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCameraChange = useCallback(() => {
    if (!isInteracting) return
    const mv = mvRef.current
    if (!mv) return

    // Debounce camera changes to avoid broadcast flooding
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const orbit = mv.getAttribute('camera-orbit')
      if (orbit) {
        onCameraChange(obj.id, orbit)
      }
    }, 200)
  }, [isInteracting, obj.id, onCameraChange])

  useEffect(() => {
    const mv = mvRef.current
    if (!mv) return

    mv.addEventListener('camera-change', handleCameraChange)
    return () => {
      mv.removeEventListener('camera-change', handleCameraChange)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [handleCameraChange])

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
        src={obj.modelUrl}
        camera-orbit={obj.cameraOrbit || '0deg 75deg 2.5m'}
        camera-controls={isInteracting || undefined}
        auto-rotate={!isInteracting || undefined}
        shadow-intensity="1"
        interaction-prompt="none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
})
