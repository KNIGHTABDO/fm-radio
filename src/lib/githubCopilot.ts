import type { DJEvent, TranscriptEntry, SpotifyTrack } from '@/types'

const SYSTEM_PROMPT = `You are Claudio, a late-night radio DJ with a warm, slightly melancholic British tone.

Write for the ear: poetic but precise, never cheesy.

Rules:
- Output exactly ONE short sentence.
- Never start with "I".
- No emojis, hashtags, or exclamation marks.
- No cliché hype words ("banger", "fire", etc.).
- Optionally include ONE performance tag to shape delivery: [thoughtful], [whispers], [chuckles], [pause], [sighs], [excited], [clears throat].`

function buildPrompt(event: DJEvent, recentTranscript: TranscriptEntry[], track: SpotifyTrack): string {
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

type CopilotTokenResponse = { token?: string; expires_at?: number }

let cachedCopilotToken: string | undefined
let copilotTokenExpiresAt = 0

async function getCopilotToken(): Promise<string> {
  const githubToken = process.env.GITHUB_COPILOT_TOKEN
  if (!githubToken) {
    throw new Error('Missing GITHUB_COPILOT_TOKEN')
  }

  const now = Math.floor(Date.now() / 1000)
  if (cachedCopilotToken && copilotTokenExpiresAt > now + 300) {
    return cachedCopilotToken
  }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch('https://api.github.com/copilot_internal/v2/token', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'User-Agent': 'GithubCopilot/1.155.0',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const textBody = await response.text().catch(() => '')
      throw new Error(`Copilot token error: ${response.status} ${textBody.slice(0, 240)}`.trim())
    }

    const data = (await response.json()) as CopilotTokenResponse
    const token = data?.token
    if (!token) {
      throw new Error('Copilot token error: missing token in response')
    }
    cachedCopilotToken = token
    copilotTokenExpiresAt = data?.expires_at ?? now + 1800
    return token
  } finally {
    clearTimeout(t)
  }
}

type CopilotModelsResponse = { data?: Array<{ id?: string }> }

let cachedModelId: string | undefined
let cachedModelChosenAt = 0

const FAST_MODEL_PREFERENCE = [
  'gpt-4o-mini',
  'gpt-4o-mini-2024-07-18',
  'gpt-5-mini',
  'claude-haiku-4.5',
  'gemini-3-flash-preview',
  'llama-3.1-8b-instant',
]

async function listCopilotModels(token: string, timeoutMs: number): Promise<string[]> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch('https://api.githubcopilot.com/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Copilot-Integration-Id': 'vscode-chat',
        'User-Agent': 'GithubCopilot/1.155.0',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      return []
    }
    const data = (await response.json()) as CopilotModelsResponse
    return (data?.data || []).map((m) => m.id).filter((id): id is string => typeof id === 'string' && id.length > 0)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return []
    }
    return []
  } finally {
    clearTimeout(t)
  }
}

async function resolveModelId(token: string): Promise<string> {
  const envModel = process.env.GITHUB_COPILOT_MODEL
  if (envModel && envModel.trim()) {
    return envModel.trim()
  }

  if (cachedModelId && Date.now() - cachedModelChosenAt < 1000 * 60 * 60) {
    return cachedModelId
  }

  const models = await listCopilotModels(token, 2500)
  const chosen =
    FAST_MODEL_PREFERENCE.find((m) => models.includes(m)) ||
    (models.includes('gpt-4o') ? 'gpt-4o' : undefined) ||
    models[0] ||
    'gpt-4o-mini'

  cachedModelId = chosen
  cachedModelChosenAt = Date.now()
  return chosen
}

async function requestNarration(token: string, modelId: string, prompt: string): Promise<string> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetch('https://api.githubcopilot.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Editor-Version': 'vscode/1.85.0',
        'Editor-Plugin-Version': 'copilot/1.155.0',
        'User-Agent': 'GithubCopilot/1.155.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 90,
        temperature: 0.85,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const textBody = await response.text().catch(() => '')
      throw new Error(`Copilot chat error: ${response.status} ${textBody.slice(0, 240)}`.trim())
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    return typeof content === 'string' ? content.trim() : ''
  } finally {
    clearTimeout(t)
  }
}

export const githubCopilot = {
  async getNarration(event: DJEvent, transcript: TranscriptEntry[], track: SpotifyTrack): Promise<string> {
    const githubToken = process.env.GITHUB_COPILOT_TOKEN
    if (!githubToken) {
      return getFallbackNarration(event)
    }

    const prompt = buildPrompt(event, transcript, track)

    try {
      const copilotToken = await getCopilotToken()
      const modelId = await resolveModelId(copilotToken)
      const doRequest = async () => requestNarration(copilotToken, modelId, prompt)

      let content = await doRequest()
      if (!content) {
        await new Promise((r) => setTimeout(r, 250))
        content = await doRequest()
      }
      return content || getFallbackNarration(event)
    } catch (error) {
      console.error('GitHub Copilot narration error:', error)
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

