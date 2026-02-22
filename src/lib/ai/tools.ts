import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SHAPE_DEFAULTS, STICKY_COLORS } from '@/lib/shape-defaults'
import type { ShapeType } from '@/lib/board-sync'
import { generateSketch } from './sketch-agent'
import { generateSvg } from './generation/generate-svg'
import { generateImage } from './generation/generate-image'

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
  // Track positions allocated during this AI turn to avoid overlap between consecutive creates
  const allocated: Array<{ x: number; y: number; width: number; height: number }> = []

  /**
   * Find an unoccupied area on the board for a new object.
   * Queries existing objects + tracks positions allocated in this turn.
   * Tries: right of content → below content → fallback right-top.
   */
  async function findOpenSpace(
    neededWidth: number,
    neededHeight: number,
  ): Promise<{ x: number; y: number }> {
    const { data } = await supabase
      .from('board_objects')
      .select('x, y, width, height')
      .eq('board_id', boardId)

    const rects = [
      ...(data || []).map((o) => ({
        x: o.x as number,
        y: o.y as number,
        width: o.width as number,
        height: o.height as number,
      })),
      ...allocated,
    ]

    if (rects.length === 0) {
      allocated.push({ x: 100, y: 100, width: neededWidth, height: neededHeight })
      return { x: 100, y: 100 }
    }

    const PAD = 40

    function overlaps(px: number, py: number): boolean {
      for (const r of rects) {
        if (
          px < r.x + r.width + PAD &&
          px + neededWidth > r.x - PAD &&
          py < r.y + r.height + PAD &&
          py + neededHeight > r.y - PAD
        ) {
          return true
        }
      }
      return false
    }

    const left = Math.min(...rects.map((r) => r.x))
    const top = Math.min(...rects.map((r) => r.y))
    const right = Math.max(...rects.map((r) => r.x + r.width))
    const bottom = Math.max(...rects.map((r) => r.y + r.height))

    // Try right of existing content at various y offsets
    const yStep = Math.max(neededHeight / 2, 50)
    for (let y = top; y <= bottom + neededHeight; y += yStep) {
      if (!overlaps(right + PAD, y)) {
        const pos = { x: right + PAD, y }
        allocated.push({ ...pos, width: neededWidth, height: neededHeight })
        return pos
      }
    }

    // Try below existing content at various x offsets
    const xStep = Math.max(neededWidth / 2, 50)
    for (let x = left; x <= right + neededWidth; x += xStep) {
      if (!overlaps(x, bottom + PAD)) {
        const pos = { x, y: bottom + PAD }
        allocated.push({ ...pos, width: neededWidth, height: neededHeight })
        return pos
      }
    }

    // Fallback: place to the right
    const pos = { x: right + PAD, y: top }
    allocated.push({ ...pos, width: neededWidth, height: neededHeight })
    return pos
  }

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
        const w = width ?? defaults.width
        const h = height ?? defaults.height
        const pos = x != null && y != null ? { x, y } : await findOpenSpace(w, h)
        return {
          action: 'create' as const,
          object: {
            id: crypto.randomUUID(),
            type: 'sticky_note' as const,
            x: pos.x,
            y: pos.y,
            width: w,
            height: h,
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
        const w = width ?? defaults.width
        const h = height ?? defaults.height
        const pos = x != null && y != null ? { x, y } : await findOpenSpace(w, h)
        return {
          action: 'create' as const,
          object: {
            id: crypto.randomUUID(),
            type,
            x: pos.x,
            y: pos.y,
            width: w,
            height: h,
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
        const frameW = width ?? 350
        const frameH = height ?? 300
        const pos = x != null && y != null ? { x, y } : await findOpenSpace(frameW, frameH)
        const frameX = pos.x
        const frameY = pos.y
        return {
          action: 'create' as const,
          object: {
            id: crypto.randomUUID(),
            type: 'rectangle' as const,
            x: frameX,
            y: frameY,
            width: frameW,
            height: frameH,
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
        const w = width ?? defaults.width
        const h = defaults.height
        const pos = x != null && y != null ? { x, y } : await findOpenSpace(w, h)
        return {
          action: 'create' as const,
          object: {
            id: crypto.randomUUID(),
            type: 'text' as const,
            x: pos.x,
            y: pos.y,
            width: w,
            height: h,
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

    // ── Drawing Tool ───────────────────────────────────────────────────

    drawSketch: tool({
      description:
        'Draw a hand-drawn sketch of a concept using AI-generated Bezier curve strokes. Creates a pen-and-ink style illustration. Best for quick doodles and hand-drawn style only — for better quality, use generateSvg instead.',
      inputSchema: z.object({
        concept: z
          .string()
          .describe('What to draw (e.g. "horse", "sailboat", "DNA helix", "face")'),
        x: z.number().optional().describe('X position on canvas (default: 100)'),
        y: z.number().optional().describe('Y position on canvas (default: 100)'),
        width: z
          .number()
          .optional()
          .describe('Width of the drawing area in pixels (default: 400)'),
        height: z
          .number()
          .optional()
          .describe('Height of the drawing area in pixels (default: 400)'),
      }),
      execute: async ({ concept, x, y, width, height }) => {
        try {
          const w = width ?? 400
          const h = height ?? 400
          const pos = x != null && y != null ? { x, y } : await findOpenSpace(w, h)
          const objects = await generateSketch(
            concept,
            pos.x,
            pos.y,
            w,
            h,
          )

          if (objects.length === 0) {
            return {
              action: 'create' as const,
              error: 'Failed to generate sketch — no strokes were produced.',
            }
          }

          return {
            action: 'batch_create' as const,
            objects: objects.map((obj) => ({
              ...obj,
              z_index: 0,
            })),
          }
        } catch (err) {
          return {
            action: 'create' as const,
            error: `Sketch generation failed: ${err instanceof Error ? err.message : String(err)}`,
          }
        }
      },
    }),

    // ── Image Generation Tools ──────────────────────────────────────────

    generateSvgImage: tool({
      description:
        'Generate a clean, colorful SVG illustration of a concept and place it on the board as an image. Best for icons, diagrams, logos, simple illustrations, and any visual where vector quality matters. Fast (~2s) and cheap. Prefer this over drawSketch for better quality.',
      inputSchema: z.object({
        concept: z
          .string()
          .describe('What to draw (e.g. "cat", "rocket ship", "DNA helix", "coffee cup")'),
        style: z
          .string()
          .optional()
          .describe('Art style (e.g. "flat design", "minimalist", "cartoon", "geometric")'),
        x: z.number().optional().describe('X position on canvas (default: 100)'),
        y: z.number().optional().describe('Y position on canvas (default: 100)'),
        width: z.number().optional().describe('Width in pixels (default: 300)'),
        height: z.number().optional().describe('Height in pixels (default: 300)'),
      }),
      execute: async ({ concept, style, x, y, width, height }) => {
        try {
          const { dataUrl } = await generateSvg(concept, style)
          const defaults = SHAPE_DEFAULTS.image
          const w = width ?? defaults.width
          const h = height ?? defaults.height
          const pos = x != null && y != null ? { x, y } : await findOpenSpace(w, h)
          return {
            action: 'create' as const,
            object: {
              id: crypto.randomUUID(),
              type: 'image' as const,
              x: pos.x,
              y: pos.y,
              width: w,
              height: h,
              fill: 'transparent',
              imageUrl: dataUrl,
              z_index: 0,
              updated_at: new Date().toISOString(),
            },
          }
        } catch (err) {
          return {
            action: 'create' as const,
            error: `SVG generation failed: ${err instanceof Error ? err.message : String(err)}`,
          }
        }
      },
    }),

    // ── 3D Model Tool ───────────────────────────────────────────────────

    create3DModel: tool({
      description:
        'Place an interactive 3D model on the board. Users can double-click to rotate and orbit the model. Supports basic shapes (cube, sphere, cylinder, torus) via built-in models, or a custom GLB URL.',
      inputSchema: z.object({
        shape: z
          .enum(['cube', 'sphere', 'cylinder', 'torus', 'custom'])
          .describe('The 3D shape to place. Use "custom" with modelUrl for external GLB files.'),
        modelUrl: z
          .string()
          .optional()
          .describe('URL to a .glb file (only needed for "custom" shape)'),
        x: z.number().optional().describe('X position on canvas (default: 100)'),
        y: z.number().optional().describe('Y position on canvas (default: 100)'),
        width: z.number().optional().describe('Width in pixels (default: 250)'),
        height: z.number().optional().describe('Height in pixels (default: 250)'),
      }),
      execute: async ({ shape, modelUrl, x, y, width, height }) => {
        // Built-in shape URLs from Google's model-viewer sample assets
        const BUILT_IN_MODELS: Record<string, string> = {
          cube: 'https://modelviewer.dev/shared-assets/models/cube.glb',
          sphere: 'https://modelviewer.dev/shared-assets/models/reflective-sphere.glb',
          cylinder: 'https://modelviewer.dev/shared-assets/models/cylinder.glb',
          torus: 'https://modelviewer.dev/shared-assets/models/torus.glb',
        }

        const url = shape === 'custom' ? modelUrl : BUILT_IN_MODELS[shape]
        if (!url) {
          return {
            action: 'create' as const,
            error: shape === 'custom'
              ? 'modelUrl is required for custom shapes'
              : `No built-in model for shape: ${shape}`,
          }
        }

        const defaults = SHAPE_DEFAULTS.model3d
        const w = width ?? defaults.width
        const h = height ?? defaults.height
        const pos = x != null && y != null ? { x, y } : await findOpenSpace(w, h)
        return {
          action: 'create' as const,
          object: {
            id: crypto.randomUUID(),
            type: 'model3d' as const,
            x: pos.x,
            y: pos.y,
            width: w,
            height: h,
            fill: defaults.fill,
            modelUrl: url,
            cameraOrbit: '0deg 75deg 2.5m',
            z_index: 0,
            updated_at: new Date().toISOString(),
          },
        }
      },
    }),

    generateRealisticImage: tool({
      description:
        'Generate a high-quality, realistic image using DALL-E 3 and place it on the board. Best for photorealistic scenes, complex illustrations, or artistic imagery. Slower (~10s) and costs ~$0.04 per image. Use generateSvgImage for simpler/faster needs.' +
        (!process.env.OPENAI_API_KEY ? ' NOTE: This tool is currently unavailable (OPENAI_API_KEY not configured). Use generateSvgImage instead.' : ''),
      inputSchema: z.object({
        prompt: z
          .string()
          .describe('Detailed description of the image to generate (e.g. "a sunset over mountains with a lake reflection")'),
        x: z.number().optional().describe('X position on canvas (default: 100)'),
        y: z.number().optional().describe('Y position on canvas (default: 100)'),
        width: z.number().optional().describe('Display width in pixels (default: 300)'),
        height: z.number().optional().describe('Display height in pixels (default: 300)'),
      }),
      execute: async ({ prompt, x, y, width, height }) => {
        try {
          const { dataUrl } = await generateImage(prompt)
          const defaults = SHAPE_DEFAULTS.image
          const w = width ?? defaults.width
          const h = height ?? defaults.height
          const pos = x != null && y != null ? { x, y } : await findOpenSpace(w, h)
          return {
            action: 'create' as const,
            object: {
              id: crypto.randomUUID(),
              type: 'image' as const,
              x: pos.x,
              y: pos.y,
              width: w,
              height: h,
              fill: 'transparent',
              imageUrl: dataUrl,
              z_index: 0,
              updated_at: new Date().toISOString(),
            },
          }
        } catch (err) {
          return {
            action: 'create' as const,
            error: `Image generation failed: ${err instanceof Error ? err.message : String(err)}`,
          }
        }
      },
    }),
  }
}
