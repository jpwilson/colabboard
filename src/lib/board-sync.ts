import type { Json } from '@/types/database'

export type ShapeType =
  | 'sticky_note'
  | 'rectangle'
  | 'rounded_rectangle'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'arrow'
  | 'line'
  | 'hexagon'
  | 'pentagon'
  | 'freedraw'

export interface BoardObject {
  id: string
  board_id: string
  type: string
  data: Json
  x: number
  y: number
  width: number
  height: number
  z_index: number
  created_by: string | null
  updated_at: string
}

export interface CanvasObject {
  id: string
  type: ShapeType
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  text?: string
  fontFamily?: string
  points?: number[]
  z_index: number
  updated_at: string
}

/** Extract data properties from a CanvasObject into a JSON-serializable record */
export function canvasToData(obj: CanvasObject): Record<string, unknown> {
  const data: Record<string, unknown> = { fill: obj.fill }
  if (obj.text !== undefined) data.text = obj.text
  if (obj.stroke !== undefined) data.stroke = obj.stroke
  if (obj.strokeWidth !== undefined) data.strokeWidth = obj.strokeWidth
  if (obj.opacity !== undefined) data.opacity = obj.opacity
  if (obj.fontFamily !== undefined) data.fontFamily = obj.fontFamily
  if (obj.points !== undefined) data.points = obj.points
  return data
}

export function boardObjectToCanvas(obj: BoardObject): CanvasObject {
  const data = (obj.data || {}) as Record<string, unknown>
  const result: CanvasObject = {
    id: obj.id,
    type: obj.type as ShapeType,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    fill: (data.fill as string) || '#e2e8f0',
    z_index: obj.z_index,
    updated_at: obj.updated_at,
  }
  if (data.text !== undefined) result.text = data.text as string
  if (data.stroke !== undefined) result.stroke = data.stroke as string
  if (data.strokeWidth !== undefined) result.strokeWidth = data.strokeWidth as number
  if (data.opacity !== undefined) result.opacity = data.opacity as number
  if (data.fontFamily !== undefined) result.fontFamily = data.fontFamily as string
  if (data.points !== undefined) result.points = data.points as number[]
  return result
}

export function canvasToBoardObject(
  obj: CanvasObject,
  boardId: string,
  userId: string,
): Omit<BoardObject, 'created_by'> & { created_by: string } {
  return {
    id: obj.id,
    board_id: boardId,
    type: obj.type,
    data: canvasToData(obj) as unknown as Json,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    z_index: obj.z_index,
    updated_at: obj.updated_at,
    created_by: userId,
  }
}

/** LWW merge: apply remote update if it's newer */
export function lwwMerge(
  local: Map<string, CanvasObject>,
  remote: BoardObject,
): boolean {
  const existing = local.get(remote.id)
  if (!existing || remote.updated_at > existing.updated_at) {
    local.set(remote.id, boardObjectToCanvas(remote))
    return true
  }
  return false
}

export type BroadcastPayload =
  | { type: 'create'; object: BoardObject }
  | { type: 'update'; object: BoardObject }
  | { type: 'delete'; id: string }
