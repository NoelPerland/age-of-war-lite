import Phaser from 'phaser'
import {
  AGE_NAMES,
  AGE_EVENT_DURATION,
  AGE_UP_COSTS,
  AI_BASE_THINK_INTERVAL,
  AI_ESCALATION_SECONDS,
  AI_MIN_THINK_INTERVAL,
  BASE_ATTACK_COOLDOWN,
  BASE_ATTACK_DAMAGE,
  BASE_ATTACK_PROJECTILE_SPEED,
  BASE_ATTACK_RANGE,
  BASE_BODY_WIDTH,
  BASE_HEALTH,
  BASE_HIT_FLASH_DURATION,
  COMBAT_BONUS_GOLD,
  COMMAND_PANEL_HEIGHT,
  COMMAND_PANEL_Y,
  DIFFICULTY_OPTIONS,
  ENEMY_BASE_X,
  ENEMY_PASSIVE_GOLD_FACTOR,
  ENEMY_SPAWN_X,
  ENEMY_STARTING_GOLD,
  FLOAT_TEXT_DURATION,
  GAME_HEIGHT,
  GAME_WIDTH,
  LANE_Y,
  PASSIVE_GOLD_PER_SECOND,
  PASSIVE_GOLD_TICK_SECONDS,
  PLAYER_BASE_X,
  PLAYER_SPAWN_X,
  PURCHASE_FLASH_DURATION,
  STARTING_GOLD,
  SPAWN_BURST_DURATION,
  TOP_PANEL_HEIGHT,
  TOP_PANEL_Y,
  UNIT_RENDER_SCALE,
  UNIT_STOP_BUFFER,
  UNIT_DEFS,
  WIN_BONUS_SCORE,
  type Side,
  type UnitDefinition,
  type UnitId,
} from '../game/config'
import type { BattleResult, RegistryState } from '../game/state'
import { mergeSave } from '../game/save'

interface UnitState {
  id: number
  def: UnitDefinition
  side: Side
  sprite: Phaser.GameObjects.Image
  healthBar: Phaser.GameObjects.Graphics
  hp: number
  attackCooldown: number
}

interface ProjectileState {
  side: Side
  sprite: Phaser.GameObjects.Image
  damage: number
  targetUnit?: UnitState
  targetBase?: BaseState
  speed: number
}

interface BaseState {
  side: Side
  x: number
  hp: number
  age: number
  turretCooldown: number
  aiThinkCooldown: number
  body: Phaser.GameObjects.Container
  shell?: Phaser.GameObjects.Rectangle
  core?: Phaser.GameObjects.Arc
  badge?: Phaser.GameObjects.Text
}

interface HudButton {
  container: Phaser.GameObjects.Container
  hitArea: Phaser.GameObjects.Zone
  bg: Phaser.GameObjects.Rectangle
  title: Phaser.GameObjects.Text
  detail: Phaser.GameObjects.Text
  accent: Phaser.GameObjects.Rectangle
  cost: Phaser.GameObjects.Text
}

interface DebugApi {
  getState: () => Record<string, unknown>
  clickHud: (id: string) => void
}

declare global {
  interface Window {
    __AOW_DEBUG__?: DebugApi
  }
}

export class GameScene extends Phaser.Scene {
  private state!: RegistryState

  private playerBase!: BaseState

  private enemyBase!: BaseState

  private units: UnitState[] = []

  private projectiles: ProjectileState[] = []

  private playerGold = STARTING_GOLD

  private enemyGold = ENEMY_STARTING_GOLD

  private playerAge = 1

  private enemyAge = 1

  private playerScore = 0

  private elapsedBattleTime = 0

  private passiveGoldTimer = 0

  private unitId = 1

  private hudButtons = new Map<string, HudButton>()

  private playerGoldText!: Phaser.GameObjects.Text

  private goldTickText!: Phaser.GameObjects.Text

  private playerAgeText!: Phaser.GameObjects.Text

  private ageSubtitleText!: Phaser.GameObjects.Text

  private playerTechText!: Phaser.GameObjects.Text

  private enemyTechText!: Phaser.GameObjects.Text

  private playerBaseText!: Phaser.GameObjects.Text

  private enemyBaseText!: Phaser.GameObjects.Text

  private playerBaseBar!: Phaser.GameObjects.Rectangle

  private enemyBaseBar!: Phaser.GameObjects.Rectangle

  private hintText!: Phaser.GameObjects.Text

  private clashGlow!: Phaser.GameObjects.Ellipse

  private resultOverlay?: Phaser.GameObjects.Container

  private gameEnded = false

  private keyBindings: Array<{ event: string; handler: () => void }> = []

  private difficulty = DIFFICULTY_OPTIONS[1]

  constructor() {
    super('game')
  }

