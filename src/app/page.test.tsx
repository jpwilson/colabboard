import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from './page'

test('landing page renders the app name', () => {
  render(<Page />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Orim/i)
})

test('landing page renders the tagline', () => {
  render(<Page />)
  expect(screen.getByText(/collaborative whiteboard/i)).toBeInTheDocument()
})
