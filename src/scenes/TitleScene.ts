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
    this.add.image(width / 2, height / 2, 'chrono-screen-home').setDisplaySize(width, height)

    const selectedOutline = this.add
      .rectangle(0, 0, 164, 42, 0x000000, 0)
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
      selectedOutline.setPosition(x, 590).setSize(width, 42)
    }

    const difficultyPositions: Record<DifficultyId, { x: number; width: number }> = {
      easy: { x: 244, width: 148 },
      normal: { x: 513, width: 172 },
      hard: { x: 781, width: 148 },
    }
    const active = difficultyPositions[selectedDifficulty] ?? difficultyPositions.normal
    selectedOutline.setPosition(active.x, 590).setSize(active.width, 42)

    this.makeHitZone(width / 2, 500, 330, 70, startBattle)
    this.makeHitZone(244, 590, 148, 42, () => setDifficulty('easy', 244, 148))
    this.makeHitZone(513, 590, 172, 42, () => setDifficulty('normal', 513, 172))
    this.makeHitZone(781, 590, 148, 42, () => setDifficulty('hard', 781, 148))
    this.makeHitZone(930, 500, 120, 54, () => {
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
