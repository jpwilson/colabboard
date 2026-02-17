import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { LoginForm } from './LoginForm'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signInWithOtp: vi.fn(),
    },
  }),
}))

describe('LoginForm', () => {
  it('renders magic link form by default with email field', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument()
  })

  it('shows password field when password tab is selected', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.click(screen.getByRole('button', { name: /^password$/i }))
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('renders OAuth buttons', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
  })

  it('toggles between sign-in and sign-up mode', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    expect(screen.getByText('Sign in to continue to Orim')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /sign up/i }))
    expect(screen.getByText('Get started with Orim for free')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText('Sign in to continue to Orim')).toBeInTheDocument()
  })
})
