export class AudioEngine {
  private ctx: AudioContext | null = null
  private spotifyGain: GainNode | null = null
  private djGain: GainNode | null = null
  private djAnalyser: AnalyserNode | null = null
  private djMeterData: Uint8Array<ArrayBuffer> | null = null
  private isInitialized = false

  async init(): Promise<void> {
    if (this.isInitialized) return

    this.ctx = new AudioContext()
    this.spotifyGain = this.ctx.createGain()
    this.djGain = this.ctx.createGain()
    this.djAnalyser = this.ctx.createAnalyser()
    this.djAnalyser.fftSize = 512
    this.djMeterData = new Uint8Array(new ArrayBuffer(this.djAnalyser.fftSize))

    this.spotifyGain.connect(this.ctx.destination)
    this.djGain.connect(this.djAnalyser)
    this.djAnalyser.connect(this.ctx.destination)

    this.spotifyGain.gain.value = 1.0
    this.djGain.gain.value = 1.0

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    this.isInitialized = true
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

  getDJLevel01(): number {
    if (!this.djAnalyser || !this.djMeterData) return 0

    this.djAnalyser.getByteTimeDomainData(this.djMeterData)

    let sumSq = 0
    for (let i = 0; i < this.djMeterData.length; i++) {
      const v = (this.djMeterData[i] - 128) / 128
      sumSq += v * v
    }

    const rms = Math.sqrt(sumSq / this.djMeterData.length)
    return Math.max(0, Math.min(1, rms * 2.2))
  }

  dispose(): void {
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
    this.djAnalyser = null
    this.djMeterData = null
    this.isInitialized = false
  }
}

export const audioEngine = new AudioEngine()
