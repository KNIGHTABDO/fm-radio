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
  const runIdRef = useRef<number>(0)
  const abortRef = useRef<AbortController | null>(null)
  const inFlightRef = useRef<boolean>(false)

  const triggerEvent = useCallback(
    async (event: DJEvent) => {
      const eventKey = `${event.type}-${event.track.name}`
      if (lastEventRef.current === eventKey) return
      lastEventRef.current = eventKey

      const currentTranscript = playerState.track ? [...transcript] : []
      const canInterrupt = event.type === 'MANUAL' || event.type === 'USER_PAUSED' || event.type === 'TRACK_END'
      if (inFlightRef.current && !canInterrupt) return

      const thisRunId = ++runIdRef.current
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      audioEngine.stopDJ()
      if (playerState.isReady) {
        spotifyPlayer.setVolume(volume).catch(() => {})
      }

      inFlightRef.current = true

      let entryId: string | null = null
      try {
        const narration = await handleDJEvent(event, currentTranscript, event.track, {
          signal: abortRef.current.signal,
        })

        if (thisRunId !== runIdRef.current) return
        if (abortRef.current.signal.aborted) return
        if (!narration) return

        await audioEngine.init()

        const timestamp =
          event.type === 'TRACK_START' ? event.position_ms : playerState.positionMs

        entryId = `dj-${Date.now()}`
        const words = narration.trim().split(/\s+/).filter(Boolean)
        addTranscriptEntry({
          id: entryId,
          speaker: 'Claudio',
          text: narration,
          timestamp,
          status: 'active',
        })

        const baseVolume = volume
        if (playerState.isReady) {
          spotifyPlayer.setVolume(Math.max(0, Math.min(1, baseVolume * 0.18))).catch(() => {})
        }

        setDJStatus({ isSpeaking: true, currentNarration: narration })
        updateTranscriptEntry(entryId, { wordIndex: 0 })

        try {
          await audioEngine.playDJTTS(narration, {
            onProgress: (progress01) => {
              const idx = Math.min(words.length - 1, Math.floor(progress01 * words.length))
              updateTranscriptEntry(entryId!, { wordIndex: idx })
            },
            onEnded: () => {
              if (playerState.isReady) {
                spotifyPlayer.setVolume(baseVolume).catch(() => {})
              }
            },
          })
        } finally {
          if (playerState.isReady) {
            spotifyPlayer.setVolume(baseVolume).catch(() => {})
          }
        }
      } catch (error) {
        console.error('TTS playback error:', error)
        if (playerState.isReady) {
          spotifyPlayer.setVolume(volume).catch(() => {})
        }
      } finally {
        if (entryId) {
          updateTranscriptEntry(entryId, { status: 'past', wordIndex: undefined })
        }
        setDJStatus({ isSpeaking: false, currentNarration: null })
        inFlightRef.current = false
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
