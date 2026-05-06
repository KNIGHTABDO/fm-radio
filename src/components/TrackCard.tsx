'use client'

import { useStore } from '@/lib/store'
import Transcript from './Transcript'
import { spotifyPlayer } from '@/lib/spotify'

export default function TrackCard() {
  const { playerState, djStatus, setIsPlaying } = useStore()
  const { positionMs } = playerState
  const isPlaying = useStore((s) => s.isPlaying)

  const track = playerState.track || {
    name: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We\'re Dreaming',
    albumArt: '',
    durationMs: 243000,
  }

  const progress = track.durationMs > 0 ? (positionMs / track.durationMs) * 100 : 0

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (playerState.isReady) {
      spotifyPlayer.togglePlay()
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  const handlePrev = () => {
    if (playerState.isReady) {
      spotifyPlayer.seek(0)
    }
  }

  const handleNext = () => {
    // For now, just restart. Queue logic would go here
    if (playerState.isReady) {
      spotifyPlayer.seek(0)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const seekPosition = Math.floor(percentage * track.durationMs)
    
    if (playerState.isReady) {
      spotifyPlayer.seek(seekPosition)
    }
  }

  return (
    <main className="track-card">
      <div className="episode-label">
        Claudio&apos;s Late Night Sessions
      </div>

      <div className="track-info">
        {track.albumArt && (
          <div className="album-art-container">
            <img
              src={track.albumArt}
              alt={`${track.album} cover`}
              className="album-art"
            />
          </div>
        )}
        <div className="track-text">
          <h1 className="track-title">
            {track.name}
          </h1>

          <div className="artist-row">
            <span className="artist-name">
              {track.artist}
            </span>
            <a href="#" className="apple-music-link">
              Listen on Apple Music
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="progress-row">
        <div className="play-controls">
          <button onClick={handlePrev} className="control-btn prev" aria-label="Previous">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button
            onClick={handlePlayPause}
            className="play-button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          <button onClick={handleNext} className="control-btn next" aria-label="Next">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6z"/>
            </svg>
          </button>
        </div>

        <div className="progress-bar-container">
          <span className="time-display start">{formatTime(positionMs)}</span>
          <div className="progress-bar-bg" onClick={handleSeek}>
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="time-display end">{formatTime(track.durationMs)}</span>
        </div>
      </div>

      <div className="dj-status">
        <span className={djStatus.isSpeaking ? 'speaking' : ''}>
          {djStatus.isSpeaking ? (
            <>
              <span className="speaking-dot" />
              Speaking...
            </>
          ) : (
            'Paused'
          )}
        </span>
      </div>

      <Transcript />

      <style jsx>{`
        .track-card {
          background: var(--card);
          border-radius: 24px;
          padding: 28px;
          margin: 0;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .episode-label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .track-info {
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
        }

        .album-art-container {
          flex-shrink: 0;
        }

        .album-art {
          width: 120px;
          height: 120px;
          border-radius: 8px;
          object-fit: cover;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          transition: transform 0.3s ease;
        }

        .album-art:hover {
          transform: scale(1.02);
        }

        .track-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .track-title {
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 400;
          color: var(--text-dark);
          margin: 0 0 8px;
          line-height: 1.1;
        }

        .artist-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .artist-name {
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 300;
          color: var(--text-muted);
        }

        .apple-music-link {
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .apple-music-link:hover {
          opacity: 0.7;
        }

        .apple-music-link svg {
          margin-left: 4px;
          vertical-align: middle;
        }

        .progress-row {
          margin-bottom: 16px;
        }

        .play-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 16px;
        }

        .control-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: var(--text-muted);
          opacity: 0.5;
          transition: opacity 0.2s, transform 0.15s;
        }

        .control-btn:hover {
          opacity: 1;
        }

        .control-btn:active {
          transform: scale(0.95);
        }

        .play-button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--text-dark);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s, opacity 0.2s;
        }

        .play-button:hover {
          transform: scale(1.05);
        }

        .play-button:active {
          transform: scale(0.98);
        }

        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .time-display {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
          min-width: 36px;
        }

        .time-display.start {
          text-align: right;
        }

        .time-display.end {
          text-align: left;
        }

        .progress-bar-bg {
          flex: 1;
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          overflow: hidden;
          cursor: pointer;
          transition: height 0.15s ease;
        }

        .progress-bar-bg:hover {
          height: 6px;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--text-dark);
          transition: width 1s linear;
        }

        .dj-status {
          margin-bottom: 20px;
        }

        .dj-status span {
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
        }

        .dj-status .speaking {
          color: var(--accent);
        }

        .speaking-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          margin-right: 8px;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @media (max-width: 640px) {
          .track-card {
            border-radius: 16px;
            padding: 20px;
          }

          .track-info {
            flex-direction: column;
            gap: 16px;
          }

          .album-art {
            width: 100%;
            height: 200px;
            border-radius: 12px;
          }

          .track-title {
            font-size: 24px;
          }

          .artist-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </main>
  )
}
