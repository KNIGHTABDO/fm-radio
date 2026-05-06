'use client'

import { useStore } from '@/lib/store'
import { useMemo, useCallback, useEffect, useRef } from 'react'
import { spotifyPlayer } from '@/lib/spotify'

const SCRUBBER_BARS = 30

const BASE_HEIGHTS = [
  6, 8, 10, 12, 8, 14, 10, 12, 6, 8,
  10, 14, 12, 8, 10, 6, 12, 8, 10, 14,
  12, 8, 10, 6, 8, 12, 10, 14, 8, 10,
]

export default function MiniPlayer() {
  const { playerState, isPlaying, setIsPlaying, volume, setVolume } = useStore()
  const { positionMs } = playerState
  const volumeRef = useRef<HTMLInputElement>(null)
  const trackUri = playerState.track?.uri

  const trackDuration = playerState.track?.durationMs || 243000
  const progress = positionMs / trackDuration
  const currentBarIndex = Math.floor(progress * SCRUBBER_BARS)

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePlayPause = useCallback(() => {
    if (playerState.isReady) {
      if (playerState.isPaused) {
        spotifyPlayer.play().catch(() => {})
      } else {
        spotifyPlayer.pause().catch(() => {})
      }
    } else {
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying, setIsPlaying, playerState.isReady, playerState.isPaused])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (playerState.isReady) {
      spotifyPlayer.setVolume(newVolume).catch(() => {})
    }
  }, [setVolume, playerState.isReady])

  const bars = useMemo(() => {
    return BASE_HEIGHTS.map((height, i) => ({
      height,
      isPlayed: i < currentBarIndex,
    }))
  }, [currentBarIndex])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          handlePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          const seekBack = Math.max(0, positionMs - 10000)
          if (playerState.isReady) {
            spotifyPlayer.seek(seekBack)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          const seekForward = Math.min(trackDuration, positionMs + 10000)
          if (playerState.isReady) {
            spotifyPlayer.seek(seekForward)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(Math.min(1, volume + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(Math.max(0, volume - 0.1))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePlayPause, positionMs, trackDuration, playerState.isReady, volume, setVolume])

  useEffect(() => {
    if (!playerState.isReady) return
    spotifyPlayer.setVolume(volume).catch(() => {})
  }, [playerState.isReady, volume])

  return (
    <footer className="mini-player">
      <div className="mini-left">
        <span className="timestamp">{formatTime(positionMs)}</span>
      </div>

      <div className="scrubber">
        {bars.map((bar, i) => (
          <div
            key={i}
            className="scrubber-bar"
            data-played={bar.isPlayed}
            style={{ height: bar.height }}
          />
        ))}
      </div>

      <div className="mini-right">
        <button
          onClick={handlePlayPause}
          className="play-btn"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
      </div>

      <style jsx>{`
        .mini-player {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          padding: 0 32px;
          gap: 24px;
          z-index: 50;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mini-left, .mini-right {
          flex: 0 0 60px;
        }

        .mini-right {
          display: flex;
          justify-content: flex-end;
        }

        .timestamp {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
        }

        .scrubber {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }

        .scrubber-bar {
          width: 2px;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 1px;
          transition: background-color 0.3s ease;
        }

        .scrubber-bar[data-played="true"] {
          background-color: rgba(255, 255, 255, 0.8);
        }

        .play-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .play-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        @media (max-width: 640px) {
          .mini-player {
            padding: 0 20px;
            height: 72px;
          }

          .mini-left, .mini-right {
            flex: 0 0 40px;
          }
        }
      `}</style>
    </footer>
  )
}
