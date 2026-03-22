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
    this.add.rectangle(375, 1040, 750, 470, 0x1e88e5);

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
    }).setOrigin(0.5);

    // 信息模块
    this.add.rectangle(375, 380, 660, 330, 0x000000, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.15);

    // 金币
    this.add.text(160, 270, '🪙', { fontSize: '32px' });
    this.add.text(260, 255, '金币', { fontSize: '20px', color: '#EAF6FF' });
    this.add.text(260, 290, `${coins}`, {
      fontSize: '34px',
      color: '#FFD54F',
      fontStyle: 'bold',
    });

    // 体力
    this.add.text(420, 270, '⚡', { fontSize: '32px' });
    this.add.text(520, 255, '体力', { fontSize: '20px', color: '#EAF6FF' });
    this.add.text(520, 290, `${energy}/${maxEnergy}`, {
      fontSize: '34px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });

    // 分割线
    this.add.line(375, 320, 120, 0, 630, 0, 0xffffff).setAlpha(0.12);

    const startY = 360;
    const gap = 80;

    const renderRow = (y: number, icon: string, label: string, value: string, color: string) => {
      this.add.text(160, y, icon, { fontSize: '28px' });
      this.add.text(260, y, label, {
        fontSize: '22px',
        color: '#EAF6FF',
      });
      this.add.text(620, y, value, {
        fontSize: '26px',
        color: color,
        fontStyle: 'bold',
      }).setOrigin(1, 0);
    };

    renderRow(startY, '🎯', '今日已钓', `${roundCount}次`, '#FFFFFF');
    renderRow(startY + gap, '⭐', '今日最佳鱼获', bestCatch, '#FFE082');
    renderRow(startY + gap * 2, '🤯', '今日最离谱战绩', weirdCatch, '#FFD180');

    // 主按钮
    const startBtn = this.add.rectangle(375, 650, 460, 120, 0xff5252)
      .setInteractive();

    this.add.text(375, 650, '开始钓鱼', {
      fontSize: '40px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startBtn,
      scale: 1.06,
      duration: 700,
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

    // 文案（提前，不遮挡）
    this.add.text(375, 720, '水下似乎有东西在游动…', {
      fontSize: '22px',
      color: '#EAF6FF',
    }).setOrigin(0.5);

    // 广告按钮（下移）
    const adBtn = this.add.rectangle(375, 860, 460, 100, 0x9b59b6)
      .setInteractive();

    this.add.text(375, 860, '🎬 补充体力', {
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

    // 水下层次
    const objs = ['🐟','🐠','🐡','🦀','🐢','🦞'];

    objs.forEach((o, i) => {
      const obj = this.add.text(120 + i * 90, 950 + i * 70, o, {
        fontSize: `${26 + i * 2}px`,
      });

      this.tweens.add({
        targets: obj,
        x: obj.x + 400,
        duration: 5000 + i * 500,
        yoyo: true,
        repeat: -1,
      });

      this.tweens.add({
        targets: obj,
        y: obj.y + 15,
        duration: 1200,
        yoyo: true,
        repeat: -1,
      });
    });
  }
}
