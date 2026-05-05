import Phaser from 'phaser'
import {
  UNIT_DEFS,
  UNIT_TEXTURE_HEIGHT,
  UNIT_TEXTURE_WIDTH,
  type AttackKind,
  type Side,
  type UnitDefinition,
} from '../game/config'
import { AudioController } from '../game/audio'
import type { RegistryState } from '../game/state'
import { loadSave } from '../game/save'

function drawUnitTexture(scene: Phaser.Scene, key: string, unit: UnitDefinition, side: Side) {
  const graphics = scene.add.graphics()
  const bodyColor = side === 'player' ? unit.tint : 0xff7f72
  const lineColor = side === 'player' ? 0xe8fbff : 0xffeee8
  const supportColor = unit.age === 1 ? 0x8cb89a : unit.age === 2 ? 0xb7d8ff : 0xffd98c
  const panelColor = unit.age === 1 ? 0x2a3d35 : unit.age === 2 ? 0x22354f : 0x4f3322
  const facing = side === 'player' ? 1 : -1
  const anchorX = side === 'player' ? 14 : 68

  graphics.clear()
  graphics.lineStyle(3, lineColor, 0.94)
  graphics.fillStyle(panelColor, 0.92)

  switch (unit.id) {
    case 'scrapper':
      graphics.fillRoundedRect(22, 18, 34, 22, 6)
      graphics.strokeRoundedRect(22, 18, 34, 22, 6)
      graphics.fillStyle(bodyColor, 1)
      graphics.fillTriangle(anchorX, 14, anchorX + 22 * facing, 29, anchorX, 44)
      graphics.strokeTriangle(anchorX, 14, anchorX + 22 * facing, 29, anchorX, 44)
      graphics.fillRoundedRect(30, 21, 20, 16, 4)
      graphics.strokeRoundedRect(30, 21, 20, 16, 4)
      graphics.fillStyle(supportColor, 0.9)
      graphics.fillRect(side === 'player' ? 9 : 63, 18, 8, 22)
      graphics.fillRect(26, 42, 18, 4)
      break
    case 'pulse-gunner':
      graphics.fillRoundedRect(20, 20, 28, 16, 5)
      graphics.strokeRoundedRect(20, 20, 28, 16, 5)
      graphics.fillStyle(bodyColor, 1)
      graphics.fillRoundedRect(26, 18, 22, 20, 6)
      graphics.strokeRoundedRect(26, 18, 22, 20, 6)
      graphics.fillStyle(supportColor, 0.95)
      graphics.fillRect(side === 'player' ? 48 : 8, 23, 18, 7)
      graphics.lineStyle(2, lineColor, 0.78)
      graphics.strokeCircle(35, 28, 11)
      graphics.strokeLineShape(new Phaser.Geom.Line(33, 12, 39, 12))
      break
    case 'bulwark':
      graphics.fillRoundedRect(18, 16, 42, 26, 7)
      graphics.strokeRoundedRect(18, 16, 42, 26, 7)
      graphics.fillStyle(bodyColor, 1)
      graphics.fillRect(side === 'player' ? 12 : 58, 14, 12, 30)
      graphics.strokeRect(side === 'player' ? 12 : 58, 14, 12, 30)
      graphics.fillTriangle(anchorX + 4 * facing, 12, anchorX + 26 * facing, 29, anchorX + 4 * facing, 46)
      graphics.strokeTriangle(anchorX + 4 * facing, 12, anchorX + 26 * facing, 29, anchorX + 4 * facing, 46)
      graphics.fillStyle(supportColor, 0.9)
      graphics.fillRect(28, 11, 22, 5)
      graphics.fillRect(28, 42, 22, 5)
      break
    case 'arc-caster':
      graphics.fillRoundedRect(18, 18, 34, 18, 6)
      graphics.strokeRoundedRect(18, 18, 34, 18, 6)
      graphics.fillStyle(bodyColor, 1)
      graphics.fillRoundedRect(24, 16, 28, 22, 8)
      graphics.strokeRoundedRect(24, 16, 28, 22, 8)
      graphics.fillStyle(supportColor, 0.95)
      graphics.fillRect(side === 'player' ? 52 : 4, 20, 22, 6)
      graphics.fillCircle(side === 'player' ? 20 : 60, 14, 4)
      graphics.fillCircle(side === 'player' ? 20 : 60, 42, 4)
      graphics.lineStyle(2, supportColor, 0.85)
      graphics.strokeCircle(38, 28, 15)
      break
    case 'raider':
      graphics.fillStyle(bodyColor, 1)
      graphics.fillTriangle(18, 29, 36, 14, 36, 44)
      graphics.strokeTriangle(18, 29, 36, 14, 36, 44)
      graphics.fillTriangle(60, 29, 42, 14, 42, 44)
      graphics.strokeTriangle(60, 29, 42, 14, 42, 44)
      graphics.fillRoundedRect(26, 18, 26, 22, 7)
      graphics.strokeRoundedRect(26, 18, 26, 22, 7)
      graphics.fillStyle(supportColor, 0.94)
      graphics.fillRect(33, 9, 12, 5)
      graphics.fillCircle(side === 'player' ? 16 : 64, 29, 4)
      graphics.fillCircle(side === 'player' ? 22 : 58, 29, 3)
      break
    case 'siege-engine':
      graphics.fillRoundedRect(16, 18, 44, 20, 7)
      graphics.strokeRoundedRect(16, 18, 44, 20, 7)
      graphics.fillStyle(bodyColor, 1)
      graphics.fillRoundedRect(22, 15, 36, 26, 9)
      graphics.strokeRoundedRect(22, 15, 36, 26, 9)
      graphics.fillStyle(supportColor, 0.96)
      graphics.fillRect(side === 'player' ? 50 : 2, 22, 24, 7)
      graphics.fillRect(28, 10, 22, 4)
      graphics.fillCircle(side === 'player' ? 18 : 64, 17, 4)
      graphics.fillCircle(side === 'player' ? 18 : 64, 39, 4)
      graphics.lineStyle(2, supportColor, 0.86)
      graphics.strokeLineShape(new Phaser.Geom.Line(36, 8, 36, 2))
      graphics.strokeLineShape(new Phaser.Geom.Line(44, 8, 44, 2))
      break
  }

  if (unit.age === 1) {
    graphics.fillStyle(0x728277, 0.92)
    graphics.fillRect(side === 'player' ? 28 : 46, 8, 12, 5)
    graphics.fillRect(35, 44, 8, 4)
  } else if (unit.age === 2) {
    graphics.fillStyle(0xa8c2df, 0.92)
    graphics.fillRect(28, 6, 22, 5)
    graphics.fillRect(side === 'player' ? 11 : 63, 25, 7, 10)
    graphics.fillRect(side === 'player' ? 18 : 56, 14, 6, 28)
    graphics.fillRect(34, 18, 10, 20)
    graphics.fillTriangle(30, 28, 34, 22, 34, 34)
    graphics.fillTriangle(48, 28, 44, 22, 44, 34)
  } else {
    graphics.fillStyle(0xffd689, 0.94)
    graphics.fillRect(26, 5, 26, 5)
    graphics.fillTriangle(side === 'player' ? 15 : 67, 30, side === 'player' ? 4 : 78, 22, side === 'player' ? 4 : 78, 38)
    graphics.fillTriangle(side === 'player' ? 28 : 54, 10, side === 'player' ? 20 : 62, 2, side === 'player' ? 36 : 46, 10)
    graphics.fillRect(33, 44, 12, 5)
    graphics.fillRect(side === 'player' ? 12 : 64, 13, 6, 32)
    graphics.fillRect(30, 17, 18, 4)
    graphics.fillRect(36, 13, 6, 24)
    graphics.fillTriangle(33, 18, 39, 8, 45, 18)
    graphics.fillCircle(39, 29, 4)
  }

  graphics.generateTexture(key, UNIT_TEXTURE_WIDTH, UNIT_TEXTURE_HEIGHT)
  graphics.destroy()
}

