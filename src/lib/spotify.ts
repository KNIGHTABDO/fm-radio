import type { SpotifyTrack, PlayerState } from '@/types'

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer
    }
  }
}

interface SpotifyPlayerOptions {
  name: string
  getOAuthToken: (callback: (token: string) => void) => void
  volume?: number
}

interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: string, callback: (data: unknown) => void): void
  removeListener(event: string): void
  getCurrentState(): Promise<SpotifyPlaybackState | null>
  setVolume(volume: number): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  seek(position_ms: number): Promise<void>
  previousTrack(): Promise<void>
  nextTrack(): Promise<void>
  togglePlay(): Promise<void>
}

interface SpotifyPlaybackState {
  context: { uri: string; metadata: unknown }
  disallows: Record<string, boolean>
  paused: boolean
  position: number
  repeat_mode: number
  shuffle: boolean
  track_window: {
    current_track: SpotifySDKTrack
    previous_tracks: SpotifySDKTrack[]
    next_tracks: SpotifySDKTrack[]
  }
}

interface SpotifySDKTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  artists: { name: string; uri: string }[]
  album: { name: string; images: { url: string }[] }
}

type StateChangeCallback = (state: PlayerState) => void

class SpotifyPlayerWrapper {
  private player: SpotifyPlayer | null = null
  private accessToken: string = ''
  private deviceId: string | null = null
  private stateChangeCallbacks: StateChangeCallback[] = []
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private isInitializing = false

  async initialize(accessToken: string): Promise<void> {
    this.accessToken = accessToken

    if (this.isInitializing || this.player) return
    this.isInitializing = true

    if (window.Spotify?.Player) {
      this.createPlayer()
      this.isInitializing = false
      return
    }

    return new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        this.createPlayer()
        this.isInitializing = false
        resolve()
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://sdk.scdn.co/spotify-player.js"]'
      )
      if (existingScript) return

      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      script.onerror = (e) => {
        this.isInitializing = false
        reject(e)
      }
      document.head.appendChild(script)
    })
  }

  private createPlayer(): void {
    this.player = new window.Spotify.Player({
      name: 'FM - Claudio',
      getOAuthToken: (cb) => cb(this.accessToken),
      volume: 0.5,
    })

    this.player.addListener('ready', (data) => {
      const deviceData = data as { device_id: string }
      this.deviceId = deviceData.device_id
      this.transferPlayback().catch(() => {})
    })

    this.player.addListener('not_ready', () => {
      this.deviceId = null
    })

    this.player.addListener('player_state_changed', (state) => {
      if (state) {
        this.emitStateChange(state as SpotifyPlaybackState)
      }
    })

    this.player.connect()
    this.startPolling()
  }

  private async transferPlayback(): Promise<void> {
    if (!this.deviceId) return

    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [this.deviceId], play: false }),
    })
  }

  private emitStateChange(sdkState: SpotifyPlaybackState): void {
    const state: PlayerState = {
      track: sdkState
        ? {
            id: sdkState.track_window.current_track.id,
            uri: sdkState.track_window.current_track.uri,
            name: sdkState.track_window.current_track.name,
            artist: sdkState.track_window.current_track.artists
              .map((a) => a.name)
              .join(', '),
            album: sdkState.track_window.current_track.album.name,
            albumArt: sdkState.track_window.current_track.album.images[0]?.url || '',
            durationMs: sdkState.track_window.current_track.duration_ms,
          }
        : null,
      positionMs: sdkState.position,
      isPaused: sdkState.paused,
      isReady: true,
    }

    this.stateChangeCallbacks.forEach((cb) => cb(state))
  }

  private startPolling(): void {
    this.pollInterval = setInterval(async () => {
      if (!this.player) return
      const state = await this.player.getCurrentState()
      if (state) {
        this.emitStateChange(state)
      }
    }, 500)
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback)
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter((cb) => cb !== callback)
    }
  }

  async play(trackUri?: string): Promise<void> {
    if (!this.player) return

    if (trackUri) {
      const url = this.deviceId
        ? `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(this.deviceId)}`
        : 'https://api.spotify.com/v1/me/player/play'

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [trackUri] }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Spotify play failed: ${res.status} ${text}`)
      }
    } else {
      await this.player.resume()
    }
  }

  async pause(): Promise<void> {
    if (!this.player) return
    await this.player.pause()
  }

  async seek(positionMs: number): Promise<void> {
    if (!this.player) return
    await this.player.seek(positionMs)
  }

  async togglePlay(): Promise<void> {
    if (!this.player) return
    await this.player.togglePlay()
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.player) return
    await this.player.setVolume(volume)
  }

  disconnect(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }
    if (this.player) {
      this.player.disconnect()
      this.player = null
    }
  }
}

export const spotifyPlayer = new SpotifyPlayerWrapper()
