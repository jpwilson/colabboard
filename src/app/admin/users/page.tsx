import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  createServiceRoleClient,
  PERMANENT_SUPERUSER_EMAIL,
} from '@/lib/supabase/admin'
import { SortableUsersTable } from '@/components/admin/SortableUsersTable'
import type { UserRow } from '@/components/admin/SortableUsersTable'
import { getLangfuseTraces } from '@/components/admin/analytics/analytics-data'

interface ProfileRow {
  id: string
  display_name: string | null
  email: string | null
}

/** Build the base user rows from Supabase (fast) — no Langfuse dependency */
async function getBaseUsers(): Promise<UserRow[]> {
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, email')

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

  const { data: boardCounts } = await supabase
    .from('boards')
    .select('owner_id')

  const ownerCountMap = new Map<string, number>()
  for (const b of boardCounts || []) {
    ownerCountMap.set(b.owner_id, (ownerCountMap.get(b.owner_id) || 0) + 1)
  }

  const { data: memberCounts } = await supabase
    .from('board_members')
    .select('user_id')

  const memberCountMap = new Map<string, number>()
  for (const m of memberCounts || []) {
    memberCountMap.set(m.user_id, (memberCountMap.get(m.user_id) || 0) + 1)
  }

  return ((profiles as ProfileRow[]) || []).map((p) => {
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
      aiCost: null, // Will be filled by Suspense
      toggleDisabled:
        email === PERMANENT_SUPERUSER_EMAIL || p.id === currentUser?.id,
    }
  })
}

/** Async server component that enriches users with Langfuse cost data */
async function UsersTableWithCosts({ baseUsers }: { baseUsers: UserRow[] }) {
  const costByUserId = new Map<string, number>()
  try {
    const traces = await getLangfuseTraces()
    for (const t of traces) {
      if (t.userId && t.totalCost) {
        costByUserId.set(t.userId, (costByUserId.get(t.userId) ?? 0) + t.totalCost)
      }
    }
  } catch {
    // Langfuse unavailable — costs stay at 0
  }

  const enrichedUsers = baseUsers.map((u) => ({
    ...u,
    aiCost: costByUserId.get(u.id) ?? 0,
  }))

  return <SortableUsersTable users={enrichedUsers} />
}

export default async function UsersPage() {
  const users = await getBaseUsers()

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Users</h1>
      <p className="mt-1 text-sm text-slate-500">
        All registered users ({users.length} total)
      </p>

      <Suspense fallback={<SortableUsersTable users={users} />}>
        <UsersTableWithCosts baseUsers={users} />
      </Suspense>
    </div>
  )
}
