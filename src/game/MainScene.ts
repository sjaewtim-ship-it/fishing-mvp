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
    const toastBg = this.add.rectangle(375, 1105, 460, 68, 0x000000, 0.58)
      .setStrokeStyle(2, 0xffffff, 0.14);
    const toastText = this.add.text(375, 1105, message, {
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
    this.add.rectangle(375, 1040, 750, 470, 0x1e88e5);

    // 标题区
    const title = this.add.text(375, 92, '🎣 钓鱼小游戏', {
      fontSize: '52px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(375, 148, '看准时机，一杆出货', {
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

    // 统一信息模块
    const panelX = 375;
    const panelY = 385;
    const panelW = 660;
    const panelH = 340;

    this.add.rectangle(panelX, panelY, panelW, panelH, 0x000000, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.14);

    // 顶部两块：金币 / 体力
    this.add.rectangle(235, 275, 250, 92, 0xffffff, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.10);
    this.add.rectangle(515, 275, 250, 92, 0xffffff, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.10);

    // 金币块
    this.add.text(145, 275, '🪙', {
      fontSize: '34px',
      color: '#FFD54F',
    }).setOrigin(0.5);

    this.add.text(260, 255, '金币', {
      fontSize: '20px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(260, 292, `${coins}`, {
      fontSize: '32px',
      color: '#FFE082',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 体力块
    this.add.text(425, 275, '⚡', {
      fontSize: '34px',
    }).setOrigin(0.5);

    this.add.text(540, 255, '体力', {
      fontSize: '20px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(540, 292, `${energy} / ${maxEnergy}`, {
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 中间分隔线
    this.add.line(375, 335, 110, 0, 640, 0, 0xffffff).setAlpha(0.12);
    this.add.line(375, 418, 110, 0, 640, 0, 0xffffff).setAlpha(0.10);
    this.add.line(375, 500, 110, 0, 640, 0, 0xffffff).setAlpha(0.10);

    // 今日已钓
    this.add.text(145, 378, '🎯', { fontSize: '28px' }).setOrigin(0.5);
    this.add.text(255, 378, '今日已钓', {
      fontSize: '22px',
      color: '#EAF6FF',
    }).setOrigin(0.5);
    this.add.text(520, 378, `${roundCount} 次`, {
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 今日最佳鱼获
    this.add.text(145, 460, '⭐', { fontSize: '28px' }).setOrigin(0.5);
    this.add.text(255, 460, '今日最佳鱼获', {
      fontSize: '22px',
      color: '#EAF6FF',
    }).setOrigin(0.5);
    this.add.text(520, 460, bestCatch, {
      fontSize: '26px',
      color: '#FFE082',
      fontStyle: 'bold',
      wordWrap: { width: 220 },
      align: 'center',
    }).setOrigin(0.5);

    // 今日最离谱战绩
    this.add.text(145, 542, '🤯', { fontSize: '28px' }).setOrigin(0.5);
    this.add.text(255, 542, '今日最离谱战绩', {
      fontSize: '22px',
      color: '#EAF6FF',
    }).setOrigin(0.5);
    this.add.text(520, 542, weirdCatch, {
      fontSize: '26px',
      color: '#FFD180',
      fontStyle: 'bold',
      wordWrap: { width: 220 },
      align: 'center',
    }).setOrigin(0.5);

    // 主按钮：开始钓鱼
    const startBtn = this.add.rectangle(375, 660, 460, 118, 0xff6b6b)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.20);

    this.add.text(375, 660, '开始钓鱼', {
      fontSize: '40px',
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

    // 水域提示文案
    this.add.text(375, 815, '水下似乎有东西在游动…', {
      fontSize: '22px',
      color: '#DFF6FF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.95);

    // 补充体力按钮：压在水面区域上
    const adBtn = this.add.rectangle(375, 865, 450, 96, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.18);

    this.add.text(375, 865, '🎬 补充体力', {
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

    // 水里生物：鱼
    const fishA = this.add.text(110, 980, '🐟', { fontSize: '32px' }).setOrigin(0.5).setAlpha(0.95);
    const fishB = this.add.text(600, 1060, '🐠', { fontSize: '30px' }).setOrigin(0.5).setAlpha(0.90);
    const fishC = this.add.text(210, 1180, '🐡', { fontSize: '38px' }).setOrigin(0.5).setAlpha(0.90);

    // 水里生物：螃蟹 / 乌龟 / 龙虾
    const crab = this.add.text(130, 1260, '🦀', { fontSize: '34px' }).setOrigin(0.5).setAlpha(0.95);
    const turtle = this.add.text(590, 1330, '🐢', { fontSize: '34px' }).setOrigin(0.5).setAlpha(0.95);
    const lobster = this.add.text(180, 1400, '🦞', { fontSize: '36px' }).setOrigin(0.5).setAlpha(0.95);

    // 鱼：左右 + 轻微上下浮动
    this.tweens.add({
      targets: fishA,
      x: 620,
      duration: 5200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: fishA,
      y: '+=18',
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: fishB,
      x: 150,
      duration: 6100,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: fishB,
      y: '+=14',
      duration: 1400,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    this.tweens.add({
      targets: fishC,
      x: 590,
      duration: 7000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: fishC,
      y: '+=20',
      duration: 1600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // 螃蟹：横向爬行
    this.tweens.add({
      targets: crab,
      x: 610,
      duration: 7600,
      ease: 'Linear',
      yoyo: true,
      repeat: -1,
    });

    // 乌龟：慢速稳定移动
    this.tweens.add({
      targets: turtle,
      x: 180,
      duration: 9200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: turtle,
      y: '+=10',
      duration: 1800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // 龙虾：略快的水平移动
    this.tweens.add({
      targets: lobster,
      x: 610,
      duration: 6800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: lobster,
      y: '+=8',
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // 底部波纹装饰
    this.add.text(375, 1268, '🌊   🌊   🌊', {
      fontSize: '30px',
      color: '#DFF6FF',
    }).setOrigin(0.5).setAlpha(0.85);
  }
}
