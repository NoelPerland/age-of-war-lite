import Phaser from 'phaser'
import type { RegistryState } from '../game/state'
import { mergeSave } from '../game/save'
import type { DifficultyId } from '../game/config'

export class TitleScene extends Phaser.Scene {
  private state!: RegistryState

  private keyBindings: Array<{ event: string; handler: () => void }> = []

  constructor() {
    super('title')
  }

  create() {
    this.state = this.registry.get('globalState') as RegistryState

    const width = this.scale.width
    const height = this.scale.height
    let selectedDifficulty = this.state.save.difficulty

    this.add.rectangle(width / 2, height / 2, width, height, 0x07111f, 1)
    this.add.image(width / 2, height / 2, 'chrono-title-16x9').setDisplaySize(width, height)

    const selectedOutline = this.add
      .rectangle(0, 0, 224, 58, 0x000000, 0)
      .setStrokeStyle(4, 0xffd45a, 0.95)
      .setDepth(4)

    const startBattle = () => {
      this.state.save = mergeSave({ difficulty: selectedDifficulty })
      this.state.audio.play('click')
      void this.state.audio.unlock()
      this.scene.start('game')
    }

    const setDifficulty = (difficulty: DifficultyId, x: number, width: number) => {
      selectedDifficulty = difficulty
      this.state.save = mergeSave({ difficulty })
      this.state.audio.play('click')
      selectedOutline.setPosition(x, 574).setSize(width, 58)
    }

    const difficultyPositions: Record<DifficultyId, { x: number; width: number }> = {
      easy: { x: 380, width: 220 },
      normal: { x: 640, width: 224 },
      hard: { x: 900, width: 220 },
    }
    const active = difficultyPositions[selectedDifficulty] ?? difficultyPositions.normal
    selectedOutline.setPosition(active.x, 574).setSize(active.width, 58)

    this.makeHitZone(width / 2, 486, 440, 86, startBattle)
    this.makeHitZone(380, 574, 220, 58, () => setDifficulty('easy', 380, 220))
    this.makeHitZone(640, 574, 224, 58, () => setDifficulty('normal', 640, 224))
    this.makeHitZone(900, 574, 220, 58, () => setDifficulty('hard', 900, 220))
    this.makeHitZone(1086, 660, 146, 48, () => {
      const nextMuted = !this.state.save.muted
      this.state.save = mergeSave({ muted: nextMuted })
      this.state.audio.setMuted(nextMuted)
      if (!nextMuted) {
        this.state.audio.play('click')
      }
    })

    this.bindKey('keydown-ENTER', startBattle)
    this.bindKey('keydown-M', () => {
      const nextMuted = !this.state.save.muted
      this.state.save = mergeSave({ muted: nextMuted })
      this.state.audio.setMuted(nextMuted)
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupScene())
  }

  private makeHitZone(x: number, y: number, width: number, height: number, handler: () => void) {
    const zone = this.add.zone(x, y, width, height).setInteractive({ cursor: 'pointer' }).setDepth(5)
    zone.on('pointerup', handler)
    return zone
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
  }
}
