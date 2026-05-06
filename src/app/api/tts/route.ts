import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const apiKey = process.env.DEEPGRAM_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.deepgram.com/v1/speak?encoding=linear16&sample_rate=24000&voice=aura-luna-en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
      }),
    })

    if (!response.ok) {
      console.error('Deepgram TTS error:', response.status)
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 })
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
      },
    })
  } catch (error) {
    console.error('TTS API error:', error)
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 })
  }
}
