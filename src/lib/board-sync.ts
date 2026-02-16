import type { Json } from '@/types/database'

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
  type: 'sticky_note' | 'rectangle'
  x: number
  y: number
  width: number
  height: number
  fill: string
  text?: string
  z_index: number
  updated_at: string
}

export function boardObjectToCanvas(obj: BoardObject): CanvasObject {
  const data = (obj.data || {}) as Record<string, unknown>
  return {
    id: obj.id,
    type: obj.type as CanvasObject['type'],
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    fill: (data.fill as string) || '#e2e8f0',
    text: data.text as string | undefined,
    z_index: obj.z_index,
    updated_at: obj.updated_at,
  }
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
    data: { fill: obj.fill, text: obj.text || '' },
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
