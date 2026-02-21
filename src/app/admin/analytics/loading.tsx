import {
  StatCardsSkeleton,
  LangfuseSkeleton,
} from '@/components/admin/analytics/skeletons'

export default function AnalyticsLoading() {
  return (
    <div>
      <div className="animate-pulse">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="mt-2 h-4 w-72 rounded bg-slate-200" />
      </div>
      <StatCardsSkeleton count={4} />
      <LangfuseSkeleton />
    </div>
  )
}
