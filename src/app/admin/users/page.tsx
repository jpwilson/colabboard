import { createClient } from '@/lib/supabase/server'
import {
  createServiceRoleClient,
  PERMANENT_SUPERUSER_EMAIL,
} from '@/lib/supabase/admin'
import { SortableUsersTable } from '@/components/admin/SortableUsersTable'
import type { UserRow } from '@/components/admin/SortableUsersTable'

interface ProfileRow {
  id: string
  display_name: string | null
  email: string | null
}

export default async function UsersPage() {
  const supabase = await createClient()

  // Get the currently signed-in user (for self-toggle protection)
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  // Fetch all profiles (public table, accessible to superuser via RLS)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, email')

  // Fetch auth user data for last_sign_in_at and superuser status
  // Note: listUsers() returns 50 per page — sufficient for current user count
  const adminClient = createServiceRoleClient()
  const { data: authUsersData } = await adminClient.auth.admin.listUsers()
  const authUsers = authUsersData?.users ?? []

  const authUserMap = new Map(
    authUsers.map((u) => [
      u.id,
      {
        lastSignInAt: u.last_sign_in_at,
        isSuperuser: u.user_metadata?.is_superuser === true,
        email: u.email,
      },
    ]),
  )

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

  const users: UserRow[] = ((profiles as ProfileRow[]) || []).map((p) => {
    const authData = authUserMap.get(p.id)
    const email = p.email || authData?.email || null
    return {
      id: p.id,
      displayName: p.display_name || 'Anonymous',
      email,
      lastSignInAt: authData?.lastSignInAt || null,
      isSuperuser: authData?.isSuperuser || false,
      boardsOwned: ownerCountMap.get(p.id) || 0,
      boardsMember: memberCountMap.get(p.id) || 0,
      toggleDisabled:
        email === PERMANENT_SUPERUSER_EMAIL || p.id === currentUser?.id,
    }
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Users</h1>
      <p className="mt-1 text-sm text-slate-500">
        All registered users ({users.length} total)
      </p>

      <SortableUsersTable users={users} />
    </div>
  )
}
