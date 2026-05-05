import type { AudioController } from './audio'
import type { SaveData } from './save'

export interface BattleResult {
  result: 'victory' | 'defeat'
  score: number
  ageReached: number
  difficulty: string
}

export interface RegistryState {
  save: SaveData
  audio: AudioController
  lastResult?: BattleResult
}
