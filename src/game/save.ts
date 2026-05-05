import Phaser from 'phaser'
import { DIFFICULTY_OPTIONS, SAVE_KEY, type DifficultyId } from './config'

export interface SaveData {
  bestScore: number
  bestAgeReached: number
  muted: boolean
  difficulty: DifficultyId
}

const defaultSave: SaveData = {
  bestScore: 0,
  bestAgeReached: 1,
  muted: false,
  difficulty: 'normal',
}

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) {
      return { ...defaultSave }
    }

    const parsed = JSON.parse(raw) as Partial<SaveData>

    return {
      bestScore: Number.isFinite(parsed.bestScore) ? Math.max(0, parsed.bestScore ?? 0) : 0,
      bestAgeReached: Number.isFinite(parsed.bestAgeReached)
        ? Phaser.Math.Clamp(parsed.bestAgeReached ?? 1, 1, 3)
        : 1,
      muted: Boolean(parsed.muted),
      difficulty: DIFFICULTY_OPTIONS.some((item) => item.id === parsed.difficulty) ? (parsed.difficulty as DifficultyId) : 'normal',
    }
  } catch {
    return { ...defaultSave }
  }
}

export function writeSave(save: SaveData) {
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(save))
}

export function mergeSave(patch: Partial<SaveData>): SaveData {
  const next = { ...loadSave(), ...patch }
  writeSave(next)
  return next
}
