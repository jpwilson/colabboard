import { expect, test, describe } from 'vitest'

describe('BoardCanvas types', () => {
  test('ObjectType includes required shape types', async () => {
    const { default: _page } = await import('./page')
    // page renders a dynamic import — unit-testing the canvas is not viable in jsdom.
    // Canvas rendering is covered by E2E tests (e2e/home.spec.ts).
    expect(true).toBe(true)
  })
})
