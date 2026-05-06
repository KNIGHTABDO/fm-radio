'use client'

import { useEffect, useState, useCallback, CSSProperties } from 'react'
import { useStore } from '@/lib/store'

const BASE_HEIGHTS = [
  8, 12, 15, 18, 24, 28, 35, 42, 48, 55,
  62, 70, 78, 82, 88, 92, 88, 82, 75, 68,
  72, 80, 88, 95, 100, 105, 108, 105, 100, 95,
  88, 82, 75, 68, 62, 55, 48, 42, 35, 28,
  24, 18, 15, 12, 8, 10, 14, 18, 22, 16,
]

export default function WaveformHeader() {
  const { isPlaying, tweakSettings, setTweaksPanelOpen, tweaksPanelOpen } = useStore()
  const [barHeights, setBarHeights] = useState(BASE_HEIGHTS)
  const [currentTime, setCurrentTime] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: false,
        })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      setBarHeights(BASE_HEIGHTS)
      return
    }

    const interval = setInterval(() => {
      setBarHeights((prev) =>
        prev.map((h) => {
          const variation = Math.random() * 0.6 + 0.7
          return Math.min(110, h * variation)
        })
      )
    }, 80)

    return () => clearInterval(interval)
  }, [isPlaying])

  const toggleTweaks = useCallback(() => {
    setTweaksPanelOpen(!tweaksPanelOpen)
  }, [tweaksPanelOpen, setTweaksPanelOpen])

  const displayHeights = isMobile ? barHeights.slice(0, 30) : barHeights
  const waveformHeight = isMobile ? 100 : 120

  const headerStyle: CSSProperties = {
    background: `
      radial-gradient(ellipse at 30% 50%, hsla(var(--hue1), 65%, 18%, 0.65), transparent 55%),
      radial-gradient(ellipse at 72% 55%, hsla(var(--hue2), 65%, 18%, 0.65), transparent 55%),
      var(--bg)
    `,
  }

  return (
    <header className="waveform-header" style={headerStyle}>
      <nav className="nav-row">
        <div className="nav-left">
          <div className="avatar">C</div>
          <span className="nav-label">Claudio</span>
        </div>

        <span className="clock">{currentTime}</span>

        <button
          onClick={toggleTweaks}
          className="settings-btn"
          aria-label="Settings"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </nav>

      <div className="waveform-container" style={{ height: waveformHeight }}>
        {displayHeights.map((height, i) => (
          <div
            key={i}
            className="waveform-bar"
            style={{ height }}
          />
        ))}
      </div>

      <style jsx>{`
        .waveform-header {
          position: relative;
          min-height: 220px;
          backdrop-filter: blur(var(--blur));
          -webkit-backdrop-filter: blur(var(--blur));
          overflow: hidden;
        }

        .nav-row {
          display: flex;
          align-items: center;
          padding: 24px 28px;
          position: relative;
          z-index: 10;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2a2a35 0%, #1a1a22 100%);
          border: 2px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 14;
          color: rgba(255, 255, 255, 0.7);
        }

        .nav-label {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.45);
          letter-spacing: 0.05em;
        }

        .clock {
          flex: 1;
          font-family: var(--font-mono);
          font-size: 13px;
          color: rgba(255, 255, 255, 0.45);
          text-align: right;
        }

        .settings-btn {
          margin-left: 24px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          opacity: 0.45;
          transition: opacity 0.2s;
        }

        .settings-btn:hover {
          opacity: 0.7;
        }

        .waveform-container {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 2px;
          padding: 0 28px 32px;
          position: relative;
          z-index: 5;
        }

        .waveform-bar {
          width: 2px;
          background-color: var(--white-wave);
          border-radius: 2px 2px 0 0;
          transition: height 0.08s ease;
        }

        @media (max-width: 640px) {
          .waveform-header {
            min-height: 160px;
          }

          .nav-row {
            padding: 16px 20px;
          }

          .avatar {
            width: 32px;
            height: 32px;
            font-size: 12px;
          }

          .nav-label {
            font-size: 12px;
          }

          .clock {
            font-size: 12px;
          }

          .settings-btn {
            margin-left: 16px;
            padding: 6px;
          }

          .waveform-container {
            padding: 0 20px 24px;
            gap: 1.5px;
          }

          .waveform-bar {
            width: 1.5px;
          }
        }
      `}</style>
    </header>
  )
}
