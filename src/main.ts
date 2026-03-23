import Phaser from 'phaser';
import { MainScene } from './game/MainScene';
import { FishingScene } from './game/FishingScene';
import { ResultScene } from './game/ResultScene';
import { GoalScene } from './game/GoalScene';
import { WeChatHelper } from './game/WeChatHelper';

WeChatHelper.setup();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#8fd3ff',
  input: {
    activePointers: 3,
    touch: {
      capture: true,
    },
  },
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 750,
    height: 1334,
  },
  scene: [MainScene, FishingScene, ResultScene, GoalScene],
};

new Phaser.Game(config);
