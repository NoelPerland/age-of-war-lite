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

    this.add.rectangle(width / 2, height / 2, width, height, 0x050913, 1)

    const glow = this.add.graphics()
    glow.fillStyle(0x2f7f9a, 0.08)
    glow.fillEllipse(width / 2, 124, 560, 152)
    glow.fillStyle(0x8a5e4e, 0.06)
    glow.fillEllipse(width / 2, height - 116, 640, 170)
    glow.fillStyle(0x0d1524, 1)
    glow.fillRect(0, height - 150, width, 150)
    glow.fillStyle(0x152238, 0.95)
    for (let index = 0; index < 16; index += 1) {
      const blockHeight = 18 + (index % 4) * 12
      glow.fillRect(40 + index * 76, height - 150 - blockHeight, 54, blockHeight)
    }
    glow.lineStyle(2, 0x3e6475, 0.35)
    glow.strokeLineShape(new Phaser.Geom.Line(0, height - 118, width, height - 118))

    this.add.rectangle(width / 2, height / 2, width * 0.9, height * 0.82, 0x071121, 0.94).setStrokeStyle(
      2,
      0x4ca8c0,
      0.22,
    )

    this.add
      .text(width / 2, 118, 'AGE OF WAR-LITE', {
        fontFamily: 'Trebuchet MS',
        fontSize: '56px',
        color: '#efffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, 172, 'Retro-future lane war. Build pressure, tech up, break the enemy core.', {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: '#8fd7ea',
        align: 'center',
      })
      .setOrigin(0.5)

    const quickTips = [
      'Gold climbs on its own.',
      'Kills pay bonus gold.',
      'Age up for stronger units.',
    ]

    quickTips.forEach((tip, index) => {
      const y = 238 + index * 32
      this.add.circle(width / 2 - 148, y, 4, 0x8ef7ff, 1)
      this.add
        .text(width / 2 - 128, y, tip, {
          fontFamily: 'Trebuchet MS',
          fontSize: '23px',
          color: '#dff7ff',
        })
        .setOrigin(0, 0.5)
    })

    this.add
      .text(width / 2, 346, 'Enemy difficulty', {
        fontFamily: 'Trebuchet MS',
        fontSize: '16px',
        color: '#a7c3cd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .rectangle(width / 2, 530, 508, 34, 0x132338, 0.94)
      .setStrokeStyle(1, 0x89aab6, 0.34)
      .setDepth(2)

    const summaryText = this.add
      .text(width / 2, 530, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '15px',
        color: '#dfeaf0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(3)

    const activeDifficultyValue = this.add
      .text(width / 2 + 220, 600, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '23px',
        color: '#e6f0f5',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 190 },
      })
      .setOrigin(0.5)

    const refreshSummary = () => {
      const activeLabel = DIFFICULTY_OPTIONS.find((item) => item.id === selectedDifficulty)?.label ?? 'Normal'
      const summaryLabel = lastResult
        ? `${lastResult.result === 'victory' ? 'WIN' : 'LOSS'} • ${lastResult.score} • ${AGE_NAMES[lastResult.ageReached - 1]} • ${(lastResult.difficulty ?? selectedDifficulty).toUpperCase()}`
        : `No completed run yet • ${activeLabel} ready`
      summaryText.setText(summaryLabel)
      summaryText.setColor(lastResult ? (lastResult.result === 'victory' ? '#cbfff4' : '#ffd8ce') : '#d4e0e6')
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
        background.setFillStyle(selected ? 0x1d3344 : 0x0f1b2a, selected ? 0.98 : 0.9)
        background.setStrokeStyle(2, selected ? 0x8ef7ff : 0x6f8b96, selected ? 0.78 : 0.28)
        accent.setFillStyle(selected ? 0xffd79a : 0x56717d, selected ? 0.92 : 0.4)
        title.setColor(selected ? '#f4ffff' : '#c3d3da')
        detail.setColor(selected ? '#fff0bf' : '#89a4ae')
      })
      refreshSummary()
    }

    DIFFICULTY_OPTIONS.forEach((option, index) => {
      const button = this.makeButton(width / 2 - 204 + index * 204, 390, 178, 62, option.label, option.note, 0x355872, true)
      const background = button.list[1] as Phaser.GameObjects.Rectangle
      const accent = this.add.rectangle(0, -24, 136, 2, 0x56717d, 0.4)
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

    const startButton = this.makeButton(width / 2 - 44, 474, 308, 82, 'Start Match', 'Press Enter', 0x3aa4bc)
    startButton.on('pointerup', () => {
      this.state.save = mergeSave({ difficulty: selectedDifficulty })
      this.state.audio.play('click')
      void this.state.audio.unlock()
      this.scene.start('game')
    })

    const muteButton = this.makeButton(
      width / 2 + 224,
      474,
      124,
      48,
      'Audio',
      save.muted ? 'Off' : 'On',
      0xa16354,
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

    const statsPanel = this.add
      .rectangle(width / 2, 600, 748, 116, 0x132542, 0.985)
      .setStrokeStyle(1, 0xa4c0ca, 0.52)
    statsPanel.setDepth(1)

    const labels = [
      `${save.bestScore}`,
      `${AGE_NAMES[save.bestAgeReached - 1]}`,
      '',
    ]

    const statHeaders = ['BEST SCORE', 'TOP AGE', 'ACTIVE']
    labels.forEach((label, index) => {
      const x = width / 2 - 220 + index * 220
      this.add
        .text(x, 570, statHeaders[index], {
          fontFamily: 'Trebuchet MS',
          fontSize: '12px',
          color: '#afc8d1',
          fontStyle: 'bold',
          letterSpacing: 1.2,
        })
        .setOrigin(0.5)
        .setDepth(3)
      if (index < 2) {
        this.add
          .text(x, 600, label, {
            fontFamily: 'Trebuchet MS',
            fontSize: '23px',
            color: '#eef6fa',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 190 },
          })
          .setOrigin(0.5)
          .setDepth(3)
      }
    })

    activeDifficultyValue.setDepth(3)

    this.add
      .text(width / 2, 646, 'Enter to start • M audio', {
        fontFamily: 'Trebuchet MS',
        fontSize: '14px',
        color: '#a9c2cb',
      })
      .setOrigin(0.5)
      .setDepth(3)

    refreshSummary()

    this.bindKey('keydown-ENTER', () => startButton.emit('pointerup'))
    this.bindKey('keydown-M', () => muteButton.emit('pointerup'))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupScene())
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
    const container = this.add.container(x, y)
    const shadow = this.add.rectangle(0, 7, width, height, 0x000000, compact ? 0.18 : 0.24)
    const hitArea = this.add.zone(0, 0, width + 10, height + 10).setInteractive({ cursor: 'pointer' })
    const background = this.add
      .rectangle(0, 0, width, height, color, compact ? 0.12 : 0.18)
      .setStrokeStyle(2, color, 0.9)
    const edge = this.add.rectangle(0, -height / 2 + 6, width - 20, 2, 0xffffff, compact ? 0.12 : 0.18)
    const title = this.add
      .text(0, compact ? -6 : -6, titleText, {
        fontFamily: 'Trebuchet MS',
        fontSize: compact ? '24px' : '32px',
        color: '#f5ffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    const detail = this.add
      .text(0, compact ? 13 : 22, detailText, {
        fontFamily: 'Trebuchet MS',
        fontSize: compact ? '14px' : '16px',
        color: compact ? '#ffc7bd' : '#8fefff',
      })
      .setOrigin(0.5)

    container.add([shadow, background, edge, hitArea, title, detail])
    container.setSize(width, height)
    container.setData('title', title)
    container.setData('detail', detail)

    const resetVisuals = (hovered: boolean) => {
      background.setFillStyle(color, hovered ? (compact ? 0.2 : 0.28) : compact ? 0.12 : 0.18)
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
      background.setFillStyle(color, compact ? 0.28 : 0.36)
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
