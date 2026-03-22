import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { RecordManager } from './RecordManager';
import { RoundManager } from './RoundManager';
import { CoinManager } from './CoinManager';
import { SaveSync } from './SaveSync';
import { AnalyticsManager } from './AnalyticsManager';
import { SimpleAudio } from './SimpleAudio';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  create() {
    SaveSync.load();

    this.cameras.main.setBackgroundColor('#8FD3FF');
    this.add.rectangle(375, 667, 750, 1334, 0x8fd3ff);
    this.add.rectangle(375, 995, 750, 510, 0x1e88e5);

    this.add.rectangle(375, 165, 660, 220, 0x000000, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.12);

    this.add.text(375, 72, `金币：${CoinManager.instance.getCoins()}`, {
      fontSize: '32px',
      color: '#FFF3B0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(375, 115, `体力：${EnergyManager.instance.getEnergy()} / ${EnergyManager.instance.getMaxEnergy()}`, {
      fontSize: '26px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    this.add.text(375, 155, `今日已钓：${RoundManager.instance.getRoundCount()} 次`, {
      fontSize: '24px',
      color: '#EAF6FF',
    }).setOrigin(0.5);

    this.add.text(375, 198, `今日最佳鱼获：${RecordManager.instance.getBestCatch()}`, {
      fontSize: '24px',
      color: '#FFF3B0',
    }).setOrigin(0.5);

    this.add.text(375, 238, `今日最离谱战绩：${RecordManager.instance.getWeirdCatch()}`, {
      fontSize: '24px',
      color: '#FFEAA7',
    }).setOrigin(0.5);

    const title = this.add.text(375, 390, '🎣 钓鱼小游戏', {
      fontSize: '58px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(375, 452, '看准时机，一杆出货', {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(375, 495, '钓正经鱼，也钓离谱好东西', {
      fontSize: '22px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scale: 1.03,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    const startBtn = this.add.rectangle(375, 655, 430, 116, 0xff6b6b)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.18);

    this.add.text(375, 655, '开始钓鱼', {
      fontSize: '38px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    startBtn.on('pointerdown', () => {
      SimpleAudio.click();

      if (!EnergyManager.instance.hasEnergy()) {
        alert('体力不足，先补充体力再继续钓鱼');
        return;
      }

      EnergyManager.instance.costEnergy();
      SaveSync.save();
      this.scene.start('FishingScene');
    });

    const adBtn = this.add.rectangle(375, 815, 450, 100, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.18);

    this.add.text(375, 815, '看广告继续钓（+3体力）', {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    adBtn.on('pointerdown', () => {
      SimpleAudio.click();
      AnalyticsManager.instance.onAdView('home');
      EnergyManager.instance.addEnergy(3);
      SaveSync.save();
      this.scene.restart();
    });

    this.add.text(375, 1010, '🌊 🌊 🌊', {
      fontSize: '30px',
      color: '#DFF6FF',
    }).setOrigin(0.5);
  }
}
