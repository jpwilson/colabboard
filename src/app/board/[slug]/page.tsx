import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoardCanvasLoader } from '@/components/board/BoardCanvasLoader'

interface BoardPageProps {
  params: Promise<{ slug: string }>
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/board/${slug}`)
  }

  // Look up board by slug
  const { data: board } = await supabase
    .from('boards')
    .select('id, slug, name, owner_id')
    .eq('slug', slug)
    .single()

  if (!board) {
    notFound()
  }

  // Check membership (owner counts as member via RLS helper function)
  const isMember =
    board.owner_id === user.id ||
    (
      await supabase
        .from('board_members')
        .select('id')
        .eq('board_id', board.id)
        .eq('user_id', user.id)
        .single()
    ).data !== null

  if (!isMember) {
    notFound()
  }

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous'

  return <BoardCanvasLoader boardId={board.id} boardSlug={board.slug} userId={user.id} userName={userName} />
}
