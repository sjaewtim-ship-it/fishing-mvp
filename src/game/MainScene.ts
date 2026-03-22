import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { RecordManager } from './RecordManager';
import { CoinManager } from './CoinManager';
import { SaveSync } from './SaveSync';
import { AnalyticsManager } from './AnalyticsManager';
import { SimpleAudio } from './SimpleAudio';

type Swimmer = {
  sprite: Phaser.GameObjects.Text;
  vx: number;
  vy: number;
  radius: number;
};

export class MainScene extends Phaser.Scene {
  private swimmers: Swimmer[] = [];
  private readonly waterLeft = 40;
  private readonly waterRight = 710;
  private readonly waterTop = 760;
  private readonly waterBottom = 1280;

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

  private randomVelocity(base: number) {
    const sign = Math.random() > 0.5 ? 1 : -1;
    return sign * Phaser.Math.Between(base - 6, base + 6);
  }

  private isOverlapping(x: number, y: number, radius: number) {
    return this.swimmers.some((s) => {
      const dx = s.sprite.x - x;
      const dy = s.sprite.y - y;
      const minDist = s.radius + radius + 12;
      return dx * dx + dy * dy < minDist * minDist;
    });
  }

  private createSwimmer(emoji: string, fontSize: number, baseSpeed: number, alpha = 0.95) {
    const radius = Math.max(18, fontSize * 0.35);

    let x = 100;
    let y = 900;
    let found = false;

    for (let i = 0; i < 80; i++) {
      x = Phaser.Math.Between(this.waterLeft + radius, this.waterRight - radius);
      y = Phaser.Math.Between(this.waterTop + radius, this.waterBottom - radius);

      if (!this.isOverlapping(x, y, radius)) {
        found = true;
        break;
      }
    }

    if (!found) {
      x = Phaser.Math.Between(this.waterLeft + radius, this.waterRight - radius);
      y = Phaser.Math.Between(this.waterTop + radius, this.waterBottom - radius);
    }

    const sprite = this.add.text(x, y, emoji, {
      fontSize: `${fontSize}px`,
    }).setOrigin(0.5).setAlpha(alpha);

    this.swimmers.push({
      sprite,
      vx: this.randomVelocity(baseSpeed),
      vy: this.randomVelocity(baseSpeed),
      radius,
    });
  }

