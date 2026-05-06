'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import SiriWave from 'siriwave'
import { signOut } from 'next-auth/react'

export default function WaveformHeader() {
  const { isPlaying, djStatus } = useStore()
  const [currentTime, setCurrentTime] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const siriWaveRef = useRef<any>(null)

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

    // Initialize SiriWave
    siriWaveRef.current = new SiriWave({
      container: containerRef.current,
      width: containerRef.current.offsetWidth,
      height: 300,
      style: 'ios9',
      amplitude: isPlaying ? 1.5 : 0.2,
      speed: 0.15,
      autostart: true,
    })

    const handleResize = () => {
      if (siriWaveRef.current && containerRef.current) {
        siriWaveRef.current.width = containerRef.current.offsetWidth
        siriWaveRef.current.height = 300
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (siriWaveRef.current) {
        siriWaveRef.current.dispose()
      }
    }
  }, []) // Initialize once

  // Update amplitude when playing or speaking changes
  useEffect(() => {
    if (siriWaveRef.current) {
      const targetAmplitude = djStatus.isSpeaking ? 2.5 : (isPlaying ? 1.2 : 0.1)
      siriWaveRef.current.setAmplitude(targetAmplitude)
      siriWaveRef.current.setSpeed(djStatus.isSpeaking ? 0.3 : 0.15)
    }
  }, [isPlaying, djStatus.isSpeaking])

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
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.9;
          z-index: 1;
          transform: translateY(30px);
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
          pointer-events: auto;
        }

        .signout-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          font-size: 10px;
          padding: 4px 8px;
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
