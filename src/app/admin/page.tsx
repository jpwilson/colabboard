import Link from 'next/link'
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
      href: '/admin/boards',
    },
    {
      label: 'Total Members',
      value: membersResult.count ?? 0,
      color: 'bg-green-50 text-green-700',
      href: '/admin/users',
    },
    {
      label: 'Total Objects',
      value: objectsResult.count ?? 0,
      color: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Agent Backend',
      value: backendResult === 'nextjs' ? 'Vercel AI SDK' : 'Docker',
      color: 'bg-amber-50 text-amber-700',
      href: '/admin/agent',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Admin Overview</h1>
      <p className="mt-1 text-sm text-slate-500">
        System-wide metrics and status
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const card = (
            <div
              className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition ${
                stat.href ? 'cursor-pointer hover:shadow-md hover:border-primary/30' : ''
              }`}
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
              {stat.href && (
                <p className="mt-3 text-xs font-medium text-primary">View details &rarr;</p>
              )}
            </div>
          )
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>{card}</Link>
          ) : (
            <div key={stat.label}>{card}</div>
          )
        })}
      </div>
    </div>
  )
}
