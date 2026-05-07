'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useStore } from '@/lib/store'
import WaveformHeader from '@/components/WaveformHeader'
import TrackCard from '@/components/TrackCard'
import { spotifyPlayer } from '@/lib/spotify'
import type { SpotifyTrack } from '@/types'
import { useDJ } from '@/hooks/useDJ'

const DEFAULT_TRACK: SpotifyTrack = {
  name: 'Tuning In...',
  artist: 'Claudio',
  album: 'Live FM',
  albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
  durationMs: 0,
}

export default function Home() {
  const { data: session } = useSession()
  const { 
    isPlaying, 
    setPosition, 
    playerState,
    setPlayerState,
    setTrack,
    setIsPlaying,
    selectedPlaylist,
  } = useStore()


  const lastAnnouncedTrackRef = useRef<string>('')
  const endSequenceRef = useRef<string>('')
  const autoStartedRef = useRef(false)

  const { triggerEvent } = useDJ()
  const accessToken = session?.accessToken
  const trackUri = playerState.track?.uri
  const trackId = playerState.track?.id
  const trackDuration = playerState.track?.durationMs || DEFAULT_TRACK.durationMs
  const remainingMs = useMemo(
    () => trackDuration - playerState.positionMs,
    [trackDuration, playerState.positionMs]
  )

  useEffect(() => {
    setTrack(DEFAULT_TRACK)
  }, [setTrack])

  useEffect(() => {
    if (!isPlaying) return
    if (playerState.isReady) return

    const interval = setInterval(() => {
      const newPosition = playerState.positionMs + 1000
      const duration = playerState.track?.durationMs || DEFAULT_TRACK.durationMs
      if (newPosition >= duration) {
        setPosition(0)
      } else {
        setPosition(newPosition)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, playerState.isReady, playerState.positionMs, playerState.track, setPosition])

  useEffect(() => {
    if (playerState.isReady) {
      setIsPlaying(!playerState.isPaused)
    }
  }, [playerState.isPaused, playerState.isReady, setIsPlaying])

  useEffect(() => {
    if (!accessToken) return
    if (selectedPlaylist) return
    if (trackUri && playerState.track?.name !== 'Tuning In...') return

    const genres = [
      'lofi', 'chill', 'synthwave', 'ambient', 'dream pop', 'indie', 'deep house', 
      'shoegaze', 'post-rock', 'jazz', 'vaporwave', 'future garage', 'trip-hop'
    ]
    const randomGenre = genres[Math.floor(Math.random() * genres.length)]
    
    fetch(`/api/spotify/search?q=${encodeURIComponent('genre:' + randomGenre)}&token=${accessToken}`)
      .then((r) => r.json())
      .then((data) => {
        const tracks = data?.tracks || []
        if (tracks.length > 0) {
          const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]
          setTrack(randomTrack)
          setPlayerState({ positionMs: 0 })
          // Force play to override any external playback
          spotifyPlayer.play(randomTrack.uri).catch(() => {})
        }
      })
      .catch(() => {})
  }, [accessToken, selectedPlaylist, trackUri, playerState.track, setTrack, setPlayerState])

  useEffect(() => {
    if (!accessToken) return
    if (!playerState.isReady) return
    if (!selectedPlaylist) return

    spotifyPlayer.setShuffle(true).catch(() => {})
    spotifyPlayer.playContext(selectedPlaylist.uri).catch(() => {})
  }, [accessToken, playerState.isReady, selectedPlaylist])

  // 1. Initial/Refresh narration & Milestone narration
  const milestonesRef = useRef<Set<number>>(new Set())
  const pausedAtRef = useRef<number | null>(null)
  const pauseTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isPlaying) return
    if (!trackUri || !playerState.track) return

    const { durationMs, name } = playerState.track
    const positionMs = playerState.positionMs
    if (durationMs <= 0) return

    // Milestone Logic: 25%, 50%, 75%
    const progress = positionMs / durationMs
    const currentMilestone = [0.25, 0.5, 0.75].find(m => 
      progress >= m && progress < m + 0.05 && !milestonesRef.current.has(m)
    )

    if (currentMilestone) {
      milestonesRef.current.add(currentMilestone)
      triggerEvent({
        type: 'MID_TRACK',
        track: playerState.track,
        position_ms: positionMs,
      })
    }

    // Immediate narration on refresh/first-load
    if (lastAnnouncedTrackRef.current !== trackUri) {
      lastAnnouncedTrackRef.current = trackUri
      milestonesRef.current.clear() // Reset milestones for new track
      
      triggerEvent({
        type: 'TRACK_START',
        track: playerState.track,
        position_ms: positionMs,
      })
    }
  }, [isPlaying, trackUri, playerState.positionMs, triggerEvent, playerState.track])

  useEffect(() => {
    if (!playerState.isReady) return
    if (!playerState.track) return

    if (playerState.isPaused) {
      if (pausedAtRef.current == null) pausedAtRef.current = Date.now()
      if (pauseTimerRef.current == null) {
        pauseTimerRef.current = window.setTimeout(() => {
          const state = useStore.getState()
          const track = state.playerState.track
          if (!track) return
          if (!state.playerState.isPaused) return
          const remaining = (track.durationMs || 0) - state.playerState.positionMs
          if (remaining > 0 && remaining < 8000) return
          const pausedAt = pausedAtRef.current ?? Date.now()
          triggerEvent({
            type: 'USER_PAUSED',
            track,
            pausedFor: Date.now() - pausedAt,
          })
        }, 1800)
      }
      return
    }

    pausedAtRef.current = null
    if (pauseTimerRef.current != null) {
      window.clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }
  }, [playerState.isPaused, playerState.isReady, playerState.track, triggerEvent])

  useEffect(() => {
    pausedAtRef.current = null
    if (pauseTimerRef.current != null) {
      window.clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }
  }, [trackUri])



  useEffect(() => {
    if (!accessToken) return
    if (!playerState.isReady) return
    if (!trackId || !trackUri) return
    if (playerState.track?.name === 'Tuning In...') return // Don't trigger end logic for placeholder
    if (selectedPlaylist) return
    
    // Trigger slightly before end (8s) or if the track has naturally stopped (remainingMs <= 0)
    const isNearEnd = remainingMs > 0 && remainingMs < 8000
    const hasFinished = playerState.isPaused && remainingMs <= 1000 && lastAnnouncedTrackRef.current === trackUri

    if (!isNearEnd && !hasFinished) return
    if (endSequenceRef.current === trackUri) return
    endSequenceRef.current = trackUri

    ;(async () => {
      await triggerEvent({ type: 'TRACK_END', track: playerState.track! })

      let nextUri = ''
      const recRes = await fetch(
        `https://api.spotify.com/v1/recommendations?limit=1&seed_tracks=${encodeURIComponent(trackId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ).catch(() => null)

      if (recRes && recRes.ok) {
        const recData = await recRes.json().catch(() => null)
        nextUri = recData?.tracks?.[0]?.uri
      }

      // Fallback: search for something random if recommendation failed
      if (!nextUri) {
        const fallbackGenres = ['lofi', 'chill', 'ambient', 'synthwave']
        const g = fallbackGenres[Math.floor(Math.random() * fallbackGenres.length)]
        const searchRes = await fetch(
          `/api/spotify/search?q=${encodeURIComponent('genre:' + g)}&token=${accessToken}`
        ).catch(() => null)
        
        if (searchRes && searchRes.ok) {
          const searchData = await searchRes.json().catch(() => null)
          const tracks = searchData?.tracks || []
          if (tracks.length > 0) {
            const next = tracks[Math.floor(Math.random() * tracks.length)]
            setTrack(next)
            setPlayerState({ positionMs: 0 })
            await spotifyPlayer.play(next.uri)
            return
          }
        }
      }

      if (nextUri) {
        // Fetch full track details for the recommendation
        const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${nextUri.split(':').pop()}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }).catch(() => null)
        
        if (trackRes && trackRes.ok) {
          const t = await trackRes.json()
          const nextTrack: SpotifyTrack = {
            id: t.id,
            name: t.name,
            artist: t.artists?.map((a: any) => a.name).join(', '),
            album: t.album?.name,
            albumArt: t.album?.images?.[0]?.url || '',
            durationMs: t.duration_ms,
            uri: t.uri,
          }
          setTrack(nextTrack)
          setPlayerState({ positionMs: 0 })
          await spotifyPlayer.play(nextTrack.uri)
        }
      } else {
        endSequenceRef.current = '' // Allow retry
      }
    })()
  }, [accessToken, playerState.isReady, playerState.isPaused, selectedPlaylist, trackId, trackUri, remainingMs, triggerEvent, playerState.track, setTrack, setPlayerState])

  if (!session) {
    return (
      <div className="app-stage">
        <div className="auth-card">
          <h1 className="auth-title">FM — Claudio</h1>
          <p className="auth-subtitle">
            A personal AI radio station with cinematic narration from your very own DJ.
          </p>
          <button onClick={() => signIn('spotify')} className="auth-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Connect with Spotify
          </button>
        </div>
        <style jsx>{`
          .app-stage {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0a0a0a;
            overflow: hidden;
          }
          .auth-card {
            background: #fff;
            padding: 40px;
            border-radius: 32px;
            max-width: 400px;
            text-align: center;
            color: #000;
          }
          .auth-title { font-family: var(--font-pixel); font-size: 32px; margin-bottom: 12px; }
          .auth-subtitle { color: #666; margin-bottom: 32px; font-size: 15px; }
          .auth-button {
            background: #1DB954;
            color: #fff;
            border: none;
            padding: 16px 32px;
            border-radius: 100px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            cursor: pointer;
            width: 100%;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="app-stage">
      <div className="app-shell">
        <div className="main-content" onClick={() => {
          import('@/lib/audio').then(({ audioEngine }) => {
            audioEngine.init().catch(() => {})
          })
        }}>
          <WaveformHeader />
          <div className="card-wrapper">
            <TrackCard />
          </div>
        </div>
      </div>
      <style jsx>{`
        .app-stage {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          overflow: hidden;
        }

        .app-shell {
          width: 390px;
          height: min(844px, 95vh);
          background: #fff;
          border-radius: 44px;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
          box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5);
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          scrollbar-width: none;
          background: #000; /* Header area is black */
        }
        .main-content::-webkit-scrollbar { display: none; }
        
        .card-wrapper {
          margin-top: auto;
          position: relative;
          z-index: 20;
          display: flex;
          flex-direction: column;
        }

        @media (min-width: 768px) {
          .app-stage {
            padding: 24px;
          }

          .app-shell {
            width: min(1024px, 94vw);
            height: min(740px, 92vh);
            background: #000;
            border-radius: 64px;
            box-shadow: 0 70px 140px -30px rgba(0,0,0,0.65);
          }

          .app-shell::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            border: 1px solid rgba(255, 255, 255, 0.08);
            pointer-events: none;
            z-index: 50;
          }

          .main-content {
            flex-direction: row;
            overflow: hidden;
            background: #000;
          }

          .card-wrapper {
            margin-top: 0;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 88px 88px 80px 0;
            flex: 0 0 min(660px, 58%);
          }
        }

        @media (min-width: 1024px) {
          .card-wrapper {
            padding: 92px 110px 86px 0;
            flex-basis: min(720px, 60%);
          }
        }
      `}</style>
    </div>
  )
}
