'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { audioEngine } from '@/lib/audio'
import { handleDJEvent, orchestrator } from '@/lib/orchestrator'
import type { DJEvent } from '@/types'
import { spotifyPlayer } from '@/lib/spotify'

export function useDJ() {
  const { playerState, transcript, djStatus, addTranscriptEntry, updateTranscriptEntry, setDJStatus, volume } = useStore()
  const lastEventRef = useRef<string>('')

  const triggerEvent = useCallback(
    async (event: DJEvent) => {
      const eventKey = `${event.type}-${event.track.name}`
      if (lastEventRef.current === eventKey) return
      lastEventRef.current = eventKey

      const currentTranscript = playerState.track ? [...transcript] : []
      const narration = await handleDJEvent(event, currentTranscript, event.track)

      if (narration) {
        await audioEngine.init()

        const timestamp =
          event.type === 'TRACK_START' ? event.position_ms : playerState.positionMs

        const entryId = `dj-${Date.now()}`
        const words = narration.split(' ')
        addTranscriptEntry({
          id: entryId,
          speaker: 'Claudio',
          text: narration,
          timestamp,
          status: 'active',
        })

        try {
          const ttsResponse = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: narration }),
          })

          if (ttsResponse.ok) {
            const audioBlob = await ttsResponse.blob()
            const baseVolume = volume
            if (playerState.isReady) {
              spotifyPlayer.setVolume(Math.max(0, Math.min(1, baseVolume * 0.18))).catch(() => {})
            }

            await audioEngine.playDJAudio(audioBlob, {
              onStart: () => {
                setDJStatus({ isSpeaking: true, currentNarration: narration })
                updateTranscriptEntry(entryId, { wordIndex: 0 })
              },
              onProgress: (progress01) => {
                const idx = Math.min(
                  words.length - 1,
                  Math.floor(progress01 * words.length)
                )
                updateTranscriptEntry(entryId, { wordIndex: idx })
              },
            })

            if (playerState.isReady) {
              spotifyPlayer.setVolume(baseVolume).catch(() => {})
            }
          }
        } catch (error) {
          console.error('TTS playback error:', error)
        }

        updateTranscriptEntry(entryId, { status: 'past', wordIndex: undefined })
        setDJStatus({ isSpeaking: false, currentNarration: null })
      }
    },
    [transcript, playerState.track, addTranscriptEntry, updateTranscriptEntry, setDJStatus, playerState.isReady, playerState.positionMs, volume]
  )

  const triggerManual = useCallback(() => {
    if (!playerState.track) return
    triggerEvent({
      type: 'MANUAL',
      track: playerState.track,
    })
  }, [playerState.track, triggerEvent])

  // Timed narration during tracks
  useEffect(() => {
    if (!playerState.track || playerState.isPaused || djStatus.isSpeaking) return

    const interval = setInterval(() => {
      const { track, positionMs } = playerState
      if (!track) return

      const progress = positionMs / track.durationMs
      const timeSinceLast = orchestrator.getTimeSinceLastSpoken()

      // Speak in the middle if track is > 2 mins and we haven't spoken in 2 mins
      if (
        track.durationMs > 120_000 &&
        progress > 0.4 &&
        progress < 0.6 &&
        timeSinceLast > 120_000
      ) {
        triggerEvent({
          type: 'MID_TRACK',
          track,
          position_ms: positionMs,
        })
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [playerState, djStatus.isSpeaking, triggerEvent])

  return {
    isSpeaking: djStatus.isSpeaking,
    triggerEvent,
    triggerManual,
  }
}
