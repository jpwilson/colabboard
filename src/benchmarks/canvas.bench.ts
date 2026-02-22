import { bench, describe } from 'vitest'

describe('Canvas operations', () => {
  bench('generate 500 objects', () => {
    Array.from({ length: 500 }, (_, i) => ({
      id: `obj-${i}`,
      type: 'sticky_note' as const,
      x: Math.random() * 5000,
      y: Math.random() * 5000,
      width: 150,
      height: 150,
      fill: '#EAB308',
      text: `Note ${i}`,
    }))
  })

  bench('viewport culling: filter visible from 500 objects', () => {
    const objects = Array.from({ length: 500 }, (_, i) => ({
      id: `obj-${i}`,
      x: Math.random() * 10000 - 5000,
      y: Math.random() * 10000 - 5000,
      width: 150,
      height: 150,
    }))
    const viewport = { x: 0, y: 0, width: 1920, height: 1080 }
    objects.filter(
      (obj) =>
        obj.x + obj.width > viewport.x &&
        obj.x < viewport.x + viewport.width &&
        obj.y + obj.height > viewport.y &&
        obj.y < viewport.y + viewport.height,
    )
  })

  bench('LWW merge: 100 remote updates into 500 objects', () => {
    const localObjects = new Map(
      Array.from({ length: 500 }, (_, i) => [
        `obj-${i}`,
        { id: `obj-${i}`, updated_at: '2026-01-01T00:00:00.000Z', x: i * 10, y: i * 10 },
      ]),
    )
    const remoteUpdates = Array.from({ length: 100 }, (_, i) => ({
      id: `obj-${i}`,
      updated_at: '2026-01-02T00:00:00.000Z',
      x: i * 20,
      y: i * 20,
    }))
    for (const update of remoteUpdates) {
      const local = localObjects.get(update.id)
      if (!local || update.updated_at > local.updated_at) {
        localObjects.set(update.id, update)
      }
    }
  })

  bench('batch cursor updates: 5 users at 60fps (300 updates)', () => {
    const cursors = new Map<string, { x: number; y: number; ts: number }>()
    for (let i = 0; i < 300; i++) {
      const userId = `user-${i % 5}`
      cursors.set(userId, { x: Math.random() * 5000, y: Math.random() * 5000, ts: Date.now() })
    }
  })
})
