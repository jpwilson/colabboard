'use client'

import dynamic from 'next/dynamic'

const BoardCanvas = dynamic(
  () => import('@/components/board/BoardCanvas').then((m) => m.BoardCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center">
        <p className="text-gray-400">Loading canvas...</p>
      </div>
    ),
  },
)

interface BoardCanvasLoaderProps {
  boardId?: string
  userId?: string
  userName?: string
}

export function BoardCanvasLoader({ boardId, userId, userName }: BoardCanvasLoaderProps) {
  return <BoardCanvas boardId={boardId} userId={userId} userName={userName} />
}
