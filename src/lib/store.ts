import { create } from 'zustand'
import type { SpotifyTrack, TranscriptEntry, DJStatus, PlayerState } from '@/types'

interface AppState {
  playerState: PlayerState
  djStatus: DJStatus
  transcript: TranscriptEntry[]
  tweakSettings: {
    hue1: number
    hue2: number
    blur: number
  }
  isPlaying: boolean
  tweaksPanelOpen: boolean

  setPlayerState: (state: Partial<PlayerState>) => void
  setTrack: (track: SpotifyTrack) => void
  setPosition: (positionMs: number) => void
  setIsPaused: (paused: boolean) => void
  setIsReady: (ready: boolean) => void
  
  setDJStatus: (status: Partial<DJStatus>) => void
  addTranscriptEntry: (entry: TranscriptEntry) => void
  updateTranscriptEntry: (id: string, updates: Partial<TranscriptEntry>) => void
  
  setTweakSettings: (settings: Partial<{ hue1: number; hue2: number; blur: number }>) => void
  setIsPlaying: (playing: boolean) => void
  setTweaksPanelOpen: (open: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  playerState: {
    track: null,
    positionMs: 0,
    isPaused: true,
    isReady: false,
  },
  djStatus: {
    isSpeaking: false,
    currentNarration: null,
    lastSpokenAt: null,
  },
  transcript: [],
  tweakSettings: {
    hue1: 256,
    hue2: 330,
    blur: 71,
  },
  isPlaying: false,
  tweaksPanelOpen: false,

  setPlayerState: (state) =>
    set((prev) => ({
      playerState: { ...prev.playerState, ...state },
    })),
  setTrack: (track) =>
    set((prev) => ({
      playerState: { ...prev.playerState, track },
    })),
  setPosition: (positionMs) =>
    set((prev) => ({
      playerState: { ...prev.playerState, positionMs },
    })),
  setIsPaused: (isPaused) =>
    set((prev) => ({
      playerState: { ...prev.playerState, isPaused },
    })),
  setIsReady: (isReady) =>
    set((prev) => ({
      playerState: { ...prev.playerState, isReady },
    })),

  setDJStatus: (status) =>
    set((prev) => ({
      djStatus: { ...prev.djStatus, ...status },
    })),
  addTranscriptEntry: (entry) =>
    set((prev) => ({
      transcript: [...prev.transcript, entry],
    })),
  updateTranscriptEntry: (id, updates) =>
    set((prev) => ({
      transcript: prev.transcript.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  setTweakSettings: (settings) =>
    set((prev) => ({
      tweakSettings: { ...prev.tweakSettings, ...settings },
    })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setTweaksPanelOpen: (tweaksPanelOpen) => set({ tweaksPanelOpen }),
}))
