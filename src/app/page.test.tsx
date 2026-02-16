import { expect, test, describe } from 'vitest'

describe('Home page', () => {
  test('exports a default component', async () => {
    const mod = await import('./page')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe('function')
  })
})
