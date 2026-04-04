import Phaser from 'phaser';
import { MainScene } from './game/MainScene';
import { HomeSceneV2 } from './game/HomeSceneV2';
import { FishingScene } from './game/FishingScene';
import { ResultScene } from './game/ResultScene';
import { CollectionScene } from './game/scenes/CollectionScene';
import { TaskScene } from './game/scenes/TaskScene';
import { WeChatHelper } from './game/WeChatHelper';
import { SaveSync } from './game/SaveSync';

// ==================================================
// 首页切换开关：设为 true 使用新版横版首页
// ==================================================
const USE_HOME_SCENE_V2 = false;

WeChatHelper.setup();
SaveSync.load();

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
  scene: USE_HOME_SCENE_V2
    ? [HomeSceneV2, FishingScene, ResultScene, CollectionScene, TaskScene]
    : [MainScene, FishingScene, ResultScene, CollectionScene, TaskScene],
};

new Phaser.Game(config);
