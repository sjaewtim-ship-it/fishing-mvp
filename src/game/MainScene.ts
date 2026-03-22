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
    const bg = this.add.rectangle(375, 1085, 460, 68, 0x000000, 0.58)
      .setStrokeStyle(2, 0xffffff, 0.14);
    const text = this.add.text(375, 1085, message, {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0, [bg, text]);

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

    // 背景：天空 + 水域 + 底部浅色区
    this.add.rectangle(375, 667, 750, 1334, 0x8fd3ff);
    this.add.rectangle(375, 960, 750, 300, 0x1e88e5);
    this.add.rectangle(375, 1240, 750, 188, 0x8fd3ff);

    // 白云
    const cloud1 = this.add.text(110, 92, '☁️', { fontSize: '42px' }).setAlpha(0.88);
    const cloud2 = this.add.text(520, 118, '☁️ ☁️', { fontSize: '34px' }).setAlpha(0.82);
    const cloud3 = this.add.text(640, 72, '☁️', { fontSize: '30px' }).setAlpha(0.76);

    this.tweens.add({
      targets: cloud1,
      x: 560,
      duration: 18000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: cloud2,
      x: 140,
      duration: 22000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: cloud3,
      x: 260,
      duration: 15000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 标题
    this.add.text(375, 110, '🎣 钓鱼小游戏', {
      fontSize: '50px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(375, 165, '看准时机，一杆出货', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 信息模块（居中）
    this.add.rectangle(375, 350, 660, 230, 0x000000, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.14);

    // 第一行：金币 / 体力 / 已钓
    this.add.text(130, 295, '🪙', {
      fontSize: '30px',
      color: '#FFD54F',
    }).setOrigin(0.5);

    this.add.text(195, 295, `金币 ${coins}`, {
      fontSize: '26px',
      color: '#FFE082',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(355, 295, '⚡', {
      fontSize: '30px',
    }).setOrigin(0.5);

    this.add.text(420, 295, `体力 ${energy}/${maxEnergy}`, {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(595, 295, '🎯', {
      fontSize: '28px',
    }).setOrigin(0.5);

    this.add.text(645, 295, `已钓${roundCount}次`, {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // 分隔线
    this.add.line(375, 342, 95, 0, 655, 0, 0xffffff).setAlpha(0.12);

    // 第二行：最佳 / 最离谱
    this.add.text(130, 405, '⭐', {
      fontSize: '30px',
    }).setOrigin(0.5);

    this.add.text(195, 383, '今日最佳渔获', {
      fontSize: '20px',
      color: '#DFF6FF',
    }).setOrigin(0, 0.5);

    this.add.text(195, 420, bestCatch, {
      fontSize: '28px',
      color: '#FFE082',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add.text(400, 405, '🤯', {
      fontSize: '30px',
    }).setOrigin(0.5);

    this.add.text(465, 383, '今日最离谱战绩', {
      fontSize: '20px',
      color: '#DFF6FF',
    }).setOrigin(0, 0.5);

    this.add.text(465, 420, weirdCatch, {
      fontSize: '28px',
      color: '#FFD180',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // 按钮：缩小并放在信息块和水面之间
    const startBtn = this.add.rectangle(375, 560, 410, 102, 0xff5f5f)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.20);

    this.add.text(375, 560, '开始钓鱼', {
      fontSize: '36px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startBtn,
      scale: 1.04,
      duration: 850,
      yoyo: true,
      repeat: -1,
    });

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

    const adBtn = this.add.rectangle(375, 680, 410, 90, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.18);

    this.add.text(375, 680, '🎬 补充体力', {
      fontSize: '30px',
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

    // 水面下文案，紧挨着
    this.add.text(375, 748, '水下似乎有东西在游动…', {
      fontSize: '22px',
      color: '#EAF6FF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.95);

    // 水面波浪动效
    const wave1 = this.add.text(180, 790, '〰️〰️〰️', {
      fontSize: '28px',
      color: '#DFF6FF',
    }).setOrigin(0.5).setAlpha(0.85);

    const wave2 = this.add.text(560, 790, '〰️〰️〰️', {
      fontSize: '28px',
      color: '#DFF6FF',
    }).setOrigin(0.5).setAlpha(0.65);

    this.tweens.add({
      targets: wave1,
      x: 220,
      alpha: 0.55,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: wave2,
      x: 520,
      alpha: 0.85,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 水里生物：区域收缩，不再像鱼缸
    const fishA = this.add.text(120, 890, '🐟', { fontSize: '30px' }).setOrigin(0.5).setAlpha(0.95);
    const fishB = this.add.text(600, 950, '🐠', { fontSize: '28px' }).setOrigin(0.5).setAlpha(0.90);
    const fishC = this.add.text(220, 1035, '🐡', { fontSize: '34px' }).setOrigin(0.5).setAlpha(0.88);
    const crab = this.add.text(120, 1120, '🦀', { fontSize: '30px' }).setOrigin(0.5).setAlpha(0.95);
    const turtle = this.add.text(580, 1175, '🐢', { fontSize: '30px' }).setOrigin(0.5).setAlpha(0.92);
    const lobster = this.add.text(220, 1235, '🦞', { fontSize: '32px' }).setOrigin(0.5).setAlpha(0.95);

    const move = (obj: Phaser.GameObjects.Text, dist: number, speed: number, floatY = 12) => {
      this.tweens.add({
        targets: obj,
        x: obj.x + dist,
        duration: speed,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: obj,
        y: obj.y + floatY,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };

    move(fishA, 420, 5200, 14);
    move(fishB, -380, 6100, 10);
    move(fishC, 320, 6800, 16);
    move(crab, 360, 7600, 6);
    move(turtle, -280, 9200, 8);
    move(lobster, 360, 7000, 8);

    // 底部浅色区上的波浪装饰
    this.add.text(375, 1245, '🌊   🌊   🌊', {
      fontSize: '28px',
      color: '#DFF6FF',
    }).setOrigin(0.5).setAlpha(0.82);
  }
}
