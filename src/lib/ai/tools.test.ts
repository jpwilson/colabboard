import { aiTools } from './tools'

// Mock Supabase client
const mockSupabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        order: () => ({
          data: [
            {
              id: 'obj-1',
              type: 'sticky_note',
              x: 100,
              y: 100,
              width: 150,
              height: 150,
              data: { text: 'Hello', fill: '#EAB308' },
              z_index: 0,
            },
          ],
          error: null,
        }),
        in: () => ({
          data: [
            { id: 'obj-1', width: 150, height: 150 },
            { id: 'obj-2', width: 150, height: 150 },
          ],
          error: null,
        }),
        single: () => ({ data: null, error: null }),
      }),
    }),
  }),
} as unknown as Parameters<typeof aiTools>[1]

const boardId = 'test-board-id'

describe('aiTools', () => {
  const tools = aiTools(boardId, mockSupabase)

  describe('createStickyNote', () => {
    it('returns a create action with sticky note object', async () => {
      const result = await tools.createStickyNote.execute(
        { text: 'Hello World' },
        { toolCallId: 't1', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('create')
      expect(result.object.type).toBe('sticky_note')
      expect(result.object.text).toBe('Hello World')
      expect(result.object.id).toBeTruthy()
      expect(result.object.x).toBe(100)
      expect(result.object.y).toBe(100)
    })

    it('accepts custom position and color', async () => {
      const result = await tools.createStickyNote.execute(
        { text: 'Test', x: 200, y: 300, color: '#0066FF' },
        { toolCallId: 't2', messages: [], abortSignal: undefined as never },
      )
      expect(result.object.x).toBe(200)
      expect(result.object.y).toBe(300)
      expect(result.object.fill).toBe('#0066FF')
    })
  })

  describe('createShape', () => {
    it('creates a rectangle with defaults', async () => {
      const result = await tools.createShape.execute(
        { type: 'rectangle' },
        { toolCallId: 't3', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('create')
      expect(result.object.type).toBe('rectangle')
      expect(result.object.width).toBeGreaterThan(0)
      expect(result.object.height).toBeGreaterThan(0)
    })

    it('allows custom fill and stroke', async () => {
      const result = await tools.createShape.execute(
        { type: 'circle', fill: '#ff0000', stroke: '#0000ff', strokeWidth: 3 },
        { toolCallId: 't4', messages: [], abortSignal: undefined as never },
      )
      expect(result.object.fill).toBe('#ff0000')
      expect(result.object.stroke).toBe('#0000ff')
      expect(result.object.strokeWidth).toBe(3)
    })
  })

  describe('createFrame', () => {
    it('returns object and titleLabel', async () => {
      const result = await tools.createFrame.execute(
        { title: 'Strengths' },
        { toolCallId: 't5', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('create')
      expect(result.object.type).toBe('rectangle')
      expect(result.object.width).toBe(350)
      expect(result.titleLabel.type).toBe('sticky_note')
      expect(result.titleLabel.text).toBe('Strengths')
    })

    it('positions title label inside the frame', async () => {
      const result = await tools.createFrame.execute(
        { title: 'Test', x: 200, y: 200 },
        { toolCallId: 't6', messages: [], abortSignal: undefined as never },
      )
      expect(result.titleLabel.x).toBe(210) // frameX + 10
      expect(result.titleLabel.y).toBe(210) // frameY + 10
    })
  })

  describe('createConnector', () => {
    it('creates a connector between two objects', async () => {
      const result = await tools.createConnector.execute(
        { fromId: 'obj-1', toId: 'obj-2' },
        { toolCallId: 't7', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('create')
      expect(result.object.type).toBe('connector')
      expect(result.object.fromId).toBe('obj-1')
      expect(result.object.toId).toBe('obj-2')
      expect(result.object.connectorStyle).toBe('arrow-end')
    })
  })

  describe('moveObject', () => {
    it('returns an update action with new position', async () => {
      const result = await tools.moveObject.execute(
        { objectId: 'obj-1', x: 500, y: 600 },
        { toolCallId: 't8', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('update')
      expect(result.id).toBe('obj-1')
      expect(result.updates).toEqual({ x: 500, y: 600 })
    })
  })

  describe('resizeObject', () => {
    it('returns an update action with new dimensions', async () => {
      const result = await tools.resizeObject.execute(
        { objectId: 'obj-1', width: 300, height: 200 },
        { toolCallId: 't9', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('update')
      expect(result.id).toBe('obj-1')
      expect(result.updates).toEqual({ width: 300, height: 200 })
    })
  })

  describe('updateText', () => {
    it('returns an update action with new text', async () => {
      const result = await tools.updateText.execute(
        { objectId: 'obj-1', newText: 'Updated content' },
        { toolCallId: 't10', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('update')
      expect(result.id).toBe('obj-1')
      expect(result.updates).toEqual({ text: 'Updated content' })
    })
  })

  describe('changeColor', () => {
    it('returns an update action with new fill color', async () => {
      const result = await tools.changeColor.execute(
        { objectId: 'obj-1', color: '#0066FF' },
        { toolCallId: 't11', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('update')
      expect(result.id).toBe('obj-1')
      expect(result.updates).toEqual({ fill: '#0066FF' })
    })
  })

  describe('deleteObject', () => {
    it('returns a delete action with object ID', async () => {
      const result = await tools.deleteObject.execute(
        { objectId: 'obj-1' },
        { toolCallId: 't12', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('delete')
      expect(result.id).toBe('obj-1')
    })
  })

  describe('getBoardState', () => {
    it('returns a read action with objects', async () => {
      const result = await tools.getBoardState.execute(
        {},
        { toolCallId: 't13', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('read')
      expect(result.objects).toHaveLength(1)
      expect(result.objects[0].id).toBe('obj-1')
      expect(result.objects[0].text).toBe('Hello')
      expect(result.count).toBe(1)
    })
  })

  describe('arrangeObjects', () => {
    it('arranges objects horizontally', async () => {
      const result = await tools.arrangeObjects.execute(
        { objectIds: ['obj-1', 'obj-2'], layout: 'horizontal' },
        { toolCallId: 't14', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('batch_update')
      expect(result.batchUpdates).toHaveLength(2)
      expect(result.batchUpdates[0].updates.x).toBe(100)
      expect(result.batchUpdates[0].updates.y).toBe(100)
      // Second object offset by width + gap
      expect(result.batchUpdates[1].updates.x).toBe(270) // 100 + 150 + 20
    })

    it('arranges objects vertically', async () => {
      const result = await tools.arrangeObjects.execute(
        { objectIds: ['obj-1', 'obj-2'], layout: 'vertical', startX: 50, startY: 50 },
        { toolCallId: 't15', messages: [], abortSignal: undefined as never },
      )
      expect(result.action).toBe('batch_update')
      expect(result.batchUpdates[0].updates).toEqual({ x: 50, y: 50 })
      expect(result.batchUpdates[1].updates).toEqual({ x: 50, y: 220 }) // 50 + 150 + 20
    })
  })
})
