import { bench, describe } from 'vitest'

describe('Sync operations', () => {
  bench('serialize 500 board objects to JSON', () => {
    const objects = Array.from({ length: 500 }, (_, i) => ({
      id: `obj-${i}`,
      board_id: 'board-1',
      type: 'sticky_note',
      data: { fill: '#fef08a', text: `Note ${i}` },
      x: Math.random() * 5000,
      y: Math.random() * 5000,
      width: 150,
      height: 150,
      z_index: i,
      created_by: 'user-1',
      updated_at: new Date().toISOString(),
    }))
    JSON.stringify(objects)
  })

  bench('deserialize 500 board objects from JSON', () => {
    const json = JSON.stringify(
      Array.from({ length: 500 }, (_, i) => ({
        id: `obj-${i}`,
        board_id: 'board-1',
        type: 'sticky_note',
        data: { fill: '#fef08a', text: `Note ${i}` },
        x: Math.random() * 5000,
        y: Math.random() * 5000,
        width: 150,
        height: 150,
        z_index: i,
      })),
    )
    JSON.parse(json)
  })

  bench('diff local vs remote: 500 objects, 50 changes', () => {
    const local = new Map(
      Array.from({ length: 500 }, (_, i) => [
        `obj-${i}`,
        { id: `obj-${i}`, x: i, y: i, updated_at: '2026-01-01T00:00:00.000Z' },
      ]),
    )
    const remote = Array.from({ length: 500 }, (_, i) => ({
      id: `obj-${i}`,
      x: i < 50 ? i * 2 : i,
      y: i < 50 ? i * 2 : i,
      updated_at: i < 50 ? '2026-01-02T00:00:00.000Z' : '2026-01-01T00:00:00.000Z',
    }))
    remote.filter((r) => {
      const l = local.get(r.id)
      return !l || r.updated_at > l.updated_at
    })
  })

  bench('z-index reorder: sort 500 objects', () => {
    const objects = Array.from({ length: 500 }, (_, i) => ({
      id: `obj-${i}`,
      z_index: Math.floor(Math.random() * 1000),
    }))
    objects.sort((a, b) => a.z_index - b.z_index)
  })
})
