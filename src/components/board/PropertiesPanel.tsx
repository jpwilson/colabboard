'use client'

import type { CanvasObject } from '@/lib/board-sync'
import { ColorPicker } from './ColorPicker'
import { BOARD_FONTS } from '@/lib/fonts'
import { STICKY_SIZES } from '@/lib/shape-defaults'

interface PropertiesPanelProps {
  selectedObject: CanvasObject | null
  onUpdate: (id: string, updates: Partial<CanvasObject>) => void
}

export function PropertiesPanel({ selectedObject, onUpdate }: PropertiesPanelProps) {
  if (!selectedObject) return null

  const obj = selectedObject
  const isSticky = obj.type === 'sticky_note'
  const isFreedraw = obj.type === 'freedraw'
  const isLine = obj.type === 'line' || obj.type === 'arrow'

  return (
    <div className="absolute right-3 top-14 z-40 w-52 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Properties</p>

      {/* Fill color — not for line/arrow/freedraw */}
      {!isFreedraw && !isLine && (
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
  )
}
