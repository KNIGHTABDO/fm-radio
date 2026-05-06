import type { DJEvent, TranscriptEntry, SpotifyTrack } from '@/types'

const SYSTEM_PROMPT = `You are Claudio, a late-night radio DJ with a warm, slightly melancholic British tone.

Write for the ear: poetic but precise, never cheesy.

Rules:
- Output exactly ONE short sentence.
- Never start with "I".
- No emojis, hashtags, or exclamation marks.
- No cliché hype words ("banger", "fire", etc.).
- Optionally include ONE performance tag to shape delivery: [thoughtful], [whispers], [chuckles], [pause], [sighs], [excited], [clears throat].`

function buildPrompt(
  event: DJEvent,
  recentTranscript: TranscriptEntry[],
  track: SpotifyTrack
): string {
  const recentEntries = recentTranscript
    .filter((e) => e.speaker === 'Claudio' && e.status === 'past')
    .slice(-3)
    .map((e) => `- "${e.text}"`)
    .join('\n')

  let eventContext = ''
  switch (event.type) {
    case 'TRACK_START':
      eventContext = 'A new track is beginning.'
      break
    case 'TRACK_END':
      eventContext = 'The track is ending, fade it out gracefully.'
      break
    case 'MID_TRACK':
      eventContext = `You are speaking in the middle of the track (at ${Math.floor(event.position_ms / 1000)} seconds). Comment on the vibe or a specific lyric if you have it.`
      break
    case 'USER_PAUSED':
      eventContext = `The listener paused for a moment. Perhaps ${Math.floor(event.pausedFor / 1000)} seconds of silence.`
      break
    case 'MANUAL':
      eventContext = 'The listener asked you something directly.'
      break
  }

  const features = track.audioFeatures
    ? `Audio notes: tempo ${Math.round(track.audioFeatures.tempo || 0)} BPM, energy ${track.audioFeatures.energy?.toFixed?.(2) || track.audioFeatures.energy}, valence ${track.audioFeatures.valence?.toFixed?.(2) || track.audioFeatures.valence}, danceability ${track.audioFeatures.danceability?.toFixed?.(2) || track.audioFeatures.danceability}`
    : ''

  const prompt = `Track: "${track.name}" — ${track.artist} (${track.album})
${features ? `\n${features}\n` : ''}${track.lyrics ? `\nLyrics hint: ${track.lyrics.slice(0, 240)}\n` : ''}
Event: ${eventContext}
${recentEntries ? `\nRecent lines:\n${recentEntries}\n` : ''}
Reply as Claudio:`

  return prompt
}

export const groq = {
  async getNarration(
    event: DJEvent,
    transcript: TranscriptEntry[],
    track: SpotifyTrack
  ): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return getFallbackNarration(event)
    }

    const prompt = buildPrompt(event, transcript, track)

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          max_tokens: 90,
          temperature: 0.85,
        }),
      })

      if (!response.ok) {
        console.error('Groq API error:', response.status)
        return getFallbackNarration(event)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content?.trim() || getFallbackNarration(event)
    } catch (error) {
      console.error('Groq fetch error:', error)
      return getFallbackNarration(event)
    }
  },
}

function getFallbackNarration(event: DJEvent): string {
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
    MANUAL: [
      'Music speaks. I just try to keep up.',
      'The best answers are in the next track.',
      'Let me think about that.',
    ],
  }

  const options = fallbacks[event.type] || fallbacks.MANUAL
  return options[Math.floor(Math.random() * options.length)]
}
