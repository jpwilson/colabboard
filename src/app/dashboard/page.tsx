import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createBoard, deleteBoard } from './actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's boards with member count
  const { data: boards } = await supabase
    .from('boards')
    .select('id, slug, name, owner_id, updated_at, board_members(count)')
    .order('updated_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">Orim</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Boards</h2>
          <form action={createBoard}>
            <input type="hidden" name="name" value="Untitled Board" />
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              New Board
            </button>
          </form>
        </div>

        {boards && boards.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => {
              const memberCount =
                board.board_members && Array.isArray(board.board_members)
                  ? (board.board_members[0] as { count: number })?.count ?? 0
                  : 0
              const isOwner = board.owner_id === user.id

              return (
                <div
                  key={board.id}
                  className="group relative rounded-lg border bg-white p-4 hover:border-blue-300 hover:shadow-sm"
                >
                  <a href={`/board/${board.slug}`} className="block">
                    <h3 className="font-medium group-hover:text-blue-600">
                      {board.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>
                        {new Date(board.updated_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {memberCount > 1 && (
                        <span>{memberCount} members</span>
                      )}
                      {isOwner && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">
                          Owner
                        </span>
                      )}
                    </div>
                  </a>
                  {isOwner && (
                    <form
                      action={deleteBoard.bind(null, board.id)}
                      className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <button
                        type="submit"
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        title="Delete board"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-12 text-center">
            <p className="text-gray-500">No boards yet. Create your first one!</p>
          </div>
        )}
      </div>
    </main>
  )
}
