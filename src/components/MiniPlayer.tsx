'use client'

import { useStore } from '@/lib/store'
import { useMemo, useCallback, useEffect, useRef } from 'react'
import { spotifyPlayer } from '@/lib/spotify'
import { audioEngine } from '@/lib/audio'

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
      spotifyPlayer.togglePlay()
    } else {
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying, setIsPlaying, playerState.isReady])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    audioEngine.setSpotifyVolume(newVolume)
  }, [setVolume])

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

  return (
    <footer className="mini-player">
      <span className="timestamp">{formatTime(positionMs)}</span>

      <div className="scrubber">
        {bars.map((bar, i) => (
          <div
            key={i}
            className="scrubber-bar"
            data-played={bar.isPlayed}
          />
        ))}
      </div>

      <div className="volume-control">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          {volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
          {volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
        </svg>
        <input
          ref={volumeRef}
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider"
        />
      </div>

      <button
        onClick={handlePlayPause}
        className="play-btn"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#111111">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#111111">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        )}
      </button>

      <style jsx>{`
        .mini-player {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: #111111;
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 16px;
          z-index: 50;
        }

        .timestamp {
          font-family: var(--font-mono);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.45);
          flex-shrink: 0;
          min-width: 40px;
        }

        .scrubber {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1px;
        }

        .scrubber-bar {
          width: 1px;
          background-color: rgba(255, 255, 255, 0.18);
          border-radius: 0.5px;
          transition: background-color 0.3s ease;
        }

        .scrubber-bar[data-played="true"] {
          background-color: rgba(255, 255, 255, 0.75);
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.4);
          flex-shrink: 0;
        }

        .volume-slider {
          width: 60px;
          height: 2px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 1px;
          outline: none;
          cursor: pointer;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }

        .volume-slider::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }

        .play-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.15s;
        }

        .play-btn:hover {
          transform: scale(1.05);
        }

        .play-btn:active {
          transform: scale(0.98);
        }

        @media (max-width: 640px) {
          .mini-player {
            padding: 0 12px;
            gap: 10px;
          }

          .volume-control {
            display: none;
          }

          .timestamp {
            font-size: 10px;
          }
        }
      `}</style>
    </footer>
  )
}
