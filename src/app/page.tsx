'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useStore } from '@/lib/store'
import WaveformHeader from '@/components/WaveformHeader'
import TrackCard from '@/components/TrackCard'
import MiniPlayer from '@/components/MiniPlayer'
import TweaksPanel from '@/components/TweaksPanel'
import { spotifyPlayer } from '@/lib/spotify'
import type { SpotifyTrack } from '@/types'

const DEFAULT_TRACK: SpotifyTrack = {
  name: 'Midnight City',
  artist: 'M83',
  album: 'Hurry Up, We\'re Dreaming',
  albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
  durationMs: 243000,
}

export default function Home() {
  const { data: session } = useSession()
  const { 
    isPlaying, 
    setPosition, 
    playerState,
    transcript,
    addTranscriptEntry,
    updateTranscriptEntry,
    djStatus,
    setDJStatus,
    setTrack,
  } = useStore()

  const initializedRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    setTrack(DEFAULT_TRACK)
  }, [setTrack])

  useEffect(() => {
    if (!session?.accessToken) return

    spotifyPlayer.initialize(session.accessToken).then(() => {
      spotifyPlayer.onStateChange((state) => {
        if (state.track) {
          setTrack(state.track)
        }
        setPosition(state.positionMs)
        useStore.getState().setIsPaused(state.isPaused)
        useStore.getState().setPlayerState({ isReady: true })
      })
    })
  }, [session?.accessToken, setTrack, setPosition])

  useEffect(() => {
    if (!isPlaying) return

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
  }, [isPlaying, playerState.positionMs, playerState.track, setPosition])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const initialEntries = [
      {
        id: 'entry-1',
        speaker: 'Claudio' as const,
        text: 'There is something about the hours after midnight that makes everything feel possible.',
        timestamp: 0,
        status: 'past' as const,
      },
      {
        id: 'entry-2',
        speaker: 'Claudio' as const,
        text: 'M83 came to define a certain kind of cinematic ambition in electronic music.',
        timestamp: 45000,
        status: 'past' as const,
      },
      {
        id: 'entry-3',
        speaker: 'Claudio' as const,
        text: 'The synths here feel like they are reaching for something just beyond the horizon.',
        timestamp: 120000,
        status: 'active' as const,
        wordIndex: 0,
      },
      {
        id: 'entry-4',
        speaker: 'Claudio' as const,
        text: 'Later, we will hear something quieter. For now, let this carry you.',
        timestamp: 200000,
        status: 'future' as const,
      },
    ]

    initialEntries.forEach((entry) => addTranscriptEntry(entry))
  }, [addTranscriptEntry])

  useEffect(() => {
    const activeEntry = transcript.find((e) => e.status === 'active')
    if (!activeEntry || !isPlaying) return

    const words = activeEntry.text.split(' ')
    const durationPerWord = 350

    let wordIndex = activeEntry.wordIndex || 0

    const interval = setInterval(() => {
      if (wordIndex < words.length - 1) {
        wordIndex++
        updateTranscriptEntry(activeEntry.id, { wordIndex })
      } else {
        clearInterval(interval)
        updateTranscriptEntry(activeEntry.id, { status: 'past', wordIndex: undefined })
        setDJStatus({ isSpeaking: false, currentNarration: null })
      }
    }, durationPerWord)

    setDJStatus({ isSpeaking: true, currentNarration: activeEntry.text })

    return () => clearInterval(interval)
  }, [isPlaying, transcript, updateTranscriptEntry, setDJStatus])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !session?.accessToken) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(searchQuery)}&token=${session.accessToken}`
      )
      const data = await response.json()
      setSearchResults(data.tracks || [])
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const playTrack = async (track: SpotifyTrack) => {
    if (!session?.accessToken) return

    setTrack(track)
    setPosition(0)
    setSearchResults([])

    await spotifyPlayer.play(track.uri)
  }

  const togglePlay = () => {
    if (playerState.isReady && session?.accessToken) {
      spotifyPlayer.togglePlay()
    } else {
      useStore.getState().setIsPlaying(!isPlaying)
    }
  }

  if (!session) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          style={{
            background: 'var(--card)',
            borderRadius: 24,
            padding: 48,
            maxWidth: 400,
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              marginBottom: 16,
              color: 'var(--text-dark)',
            }}
          >
            FM — Claudio
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-muted)',
              marginBottom: 32,
              lineHeight: 1.6,
            }}
          >
            A personal AI radio station with cinematic narration from your very own DJ.
          </p>
          <button
            onClick={() => signIn('spotify')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: '#1DB954',
              color: 'white',
              border: 'none',
              borderRadius: 24,
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Connect with Spotify
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        paddingBottom: 80,
      }}
    >
      <div style={{ position: 'relative' }}>
        <WaveformHeader />
        <TweaksPanel />
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px' }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for a song..."
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--text-dark)',
              color: 'white',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              cursor: 'pointer',
              opacity: isSearching ? 0.6 : 1,
            }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
            }}
          >
            {searchResults.map((track) => (
              <button
                key={track.uri}
                onClick={() => playTrack(track)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                {track.albumArt && (
                  <img
                    src={track.albumArt}
                    alt=""
                    style={{ width: 40, height: 40, borderRadius: 4 }}
                  />
                )}
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      color: 'white',
                    }}
                  >
                    {track.name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {track.artist}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <TrackCard />
      <MiniPlayer />
    </div>
  )
}
