import { groq } from '@/lib/groq'
import { NextResponse } from 'next/server'
import type { DJEvent, TranscriptEntry, SpotifyTrack } from '@/types'

const lyricsCache = new Map<string, { lyrics: string | null; ts: number }>()
const LYRICS_TTL_MS = 1000 * 60 * 60

async function fetchLyrics(artist: string, track: string, timeoutMs: number): Promise<string | null> {
  const key = `${artist}__${track}`.toLowerCase()
  const cached = lyricsCache.get(key)
  if (cached && Date.now() - cached.ts < LYRICS_TTL_MS) {
    return cached.lyrics
  }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`, {
      signal: controller.signal,
    })
    if (response.ok) {
      const data = await response.json()
      const lyrics = data.lyrics || null
      lyricsCache.set(key, { lyrics, ts: Date.now() })
      return lyrics
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.error('Lyrics fetch error:', error)
    }
  } finally {
    clearTimeout(t)
  }
  lyricsCache.set(key, { lyrics: null, ts: Date.now() })
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

    const shouldFetchLyrics = event.type === 'TRACK_START' || event.type === 'MID_TRACK'
    const lyrics = shouldFetchLyrics ? await fetchLyrics(track.artist, track.name, 700) : null
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
