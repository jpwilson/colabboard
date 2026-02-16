import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createBoard } from './actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's boards (owned + member of)
  const { data: boards } = await supabase
    .from('boards')
    .select('id, slug, name, owner_id, updated_at')
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
            {boards.map((board) => (
              <a
                key={board.id}
                href={`/board/${board.slug}`}
                className="group rounded-lg border bg-white p-4 hover:border-blue-300 hover:shadow-sm"
              >
                <h3 className="font-medium group-hover:text-blue-600">{board.name}</h3>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(board.updated_at).toLocaleDateString()}
                </p>
              </a>
            ))}
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
