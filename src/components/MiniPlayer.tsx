'use client'

import { useStore } from '@/lib/store'
import { useMemo } from 'react'

const SCRUBBER_BARS = 30

const BASE_HEIGHTS = [
  6, 8, 10, 12, 8, 14, 10, 12, 6, 8,
  10, 14, 12, 8, 10, 6, 12, 8, 10, 14,
  12, 8, 10, 6, 8, 12, 10, 14, 8, 10,
]

export default function MiniPlayer() {
  const { playerState, isPlaying, setIsPlaying } = useStore()
  const { positionMs } = playerState

  const trackDuration = 243000
  const progress = positionMs / trackDuration
  const currentBarIndex = Math.floor(progress * SCRUBBER_BARS)

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const bars = useMemo(() => {
    return BASE_HEIGHTS.map((height, i) => ({
      height,
      isPlayed: i < currentBarIndex,
    }))
  }, [currentBarIndex])

  return (
    <footer
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: '#111111',
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        gap: 16,
        zIndex: 50,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'rgba(255,255,255,0.45)',
          flexShrink: 0,
        }}
      >
        {formatTime(positionMs)}
      </span>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        {bars.map((bar, i) => (
          <div
            key={i}
            style={{
              width: 1,
              height: bar.height,
              backgroundColor: bar.isPlayed
                ? 'rgba(255,255,255,0.75)'
                : 'rgba(255,255,255,0.18)',
              borderRadius: 0.5,
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>

      <button
        onClick={handlePlayPause}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
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
    </footer>
  )
}
