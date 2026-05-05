import Phaser from 'phaser'
import { AGE_NAMES, DIFFICULTY_OPTIONS } from '../game/config'
import type { RegistryState } from '../game/state'
import { mergeSave } from '../game/save'

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
    const save = this.state.save
    const lastResult = this.state.lastResult
    let selectedDifficulty = save.difficulty

    this.add.rectangle(width / 2, height / 2, width, height, 0x142033, 1)
    this.drawBattlefieldBackdrop(width, height)

    const panel = this.add
      .rectangle(width / 2, 322, 800, 430, 0xf4ecd6, 0.96)
      .setStrokeStyle(4, 0x4f3720, 0.66)
    panel.setDepth(1)
    this.add
      .rectangle(width / 2, 322, 754, 386, 0xfff7df, 0.22)
      .setStrokeStyle(2, 0xc69a54, 0.5)
      .setDepth(2)
    this.add.rectangle(width / 2, 150, 360, 14, 0x33a8b8, 0.18).setStrokeStyle(2, 0x2d889a, 0.42).setDepth(3)

    this.add
      .text(width / 2, 132, 'CHRONO SIEGE', {
        fontFamily: 'Trebuchet MS',
        fontSize: '52px',
        color: '#2d2419',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(3)

    this.add
      .text(width / 2, 188, 'Send troops. Age up. Break the enemy core.', {
        fontFamily: 'Trebuchet MS',
        fontSize: '24px',
        color: '#326b72',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(3)

    const quickTips = ['Gold grows over time.', 'Kills pay bonus gold.', 'Age up to unlock stronger troops.']

    quickTips.forEach((tip, index) => {
      const y = 250 + index * 32
      this.add.circle(width / 2 - 174, y, 5, 0xc9933f, 1).setStrokeStyle(2, 0x4f3720, 0.35).setDepth(3)
      this.add
        .text(width / 2 - 154, y, tip, {
          fontFamily: 'Trebuchet MS',
          fontSize: '22px',
          color: '#2d2419',
        })
        .setOrigin(0, 0.5)
        .setDepth(3)
    })

    this.add
      .text(width / 2, 358, 'Enemy difficulty', {
        fontFamily: 'Trebuchet MS',
        fontSize: '16px',
        color: '#5f594d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(3)

    const summaryText = this.add
      .text(width / 2, 530, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '15px',
        color: '#f8f1df',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5)

    this.add
      .rectangle(width / 2, 530, 520, 34, 0x2b3f4a, 0.92)
      .setStrokeStyle(1, 0x78d5d8, 0.46)
      .setDepth(4)

    const activeDifficultyValue = this.add
      .text(width / 2 + 220, 600, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '23px',
        color: '#2d2419',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 190 },
      })
      .setOrigin(0.5)
      .setDepth(5)

    const refreshSummary = () => {
      const activeLabel = DIFFICULTY_OPTIONS.find((item) => item.id === selectedDifficulty)?.label ?? 'Normal'
      const summaryLabel = lastResult
        ? `${lastResult.result === 'victory' ? 'WIN' : 'LOSS'} / ${lastResult.score} / ${AGE_NAMES[lastResult.ageReached - 1]} / ${(lastResult.difficulty ?? selectedDifficulty).toUpperCase()}`
        : `No completed run yet / ${activeLabel} ready`
      summaryText.setText(summaryLabel)
      summaryText.setColor(lastResult ? (lastResult.result === 'victory' ? '#dffcf2' : '#ffd8ce') : '#f8f1df')
      activeDifficultyValue.setText(activeLabel)
    }

    const difficultyButtons = new Map<string, Phaser.GameObjects.Container>()
    const refreshDifficultyButtons = () => {
      difficultyButtons.forEach((button, id) => {
        const selected = id === selectedDifficulty
        const background = button.getData('background') as Phaser.GameObjects.Rectangle
        const title = button.getData('title') as Phaser.GameObjects.Text
        const detail = button.getData('detail') as Phaser.GameObjects.Text
        const accent = button.getData('accent') as Phaser.GameObjects.Rectangle
        background.setFillStyle(selected ? 0xf8e3b5 : 0xefe2c7, selected ? 1 : 0.94)
        background.setStrokeStyle(3, selected ? 0x2d9aaa : 0x8d7352, selected ? 0.86 : 0.42)
        accent.setFillStyle(selected ? 0x2d9aaa : 0xb9914c, selected ? 0.95 : 0.55)
        title.setColor(selected ? '#1f2f35' : '#59472f')
        detail.setColor(selected ? '#7f5a20' : '#7f735f')
      })
      refreshSummary()
    }

    DIFFICULTY_OPTIONS.forEach((option, index) => {
      const button = this.makeButton(width / 2 - 204 + index * 204, 404, 178, 62, option.label, option.note, 0x2d9aaa, true)
      const background = button.getData('background') as Phaser.GameObjects.Rectangle
      const accent = this.add.rectangle(0, -24, 136, 3, 0xb9914c, 0.55)
      const detail = button.getData('detail') as Phaser.GameObjects.Text
      button.addAt(accent, 3)
      button.setData('background', background)
      button.setData('accent', accent)
      button.setData('detail', detail)
      button.on('pointerup', () => {
        selectedDifficulty = option.id
        this.state.save = mergeSave({ difficulty: selectedDifficulty })
        this.state.audio.play('click')
        refreshDifficultyButtons()
      })
      difficultyButtons.set(option.id, button)
    })
    refreshDifficultyButtons()

    const startButton = this.makeButton(width / 2 - 44, 486, 308, 76, 'Start Battle', 'Press Enter', 0x2d9aaa)
    startButton.on('pointerup', () => {
      this.state.save = mergeSave({ difficulty: selectedDifficulty })
      this.state.audio.play('click')
      void this.state.audio.unlock()
      this.scene.start('game')
    })

    const muteButton = this.makeButton(
      width / 2 + 224,
      486,
      124,
      48,
      'Audio',
      save.muted ? 'Off' : 'On',
      0xb86e54,
      true,
    )
    muteButton.on('pointerup', () => {
      const nextMuted = !this.state.save.muted
      this.state.save = mergeSave({ muted: nextMuted })
      this.state.audio.setMuted(nextMuted)
      ;(muteButton.getData('detail') as Phaser.GameObjects.Text).setText(nextMuted ? 'Off' : 'On')
      if (!nextMuted) {
        this.state.audio.play('click')
      }
    })

    this.add
      .rectangle(width / 2, 600, 748, 116, 0xead7ae, 0.98)
      .setStrokeStyle(2, 0x6f5534, 0.55)
      .setDepth(3)

    const labels = [`${save.bestScore}`, `${AGE_NAMES[save.bestAgeReached - 1]}`, '']
    const statHeaders = ['BEST SCORE', 'TOP ERA', 'ACTIVE']

    labels.forEach((label, index) => {
      const x = width / 2 - 220 + index * 220
      this.add
        .text(x, 570, statHeaders[index], {
          fontFamily: 'Trebuchet MS',
          fontSize: '12px',
          color: '#6f6048',
          fontStyle: 'bold',
          letterSpacing: 1.2,
        })
        .setOrigin(0.5)
        .setDepth(5)
      if (index < 2) {
        this.add
          .text(x, 600, label, {
            fontFamily: 'Trebuchet MS',
            fontSize: '23px',
            color: '#2d2419',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 190 },
          })
          .setOrigin(0.5)
          .setDepth(5)
      }
    })

    this.add
      .text(width / 2, 646, 'Enter start / M audio', {
        fontFamily: 'Trebuchet MS',
        fontSize: '14px',
        color: '#6f6048',
      })
      .setOrigin(0.5)
      .setDepth(5)

    refreshSummary()

    this.bindKey('keydown-ENTER', () => startButton.emit('pointerup'))
    this.bindKey('keydown-M', () => muteButton.emit('pointerup'))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupScene())
  }

  private drawBattlefieldBackdrop(width: number, height: number) {
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x1d3446, 0x20394a, 0x0c1420, 0x0c1420, 1)
    bg.fillRect(0, 0, width, height)
    bg.fillStyle(0x96d8df, 0.16)
    bg.fillEllipse(width / 2, 96, 560, 128)
    bg.fillStyle(0xe7a857, 0.13)
    bg.fillEllipse(width / 2, height - 136, 760, 174)
    bg.fillStyle(0x111c2b, 1)
    bg.fillRect(0, height - 152, width, 152)
    bg.fillStyle(0x22384e, 0.92)
    for (let index = 0; index < 16; index += 1) {
      const blockHeight = 18 + (index % 4) * 12
      bg.fillRect(40 + index * 76, height - 152 - blockHeight, 54, blockHeight)
    }
    bg.lineStyle(3, 0x76cdd3, 0.3)
    bg.strokeLineShape(new Phaser.Geom.Line(0, height - 122, width, height - 122))
    bg.fillStyle(0x34b0bd, 0.2)
    bg.fillCircle(178, height - 98, 28)
    bg.fillStyle(0xc1804f, 0.18)
    bg.fillCircle(width - 178, height - 98, 28)
    bg.fillStyle(0xf0d093, 0.8)
    for (let index = 0; index < 5; index += 1) {
      bg.fillRect(348 + index * 120, height - 118, 32, 10)
    }
  }

  private makeButton(
    x: number,
    y: number,
    width: number,
    height: number,
    titleText: string,
    detailText: string,
    color: number,
    compact = false,
  ) {
    const container = this.add.container(x, y).setDepth(4)
    const shadow = this.add.rectangle(0, 7, width, height, 0x2b2014, compact ? 0.18 : 0.24)
    const hitArea = this.add.zone(0, 0, width + 10, height + 10).setInteractive({ cursor: 'pointer' })
    const background = this.add
      .rectangle(0, 0, width, height, compact ? 0xf0dfbd : 0x2d9aaa, compact ? 0.96 : 0.98)
      .setStrokeStyle(3, color, 0.9)
    const edge = this.add.rectangle(0, -height / 2 + 6, width - 20, 3, compact ? 0xb9914c : 0xffdd8f, 0.55)
    const title = this.add
      .text(0, compact ? -6 : -6, titleText, {
        fontFamily: 'Trebuchet MS',
        fontSize: compact ? '24px' : '32px',
        color: compact ? '#3d3020' : '#f8f1df',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const detail = this.add
      .text(0, compact ? 13 : 22, detailText, {
        fontFamily: 'Trebuchet MS',
        fontSize: compact ? '14px' : '16px',
        color: compact ? '#8a6a3d' : '#e5fbff',
      })
      .setOrigin(0.5)

    container.add([shadow, background, edge, hitArea, title, detail])
    container.setSize(width, height)
    container.setData('title', title)
    container.setData('detail', detail)
    container.setData('background', background)

    const resetVisuals = (hovered: boolean) => {
      background.setFillStyle(compact ? 0xf8eac9 : 0x33afbd, hovered ? 1 : compact ? 0.96 : 0.98)
      title.setScale(hovered ? 1.02 : 1)
      container.setScale(1)
    }

    hitArea.on('pointerover', () => {
      resetVisuals(true)
    })
    hitArea.on('pointerout', () => {
      resetVisuals(false)
    })
    hitArea.on('pointerdown', () => {
      background.setFillStyle(compact ? 0xe8d0a5 : 0x237e8d, 1)
      container.setScale(0.985)
    })
    hitArea.on('pointerup', () => {
      resetVisuals(true)
      container.emit('pointerup')
    })
    hitArea.on('pointerupoutside', () => {
      resetVisuals(false)
    })

    return container
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
