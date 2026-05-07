export class AudioEngine {
  private ctx: AudioContext | null = null
  private spotifyGain: GainNode | null = null
  private djGain: GainNode | null = null
  private isInitialized = false
  private djAudioEl: HTMLAudioElement | null = null
  private djSource: AudioBufferSourceNode | null = null

  async init(): Promise<void> {
    if (this.isInitialized) return

    this.ctx = new AudioContext()
    this.spotifyGain = this.ctx.createGain()
    this.djGain = this.ctx.createGain()

    this.spotifyGain.connect(this.ctx.destination)
    this.djGain.connect(this.ctx.destination)

    this.spotifyGain.gain.value = 1.0
    this.djGain.gain.value = 1.0

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    this.isInitialized = true
  }

  stopDJ(): void {
    if (this.djSource) {
      try {
        this.djSource.stop()
      } catch {}
      this.djSource.disconnect()
      this.djSource = null
    }
    if (!this.djAudioEl) return
    this.djAudioEl.pause()
    this.djAudioEl.src = ''
    this.djAudioEl.load()
    this.djAudioEl = null
  }

  private async playDJLinear16(
    arrayBuffer: ArrayBuffer,
    sampleRate: number,
    opts?: {
      onStart?: () => void
      onProgress?: (progress01: number) => void
      onEnded?: () => void
    }
  ): Promise<void> {
    if (!this.ctx || !this.djGain) {
      await this.init()
    }

    if (!this.ctx || !this.djGain) return

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    const sampleCount = Math.floor(arrayBuffer.byteLength / 2)
    const float32 = new Float32Array(sampleCount)
    const view = new DataView(arrayBuffer)
    for (let i = 0; i < sampleCount; i++) {
      const int16 = view.getInt16(i * 2, true)
      float32[i] = int16 / 32768
    }

    const audioBuffer = this.ctx.createBuffer(1, sampleCount, sampleRate)
    audioBuffer.getChannelData(0).set(float32)

    const source = this.ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.djGain)
    this.djSource = source

    const startAt = this.ctx.currentTime + 0.05
    source.start(startAt)

    const startDelayMs = Math.max(0, Math.floor((startAt - this.ctx.currentTime) * 1000))
    setTimeout(() => {
      opts?.onStart?.()
    }, startDelayMs)

    let rafId: number | null = null
    const tick = () => {
      if (!this.ctx) return
      const elapsed = this.ctx.currentTime - startAt
      const progress01 = Math.max(0, Math.min(1, elapsed / audioBuffer.duration))
      opts?.onProgress?.(progress01)
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return new Promise((resolve) => {
      source.onended = () => {
        if (rafId != null) cancelAnimationFrame(rafId)
        if (this.djSource === source) this.djSource = null
        opts?.onEnded?.()
        resolve()
      }
    })
  }

  async playDJTTS(
    text: string,
    opts?: {
      onStart?: () => void
      onProgress?: (progress01: number) => void
      onEnded?: () => void
    }
  ): Promise<void> {
    this.stopDJ()

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      const textBody = await response.text().catch(() => '')
      throw new Error(`TTS request failed: ${response.status} ${textBody.slice(0, 300)}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.toLowerCase().startsWith('audio/l16')) {
      const arrayBuffer = await response.arrayBuffer()
      return this.playDJLinear16(arrayBuffer, 24000, opts)
    }

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const audio = new Audio(objectUrl)
    audio.preload = 'auto'

    this.djAudioEl = audio

    let rafId: number | null = null
    const tick = () => {
      const duration = audio.duration
      if (Number.isFinite(duration) && duration > 0) {
        const progress01 = Math.max(0, Math.min(1, audio.currentTime / duration))
        opts?.onProgress?.(progress01)
      }
      rafId = requestAnimationFrame(tick)
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('playing', onPlaying)
        audio.removeEventListener('ended', onEnded)
        audio.removeEventListener('error', onError)
        if (rafId != null) cancelAnimationFrame(rafId)
        URL.revokeObjectURL(objectUrl)
        if (this.djAudioEl === audio) this.djAudioEl = null
      }

      const onPlaying = () => {
        opts?.onStart?.()
        rafId = requestAnimationFrame(tick)
      }
      const onEnded = () => {
        opts?.onEnded?.()
        cleanup()
        resolve()
      }
      const onError = () => {
        cleanup()
        reject(new Error('DJ audio playback error'))
      }

      audio.addEventListener('playing', onPlaying)
      audio.addEventListener('ended', onEnded)
      audio.addEventListener('error', onError)

      audio.play().catch((e) => {
        cleanup()
        reject(e)
      })
    })
  }

  async duck(durationMs: number): Promise<void> {
    if (!this.ctx || !this.spotifyGain || !this.djGain) return

    const now = this.ctx.currentTime
    this.spotifyGain.gain.setValueAtTime(1.0, now)
    this.spotifyGain.gain.linearRampToValueAtTime(0.3, now + 0.3)

    setTimeout(() => {
      if (!this.ctx || !this.spotifyGain) return
      const returnTime = this.ctx.currentTime
      this.spotifyGain.gain.linearRampToValueAtTime(1.0, returnTime + 0.8)
    }, durationMs - 500)
  }

  async playDJAudio(
    blob: Blob,
    opts?: {
      onStart?: () => void
      onProgress?: (progress01: number) => void
    }
  ): Promise<void> {
    if (!this.ctx || !this.djGain) {
      await this.init()
    }

    if (!this.ctx || !this.djGain) return

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer)

    const source = this.ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.djGain)
    const startAt = this.ctx.currentTime + 0.05
    source.start(startAt)

    const startDelayMs = Math.max(0, Math.floor((startAt - this.ctx.currentTime) * 1000))
    setTimeout(() => {
      opts?.onStart?.()
    }, startDelayMs)

    let rafId: number | null = null
    const tick = () => {
      if (!this.ctx) return
      const elapsed = this.ctx.currentTime - startAt
      const progress01 = Math.max(0, Math.min(1, elapsed / audioBuffer.duration))
      opts?.onProgress?.(progress01)
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return new Promise((resolve) => {
      source.onended = () => {
        if (rafId != null) cancelAnimationFrame(rafId)
        resolve()
      }
    })
  }

  setSpotifyVolume(volume: number): void {
    if (!this.spotifyGain || !this.ctx) return
    this.spotifyGain.gain.setValueAtTime(volume, this.ctx.currentTime)
  }

  dispose(): void {
    this.stopDJ()
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
    this.isInitialized = false
  }
}

export const audioEngine = new AudioEngine()
