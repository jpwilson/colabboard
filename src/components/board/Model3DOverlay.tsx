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
  /** ID of the model this local user is controlling (null = none) */
  interactingId: string | null
  /** Current user's ID — used for ownership */
  currentUserId?: string
  onCameraChange: (id: string, cameraOrbit: string) => void
  /** Atomic exit: sends final cameraOrbit + clears controlledBy in one write */
  onExitInteraction: (id: string, finalCameraOrbit: string) => void
}

export const Model3DOverlay = memo(function Model3DOverlay({
  objects,
  stagePos,
  stageScale,
  interactingId,
  currentUserId,
  onCameraChange,
  onExitInteraction,
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
        const isController = interactingId === obj.id
        const isLockedByOther =
          !!obj.controlledBy &&
          !!currentUserId &&
          obj.controlledBy !== currentUserId

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
            isController={isController}
            isLockedByOther={isLockedByOther}
            onCameraChange={onCameraChange}
            onExitInteraction={onExitInteraction}
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
  isController,
  isLockedByOther,
  onCameraChange,
  onExitInteraction,
}: {
  objId: string
  modelUrl: string
  cameraOrbit: string
  screenX: number
  screenY: number
  screenW: number
  screenH: number
  isController: boolean
  isLockedByOther: boolean
  onCameraChange: (id: string, cameraOrbit: string) => void
  onExitInteraction: (id: string, finalCameraOrbit: string) => void
}) {
  const mvRef = useRef<ModelViewerElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track isController via ref so the follower effect doesn't re-trigger on transition
  const isControllerRef = useRef(isController)
  useEffect(() => { isControllerRef.current = isController }, [isController])

  // ── CONTROLLER: Send camera state while controlling ──
  const handleCameraChange = useCallback(() => {
    if (!isController) return
    const mv = mvRef.current
    if (!mv) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const orbit = mv.cameraOrbit
      if (orbit) {
        console.log(`[3D-SYNC] CONTROLLER sending orbit: "${orbit}" for ${objId.slice(0,8)}`)
        onCameraChange(objId, orbit)
      }
    }, 80)
  }, [isController, objId, onCameraChange])

  // Attach camera-change event listener
  useEffect(() => {
    const mv = mvRef.current
    console.log(`[3D-SYNC] Attaching camera-change listener, mv=${!!mv}, isController=${isController}`)
    if (!mv) return

    mv.addEventListener('camera-change', handleCameraChange)
    return () => {
      mv.removeEventListener('camera-change', handleCameraChange)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [handleCameraChange])

  // ── EXIT HANDLER: Read final camera from model-viewer and pass to parent ──
  const handleExitClick = useCallback(() => {
    const mv = mvRef.current
    const finalOrbit = mv?.cameraOrbit || cameraOrbit
    console.log(`[3D-SYNC] EXIT clicked, finalOrbit="${finalOrbit}", mv.cameraOrbit="${mv?.cameraOrbit}", prop="${cameraOrbit}"`)
    // Flush any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    // Atomic exit: parent will write cameraOrbit + controlledBy in one update
    onExitInteraction(objId, finalOrbit)
  }, [objId, cameraOrbit, onExitInteraction])

  // ── FOLLOWER: Apply incoming camera updates ──
  // Only depends on cameraOrbit — NOT isController. This prevents the snap-back
  // on exit where the stale prop value would override the model-viewer's actual state.
  useEffect(() => {
    if (isControllerRef.current) {
      console.log(`[3D-SYNC] FOLLOWER effect skipped (isController), orbit prop="${cameraOrbit}"`)
      return
    }
    const mv = mvRef.current
    if (!mv) {
      console.log(`[3D-SYNC] FOLLOWER effect skipped (no mv ref)`)
      return
    }

    console.log(`[3D-SYNC] FOLLOWER applying orbit="${cameraOrbit}", current mv="${mv.cameraOrbit}"`)
    mv.cameraOrbit = cameraOrbit
    if (typeof mv.jumpCameraToGoal === 'function') {
      mv.jumpCameraToGoal()
    }
  }, [cameraOrbit])

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        pointerEvents: isController ? 'auto' : 'none',
        zIndex: isController ? 50 : 1,
        borderRadius: 4,
        overflow: 'hidden',
        outline: isController
          ? '2px solid #d4a017'
          : isLockedByOther
            ? '2px solid #ef4444'
            : 'none',
      }}
    >
      {/* @ts-expect-error model-viewer is a web component loaded via CDN */}
      <model-viewer
        ref={mvRef}
        src={modelUrl}
        camera-orbit={cameraOrbit}
        camera-controls={isController || undefined}
        shadow-intensity="1"
        interaction-prompt="none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Explicit exit button for the controller */}
      {isController && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleExitClick()
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: '#d4a017',
            color: '#000',
            border: 'none',
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            zIndex: 60,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          Exit 3D
        </button>
      )}

      {/* Lock indicator for other users */}
      {isLockedByOther && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            zIndex: 60,
            pointerEvents: 'none',
          }}
        >
          In use
        </div>
      )}
    </div>
  )
})
