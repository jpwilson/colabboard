import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { acceptJoin, declineJoin } from './actions'
import { OrimLogo } from '@/components/ui/OrimLogo'

interface JoinPageProps {
  params: Promise<{ slug: string }>
}

export default async function JoinBoardPage({ params }: JoinPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/board/${slug}/join`)
  }

  // Look up board by slug
  const { data: board } = await supabase
    .from('boards')
    .select('id, slug, name, owner_id')
    .eq('slug', slug)
    .single()

  if (!board) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
        <div
          className="absolute rounded-full opacity-15 blur-3xl"
          style={{ left: '-8%', top: '-10%', width: 450, height: 450, background: 'var(--primary-light)', animation: 'float 8s ease-in-out infinite' }}
          aria-hidden
        />
        <div className="relative text-center">
          <OrimLogo size="md" />
          <h1 className="mt-6 text-xl font-bold text-slate-800">Board not found</h1>
          <p className="mt-2 text-sm text-slate-500">This board may have been deleted.</p>
          <a
            href="/dashboard"
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
          >
            Go to dashboard
          </a>
        </div>
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }`}</style>
      </main>
    )
  }

  // Owner always has access
  if (board.owner_id === user.id) {
    redirect(`/board/${board.slug}`)
  }

  // Check existing membership
  const { data: membership } = await supabase
    .from('board_members')
    .select('id, status, invited_by, message')
    .eq('board_id', board.id)
    .eq('user_id', user.id)
    .single()

  // Already accepted → go to board
  if (membership?.status === 'accepted') {
    redirect(`/board/${board.slug}`)
  }

  // Get inviter info if available
  let inviterName: string | null = null
  if (membership?.invited_by) {
    const { data: inviter } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', membership.invited_by)
      .single()
    inviterName = inviter?.display_name || null
  }

  // Get board owner name
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', board.owner_id)
    .single()
  const ownerName = ownerProfile?.display_name || 'someone'

  // Bind server actions with board data
  const boundAccept = acceptJoin.bind(null, board.id, board.slug)
  const boundDecline = declineJoin.bind(null, board.id, board.slug)

  const statusLabel = membership?.status === 'declined' ? 'You previously declined this invitation.' : null

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Background decorations */}
      <div
        className="absolute rounded-full opacity-15 blur-3xl"
        style={{ left: '-8%', top: '-10%', width: 450, height: 450, background: 'var(--primary-light)', animation: 'float 8s ease-in-out infinite' }}
        aria-hidden
      />
      <div
        className="absolute rounded-full opacity-15 blur-3xl"
        style={{ right: '-5%', bottom: '10%', width: 350, height: 350, background: 'var(--accent)', animation: 'float 10s ease-in-out infinite 1s' }}
        aria-hidden
      />

      <div className="relative mx-4 w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-white/30 bg-white/60 p-8 shadow-xl backdrop-blur-lg">
          <div className="text-center">
            <OrimLogo size="md" />

            <h1 className="mt-6 text-2xl font-bold text-slate-800">Join Board</h1>

            <div className="mt-4 rounded-xl bg-white/50 p-4">
              <p className="text-lg font-semibold text-slate-700">{board.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {inviterName
                  ? `${inviterName} invited you to collaborate`
                  : `Created by ${ownerName}`}
              </p>
            </div>

            {membership?.message && (
              <div className="mt-3 rounded-lg bg-amber-50/80 px-4 py-3 text-left">
                <p className="text-xs font-medium text-amber-700">Message from inviter:</p>
                <p className="mt-1 text-sm text-amber-900">{membership.message}</p>
              </div>
            )}

            {statusLabel && (
              <p className="mt-3 text-xs text-slate-400">{statusLabel}</p>
            )}

            <div className="mt-6 flex gap-3">
              <form action={boundDecline} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
                >
                  Decline
                </button>
              </form>
              <form action={boundAccept} className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
                >
                  Accept & Join
                </button>
              </form>
            </div>

            <a
              href="/dashboard"
              className="mt-4 inline-block text-xs text-slate-400 transition hover:text-slate-600"
            >
              Back to dashboard
            </a>
          </div>
        </div>
      </div>

      <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }`}</style>
    </main>
  )
}
