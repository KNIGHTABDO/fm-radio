'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import { audioEngine } from '@/lib/audio'
import { handleDJEvent } from '@/lib/orchestrator'
import type { DJEvent } from '@/types'

export function useDJ() {
  const { playerState, transcript, djStatus, addTranscriptEntry, updateTranscriptEntry, setDJStatus } = useStore()
  const lastEventRef = useRef<string>('')
  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const triggerEvent = useCallback(
    async (event: DJEvent) => {
      const eventKey = `${event.type}-${event.track.name}`
      if (lastEventRef.current === eventKey) return
      lastEventRef.current = eventKey

      const currentTranscript = playerState.track ? [...transcript] : []
      const narration = await handleDJEvent(event, currentTranscript, playerState.track!)

      if (narration) {
        await audioEngine.init()

        const entryId = `dj-${Date.now()}`
        addTranscriptEntry({
          id: entryId,
          speaker: 'Claudio',
          text: narration,
          timestamp: Date.now(),
          status: 'active',
          wordIndex: 0,
        })

        setDJStatus({ isSpeaking: true, currentNarration: narration })

        await audioEngine.duck(5000)

        try {
          const ttsResponse = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: narration }),
          })

          if (ttsResponse.ok) {
            const audioBlob = await ttsResponse.blob()
            await audioEngine.playDJAudio(audioBlob)
          }
        } catch (error) {
          console.error('TTS playback error:', error)
        }

        updateTranscriptEntry(entryId, { status: 'past', wordIndex: undefined })
        setDJStatus({ isSpeaking: false, currentNarration: null })
      }
    },
    [transcript, playerState.track, addTranscriptEntry, updateTranscriptEntry, setDJStatus]
  )

  const triggerManual = useCallback(() => {
    if (!playerState.track) return
    triggerEvent({
      type: 'MANUAL',
      track: playerState.track,
    })
  }, [playerState.track, triggerEvent])

  useEffect(() => {
    return () => {
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current)
      }
    }
  }, [])

  return {
    isSpeaking: djStatus.isSpeaking,
    triggerManual,
  }
}
