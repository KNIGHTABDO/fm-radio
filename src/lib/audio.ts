export class AudioEngine {
  private ctx: AudioContext | null = null
  private spotifyGain: GainNode | null = null
  private djGain: GainNode | null = null
  private isInitialized = false

  async init(): Promise<void> {
    if (this.isInitialized) return

    this.ctx = new AudioContext()
    this.spotifyGain = this.ctx.createGain()
    this.djGain = this.ctx.createGain()

    this.spotifyGain.connect(this.ctx.destination)
    this.djGain.connect(this.ctx.destination)

    this.spotifyGain.gain.value = 1.0
    this.djGain.gain.value = 1.0

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

  async playDJAudio(blob: Blob): Promise<void> {
    if (!this.ctx || !this.djGain) {
      await this.init()
    }

    if (!this.ctx || !this.djGain) return

    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer)

    const source = this.ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.djGain)
    source.start(0)

    return new Promise((resolve) => {
      source.onended = () => resolve()
    })
  }

  setSpotifyVolume(volume: number): void {
    if (!this.spotifyGain || !this.ctx) return
    this.spotifyGain.gain.setValueAtTime(volume, this.ctx.currentTime)
  }

  dispose(): void {
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
    this.isInitialized = false
  }
}

export const audioEngine = new AudioEngine()
