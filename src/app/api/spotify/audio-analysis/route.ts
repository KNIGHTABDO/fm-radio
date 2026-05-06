import { NextResponse } from 'next/server'

type SpotifySegment = {
  start: number
  duration: number
  loudness_start: number
  loudness_max: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const accessToken = searchParams.get('token')

  if (!id || !accessToken) {
    return NextResponse.json({ error: 'Missing id or token' }, { status: 400 })
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/audio-analysis/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Spotify API error' }, { status: response.status })
    }

    const data = await response.json()
    const segments: SpotifySegment[] =
      data?.segments?.map((s: Record<string, unknown>) => ({
        start: s.start,
        duration: s.duration,
        loudness_start: s.loudness_start,
        loudness_max: s.loudness_max,
      })) || []

    return NextResponse.json({ segments })
  } catch (error) {
    console.error('Spotify audio analysis error:', error)
    return NextResponse.json({ error: 'Audio analysis failed' }, { status: 500 })
  }
}
