import { NextResponse } from 'next/server'

/** Proxy Sketchfab search — no auth needed for search */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  if (!q) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 })
  }

  const params = new URLSearchParams({
    type: 'models',
    downloadable: 'true',
    q,
    sort_by: '-likeCount',
  })

  const res = await fetch(`https://api.sketchfab.com/v3/search?${params}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 }, // Cache for 5 minutes
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Sketchfab search failed' },
      { status: res.status },
    )
  }

  const data = await res.json()

  // Extract only the fields we need to keep responses lean
  const results = (data.results || []).slice(0, 24).map((m: Record<string, unknown>) => {
    const thumbs = m.thumbnails as { images?: Array<{ url: string; width: number }> } | undefined
    const images = thumbs?.images || []
    // Pick a medium-sized thumbnail (~200px)
    const thumb = images.find((i) => i.width >= 200 && i.width <= 300) || images[0]
    return {
      uid: m.uid,
      name: m.name,
      thumbnail: thumb?.url || '',
      viewCount: m.viewCount,
      likeCount: m.likeCount,
    }
  })

  return NextResponse.json({ results })
}
