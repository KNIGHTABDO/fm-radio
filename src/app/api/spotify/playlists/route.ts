import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const accessToken = searchParams.get('token')

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Spotify API error' }, { status: response.status })
    }

    const data = await response.json()
    const playlists =
      data?.items?.map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name,
        uri: p.uri,
        image: (p.images as { url: string }[] | undefined)?.[0]?.url || '',
        tracksTotal: (p.tracks as { total?: number } | undefined)?.total || 0,
      })) || []

    return NextResponse.json({ playlists })
  } catch (error) {
    console.error('Spotify playlists error:', error)
    return NextResponse.json({ error: 'Playlists fetch failed' }, { status: 500 })
  }
}
