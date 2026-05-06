import { groq } from '@/lib/groq'
import { NextResponse } from 'next/server'
import type { DJEvent, TranscriptEntry, SpotifyTrack } from '@/types'

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

    const narration = await groq.getNarration(event, transcript, track)
    
    return NextResponse.json({ narration })
  } catch (error) {
    console.error('DJ API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate narration' },
      { status: 500 }
    )
  }
}
