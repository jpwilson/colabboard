'use client'

import { useEffect, useRef } from 'react'
import type { CanvasObject } from '@/lib/board-sync'
import { ColorPicker } from './ColorPicker'
import { BOARD_FONTS } from '@/lib/fonts'
import { STICKY_SIZES, STICKY_COLOR_NAMES } from '@/lib/shape-defaults'
import { useDraggable } from '@/hooks/useDraggable'

interface PropertiesPanelProps {
  selectedObject: CanvasObject | null
  onUpdate: (id: string, updates: Partial<CanvasObject>) => void
  objectScreenPosition: { x: number; y: number } | null
}

const TYPE_LABELS: Record<string, string> = {
  sticky_note: 'sticky note',
  rectangle: 'rectangle',
  rounded_rectangle: 'rounded rectangle',
  circle: 'circle',
  ellipse: 'ellipse',
  triangle: 'triangle',
  diamond: 'diamond',
  star: 'star',
  hexagon: 'hexagon',
  pentagon: 'pentagon',
  arrow: 'arrow',
  line: 'line',
  freedraw: 'drawing',
  connector: 'connector',
}

function getEditLabel(obj: CanvasObject): string {
  if (obj.type === 'sticky_note') {
    const colorName = STICKY_COLOR_NAMES[obj.fill || '']
    if (colorName) return `Edit your ${colorName.toLowerCase()} sticky note`
    return 'Edit your sticky note'
  }
  return `Edit your ${TYPE_LABELS[obj.type] || 'object'}`
}

const PANEL_WIDTH = 220
const PANEL_HEIGHT = 340

export function PropertiesPanel({ selectedObject, onUpdate, objectScreenPosition }: PropertiesPanelProps) {
  const { position, dragHandleProps, setPosition, isDragging } = useDraggable({
    storageKey: null,
    defaultPosition: {
      x: typeof window !== 'undefined' ? window.innerWidth - PANEL_WIDTH - 16 : 600,
      y: 60,
    },
    clampToViewport: true,
    elementSize: { width: PANEL_WIDTH, height: PANEL_HEIGHT },
  })

  const prevSelectedIdRef = useRef<string | null>(null)

  // Reposition near the selected object when selection changes
  useEffect(() => {
    if (!selectedObject || !objectScreenPosition) return
    if (prevSelectedIdRef.current === selectedObject.id) return
    prevSelectedIdRef.current = selectedObject.id

    // Try to place to the right of the object
    let x = objectScreenPosition.x + 40
    let y = objectScreenPosition.y - PANEL_HEIGHT / 2

    // If too far right, place to the left
    if (x + PANEL_WIDTH > window.innerWidth - 10) {
      x = objectScreenPosition.x - PANEL_WIDTH - 40
    }

    // Clamp to viewport
    x = Math.max(10, Math.min(window.innerWidth - PANEL_WIDTH - 10, x))
    y = Math.max(60, Math.min(window.innerHeight - PANEL_HEIGHT - 10, y))

    setPosition({ x, y })
  }, [selectedObject, objectScreenPosition, setPosition])

  // Clear the ref when deselected
  useEffect(() => {
    if (!selectedObject) {
      prevSelectedIdRef.current = null
    }
  }, [selectedObject])

  if (!selectedObject) return null

  const obj = selectedObject
  const isSticky = obj.type === 'sticky_note'
  const isFreedraw = obj.type === 'freedraw'
  const isLine = obj.type === 'line' || obj.type === 'arrow'
  const isConnector = obj.type === 'connector'

  return (
    <div
      className={`fixed z-40 w-52 rounded-xl border border-slate-200 bg-white shadow-lg ${isDragging ? 'select-none' : ''}`}
      style={{ left: position.x, top: position.y }}
    >
      {/* Drag handle header with object type */}
      <div
        className="flex items-center rounded-t-xl border-b border-slate-100 px-3 py-2"
        {...dragHandleProps}
      >
        <p className="text-xs font-semibold text-slate-600">
          {getEditLabel(obj)}
        </p>
      </div>

      <div className="p-3">
        {/* Arrow direction — for connectors */}
        {isConnector && (
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-500">Arrow style</p>
            <div className="mt-1 flex gap-1">
              {([
                { value: 'none', label: '—' },
                { value: 'arrow-end', label: '→' },
                { value: 'arrow-start', label: '←' },
                { value: 'arrow-both', label: '↔' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate(obj.id, { connectorStyle: opt.value })}
                  className={`flex-1 rounded border px-2 py-1 text-xs ${
                    (obj.connectorStyle || 'arrow-end') === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fill color — not for line/arrow/freedraw/connector */}
        {!isFreedraw && !isLine && !isConnector && (
          <div className="mb-3">
            <ColorPicker
              label="Fill"
              value={obj.fill}
              onChange={(color) => onUpdate(obj.id, { fill: color })}
            />
          </div>
        )}

        {/* Opacity */}
        <div className="mb-3">
          <p className="text-xs font-medium text-slate-500">Opacity</p>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((obj.opacity ?? 1) * 100)}
            onChange={(e) => onUpdate(obj.id, { opacity: Number(e.target.value) / 100 })}
            className="mt-1 w-full accent-primary"
          />
          <span className="text-xs text-slate-400">{Math.round((obj.opacity ?? 1) * 100)}%</span>
        </div>

        {/* Stroke color — not for sticky notes */}
        {!isSticky && (
          <div className="mb-3">
            <ColorPicker
              label="Stroke"
              value={obj.stroke ?? '#000000'}
              onChange={(color) => onUpdate(obj.id, { stroke: color })}
            />
          </div>
        )}

        {/* Stroke width — not for sticky notes */}
        {!isSticky && (
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-500">Stroke width</p>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => onUpdate(obj.id, { strokeWidth: Math.max(0, (obj.strokeWidth ?? 1) - 1) })}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
              >
                -
              </button>
              <span className="min-w-[2rem] text-center text-xs text-slate-700">{obj.strokeWidth ?? 1}px</span>
              <button
                onClick={() => onUpdate(obj.id, { strokeWidth: Math.min(10, (obj.strokeWidth ?? 1) + 1) })}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Font — for sticky notes */}
        {isSticky && (
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-500">Font</p>
            <select
              value={obj.fontFamily || 'sans-serif'}
              onChange={(e) => onUpdate(obj.id, { fontFamily: e.target.value })}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
            >
              <option value="sans-serif">Default</option>
              {BOARD_FONTS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Size — for sticky notes */}
        {isSticky && (
          <div className="mb-1">
            <p className="text-xs font-medium text-slate-500">Size</p>
            <div className="mt-1 flex gap-1">
              {STICKY_SIZES.map((size) => (
                <button
                  key={size.label}
                  onClick={() => onUpdate(obj.id, { width: size.width, height: size.height })}
                  className={`flex-1 rounded border px-2 py-1 text-xs ${
                    obj.width === size.width
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
