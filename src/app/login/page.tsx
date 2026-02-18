import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'
import { OrimLogo } from '@/components/ui/OrimLogo'
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
      {/* Floating background shapes */}
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
          <Link href="/">
            <OrimLogo size="md" />
          </Link>
        </div>
      </nav>

      {/* Main content — split layout on lg+ */}
      <main className="relative flex min-h-screen items-center justify-center px-4 pt-20 pb-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-24 xl:gap-36">
          {/* Left: Sign-in card */}
          <div className="w-full max-w-md lg:flex-shrink-0">
            <div className="overflow-hidden rounded-2xl border border-white/30 bg-white/50 p-8 shadow-2xl backdrop-blur-md sm:p-10">
              <LoginForm />
            </div>
            <p className="mt-6 text-center text-sm text-slate-500">
              By signing in, you agree to our terms of service.
            </p>
          </div>

          {/* Right: Feature highlights — lg+ only */}
          <div className="hidden flex-1 lg:block">
            <div className="space-y-6">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Real-time collaboration
                </div>
                <h2 className="text-3xl font-bold leading-tight text-slate-800 xl:text-4xl">
                  Brainstorm together,{' '}
                  <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                    in real time
                  </span>
                </h2>
                <p className="mt-3 max-w-lg text-base text-slate-600">
                  Orim is the collaborative whiteboard where teams think, plan, and create together.
                </p>
              </div>

              {/* Feature list */}
              <div className="space-y-4">
                <FeatureItem
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                    </svg>
                  }
                  title="Real-time cursors"
                  description="See your teammates' cursors move live"
                />
                <FeatureItem
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  }
                  title="Sticky notes & shapes"
                  description="Express ideas with colorful notes and shapes"
                />
                <FeatureItem
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  }
                  title="Instant sync"
                  description="Every change syncs across all clients instantly"
                />
                <FeatureItem
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  }
                  title="Infinite canvas"
                  description="Pan and zoom freely — no limits on space"
                />
              </div>

              {/* Mini canvas preview */}
              <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-white/40 p-2 shadow-lg backdrop-blur-md">
                <div className="rounded-xl bg-slate-50/80 p-6">
                  <div className="relative h-40 w-full overflow-hidden rounded-lg bg-white shadow-inner">
                    <div
                      className="absolute inset-0 opacity-[0.04]"
                      style={{
                        backgroundImage: 'linear-gradient(#1a2b3c 1px, transparent 1px), linear-gradient(90deg, #1a2b3c 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                      }}
                    />
                    <div className="absolute left-[8%] top-[15%] h-16 w-20 rounded-lg bg-accent/70 p-2 shadow-md">
                      <p className="text-[8px] font-medium text-slate-800">Research notes</p>
                    </div>
                    <div className="absolute left-[40%] top-[25%] h-16 w-20 rounded-lg bg-primary-light/50 p-2 shadow-md">
                      <p className="text-[8px] font-medium text-slate-800">Sprint plan</p>
                    </div>
                    <div className="absolute right-[12%] top-[40%] h-16 w-20 rounded-lg bg-teal/30 p-2 shadow-md">
                      <p className="text-[8px] font-medium text-slate-800">Design ideas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  )
}
