import type { DJEvent, TranscriptEntry, SpotifyTrack } from '@/types'

class DJOrchestrator {
  private lastSpokenAt: number = 0
  private minGapBetweenSpeech = 45_000

  shouldSpeak(event: DJEvent): boolean {
    if (event.type === 'MANUAL') return true

    if (Date.now() - this.lastSpokenAt < this.minGapBetweenSpeech) {
      return false
    }

    return true
  }

  markSpoken(): void {
    this.lastSpokenAt = Date.now()
  }

  getTimeSinceLastSpoken(): number {
    return Date.now() - this.lastSpokenAt
  }
}

export const orchestrator = new DJOrchestrator()

export async function handleDJEvent(
  event: DJEvent,
  transcript: TranscriptEntry[],
  track: SpotifyTrack,
  opts?: { signal?: AbortSignal }
): Promise<string | null> {
  if (!orchestrator.shouldSpeak(event)) {
    return null
  }

  try {
    const response = await fetch('/api/dj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, transcript, track }),
      signal: opts?.signal,
    })

    if (!response.ok) {
      console.error('Failed to get narration:', response.status)
      return null
    }

    const data = await response.json()
    orchestrator.markSpoken()
    return data.narration
  } catch (error) {
    console.error('DJ event handling error:', error)
    return null
  }
}
