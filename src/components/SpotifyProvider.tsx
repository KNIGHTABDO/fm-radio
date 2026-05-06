'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { spotifyPlayer } from '@/lib/spotify'

interface SpotifyProviderProps {
  children: React.ReactNode
}

export default function SpotifyProvider({ children }: SpotifyProviderProps) {
  const { setPlayerState, setTrack, setPosition, setIsPaused, setIsPlaying } = useStore()

  useEffect(() => {
    const initSpotify = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const session = await response.json()

        if (session?.accessToken) {
          await spotifyPlayer.initialize(session.accessToken)

          spotifyPlayer.onStateChange((state) => {
            if (state.track) {
              setTrack(state.track)
            }
            setPosition(state.positionMs)
            setIsPaused(state.isPaused)
            setPlayerState({ isReady: true })
            setIsPlaying(!state.isPaused)
          })
        }
      } catch (error) {
        console.error('Failed to initialize Spotify:', error)
      }
    }

    initSpotify()

    return () => {
      spotifyPlayer.disconnect()
    }
  }, [setTrack, setPosition, setIsPaused, setPlayerState, setIsPlaying])

  return <>{children}</>
}