  create() {
    this.state = this.registry.get('globalState') as RegistryState
    this.difficulty = DIFFICULTY_OPTIONS.find((item) => item.id === this.state.save.difficulty) ?? DIFFICULTY_OPTIONS[1]
    this.resetBattle()
    this.buildScene()
    this.refreshHud()
    this.registerInputs()
    this.installDebugApi()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupScene())
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) {
      return
    }

    const dt = delta / 1000
    this.elapsedBattleTime += dt
    this.passiveGoldTimer += dt
    this.playerGold += PASSIVE_GOLD_PER_SECOND * dt
    this.enemyGold += PASSIVE_GOLD_PER_SECOND * dt * ENEMY_PASSIVE_GOLD_FACTOR * this.difficulty.enemyGoldFactor

    if (this.passiveGoldTimer >= PASSIVE_GOLD_TICK_SECONDS) {
      this.passiveGoldTimer -= PASSIVE_GOLD_TICK_SECONDS
      this.spawnFloatingText(
        114,
        TOP_PANEL_Y + 18,
        `+${Math.round(PASSIVE_GOLD_PER_SECOND * PASSIVE_GOLD_TICK_SECONDS)}`,
        '#88fff5',
      )
      this.pulseText(this.playerGoldText, '#dfffff')
    }

    this.runAi(dt)
    this.updateUnits(dt)
    this.updateProjectiles(dt)
    this.updateBaseTurrets(dt)
    this.cleanupDefeated()
    this.refreshHud()
    this.checkEndState()
  }

  private resetBattle() {
    this.units = []
    this.projectiles = []
    this.playerGold = STARTING_GOLD
    this.enemyGold = this.difficulty.enemyStartingGold
    this.playerAge = 1
    this.enemyAge = 1
    this.playerScore = 0
    this.elapsedBattleTime = 0
    this.passiveGoldTimer = 0
    this.unitId = 1
    this.gameEnded = false
    this.resultOverlay?.destroy()
    this.resultOverlay = undefined
  }

  private buildScene() {
    const sky = this.add.graphics()
    sky.fillGradientStyle(0x111a2c, 0x1b2a3f, 0x050912, 0x050912, 1)
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    sky.fillStyle(0x477b90, 0.08)
    sky.fillEllipse(GAME_WIDTH * 0.28, 98, 360, 108)
    sky.fillStyle(0x7d5b4c, 0.06)
    sky.fillEllipse(GAME_WIDTH * 0.76, 138, 320, 98)
    sky.fillStyle(0x162536, 0.95)
    for (let index = 0; index < 17; index += 1) {
      const height = 24 + (index % 5) * 14
      sky.fillRect(26 + index * 76, 236 - height, 46 + (index % 3) * 8, height)
    }
    sky.lineStyle(2, 0x324c62, 0.28)
    sky.strokeLineShape(new Phaser.Geom.Line(0, 238, GAME_WIDTH, 238))
    sky.fillStyle(0x66efff, 0.05)
    for (let index = 0; index < 12; index += 1) {
      sky.fillCircle(88 + index * 102, 82 + (index % 4) * 14, 2 + (index % 2))
    }

    const battlefield = this.add.graphics()
    battlefield.fillStyle(0x091321, 0.97)
    battlefield.fillRect(0, LANE_Y - 94, GAME_WIDTH, 194)
    battlefield.fillStyle(0x101d2f, 1)
    battlefield.fillRect(0, LANE_Y + 48, GAME_WIDTH, 46)
    battlefield.fillStyle(0x14243a, 0.82)
    battlefield.fillRect(0, LANE_Y - 16, GAME_WIDTH, 32)
    battlefield.fillStyle(0x172a41, 0.55)
    battlefield.fillRect(0, LANE_Y - 48, GAME_WIDTH, 18)
    battlefield.fillRect(0, LANE_Y + 30, GAME_WIDTH, 12)
    for (let index = 0; index < 7; index += 1) {
      const x = GAME_WIDTH / 2 - 180 + index * 60
      battlefield.fillStyle(index < 3 ? 0x2f7189 : 0x8a5c4f, 0.18)
      battlefield.fillTriangle(x, LANE_Y - 6, x + 14, LANE_Y, x, LANE_Y + 6)
      battlefield.fillTriangle(GAME_WIDTH - x, LANE_Y - 6, GAME_WIDTH - x - 14, LANE_Y, GAME_WIDTH - x, LANE_Y + 6)
    }
    battlefield.lineStyle(2, 0x59efff, 0.34)
    battlefield.strokeLineShape(new Phaser.Geom.Line(0, LANE_Y + 36, GAME_WIDTH, LANE_Y + 36))
    battlefield.lineStyle(2, 0x7f6a55, 0.18)
    battlefield.strokeLineShape(new Phaser.Geom.Line(GAME_WIDTH / 2, LANE_Y - 82, GAME_WIDTH / 2, LANE_Y + 82))
    battlefield.fillStyle(0x8fc9d8, 0.06)
    battlefield.fillRect(44, LANE_Y + 24, 196, 28)
    battlefield.fillStyle(0xc18f7a, 0.06)
    battlefield.fillRect(GAME_WIDTH - 240, LANE_Y + 24, 196, 28)
    this.clashGlow = this.add.ellipse(GAME_WIDTH / 2, LANE_Y + 2, 220, 136, 0xffc188, 0.05).setDepth(2.5)

    this.playerBase = this.createBase('player', PLAYER_BASE_X)
    this.enemyBase = this.createBase('enemy', ENEMY_BASE_X)
    this.buildHud()
  }

  private createBase(side: Side, x: number): BaseState {
    const container = this.add.container(x, LANE_Y - 30).setDepth(3)
    const base: BaseState = {
      side,
      x,
      hp: BASE_HEALTH,
      age: 1,
      turretCooldown: 0,
      aiThinkCooldown: 0,
      body: container,
    }
    this.redrawBase(base)
    return base
  }

  private redrawBase(base: BaseState) {
    base.body.removeAll(true)
    const isPlayer = base.side === 'player'
    const shellColor = isPlayer ? 0x39c7ea : 0xd26b5c
    const coreColor = isPlayer ? 0xbbeff7 : 0xf0c6bb
    const trimColor = base.age === 1 ? 0x879c7f : base.age === 2 ? 0x9eb8d7 : 0xf0c179
    const floor = this.add.rectangle(0, 76, 176, 38, 0x0a1220, 1).setStrokeStyle(2, trimColor, 0.24)
    const core = this.add.circle(0, -10, 16, coreColor, 0.8).setStrokeStyle(2, trimColor, 0.65)
    const badge = this.add
      .text(0, -78, `AGE ${base.age}`, {
        fontFamily: 'Trebuchet MS',
        fontSize: '12px',
        color: '#f4f0d1',
        fontStyle: 'bold',
        backgroundColor: '#1a2432',
      })
      .setPadding(8, 3, 8, 3)
      .setOrigin(0.5)

    const parts: Phaser.GameObjects.GameObject[] = [floor]

    if (base.age === 1) {
      const bunker = this.add.rectangle(0, 22, 108, 120, 0x121a2d, 1).setStrokeStyle(3, shellColor, 0.88)
      const viewport = this.add.rectangle(0, -6, 40, 54, shellColor, 0.12).setStrokeStyle(2, shellColor, 0.8)
      const mast = this.add.rectangle(0, -62, 10, 30, trimColor, 0.8)
      const cannon = this.add.rectangle(isPlayer ? 40 : -40, -4, 36, 8, trimColor, 0.82)
      const strutA = this.add.rectangle(-44, 36, 22, 34, 0x162439, 1).setStrokeStyle(2, shellColor, 0.42)
      const strutB = this.add.rectangle(44, 36, 22, 34, 0x162439, 1).setStrokeStyle(2, shellColor, 0.42)
      parts.push(strutA, strutB, bunker, viewport, core, mast, cannon, badge)
      base.shell = bunker
    } else if (base.age === 2) {
      const lower = this.add.rectangle(0, 28, 126, 104, 0x111b2f, 1).setStrokeStyle(3, shellColor, 0.88)
      const upper = this.add.rectangle(0, -12, 74, 70, 0x172439, 1).setStrokeStyle(3, trimColor, 0.74)
      const armA = this.add.rectangle(-48, 16, 28, 66, 0x162234, 1).setStrokeStyle(2, shellColor, 0.45)
      const armB = this.add.rectangle(48, 16, 28, 66, 0x162234, 1).setStrokeStyle(2, shellColor, 0.45)
      const cannonA = this.add.rectangle(isPlayer ? 54 : -54, -18, 48, 9, trimColor, 0.84)
      const cannonB = this.add.rectangle(isPlayer ? 38 : -38, 2, 28, 6, trimColor, 0.72)
      const tower = this.add.rectangle(0, -66, 14, 34, trimColor, 0.84)
      parts.push(armA, armB, lower, upper, core, tower, cannonA, cannonB, badge)
      base.shell = lower
    } else {
      const lower = this.add.rectangle(0, 30, 138, 96, 0x101a2e, 1).setStrokeStyle(3, shellColor, 0.9)
      const upper = this.add.polygon(0, -4, [-42, 24, -18, -28, 18, -28, 42, 24], 0x192539, 1).setStrokeStyle(
        3,
        trimColor,
        0.78,
      )
      const wingA = this.add.polygon(-62, 18, [-18, 22, 6, -22, 18, 22], 0x162334, 1).setStrokeStyle(2, shellColor, 0.5)
      const wingB = this.add.polygon(62, 18, [-18, 22, 6, -22, 18, 22], 0x162334, 1).setStrokeStyle(2, shellColor, 0.5)
      const rail = this.add.rectangle(isPlayer ? 58 : -58, -18, 52, 10, trimColor, 0.9)
      const antennaA = this.add.rectangle(-14, -72, 6, 28, trimColor, 0.9)
      const antennaB = this.add.rectangle(14, -72, 6, 28, trimColor, 0.9)
      parts.push(wingA, wingB, lower, upper, core, rail, antennaA, antennaB, badge)
      base.shell = lower as Phaser.GameObjects.Rectangle
    }

    base.body.add(parts)
    base.core = core
    base.badge = badge
  }

  private buildHud() {
    this.add
      .rectangle(GAME_WIDTH / 2, TOP_PANEL_Y, GAME_WIDTH - 54, TOP_PANEL_HEIGHT, 0x091323, 0.92)
      .setStrokeStyle(2, 0x59efff, 0.18)
      .setDepth(10)

    this.playerGoldText = this.add
      .text(90, TOP_PANEL_Y - 10, 'GOLD 0', {
        fontFamily: 'Trebuchet MS',
        fontSize: '20px',
        color: '#8ef9ff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setDepth(11)

    this.goldTickText = this.add
      .text(90, TOP_PANEL_Y + 14, 'Income +16', {
        fontFamily: 'Trebuchet MS',
        fontSize: '13px',
        color: '#7ecad2',
      })
      .setOrigin(0, 0.5)
      .setDepth(11)

    this.playerAgeText = this.add
      .text(GAME_WIDTH / 2, TOP_PANEL_Y - 8, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '30px',
        color: '#f3e5a0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(11)

    this.ageSubtitleText = this.add
      .text(GAME_WIDTH / 2, TOP_PANEL_Y + 24, 'Tech parity', {
        fontFamily: 'Trebuchet MS',
        fontSize: '12px',
        color: '#8c8467',
      })
      .setOrigin(0.5)
      .setDepth(11)

    this.playerTechText = this.add
      .text(430, TOP_PANEL_Y - 10, 'T1', {
        fontFamily: 'Trebuchet MS',
        fontSize: '13px',
        color: '#e7f7fb',
        fontStyle: 'bold',
        backgroundColor: '#1d2b36',
      })
      .setPadding(8, 3, 8, 3)
      .setOrigin(0.5)
      .setDepth(12)
    this.enemyTechText = this.add
      .text(1018, TOP_PANEL_Y - 10, 'T1', {
        fontFamily: 'Trebuchet MS',
        fontSize: '13px',
        color: '#fff0e8',
        fontStyle: 'bold',
        backgroundColor: '#382423',
      })
      .setPadding(8, 3, 8, 3)
      .setOrigin(0.5)
      .setDepth(12)

    this.playerBaseText = this.add
      .text(318, TOP_PANEL_Y - 10, 'BASE 0', {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color: '#f2fdff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(11)
    this.enemyBaseText = this.add
      .text(930, TOP_PANEL_Y - 10, 'ENEMY 0', {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color: '#ffd4ca',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(11)

    const muteChip = this.createHudButton(1138, TOP_PANEL_Y, 112, 36, false, true)
    this.hudButtons.set('mute', muteChip)

    this.add.rectangle(318, TOP_PANEL_Y + 16, 176, 8, 0x15283c, 1).setDepth(11)
    this.add.rectangle(930, TOP_PANEL_Y + 16, 176, 8, 0x2b1b20, 1).setDepth(11)
    this.playerBaseBar = this.add.rectangle(230, TOP_PANEL_Y + 16, 176, 8, 0x7df7ff, 1).setOrigin(0, 0.5).setDepth(12)
    this.enemyBaseBar = this.add.rectangle(842, TOP_PANEL_Y + 16, 176, 8, 0xff9d8d, 1).setOrigin(0, 0.5).setDepth(12)

    this.add
      .rectangle(GAME_WIDTH / 2, COMMAND_PANEL_Y, GAME_WIDTH - 54, COMMAND_PANEL_HEIGHT, 0x071220, 0.88)
      .setStrokeStyle(1, 0x78dfff, 0.08)
      .setDepth(10)
    this.add.rectangle(GAME_WIDTH / 2, COMMAND_PANEL_Y - 58, GAME_WIDTH - 80, 2, 0x4f7a8b, 0.12).setDepth(11)

    this.hintText = this.add
      .text(52, COMMAND_PANEL_Y - 48, 'Tech up before the lane freezes.', {
        fontFamily: 'Trebuchet MS',
        fontSize: '13px',
        color: '#7ea2ad',
      })
      .setOrigin(0, 0.5)
      .setDepth(11)

    const unitStartX = 104
    const unitGap = 120
    const unitY = COMMAND_PANEL_Y + 8

    UNIT_DEFS.forEach((unit, index) => {
      this.hudButtons.set(unit.id, this.createHudButton(unitStartX + index * unitGap, unitY, 112, 78))
    })

    this.hudButtons.set('age-up', this.createHudButton(1046, COMMAND_PANEL_Y + 4, 148, 80, true))
  }

  private createHudButton(
    x: number,
    y: number,
    width: number,
    height: number,
    utility = false,
    compact = false,
  ) {
    const container = this.add.container(x, y).setDepth(12)
    const shadow = this.add.rectangle(0, 6, width, height, 0x000000, compact ? 0.16 : 0.22)
    const hitArea = this.add.zone(0, 0, width + 10, height + 10).setInteractive({ cursor: 'pointer' })
    const bg = this.add
      .rectangle(0, 0, width, height, 0x112335, 0.96)
      .setStrokeStyle(1, 0x5feeff, 0.18)
    const edge = this.add.rectangle(0, -height / 2 + 6, width - 18, 2, 0xffffff, compact ? 0.08 : 0.12)
    const accent = this.add.rectangle(-width / 2 + 6, 0, 4, height - 14, 0x5feeff, 0.72)
    const cost = this.add
      .text(-width / 2 + 18, -height / 2 + 16, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: compact ? '11px' : '13px',
        color: '#fff0b0',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
    const title = this.add
      .text(compact ? -width / 2 + 16 : 0, compact ? -1 : 1, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: compact ? '14px' : '15px',
        color: '#f6ffff',
        fontStyle: 'bold',
        align: compact ? 'left' : 'center',
        wordWrap: { width: compact ? width - 34 : width - 22 },
      })
      .setOrigin(compact ? 0 : 0.5, 0.5)
    const detail = this.add
      .text(compact ? -width / 2 + 16 : 0, compact ? 15 : 23, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: compact ? '10px' : '9px',
        color: '#91cada',
        align: compact ? 'left' : 'center',
        wordWrap: { width: compact ? width - 34 : width - 22 },
      })
      .setOrigin(compact ? 0 : 0.5, 0.5)
    container.add([shadow, bg, edge, accent, hitArea, cost, title, detail])
    container.setSize(width, height)
    bg.setData('fillColor', 0x112335)
    bg.setData('fillAlpha', 0.96)

    const resetButtonVisual = (hovered: boolean) => {
      bg.setFillStyle(
        Number(bg.getData('fillColor') ?? 0x112335),
        hovered
          ? Math.min(1, Number(bg.getData('fillAlpha') ?? 0.96) + 0.08)
          : Number(bg.getData('fillAlpha') ?? 0.96),
      )
      container.setScale(1)
    }

    hitArea.on('pointerover', () => {
      resetButtonVisual(true)
    })
    hitArea.on('pointerout', () => {
      resetButtonVisual(false)
    })
    hitArea.on('pointerdown', () => {
      bg.setFillStyle(
        Number(bg.getData('fillColor') ?? 0x112335),
        Math.min(1, Number(bg.getData('fillAlpha') ?? 0.96) + 0.14),
      )
      container.setScale(0.982)
    })
    hitArea.on('pointerup', () => {
      resetButtonVisual(true)
    })
    hitArea.on('pointerupoutside', () => {
      resetButtonVisual(false)
    })

    if (utility) {
      detail.setFontSize('11px')
    }

    return { container, hitArea, bg, title, detail, accent, cost }
  }

  private registerInputs() {
    const bindings: Array<[string, UnitId]> = [
      ['ONE', 'scrapper'],
      ['TWO', 'pulse-gunner'],
      ['THREE', 'bulwark'],
      ['FOUR', 'arc-caster'],
      ['FIVE', 'raider'],
      ['SIX', 'siege-engine'],
    ]
    bindings.forEach(([key, id]) => {
      this.bindKey(`keydown-${key}`, () => this.onHudButtonPressed(id))
    })
    this.bindKey('keydown-U', () => this.onHudButtonPressed('age-up'))
    this.bindKey('keydown-M', () => this.onHudButtonPressed('mute'))
    this.bindKey('keydown-R', () => {
      if (this.gameEnded) {
        this.scene.restart()
      }
    })
    this.bindKey('keydown-T', () => {
      if (this.gameEnded) {
        this.scene.start('title')
      }
    })

    for (const [id, button] of this.hudButtons) {
      button.hitArea.on('pointerup', () => {
        button.title.setScale(1)
        this.onHudButtonPressed(id)
      })
    }
  }

  private bindKey(event: string, handler: () => void) {
    this.keyBindings.push({ event, handler })
    this.input.keyboard?.on(event, handler)
  }

  private cleanupScene() {
    for (const binding of this.keyBindings) {
      this.input.keyboard?.off(binding.event, binding.handler)
    }
    this.keyBindings = []
    delete window.__AOW_DEBUG__
  }

  private installDebugApi() {
    window.__AOW_DEBUG__ = {
      getState: () => ({
        difficulty: this.difficulty.id,
        playerGold: this.playerGold,
        enemyGold: this.enemyGold,
        playerAge: this.playerAge,
        enemyAge: this.enemyAge,
        playerBaseHp: this.playerBase.hp,
        enemyBaseHp: this.enemyBase.hp,
        playerUnits: this.units.filter((unit) => unit.side === 'player').map((unit) => unit.def.id),
        enemyUnits: this.units.filter((unit) => unit.side === 'enemy').map((unit) => unit.def.id),
        gameEnded: this.gameEnded,
        overlayVisible: Boolean(this.resultOverlay),
        score: this.playerScore,
        muted: this.state.audio.getMuted(),
      }),
      clickHud: (id: string) => {
        this.onHudButtonPressed(id)
      },
    }
  }

  private onHudButtonPressed(id: string) {
    if (this.gameEnded && id !== 'mute') {
      return
    }

    if (id === 'mute') {
      const nextMuted = !this.state.save.muted
      this.state.save = mergeSave({ muted: nextMuted })
      this.state.audio.setMuted(nextMuted)
      if (!nextMuted) {
        this.state.audio.play('click')
      }
      this.refreshHud()
      return
    }

    if (id === 'age-up') {
      const cost = AGE_UP_COSTS[this.playerAge]
      if (this.playerAge < 3 && this.playerGold >= cost) {
        this.playerGold -= cost
        this.playerAge += 1
        this.playerBase.age = this.playerAge
        this.redrawBase(this.playerBase)
        this.state.audio.play('age')
        this.flashButton(id, 0xffe59e)
        this.playAgeUpEvent('player', this.playerAge)
        this.pulseBase(this.playerBase, 0x9affd3)
      } else if (this.playerAge >= 3) {
        this.flashButton(id, 0x45545d)
        this.spawnFloatingText(1046, COMMAND_PANEL_Y - 42, 'MAX TECH', '#b8c5cd')
      } else {
        this.flashButton(id, 0x80392f)
        this.spawnFloatingText(1046, COMMAND_PANEL_Y - 42, `Need ${Math.max(0, Math.ceil(cost - this.playerGold))}g`, '#ffcfb8')
      }
      this.refreshHud()
      return
    }

    const definition = UNIT_DEFS.find((unit) => unit.id === id)
    if (!definition) {
      return
    }

    const buttonIndex = UNIT_DEFS.findIndex((unit) => unit.id === id)
    const buttonX = 104 + buttonIndex * 120

    if (definition.age > this.playerAge) {
      this.flashButton(id, 0x4b3b25)
      this.spawnFloatingText(buttonX, COMMAND_PANEL_Y - 40, `Age ${definition.age}`, '#ffd9a9')
      return
    }

    if (this.playerGold < definition.cost) {
      this.flashButton(id, 0x80392f)
      this.spawnFloatingText(buttonX, COMMAND_PANEL_Y - 40, `Need ${Math.max(0, Math.ceil(definition.cost - this.playerGold))}g`, '#ffcfb8')
      return
    }

    this.playerGold -= definition.cost
    this.spawnUnit(definition, 'player')
    this.state.audio.play('spawn')
    this.flashButton(id, 0x8ef9ff)
    this.spawnFloatingText(114, TOP_PANEL_Y + 18, `-${definition.cost}`, '#ffd3ba')
    this.refreshHud()
  }

  private flashButton(id: string, color: number) {
    const button = this.hudButtons.get(id)
    if (!button) {
      return
    }

    button.bg.setFillStyle(color, 0.22)
    button.container.setScale(1.012)
    this.tweens.add({
      targets: button.container,
      scaleX: 1,
      scaleY: 1,
      duration: PURCHASE_FLASH_DURATION,
      ease: 'Quad.Out',
    })
    this.time.delayedCall(PURCHASE_FLASH_DURATION, () => {
      button.bg.setFillStyle(
        Number(button.bg.getData('fillColor') ?? 0x112335),
        Number(button.bg.getData('fillAlpha') ?? 0.98),
      )
    })
  }

  private spawnUnit(def: UnitDefinition, side: Side) {
    const texture = `${side}-${def.id}`
    const spawnX = side === 'player' ? PLAYER_SPAWN_X : ENEMY_SPAWN_X
    const sprite = this.add
      .image(spawnX, LANE_Y, texture)
      .setScale(def.scale * UNIT_RENDER_SCALE)
      .setAlpha(0)
      .setDepth(4)
    const healthBar = this.add.graphics().setDepth(7)
    const unit: UnitState = {
      id: this.unitId,
      def,
      side,
      sprite,
      healthBar,
      hp: def.maxHealth,
      attackCooldown: Phaser.Math.FloatBetween(0.05, 0.18),
    }
    this.unitId += 1
    this.units.push(unit)
    this.playSpawnBurst(unit)
    this.drawHealthBar(unit)
  }

  private drawHealthBar(unit: UnitState) {
    const ratio = Phaser.Math.Clamp(unit.hp / unit.def.maxHealth, 0, 1)
    const width = 52 + unit.def.age * 10
    const x = unit.sprite.x - width / 2
    const y = unit.sprite.y - 50 - unit.def.age * 4
    unit.healthBar.clear()
    unit.healthBar.fillStyle(0x06101b, 0.95)
    unit.healthBar.fillRoundedRect(x - 1, y - 1, width + 2, 8, 3)
    unit.healthBar.fillStyle(unit.side === 'player' ? 0x7cf6ff : 0xff9b88, 1)
    unit.healthBar.fillRoundedRect(x, y, width * ratio, 6, 2)
    const pipColor = unit.def.age === 1 ? 0x879c7f : unit.def.age === 2 ? 0xa8c2df : 0xf0c179
    for (let index = 0; index < unit.def.age; index += 1) {
      const px = unit.sprite.x - ((unit.def.age - 1) * 7) + index * 14
      unit.healthBar.fillStyle(pipColor, 0.95)
      unit.healthBar.fillRect(px - 4, y - 10, 8, 5)
    }
  }

  private runAi(dt: number) {
    const thinkInterval = Phaser.Math.Linear(
      AI_BASE_THINK_INTERVAL,
      AI_MIN_THINK_INTERVAL,
      Phaser.Math.Clamp(this.elapsedBattleTime / AI_ESCALATION_SECONDS, 0, 1),
    ) * this.difficulty.thinkIntervalFactor
    this.enemyBase.aiThinkCooldown += dt
    if (this.enemyBase.aiThinkCooldown < thinkInterval) {
      return
    }
    this.enemyBase.aiThinkCooldown = 0

    const friendly = this.units.filter((unit) => unit.side === 'enemy')
    const hostile = this.units.filter((unit) => unit.side === 'player')
    const enemyFront = friendly.length > 0 ? Math.min(...friendly.map((unit) => unit.sprite.x)) : ENEMY_BASE_X
    const playerFront = hostile.length > 0 ? Math.max(...hostile.map((unit) => unit.sprite.x)) : PLAYER_BASE_X
    const pressure = playerFront - enemyFront
    const shouldPanic =
      pressure > this.difficulty.panicThreshold || this.enemyBase.hp < this.playerBase.hp - (80 - this.difficulty.pressureBias * 18)
    const ageCost = this.enemyAge < 3 ? Math.ceil(AGE_UP_COSTS[this.enemyAge] * this.difficulty.ageCostMultiplier) : 0
    const laneStable = friendly.length + 1 >= hostile.length || pressure < -10
    const behindInAge = this.enemyAge < this.playerAge
    const shouldSaveForAge =
      this.enemyAge < 3 &&
      this.elapsedBattleTime > this.enemyAge * 10 &&
      !shouldPanic &&
      laneStable &&
      this.enemyGold >= ageCost * (behindInAge ? 0.42 : 0.58)

    let upgraded = false
    if (this.enemyAge < 3) {
      const cost = ageCost
      const canAffordAge = this.enemyGold >= cost
      const timingOkay = this.elapsedBattleTime > this.enemyAge * (this.difficulty.id === 'hard' ? 11.5 : this.difficulty.id === 'easy' ? 14 : 13)
      const forcedWindow =
        laneStable &&
        this.elapsedBattleTime > (this.enemyAge === 1 ? (this.difficulty.id === 'hard' ? 9 : 12) : this.difficulty.id === 'hard' ? 25 : 30) &&
        canAffordAge
      if (
          (canAffordAge && ((behindInAge && !shouldPanic) || (timingOkay && this.enemyGold > cost + 34))) ||
          forcedWindow
        ) {
        this.enemyGold -= cost
        this.enemyAge += 1
        this.enemyBase.age = this.enemyAge
        upgraded = true
        this.redrawBase(this.enemyBase)
        this.playAgeUpEvent('enemy', this.enemyAge)
        this.state.audio.play('age')
        this.pulseBase(this.enemyBase, 0xffe39e)
      }
    }

    const available = UNIT_DEFS.filter((unit) => unit.age <= this.enemyAge && unit.cost <= this.enemyGold)
    if (available.length === 0) {
      return
    }

    if (shouldSaveForAge && !upgraded) {
      return
    }

      const weighted = available
      .map((unit) => {
        let score = 1
        if (shouldPanic) {
          score += unit.attackKind === 'melee' ? 3.1 : 0.75
          score += unit.maxHealth > 170 ? 1.9 : 0.15
        } else {
          score += unit.age === this.enemyAge ? 2.25 : 0.35
          score += unit.attackKind === 'ranged' ? 1.6 : 0.95
          score += this.elapsedBattleTime > 26 && unit.cost > 150 ? 1.35 : 0
        }
        score += pressure < -26 && unit.speed > 55 ? 1.15 : 0
        score += behindInAge && unit.age === this.enemyAge ? 1.25 : 0
        score += unit.age >= 2 && this.elapsedBattleTime > 20 ? 0.6 : 0
        score += upgraded && unit.age === this.enemyAge ? 1.2 : 0
        score += this.difficulty.pressureBias * unit.age
        return { unit, score }
      })
      .sort((a, b) => b.score - a.score)

    const top = weighted.slice(0, 3)
    const sum = top.reduce((total, item) => total + item.score, 0)
    let roll = Math.random() * sum
    let chosen = top[0].unit
    for (const item of top) {
      roll -= item.score
      if (roll <= 0) {
        chosen = item.unit
        break
      }
    }

    this.enemyGold -= chosen.cost
    this.spawnUnit(chosen, 'enemy')
    this.hintText.setText(shouldPanic ? 'Enemy is contesting hard.' : 'Enemy is spending into pressure.')
  }

  private updateUnits(dt: number) {
    for (const unit of this.units) {
      unit.attackCooldown -= dt
      const targetUnit = this.findTargetUnit(unit)
      const targetBase = targetUnit ? undefined : this.findTargetBase(unit)
      const direction = unit.side === 'player' ? 1 : -1

      if (targetUnit) {
        const distance = Math.abs(unit.sprite.x - targetUnit.sprite.x)
        if (distance <= unit.def.range + UNIT_STOP_BUFFER && unit.attackCooldown <= 0) {
          this.performAttack(unit, targetUnit)
        } else if (distance > unit.def.range + UNIT_STOP_BUFFER) {
          unit.sprite.x += direction * unit.def.speed * dt
        }
      } else if (targetBase) {
        const edgeDistance = Math.abs(unit.sprite.x - targetBase.x) - BASE_BODY_WIDTH / 2
        if (edgeDistance <= unit.def.range + UNIT_STOP_BUFFER && unit.attackCooldown <= 0) {
          this.performAttack(unit, targetBase)
        } else {
          unit.sprite.x += direction * unit.def.speed * dt
        }
      } else {
        unit.sprite.x += direction * unit.def.speed * dt
      }

      unit.sprite.x = Phaser.Math.Clamp(unit.sprite.x, PLAYER_BASE_X + 56, ENEMY_BASE_X - 56)
      this.drawHealthBar(unit)
    }
  }

  private findTargetUnit(unit: UnitState) {
    const enemies = this.units.filter((candidate) => candidate.side !== unit.side && candidate.hp > 0)
    const forwardCandidates = enemies.filter((candidate) =>
      unit.side === 'player' ? candidate.sprite.x >= unit.sprite.x : candidate.sprite.x <= unit.sprite.x,
    )
    let best: UnitState | undefined
    let bestDistance = Number.POSITIVE_INFINITY
    for (const candidate of forwardCandidates) {
      const distance = Math.abs(unit.sprite.x - candidate.sprite.x)
      if (distance < bestDistance) {
        best = candidate
        bestDistance = distance
      }
    }
    return best
  }

  private findTargetBase(unit: UnitState) {
    const targetBase = unit.side === 'player' ? this.enemyBase : this.playerBase
    const forward = unit.side === 'player' ? unit.sprite.x <= targetBase.x : unit.sprite.x >= targetBase.x
    return forward ? targetBase : undefined
  }

  private performAttack(attacker: UnitState, target: UnitState | BaseState) {
    attacker.attackCooldown = attacker.def.cooldown
    if (attacker.def.attackKind === 'melee') {
      this.tweens.add({
        targets: attacker.sprite,
        x: attacker.sprite.x + (attacker.side === 'player' ? 8 : -8),
        duration: 70,
        yoyo: true,
      })
      this.applyDamage(target, attacker.def.damage, attacker.side)
      this.flashHit(target)
      this.state.audio.play('hit')
      return
    }

    const targetX = 'sprite' in target ? target.sprite.x : target.x
    const targetY = 'sprite' in target ? target.sprite.y - 6 : LANE_Y - 24
    const projectile = this.add
      .image(
        attacker.sprite.x + (attacker.side === 'player' ? 12 : -12),
        attacker.sprite.y - 6,
        this.getProjectileKey(attacker),
      )
      .setScale(attacker.def.id === 'siege-engine' ? 1.72 : attacker.def.id === 'arc-caster' ? 1.34 : 1.12)
      .setDepth(5)

    projectile.rotation = Phaser.Math.Angle.Between(projectile.x, projectile.y, targetX, targetY)
    this.projectiles.push({
      side: attacker.side,
      sprite: projectile,
      damage: attacker.def.damage,
      targetUnit: 'sprite' in target ? target : undefined,
      targetBase: 'sprite' in target ? undefined : target,
      speed: attacker.def.projectileSpeed ?? 460,
    })
  }

  private getProjectileKey(attacker: UnitState) {
    if (attacker.def.id === 'siege-engine') {
      return attacker.side === 'player' ? 'proj-heavy-player' : 'proj-heavy-enemy'
    }

    return attacker.side === 'player' ? 'proj-ranged-player' : 'proj-ranged-enemy'
  }

  private updateProjectiles(dt: number) {
    this.projectiles = this.projectiles.filter((projectile) => {
      const targetUnit = projectile.targetUnit && projectile.targetUnit.hp > 0 ? projectile.targetUnit : undefined
      const targetBase = projectile.targetBase && projectile.targetBase.hp > 0 ? projectile.targetBase : undefined
      const tx = targetUnit ? targetUnit.sprite.x : targetBase ? targetBase.x : projectile.sprite.x
        const ty = targetUnit ? targetUnit.sprite.y - 8 : targetBase ? LANE_Y - 22 : projectile.sprite.y
      const angle = Phaser.Math.Angle.Between(projectile.sprite.x, projectile.sprite.y, tx, ty)
      const distance = Phaser.Math.Distance.Between(projectile.sprite.x, projectile.sprite.y, tx, ty)
      projectile.sprite.x += Math.cos(angle) * projectile.speed * dt
      projectile.sprite.y += Math.sin(angle) * projectile.speed * dt
      projectile.sprite.rotation = angle

        if (distance <= projectile.speed * dt + 10) {
        const resolvedTarget = targetUnit ?? targetBase
        if (resolvedTarget) {
          this.applyDamage(resolvedTarget, projectile.damage, projectile.side)
          this.flashHit(resolvedTarget)
          this.state.audio.play('hit')
        }
        projectile.sprite.destroy()
        return false
      }

      if (projectile.sprite.x < -32 || projectile.sprite.x > GAME_WIDTH + 32) {
        projectile.sprite.destroy()
        return false
      }

      return true
    })
  }

  private updateBaseTurrets(dt: number) {
    const bases = [this.playerBase, this.enemyBase]
    for (const base of bases) {
      base.turretCooldown -= dt
      if (base.turretCooldown > 0) {
        continue
      }

      const target = this.units
        .filter((unit) => unit.side !== base.side)
        .find((unit) => Math.abs(unit.sprite.x - base.x) <= BASE_ATTACK_RANGE)
      if (!target) {
        continue
      }

      base.turretCooldown = BASE_ATTACK_COOLDOWN
      const projectile = this.add
        .image(
          base.x + (base.side === 'player' ? 34 : -34),
          LANE_Y - 70,
          base.side === 'player' ? 'proj-ranged-player' : 'proj-ranged-enemy',
        )
        .setScale(1.02)
        .setDepth(5)

      this.projectiles.push({
        side: base.side,
        sprite: projectile,
        damage: BASE_ATTACK_DAMAGE,
        targetUnit: target,
        speed: BASE_ATTACK_PROJECTILE_SPEED,
      })
    }
  }

  private applyDamage(target: UnitState | BaseState, amount: number, attackerSide: Side) {
    if ('sprite' in target) {
      target.hp -= amount
      if (target.hp <= 0) {
        this.spawnFloatingText(target.sprite.x, target.sprite.y - 50, 'KO', target.side === 'player' ? '#ffcfbf' : '#9bfbff')
        this.addDeathBurst(target.sprite.x, target.sprite.y, target.side)
        this.state.audio.play('kill')
        if (attackerSide === 'player') {
          const bounty = target.def.bounty + COMBAT_BONUS_GOLD
          this.playerGold += bounty
          this.playerScore += target.def.score
          this.spawnFloatingText(118, TOP_PANEL_Y - 10, `+${bounty}`, '#92fff0')
          this.pulseText(this.playerGoldText, '#ffffff')
        }
      }
      return
    }

    target.hp -= amount
    this.state.audio.play('base')
    this.spawnFloatingText(target.x, LANE_Y - 100, `-${amount}`, target.side === 'player' ? '#ffcfbf' : '#fff0b0')
    this.pulseBase(target, target.side === 'player' ? 0xffc3b9 : 0xffefab)
  }

  private flashHit(target: UnitState | BaseState) {
    if ('sprite' in target) {
      const direction = target.side === 'player' ? -1 : 1
      this.tweens.add({
        targets: target.sprite,
        alpha: 0.48,
        x: target.sprite.x + direction * 8,
        duration: 82,
        yoyo: true,
        scaleX: target.def.scale * UNIT_RENDER_SCALE * 1.04,
        scaleY: target.def.scale * UNIT_RENDER_SCALE * 0.96,
        onComplete: () => target.sprite.setScale(target.def.scale * UNIT_RENDER_SCALE),
      })
      return
    }

    this.tweens.add({
      targets: target.body.list,
      alpha: 0.44,
      duration: 110,
      yoyo: true,
    })
  }

  private pulseBase(base: BaseState, color: number) {
    if (!base.shell || !base.core) {
      return
    }

    base.shell.setFillStyle(color, 0.18)
    base.core.setFillStyle(color, 0.86)
    this.tweens.add({
      targets: base.body.list,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: BASE_HIT_FLASH_DURATION,
      yoyo: true,
      onComplete: () => {
        this.redrawBase(base)
      },
    })
    this.cameras.main.shake(80, 0.001)
  }

  private addDeathBurst(x: number, y: number, side: Side) {
    const burst = this.add.circle(x, y, 10, side === 'player' ? 0xffb7aa : 0x8ef7ff, 0.18).setDepth(5)
    burst.setStrokeStyle(2, side === 'player' ? 0xffb7aa : 0x8ef7ff, 0.65)
    this.tweens.add({
      targets: burst,
      radius: 28,
      alpha: 0,
      duration: 220,
      onComplete: () => burst.destroy(),
    })
  }

  private cleanupDefeated() {
    const survivors: UnitState[] = []
    for (const unit of this.units) {
      if (unit.hp > 0) {
        survivors.push(unit)
        continue
      }
      unit.sprite.destroy()
      unit.healthBar.destroy()
    }
    this.units = survivors
  }

  private checkEndState() {
    if (this.playerBase.hp <= 0) {
      this.finishBattle('defeat')
    } else if (this.enemyBase.hp <= 0) {
      this.finishBattle('victory')
    }
  }

  private finishBattle(result: 'victory' | 'defeat') {
    if (this.gameEnded) {
      return
    }
    this.gameEnded = true
    const totalScore = this.playerScore + (result === 'victory' ? WIN_BONUS_SCORE : 0)
    const ageReached = this.playerAge
    const nextSave = mergeSave({
      bestScore: Math.max(this.state.save.bestScore, totalScore),
      bestAgeReached: Math.max(this.state.save.bestAgeReached, ageReached),
      muted: this.state.save.muted,
    })

    this.state.save = nextSave
    const battleResult: BattleResult = { result, score: totalScore, ageReached, difficulty: this.difficulty.id }
    this.state.lastResult = battleResult
    this.registry.set('globalState', this.state)
    this.state.audio.play(result === 'victory' ? 'victory' : 'defeat')

    const overlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050913, 0.58)
    const halo = this.add.ellipse(0, -80, 520, 120, result === 'victory' ? 0x69d8d2 : 0xe19b77, 0.14)
    const backdrop = this.add.rectangle(0, 0, 590, 340, 0xf3e7cc, 0.98).setStrokeStyle(
      4,
      result === 'victory' ? 0x2d9aaa : 0xb86e54,
      0.78,
    )
    const inner = this.add.rectangle(0, 0, 544, 294, 0xfff7df, 0.18).setStrokeStyle(2, 0x725533, 0.38)
    const topRule = this.add.rectangle(0, -134, 346, 6, result === 'victory' ? 0x2d9aaa : 0xb86e54, 0.5)
    const title = this.add
      .text(0, -104, result === 'victory' ? 'VICTORY' : 'DEFEAT', {
        fontFamily: 'Trebuchet MS',
        fontSize: '52px',
        color: result === 'victory' ? '#186d78' : '#7d3528',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const tag = this.add
      .text(0, -66, `${this.difficulty.label.toUpperCase()} FRONT`, {
        fontFamily: 'Trebuchet MS',
        fontSize: '15px',
        color: '#725533',
        fontStyle: 'bold',
        letterSpacing: 1.1,
      })
      .setOrigin(0.5)
    const body = this.add
      .text(0, -4, `Score ${totalScore}\nReached ${AGE_NAMES[ageReached - 1]}\nBest ${nextSave.bestScore}`, {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: '#2d2419',
        align: 'center',
        lineSpacing: 12,
      })
      .setOrigin(0.5)
    const restartButton = this.makeOverlayButton(-108, 98, 190, 58, 'Restart', '#2d9aaa')
    restartButton.on('pointerup', () => this.scene.restart())
    const titleButton = this.makeOverlayButton(108, 98, 190, 58, 'Title', '#b86e54')
    titleButton.on('pointerup', () => this.scene.start('title'))
    const footer = this.add
      .text(0, 140, 'R restart • T title', {
        fontFamily: 'Trebuchet MS',
        fontSize: '14px',
        color: '#725533',
      })
      .setOrigin(0.5)
    footer.setPosition(0, 150)
    footer.setText('R restart / T title')
    overlay.add([shade, halo, backdrop, inner, topRule, title, tag, body, restartButton, titleButton, footer])
    overlay.setDepth(30)
    this.resultOverlay = overlay
  }

  private refreshHud() {
    this.playerGoldText.setText(`GOLD ${Math.floor(this.playerGold)}`)
    this.goldTickText.setText(`Income +${Math.round(PASSIVE_GOLD_PER_SECOND * PASSIVE_GOLD_TICK_SECONDS)}`)
    this.playerBaseText.setText(`BASE ${Math.max(0, Math.ceil(this.playerBase.hp))}`)
    this.enemyBaseText.setText(`ENEMY ${Math.max(0, Math.ceil(this.enemyBase.hp))}`)
    this.playerAgeText.setText(AGE_NAMES[this.playerAge - 1])
    this.playerTechText.setText(`T${this.playerAge}`)
    this.enemyTechText.setText(`T${this.enemyAge}`)

    const playerRatio = Phaser.Math.Clamp(this.playerBase.hp / BASE_HEALTH, 0, 1)
    const enemyRatio = Phaser.Math.Clamp(this.enemyBase.hp / BASE_HEALTH, 0, 1)
    this.playerBaseBar.width = 176 * playerRatio
    this.enemyBaseBar.width = 176 * enemyRatio

    const playerForces = this.units.filter((unit) => unit.side === 'player').length
    const enemyForces = this.units.filter((unit) => unit.side === 'enemy').length
    const playerPower = this.units
      .filter((unit) => unit.side === 'player')
      .reduce((total, unit) => total + unit.def.age * 1.4 + unit.hp / unit.def.maxHealth, 0)
    const enemyPower = this.units
      .filter((unit) => unit.side === 'enemy')
      .reduce((total, unit) => total + unit.def.age * 1.4 + unit.hp / unit.def.maxHealth, 0)

    const techDiff = this.playerAge - this.enemyAge

    if (techDiff > 0) {
      this.ageSubtitleText.setText(`Tech lead +${techDiff}`)
      this.ageSubtitleText.setColor('#b8ddb9')
    } else if (techDiff < 0) {
      this.ageSubtitleText.setText(`Enemy tech lead ${Math.abs(techDiff)}`)
      this.ageSubtitleText.setColor('#e4b0a2')
    } else {
      this.ageSubtitleText.setText('Tech parity')
      this.ageSubtitleText.setColor('#8c8467')
    }

    if (techDiff >= 1) {
      this.hintText.setText('Tech lead is yours. Break them before parity.')
    } else if (techDiff <= -1) {
      this.hintText.setText('Enemy tech lead. Reinforce or rush tech.')
    } else if (playerForces === enemyForces) {
      this.hintText.setText('Even lane. Tech before Age 1 stalls.')
    } else if (playerPower > enemyPower) {
      this.hintText.setText('You lead. Push or tech.')
    } else {
      this.hintText.setText('Enemy surge. Reinforce or tech.')
    }

    const tagAccent = this.playerAge === 1 ? '#2f3d34' : this.playerAge === 2 ? '#243449' : '#4a2f1e'
    const enemyTagAccent = this.enemyAge === 1 ? '#3c2c29' : this.enemyAge === 2 ? '#2e3547' : '#4e321f'
    this.playerTechText.setBackgroundColor(tagAccent)
    this.enemyTechText.setBackgroundColor(enemyTagAccent)

    this.clashGlow.setAlpha(playerForces + enemyForces >= 4 ? 0.16 : 0.06)

    for (const unit of UNIT_DEFS) {
      const button = this.hudButtons.get(unit.id)
      if (!button) {
        continue
      }
      const unlocked = unit.age <= this.playerAge
      const affordable = this.playerGold >= unit.cost
      const disabled = !unlocked || !affordable
      const activeAge = unit.age === this.playerAge
      const fill = disabled ? 0x0d1722 : activeAge ? 0x132b3a : 0x0e1d2b
      const accent = unit.attackKind === 'melee' ? 0x74f7ff : 0xffefad
      button.cost.setText(`${unit.cost}g`)
      button.title.setText(unit.name)
      button.detail.setText(unlocked ? unit.shortRole : `LOCK ${unit.age}`)
      button.bg.setStrokeStyle(1, accent, disabled ? 0.08 : activeAge ? 0.52 : 0.16)
      button.bg.setData('fillColor', fill)
      button.bg.setData('fillAlpha', disabled ? 0.78 : 0.9)
      button.bg.setFillStyle(Number(button.bg.getData('fillColor')), Number(button.bg.getData('fillAlpha')))
      button.accent.setFillStyle(accent, disabled ? 0.06 : 0.72)
      button.cost.setColor(disabled ? '#667a88' : '#fff0b0')
      button.title.setColor(disabled ? '#768897' : '#f3ffff')
      button.detail.setColor(disabled ? '#5d7485' : '#93d5e3')
    }

    const ageButton = this.hudButtons.get('age-up')
    if (ageButton) {
      const canUpgrade = this.playerAge < 3 && this.playerGold >= AGE_UP_COSTS[this.playerAge]
      const lastAge = this.playerAge >= 3
      ageButton.cost.setText(lastAge ? 'MAX' : `${AGE_UP_COSTS[this.playerAge]}g`)
      ageButton.title.setText(lastAge ? 'Tech Maxed' : 'Age Up')
      ageButton.detail.setText(lastAge ? AGE_NAMES[this.playerAge - 1] : AGE_NAMES[this.playerAge])
      ageButton.bg.setData('fillColor', lastAge ? 0x1b2529 : canUpgrade ? 0x463312 : 0x211a15)
      ageButton.bg.setData('fillAlpha', 0.94)
      ageButton.bg.setFillStyle(Number(ageButton.bg.getData('fillColor')), 0.94)
      ageButton.bg.setStrokeStyle(1, 0xffd27c, canUpgrade ? 0.72 : 0.18)
      ageButton.accent.setFillStyle(0xffd27c, canUpgrade ? 0.84 : 0.12)
      ageButton.cost.setColor(lastAge ? '#a5b0b5' : '#fff0b1')
      ageButton.title.setColor(lastAge ? '#c5d2d5' : '#fff7d4')
      ageButton.detail.setColor(lastAge ? '#8fa0a6' : canUpgrade ? '#ffe6a5' : '#907758')
    }

    const muteButton = this.hudButtons.get('mute')
    if (muteButton) {
      const muted = this.state.audio.getMuted()
      muteButton.cost.setText('')
      muteButton.title.setText(muted ? 'Audio' : 'Audio')
      muteButton.detail.setText(muted ? 'OFF' : 'ON')
      muteButton.bg.setData('fillColor', muted ? 0x3d2620 : 0x14343a)
      muteButton.bg.setData('fillAlpha', 0.96)
      muteButton.bg.setFillStyle(Number(muteButton.bg.getData('fillColor')), 0.96)
      muteButton.bg.setStrokeStyle(1, muted ? 0xffa79a : 0x93fff1, 0.64)
      muteButton.accent.setFillStyle(muted ? 0xffa79a : 0x93fff1, 0.82)
      muteButton.title.setColor('#f1ffff')
      muteButton.detail.setColor(muted ? '#ffd2c7' : '#b1fff5')
    }
  }

  private pulseText(target: Phaser.GameObjects.Text, color: string) {
    const original = target.style.color as string
    target.setColor(color)
    this.tweens.add({
      targets: target,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 90,
      yoyo: true,
      onComplete: () => {
        target.setColor(original)
      },
    })
  }

  private spawnFloatingText(x: number, y: number, message: string, color: string) {
    const text = this.add
      .text(x, y, message, {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)

    this.tweens.add({
      targets: text,
      y: y - 24,
      alpha: 0,
      duration: FLOAT_TEXT_DURATION,
      onComplete: () => text.destroy(),
    })
  }

  private playSpawnBurst(unit: UnitState) {
    const color = unit.side === 'player' ? 0x8defff : 0xffb39f
    const ring = this.add.circle(unit.sprite.x, unit.sprite.y + 4, 10, color, 0.14).setDepth(3.8)
    ring.setStrokeStyle(2, color, 0.56)
    const direction = unit.side === 'player' ? -18 : 18
    unit.sprite.x += direction
    unit.sprite.setScale(unit.def.scale * UNIT_RENDER_SCALE * 0.76)
    this.tweens.add({
      targets: unit.sprite,
      x: unit.sprite.x - direction,
      alpha: 1,
      scaleX: unit.def.scale * UNIT_RENDER_SCALE,
      scaleY: unit.def.scale * UNIT_RENDER_SCALE,
      duration: SPAWN_BURST_DURATION,
      ease: 'Cubic.Out',
    })
    this.tweens.add({
      targets: ring,
      radius: 36,
      alpha: 0,
      duration: SPAWN_BURST_DURATION,
      onComplete: () => ring.destroy(),
    })
  }

  private playAgeUpEvent(side: Side, age: number) {
    const isPlayer = side === 'player'
    const base = isPlayer ? this.playerBase : this.enemyBase
    const accent = isPlayer ? 0x8fefff : 0xffb798
    const trim = age === 2 ? 0xb7d8ff : 0xffd78b
    const panelX = isPlayer ? 248 : 1032
    const panel = this.add.container(panelX, 164).setDepth(24)
    const flare = this.add.circle(base.x, LANE_Y - 54, 20, accent, 0.14).setDepth(8)
    const sweep = this.add.rectangle(base.x, LANE_Y + 2, 26, 110, trim, 0.12).setDepth(4)
    const scaffoldA = this.add.rectangle(base.x + (isPlayer ? -34 : 34), LANE_Y - 18, 18, 10, trim, 0.22).setDepth(7)
    const scaffoldB = this.add.rectangle(base.x + (isPlayer ? 26 : -26), LANE_Y - 54, 14, 10, trim, 0.18).setDepth(7)
    flare.setStrokeStyle(2, accent, 0.6)
    const backing = this.add.rectangle(0, 0, 212, 74, 0x101a28, 0.92).setStrokeStyle(2, accent, 0.5)
    const tag = this.add
      .text(0, -17, `AGE ${age}`, {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color: '#f4f8ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const name = this.add
      .text(0, 6, AGE_NAMES[age - 1], {
        fontFamily: 'Trebuchet MS',
        fontSize: '19px',
        color: Phaser.Display.Color.IntegerToColor(trim).rgba,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const detail = this.add
      .text(0, 26, age === 2 ? 'Arsenal online' : 'Dominion online', {
        fontFamily: 'Trebuchet MS',
        fontSize: '13px',
        color: '#d6e4ea',
      })
      .setOrigin(0.5)
    panel.add([backing, tag, name, detail])
    panel.alpha = 0
    panel.x += isPlayer ? -24 : 24
    this.cameras.main.shake(130, 0.0012)
    base.body.setScale(0.94)
    this.tweens.add({
      targets: base.body,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 180,
      ease: 'Back.Out',
      yoyo: true,
      hold: 90,
      onComplete: () => base.body.setScale(1),
    })
    this.tweens.add({
      targets: panel,
      alpha: 1,
      x: panelX,
      duration: 180,
      ease: 'Quad.Out',
      yoyo: false,
    })
    this.tweens.add({
      targets: panel,
      alpha: 0,
      y: 142,
      delay: AGE_EVENT_DURATION - 260,
      duration: 260,
      onComplete: () => panel.destroy(),
    })
    this.tweens.add({
      targets: flare,
      radius: 132,
      alpha: 0,
      duration: AGE_EVENT_DURATION,
      onComplete: () => flare.destroy(),
    })
    this.tweens.add({
      targets: sweep,
      width: 430,
      alpha: 0,
      duration: AGE_EVENT_DURATION - 120,
      onComplete: () => sweep.destroy(),
    })
    this.tweens.add({
      targets: [scaffoldA, scaffoldB],
      y: '-=58',
      alpha: 0,
      scaleX: 0.4,
      duration: AGE_EVENT_DURATION - 120,
      ease: 'Cubic.Out',
      onComplete: () => {
        scaffoldA.destroy()
        scaffoldB.destroy()
      },
    })
  }

  private makeOverlayButton(x: number, y: number, width: number, height: number, label: string, colorText: string) {
    const container = this.add.container(x, y)
    const fill = Phaser.Display.Color.HexStringToColor(colorText).color
    const shadow = this.add.rectangle(0, 6, width, height, 0x2b2014, 0.22)
    const hitArea = this.add.zone(0, 0, width + 10, height + 10).setInteractive({ cursor: 'pointer' })
    const bg = this.add
      .rectangle(0, 0, width, height, 0xf0dfbd, 0.98)
      .setStrokeStyle(3, fill, 0.78)
    const accent = this.add.rectangle(0, -height / 2 + 7, width - 22, 4, fill, 0.45)
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Trebuchet MS',
        fontSize: '24px',
        color: colorText,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    container.add([shadow, bg, accent, hitArea, text])
    const reset = (hovered: boolean) => {
      bg.setFillStyle(hovered ? 0xffedc8 : 0xf0dfbd, 0.98)
      container.setScale(1)
    }
    hitArea.on('pointerover', () => reset(true))
    hitArea.on('pointerout', () => reset(false))
    hitArea.on('pointerdown', () => {
      bg.setFillStyle(0xe4c895, 1)
      container.setScale(0.985)
    })
    hitArea.on('pointerup', () => {
      reset(true)
      container.emit('pointerup')
    })
    hitArea.on('pointerupoutside', () => reset(false))
    return container
  }
}
