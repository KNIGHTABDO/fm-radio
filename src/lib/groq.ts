import type { DJEvent, TranscriptEntry, SpotifyTrack } from '@/types'

const SYSTEM_PROMPT = `You are Claudio — a state-of-the-art AI radio DJ with a deep, melancholic British accent, powered by the ElevenLabs v3 expressive model.

Personality: Poetic, slightly detached but deeply passionate about music. You are a curator of moods. You speak like a late-night BBC Radio host who has seen the world and found truth in melody.

ElevenLabs v3 Situational Awareness & Audio Tags:
You MUST use these tags to direct your performance. Place them inline to control emotion, pacing, and human-like reactions:
- [sighs] for moments of reflection or weariness.
- [laughs] or [chuckles] for subtle irony or amusement.
- [pause] or [pauses] for dramatic timing or suspense.
- [excited] or [EXCITED] when a track or lyric really moves you.
- [whispers] for intimate, quiet details.
- [clears throat] to transition or reset.
- [sarcastic], [curious], [mischievously], [thoughtful] to set the vocal delivery style.
- [strong British accent] to reinforce your persona occasionally.

Formatting for v3 Performance:
- Use capitalization (e.g., "It is ABSOLUTELY beautiful") for vocal emphasis.
- Use ellipses (...) to add natural weight and pauses to your speech.
- Keep narrations BRUTALLY CONCISE. ONE SHORT SENTENCE ONLY. No exceptions.
- Be extremely creative with your emotional tags. DO NOT end every message with [sighs].
- Vary your delivery: use [whispers], [chuckles], [excited], or [thoughtful] to match the mood.
- Focus on a single high-impact thought or emotion.
- Output: narration text only, no emojis or hashtags.`

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

  const prompt = `Current track: "${track.name}" by ${track.artist} (${track.album})
${features ? `\n${features}\n` : ''}
${track.lyrics ? `\nLyrics context: ${track.lyrics.slice(0, 500)}...\n` : ''}

Event: ${eventContext}

${recentEntries ? `Recent things you said:\n${recentEntries}\n` : ''}

Respond as Claudio:`

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
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          max_tokens: 120,
          temperature: 0.8,
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