function drawProjectileTexture(
  scene: Phaser.Scene,
  key: string,
  color: number,
  attackKind: AttackKind,
  heavy = false,
) {
  const graphics = scene.add.graphics()
  graphics.clear()
  graphics.lineStyle(2, 0xffffff, 0.9)
  graphics.fillStyle(color, 1)

  if (attackKind === 'melee') {
    graphics.fillCircle(8, 8, heavy ? 6 : 5)
    graphics.strokeCircle(8, 8, heavy ? 6 : 5)
  } else {
    graphics.fillTriangle(2, 8, 14, 2, 14, 14)
    graphics.strokeTriangle(2, 8, 14, 2, 14, 14)
    if (heavy) {
      graphics.fillStyle(0xffefc4, 0.9)
      graphics.fillCircle(5, 8, 2)
    }
  }

  graphics.generateTexture(key, 16, 16)
  graphics.destroy()
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create() {
    for (const unit of UNIT_DEFS) {
      drawUnitTexture(this, `player-${unit.id}`, unit, 'player')
      drawUnitTexture(this, `enemy-${unit.id}`, unit, 'enemy')
    }

    drawProjectileTexture(this, 'proj-player', 0x9efcff, 'melee')
    drawProjectileTexture(this, 'proj-enemy', 0xffb09d, 'melee')
    drawProjectileTexture(this, 'proj-ranged-player', 0xb9fbff, 'ranged')
    drawProjectileTexture(this, 'proj-ranged-enemy', 0xffc3b6, 'ranged')
    drawProjectileTexture(this, 'proj-heavy-player', 0xfff2a8, 'ranged', true)
    drawProjectileTexture(this, 'proj-heavy-enemy', 0xffc78b, 'ranged', true)

    const save = loadSave()
    const audio = new AudioController(save.muted)
    const state: RegistryState = { save, audio }
    this.registry.set('globalState', state)
    this.scene.start('title')
  }
}
