import { NextResponse } from 'next/server'

async function streamTTS(text: string): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = 'nPczCjzI2devNBz1zQrb'

  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 })
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      latency_optimization: 2,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8,
      },
    }),
  })

  if (!response.ok) {
    const textBody = await response.text().catch(() => '')
    console.error('ElevenLabs TTS error:', response.status, textBody)
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 })
  }

  if (!response.body) {
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 })
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const text = searchParams.get('text') || ''

  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  try {
    return await streamTTS(text)
  } catch (error) {
    console.error('TTS API error:', error)
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    return await streamTTS(text)
  } catch (error) {
    console.error('TTS API error:', error)
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 })
  }
}
