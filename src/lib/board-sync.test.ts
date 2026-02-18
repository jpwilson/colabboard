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

    it('extracts connector properties from data', () => {
      const obj: BoardObject = {
        ...sampleBoardObject,
        type: 'connector',
        data: { fill: 'transparent', fromId: 'src-1', toId: 'dst-1', connectorStyle: 'arrow-end' },
      }
      const result = boardObjectToCanvas(obj)
      expect(result.fromId).toBe('src-1')
      expect(result.toId).toBe('dst-1')
      expect(result.connectorStyle).toBe('arrow-end')
    })

    it('extracts rotation from data', () => {
      const obj: BoardObject = {
        ...sampleBoardObject,
        data: { fill: '#aaa', rotation: 45 },
      }
      const result = boardObjectToCanvas(obj)
      expect(result.rotation).toBe(45)
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

    it('serializes connector properties into data', () => {
      const obj: CanvasObject = {
        id: 'conn-1',
        type: 'connector',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: 'transparent',
        fromId: 'a',
        toId: 'b',
        connectorStyle: 'arrow-both',
        z_index: 0,
        updated_at: '2026-01-01T00:00:00.000Z',
      }
      const data = canvasToData(obj)
      expect(data.fromId).toBe('a')
      expect(data.toId).toBe('b')
      expect(data.connectorStyle).toBe('arrow-both')
    })

    it('serializes non-zero rotation into data', () => {
      const obj: CanvasObject = {
        id: 'obj-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: '#e2e8f0',
        rotation: 90,
        z_index: 0,
        updated_at: '2026-01-01T00:00:00.000Z',
      }
      const data = canvasToData(obj)
      expect(data.rotation).toBe(90)
    })

    it('omits rotation when it is 0', () => {
      const obj: CanvasObject = {
        id: 'obj-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: '#e2e8f0',
        rotation: 0,
        z_index: 0,
        updated_at: '2026-01-01T00:00:00.000Z',
      }
      const data = canvasToData(obj)
      expect(data).not.toHaveProperty('rotation')
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

    it('round-trips connector properties through serialization', () => {
      const canvas: CanvasObject = {
        id: 'conn-1',
        type: 'connector',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: 'transparent',
        fromId: 'obj-a',
        toId: 'obj-b',
        connectorStyle: 'arrow-start',
        z_index: 5,
        updated_at: '2026-01-01T00:00:00.000Z',
      }

      const boardObj = canvasToBoardObject(canvas, 'board-1', 'user-1')
      const data = boardObj.data as Record<string, unknown>
      expect(data.fromId).toBe('obj-a')
      expect(data.toId).toBe('obj-b')
      expect(data.connectorStyle).toBe('arrow-start')
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

    it('does not update when timestamps are equal', () => {
      const local = new Map<string, CanvasObject>()
      local.set('obj-1', boardObjectToCanvas(sampleBoardObject))

      const sameTime: BoardObject = {
        ...sampleBoardObject,
        x: 999,
        updated_at: '2026-01-01T00:00:00.000Z',
      }

      const changed = lwwMerge(local, sameTime)

      expect(changed).toBe(false)
      expect(local.get('obj-1')!.x).toBe(100)
    })
  })
})
