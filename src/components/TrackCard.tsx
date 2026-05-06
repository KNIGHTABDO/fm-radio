'use client'

import { useStore } from '@/lib/store'
import Transcript from './Transcript'

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

  const progress = (positionMs / track.durationMs) * 100

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <main className="track-card">
      <div className="episode-label">
        Claudio&apos;s Late Night Sessions
      </div>

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

      <div className="progress-row">
        <button
          onClick={handlePlayPause}
          className="play-button"
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

        <div className="progress-bar-container">
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <span className="time-display">
          {formatTime(positionMs)} / {formatTime(track.durationMs)}
        </span>
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
          margin-bottom: 8px;
        }

        .track-title {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 400;
          color: var(--text-dark);
          margin-bottom: 8px;
          line-height: 1.2;
        }

        .artist-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .artist-name {
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 300;
          color: var(--text-muted);
        }

        .apple-music-link {
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          text-decoration: none;
        }

        .apple-music-link svg {
          margin-left: 4px;
          vertical-align: middle;
        }

        .progress-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }

        .play-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--text-dark);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .play-button:hover {
          opacity: 0.9;
        }

        .progress-bar-container {
          flex: 1;
          position: relative;
        }

        .progress-bar-bg {
          height: 3px;
          background: #e0e0e0;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--text-dark);
          transition: width 1s linear;
        }

        .time-display {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
          flex-shrink: 0;
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

          .track-title {
            font-size: 24px;
          }

          .artist-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .progress-row {
            gap: 12px;
          }

          .time-display {
            font-size: 11px;
          }
        }
      `}</style>
    </main>
  )
}
