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

  private showToast(message: string) {
    const toastBg = this.add.rectangle(375, 1090, 430, 64, 0x000000, 0.55)
      .setStrokeStyle(2, 0xffffff, 0.14);
    const toastText = this.add.text(375, 1090, message, {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0, [toastBg, toastText]);

    this.tweens.add({
      targets: container,
      alpha: 0,
      y: -16,
      delay: 900,
      duration: 260,
      onComplete: () => container.destroy(),
    });
  }

  create() {
    SaveSync.load();

    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    const roundCount = RoundManager.instance.getRoundCount();
    const bestCatch = RecordManager.instance.getBestCatch();
    const weirdCatch = RecordManager.instance.getWeirdCatch();

    this.cameras.main.setBackgroundColor('#8FD3FF');

    // 背景
    this.add.rectangle(375, 667, 750, 1334, 0x8fd3ff);

    // 天空层
    this.add.rectangle(375, 230, 750, 460, 0x9fdbff);

    // 水域（在补充体力按钮之下）
    this.add.rectangle(375, 980, 750, 520, 0x1e88e5);
    this.add.rectangle(375, 760, 750, 6, 0xeafcff).setAlpha(0.9);

    // 顶部标题
    const title = this.add.text(375, 78, '🎣 钓鱼小游戏', {
      fontSize: '52px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(375, 132, '看准时机，一杆出货', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scale: 1.02,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    // 信息区大卡片
    this.add.rectangle(375, 335, 660, 300, 0x000000, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.14);

    // 第一行：金币 / 体力
    this.add.rectangle(235, 255, 250, 88, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.12);
    this.add.text(140, 255, '🪙', {
      fontSize: '32px',
    }).setOrigin(0.5);
    this.add.text(265, 239, '金币', {
      fontSize: '20px',
      color: '#DFF6FF',
    }).setOrigin(0.5);
    this.add.text(265, 272, `${coins}`, {
      fontSize: '30px',
      color: '#FFF3B0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.rectangle(515, 255, 250, 88, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.12);
    this.add.text(420, 255, '⚡', {
      fontSize: '32px',
    }).setOrigin(0.5);
    this.add.text(545, 239, '体力', {
      fontSize: '20px',
      color: '#DFF6FF',
    }).setOrigin(0.5);
    this.add.text(545, 272, `${energy} / ${maxEnergy}`, {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 第二行：今日已钓
    this.add.rectangle(375, 355, 530, 76, 0xffffff, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.10);
    this.add.text(155, 355, '🎯', {
      fontSize: '30px',
    }).setOrigin(0.5);
    this.add.text(275, 355, '今日已钓', {
      fontSize: '22px',
      color: '#EAF6FF',
    }).setOrigin(0.5);
    this.add.text(485, 355, `${roundCount} 次`, {
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 第三行：今日最佳鱼获
    this.add.rectangle(375, 435, 530, 76, 0xffffff, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.10);
    this.add.text(155, 435, '🏆', {
      fontSize: '30px',
    }).setOrigin(0.5);
    this.add.text(275, 435, '今日最佳鱼获', {
      fontSize: '22px',
      color: '#EAF6FF',
    }).setOrigin(0.5);
    this.add.text(485, 435, bestCatch, {
      fontSize: '26px',
      color: '#FFF3B0',
      fontStyle: 'bold',
      wordWrap: { width: 220 },
      align: 'center',
    }).setOrigin(0.5);

    // 第四行：今日最离谱战绩
    this.add.rectangle(375, 515, 530, 76, 0xffffff, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.10);
    this.add.text(155, 515, '🤣', {
      fontSize: '30px',
    }).setOrigin(0.5);
    this.add.text(275, 515, '今日最离谱战绩', {
      fontSize: '22px',
      color: '#EAF6FF',
    }).setOrigin(0.5);
    this.add.text(485, 515, weirdCatch, {
      fontSize: '26px',
      color: '#FFEAA7',
      fontStyle: 'bold',
      wordWrap: { width: 220 },
      align: 'center',
    }).setOrigin(0.5);

    // 开始钓鱼按钮
    const startBtn = this.add.rectangle(375, 640, 430, 112, 0xff6b6b)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.20);

    this.add.text(375, 640, '开始钓鱼', {
      fontSize: '38px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    startBtn.on('pointerdown', () => {
      SimpleAudio.click();

      if (!EnergyManager.instance.hasEnergy()) {
        this.showToast('体力不足，请先补充体力');
        return;
      }

      EnergyManager.instance.costEnergy();
      SaveSync.save();
      this.scene.start('FishingScene');
    });

    // 补充体力按钮（在水域上方）
    const adBtn = this.add.rectangle(375, 740, 450, 96, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.18);

    this.add.text(375, 740, '补充体力 🎬', {
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    adBtn.on('pointerdown', () => {
      SimpleAudio.click();

      const current = EnergyManager.instance.getEnergy();
      const max = EnergyManager.instance.getMaxEnergy();

      if (current >= max) {
        this.showToast('补充成功，体力已满！');
        return;
      }

      AnalyticsManager.instance.onAdView('home');
      EnergyManager.instance.addEnergy(3);
      SaveSync.save();

      if (EnergyManager.instance.getEnergy() >= max) {
        this.showToast('补充成功，体力已满！');
      } else {
        this.showToast('补充成功，体力+3');
      }

      this.scene.restart();
    });

    // 水域文字
    this.add.text(375, 820, '水下似乎有东西在游动…', {
      fontSize: '22px',
      color: '#DFF6FF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.95);

    // 自由游动的小鱼
    const fishA = this.add.text(120, 930, '🐟', { fontSize: '34px' }).setOrigin(0.5).setAlpha(0.95);
    const fishB = this.add.text(620, 1010, '🐠', { fontSize: '30px' }).setOrigin(0.5).setAlpha(0.9);
    const fishC = this.add.text(220, 1110, '🐡', { fontSize: '38px' }).setOrigin(0.5).setAlpha(0.9);
    const fishD = this.add.text(560, 1180, '🐟', { fontSize: '26px' }).setOrigin(0.5).setAlpha(0.85);

    this.tweens.add({
      targets: fishA,
      x: 610,
      y: 960,
      duration: 5200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: fishB,
      x: 160,
      y: 1040,
      duration: 6100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: fishC,
      x: 590,
      y: 1130,
      duration: 7000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: fishD,
      x: 180,
      y: 1215,
      duration: 5600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // 波纹装饰
    this.add.text(375, 1260, '🌊   🌊   🌊', {
      fontSize: '30px',
      color: '#DFF6FF',
    }).setOrigin(0.5).setAlpha(0.85);
  }
}
