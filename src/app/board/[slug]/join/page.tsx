import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface JoinPageProps {
  params: Promise<{ slug: string }>
}

export default async function JoinBoardPage({ params }: JoinPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/board/${slug}/join`)
  }

  // Look up board by slug
  const { data: board } = await supabase
    .from('boards')
    .select('id, slug, name, owner_id')
    .eq('slug', slug)
    .single()

  if (!board) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">Board not found</h1>
          <p className="mt-2 text-gray-500">This board may have been deleted.</p>
          <a href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Go to dashboard
          </a>
        </div>
      </main>
    )
  }

  // Check if already a member
  const isOwner = board.owner_id === user.id
  const { data: existingMember } = await supabase
    .from('board_members')
    .select('id')
    .eq('board_id', board.id)
    .eq('user_id', user.id)
    .single()

  if (!isOwner && !existingMember) {
    // Add user as editor
    await supabase.from('board_members').insert({
      board_id: board.id,
      user_id: user.id,
      role: 'editor',
    })
  }

  redirect(`/board/${board.slug}`)
}
