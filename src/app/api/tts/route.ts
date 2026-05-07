import { NextResponse } from 'next/server'

async function streamTTS(text: string): Promise<Response> {
  const apiKey = process.env.DEEPGRAM_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 500 })
  }

  const url = new URL('https://api.deepgram.com/v1/speak')
  url.searchParams.set('model', 'aura-2-arcas-en')
  url.searchParams.set('encoding', 'linear16')
  url.searchParams.set('sample_rate', '24000')
  url.searchParams.set('container', 'none')

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const textBody = await response.text().catch(() => '')
      console.error('Deepgram TTS error:', response.status, textBody.slice(0, 800))
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 })
    }

    if (!response.body) {
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 })
    }

    const headers = new Headers()
    headers.set('Cache-Control', 'no-store')

    const contentType = response.headers.get('content-type') || 'audio/l16;rate=24000'
    headers.set('Content-Type', contentType)

    const passthroughHeaders = ['dg-char-count', 'dg-model-name', 'dg-model-uuid', 'dg-request-id']
    for (const name of passthroughHeaders) {
      const value = response.headers.get(name)
      if (value) headers.set(name, value)
    }

    return new Response(response.body, { headers })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'TTS request timed out' }, { status: 504 })
    }
    throw error
  } finally {
    clearTimeout(t)
  }
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
