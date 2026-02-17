import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'
import Link from 'next/link'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Floating background shapes — same style as landing page */}
      <div
        className="absolute rounded-full opacity-20 blur-3xl"
        style={{ left: '-10%', top: '-5%', width: 500, height: 500, background: 'var(--primary-light)', animation: 'float 8s ease-in-out infinite' }}
        aria-hidden
      />
      <div
        className="absolute rounded-full opacity-20 blur-3xl"
        style={{ right: '-8%', top: '20%', width: 400, height: 400, background: 'var(--accent)', animation: 'float 10s ease-in-out infinite 1s' }}
        aria-hidden
      />
      <div
        className="absolute rounded-full opacity-20 blur-3xl"
        style={{ bottom: '10%', left: '30%', width: 350, height: 350, background: 'var(--teal)', animation: 'float 9s ease-in-out infinite 2s' }}
        aria-hidden
      />

      {/* Navigation */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <svg viewBox="0 0 40 40" className="h-5 w-5" fill="none">
                <circle cx="12" cy="20" r="9" fill="#e6a800" opacity="0.8" />
                <circle cx="20" cy="20" r="9" fill="#ffca28" opacity="0.8" />
                <circle cx="28" cy="20" r="9" fill="#ffd54f" opacity="0.8" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-800">Orim</span>
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative flex min-h-screen items-center justify-center px-4 pt-20 pb-8">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl border border-white/30 bg-white/50 p-8 shadow-2xl backdrop-blur-md sm:p-10">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            By signing in, you agree to our terms of service.
          </p>
        </div>
      </main>

      {/* Keyframe animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(10px) rotate(-1deg); }
        }
      `}</style>
    </div>
  )
}
