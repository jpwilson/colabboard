'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrimLogo } from '@/components/ui/OrimLogo'

type AuthMode = 'sign-in' | 'sign-up'
type AuthMethod = 'magic-link' | 'password'

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [method, setMethod] = useState<AuthMethod>('magic-link')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showGraders, setShowGraders] = useState(false)
  const [graderLoading, setGraderLoading] = useState<number | null>(null)

  const supabase = createClient()

  async function handleOAuth(provider: 'google' | 'github') {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setError(error.message)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      setMessage('Check your email for a sign-in link.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'sign-up') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setMessage('Check your email for a confirmation link.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleGraderSignIn(graderNumber: number) {
    setError(null)
    setMessage(null)
    setGraderLoading(graderNumber)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `grader${graderNumber}@orim.test`,
        password: 'grader-eval-2026',
      })
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Grader sign-in failed',
      )
    } finally {
      setGraderLoading(null)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mb-3 flex justify-center">
          <OrimLogo size="lg" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">
          {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {mode === 'sign-in'
            ? 'Sign in to continue to Orim'
            : 'Get started with Orim for free'}
        </p>
      </div>

      {/* OAuth Buttons */}
      <div className="space-y-3">
        <button
          onClick={() => handleOAuth('google')}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/80" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-transparent px-3 text-slate-400">or</span>
        </div>
      </div>

      {/* Method toggle — only show in sign-in mode */}
      {mode === 'sign-in' && (
        <div className="flex rounded-xl bg-slate-100/80 p-1">
          <button
            onClick={() => { setMethod('magic-link'); setError(null); setMessage(null) }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              method === 'magic-link'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Magic link
          </button>
          <button
            onClick={() => { setMethod('password'); setError(null); setMessage(null) }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              method === 'password'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Password
          </button>
        </div>
      )}

      {/* Magic link form */}
      {mode === 'sign-in' && method === 'magic-link' ? (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label htmlFor="email-magic" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email-magic"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}
          {message && (
            <p className="text-sm text-green-600" role="status">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-xl disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>
      ) : (
        /* Email/password form */
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label htmlFor="email-pw" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email-pw"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="block w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}
          {message && (
            <p className="text-sm text-green-600" role="status">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-xl disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? 'Loading...' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
      )}

      {/* Toggle sign-in / sign-up */}
      <p className="text-center text-sm text-slate-500">
        {mode === 'sign-in' ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
            setMethod(mode === 'sign-in' ? 'password' : 'magic-link')
            setError(null)
            setMessage(null)
          }}
          className="font-medium text-primary hover:text-primary-dark"
        >
          {mode === 'sign-in' ? 'Sign up' : 'Sign in'}
        </button>
      </p>

      {/* Grader Quick Access */}
      <div className="border-t border-slate-200/60 pt-4">
        <button
          onClick={() => setShowGraders(!showGraders)}
          className="flex w-full items-center justify-between text-sm text-slate-400 transition hover:text-slate-600"
        >
          <span className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              G4
            </span>
            Evaluator Quick Access
          </span>
          <svg
            className={`h-4 w-4 transition-transform ${showGraders ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showGraders && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-400">
              Temporary accounts for assignment graders. Click to sign in
              instantly as a unique test user.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => handleGraderSignIn(n)}
                  disabled={graderLoading !== null}
                  className="flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50"
                >
                  {graderLoading === n ? (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    `Grader ${n}`
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
