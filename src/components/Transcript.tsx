'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'

export default function Transcript() {
  const { transcript } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      const activeEntry = scrollRef.current.querySelector('[data-status="active"]')
      if (activeEntry) {
        activeEntry.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [transcript])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div
      style={{
        background: 'var(--card-sub)',
        borderRadius: 12,
        padding: 16,
        maxHeight: 240,
        overflowY: 'auto',
      }}
      ref={scrollRef}
    >
      {transcript.length === 0 && (
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 300,
            color: 'var(--text-future)',
            fontStyle: 'italic',
          }}
        >
          Claudio will speak between tracks...
        </div>
      )}

      {transcript.map((entry) => (
        <div
          key={entry.id}
          data-status={entry.status}
          style={{
            marginBottom: entry.status === 'future' ? 12 : 16,
            opacity: entry.status === 'future' ? 0.3 : 1,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
              marginBottom: 6,
              letterSpacing: '0.05em',
            }}
          >
            {entry.speaker === 'Claudio' ? 'DJ' : 'System'} · {formatTime(entry.timestamp)}
          </div>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 300,
              lineHeight: 1.65,
              color: 'var(--text-dark)',
              margin: 0,
            }}
          >
            {entry.text.split(' ').map((word, idx) => {
              const isActiveWord = entry.status === 'active' && entry.wordIndex === idx
              return (
                <span
                  key={idx}
                  style={{
                    backgroundColor: isActiveWord ? 'var(--accent-highlight)' : 'transparent',
                    borderRadius: 4,
                    padding: isActiveWord ? '0 3px' : '0',
                  }}
                >
                  {word}{' '}
                </span>
              )
            })}
          </p>
        </div>
      ))}
    </div>
  )
}
