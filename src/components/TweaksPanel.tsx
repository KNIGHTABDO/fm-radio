'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function TweaksPanel() {
  const { tweaksPanelOpen, tweakSettings, setTweakSettings, setTweaksPanelOpen } = useStore()

  useEffect(() => {
    document.documentElement.style.setProperty('--hue1', `${tweakSettings.hue1}deg`)
    document.documentElement.style.setProperty('--hue2', `${tweakSettings.hue2}deg`)
    document.documentElement.style.setProperty('--blur', `${tweakSettings.blur}px`)
  }, [tweakSettings])

  if (!tweaksPanelOpen) return null

  return (
    <div className="tweaks-panel">
      <div className="tweaks-header">
        <span className="tweaks-label">Header tone</span>
        <button
          onClick={() => setTweaksPanelOpen(false)}
          className="close-btn"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="slider-group">
        <label className="slider-label">Violet hue</label>
        <input
          type="range"
          min="200"
          max="300"
          value={tweakSettings.hue1}
          onChange={(e) => setTweakSettings({ hue1: Number(e.target.value) })}
          className="slider"
        />
      </div>

      <div className="slider-group">
        <label className="slider-label">Magenta hue</label>
        <input
          type="range"
          min="280"
          max="360"
          value={tweakSettings.hue2}
          onChange={(e) => setTweakSettings({ hue2: Number(e.target.value) })}
          className="slider"
        />
      </div>

      <div className="slider-group">
        <label className="slider-label">Blur</label>
        <input
          type="range"
          min="20"
          max="120"
          value={tweakSettings.blur}
          onChange={(e) => setTweakSettings({ blur: Number(e.target.value) })}
          className="slider"
        />
      </div>

      <style jsx>{`
        .tweaks-panel {
          position: absolute;
          top: 24px;
          right: 28px;
          width: 280px;
          background: rgba(8, 8, 16, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
          z-index: 100;
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .tweaks-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .tweaks-label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          opacity: 0.5;
          transition: opacity 0.2s;
        }

        .close-btn:hover {
          opacity: 1;
        }

        .slider-group {
          margin-bottom: 20px;
        }

        .slider-group:last-child {
          margin-bottom: 0;
        }

        .slider-label {
          display: block;
          font-family: var(--font-mono);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 8px;
        }

        .slider {
          width: 100%;
          height: 2px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 1px;
          outline: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }

        @media (max-width: 640px) {
          .tweaks-panel {
            width: calc(100vw - 32px);
            right: 16px;
            top: 16px;
          }
        }
      `}</style>
    </div>
  )
}
