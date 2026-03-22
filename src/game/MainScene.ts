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
  private hintText?: Phaser.GameObjects.Text;
  private hintIndex = 0;
  private readonly hints = [
    '水下刚刚游过一个大家伙…',
    '这一片水域，今天手气不错',
    '有人刚刚钓到了离谱东西',
    '别太急，太早拉杆会跑鱼',
  ];

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

  private startHintLoop() {
    if (!this.hintText) return;

    this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        if (!this.hintText) return;

        this.hintIndex = (this.hintIndex + 1) % this.hints.length;

        this.tweens.add({
          targets: this.hintText,
          alpha: 0,
          y: this.hintText.y - 6,
          duration: 180,
          onComplete: () => {
            if (!this.hintText) return;
            this.hintText.setText(this.hints[this.hintIndex]);
            this.hintText.y += 12;

            this.tweens.add({
              targets: this.hintText,
              alpha: 1,
              y: this.hintText.y - 6,
              duration: 180,
            });
          },
        });
      },
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
    this.add.text(375, 105, '🎣 钓鱼小游戏', {
      fontSize: '52px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(375, 160, '看准时机，一杆出货', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 首屏核心钩子
    this.add.text(375, 215, '这一杆，可能是鱼，也可能很离谱', {
      fontSize: '28px',
      color: '#FFF3B0',
      fontStyle: 'bold',
      wordWrap: { width: 620 },
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // 信息模块：降权，不抢主舞台
    this.add.rectangle(375, 352, 790, 210, 0x000000, 0.08)
      .setStrokeStyle(2, 0xffffff, 0.10);

    const leftX = 235;
    const rightX = 515;
    const topY = 304;
    const bottomY = 410;
    const boxW = 304;
    const boxH1 = 74;
    const boxH2 = 92;

    this.add.rectangle(leftX, topY, boxW, boxH1, 0xffffff, 0.06)
      .setStrokeStyle(1, 0xffffff, 0.08);
    this.add.rectangle(rightX, topY, boxW, boxH1, 0xffffff, 0.06)
      .setStrokeStyle(1, 0xffffff, 0.08);
    this.add.rectangle(leftX, bottomY, boxW, boxH2, 0xffffff, 0.05)
      .setStrokeStyle(1, 0xffffff, 0.08);
    this.add.rectangle(rightX, bottomY, boxW, boxH2, 0xffffff, 0.05)
      .setStrokeStyle(1, 0xffffff, 0.08);

    this.add.text(145, topY, '🪙', {
      fontSize: '28px',
      color: '#FFD54F',
    }).setOrigin(0.5);

    this.add.text(260, topY - 15, '金币', {
      fontSize: '18px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(260, topY + 12, `${coins}`, {
      fontSize: '28px',
      color: '#FFE082',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(425, topY, '⚡', {
      fontSize: '28px',
    }).setOrigin(0.5);

    this.add.text(540, topY - 15, '体力值', {
      fontSize: '18px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(540, topY + 12, `${energy}/${maxEnergy}`, {
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(145, bottomY, '⭐', {
      fontSize: '26px',
    }).setOrigin(0.5);

    this.add.text(leftX, bottomY - 20, '今日最佳渔获', {
      fontSize: '17px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(leftX, bottomY + 14, bestCatch, {
      fontSize: '24px',
      color: '#FFE082',
      fontStyle: 'bold',
      wordWrap: { width: 190 },
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(425, bottomY, '🤯', {
      fontSize: '26px',
    }).setOrigin(0.5);

    this.add.text(rightX, bottomY - 20, '今日最离谱战绩', {
      fontSize: '17px',
      color: '#DFF6FF',
    }).setOrigin(0.5);

    this.add.text(rightX, bottomY + 14, weirdCatch, {
      fontSize: '24px',
      color: '#FFD180',
      fontStyle: 'bold',
      wordWrap: { width: 190 },
      align: 'center',
    }).setOrigin(0.5);

    // 新手诱导
    this.add.text(375, 470, '前3杆更容易出货', {
      fontSize: '24px',
      color: '#FFF3B0',
      fontStyle: 'bold',
      backgroundColor: '#00000055',
      padding: { left: 14, right: 14, top: 6, bottom: 6 },
    }).setOrigin(0.5);

    // 主按钮
    const startBtn = this.add.rectangle(375, 590, 440, 112, 0xff5f5f)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.20);

    this.add.text(375, 590, '立刻开钓', {
      fontSize: '38px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startBtn,
      scale: 1.045,
      duration: 820,
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

    // 次按钮
    const adBtn = this.add.rectangle(375, 710, 440, 92, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.18);

    this.add.text(375, 710, '🎬 补充体力', {
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

    // 动态提示
    this.hintText = this.add.text(375, 858, this.hints[0], {
      fontSize: '22px',
      color: '#EAF6FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0.96);

    this.startHintLoop();

    // 水下环境
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

    // 生物：保留自然感
    this.createSwimmer('🐟', 40, 'fish', 0.78, 0.14, 0.92, { minY: 920, maxY: 1005 });
    this.createSwimmer('🐠', 36, 'fish', 0.72, 0.12, 0.88, { minY: 930, maxY: 1015 });
    this.createSwimmer('🐡', 48, 'fish', 0.48, 0.10, 0.86, { minY: 950, maxY: 1035 });

    this.createSwimmer('🦀', 40, 'crab', 0.42, 0.03, 0.95, { minY: 1068, maxY: 1110 });
    this.createSwimmer('🐢', 56, 'turtle', 0.24, 0.05, 0.94, { minY: 985, maxY: 1070 });

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
