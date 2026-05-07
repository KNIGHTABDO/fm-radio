import type { DJEvent, TranscriptEntry, SpotifyTrack } from '@/types'

class DJOrchestrator {
  private lastSpokenAt: number = 0
  private minGapBetweenSpeech = 45_000

  shouldSpeak(event: DJEvent): boolean {
    if (event.type === 'MANUAL') return true
    if (event.type === 'TRACK_START') return true
    if (event.type === 'TRACK_END') return true
    if (event.type === 'USER_PAUSED') return true
    if (event.type !== 'MID_TRACK') return true

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

function getClientFallbackNarration(event: DJEvent): string {
  const fallbacks: Record<string, string[]> = {
    TRACK_START: [
      'Something new. Let it settle in.',
      'The beginning of something worth your time.',
      'Here we go.',
    ],
    TRACK_END: [
      'Until the next one.',
      'And so it ends. But another begins.',
      'Fading out.',
    ],
    USER_PAUSED: [
      'Taking a breath.',
      'The silence is part of it too.',
      'Paused. Like a held note.',
    ],
    MID_TRACK: [
      'Still here. Still listening.',
      'Let it run a little longer.',
      'Hold onto that atmosphere.',
    ],
    MANUAL: [
      'Music speaks. I just try to keep up.',
      'The best answers are in the next track.',
      'Let me think about that.',
    ],
  }

  const options = fallbacks[event.type] || fallbacks.MANUAL
  return options[Math.floor(Math.random() * options.length)]
}

export async function handleDJEvent(
  event: DJEvent,
  transcript: TranscriptEntry[],
  track: SpotifyTrack,
  opts?: { signal?: AbortSignal }
): Promise<string | null> {
  if (!orchestrator.shouldSpeak(event)) {
    return null
  }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 10_000)
  const onAbort = () => controller.abort()
  opts?.signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const response = await fetch('/api/dj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, transcript, track }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const textBody = await response.text().catch(() => '')
      console.error('Failed to get narration:', response.status, textBody.slice(0, 600))
      return getClientFallbackNarration(event)
    }

    const data = await response.json()
    const narration = typeof data?.narration === 'string' ? data.narration.trim() : ''
    if (!narration) {
      return getClientFallbackNarration(event)
    }
    orchestrator.markSpoken()
    return narration
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }
    console.error('DJ event handling error:', error)
    return getClientFallbackNarration(event)
  } finally {
    clearTimeout(t)
    opts?.signal?.removeEventListener('abort', onAbort)
  }
}
