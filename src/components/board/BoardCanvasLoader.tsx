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

export function BoardCanvasLoader() {
  return <BoardCanvas />
}
