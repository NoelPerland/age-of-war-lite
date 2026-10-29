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

function createSheetTexture(
  scene: Phaser.Scene,
  key: string,
  sourceKey: string,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  width: number,
  height: number,
  backgroundHole?: [number, number],
  keepDetached = false,
) {
  const source = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement
  if (scene.textures.exists(key)) {
    scene.textures.remove(key)
  }
  const texture = scene.textures.createCanvas(key, width, height)
  if (!texture) {
    return
  }
  const context = texture.getContext()
  context.clearRect(0, 0, width, height)

  const scale = key.startsWith('base-') ? Math.min(width / sw, height / sh) : 0.66
  const dw = Math.round(sw * scale)
  const dh = Math.round(sh * scale)
  const dx = Math.round((width - dw) / 2)
  const dy = height - dh - 4
  context.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)

  // Remove only background connected to the border, preserving enclosed white armor.
  const image = context.getImageData(0, 0, width, height)
  const visited = new Uint8Array(width * height)
  const queue: number[] = []
  const visit = (pixel: number) => {
    if (visited[pixel]) return
    visited[pixel] = 1
    const index = pixel * 4
    const background = image.data[index + 3] === 0 ||
      (image.data[index] > 200 && image.data[index + 1] > 200 && image.data[index + 2] > 195)
    if (!background) return
    image.data[index + 3] = 0
    queue.push(pixel)
  }
  for (let x = 0; x < width; x += 1) { visit(x); visit((height - 1) * width + x) }
  for (let y = 0; y < height; y += 1) { visit(y * width); visit(y * width + width - 1) }
  if (backgroundHole) {
    const x = dx + Math.round((backgroundHole[0] - sx) * scale)
    const y = dy + Math.round((backgroundHole[1] - sy) * scale)
    visit(y * width + x)
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const pixel = queue[cursor]
    const x = pixel % width
    if (x > 0) visit(pixel - 1)
    if (x < width - 1) visit(pixel + 1)
    if (pixel >= width) visit(pixel - width)
    if (pixel < width * (height - 1)) visit(pixel + width)
  }
  if (backgroundHole && !keepDetached) {
    // Discard neighboring pose fragments that protrude into the design-board crop.
    visited.fill(0)
    let largest: number[] = []
    for (let start = 0; start < width * height; start += 1) {
      if (visited[start] || image.data[start * 4 + 3] < 40) continue
      const component = [start]
      visited[start] = 1
      for (let cursor = 0; cursor < component.length; cursor += 1) {
        const pixel = component[cursor]
        const x = pixel % width
        const neighbors = [pixel - width, pixel + width]
        if (x > 0) neighbors.push(pixel - 1)
        if (x < width - 1) neighbors.push(pixel + 1)
        for (const next of neighbors) {
          if (next < 0 || next >= width * height || visited[next] || image.data[next * 4 + 3] < 40) continue
          visited[next] = 1
          component.push(next)
        }
      }
      if (component.length > largest.length) largest = component
    }
    visited.fill(0)
    for (const pixel of largest) visited[pixel] = 1
    for (let pixel = 0; pixel < visited.length; pixel += 1) {
      if (!visited[pixel]) image.data[pixel * 4 + 3] = 0
    }
  }
  context.putImageData(image, 0, 0)
  texture.refresh()
}

function createGeneratedArtTextures(scene: Phaser.Scene) {
  // The source is a design board, not a uniform sprite grid. Each crop holds one pose.
  const poses: Record<string, [number, number, number, number][]> = {
    'player-club': [[38, 125, 124, 162], [156, 118, 138, 169], [280, 127, 140, 160]],
    'player-guard': [[430, 118, 101, 170], [532, 126, 116, 162], [650, 128, 168, 160]],
    'player-gunner': [[838, 132, 109, 156], [948, 132, 108, 156], [1058, 134, 168, 154]],
    'enemy-club': [[34, 450, 126, 166], [154, 440, 138, 176], [280, 460, 140, 156]],
    'enemy-guard': [[429, 444, 99, 172], [532, 448, 112, 168], [649, 454, 168, 162]],
    'enemy-gunner': [[836, 457, 109, 159], [946, 458, 108, 158], [1056, 458, 170, 158]],
  }
  const legGaps: Record<string, [number, number][]> = {
    'player-club': [[85, 265], [210, 265], [335, 265]],
    'player-guard': [[478, 270], [586, 270], [709, 270]],
    'player-gunner': [[890, 263], [999, 263], [1118, 263]],
    'enemy-club': [[84, 593], [210, 593], [335, 593]],
    'enemy-guard': [[478, 597], [585, 597], [708, 597]],
    'enemy-gunner': [[889, 595], [998, 595], [1116, 595]],
  }
  const archetypes: Record<string, string> = {
    scrapper: 'club', 'pulse-gunner': 'gunner', bulwark: 'guard',
    'arc-caster': 'gunner', raider: 'guard', 'siege-engine': 'gunner',
  }
  for (const side of ['player', 'enemy']) {
    for (const [id, archetype] of Object.entries(archetypes)) {
      poses[`${side}-${archetype}`].forEach((crop, index) => {
        const suffix = ['', '-walk', '-attack'][index]
        createSheetTexture(scene, `${side}-${id}${suffix}`, 'chrono-sprite-design', ...crop, UNIT_TEXTURE_WIDTH, UNIT_TEXTURE_HEIGHT, legGaps[`${side}-${archetype}`][index], archetype === 'gunner')
      })
    }
  }

  createSheetTexture(scene, 'base-player-age1-art', 'chrono-sprite-design', 30, 774, 248, 198, 178, 126)
  createSheetTexture(scene, 'base-player-age2-art', 'chrono-sprite-design', 344, 774, 250, 198, 178, 126)
  createSheetTexture(scene, 'base-player-age3-art', 'chrono-sprite-design', 836, 760, 340, 220, 190, 126)
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  preload() {
    this.load.setPath(`${import.meta.env.BASE_URL}assets/ui/`)
    this.load.image('chrono-sprite-design', 'chrono-siege-sprite-design.png')
    this.load.image('chrono-screen-design', 'chrono-siege-screen-design.png')
    this.load.image('chrono-screen-home', 'chrono-screen-home.png')
    this.load.image('chrono-screen-end', 'chrono-screen-end.png')
    this.load.image('chrono-title-16x9', 'chrono-title-16x9.png')
    this.load.image('chrono-victory-16x9', 'chrono-victory-16x9.png')
    this.load.image('chrono-battle-16x9', 'chrono-battle-16x9.png')
  }

  create() {
    const required = ['chrono-sprite-design', 'chrono-screen-design', 'chrono-screen-home', 'chrono-screen-end', 'chrono-title-16x9', 'chrono-victory-16x9', 'chrono-battle-16x9']
    if (required.some(key => !this.textures.exists(key))) {
      this.add.text(640, 310, 'Battle art could not load.\nCheck your connection, then retry.', { fontSize: '26px', color: '#fff3d0', align: 'center' }).setOrigin(0.5)
      this.add.text(640, 420, 'RETRY', { fontSize: '28px', backgroundColor: '#315a65', padding: { x: 30, y: 15 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => location.reload())
      return
    }
    for (const unit of UNIT_DEFS) {
      drawUnitTexture(this, `player-${unit.id}`, unit, 'player')
      drawUnitTexture(this, `enemy-${unit.id}`, unit, 'enemy')
    }

    createGeneratedArtTextures(this)

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
