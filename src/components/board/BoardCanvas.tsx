'use client'

import { useState, useRef, useCallback } from 'react'
import { Stage, Layer, Rect, Text, Group, Transformer } from 'react-konva'
import type Konva from 'konva'
import { usePresence } from '@/hooks/usePresence'
import { CursorOverlay } from './CursorOverlay'
import { PresenceIndicator } from './PresenceIndicator'

type Tool = 'select' | 'sticky_note' | 'rectangle'

interface CanvasObject {
  id: string
  type: 'sticky_note' | 'rectangle'
  x: number
  y: number
  width: number
  height: number
  fill: string
  text?: string
}

const STICKY_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fde68a', '#c4b5fd']

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

interface BoardCanvasProps {
  boardId?: string
  userId?: string
  userName?: string
}

export function BoardCanvas({ boardId, userId, userName }: BoardCanvasProps) {
  const [objects, setObjects] = useState<CanvasObject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  const presenceEnabled = !!(boardId && userId && userName)
  const { others, updateCursor } = usePresence({
    boardId: boardId || '',
    userId: userId || '',
    userName: userName || '',
  })

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
      if (e.target === e.target.getStage()) {
        if (tool === 'select') {
          setSelectedId(null)
          return
        }

        const stage = stageRef.current
        if (!stage) return
        const pointer = stage.getPointerPosition()
        if (!pointer) return

        const x = (pointer.x - stagePos.x) / stageScale
        const y = (pointer.y - stagePos.y) / stageScale

        if (tool === 'sticky_note') {
          const newObj: CanvasObject = {
            id: generateId(),
            type: 'sticky_note',
            x: x - 75,
            y: y - 75,
            width: 150,
            height: 150,
            fill: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
            text: 'Double-click to edit',
          }
          setObjects((prev) => [...prev, newObj])
        } else if (tool === 'rectangle') {
          const newObj: CanvasObject = {
            id: generateId(),
            type: 'rectangle',
            x: x - 60,
            y: y - 40,
            width: 120,
            height: 80,
            fill: '#e2e8f0',
          }
          setObjects((prev) => [...prev, newObj])
        }

        setTool('select')
      }
    },
    [tool, stagePos, stageScale],
  )

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setTool('select')
  }, [])

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, x, y } : obj)))
  }, [])

  const handleTransformEnd = useCallback((id: string, node: Konva.Node) => {
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === id
          ? {
              ...obj,
              x: node.x(),
              y: node.y(),
              width: Math.max(20, node.width() * scaleX),
              height: Math.max(20, node.height() * scaleY),
            }
          : obj,
      ),
    )
  }, [])

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
      textarea.style.fontFamily = 'sans-serif'
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
        setObjects((prev) =>
          prev.map((o) => (o.id === id ? { ...o, text: textarea.value } : o)),
        )
        textarea.remove()
        setEditingId(null)
      }

      textarea.addEventListener('blur', handleBlur)
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          textarea.blur()
        }
      })
    },
    [objects, stageScale],
  )

  // Sync transformer to selected node
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

  const handleDelete = useCallback(() => {
    if (!selectedId) return
    setObjects((prev) => prev.filter((o) => o.id !== selectedId))
    setSelectedId(null)
  }, [selectedId])

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!presenceEnabled) return
      const stage = e.target.getStage()
      if (!stage) return
      const pointer = stage.getPointerPosition()
      if (!pointer) return

      updateCursor({ x: pointer.x, y: pointer.y })
    },
    [presenceEnabled, updateCursor],
  )

  const handleMouseLeave = useCallback(() => {
    if (!presenceEnabled) return
    updateCursor(null)
  }, [presenceEnabled, updateCursor])

  return (
    <div className="flex h-screen w-screen flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
        <span className="mr-2 text-sm font-semibold text-gray-500">Orim</span>
        <div className="h-4 w-px bg-gray-300" />
        <button
          onClick={() => setTool('select')}
          className={`rounded px-3 py-1.5 text-sm ${
            tool === 'select' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Select
        </button>
        <button
          onClick={() => setTool('sticky_note')}
          className={`rounded px-3 py-1.5 text-sm ${
            tool === 'sticky_note'
              ? 'bg-yellow-100 text-yellow-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Sticky Note
        </button>
        <button
          onClick={() => setTool('rectangle')}
          className={`rounded px-3 py-1.5 text-sm ${
            tool === 'rectangle'
              ? 'bg-slate-200 text-slate-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Rectangle
        </button>
        {selectedId && (
          <>
            <div className="h-4 w-px bg-gray-300" />
            <button
              onClick={handleDelete}
              className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </>
        )}
        <div className="flex-1" />
        {presenceEnabled && (
          <PresenceIndicator users={others} currentUserName={userName} />
        )}
        {presenceEnabled && others.length > 0 && <div className="h-4 w-px bg-gray-300" />}
        <span className="text-xs text-gray-400">
          {tool === 'select'
            ? 'Click objects to select, scroll to zoom, drag canvas to pan'
            : `Click on canvas to place ${tool === 'sticky_note' ? 'sticky note' : 'rectangle'}`}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden bg-gray-50">
        <Stage
          ref={stageRef}
          width={typeof window !== 'undefined' ? window.innerWidth : 1200}
          height={typeof window !== 'undefined' ? window.innerHeight - 48 : 800}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={tool === 'select'}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseMove={handleMouseMove}
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
              const endX =
                startX + (typeof window !== 'undefined' ? window.innerWidth : 1200) / stageScale + gridSize * 2
              const endY =
                startY +
                (typeof window !== 'undefined' ? window.innerHeight - 48 : 800) / stageScale +
                gridSize * 2
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
            {objects.map((obj) => {
              if (obj.type === 'sticky_note') {
                return (
                  <Group
                    key={obj.id}
                    id={obj.id}
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    draggable
                    onClick={() => handleSelect(obj.id)}
                    onTap={() => handleSelect(obj.id)}
                    onDblClick={() => handleDoubleClick(obj.id)}
                    onDblTap={() => handleDoubleClick(obj.id)}
                    onDragEnd={(e) => handleDragEnd(obj.id, e.target.x(), e.target.y())}
                    onTransformEnd={(e) => handleTransformEnd(obj.id, e.target)}
                  >
                    <Rect
                      width={obj.width}
                      height={obj.height}
                      fill={obj.fill}
                      shadowColor="rgba(0,0,0,0.1)"
                      shadowBlur={8}
                      shadowOffsetY={2}
                      cornerRadius={4}
                    />
                    {editingId !== obj.id && (
                      <Text
                        id={`text-${obj.id}`}
                        x={10}
                        y={10}
                        width={obj.width - 20}
                        height={obj.height - 20}
                        text={obj.text || ''}
                        fontSize={14}
                        fontFamily="sans-serif"
                        fill="#1f2937"
                        lineHeight={1.4}
                      />
                    )}
                  </Group>
                )
              }

              return (
                <Rect
                  key={obj.id}
                  id={obj.id}
                  x={obj.x}
                  y={obj.y}
                  width={obj.width}
                  height={obj.height}
                  fill={obj.fill}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  cornerRadius={4}
                  draggable
                  onClick={() => handleSelect(obj.id)}
                  onTap={() => handleSelect(obj.id)}
                  onDragEnd={(e) => handleDragEnd(obj.id, e.target.x(), e.target.y())}
                  onTransformEnd={(e) => handleTransformEnd(obj.id, e.target)}
                />
              )
            })}

            {/* Transformer */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(_oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) {
                  return _oldBox
                }
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
