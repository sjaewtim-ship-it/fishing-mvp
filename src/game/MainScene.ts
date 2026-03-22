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

    // 背景
    this.cameras.main.setBackgroundColor('#6ec6ff');
    this.add.rectangle(375, 667, 750, 1334, 0x8fd3ff);
    this.add.rectangle(375, 980, 750, 520, 0x1e88e5);

    // 顶部信息卡
    const topCard = this.add.rectangle(375, 155, 650, 210, 0x000000, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.15);

    this.add.text(375, 72, `金币：${CoinManager.instance.getCoins()}`, {
      fontSize: '30px',
      color: '#fff6a9',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(
      375,
      110,
      `体力：${EnergyManager.instance.getEnergy()} / ${EnergyManager.instance.getMaxEnergy()}`,
      {
        fontSize: '24px',
        color: '#ffffff',
      }
    ).setOrigin(0.5);

    this.add.text(
      375,
      145,
      `今日已钓：${RoundManager.instance.getRoundCount()} 次`,
      {
        fontSize: '22px',
        color: '#eaf6ff',
      }
    ).setOrigin(0.5);

    this.add.text(
      375,
      185,
      `今日最佳鱼获：${RecordManager.instance.getBestCatch()}`,
      {
        fontSize: '22px',
        color: '#fff6a9',
      }
    ).setOrigin(0.5);

    this.add.text(
      375,
      220,
      `今日最离谱战绩：${RecordManager.instance.getWeirdCatch()}`,
      {
        fontSize: '22px',
        color: '#ffeaa7',
      }
    ).setOrigin(0.5);

    // 标题区
    const title = this.add.text(375, 385, '🎣 钓鱼小游戏', {
      fontSize: '54px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#1565c0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(375, 445, '轻度 · 上瘾 · 可传播', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(375, 490, '看准时机，拉杆出货', {
      fontSize: '20px',
      color: '#dff6ff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scale: 1.03,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // 开始按钮
    const startBtn = this.add.rectangle(375, 640, 360, 100, 0xff6b6b)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0xffffff, 0.18);

    this.add.text(375, 640, '开始钓鱼', {
      fontSize: '34px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    startBtn.on('pointerdown', () => {
      SimpleAudio.click();

      if (!EnergyManager.instance.hasEnergy()) {
        alert('体力不足，请先看广告继续钓');
        return;
      }

      EnergyManager.instance.costEnergy();
      SaveSync.save();
      this.scene.start('FishingScene');
    });

    // 广告按钮
    const adBtn = this.add.rectangle(375, 780, 390, 88, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(3, 0xffffff, 0.18);

    this.add.text(375, 780, '看广告继续钓（+3体力）', {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    adBtn.on('pointerdown', () => {
      SimpleAudio.click();
      AnalyticsManager.instance.onAdView('home');
      EnergyManager.instance.addEnergy(3);
      SaveSync.save();
      this.scene.restart();
    });

    // 重置按钮
    const resetBtn = this.add.rectangle(375, 910, 250, 68, 0x34495e)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff, 0.15);

    this.add.text(375, 910, '重置进度', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    resetBtn.on('pointerdown', () => {
      SimpleAudio.click();
      localStorage.clear();
      this.scene.restart();
    });

    // 底部轻装饰
    this.add.text(375, 1030, '🌊 🌊 🌊', {
      fontSize: '28px',
      color: '#dff6ff',
    }).setOrigin(0.5);
  }
}
