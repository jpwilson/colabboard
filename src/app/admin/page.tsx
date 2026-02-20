import { createClient } from '@/lib/supabase/server'
import { getAgentBackend } from '@/lib/supabase/admin'

export default async function AdminOverview() {
  const supabase = await createClient()

  // Fetch stats
  const [boardsResult, membersResult, objectsResult, backendResult] =
    await Promise.all([
      supabase.from('boards').select('id', { count: 'exact', head: true }),
      supabase
        .from('board_members')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('board_objects')
        .select('id', { count: 'exact', head: true }),
      getAgentBackend(supabase),
    ])

  const stats = [
    {
      label: 'Total Boards',
      value: boardsResult.count ?? 0,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Total Members',
      value: membersResult.count ?? 0,
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'Total Objects',
      value: objectsResult.count ?? 0,
      color: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Agent Backend',
      value: backendResult === 'nextjs' ? 'Next.js SDK' : 'Docker',
      color: 'bg-amber-50 text-amber-700',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Admin Overview</h1>
      <p className="mt-1 text-sm text-slate-500">
        System-wide metrics and status
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">
              {stat.value}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${stat.color}`}
            >
              {stat.label === 'Agent Backend' ? 'Active' : 'Total'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
