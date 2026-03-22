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
    const bg = this.add.rectangle(375, 1100, 460, 70, 0x000000, 0.6);
    const text = this.add.text(375, 1100, message, {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0, [bg, text]);

    this.tweens.add({
      targets: container,
      alpha: 0,
      y: -20,
      delay: 900,
      duration: 300,
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
    this.add.rectangle(375, 1040, 750, 450, 0x1e88e5);

    // 水面（动态）
    const waterLine = this.add.rectangle(375, 800, 750, 6, 0xffffff).setAlpha(0.9);

    this.tweens.add({
      targets: waterLine,
      alpha: 0.6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    // 标题
    this.add.text(375, 90, '🎣 钓鱼小游戏', {
      fontSize: '52px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(375, 150, '看准时机，一杆出货', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 信息卡（优化版）
    this.add.rectangle(375, 360, 660, 320, 0x000000, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.15);

    // 金币
    this.add.text(140, 260, '🪙', { fontSize: '32px' });
    this.add.text(240, 245, '金币', { fontSize: '20px', color: '#EAF6FF' });
    this.add.text(240, 280, `${coins}`, {
      fontSize: '32px',
      color: '#FFE082',
      fontStyle: 'bold',
    });

    // 体力
    this.add.text(420, 260, '⚡', { fontSize: '32px' });
    this.add.text(520, 245, '体力', { fontSize: '20px', color: '#EAF6FF' });
    this.add.text(520, 280, `${energy}/${maxEnergy}`, {
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });

    // 分割线
    this.add.line(375, 320, 120, 0, 630, 0, 0xffffff).setAlpha(0.12);

    // 今日数据
    this.add.text(140, 360, '🎯', { fontSize: '28px' });
    this.add.text(240, 360, '今日已钓', { fontSize: '22px', color: '#EAF6FF' });
    this.add.text(520, 360, `${roundCount} 次`, {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });

    this.add.text(140, 440, '⭐', { fontSize: '28px' });
    this.add.text(240, 440, '今日最佳鱼获', { fontSize: '22px', color: '#EAF6FF' });
    this.add.text(520, 440, bestCatch, {
      fontSize: '26px',
      color: '#FFE082',
      fontStyle: 'bold',
    });

    this.add.text(140, 520, '🤯', { fontSize: '28px' });
    this.add.text(240, 520, '今日最离谱战绩', { fontSize: '22px', color: '#EAF6FF' });
    this.add.text(520, 520, weirdCatch, {
      fontSize: '26px',
      color: '#FFD180',
      fontStyle: 'bold',
    });

    // 主按钮（强化）
    const startBtn = this.add.rectangle(375, 650, 460, 120, 0xff5252)
      .setInteractive();

    this.add.text(375, 650, '开始钓鱼', {
      fontSize: '40px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startBtn,
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    startBtn.on('pointerdown', () => {
      if (!EnergyManager.instance.hasEnergy()) {
        this.showToast('体力不足');
        return;
      }
      EnergyManager.instance.costEnergy();
      SaveSync.save();
      this.scene.start('FishingScene');
    });

    // 广告按钮
    const adBtn = this.add.rectangle(375, 780, 460, 100, 0x9b59b6)
      .setInteractive();

    this.add.text(375, 780, '🎬 补充体力', {
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    adBtn.on('pointerdown', () => {
      const current = EnergyManager.instance.getEnergy();
      const max = EnergyManager.instance.getMaxEnergy();

      if (current >= max) {
        this.showToast('体力已满');
        return;
      }

      EnergyManager.instance.addEnergy(3);
      SaveSync.save();

      this.showToast('体力+3');
      this.scene.restart();
    });

    // 提示
    this.add.text(375, 850, '水下似乎有东西在游动…', {
      fontSize: '22px',
      color: '#EAF6FF',
    }).setOrigin(0.5);

    // 鱼动画
    const fish = ['🐟','🐠','🐡','🐟'];

    fish.forEach((f, i) => {
      const x = 100 + i * 150;
      const y = 920 + i * 60;

      const fishObj = this.add.text(x, y, f, {
        fontSize: `${28 + i * 4}px`,
      });

      this.tweens.add({
        targets: fishObj,
        x: x + 400,
        duration: 5000 + i * 800,
        yoyo: true,
        repeat: -1,
      });

      this.tweens.add({
        targets: fishObj,
        y: y + 20,
        duration: 1200,
        yoyo: true,
        repeat: -1,
      });
    });
  }
}
