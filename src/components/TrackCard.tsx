'use client'

import { useStore } from '@/lib/store'
import { useEffect, useRef, useState, useCallback } from 'react'
import { spotifyPlayer } from '@/lib/spotify'
import Transcript from './Transcript'
import { useSession } from 'next-auth/react'
import type { SpotifyPlaylist } from '@/types'

export default function TrackCard() {
  const { data: session } = useSession()
  const { playerState, setIsPlaying, selectedPlaylist, setSelectedPlaylist } = useStore()
  const { positionMs } = playerState
  const isPlaying = useStore((s) => s.isPlaying)
  const miniCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [playlistsLoading, setPlaylistsLoading] = useState(false)

  const track = playerState.track || {
    name: 'Discovery Mode',
    artist: 'Claudio',
    album: 'Ambient FM',
    albumArt: '',
    durationMs: 0,
  }

  const progressPercentage = (positionMs / track.durationMs) * 100

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (playerState.isReady) {
      if (playerState.isPaused) {
        spotifyPlayer.play().catch(() => {})
      } else {
        spotifyPlayer.pause().catch(() => {})
      }
    } else {
      setIsPlaying(!isPlaying)
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

  const loadPlaylists = useCallback(async () => {
    const accessToken = (session as { accessToken?: string } | null)?.accessToken
    if (!accessToken) return
    if (playlistsLoading) return

    setPlaylistsLoading(true)
    try {
      const res = await fetch(`/api/spotify/playlists?token=${encodeURIComponent(accessToken)}`)
      if (!res.ok) return
      const data = await res.json()
      setPlaylists(Array.isArray(data?.playlists) ? data.playlists : [])
    } finally {
      setPlaylistsLoading(false)
    }
  }, [session, playlistsLoading])

  const handleSelectPlaylist = useCallback(
    async (pl: SpotifyPlaylist) => {
      setSelectedPlaylist(pl)
      setPlaylistOpen(false)
      if (!playerState.isReady) return
      await spotifyPlayer.setShuffle(true)
      await spotifyPlayer.playContext(pl.uri)
    },
    [playerState.isReady, setSelectedPlaylist]
  )

  // Mini Waveform logic from Musspark
  useEffect(() => {
    const canvas = miniCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const totalBars = 90
    const staticHeights: number[] = []
    for (let i = 0; i < totalBars; i++) {
      const x = i / totalBars
      const h = Math.pow(1 - Math.abs(x - 0.5) * 1.8, 2.2) * 0.8 + Math.random() * 0.1
      staticHeights.push(Math.max(0.1, h))
    }

    const draw = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      
      const barW = width / totalBars * 0.7
      const progress = positionMs / track.durationMs

      for (let i = 0; i < totalBars; i++) {
        const barProgress = i / totalBars
        const isPlayed = barProgress <= progress
        ctx.fillStyle = isPlayed ? '#000' : '#d1d5db'
        const x = i * (width / totalBars)
        const ht = staticHeights[i] * height * 0.7
        const y = (height - ht) / 2
        ctx.fillRect(x, y, barW, ht)
      }
      animationRef.current = requestAnimationFrame(draw)
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    window.addEventListener('resize', resize)
    resize()
    animationRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [positionMs, track.durationMs])

  return (
    <div className="card">
      <div className="top-row">
        <h1 className="title" dangerouslySetInnerHTML={{ __html: track.name.replace(' ', '<br/>') }} />
        <button
          className="playlist-pill"
          onClick={() => {
            setPlaylistOpen((v) => !v)
            if (!playlistOpen) loadPlaylists().catch(() => {})
          }}
          aria-label="Select playlist"
        >
          <span className="playlist-pill-label">{selectedPlaylist ? selectedPlaylist.name : 'Playlist'}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      
      <div className="subtitle-row">
        <div className="subtitle">{track.artist} — {track.album}</div>
        <a href="#" className="apple-link">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          Listen on Spotify
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7m10 0v10"/></svg>
        </a>
      </div>

      {playlistOpen ? (
        <div className="playlist-popover" role="dialog" aria-label="Playlist selector">
          <div className="playlist-head">
            <div className="playlist-title">Choose a playlist</div>
            <button className="playlist-close" onClick={() => setPlaylistOpen(false)} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="playlist-list">
            {playlistsLoading ? (
              <div className="playlist-empty">Loading…</div>
            ) : playlists.length ? (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  className="playlist-item"
                  onClick={() => handleSelectPlaylist(pl).catch(() => {})}
                >
                  <div className="playlist-art" style={{ backgroundImage: pl.image ? `url(${pl.image})` : undefined }} />
                  <div className="playlist-meta">
                    <div className="playlist-name">{pl.name}</div>
                    <div className="playlist-sub">{pl.tracksTotal} tracks</div>
                  </div>
                  {selectedPlaylist?.id === pl.id ? (
                    <div className="playlist-check">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="playlist-empty">No playlists found</div>
            )}
          </div>
        </div>
      ) : null}
      
      <div className="player-row">
        <button className="play-btn" onClick={handlePlayPause}>
          <svg viewBox="0 0 24 24">
            {isPlaying ? (
              <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </button>
        <div className="progress-wrap" onClick={handleSeek}>
          <div className="progress-bg"></div>
          <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
          <div className="progress-handle" style={{ left: `${progressPercentage}%` }}></div>
        </div>
        <div className="time-display">{formatTime(positionMs)} / {formatTime(track.durationMs)}</div>
      </div>
      
      <Transcript />
      
      <div className="mini-player">
        <div className="mini-time">{formatTime(positionMs).split(':')[1]}</div>
        <canvas ref={miniCanvasRef} id="miniWave"></canvas>
        <button className="mini-play" onClick={handlePlayPause}>
          <svg viewBox="0 0 24 24">
            {isPlaying ? (
              <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </button>
      </div>

      <style jsx>{`
        .card {
          background: #fff;
          border-radius: 28px 28px 0 0;
          padding: 26px 22px 22px;
          max-height: 480px;
          display: flex;
          flex-direction: column;
          z-index: 20;
          color: #000;
        }
        .top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }
        .title {
          font-size: 31px;
          font-weight: 700;
          line-height: 1.15;
          color: #000;
          letter-spacing: -0.3px;
          margin-bottom: 8px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 6;
        }
        .playlist-pill {
          margin-top: 4px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          max-width: 140px;
          height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: rgba(0, 0, 0, 0.75);
          cursor: pointer;
          flex-shrink: 0;
        }
        .playlist-pill-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .playlist-popover {
          margin-top: 12px;
          border-radius: 18px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.12);
          overflow: hidden;
        }
        .playlist-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 12px 10px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
        .playlist-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.7px;
          text-transform: uppercase;
          color: rgba(0, 0, 0, 0.65);
        }
        .playlist-close {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(0, 0, 0, 0.6);
        }
        .playlist-list {
          max-height: 220px;
          overflow: auto;
        }
        .playlist-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }
        .playlist-item:hover {
          background: rgba(0, 0, 0, 0.03);
        }
        .playlist-art {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.06);
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
        }
        .playlist-meta {
          flex: 1;
          min-width: 0;
        }
        .playlist-name {
          font-size: 13px;
          font-weight: 700;
          color: rgba(0, 0, 0, 0.9);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .playlist-sub {
          margin-top: 1px;
          font-size: 12px;
          color: rgba(0, 0, 0, 0.5);
        }
        .playlist-check {
          color: rgba(0, 0, 0, 0.7);
        }
        .playlist-empty {
          padding: 14px 12px;
          font-size: 13px;
          color: rgba(0, 0, 0, 0.55);
        }
        .subtitle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
          margin-bottom: 22px;
        }
        .subtitle {
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .apple-link {
          color: #9ca3af;
          font-size: 12px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
          flex-shrink: 0;
        }
        .apple-link:hover { color: #6b7280; }
        
        .player-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .play-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #000;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.1s;
        }
        .play-btn:active { transform: scale(0.94); }
        .play-btn svg { width: 14px; height: 14px; fill: #fff; }
        
        .progress-wrap {
          flex: 1;
          position: relative;
          height: 20px;
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        .progress-bg {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: #e5e7eb;
          border-radius: 1px;
        }
        .progress-fill {
          position: absolute;
          left: 0;
          height: 2px;
          background: #000;
          border-radius: 1px;
          transition: width 0.1s linear;
        }
        .progress-handle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #000;
          border-radius: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          transition: left 0.1s linear;
        }
        .time-display {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
          min-width: 80px;
          text-align: right;
        }
        
        .mini-player {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid #f1f1f1;
        }
        .mini-time {
          font-size: 14px;
          font-weight: 500;
          color: #000;
          min-width: 32px;
        }
        #miniWave {
          flex: 1;
          height: 32px;
        }
        .mini-play {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #000;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .mini-play svg { width: 16px; height: 16px; fill: #fff; }
        @media (max-width: 640px) {
          .playlist-pill {
            max-width: 120px;
          }
        }

        @media (min-width: 768px) {
          .card {
            border-radius: 34px;
            padding: 44px 44px 38px;
            max-height: 640px;
            width: min(560px, 46vw);
            box-shadow: 0 70px 140px -90px rgba(0,0,0,0.75);
          }

          .title {
            font-size: clamp(40px, 4.7vw, 54px);
            line-height: 1.02;
            letter-spacing: -0.8px;
            margin-bottom: 12px;
            -webkit-line-clamp: 5;
          }

          .subtitle-row {
            margin-bottom: 26px;
          }

          .player-row {
            margin-bottom: 28px;
          }
        }
      `}</style>
    </div>
  )
}
