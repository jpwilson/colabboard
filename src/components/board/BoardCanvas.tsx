'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Stage, Layer, Rect as KonvaRect, Circle, Line, Arrow, Transformer } from 'react-konva'
import type Konva from 'konva'
import { usePresence } from '@/hooks/usePresence'
import { useBoard } from '@/hooks/useBoard'
import { CursorOverlay } from './CursorOverlay'
import { PresenceIndicator } from './PresenceIndicator'
import { ShapeRenderer } from './ShapeRenderer'
import { Toolbar, type Tool, type ShapeTool } from './Toolbar'
import { PropertiesPanel } from './PropertiesPanel'
import { AiAgentPanel } from '@/components/ui/AiAgentButton'
import { SHAPE_DEFAULTS, STICKY_COLORS } from '@/lib/shape-defaults'
import type { CanvasObject, ShapeType } from '@/lib/board-sync'

function generateId() {
  return crypto.randomUUID()
}

/** Compute where a line from (cx,cy) toward (tx,ty) exits a rectangle centered at (cx,cy) with size w×h */
function edgePoint(cx: number, cy: number, w: number, h: number, tx: number, ty: number) {
  const dx = tx - cx
  const dy = ty - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const hw = w / 2
  const hh = h / 2
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity
  const scale = Math.min(scaleX, scaleY)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

interface BoardCanvasProps {
  boardId?: string
  boardSlug?: string
  boardName?: string
  isOwner?: boolean
  userId?: string
  userName?: string
}

export function BoardCanvas({ boardId, boardSlug, boardName, isOwner, userId, userName }: BoardCanvasProps) {
  const [localObjects, setLocalObjects] = useState<CanvasObject[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [tool, setTool] = useState<Tool>('select')
  const [shapeTool, setShapeTool] = useState<ShapeTool>('rectangle')
  const [stickyColor, setStickyColor] = useState(STICKY_COLORS[0])
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [stageScale, setStageScale] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  type GridMode = 'none' | 'dots' | 'lines'
  const [gridMode, setGridMode] = useState<GridMode>('dots')
  const [displayName, setDisplayName] = useState(boardName || '')

  // Freedraw state
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentDrawPoints, setCurrentDrawPoints] = useState<number[]>([])
  const drawingPointsRef = useRef<number[]>([])

  // Connector state
  const [connectorSource, setConnectorSource] = useState<string | null>(null)
  const [connectorPreview, setConnectorPreview] = useState<number[] | null>(null)
  const [draggingEndpoint, setDraggingEndpoint] = useState<{ connectorId: string; end: 'from' | 'to'; x: number; y: number } | null>(null)

  const [stageSize, setStageSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight - 48 : 800,
  })

  // Marquee (drag-to-select) state
  const [selectionRect, setSelectionRect] = useState<{ startX: number; startY: number; x: number; y: number; width: number; height: number } | null>(null)
  const marqueeRef = useRef(false)

  // Group drag refs
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map())

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const hasInitialFit = useRef(false)
  const clipboardRef = useRef<CanvasObject[]>([])
  const objectsRef2 = useRef<CanvasObject[]>([])
  const nextZIndexRef = useRef(0)
  const selectedIdsRef = useRef<string[]>([])

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
    loading: syncLoading,
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
  const selectedObject = selectedIds.length === 1 ? (objects.find((o) => o.id === selectedIds[0]) || null) : null
  objectsRef2.current = objects
  nextZIndexRef.current = nextZIndex
  selectedIdsRef.current = selectedIds

  // Convert selected object's screen bounding box for PropertiesPanel positioning
  const selectedObjectScreenPos = useMemo(() => {
    if (!selectedObject) return null
    const leftX = selectedObject.x * stageScale + stagePos.x
    const rightX = (selectedObject.x + (selectedObject.width || 0)) * stageScale + stagePos.x
    const centerY = (selectedObject.y + (selectedObject.height || 0) / 2) * stageScale + stagePos.y + 48
    return { leftX, rightX, y: centerY }
  }, [selectedObject, stageScale, stagePos])

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

    // Adaptive zoom: smooth in normal range, accelerates at extreme levels
    const dist = Math.max(0, Math.abs(Math.log2(oldScale)) - 1)
    const scaleBy = 1.08 + dist * 0.06
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const clampedScale = Math.max(0.02, Math.min(10, newScale))

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
        // Only deselect if not shift-clicking (shift preserves selection)
        const isShift = 'shiftKey' in e.evt && e.evt.shiftKey
        if (!isShift) {
          setSelectedIds([])
        }
        return
      }
      if (tool === 'connector') {
        setConnectorSource(null)
        setConnectorPreview(null)
        return
      }
      if (tool === 'freedraw') return

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

  // Freedraw + marquee handlers
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Marquee selection: shift+drag on empty canvas in select mode
      if (tool === 'select' && e.target === e.target.getStage() && e.evt.shiftKey) {
        const pos = getCanvasPos(e)
        if (!pos) return
        marqueeRef.current = true
        setSelectionRect({ startX: pos.x, startY: pos.y, x: pos.x, y: pos.y, width: 0, height: 0 })
        // Stop stage drag so marquee works
        e.target.getStage()?.stopDrag()
        return
      }

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
      // Cursor presence — send in world coordinates (same space as objects)
      if (presenceEnabled) {
        const pos = getCanvasPos(e)
        if (pos) updateCursor(pos)
      }

      // Marquee selection update
      if (marqueeRef.current) {
        const pos = getCanvasPos(e)
        if (pos && selectionRect) {
          const x = Math.min(selectionRect.startX, pos.x)
          const y = Math.min(selectionRect.startY, pos.y)
          const width = Math.abs(pos.x - selectionRect.startX)
          const height = Math.abs(pos.y - selectionRect.startY)
          setSelectionRect({ ...selectionRect, x, y, width, height })
        }
        return
      }

      // Connector preview
      if (tool === 'connector' && connectorSource) {
        const pos = getCanvasPos(e)
        if (pos) {
          const sourceObj = objectsRef2.current.find((o) => o.id === connectorSource)
          if (sourceObj) {
            setConnectorPreview([
              sourceObj.x + sourceObj.width / 2,
              sourceObj.y + sourceObj.height / 2,
              pos.x,
              pos.y,
            ])
          }
        }
      }

      // Freedraw
      if (!isDrawing || tool !== 'freedraw') return
      const pos = getCanvasPos(e)
      if (!pos) return

      drawingPointsRef.current = [...drawingPointsRef.current, pos.x, pos.y]
      setCurrentDrawPoints([...drawingPointsRef.current])
    },
    [isDrawing, tool, getCanvasPos, presenceEnabled, updateCursor, connectorSource, selectionRect],
  )

  const handleMouseUp = useCallback(() => {
    // Complete marquee selection
    if (marqueeRef.current && selectionRect) {
      marqueeRef.current = false
      const rect = selectionRect
      setSelectionRect(null)
      if (rect.width > 2 || rect.height > 2) {
        const hits = objectsRef2.current.filter((obj) => {
          if (obj.type === 'connector') return false
          const objRight = obj.x + obj.width
          const objBottom = obj.y + obj.height
          const rectRight = rect.x + rect.width
          const rectBottom = rect.y + rect.height
          return obj.x < rectRight && objRight > rect.x && obj.y < rectBottom && objBottom > rect.y
        })
        if (hits.length > 0) {
          setSelectedIds(hits.map((o) => o.id))
        }
      }
      return
    }

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
  }, [isDrawing, tool, nextZIndex, addObjectHelper, selectionRect])

  const handleSelect = useCallback((id: string, e?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Connector creation flow
    if (tool === 'connector') {
      const clickedObj = objectsRef2.current.find((o) => o.id === id)
      if (!clickedObj || clickedObj.type === 'connector') return

      if (!connectorSource) {
        setConnectorSource(id)
      } else if (id !== connectorSource) {
        const sourceObj = objectsRef2.current.find((o) => o.id === connectorSource)
        if (!sourceObj) { setConnectorSource(null); return }
        const now = new Date().toISOString()
        const newConnector: CanvasObject = {
          id: generateId(),
          type: 'connector',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: '#1f2937',
          strokeWidth: 2,
          fromId: connectorSource,
          toId: id,
          connectorStyle: 'arrow-end',
          z_index: nextZIndexRef.current,
          updated_at: now,
        }
        addObjectHelper(newConnector)
        setConnectorSource(null)
        setConnectorPreview(null)
        setTool('select')
      }
      return
    }

    const isShift = e?.evt && 'shiftKey' in e.evt && e.evt.shiftKey
    if (isShift) {
      // Shift-click: toggle in/out of selection
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
      )
    } else {
      setSelectedIds([id])
    }
    setTool('select')
  }, [tool, connectorSource, addObjectHelper])

  const handleDragStart = useCallback((id: string) => {
    if (!selectedIdsRef.current.includes(id) || selectedIdsRef.current.length < 2) return
    const stage = stageRef.current
    if (!stage) return
    const positions = new Map<string, { x: number; y: number }>()
    for (const sid of selectedIdsRef.current) {
      const node = stage.findOne(`#${sid}`)
      if (node) positions.set(sid, { x: node.x(), y: node.y() })
    }
    dragStartPositions.current = positions
  }, [])

  const handleDragMove = useCallback((id: string, newX: number, newY: number) => {
    const startPos = dragStartPositions.current.get(id)
    if (!startPos || selectedIdsRef.current.length < 2) return
    const dx = newX - startPos.x
    const dy = newY - startPos.y
    const stage = stageRef.current
    if (!stage) return
    for (const sid of selectedIdsRef.current) {
      if (sid === id) continue
      const nodeStart = dragStartPositions.current.get(sid)
      if (!nodeStart) continue
      const node = stage.findOne(`#${sid}`)
      if (node) {
        node.x(nodeStart.x + dx)
        node.y(nodeStart.y + dy)
      }
    }
  }, [])

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      if (selectedIdsRef.current.includes(id) && selectedIdsRef.current.length > 1) {
        // Persist all selected objects' positions
        const stage = stageRef.current
        for (const sid of selectedIdsRef.current) {
          const node = stage?.findOne(`#${sid}`)
          if (node) {
            updateObjectHelper(sid, { x: node.x(), y: node.y() })
          }
        }
      } else {
        updateObjectHelper(id, { x, y })
      }
      dragStartPositions.current.clear()
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
        rotation: node.rotation(),
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

  // Attach/detach Transformer to selected nodes
  const syncTransformer = useCallback(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const stage = stageRef.current
    if (!stage) return

    if (selectedIds.length > 0) {
      const nodes: Konva.Node[] = []
      for (const id of selectedIds) {
        // Don't attach Transformer to connectors — they use endpoint handles
        const obj = objectsRef2.current.find((o) => o.id === id)
        if (obj?.type === 'connector') continue
        const node = stage.findOne(`#${id}`)
        if (node) nodes.push(node)
      }
      transformer.nodes(nodes)
      transformer.getLayer()?.batchDraw()
      return
    }
    transformer.nodes([])
    transformer.getLayer()?.batchDraw()
  }, [selectedIds])

  // Re-sync Transformer on every selectedId change via effect
  // (requestAnimationFrame ensures Konva nodes are rendered before lookup)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      syncTransformer()
    })
    return () => cancelAnimationFrame(frame)
  }, [syncTransformer])

  const handleLayerDraw = syncTransformer

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    // Also delete any connectors attached to selected objects
    const selectedSet = new Set(selectedIds)
    const connectedConnectors = objectsRef2.current.filter(
      (o) => o.type === 'connector' && (selectedSet.has(o.fromId || '') || selectedSet.has(o.toId || '')),
    )
    const allToDelete = new Set([...selectedIds, ...connectedConnectors.map((c) => c.id)])
    if (syncEnabled) {
      allToDelete.forEach((id) => deleteObject(id))
    } else {
      setLocalObjects((prev) => prev.filter((o) => !allToDelete.has(o.id)))
    }
    setSelectedIds([])
  }, [selectedIds, syncEnabled, deleteObject])

  const handleMouseLeave = useCallback(() => {
    if (presenceEnabled) updateCursor(null)
  }, [presenceEnabled, updateCursor])

  const handleZoomIn = useCallback(() => {
    setStageScale((prev) => {
      const dist = Math.max(0, Math.abs(Math.log2(prev)) - 1)
      return Math.min(10, prev * (1.2 + dist * 0.08))
    })
  }, [])

  const handleZoomOut = useCallback(() => {
    setStageScale((prev) => {
      const dist = Math.max(0, Math.abs(Math.log2(prev)) - 1)
      return Math.max(0.02, prev / (1.2 + dist * 0.08))
    })
  }, [])

  const handleZoomFit = useCallback(() => {
    if (objects.length === 0) {
      setStageScale(1)
      setStagePos({ x: 0, y: 0 })
      return
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const obj of objects) {
      minX = Math.min(minX, obj.x)
      minY = Math.min(minY, obj.y)
      maxX = Math.max(maxX, obj.x + obj.width)
      maxY = Math.max(maxY, obj.y + obj.height)
    }

    const padding = 50
    const contentWidth = maxX - minX + padding * 2
    const contentHeight = maxY - minY + padding * 2

    const scaleX = stageSize.width / contentWidth
    const scaleY = stageSize.height / contentHeight
    const newScale = Math.max(0.02, Math.min(10, Math.min(scaleX, scaleY)))

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setStageScale(newScale)
    setStagePos({
      x: stageSize.width / 2 - centerX * newScale,
      y: stageSize.height / 2 - centerY * newScale,
    })
  }, [objects, stageSize])

  // Auto-fit to content on initial load (industry standard: Miro, FigJam, Excalidraw)
  // Uses effect to sync with Konva (external system), defers React state update
  useEffect(() => {
    if (hasInitialFit.current) return
    if (syncEnabled && syncLoading) return
    if (objects.length === 0) return

    hasInitialFit.current = true

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const obj of objects) {
      minX = Math.min(minX, obj.x)
      minY = Math.min(minY, obj.y)
      maxX = Math.max(maxX, obj.x + obj.width)
      maxY = Math.max(maxY, obj.y + obj.height)
    }

    const padding = 50
    const contentWidth = maxX - minX + padding * 2
    const contentHeight = maxY - minY + padding * 2
    const scaleX = stageSize.width / contentWidth
    const scaleY = stageSize.height / contentHeight
    const fitScale = Math.max(0.02, Math.min(10, Math.min(scaleX, scaleY)))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const fitPos = {
      x: stageSize.width / 2 - centerX * fitScale,
      y: stageSize.height / 2 - centerY * fitScale,
    }

    // Apply to Konva stage immediately (external system — valid in effects)
    const stage = stageRef.current
    if (stage) {
      stage.scale({ x: fitScale, y: fitScale })
      stage.position(fitPos)
      stage.batchDraw()
    }

    // Sync React state on next frame (avoids synchronous setState in effect)
    requestAnimationFrame(() => {
      setStageScale(fitScale)
      setStagePos(fitPos)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncLoading, objects.length])

  const handleRename = useCallback(
    async (newName: string) => {
      if (!boardId || !newName.trim()) return
      setDisplayName(newName.trim())
      try {
        await fetch(`/api/boards/${boardId}/rename`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim() }),
        })
      } catch (err) {
        console.error('Failed to rename board:', err)
        setDisplayName(boardName || '')
      }
    },
    [boardId, boardName],
  )

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (editingId) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected()
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        handleZoomIn()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        handleZoomOut()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault()
        handleZoomFit()
      }
      // Select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault()
        const nonConnectors = objectsRef2.current.filter((o) => o.type !== 'connector')
        setSelectedIds(nonConnectors.map((o) => o.id))
      }
      // Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const ids = selectedIdsRef.current
        if (ids.length > 0) {
          clipboardRef.current = ids
            .map((id) => objectsRef2.current.find((o) => o.id === id))
            .filter((o): o is CanvasObject => !!o)
            .map((o) => ({ ...o }))
        }
      }
      // Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        const clips = clipboardRef.current
        if (!clips || clips.length === 0) return
        e.preventDefault()
        const now = new Date().toISOString()
        const newIds: string[] = []
        for (const clip of clips) {
          const newObj: CanvasObject = {
            ...clip,
            id: generateId(),
            x: clip.x + 20,
            y: clip.y + 20,
            z_index: nextZIndexRef.current,
            updated_at: now,
          }
          if (newObj.type === 'connector') {
            newObj.fromId = undefined
            newObj.toId = undefined
          }
          addObjectHelper(newObj)
          newIds.push(newObj.id)
        }
        setSelectedIds(newIds)
        // Update clipboard for cascading pastes
        clipboardRef.current = clips.map((c) => ({ ...c, x: c.x + 20, y: c.y + 20 }))
      }
      // Duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        const ids = selectedIdsRef.current
        if (ids.length === 0) return
        const now = new Date().toISOString()
        const newIds: string[] = []
        for (const id of ids) {
          const obj = objectsRef2.current.find((o) => o.id === id)
          if (!obj) continue
          const newObj: CanvasObject = {
            ...obj,
            id: generateId(),
            x: obj.x + 20,
            y: obj.y + 20,
            z_index: nextZIndexRef.current,
            updated_at: now,
          }
          addObjectHelper(newObj)
          newIds.push(newObj.id)
        }
        setSelectedIds(newIds)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingId, handleDeleteSelected, handleZoomIn, handleZoomOut, handleZoomFit, addObjectHelper])

  return (
    <div className="flex h-screen w-screen flex-col">
      <Toolbar
        tool={tool}
        shapeTool={shapeTool}
        stickyColor={stickyColor}
        selectedIds={selectedIds}
        boardSlug={boardSlug}
        boardName={displayName}
        boardId={boardId}
        isOwner={isOwner}
        stageScale={stageScale}
        gridMode={gridMode}
        onToolChange={setTool}
        onShapeToolChange={setShapeTool}
        onStickyColorChange={setStickyColor}
        onDelete={handleDeleteSelected}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
        onRename={handleRename}
        onCycleGrid={() => setGridMode((prev) => prev === 'none' ? 'dots' : prev === 'dots' ? 'lines' : 'none')}
        presenceSlot={
          presenceEnabled ? (
            <PresenceIndicator users={others} currentUserName={userName} />
          ) : undefined
        }
      />

      <div className="relative flex-1 overflow-hidden bg-gray-50">
        {/* Properties panel */}
        <PropertiesPanel selectedObject={selectedObject} onUpdate={updateObjectHelper} objectScreenPosition={selectedObjectScreenPos} />

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
            {/* Grid */}
            {gridMode !== 'none' &&
              (() => {
                const gridSize = 40
                const startX =
                  Math.floor(-stagePos.x / stageScale / gridSize) * gridSize - gridSize
                const startY =
                  Math.floor(-stagePos.y / stageScale / gridSize) * gridSize - gridSize
                const endX = startX + stageSize.width / stageScale + gridSize * 2
                const endY = startY + stageSize.height / stageScale + gridSize * 2

                if (gridMode === 'dots') {
                  const dots = []
                  for (let x = startX; x < endX; x += gridSize) {
                    for (let y = startY; y < endY; y += gridSize) {
                      dots.push(
                        <KonvaRect
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
                } else {
                  const lines = []
                  for (let x = startX; x < endX; x += gridSize) {
                    lines.push(
                      <Line
                        key={`vl-${x}`}
                        points={[x, startY, x, endY]}
                        stroke="#e5e7eb"
                        strokeWidth={0.5}
                        listening={false}
                      />,
                    )
                  }
                  for (let y = startY; y < endY; y += gridSize) {
                    lines.push(
                      <Line
                        key={`hl-${y}`}
                        points={[startX, y, endX, y]}
                        stroke="#e5e7eb"
                        strokeWidth={0.5}
                        listening={false}
                      />,
                    )
                  }
                  return lines
                }
              })()}

            {/* Objects */}
            {objects.map((obj) => {
              // Pre-compute connector endpoints with edge snapping
              if (obj.type === 'connector' && obj.fromId && obj.toId) {
                const fromObj = objects.find((o) => o.id === obj.fromId)
                const toObj = objects.find((o) => o.id === obj.toId)
                if (!fromObj || !toObj) return null

                const fromCx = fromObj.x + fromObj.width / 2
                const fromCy = fromObj.y + fromObj.height / 2
                const toCx = toObj.x + toObj.width / 2
                const toCy = toObj.y + toObj.height / 2

                // If an endpoint of this connector is being dragged, use the drag position
                const isDraggingFrom = draggingEndpoint?.connectorId === obj.id && draggingEndpoint.end === 'from'
                const isDraggingTo = draggingEndpoint?.connectorId === obj.id && draggingEndpoint.end === 'to'

                let pts: number[]
                if (isDraggingFrom) {
                  const end = edgePoint(toCx, toCy, toObj.width, toObj.height, draggingEndpoint.x, draggingEndpoint.y)
                  pts = [draggingEndpoint.x, draggingEndpoint.y, end.x, end.y]
                } else if (isDraggingTo) {
                  const start = edgePoint(fromCx, fromCy, fromObj.width, fromObj.height, draggingEndpoint.x, draggingEndpoint.y)
                  pts = [start.x, start.y, draggingEndpoint.x, draggingEndpoint.y]
                } else {
                  const start = edgePoint(fromCx, fromCy, fromObj.width, fromObj.height, toCx, toCy)
                  const end = edgePoint(toCx, toCy, toObj.width, toObj.height, fromCx, fromCy)
                  pts = [start.x, start.y, end.x, end.y]
                }
                return (
                  <ShapeRenderer
                    key={obj.id}
                    obj={{ ...obj, points: pts }}
                    isEditing={false}
                    onSelect={handleSelect}
                    onDoubleClick={handleDoubleClick}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                  />
                )
              }
              return (
                <ShapeRenderer
                  key={obj.id}
                  obj={obj}
                  isEditing={editingId === obj.id}
                  onSelect={handleSelect}
                  onDoubleClick={handleDoubleClick}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
              )
            })}

            {/* Connector preview line */}
            {connectorPreview && (
              <Arrow
                points={connectorPreview}
                stroke="#3b82f6"
                strokeWidth={2}
                pointerLength={10}
                pointerWidth={10}
                dash={[8, 4]}
                listening={false}
              />
            )}

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

            {/* Marquee selection rectangle */}
            {selectionRect && (
              <KonvaRect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="rgba(59, 130, 246, 0.08)"
                stroke="#3b82f6"
                strokeWidth={1 / stageScale}
                dash={[6 / stageScale, 3 / stageScale]}
                listening={false}
              />
            )}

            {/* Connector endpoint handles (when a single connector is selected) */}
            {(() => {
              if (selectedIds.length !== 1) return null
              const selObj = objects.find((o) => o.id === selectedIds[0])
              if (!selObj || selObj.type !== 'connector' || !selObj.fromId || !selObj.toId) return null
              const fromObj = objects.find((o) => o.id === selObj.fromId)
              const toObj = objects.find((o) => o.id === selObj.toId)
              if (!fromObj || !toObj) return null

              const fromCx = fromObj.x + fromObj.width / 2
              const fromCy = fromObj.y + fromObj.height / 2
              const toCx = toObj.x + toObj.width / 2
              const toCy = toObj.y + toObj.height / 2
              const startPt = edgePoint(fromCx, fromCy, fromObj.width, fromObj.height, toCx, toCy)
              const endPt = edgePoint(toCx, toCy, toObj.width, toObj.height, fromCx, fromCy)

              const handleRadius = 6 / stageScale
              const handleStroke = 2 / stageScale

              const handleEndpointDragEnd = (end: 'from' | 'to', e: Konva.KonvaEventObject<DragEvent>) => {
                const pos = { x: e.target.x(), y: e.target.y() }
                setDraggingEndpoint(null)
                // Find which object the endpoint was dropped near
                const hitObj = objects.find((o) => {
                  if (o.type === 'connector' || o.id === selObj.id) return false
                  // Check if the same end's current target — skip
                  if (end === 'from' && o.id === selObj.toId) return false
                  if (end === 'to' && o.id === selObj.fromId) return false
                  return pos.x >= o.x && pos.x <= o.x + o.width && pos.y >= o.y && pos.y <= o.y + o.height
                })
                if (hitObj) {
                  // Reconnect
                  const updates: Partial<CanvasObject> = end === 'from' ? { fromId: hitObj.id } : { toId: hitObj.id }
                  updateObjectHelper(selObj.id, updates)
                }
                // Reset circle position (it will re-render at computed edge point)
              }

              return (
                <>
                  {/* Start endpoint (from) */}
                  <Circle
                    x={draggingEndpoint?.end === 'from' ? draggingEndpoint.x : startPt.x}
                    y={draggingEndpoint?.end === 'from' ? draggingEndpoint.y : startPt.y}
                    radius={handleRadius}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={handleStroke}
                    draggable
                    onDragStart={() => setDraggingEndpoint({ connectorId: selObj.id, end: 'from', x: startPt.x, y: startPt.y })}
                    onDragMove={(e) => setDraggingEndpoint({ connectorId: selObj.id, end: 'from', x: e.target.x(), y: e.target.y() })}
                    onDragEnd={(e) => handleEndpointDragEnd('from', e)}
                  />
                  {/* End endpoint (to) */}
                  <Circle
                    x={draggingEndpoint?.end === 'to' ? draggingEndpoint.x : endPt.x}
                    y={draggingEndpoint?.end === 'to' ? draggingEndpoint.y : endPt.y}
                    radius={handleRadius}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={handleStroke}
                    draggable
                    onDragStart={() => setDraggingEndpoint({ connectorId: selObj.id, end: 'to', x: endPt.x, y: endPt.y })}
                    onDragMove={(e) => setDraggingEndpoint({ connectorId: selObj.id, end: 'to', x: e.target.x(), y: e.target.y() })}
                    onDragEnd={(e) => handleEndpointDragEnd('to', e)}
                  />
                </>
              )
            })()}

            {/* Transformer */}
            <Transformer
              ref={transformerRef}
              rotateAnchorOffset={20}
              rotateAnchorCursor="grab"
              anchorCornerRadius={2}
              anchorStrokeColor="#3b82f6"
              anchorFill="#ffffff"
              borderStroke="#3b82f6"
              borderStrokeWidth={1}
              boundBoxFunc={(_oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) return _oldBox
                return newBox
              }}
            />

            {/* Remote cursors */}
            {presenceEnabled && (
              <CursorOverlay users={others} stageScale={stageScale} />
            )}
          </Layer>
        </Stage>

        {/* AI Agent Panel — only for authenticated users with board access */}
        {syncEnabled && boardId && (
          <AiAgentPanel
            boardId={boardId}
            objects={objects}
            onAddObject={addObjectHelper}
            onUpdateObject={updateObjectHelper}
            onDeleteObject={(id: string) => {
              if (syncEnabled) {
                deleteObject(id)
              } else {
                setLocalObjects((prev) => prev.filter((o) => o.id !== id))
              }
            }}
            nextZIndex={nextZIndex}
          />
        )}
      </div>
    </div>
  )
}
