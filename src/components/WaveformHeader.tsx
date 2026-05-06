'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { audioEngine } from '@/lib/audio'
import SiriWave from 'siriwave'
import { signOut } from 'next-auth/react'

export default function WaveformHeader() {
  const { isPlaying, djStatus } = useStore()
  const [currentTime, setCurrentTime] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const siriWaveRef = useRef<any>(null)
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null)

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
    if (siriWaveRef.current) {
      if (djStatus.isSpeaking) return
      const targetAmplitude = isPlaying ? 0.8 : 0.15
      siriWaveRef.current.setAmplitude(targetAmplitude)
      siriWaveRef.current.setSpeed(isPlaying ? 0.12 : 0.04)
    }
  }, [isPlaying, djStatus.isSpeaking])

  useEffect(() => {
    if (!djStatus.isSpeaking) return
    if (!siriWaveRef.current) return

    siriWaveRef.current.setSpeed(0.18)

    let rafId: number | null = null
    const tick = () => {
      const level = audioEngine.getDJLevel01()
      const amp = Math.max(0.2, Math.min(3.2, 0.2 + level * 3.0))
      siriWaveRef.current?.setAmplitude(amp)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [djStatus.isSpeaking])

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
      `}</style>
    </header>
  )
}
