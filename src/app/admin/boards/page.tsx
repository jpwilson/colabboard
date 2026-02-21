import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function BoardsPage() {
  const supabase = await createClient()

  // Superuser RLS policy allows reading all boards
  const { data: boards } = await supabase
    .from('boards')
    .select(
      'id, slug, name, owner_id, created_at, updated_at, board_members(count), board_objects(count), profiles!boards_owner_profile_fkey(display_name)',
    )
    .order('updated_at', { ascending: false })

  // Fetch sharing details for all boards
  const { data: allMembers } = await supabase
    .from('board_members')
    .select('board_id, user_id, role, invited_at')
    .eq('status', 'accepted')

  const memberUserIds = [...new Set((allMembers || []).map((m) => m.user_id))]
  let memberProfiles: { id: string; display_name: string | null }[] = []
  if (memberUserIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', memberUserIds)
    memberProfiles = data || []
  }

  const sharingMap = new Map<string, Array<{ name: string; role: string }>>()
  for (const m of allMembers || []) {
    const profile = memberProfiles.find((p) => p.id === m.user_id)
    const existing = sharingMap.get(m.board_id) || []
    existing.push({
      name: profile?.display_name || 'Unknown',
      role: m.role,
    })
    sharingMap.set(m.board_id, existing)
  }

  const boardRows = (boards || []).map((b) => {
    const memberCount =
      b.board_members && Array.isArray(b.board_members)
        ? (b.board_members[0] as { count: number })?.count ?? 0
        : 0
    const objectCount =
      b.board_objects && Array.isArray(b.board_objects)
        ? (b.board_objects[0] as { count: number })?.count ?? 0
        : 0
    const ownerProfile = b.profiles as unknown as
      | { display_name: string | null }
      | { display_name: string | null }[]
      | null
    const ownerName = Array.isArray(ownerProfile)
      ? ownerProfile[0]?.display_name || 'Unknown'
      : ownerProfile?.display_name || 'Unknown'

    return {
      id: b.id,
      slug: b.slug,
      name: b.name,
      ownerId: b.owner_id,
      ownerName,
      memberCount,
      objectCount,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      sharedWith: (sharingMap.get(b.id) || []).filter((m) => m.role !== 'owner'),
    }
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">All Boards</h1>
      <p className="mt-1 text-sm text-slate-500">
        Board oversight across all users ({boardRows.length} total)
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Board
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Owner
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Members
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Objects
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Shared With
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Last Modified
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {boardRows.map((board) => (
              <tr key={board.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {board.name}
                    </p>
                    <p className="font-mono text-xs text-slate-400">
                      /{board.slug}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600">
                    {board.ownerName}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {board.memberCount}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                    {board.objectCount}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {board.sharedWith.length > 0 ? (
                      board.sharedWith.slice(0, 3).map((member, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                          title={member.role}
                        >
                          {member.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                    {board.sharedWith.length > 3 && (
                      <span className="text-[10px] text-slate-400">+{board.sharedWith.length - 3} more</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(board.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(board.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/board/${board.slug}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {boardRows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-sm text-slate-400"
                >
                  No boards found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
