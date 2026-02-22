import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SHAPE_DEFAULTS, STICKY_COLORS } from '@/lib/shape-defaults'
import type { ShapeType } from '@/lib/board-sync'

const SHAPE_TYPES = [
  'rectangle',
  'rounded_rectangle',
  'circle',
  'ellipse',
  'triangle',
  'diamond',
  'star',
  'hexagon',
  'pentagon',
  'arrow',
  'line',
] as const

/**
 * AI agent tool definitions for board manipulation.
 *
 * Tools are pure: they return data (object definitions), not side effects.
 * The client receives these results and calls addObject/updateObject/deleteObject.
 *
 * Exception: getBoardState reads from Supabase server-side.
 */
export function aiTools(boardId: string, supabase: SupabaseClient) {
  return {
    // ── Creation Tools ──────────────────────────────────────────────

    createStickyNote: tool({
      description:
        'Create a sticky note on the board with text and optional position/color.',
      inputSchema: z.object({
        text: z.string().describe('The text content of the sticky note'),
        x: z.number().optional().describe('X position (default: 100)'),
        y: z.number().optional().describe('Y position (default: 100)'),
        color: z
          .string()
          .optional()
          .describe(
            `Background color hex. Available: ${STICKY_COLORS.join(', ')}. Default: ${STICKY_COLORS[0]} (yellow)`,
          ),
        width: z.number().optional().describe('Width in pixels (default: 150)'),
        height: z
          .number()
          .optional()
          .describe('Height in pixels (default: 150)'),
      }),
      execute: async ({ text, x, y, color, width, height }) => {
        const defaults = SHAPE_DEFAULTS.sticky_note
        return {
          action: 'create' as const,
          object: {
            id: crypto.randomUUID(),
            type: 'sticky_note' as const,
            x: x ?? 100,
            y: y ?? 100,
            width: width ?? defaults.width,
            height: height ?? defaults.height,
            fill: color ?? defaults.fill,
            text,
            z_index: 0,
            updated_at: new Date().toISOString(),
          },
        }
      },
    }),

    createShape: tool({
      description:
        'Create a shape on the board. Supported types: rectangle, rounded_rectangle, circle, ellipse, triangle, diamond, star, hexagon, pentagon, arrow, line.',
      inputSchema: z.object({
        type: z
          .enum(SHAPE_TYPES)
          .describe('The shape type to create'),
        x: z.number().optional().describe('X position (default: 100)'),
        y: z.number().optional().describe('Y position (default: 100)'),
        width: z.number().optional().describe('Width in pixels'),
        height: z.number().optional().describe('Height in pixels'),
        fill: z.string().optional().describe('Fill color hex'),
        stroke: z.string().optional().describe('Stroke color hex'),
        strokeWidth: z.number().optional().describe('Stroke width in pixels'),
      }),
      execute: async ({ type, x, y, width, height, fill, stroke, strokeWidth }) => {
        const defaults = SHAPE_DEFAULTS[type as ShapeType]
        return {
          action: 'create' as const,
          object: {
            id: crypto.randomUUID(),
            type,
            x: x ?? 100,
            y: y ?? 100,
            width: width ?? defaults.width,
            height: height ?? defaults.height,
            fill: fill ?? defaults.fill,
            stroke: stroke ?? defaults.stroke,
            strokeWidth: strokeWidth ?? defaults.strokeWidth,
            z_index: 0,
            updated_at: new Date().toISOString(),
          },
        }
      },
    }),

    createFrame: tool({
      description:
        'Create a frame (large labeled rectangle) to group and organize content areas. Use for templates like SWOT quadrants, kanban columns, etc.',
      inputSchema: z.object({
        title: z.string().describe('The label text for the frame'),
        x: z.number().optional().describe('X position (default: 100)'),
        y: z.number().optional().describe('Y position (default: 100)'),
        width: z.number().optional().describe('Width in pixels (default: 350)'),
        height: z
          .number()
          .optional()
          .describe('Height in pixels (default: 300)'),
        fill: z
          .string()
          .optional()
          .describe('Background color hex (default: #f1f5f9, light gray)'),
      }),
      execute: async ({ title, x, y, width, height, fill }) => {
        const frameX = x ?? 100
        const frameY = y ?? 100
        const frameW = width ?? 350
        return {
          action: 'create' as const,
          object: {
            id: crypto.randomUUID(),
            type: 'rectangle' as const,
            x: frameX,
            y: frameY,
            width: frameW,
            height: height ?? 300,
            fill: fill ?? '#f1f5f9',
            stroke: '#94a3b8',
            strokeWidth: 2,
            opacity: 0.5,
            z_index: -1,
            updated_at: new Date().toISOString(),
          },
          // Also create a title label as a small sticky note
          titleLabel: {
            id: crypto.randomUUID(),
            type: 'sticky_note' as const,
            x: frameX + 10,
            y: frameY + 10,
            width: Math.min(frameW - 20, 200),
            height: 40,
            fill: fill ?? '#f1f5f9',
            text: title,
            z_index: 0,
            updated_at: new Date().toISOString(),
          },
        }
      },
    }),

    createConnector: tool({
      description:
        'Create a connector (arrow/line) between two existing objects on the board. Call getBoardState first to get object IDs.',
      inputSchema: z.object({
        fromId: z.string().describe('ID of the source object'),
        toId: z.string().describe('ID of the target object'),
        style: z
          .enum(['none', 'arrow-end', 'arrow-start', 'arrow-both'])
          .optional()
          .describe('Arrow style (default: arrow-end)'),
      }),
      execute: async ({ fromId, toId, style }) => ({
        action: 'create' as const,
        object: {
          id: crypto.randomUUID(),
          type: 'connector' as const,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: '#1f2937',
          strokeWidth: 2,
          fromId,
          toId,
          connectorStyle: style ?? 'arrow-end',
          z_index: 0,
          updated_at: new Date().toISOString(),
        },
      }),
    }),

    createText: tool({
      description:
        'Create a standalone text element on the board. Unlike sticky notes, text has no background — just text directly on the canvas. Use for labels, headings, annotations, or any text that should appear without a colored background.',
      inputSchema: z.object({
        text: z.string().describe('The text content'),
        x: z.number().optional().describe('X position (default: 100)'),
        y: z.number().optional().describe('Y position (default: 100)'),
        fontSize: z.number().optional().describe('Font size in pixels (default: 18)'),
        color: z.string().optional().describe('Text color hex (default: #1f2937, dark gray)'),
        width: z.number().optional().describe('Text box width in pixels (default: 200)'),
        fontFamily: z.string().optional().describe('Font family (default: sans-serif)'),
      }),
      execute: async ({ text, x, y, fontSize, color, width, fontFamily }) => {
        const defaults = SHAPE_DEFAULTS.text
        return {
          action: 'create' as const,
          object: {
            id: crypto.randomUUID(),
            type: 'text' as const,
            x: x ?? 100,
            y: y ?? 100,
            width: width ?? defaults.width,
            height: defaults.height,
            fill: color ?? defaults.fill,
            text,
            fontSize: fontSize ?? 18,
            fontFamily: fontFamily ?? 'sans-serif',
            z_index: 0,
            updated_at: new Date().toISOString(),
          },
        }
      },
    }),

    createFreedraw: tool({
      description:
        'Create a freehand drawing on the board. Provide a flat array of [x1, y1, x2, y2, ...] coordinates in absolute board space. The points will be normalized to the bounding box automatically. Use this to draw artistic shapes, sketches, underlines, circles, arrows, wavy lines, decorative elements, or any freeform path. Generate smooth curves by using many closely-spaced points (e.g., 20-50+ points for a curve). For a circle, use sin/cos to generate points around the circumference.',
      inputSchema: z.object({
        points: z
          .array(z.number())
          .describe(
            'Flat array of alternating x,y coordinates: [x1, y1, x2, y2, ...]. Minimum 4 values (2 points). Generate many points (20-100) for smooth curves.',
          ),
        stroke: z
          .string()
          .optional()
          .describe('Stroke color hex (default: #1f2937, dark gray)'),
        strokeWidth: z
          .number()
          .optional()
          .describe('Stroke width in pixels (default: 3)'),
      }),
      execute: async ({ points, stroke, strokeWidth }) => {
        if (points.length < 4) {
          return {
            action: 'create' as const,
            error: 'Need at least 2 points (4 values) for a freehand drawing',
          }
        }

        // Calculate bounding box
        const xs = points.filter((_, i) => i % 2 === 0)
        const ys = points.filter((_, i) => i % 2 === 1)
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)
        const maxX = Math.max(...xs)
        const maxY = Math.max(...ys)

        // Normalize points relative to top-left of bounding box
        const normalizedPoints = points.map((val, i) =>
          i % 2 === 0 ? val - minX : val - minY,
        )

        return {
          action: 'create' as const,
          object: {
            id: crypto.randomUUID(),
            type: 'freedraw' as const,
            x: minX,
            y: minY,
            width: Math.max(maxX - minX, 1),
            height: Math.max(maxY - minY, 1),
            fill: 'transparent',
            stroke: stroke ?? '#1f2937',
            strokeWidth: strokeWidth ?? 3,
            points: normalizedPoints,
            z_index: 0,
            updated_at: new Date().toISOString(),
          },
        }
      },
    }),

    // ── Manipulation Tools ──────────────────────────────────────────

    moveObject: tool({
      description: 'Move an object to a new position on the board.',
      inputSchema: z.object({
        objectId: z.string().describe('ID of the object to move'),
        x: z.number().describe('New X position'),
        y: z.number().describe('New Y position'),
      }),
      execute: async ({ objectId, x, y }) => ({
        action: 'update' as const,
        id: objectId,
        updates: { x, y },
      }),
    }),

    resizeObject: tool({
      description: 'Resize an object on the board.',
      inputSchema: z.object({
        objectId: z.string().describe('ID of the object to resize'),
        width: z.number().describe('New width in pixels'),
        height: z.number().describe('New height in pixels'),
      }),
      execute: async ({ objectId, width, height }) => ({
        action: 'update' as const,
        id: objectId,
        updates: { width, height },
      }),
    }),

    updateText: tool({
      description: 'Update the text content of a sticky note or text object.',
      inputSchema: z.object({
        objectId: z.string().describe('ID of the object to update'),
        newText: z.string().describe('The new text content'),
      }),
      execute: async ({ objectId, newText }) => ({
        action: 'update' as const,
        id: objectId,
        updates: { text: newText },
      }),
    }),

    changeColor: tool({
      description: 'Change the fill color of an object.',
      inputSchema: z.object({
        objectId: z.string().describe('ID of the object to recolor'),
        color: z.string().describe('New hex color (e.g. #EAB308)'),
      }),
      execute: async ({ objectId, color }) => ({
        action: 'update' as const,
        id: objectId,
        updates: { fill: color },
      }),
    }),

    deleteObject: tool({
      description: 'Delete an object from the board.',
      inputSchema: z.object({
        objectId: z.string().describe('ID of the object to delete'),
      }),
      execute: async ({ objectId }) => ({
        action: 'delete' as const,
        id: objectId,
      }),
    }),

    // ── Layout Tool ─────────────────────────────────────────────────

    arrangeObjects: tool({
      description:
        'Move multiple objects into an arrangement (grid, horizontal row, vertical column). Provide the object IDs and layout type. Objects will be arranged starting from (startX, startY) with the given gap between them.',
      inputSchema: z.object({
        objectIds: z
          .array(z.string())
          .describe('IDs of objects to arrange'),
        layout: z
          .enum(['grid', 'horizontal', 'vertical'])
          .describe('Arrangement pattern'),
        startX: z
          .number()
          .optional()
          .describe('Starting X position (default: 100)'),
        startY: z
          .number()
          .optional()
          .describe('Starting Y position (default: 100)'),
        gap: z
          .number()
          .optional()
          .describe('Gap between objects in pixels (default: 20)'),
        columns: z
          .number()
          .optional()
          .describe('Number of columns for grid layout (default: 4)'),
      }),
      execute: async ({
        objectIds,
        layout,
        startX,
        startY,
        gap,
        columns,
      }) => {
        const sx = startX ?? 100
        const sy = startY ?? 100
        const g = gap ?? 20
        const cols = columns ?? 4

        // Fetch current objects to get their dimensions
        const { data } = await supabase
          .from('board_objects')
          .select('id, width, height')
          .eq('board_id', boardId)
          .in('id', objectIds)

        const objMap = new Map(
          (data || []).map((o) => [o.id, { w: o.width, h: o.height }]),
        )

        const batchUpdates: Array<{
          id: string
          updates: Record<string, unknown>
        }> = []

        let curX = sx
        let curY = sy
        let rowMaxH = 0

        for (let i = 0; i < objectIds.length; i++) {
          const id = objectIds[i]
          const dims = objMap.get(id) || { w: 150, h: 150 }

          if (layout === 'horizontal') {
            batchUpdates.push({ id, updates: { x: curX, y: sy } })
            curX += dims.w + g
          } else if (layout === 'vertical') {
            batchUpdates.push({ id, updates: { x: sx, y: curY } })
            curY += dims.h + g
          } else {
            // grid
            const col = i % cols
            const row = Math.floor(i / cols)
            if (col === 0 && row > 0) {
              curY += rowMaxH + g
              rowMaxH = 0
            }
            if (col === 0) curX = sx
            batchUpdates.push({ id, updates: { x: curX, y: curY } })
            rowMaxH = Math.max(rowMaxH, dims.h)
            curX += dims.w + g
          }
        }

        return {
          action: 'batch_update' as const,
          batchUpdates,
        }
      },
    }),

    // ── Read Tool ───────────────────────────────────────────────────

    getBoardState: tool({
      description:
        'Get all objects currently on the board. Use this to understand the current layout before making changes. Always call this before moving, resizing, or modifying existing objects.',
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await supabase
          .from('board_objects')
          .select('id, type, x, y, width, height, data, z_index')
          .eq('board_id', boardId)
          .order('z_index', { ascending: true })

        if (error)
          return {
            action: 'read' as const,
            error: error.message,
            objects: [],
            count: 0,
          }

        return {
          action: 'read' as const,
          objects: (data || []).map((obj) => {
            const d = (obj.data || {}) as Record<string, unknown>
            return {
              id: obj.id,
              type: obj.type,
              x: obj.x,
              y: obj.y,
              width: obj.width,
              height: obj.height,
              text: d.text as string | undefined,
              fill: d.fill as string | undefined,
            }
          }),
          count: data?.length ?? 0,
        }
      },
    }),
  }
}
