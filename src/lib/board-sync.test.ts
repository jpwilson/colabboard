import {
  boardObjectToCanvas,
  canvasToBoardObject,
  canvasToData,
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

    it('extracts extended properties from data', () => {
      const obj: BoardObject = {
        ...sampleBoardObject,
        type: 'circle',
        data: {
          fill: '#3b82f6',
          stroke: '#1e3a5f',
          strokeWidth: 2,
          opacity: 0.8,
          fontFamily: 'Inter, sans-serif',
        },
      }
      const result = boardObjectToCanvas(obj)
      expect(result.stroke).toBe('#1e3a5f')
      expect(result.strokeWidth).toBe(2)
      expect(result.opacity).toBe(0.8)
      expect(result.fontFamily).toBe('Inter, sans-serif')
    })

    it('extracts freedraw points from data', () => {
      const points = [0, 0, 10, 20, 30, 40]
      const obj: BoardObject = {
        ...sampleBoardObject,
        type: 'freedraw',
        data: { fill: 'transparent', points },
      }
      const result = boardObjectToCanvas(obj)
      expect(result.points).toEqual(points)
      expect(result.type).toBe('freedraw')
    })

    it('omits undefined optional properties', () => {
      const result = boardObjectToCanvas(sampleBoardObject)
      expect(result).not.toHaveProperty('stroke')
      expect(result).not.toHaveProperty('strokeWidth')
      expect(result).not.toHaveProperty('opacity')
      expect(result).not.toHaveProperty('fontFamily')
      expect(result).not.toHaveProperty('points')
    })
  })

  describe('canvasToData', () => {
    it('serializes only present properties', () => {
      const obj: CanvasObject = {
        id: 'obj-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: '#e2e8f0',
        z_index: 0,
        updated_at: '2026-01-01T00:00:00.000Z',
      }
      const data = canvasToData(obj)
      expect(data).toEqual({ fill: '#e2e8f0' })
    })

    it('includes all extended properties when present', () => {
      const obj: CanvasObject = {
        id: 'obj-1',
        type: 'circle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: '#3b82f6',
        stroke: '#1e3a5f',
        strokeWidth: 2,
        opacity: 0.5,
        fontFamily: 'Caveat, cursive',
        text: 'Hello',
        points: [0, 0, 10, 10],
        z_index: 0,
        updated_at: '2026-01-01T00:00:00.000Z',
      }
      const data = canvasToData(obj)
      expect(data).toEqual({
        fill: '#3b82f6',
        stroke: '#1e3a5f',
        strokeWidth: 2,
        opacity: 0.5,
        fontFamily: 'Caveat, cursive',
        text: 'Hello',
        points: [0, 0, 10, 10],
      })
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

    it('serializes extended properties into data', () => {
      const canvas: CanvasObject = {
        id: 'obj-1',
        type: 'circle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: '#3b82f6',
        stroke: '#1e3a5f',
        strokeWidth: 2,
        opacity: 0.7,
        z_index: 0,
        updated_at: '2026-01-01T00:00:00.000Z',
      }

      const result = canvasToBoardObject(canvas, 'board-1', 'user-1')
      const data = result.data as Record<string, unknown>
      expect(data.fill).toBe('#3b82f6')
      expect(data.stroke).toBe('#1e3a5f')
      expect(data.strokeWidth).toBe(2)
      expect(data.opacity).toBe(0.7)
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
