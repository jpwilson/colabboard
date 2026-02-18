import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createBoard, deleteBoard, renameBoard } from './actions'
import { NewBoardButton } from './NewBoardButton'
import { BoardCard } from './BoardCard'
import { OrimLogo } from '@/components/ui/OrimLogo'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch boards where user is owner or member
  const { data: memberRows } = await supabase
    .from('board_members')
    .select('board_id')
    .eq('user_id', user.id)

  const memberBoardIds = (memberRows || []).map((r) => r.board_id)

  // Also include boards the user owns (they might not have a board_members row)
  const { data: boards } = await supabase
    .from('boards')
    .select('id, slug, name, owner_id, updated_at, board_members(count), profiles!owner_id(display_name)')
    .or(`owner_id.eq.${user.id}${memberBoardIds.length > 0 ? `,id.in.(${memberBoardIds.join(',')})` : ''}`)
    .order('updated_at', { ascending: false })

  const ownedBoards = (boards || []).filter((b) => b.owner_id === user.id)
  const sharedBoards = (boards || []).filter((b) => b.owner_id !== user.id)

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Floating background shapes */}
      <div
        className="absolute rounded-full opacity-15 blur-3xl"
        style={{ left: '-8%', top: '-10%', width: 450, height: 450, background: 'var(--primary-light)', animation: 'float 8s ease-in-out infinite' }}
        aria-hidden
      />
      <div
        className="absolute rounded-full opacity-15 blur-3xl"
        style={{ right: '-5%', top: '30%', width: 350, height: 350, background: 'var(--accent)', animation: 'float 10s ease-in-out infinite 1s' }}
        aria-hidden
      />
      <div
        className="absolute rounded-full opacity-15 blur-3xl"
        style={{ bottom: '5%', left: '40%', width: 300, height: 300, background: 'var(--teal)', animation: 'float 9s ease-in-out infinite 2s' }}
        aria-hidden
      />

      {/* Navigation */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white/20 bg-white/60 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/dashboard">
            <OrimLogo size="md" />
          </a>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-white/50 hover:text-slate-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative mx-auto max-w-6xl px-6 pt-24 pb-12">
        {/* Your Boards */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Your Boards</h2>
            <p className="mt-1 text-sm text-slate-500">Boards you own</p>
          </div>
          <NewBoardButton action={createBoard} />
        </div>

        {ownedBoards.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ownedBoards.map((board) => {
              const memberCount =
                board.board_members && Array.isArray(board.board_members)
                  ? (board.board_members[0] as { count: number })?.count ?? 0
                  : 0
              return (
                <BoardCard
                  key={board.id}
                  board={board}
                  memberCount={memberCount}
                  isOwner={true}
                  renameAction={renameBoard}
                  deleteAction={deleteBoard}
                />
              )
            })}
          </div>
        ) : (
          <div className="mt-16 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/50 shadow-lg backdrop-blur-md">
              <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V4.5a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v15a1.5 1.5 0 001.5 1.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No boards yet</h3>
            <p className="mt-1 text-sm text-slate-500">Create your first board to start collaborating!</p>
            <div className="mt-6">
              <NewBoardButton action={createBoard} />
            </div>
          </div>
        )}

        {/* Shared with You */}
        {sharedBoards.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-slate-800">Shared with You</h2>
            <p className="mt-1 text-sm text-slate-500">Boards others have shared with you</p>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sharedBoards.map((board) => {
                const memberCount =
                  board.board_members && Array.isArray(board.board_members)
                    ? (board.board_members[0] as { count: number })?.count ?? 0
                    : 0
                const ownerProfile = board.profiles as unknown as { display_name: string | null } | { display_name: string | null }[] | null
                const ownerName = Array.isArray(ownerProfile)
                  ? ownerProfile[0]?.display_name || 'Unknown'
                  : ownerProfile?.display_name || 'Unknown'
                return (
                  <BoardCard
                    key={board.id}
                    board={board}
                    memberCount={memberCount}
                    isOwner={false}
                    ownerName={ownerName}
                    renameAction={renameBoard}
                    deleteAction={deleteBoard}
                  />
                )
              })}
            </div>
          </div>
        )}
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
