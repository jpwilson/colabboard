import {
  boardObjectToCanvas,
  canvasToBoardObject,
  lwwMerge,
  type BoardObject,
  type CanvasObject,
} from './board-sync'

describe('board-sync', () => {
  const sampleBoardObject: BoardObject = {
    id: 'obj-1',
    board_id: 'board-1',
    type: 'sticky_note',
    data: { fill: '#fef08a', text: 'Hello' },
    x: 100,
    y: 200,
    width: 150,
    height: 150,
    z_index: 0,
    created_by: 'user-1',
    updated_at: '2026-01-01T00:00:00.000Z',
  }

  describe('boardObjectToCanvas', () => {
    it('converts a board object to a canvas object', () => {
      const result = boardObjectToCanvas(sampleBoardObject)

      expect(result).toEqual({
        id: 'obj-1',
        type: 'sticky_note',
        x: 100,
        y: 200,
        width: 150,
        height: 150,
        fill: '#fef08a',
        text: 'Hello',
        z_index: 0,
        updated_at: '2026-01-01T00:00:00.000Z',
      })
    })

    it('uses default fill when data has no fill', () => {
      const obj: BoardObject = { ...sampleBoardObject, data: {} }
      const result = boardObjectToCanvas(obj)
      expect(result.fill).toBe('#e2e8f0')
    })
  })

  describe('canvasToBoardObject', () => {
    it('converts a canvas object to a board object', () => {
      const canvas: CanvasObject = {
        id: 'obj-1',
        type: 'sticky_note',
        x: 100,
        y: 200,
        width: 150,
        height: 150,
        fill: '#fef08a',
        text: 'Hello',
        z_index: 0,
        updated_at: '2026-01-01T00:00:00.000Z',
      }

      const result = canvasToBoardObject(canvas, 'board-1', 'user-1')

      expect(result.board_id).toBe('board-1')
      expect(result.created_by).toBe('user-1')
      expect(result.data).toEqual({ fill: '#fef08a', text: 'Hello' })
    })
  })

  describe('lwwMerge', () => {
    it('adds a new object when not in local map', () => {
      const local = new Map<string, CanvasObject>()
      const changed = lwwMerge(local, sampleBoardObject)

      expect(changed).toBe(true)
      expect(local.has('obj-1')).toBe(true)
    })

    it('updates when remote is newer', () => {
      const local = new Map<string, CanvasObject>()
      local.set('obj-1', boardObjectToCanvas(sampleBoardObject))

      const newer: BoardObject = {
        ...sampleBoardObject,
        x: 500,
        updated_at: '2026-01-02T00:00:00.000Z',
      }

      const changed = lwwMerge(local, newer)

      expect(changed).toBe(true)
      expect(local.get('obj-1')!.x).toBe(500)
    })

    it('does not update when remote is older', () => {
      const local = new Map<string, CanvasObject>()
      local.set('obj-1', {
        ...boardObjectToCanvas(sampleBoardObject),
        updated_at: '2026-01-03T00:00:00.000Z',
      })

      const older: BoardObject = {
        ...sampleBoardObject,
        x: 500,
        updated_at: '2026-01-02T00:00:00.000Z',
      }

      const changed = lwwMerge(local, older)

      expect(changed).toBe(false)
      expect(local.get('obj-1')!.x).toBe(100)
    })
  })
})
