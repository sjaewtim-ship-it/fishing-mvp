import Phaser from 'phaser';
import { MainScene } from './game/MainScene';
import { FishingScene } from './game/FishingScene';
import { ResultScene } from './game/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 750,
  height: 1334,
  backgroundColor: '#000000',
  scene: [MainScene, FishingScene, ResultScene],
};

new Phaser.Game(config);
