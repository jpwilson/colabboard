import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUserSuperuser } from '@/lib/supabase/admin'
import Link from 'next/link'
import { OrimLogo } from '@/components/ui/OrimLogo'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const isSuperuser = await isUserSuperuser(supabase)
  if (!isSuperuser) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center">
            <Link href="/dashboard">
              <OrimLogo size="md" />
            </Link>
            <span className="ml-60 text-sm font-medium text-slate-400">
              Admin Tools
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-primary-dark"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Dashboard
            </Link>
            <span className="text-sm text-slate-400">{user.email}</span>
          </div>
        </div>
      </nav>

      <div className="flex pt-14">
        <AdminSidebar />
        <main className="ml-56 flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
