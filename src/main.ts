import Phaser from 'phaser';
import { MainScene } from './game/MainScene';
import { FishingScene } from './game/FishingScene';
import { ResultScene } from './game/ResultScene';
import { MobileHelper } from './game/MobileHelper';

MobileHelper.ensurePortraitOverlay();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 750,
    height: 1334,
  },
  scene: [MainScene, FishingScene, ResultScene],
};

new Phaser.Game(config);
