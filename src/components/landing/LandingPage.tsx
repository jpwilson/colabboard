'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { OrimLogo } from '@/components/ui/OrimLogo'

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.unobserve(el)
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, inView }
}

function FloatingShape({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full opacity-20 blur-3xl ${className}`}
      aria-hidden
    />
  )
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border border-white/30 bg-white/40 p-6 shadow-lg backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  )
}

function StepCard({ step, title, desc, delay }: { step: string; title: string; desc: string; delay: number }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className="text-center transition-all duration-500"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-lg shadow-primary/25">
        {step}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-600">{desc}</p>
    </div>
  )
}

export function LandingPage() {
  const { ref: heroRef } = useInView(0.05)
  const { ref: mobileRef, inView: mobileInView } = useInView()

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Floating background shapes */}
      <FloatingShape className="left-[-10%] top-[-5%] h-[500px] w-[500px] bg-primary-light animate-[float_8s_ease-in-out_infinite]" />
      <FloatingShape className="right-[-8%] top-[20%] h-[400px] w-[400px] bg-accent animate-[float_10s_ease-in-out_infinite_1s]" />
      <FloatingShape className="bottom-[10%] left-[30%] h-[350px] w-[350px] bg-teal animate-[float_9s_ease-in-out_infinite_2s]" />

      {/* Navigation */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <OrimLogo size="md" />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/50"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark hover:shadow-md"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative flex min-h-screen items-center justify-center px-6 pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <div
            className="animate-[fadeUp_0.7s_ease-out_both]"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Real-time collaboration
            </div>
            <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-slate-800 sm:text-6xl md:text-7xl">
              Brainstorm together,{' '}
              <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                in real time
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              Orim is the collaborative whiteboard where teams think, plan, and create together.
              Drop sticky notes, draw shapes, and see everyone&apos;s cursors move live.
            </p>
          </div>

          <div
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-[fadeUp_0.7s_ease-out_0.2s_both]"
          >
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30"
            >
              Start collaborating
              <svg className="h-5 w-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/60 px-8 py-3.5 text-base font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            >
              See features
            </a>
          </div>

          {/* Hero preview */}
          <div
            className="mt-16 animate-[fadeScale_1s_ease-out_0.5s_both]"
          >
            <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/30 bg-white/50 p-2 shadow-2xl backdrop-blur-md">
              <div className="rounded-xl bg-slate-50 p-8">
                {/* Mock canvas */}
                <div className="relative h-64 w-full overflow-hidden rounded-lg bg-white shadow-inner sm:h-80">
                  {/* Grid pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                      backgroundImage:
                        'linear-gradient(#1a2b3c 1px, transparent 1px), linear-gradient(90deg, #1a2b3c 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                  {/* Sticky notes */}
                  <div className="absolute left-[10%] top-[15%] h-24 w-28 rounded-lg bg-accent/80 p-3 shadow-md sm:h-28 sm:w-32 animate-[popIn_0.6s_ease-out_0.8s_both]">
                    <p className="text-xs font-medium text-slate-800">User research findings</p>
                  </div>
                  <div className="absolute left-[45%] top-[20%] h-24 w-28 rounded-lg bg-primary-light/60 p-3 shadow-md sm:h-28 sm:w-32 animate-[popIn_0.6s_ease-out_1s_both]">
                    <p className="text-xs font-medium text-slate-800">Sprint planning Q2</p>
                  </div>
                  <div className="absolute right-[10%] top-[40%] h-24 w-28 rounded-lg bg-teal/40 p-3 shadow-md sm:h-28 sm:w-32 animate-[popIn_0.6s_ease-out_1.2s_both]">
                    <p className="text-xs font-medium text-slate-800">Design review notes</p>
                  </div>
                  {/* Animated cursors */}
                  <div className="absolute animate-[cursorAlice_4s_ease-in-out_1.5s_infinite]" style={{ left: '60%', top: '30%' }}>
                    <svg className="h-4 w-4 -rotate-12 text-primary" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5.65 5.65l3.57 12.5 2.46-4.91 4.91-2.46L5.65 5.65z" />
                    </svg>
                    <span className="ml-3 -mt-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-white whitespace-nowrap">
                      Alice
                    </span>
                  </div>
                  <div className="absolute animate-[cursorBob_5s_ease-in-out_2s_infinite]" style={{ left: '25%', top: '55%' }}>
                    <svg className="h-4 w-4 -rotate-12 text-teal" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5.65 5.65l3.57 12.5 2.46-4.91 4.91-2.46L5.65 5.65z" />
                    </svg>
                    <span className="ml-3 -mt-1 rounded-full bg-teal px-2 py-0.5 text-[10px] font-medium text-slate-800 whitespace-nowrap">
                      Bob
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-800 sm:text-4xl">
              Everything you need to collaborate
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              A powerful whiteboard with real-time sync, built for teams that think visually.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              delay={0}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                </svg>
              }
              title="Real-time cursors"
              description="See exactly where your teammates are working. Live cursor tracking with names and colors makes collaboration feel natural."
            />
            <FeatureCard
              delay={100}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              }
              title="Sticky notes & shapes"
              description="Express ideas with colorful sticky notes and rectangles. Resize, reposition, and organize your thoughts on an infinite canvas."
            />
            <FeatureCard
              delay={200}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              }
              title="Instant sync"
              description="Every change syncs instantly across all connected clients. No save button needed — everything updates in real time."
            />
            <FeatureCard
              delay={300}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
              title="Team workspaces"
              description="Create boards and invite your team. Control access with owner, editor, and viewer roles to keep things organized."
            />
            <FeatureCard
              delay={400}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              }
              title="Infinite canvas"
              description="Pan and zoom freely across an unlimited workspace. No more running out of space — your canvas grows with your ideas."
            />
            <FeatureCard
              delay={500}
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              }
              title="Conflict resolution"
              description="Last-write-wins merge strategy ensures no work is lost when multiple people edit the same object simultaneously."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-800 sm:text-4xl">
              Up and running in seconds
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              No complex setup. Sign in, create a board, and start collaborating.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <StepCard step="1" title="Create a board" desc="Sign up and create your first board in one click." delay={0} />
            <StepCard step="2" title="Invite your team" desc="Share the link and your team joins instantly." delay={150} />
            <StepCard step="3" title="Collaborate live" desc="Add notes, draw shapes, and brainstorm together in real time." delay={300} />
          </div>
        </div>
      </section>

      {/* Mobile Apps Coming Soon */}
      <section className="relative px-6 py-24">
        <div
          ref={mobileRef}
          className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/30 bg-white/40 p-8 text-center shadow-xl backdrop-blur-md sm:p-12 transition-all duration-700"
          style={{
            opacity: mobileInView ? 1 : 0,
            transform: mobileInView ? 'translateY(0)' : 'translateY(32px)',
          }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-1.5 text-sm font-semibold text-accent-dark">
            Coming soon
          </div>
          <h2 className="mb-4 text-3xl font-bold text-slate-800 sm:text-4xl">
            Take Orim everywhere
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-slate-600">
            Collaborate on the go with native iOS and Android apps. Get notified when your team updates a board and jump right in.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {/* App Store button */}
            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-6 py-3 shadow-sm backdrop-blur-sm">
              <svg className="h-8 w-8 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Download on the</p>
                <p className="text-base font-semibold text-slate-800">App Store</p>
              </div>
            </div>

            {/* Google Play button */}
            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-6 py-3 shadow-sm backdrop-blur-sm">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
                <path d="M3.61 1.814L13.793 12 3.61 22.186a.996.996 0 01-.61-.92V2.734c0-.384.22-.72.61-.92z" fill="#4285F4" />
                <path d="M17.09 8.362L5.016.684C4.56.408 4.025.356 3.61 1.814l10.184 10.184 3.297-3.636z" fill="#34A853" />
                <path d="M3.61 22.186c.415 1.458.95 1.406 1.406 1.13l12.074-7.678-3.297-3.636L3.61 22.186z" fill="#EA4335" />
                <path d="M20.847 10.457l-3.758-2.095-3.297 3.636 3.297 3.636 3.758-2.095c.665-.37 1.065-1.05 1.065-1.541s-.4-1.17-1.065-1.541z" fill="#FBBC05" />
              </svg>
              <div className="text-left">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Get it on</p>
                <p className="text-base font-semibold text-slate-800">Google Play</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-slate-800 sm:text-4xl">
            Ready to start collaborating?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-slate-600">
            Join teams using Orim to brainstorm, plan, and design together in real time.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30"
          >
            Get started free
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/20 bg-white/30 px-6 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <OrimLogo size="sm" />
          <p className="text-sm text-slate-500">Built for Gauntlet G4 Week 1</p>
        </div>
      </footer>

      {/* Keyframe animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(10px) rotate(-1deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeScale {
          from { opacity: 0; transform: translateY(50px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes cursorAlice {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-40px, 20px); }
          50% { transform: translate(20px, -10px); }
          75% { transform: translate(-10px, -20px); }
        }
        @keyframes cursorBob {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(30px, -15px); }
          40% { transform: translate(-20px, 25px); }
          60% { transform: translate(15px, 10px); }
          80% { transform: translate(-25px, -10px); }
        }
      `}</style>
    </div>
  )
}
