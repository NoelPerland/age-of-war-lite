export type Side = 'player' | 'enemy'
export type AttackKind = 'melee' | 'ranged'
export type DifficultyId = 'easy' | 'normal' | 'hard'
export type UnitId =
  | 'scrapper'
  | 'pulse-gunner'
  | 'bulwark'
  | 'arc-caster'
  | 'raider'
  | 'siege-engine'

export interface UnitDefinition {
  id: UnitId
  name: string
  age: number
  role: string
  shortRole: string
  cost: number
  maxHealth: number
  damage: number
  speed: number
  range: number
  cooldown: number
  bounty: number
  score: number
  projectileSpeed?: number
  attackKind: AttackKind
  tint: number
  scale: number
}

export interface DifficultyConfig {
  id: DifficultyId
  label: string
  note: string
  enemyGoldFactor: number
  enemyStartingGold: number
  thinkIntervalFactor: number
  ageCostMultiplier: number
  panicThreshold: number
  pressureBias: number
}

export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 720
export const LANE_Y = 462
export const PLAYER_BASE_X = 132
export const ENEMY_BASE_X = 1148
export const BASE_BODY_WIDTH = 132
export const BASE_ATTACK_RANGE = 244
export const BASE_ATTACK_DAMAGE = 13
export const BASE_ATTACK_COOLDOWN = 1.85
export const BASE_ATTACK_PROJECTILE_SPEED = 540
export const PASSIVE_GOLD_PER_SECOND = 11
export const ENEMY_PASSIVE_GOLD_FACTOR = 0.94
export const STARTING_GOLD = 180
export const ENEMY_STARTING_GOLD = 228
export const BASE_HEALTH = 1280
export const AGE_UP_COSTS = [0, 138, 158]
export const WIN_BONUS_SCORE = 650
export const COMBAT_BONUS_GOLD = 10
export const PLAYER_SPAWN_X = PLAYER_BASE_X + 74
export const ENEMY_SPAWN_X = ENEMY_BASE_X - 74
export const AI_BASE_THINK_INTERVAL = 1.05
export const AI_MIN_THINK_INTERVAL = 0.62
export const AI_ESCALATION_SECONDS = 150
export const AI_AGE_COST_MULTIPLIER = 0.68
export const SAVE_KEY = 'age-of-war-lite-save-v1'
export const TOP_PANEL_Y = 56
export const TOP_PANEL_HEIGHT = 86
export const COMMAND_PANEL_Y = 628
export const COMMAND_PANEL_HEIGHT = 132
export const FLOAT_TEXT_DURATION = 620
export const PURCHASE_FLASH_DURATION = 180
export const PASSIVE_GOLD_TICK_SECONDS = 1.25
export const BASE_HIT_FLASH_DURATION = 120
export const AGE_EVENT_DURATION = 920
export const SPAWN_BURST_DURATION = 320
export const UNIT_STOP_BUFFER = 18
export const UNIT_RENDER_SCALE = 0.82
export const UNIT_TEXTURE_WIDTH = 128
export const UNIT_TEXTURE_HEIGHT = 128

export const AGE_NAMES = ['Neon Dawn', 'Circuit Forge', 'Nova Dominion']

export const DIFFICULTY_OPTIONS: DifficultyConfig[] = [
  {
    id: 'easy',
    label: 'Easy',
    note: 'Forgiving pressure',
    enemyGoldFactor: 0.88,
    enemyStartingGold: 196,
    thinkIntervalFactor: 1.1,
    ageCostMultiplier: 0.76,
    panicThreshold: 34,
    pressureBias: -0.2,
  },
  {
    id: 'normal',
    label: 'Normal',
    note: 'Intended warfront',
    enemyGoldFactor: 1.03,
    enemyStartingGold: 238,
    thinkIntervalFactor: 0.96,
    ageCostMultiplier: 0.68,
    panicThreshold: 24,
    pressureBias: 0.22,
  },
  {
    id: 'hard',
    label: 'Hard',
    note: 'Aggressive tech race',
    enemyGoldFactor: 1.14,
    enemyStartingGold: 272,
    thinkIntervalFactor: 0.82,
    ageCostMultiplier: 0.56,
    panicThreshold: 16,
    pressureBias: 0.7,
  },
]

export const UNIT_DEFS: UnitDefinition[] = [
  {
    id: 'scrapper',
    name: 'Scrapper',
    age: 1,
    role: 'Cheap melee bruiser',
    shortRole: 'MELEE',
    cost: 108,
    maxHealth: 112,
    damage: 13,
    speed: 50,
    range: 34,
    cooldown: 1.02,
    bounty: 22,
    score: 52,
    attackKind: 'melee',
    tint: 0x58f0ff,
    scale: 1.08,
  },
  {
    id: 'pulse-gunner',
    name: 'Pulse Gunner',
    age: 1,
    role: 'Fragile ranged chip',
    shortRole: 'RANGED',
    cost: 138,
    maxHealth: 86,
    damage: 15,
    speed: 47,
    range: 192,
    cooldown: 0.78,
    bounty: 26,
    score: 60,
    projectileSpeed: 460,
    attackKind: 'ranged',
    tint: 0x7ef7ff,
    scale: 1.04,
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    age: 2,
    role: 'Shielded frontline wall',
    shortRole: 'TANK',
    cost: 150,
    maxHealth: 410,
    damage: 36,
    speed: 40,
    range: 42,
    cooldown: 0.96,
    bounty: 68,
    score: 140,
    attackKind: 'melee',
    tint: 0x2fd0ff,
    scale: 1.25,
  },
  {
    id: 'arc-caster',
    name: 'Arc Caster',
    age: 2,
    role: 'Long-range cannon',
    shortRole: 'BLAST',
    cost: 178,
    maxHealth: 144,
    damage: 62,
    speed: 42,
    range: 272,
    cooldown: 0.92,
    bounty: 74,
    score: 156,
    projectileSpeed: 590,
    attackKind: 'ranged',
    tint: 0x9effff,
    scale: 1.14,
  },
  {
    id: 'raider',
    name: 'Nova Raider',
    age: 3,
    role: 'Fast finisher',
    shortRole: 'RUSH',
    cost: 198,
    maxHealth: 288,
    damage: 56,
    speed: 92,
    range: 34,
    cooldown: 0.48,
    bounty: 92,
    score: 190,
    attackKind: 'melee',
    tint: 0x6ef2ff,
    scale: 1.22,
  },
  {
    id: 'siege-engine',
    name: 'Siege Engine',
    age: 3,
    role: 'Heavy siege artillery',
    shortRole: 'SIEGE',
    cost: 236,
    maxHealth: 286,
    damage: 108,
    speed: 33,
    range: 340,
    cooldown: 1.28,
    bounty: 118,
    score: 240,
    projectileSpeed: 500,
    attackKind: 'ranged',
    tint: 0xb0ffff,
    scale: 1.3,
  },
]

export const UNITS_BY_AGE = AGE_NAMES.map((_, index) =>
  UNIT_DEFS.filter((unit) => unit.age === index + 1),
)
