'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import { spotifyPlayer } from '@/lib/spotify'
import type { PlayerState, DJEvent } from '@/types'

export function useSpotify() {
  const { setPlayerState, setTrack, playerState, setIsPaused, setPosition } = useStore()
  const trackEndTriggeredRef = useRef<boolean>(false)

  const onStateChange = useCallback(
    (state: PlayerState) => {
      if (state.track) {
        setTrack(state.track)
        setPosition(state.positionMs)
        setIsPaused(state.isPaused)
        setPlayerState({ isReady: true })
      }
    },
    [setTrack, setPosition, setIsPaused, setPlayerState]
  )

  const initializePlayer = useCallback(
    async (accessToken: string) => {
      await spotifyPlayer.initialize(accessToken)
      spotifyPlayer.onStateChange(onStateChange)
    },
    [onStateChange]
  )

  const play = useCallback(async (trackUri?: string) => {
    await spotifyPlayer.play(trackUri)
  }, [])

  const pause = useCallback(async () => {
    await spotifyPlayer.pause()
  }, [])

  const seek = useCallback(async (positionMs: number) => {
    await spotifyPlayer.seek(positionMs)
    setPosition(positionMs)
  }, [setPosition])

  const togglePlay = useCallback(async () => {
    await spotifyPlayer.togglePlay()
  }, [])

  useEffect(() => {
    if (!playerState.track) return

    const trackDuration = playerState.track.durationMs
    const progress = playerState.positionMs / trackDuration

    if (progress >= 0.85 && !trackEndTriggeredRef.current) {
      trackEndTriggeredRef.current = true
      const event: DJEvent = {
        type: 'TRACK_END',
        track: playerState.track,
      }
    } else if (progress < 0.85) {
      trackEndTriggeredRef.current = false
    }
  }, [playerState.positionMs, playerState.track])

  useEffect(() => {
    return () => {
      spotifyPlayer.disconnect()
    }
  }, [])

  return {
    initializePlayer,
    play,
    pause,
    seek,
    togglePlay,
    isReady: playerState.isReady,
    isPaused: playerState.isPaused,
    currentTrack: playerState.track,
    positionMs: playerState.positionMs,
  }
}
