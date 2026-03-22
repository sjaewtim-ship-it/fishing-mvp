import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { RecordManager } from './RecordManager';
import { CoinManager } from './CoinManager';
import { SaveSync } from './SaveSync';
import { AnalyticsManager } from './AnalyticsManager';
import { SimpleAudio } from './SimpleAudio';

type CreatureKind = 'fish' | 'crab' | 'turtle';

type Swimmer = {
  sprite: Phaser.GameObjects.Text;
  vx: number;
  vy: number;
  radius: number;
  kind: CreatureKind;
};

export class MainScene extends Phaser.Scene {
  private swimmers: Swimmer[] = [];

  // 水域再缩小 15%~20%
  private readonly waterLeft = 125;
  private readonly waterRight = 625;
  private readonly waterTop = 905;
  private readonly waterBottom = 1115;

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

  private isOverlapping(x: number, y: number, radius: number) {
    return this.swimmers.some((s) => {
      const dx = s.sprite.x - x;
      const dy = s.sprite.y - y;
      const minDist = s.radius + radius + 18;
      return dx * dx + dy * dy < minDist * minDist;
    });
  }

  private createSwimmer(
    emoji: string,
    fontSize: number,
    kind: CreatureKind,
    speedX: number,
    speedY: number,
    alpha = 0.95,
    fixedBand?: { minY: number; maxY: number }
  ) {
    const radius = Math.max(18, fontSize * 0.36);

    let x = 100;
    let y = 900;
    let found = false;

    for (let i = 0; i < 120; i++) {
      x = Phaser.Math.Between(this.waterLeft + radius, this.waterRight - radius);
      y = fixedBand
        ? Phaser.Math.Between(fixedBand.minY, fixedBand.maxY)
        : Phaser.Math.Between(this.waterTop + radius, this.waterBottom - radius);

      if (!this.isOverlapping(x, y, radius)) {
        found = true;
        break;
      }
    }

    if (!found) {
      x = Phaser.Math.Between(this.waterLeft + radius, this.waterRight - radius);
      y = fixedBand
        ? Phaser.Math.Between(fixedBand.minY, fixedBand.maxY)
        : Phaser.Math.Between(this.waterTop + radius, this.waterBottom - radius);
    }

    const sprite = this.add.text(x, y, emoji, {
      fontSize: `${fontSize}px`,
    }).setOrigin(0.5).setAlpha(alpha);

    const vx = (Math.random() > 0.5 ? 1 : -1) * speedX;
    const vy = (Math.random() > 0.5 ? 1 : -1) * speedY;

    this.swimmers.push({
      sprite,
      vx,
      vy,
      radius,
      kind,
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
    this.add.rectangle(375, 1080, 750, 508, 0x1e88e5);

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
    this.add.rectangle(394, 356, 708, 230, 0x000000, 0.11)
      .setStrokeStyle(2, 0xffffff, 0.14);

    const leftX = 225;
    const rightX = 563;
    const topY = 304;
    const bottomY = 418;
    const boxW = 304;
    const boxH1 = 82;
    const boxH2 = 102;

    this.add.rectangle(leftX, topY, boxW, boxH1, 0xffffff, 0.09)
      .setStrokeStyle(2, 0xffffff, 0.10);
    this.add.rectangle(rightX, topY, boxW, boxH1, 0xffffff, 0.09)
      .setStrokeStyle(2, 0xffffff, 0.10);
    this.add.rectangle(leftX, bottomY, boxW, boxH2, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.10);
    this.add.rectangle(rightX, bottomY, boxW, boxH2, 0xffffff, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.10);

    this.add.text(145, topY, '🪙', {
      fontSize: '30px',
      color: '#FFD54F',
    }).setOrigin(0.5);

    this.add.text(260, topY - 18, '金币', {
      fontSize: '20px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(260, topY + 16, `${coins}`, {
      fontSize: '30px',
      color: '#FFE082',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(425, topY, '⚡', {
      fontSize: '30px',
    }).setOrigin(0.5);

    this.add.text(540, topY - 18, '体力值', {
      fontSize: '20px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(540, topY + 16, `${energy}/${maxEnergy}`, {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(145, bottomY, '⭐', {
      fontSize: '28px',
    }).setOrigin(0.5);

    this.add.text(leftX, bottomY - 24, '今日最佳渔获', {
      fontSize: '18px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(leftX, bottomY + 18, bestCatch, {
      fontSize: '26px',
      color: '#FFE082',
      fontStyle: 'bold',
      wordWrap: { width: 190 },
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(425, bottomY, '🤯', {
      fontSize: '28px',
    }).setOrigin(0.5);

    this.add.text(rightX, bottomY - 24, '今日最离谱战绩', {
      fontSize: '18px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(rightX, bottomY + 18, weirdCatch, {
      fontSize: '26px',
      color: '#FFD180',
      fontStyle: 'bold',
      wordWrap: { width: 190 },
      align: 'center',
    }).setOrigin(0.5);

    // 按钮
    const startBtn = this.add.rectangle(375, 592, 438, 108, 0xff5f5f)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.20);

    this.add.text(375, 592, '开始钓鱼', {
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

    const adBtn = this.add.rectangle(375, 712, 438, 94, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.18);

    this.add.text(375, 712, '🎬 补充体力', {
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

    // 文案置于水面上方，紧邻水面
    this.add.text(375, 835, '水下似乎有东西在游动…', {
      fontSize: '22px',
      color: '#EAF6FF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.95);

    // 水下环境：保留珊瑚 / 水草 / 沙地
    const sandColor = 0xd8c28a;
    this.add.ellipse(210, 1195, 210, 56, sandColor, 0.95);
    this.add.ellipse(385, 1212, 240, 66, sandColor, 0.95);
    this.add.ellipse(565, 1198, 220, 58, sandColor, 0.95);

    this.add.text(175, 1088, '🪸', { fontSize: '50px' }).setOrigin(0.5).setAlpha(0.94);
    this.add.text(555, 1075, '🪸', { fontSize: '58px' }).setOrigin(0.5).setAlpha(0.92);

    this.add.text(145, 1170, '🌿', { fontSize: '44px' }).setOrigin(0.5).setAlpha(0.9);
    this.add.text(305, 1160, '🌱', { fontSize: '38px' }).setOrigin(0.5).setAlpha(0.88);
    this.add.text(470, 1166, '🌿', { fontSize: '48px' }).setOrigin(0.5).setAlpha(0.9);
    this.add.text(610, 1172, '🌱', { fontSize: '40px' }).setOrigin(0.5).setAlpha(0.88);

    // 更自然的动物：鱼 / 螃蟹 / 乌龟
    // 鱼：中速，轻微上下
    this.createSwimmer('🐟', 40, 'fish', 0.78, 0.14, 0.92, { minY: 900, maxY: 1015 });
    this.createSwimmer('🐠', 36, 'fish', 0.72, 0.12, 0.88, { minY: 915, maxY: 1025 });
    this.createSwimmer('🐡', 48, 'fish', 0.48, 0.10, 0.86, { minY: 940, maxY: 1045 });

    // 螃蟹：贴底，横向为主
    this.createSwimmer('🦀', 40, 'crab', 0.42, 0.03, 0.95, { minY: 1065, maxY: 1110 });

    // 乌龟：更大更慢更稳
    this.createSwimmer('🐢', 56, 'turtle', 0.24, 0.05, 0.94, { minY: 980, maxY: 1080 });

    this.add.text(375, 1248, '🌊   🌊   🌊', {
      fontSize: '28px',
      color: '#DFF6FF',
    }).setOrigin(0.5).setAlpha(0.82);
  }

  update() {
    for (const s of this.swimmers) {
      switch (s.kind) {
        case 'fish':
          s.sprite.x += s.vx;
          s.sprite.y += s.vy;
          break;
        case 'crab':
          s.sprite.x += s.vx;
          s.sprite.y += s.vy;
          break;
        case 'turtle':
          s.sprite.x += s.vx;
          s.sprite.y += s.vy;
          break;
      }

      if (s.sprite.x <= this.waterLeft + s.radius) {
        s.sprite.x = this.waterLeft + s.radius;
        s.vx = Math.abs(s.vx);
      }
      if (s.sprite.x >= this.waterRight - s.radius) {
        s.sprite.x = this.waterRight - s.radius;
        s.vx = -Math.abs(s.vx);
      }
      if (s.sprite.y <= this.waterTop + s.radius) {
        s.sprite.y = this.waterTop + s.radius;
        s.vy = Math.abs(s.vy);
      }
      if (s.sprite.y >= this.waterBottom - s.radius) {
        s.sprite.y = this.waterBottom - s.radius;
        s.vy = -Math.abs(s.vy);
      }
    }

    // 相遇反向
    for (let i = 0; i < this.swimmers.length; i++) {
      for (let j = i + 1; j < this.swimmers.length; j++) {
        const a = this.swimmers[i];
        const b = this.swimmers[j];

        const dx = a.sprite.x - b.sprite.x;
        const dy = a.sprite.y - b.sprite.y;
        const minDist = a.radius + b.radius + 12;

        if (dx * dx + dy * dy < minDist * minDist) {
          a.vx *= -1;
          a.vy *= -1;
          b.vx *= -1;
          b.vy *= -1;

          a.sprite.x += a.vx * 2;
          a.sprite.y += a.vy * 2;
          b.sprite.x += b.vx * 2;
          b.sprite.y += b.vy * 2;
        }
      }
    }
  }
}