  create() {
    SaveSync.load();
    this.swimmers = [];

    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    const bestCatch = RecordManager.instance.getBestCatch();
    const weirdCatch = RecordManager.instance.getWeirdCatch();

    this.cameras.main.setBackgroundColor('#8FD3FF');

    // 背景
    this.add.rectangle(375, 667, 750, 1334, 0x8fd3ff);

    // 深蓝水域直接铺到底
    this.add.rectangle(375, 1047, 750, 574, 0x1e88e5);

    // 白云
    const cloud1 = this.add.text(110, 86, '☁️', { fontSize: '42px' }).setAlpha(0.88);
    const cloud2 = this.add.text(520, 120, '☁️ ☁️', { fontSize: '34px' }).setAlpha(0.82);
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

    // 信息模块
    this.add.rectangle(375, 345, 660, 210, 0x000000, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.14);

    // 第一行：金币 + 体力
    this.add.rectangle(235, 305, 250, 76, 0xffffff, 0.09)
      .setStrokeStyle(2, 0xffffff, 0.10);

    this.add.text(145, 305, '🪙', {
      fontSize: '30px',
      color: '#FFD54F',
    }).setOrigin(0.5);

    this.add.text(260, 286, '金币', {
      fontSize: '20px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(260, 318, `${coins}`, {
      fontSize: '30px',
      color: '#FFE082',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.rectangle(515, 305, 250, 76, 0xffffff, 0.09)
      .setStrokeStyle(2, 0xffffff, 0.10);

    this.add.text(425, 305, '⚡', {
      fontSize: '30px',
    }).setOrigin(0.5);

    this.add.text(540, 286, '体力值', {
      fontSize: '20px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(540, 318, `${energy}/${maxEnergy}`, {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 分隔线
    this.add.line(375, 350, 100, 0, 650, 0, 0xffffff).setAlpha(0.12);

    // 第二行：最佳 / 最离谱
    this.add.rectangle(235, 415, 250, 92, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.10);
    this.add.rectangle(515, 415, 250, 92, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.10);

    this.add.text(145, 415, '⭐', {
      fontSize: '28px',
    }).setOrigin(0.5);

    this.add.text(260, 394, '今日最佳渔获', {
      fontSize: '18px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(260, 430, bestCatch, {
      fontSize: '26px',
      color: '#FFE082',
      fontStyle: 'bold',
      wordWrap: { width: 180 },
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(425, 415, '🤯', {
      fontSize: '28px',
    }).setOrigin(0.5);

    this.add.text(540, 394, '今日最离谱战绩', {
      fontSize: '18px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(540, 430, weirdCatch, {
      fontSize: '26px',
      color: '#FFD180',
      fontStyle: 'bold',
      wordWrap: { width: 180 },
      align: 'center',
    }).setOrigin(0.5);

    // 按钮
    const startBtn = this.add.rectangle(375, 555, 410, 100, 0xff5f5f)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.20);

    this.add.text(375, 555, '开始钓鱼', {
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

    const adBtn = this.add.rectangle(375, 670, 410, 88, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.18);

    this.add.text(375, 670, '🎬 补充体力', {
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

    // 水面下文案
    this.add.text(375, 735, '水下似乎有东西在游动…', {
      fontSize: '22px',
      color: '#EAF6FF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.95);

    // 随机生成水里生物
    this.createSwimmer('🐟', 30, 18, 0.95);
    this.createSwimmer('🐠', 28, 16, 0.9);
    this.createSwimmer('🐡', 34, 14, 0.88);
    this.createSwimmer('🦀', 30, 12, 0.95);
    this.createSwimmer('🐢', 30, 10, 0.92);
    this.createSwimmer('🦞', 32, 13, 0.95);

    // 底部浪花装饰
    this.add.text(375, 1248, '🌊   🌊   🌊', {
      fontSize: '28px',
      color: '#DFF6FF',
    }).setOrigin(0.5).setAlpha(0.82);
  }

  update() {
    for (const s of this.swimmers) {
      s.sprite.x += s.vx * 0.25;
      s.sprite.y += s.vy * 0.25;

      if (s.sprite.x <= this.waterLeft + s.radius) {
        s.sprite.x = this.waterLeft + s.radius;
        s.vx *= -1;
      }
      if (s.sprite.x >= this.waterRight - s.radius) {
        s.sprite.x = this.waterRight - s.radius;
        s.vx *= -1;
      }
      if (s.sprite.y <= this.waterTop + s.radius) {
        s.sprite.y = this.waterTop + s.radius;
        s.vy *= -1;
      }
      if (s.sprite.y >= this.waterBottom - s.radius) {
        s.sprite.y = this.waterBottom - s.radius;
        s.vy *= -1;
      }
    }

    // 相遇反向
    for (let i = 0; i < this.swimmers.length; i++) {
      for (let j = i + 1; j < this.swimmers.length; j++) {
        const a = this.swimmers[i];
        const b = this.swimmers[j];

        const dx = a.sprite.x - b.sprite.x;
        const dy = a.sprite.y - b.sprite.y;
        const minDist = a.radius + b.radius + 8;

        if (dx * dx + dy * dy < minDist * minDist) {
          a.vx *= -1;
          a.vy *= -1;
          b.vx *= -1;
          b.vy *= -1;

          a.sprite.x += a.vx * 0.5;
          a.sprite.y += a.vy * 0.5;
          b.sprite.x += b.vx * 0.5;
          b.sprite.y += b.vy * 0.5;
        }
      }
    }
  }
}
