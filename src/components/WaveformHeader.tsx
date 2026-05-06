'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import SiriWave from 'siriwave'
import { signOut } from 'next-auth/react'

type SpotifySegment = {
  start: number
  duration: number
  loudness_start: number
  loudness_max: number
}

export default function WaveformHeader() {
  const { isPlaying, playerState } = useStore()
  const [currentTime, setCurrentTime] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const siriWaveRef = useRef<any>(null)
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null)
  const accessTokenRef = useRef<string | null>(null)
  const segmentsRef = useRef<SpotifySegment[] | null>(null)
  const lastLevelRef = useRef<number>(0)

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
    if (!containerRef.current) return

    const el = containerRef.current

    const ensureWave = () => {
      const rect = el.getBoundingClientRect()
      const nextWidth = Math.max(1, Math.floor(rect.width))
      const nextHeight = Math.max(1, Math.floor(rect.height))

      const last = lastSizeRef.current
      if (last && last.width === nextWidth && last.height === nextHeight && siriWaveRef.current) {
        return
      }

      if (siriWaveRef.current) {
        siriWaveRef.current.dispose()
      }

      siriWaveRef.current = new SiriWave({
        container: el,
        style: 'ios',
        width: nextWidth,
        height: nextHeight,
        cover: true,
        ratio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        speed: 0.12,
        amplitude: 0.15,
        frequency: 4,
        color: '#fff',
        autostart: true,
      })

      lastSizeRef.current = { width: nextWidth, height: nextHeight }
    }

    ensureWave()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', ensureWave)
      return () => {
        window.removeEventListener('resize', ensureWave)
        if (siriWaveRef.current) {
          siriWaveRef.current.dispose()
        }
      }
    }

    const ro = new ResizeObserver(() => ensureWave())
    ro.observe(el)

    return () => {
      ro.disconnect()
      if (siriWaveRef.current) {
        siriWaveRef.current.dispose()
      }
    }
  }, []) // Initialize once

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const session = await response.json()
        accessTokenRef.current = session?.accessToken || null
      } catch {
        accessTokenRef.current = null
      }
    }
    loadSession()
  }, [])

  useEffect(() => {
    const trackId = playerState.track?.id
    const token = accessTokenRef.current
    if (!trackId || !token) {
      segmentsRef.current = null
      return
    }

    const loadAnalysis = async () => {
      try {
        const url = `/api/spotify/audio-analysis?id=${encodeURIComponent(trackId)}&token=${encodeURIComponent(token)}`
        const response = await fetch(url)
        if (!response.ok) {
          segmentsRef.current = null
          return
        }
        const data = await response.json()
        const segments = Array.isArray(data?.segments) ? (data.segments as SpotifySegment[]) : null
        segmentsRef.current = segments && segments.length ? segments : null
      } catch {
        segmentsRef.current = null
      }
    }

    loadAnalysis()
  }, [playerState.track?.id])

  useEffect(() => {
    if (!siriWaveRef.current) return

    if (!isPlaying || playerState.isPaused) {
      siriWaveRef.current.setAmplitude(0.15)
      siriWaveRef.current.setSpeed(0.04)
      return
    }

    const segments = segmentsRef.current
    if (!segments || !segments.length) {
      siriWaveRef.current.setAmplitude(0.6)
      siriWaveRef.current.setSpeed(0.12)
      return
    }

    const t = playerState.positionMs / 1000

    let lo = 0
    let hi = segments.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const seg = segments[mid]
      if (t < seg.start) hi = mid - 1
      else if (t >= seg.start + seg.duration) lo = mid + 1
      else {
        lo = mid
        break
      }
    }

    const seg = segments[Math.min(Math.max(lo, 0), segments.length - 1)]
    const p = Math.max(0, Math.min(1, (t - seg.start) / Math.max(0.001, seg.duration)))
    const loudness = seg.loudness_start + (seg.loudness_max - seg.loudness_start) * p

    const level01 = Math.max(0, Math.min(1, (loudness + 60) / 60))
    const shaped = Math.pow(level01, 1.7)
    const targetAmp = 0.25 + shaped * 2.6

    const smoothed = lastLevelRef.current * 0.85 + targetAmp * 0.15
    lastLevelRef.current = smoothed

    siriWaveRef.current.setAmplitude(Math.max(0.2, Math.min(3.2, smoothed)))
    siriWaveRef.current.setSpeed(0.12)
  }, [isPlaying, playerState.isPaused, playerState.positionMs])

  return (
    <header className="waveform-header">
      <div ref={containerRef} className="siri-container" />
      
      <div className="status-bar">
        <div className="status-left">
          <img 
            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop" 
            className="avatar" 
            alt="Claudio" 
          />
          <div className="name">Claudio</div>
        </div>

        <div className="status-center">
          <div className="nav">
            <span>HOME</span>
            <span>XHS</span>
            <span>MUSIC</span>
          </div>
        </div>

        <div className="status-right">
          <div className="time">{currentTime}</div>
          <button onClick={() => signOut()} className="signout-btn">EXIT</button>
        </div>
      </div>

      <div className={`paused-label ${isPlaying ? 'hidden' : ''}`}>Paused</div>

      <style jsx>{`
        .waveform-header {
          height: 320px;
          position: sticky;
          top: 0;
          background: #000;
          overflow: hidden;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .siri-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0.9;
          z-index: 1;
          pointer-events: none;
        }

        .siri-container :global(canvas) {
          display: block;
          width: 100% !important;
          height: 100% !important;
        }

        .status-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          color: #fff;
          z-index: 10;
          pointer-events: none;
        }

        .status-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .status-center {
          flex: 2;
          display: flex;
          justify-content: center;
        }

        .status-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          justify-content: flex-end;
          pointer-events: auto;
        }

        .avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          object-fit: cover;
        }

        .name {
          font-family: var(--font-pixel);
          font-size: 26px;
          line-height: 1;
          letter-spacing: 1px;
          transform: translateY(1px);
        }

        .nav {
          display: flex;
          gap: 12px;
          font-size: 9px;
          letter-spacing: 2px;
          font-weight: 600;
          opacity: 0.7;
          white-space: nowrap;
        }

        .time {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .signout-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          font-size: 8px;
          padding: 3px 6px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 700;
          letter-spacing: 1px;
          transition: background 0.2s;
        }
        .signout-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .paused-label {
          position: absolute;
          top: 54px;
          left: 56px;
          color: #22c55e;
          font-size: 13px;
          font-weight: 500;
          z-index: 10;
          transition: opacity 0.3s;
        }

        .paused-label.hidden {
          opacity: 0;
        }

        @media (max-width: 640px) {
          .waveform-header {
            height: 320px;
          }
          .nav {
            display: none;
          }
        }

        @media (min-width: 768px) {
          .waveform-header {
            height: 100%;
            position: relative;
            top: auto;
            flex: 1;
          }

          .status-bar {
            padding: 32px 46px;
          }

          .status-center {
            display: none;
          }

          .avatar {
            width: 30px;
            height: 30px;
          }

          .name {
            font-size: 32px;
          }

          .paused-label {
            top: 70px;
            left: 72px;
          }
        }
      `}</style>
    </header>
  )
}
