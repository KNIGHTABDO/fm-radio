import { groq } from '@/lib/groq'
import { NextResponse } from 'next/server'
import type { DJEvent, TranscriptEntry, SpotifyTrack } from '@/types'

async function fetchLyrics(artist: string, track: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`)
    if (response.ok) {
      const data = await response.json()
      return data.lyrics || null
    }
  } catch (error) {
    console.error('Lyrics fetch error:', error)
  }
  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event, transcript, track } = body as {
      event: DJEvent
      transcript: TranscriptEntry[]
      track: SpotifyTrack
    }

    if (!track) {
      return NextResponse.json({ error: 'Track is required' }, { status: 400 })
    }

    // Try to get lyrics to enhance narration
    const lyrics = await fetchLyrics(track.artist, track.name)
    const trackWithLyrics = { ...track, lyrics: lyrics || undefined }

    const narration = await groq.getNarration(event, transcript, trackWithLyrics)
    
    return NextResponse.json({ narration })
  } catch (error) {
    console.error('DJ API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate narration' },
      { status: 500 }
    )
  }
}

