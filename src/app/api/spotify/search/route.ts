import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const accessToken = searchParams.get('token')

  if (!query || !accessToken) {
    return NextResponse.json({ error: 'Missing query or token' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Spotify API error' }, { status: response.status })
    }

    const data = await response.json()

    const tracks = data.tracks?.items?.map((track: Record<string, unknown>) => ({
      id: track.id,
      name: track.name,
      artist: (track.artists as { name: string }[])?.map((a) => a.name).join(', '),
      album: (track.album as { name: string })?.name,
      albumArt: (track.album as { images?: { url: string }[] })?.images?.[0]?.url || '',
      durationMs: track.duration_ms,
      uri: track.uri,
    })) || []

    return NextResponse.json({ tracks })
  } catch (error) {
    console.error('Spotify search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
