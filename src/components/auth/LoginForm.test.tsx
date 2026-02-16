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
    },
  }),
}))

describe('LoginForm', () => {
  it('renders sign-in form with email and password fields', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders OAuth buttons', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
  })

  it('toggles between sign-in and sign-up mode', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /sign up/i }))
    expect(screen.getByText('Create a new account')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
  })
})
