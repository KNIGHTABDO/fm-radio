export interface SpotifyTrack {
  name: string
  artist: string
  album: string
  albumArt: string
  durationMs: number
  uri?: string
}

export interface TranscriptEntry {
  id: string
  speaker: 'Claudio' | 'System'
  text: string
  timestamp: number
  status: 'active' | 'past' | 'future'
  wordIndex?: number
}

export interface DJStatus {
  isSpeaking: boolean
  currentNarration: string | null
  lastSpokenAt: number | null
}

export interface PlayerState {
  track: SpotifyTrack | null
  positionMs: number
  isPaused: boolean
  isReady: boolean
}

export type DJEvent =
  | { type: 'TRACK_START'; track: SpotifyTrack; position_ms: number }
  | { type: 'TRACK_END'; track: SpotifyTrack }
  | { type: 'USER_PAUSED'; track: SpotifyTrack; pausedFor: number }
  | { type: 'MANUAL'; track: SpotifyTrack }
