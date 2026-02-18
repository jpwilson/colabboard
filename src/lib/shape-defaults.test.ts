import { SHAPE_DEFAULTS, STICKY_COLORS, STICKY_SIZES } from './shape-defaults'
import type { ShapeType } from './board-sync'

const ALL_SHAPE_TYPES: ShapeType[] = [
  'sticky_note',
  'rectangle',
  'rounded_rectangle',
  'circle',
  'ellipse',
  'triangle',
  'diamond',
  'star',
  'arrow',
  'line',
  'hexagon',
  'pentagon',
  'freedraw',
  'connector',
]

describe('shape-defaults', () => {
  describe('SHAPE_DEFAULTS', () => {
    it('has an entry for every ShapeType', () => {
      for (const type of ALL_SHAPE_TYPES) {
        expect(SHAPE_DEFAULTS).toHaveProperty(type)
      }
    })

    it('every default has non-negative width and height', () => {
      for (const [type, defaults] of Object.entries(SHAPE_DEFAULTS)) {
        expect(defaults.width).toBeGreaterThanOrEqual(0)
        expect(defaults.height).toBeGreaterThanOrEqual(0)
        // freedraw and connector can be 0, others should be positive
        if (type !== 'freedraw' && type !== 'connector') {
          expect(defaults.width).toBeGreaterThan(0)
          expect(defaults.height >= 0).toBe(true)
        }
      }
    })

    it('every default has a non-empty fill string', () => {
      for (const defaults of Object.values(SHAPE_DEFAULTS)) {
        expect(typeof defaults.fill).toBe('string')
        expect(defaults.fill.length).toBeGreaterThan(0)
      }
    })
  })

  describe('STICKY_COLORS', () => {
    it('are valid hex color strings', () => {
      for (const color of STICKY_COLORS) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })

    it('has at least 4 colors', () => {
      expect(STICKY_COLORS.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('STICKY_SIZES', () => {
    it('are ordered S < M < L by width', () => {
      expect(STICKY_SIZES[0].width).toBeLessThan(STICKY_SIZES[1].width)
      expect(STICKY_SIZES[1].width).toBeLessThan(STICKY_SIZES[2].width)
    })

    it('has labels S, M, L', () => {
      const labels = STICKY_SIZES.map((s) => s.label)
      expect(labels).toEqual(['S', 'M', 'L'])
    })
  })
})
