import { describe, it, expect } from 'vitest'
import {
  getAllDomains,
  getDomainPack,
  getTemplateInstructions,
  getAllTemplateNames,
} from './template-registry'

describe('template-registry', () => {
  it('returns all 6 domain packs', () => {
    const domains = getAllDomains()
    expect(domains).toHaveLength(6)
    const ids = domains.map((d) => d.id)
    expect(ids).toEqual(['general', 'business', 'product', 'engineering', 'education', 'science'])
  })

  it('each domain pack has required fields', () => {
    for (const pack of getAllDomains()) {
      expect(pack.id).toBeTruthy()
      expect(pack.name).toBeTruthy()
      expect(pack.icon).toBeTruthy()
      expect(pack.templates.length).toBeGreaterThan(0)
      expect(pack.editPrompts.length).toBeGreaterThan(0)
      expect(pack.layoutPrompts.length).toBeGreaterThan(0)
    }
  })

  it('each template has all required fields', () => {
    for (const pack of getAllDomains()) {
      for (const t of pack.templates) {
        expect(t.id).toBeTruthy()
        expect(t.name).toBeTruthy()
        expect(t.domain).toBe(pack.id)
        expect(t.description).toBeTruthy()
        expect(t.prompt).toBeTruthy()
        expect(t.instructions).toBeTruthy()
      }
    }
  })

  it('has no duplicate template IDs across all packs', () => {
    const allIds = getAllDomains().flatMap((d) => d.templates.map((t) => t.id))
    const unique = new Set(allIds)
    expect(unique.size).toBe(allIds.length)
  })

  it('getDomainPack returns correct pack', () => {
    const general = getDomainPack('general')
    expect(general).toBeDefined()
    expect(general!.id).toBe('general')
    expect(general!.templates).toHaveLength(8)
  })

  it('getDomainPack returns undefined for unknown domain', () => {
    expect(getDomainPack('nonexistent')).toBeUndefined()
  })

  it('getTemplateInstructions returns instructions for valid domain', () => {
    const instructions = getTemplateInstructions('general')
    expect(instructions).toContain('SWOT')
    expect(instructions).toContain('Kanban')
    expect(instructions).toContain('Flowchart')
  })

  it('getTemplateInstructions returns empty string for invalid domain', () => {
    expect(getTemplateInstructions('nonexistent')).toBe('')
  })

  it('getAllTemplateNames returns all template names as lowercase', () => {
    const names = getAllTemplateNames()
    expect(names.length).toBeGreaterThanOrEqual(36)
    for (const name of names) {
      expect(name).toBe(name.toLowerCase())
    }
  })

  it('general pack contains the original 8 templates', () => {
    const general = getDomainPack('general')!
    const names = general.templates.map((t) => t.id)
    expect(names).toContain('swot')
    expect(names).toContain('kanban')
    expect(names).toContain('retrospective')
    expect(names).toContain('mindmap')
    expect(names).toContain('flowchart')
    expect(names).toContain('timeline')
    expect(names).toContain('pros-cons')
    expect(names).toContain('decision-matrix')
  })

  it('business pack has Business Model Canvas', () => {
    const biz = getDomainPack('business')!
    const bmc = biz.templates.find((t) => t.id === 'bmc')
    expect(bmc).toBeDefined()
    expect(bmc!.name).toBe('Business Model Canvas')
    expect(bmc!.instructions).toContain('Key Partners')
    expect(bmc!.instructions).toContain('Revenue Streams')
  })
})
