import { createClient } from '@/lib/supabase/server'

interface ProfileRow {
  id: string
  display_name: string | null
  avatar_url: string | null
  updated_at: string | null
}

export default async function UsersPage() {
  const supabase = await createClient()

  // Fetch all profiles (public table, accessible to superuser via RLS)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, updated_at')
    .order('updated_at', { ascending: false })

  // Get board counts per user (as owner)
  const { data: boardCounts } = await supabase
    .from('boards')
    .select('owner_id')

  const ownerCountMap = new Map<string, number>()
  for (const b of boardCounts || []) {
    ownerCountMap.set(b.owner_id, (ownerCountMap.get(b.owner_id) || 0) + 1)
  }

  // Get membership counts per user
  const { data: memberCounts } = await supabase
    .from('board_members')
    .select('user_id')

  const memberCountMap = new Map<string, number>()
  for (const m of memberCounts || []) {
    memberCountMap.set(m.user_id, (memberCountMap.get(m.user_id) || 0) + 1)
  }

  const users = ((profiles as ProfileRow[]) || []).map((p) => ({
    id: p.id,
    displayName: p.display_name || 'Anonymous',
    avatarUrl: p.avatar_url,
    updatedAt: p.updated_at,
    boardsOwned: ownerCountMap.get(p.id) || 0,
    boardsMember: memberCountMap.get(p.id) || 0,
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Users</h1>
      <p className="mt-1 text-sm text-slate-500">
        All registered users ({users.length} total)
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                User ID
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Boards Owned
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Memberships
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr
                key={user.id}
                className="transition hover:bg-slate-50"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-800">
                      {user.displayName}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs text-slate-400">
                    {user.id.slice(0, 8)}...
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {user.boardsOwned}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                    {user.boardsMember}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {user.updatedAt
                    ? new Date(user.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Never'}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-sm text-slate-400"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
