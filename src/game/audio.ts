type CueName = 'click' | 'spawn' | 'hit' | 'kill' | 'base' | 'age' | 'victory' | 'defeat'

interface CueConfig {
  frequency: number
  duration: number
  volume: number
  type: OscillatorType
  frequencyEnd?: number
  harmonic?: number
  minGap?: number
}

const CUES: Record<CueName, CueConfig> = {
  click: { frequency: 420, duration: 0.05, volume: 0.024, type: 'square', frequencyEnd: 560, minGap: 0.03 },
  spawn: { frequency: 180, duration: 0.12, volume: 0.04, type: 'triangle', frequencyEnd: 240, harmonic: 360, minGap: 0.05 },
  hit: { frequency: 150, duration: 0.06, volume: 0.022, type: 'triangle', frequencyEnd: 96, minGap: 0.045 },
  kill: { frequency: 210, duration: 0.12, volume: 0.03, type: 'sawtooth', frequencyEnd: 320, harmonic: 480, minGap: 0.08 },
  base: { frequency: 120, duration: 0.14, volume: 0.035, type: 'square', frequencyEnd: 90, harmonic: 180, minGap: 0.08 },
  age: { frequency: 260, duration: 0.22, volume: 0.05, type: 'triangle', frequencyEnd: 620, harmonic: 930, minGap: 0.12 },
  victory: { frequency: 360, duration: 0.42, volume: 0.055, type: 'sine', frequencyEnd: 720, harmonic: 1080, minGap: 0.2 },
  defeat: { frequency: 260, duration: 0.4, volume: 0.05, type: 'sine', frequencyEnd: 120, harmonic: 190, minGap: 0.2 },
}

export class AudioController {
  private muted: boolean

  private audioContext?: AudioContext

  private lastPlayedAt: Partial<Record<CueName, number>> = {}

  constructor(initialMuted: boolean) {
    this.muted = initialMuted
  }

  getMuted() {
    return this.muted
  }

  setMuted(next: boolean) {
    this.muted = next
  }

  async unlock() {
    if (!this.audioContext) {
      this.audioContext = new window.AudioContext()
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  play(name: CueName) {
    if (this.muted) {
      return
    }

    void this.unlock().then(() => {
      const context = this.audioContext
      if (!context) {
        return
      }

      const cue = CUES[name]
      const now = performance.now()
      const lastPlayed = this.lastPlayedAt[name] ?? 0
      if (cue.minGap && now - lastPlayed < cue.minGap * 1000) {
        return
      }
      this.lastPlayedAt[name] = now

      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      oscillator.type = cue.type
      oscillator.frequency.setValueAtTime(cue.frequency, context.currentTime)
      if (cue.frequencyEnd) {
        oscillator.frequency.exponentialRampToValueAtTime(
          cue.frequencyEnd,
          context.currentTime + cue.duration,
        )
      }

      gainNode.gain.setValueAtTime(cue.volume, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + cue.duration)

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + cue.duration)

      if (cue.harmonic) {
        const overtone = context.createOscillator()
        const overtoneGain = context.createGain()
        overtone.type = cue.type === 'square' ? 'triangle' : 'sine'
        overtone.frequency.setValueAtTime(cue.harmonic, context.currentTime)
        overtoneGain.gain.setValueAtTime(cue.volume * 0.28, context.currentTime)
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + cue.duration * 0.9)
        overtone.connect(overtoneGain)
        overtoneGain.connect(context.destination)
        overtone.start()
        overtone.stop(context.currentTime + cue.duration * 0.9)
      }
    })
  }
}
