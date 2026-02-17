'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Stage, Layer, Rect, Line, Transformer } from 'react-konva'
import type Konva from 'konva'
import { usePresence } from '@/hooks/usePresence'
import { useBoard } from '@/hooks/useBoard'
import { CursorOverlay } from './CursorOverlay'
import { PresenceIndicator } from './PresenceIndicator'
import { ShapeRenderer } from './ShapeRenderer'
import { Toolbar, type Tool, type ShapeTool } from './Toolbar'
import { PropertiesPanel } from './PropertiesPanel'
import { SHAPE_DEFAULTS, STICKY_COLORS } from '@/lib/shape-defaults'
import type { CanvasObject, ShapeType } from '@/lib/board-sync'

function generateId() {
  return crypto.randomUUID()
}

interface BoardCanvasProps {
  boardId?: string
  userId?: string
  userName?: string
}

export function BoardCanvas({ boardId, userId, userName }: BoardCanvasProps) {
  const [localObjects, setLocalObjects] = useState<CanvasObject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [shapeTool, setShapeTool] = useState<ShapeTool>('rectangle')
  const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0])
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Freedraw state
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentDrawPoints, setCurrentDrawPoints] = useState<number[]>([])
  const drawingPointsRef = useRef<number[]>([])

  const [stageSize, setStageSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight - 48 : 800,
  })

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    function handleResize() {
      setStageSize({ width: window.innerWidth, height: window.innerHeight - 48 })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const syncEnabled = !!(boardId && userId)
  const presenceEnabled = !!(boardId && userId && userName)

  const {
    objects: syncObjects,
    addObject,
    updateObject,
    deleteObject,
  } = useBoard({
    boardId: boardId || '',
    userId: userId || '',
  })

  const { others, updateCursor } = usePresence({
    boardId: boardId || '',
    userId: userId || '',
    userName: userName || '',
  })

  const objects = syncEnabled ? syncObjects : localObjects
  const nextZIndex = objects.length > 0 ? Math.max(...objects.map((o) => o.z_index)) + 1 : 0
  const selectedObject = objects.find((o) => o.id === selectedId) || null

  // Helper to add an object (synced or local)
  const addObjectHelper = useCallback(
    (obj: CanvasObject) => {
      if (syncEnabled) {
        addObject(obj)
      } else {
        setLocalObjects((prev) => [...prev, obj])
      }
    },
    [syncEnabled, addObject],
  )

  // Helper to update an object (synced or local)
  const updateObjectHelper = useCallback(
    (id: string, updates: Partial<CanvasObject>) => {
      if (syncEnabled) {
        updateObject(id, updates)
      } else {
        setLocalObjects((prev) =>
          prev.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj)),
        )
      }
    },
    [syncEnabled, updateObject],
  )

  const getCanvasPos = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current
      if (!stage) return null
      const pointer = stage.getPointerPosition()
      if (!pointer) return null
      return {
        x: (pointer.x - stagePos.x) / stageScale,
        y: (pointer.y - stagePos.y) / stageScale,
      }
    },
    [stagePos, stageScale],
  )

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const scaleBy = 1.05
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const clampedScale = Math.max(0.1, Math.min(5, newScale))

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }

    setStageScale(clampedScale)
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    })
  }, [])

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target !== e.target.getStage()) return
      if (tool === 'select') {
        setSelectedId(null)
        return
      }
      if (tool === 'freedraw') return // handled by mousedown/up

      const pos = getCanvasPos(e)
      if (!pos) return
      const now = new Date().toISOString()

      let shapeType: ShapeType
      if (tool === 'sticky_note') {
        shapeType = 'sticky_note'
      } else {
        shapeType = shapeTool
      }

      const defaults = SHAPE_DEFAULTS[shapeType]
      const newObj: CanvasObject = {
        id: generateId(),
        type: shapeType,
        x: pos.x - defaults.width / 2,
        y: pos.y - defaults.height / 2,
        width: defaults.width,
        height: defaults.height,
        fill: shapeType === 'sticky_note' ? stickyColor : defaults.fill,
        stroke: defaults.stroke,
        strokeWidth: defaults.strokeWidth,
        text: shapeType === 'sticky_note' ? 'Double-click to edit' : undefined,
        z_index: nextZIndex,
        updated_at: now,
      }

      addObjectHelper(newObj)
      setTool('select')
    },
    [tool, shapeTool, stickyColor, getCanvasPos, nextZIndex, addObjectHelper],
  )

  // Freedraw handlers
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (tool !== 'freedraw') return
      if (e.target !== e.target.getStage()) return

      const pos = getCanvasPos(e)
      if (!pos) return

      setIsDrawing(true)
      drawingPointsRef.current = [pos.x, pos.y]
      setCurrentDrawPoints([pos.x, pos.y])
    },
    [tool, getCanvasPos],
  )

  const handleMouseMoveCanvas = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Cursor presence
      if (presenceEnabled) {
        const stage = e.target.getStage()
        if (stage) {
          const pointer = stage.getPointerPosition()
          if (pointer) updateCursor({ x: pointer.x, y: pointer.y })
        }
      }

      // Freedraw
      if (!isDrawing || tool !== 'freedraw') return
      const pos = getCanvasPos(e)
      if (!pos) return

      drawingPointsRef.current = [...drawingPointsRef.current, pos.x, pos.y]
      setCurrentDrawPoints([...drawingPointsRef.current])
    },
    [isDrawing, tool, getCanvasPos, presenceEnabled, updateCursor],
  )

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || tool !== 'freedraw') return
    setIsDrawing(false)

    const points = drawingPointsRef.current
    if (points.length < 4) {
      drawingPointsRef.current = []
      setCurrentDrawPoints([])
      return
    }

    // Compute bounding box
    const xs = points.filter((_, i) => i % 2 === 0)
    const ys = points.filter((_, i) => i % 2 === 1)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)

    // Normalize points relative to top-left
    const normalizedPoints = points.map((v, i) => (i % 2 === 0 ? v - minX : v - minY))

    const newObj: CanvasObject = {
      id: generateId(),
      type: 'freedraw',
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
      fill: 'transparent',
      stroke: '#1f2937',
      strokeWidth: 3,
      points: normalizedPoints,
      z_index: nextZIndex,
      updated_at: new Date().toISOString(),
    }

    addObjectHelper(newObj)
    drawingPointsRef.current = []
    setCurrentDrawPoints([])
  }, [isDrawing, tool, nextZIndex, addObjectHelper])

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setTool('select')
  }, [])

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateObjectHelper(id, { x, y })
    },
    [updateObjectHelper],
  )

  const handleTransformEnd = useCallback(
    (id: string, node: Konva.Node) => {
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)

      updateObjectHelper(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(20, node.width() * scaleX),
        height: Math.max(20, node.height() * scaleY),
      })
    },
    [updateObjectHelper],
  )

  const handleDoubleClick = useCallback(
    (id: string) => {
      const obj = objects.find((o) => o.id === id)
      if (!obj || obj.type !== 'sticky_note') return
      setEditingId(id)

      const stage = stageRef.current
      if (!stage) return

      const textNode = stage.findOne(`#text-${id}`)
      if (!textNode) return

      const textPosition = textNode.getAbsolutePosition()
      const stageContainer = stage.container()
      const areaPosition = {
        x: stageContainer.offsetLeft + textPosition.x,
        y: stageContainer.offsetTop + textPosition.y,
      }

      const textarea = document.createElement('textarea')
      stageContainer.parentNode?.appendChild(textarea)

      textarea.value = obj.text || ''
      textarea.style.position = 'absolute'
      textarea.style.top = `${areaPosition.y}px`
      textarea.style.left = `${areaPosition.x}px`
      textarea.style.width = `${(obj.width - 20) * stageScale}px`
      textarea.style.height = `${(obj.height - 20) * stageScale}px`
      textarea.style.fontSize = `${14 * stageScale}px`
      textarea.style.fontFamily = obj.fontFamily || 'sans-serif'
      textarea.style.border = 'none'
      textarea.style.padding = '0'
      textarea.style.margin = '0'
      textarea.style.overflow = 'hidden'
      textarea.style.background = 'transparent'
      textarea.style.outline = 'none'
      textarea.style.resize = 'none'
      textarea.style.lineHeight = '1.4'
      textarea.style.zIndex = '1000'
      textarea.focus()

      const handleBlur = () => {
        updateObjectHelper(id, { text: textarea.value })
        textarea.remove()
        setEditingId(null)
      }

      textarea.addEventListener('blur', handleBlur)
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') textarea.blur()
      })
    },
    [objects, stageScale, updateObjectHelper],
  )

  const handleLayerDraw = useCallback(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const stage = stageRef.current
    if (!stage) return

    if (selectedId) {
      const node = stage.findOne(`#${selectedId}`)
      if (node) {
        transformer.nodes([node])
        transformer.getLayer()?.batchDraw()
        return
      }
    }
    transformer.nodes([])
    transformer.getLayer()?.batchDraw()
  }, [selectedId])

  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return
    if (syncEnabled) {
      deleteObject(selectedId)
    } else {
      setLocalObjects((prev) => prev.filter((o) => o.id !== selectedId))
    }
    setSelectedId(null)
  }, [selectedId, syncEnabled, deleteObject])

  const handleMouseLeave = useCallback(() => {
    if (presenceEnabled) updateCursor(null)
  }, [presenceEnabled, updateCursor])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (editingId) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingId, handleDeleteSelected])

  return (
    <div className="flex h-screen w-screen flex-col">
      <Toolbar
        tool={tool}
        shapeTool={shapeTool}
        stickyColor={stickyColor}
        selectedId={selectedId}
        onToolChange={setTool}
        onShapeToolChange={setShapeTool}
        onStickyColorChange={setStickyColor}
        onDelete={handleDeleteSelected}
        presenceSlot={
          presenceEnabled ? (
            <PresenceIndicator users={others} currentUserName={userName} />
          ) : undefined
        }
      />

      <div className="relative flex-1 overflow-hidden bg-gray-50">
        {/* Properties panel */}
        <PropertiesPanel selectedObject={selectedObject} onUpdate={updateObjectHelper} />

        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={tool === 'select'}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDragEnd={(e) => {
            if (e.target === e.target.getStage()) {
              setStagePos({ x: e.target.x(), y: e.target.y() })
            }
          }}
        >
          <Layer onDraw={handleLayerDraw}>
            {/* Grid dots */}
            {(() => {
              const dots = []
              const gridSize = 40
              const startX = Math.floor(-stagePos.x / stageScale / gridSize) * gridSize - gridSize
              const startY = Math.floor(-stagePos.y / stageScale / gridSize) * gridSize - gridSize
              const endX = startX + stageSize.width / stageScale + gridSize * 2
              const endY = startY + stageSize.height / stageScale + gridSize * 2
              for (let x = startX; x < endX; x += gridSize) {
                for (let y = startY; y < endY; y += gridSize) {
                  dots.push(
                    <Rect
                      key={`dot-${x}-${y}`}
                      x={x - 1}
                      y={y - 1}
                      width={2}
                      height={2}
                      fill="#d1d5db"
                      listening={false}
                    />,
                  )
                }
              }
              return dots
            })()}

            {/* Objects */}
            {objects.map((obj) => (
              <ShapeRenderer
                key={obj.id}
                obj={obj}
                isEditing={editingId === obj.id}
                onSelect={handleSelect}
                onDoubleClick={handleDoubleClick}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
              />
            ))}

            {/* In-progress freedraw preview */}
            {isDrawing && currentDrawPoints.length >= 4 && (
              <Line
                points={currentDrawPoints}
                stroke="#1f2937"
                strokeWidth={3}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            )}

            {/* Transformer */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(_oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) return _oldBox
                return newBox
              }}
            />

            {/* Remote cursors */}
            {presenceEnabled && (
              <CursorOverlay users={others} stagePos={stagePos} stageScale={stageScale} />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
