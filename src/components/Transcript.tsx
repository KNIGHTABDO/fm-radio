'use client'

import { useStore } from '@/lib/store'
import { useEffect, useRef } from 'react'

export default function Transcript() {
  const { transcript, djStatus } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const transcriptLength = transcript.length

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcriptLength])

  if (transcript.length === 0) {
    return (
      <div className="transcript-container">
        <div className="transcript">
          <div className="transcript-label">Claudio is silent...</div>
          <div className="transcript-text">Music speaks for itself.</div>
        </div>
      </div>
    )
  }

  const lastEntry = transcript[transcript.length - 1]
  const cleanText = lastEntry.text.replace(/\[.*?\]/g, '').trim()

  return (
    <div className="transcript-container">
      <div className="transcript" ref={scrollRef}>
        <div className="transcript-inner">
          <div className="transcript-label">This is Claudio.</div>
          <div className="transcript-meta">
            Claudio • {lastEntry.timestamp ? `0:${Math.floor(lastEntry.timestamp / 1000).toString().padStart(2, '0')}` : '0:00'}
          </div>
          <div className="transcript-text">
            {cleanText}
          </div>
        </div>
      </div>

      <style jsx>{`
        .transcript-container {
          position: relative;
          margin-top: 18px;
          height: 140px;
          overflow: hidden;
        }
        
        .transcript-container::before,
        .transcript-container::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 30px;
          z-index: 2;
          pointer-events: none;
        }

        .transcript-container::before {
          top: 0;
          background: linear-gradient(to bottom, #fff, transparent);
        }

        .transcript-container::after {
          bottom: 0;
          background: linear-gradient(to top, #fff, transparent);
        }

        .transcript {
          background: #f6f6f6;
          border-radius: 18px;
          padding: 16px 18px;
          height: 100%;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
          -webkit-mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
        }

        .transcript::-webkit-scrollbar {
          display: none;
        }

        .transcript-inner {
          padding: 10px 0;
        }

        .transcript-label {
          font-size: 13px;
          color: #000;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .transcript-meta {
          font-size: 13px;
          color: #9ca3af;
          margin-bottom: 6px;
        }
        .transcript-text {
          font-size: 15px;
          line-height: 1.45;
          color: #1f2937;
        }
      `}</style>
    </div>
  )
}
