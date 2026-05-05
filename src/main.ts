import Phaser from 'phaser'
import './style.css'
import { BootScene } from './scenes/BootScene'
import { GameScene } from './scenes/GameScene'
import { TitleScene } from './scenes/TitleScene'

const container = document.querySelector<HTMLDivElement>('#app')

if (!container) {
  throw new Error('Game container #app was not found.')
}

container.innerHTML = '<div id="game-root"></div>'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: 1280,
  height: 720,
  parent: 'game-root',
  backgroundColor: '#07111f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: true,
    pixelArt: false,
  },
  scene: [BootScene, TitleScene, GameScene],
}

const game = new Phaser.Game(config)

declare global {
  interface Window {
    __AOW_GAME__?: Phaser.Game
  }
}

window.__AOW_GAME__ = game
