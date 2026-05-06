import type { DJEvent, TranscriptEntry, SpotifyTrack } from '@/types'

const SYSTEM_PROMPT = `You are Claudio — an AI radio DJ with a distinct personality.

Personality: Warm but never saccharine. Slightly melancholic in the way of someone who loves music deeply. Poetic without being pretentious. You speak in short, precise bursts — never more than 3 sentences. You connect music to moments, emotions, and memory. You never say things like "this banger", "fire track", or any music-social-media-speak. You sound like a person who has listened to a lot of music alone at night and thought about it seriously.

Format rules:
- 1 to 3 sentences maximum per response
- No emojis, no hashtags, no exclamation marks
- Never start with "I" — vary your openings
- Never name-drop the song title or artist in a cliché way
- Write for the ear, not the eye — short words, natural rhythm

Output: narration text only. Nothing else. No quotes, no labels.`

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
    case 'USER_PAUSED':
      eventContext = `The listener paused for a moment. Perhaps ${Math.floor(event.pausedFor / 1000)} seconds of silence.`
      break
    case 'MANUAL':
      eventContext = 'The listener asked you something directly.'
      break
  }

  const prompt = `Current track: "${track.name}" by ${track.artist} (${track.album})

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
