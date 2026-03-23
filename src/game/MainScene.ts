import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { CoinManager } from './CoinManager';
import { RecordManager } from './RecordManager';
import { DirectorSystem } from './DirectorSystem';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';

type SwimVisual = {
  emoji: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  scale: number;
  drift: number;
};

export class MainScene extends Phaser.Scene {
  private swimmers: Phaser.GameObjects.Text[] = [];
  private swimmerData: SwimVisual[] = [];

  constructor() {
    super('MainScene');
  }

  private getLayout() {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;
    const centerX = width / 2;

    const safeBottom = Math.max(130, Math.round(height * 0.1));

    // 首页按钮固定在信息块下面，而不是贴近底部
    const startBtnY = 565;
    const energyBtnY = 675;

    // 水域顶部放到按钮下面
    const waterTopY = 760;
    const waterBottomY = height - safeBottom - 20;
    const waterHeight = Math.max(240, waterBottomY - waterTopY);
    const waterCenterY = waterTopY + waterHeight / 2;

    const sandY = waterBottomY - 18;
    const plantBaseY = sandY - 42;
    const coralBaseY = sandY - 88;

    return {
      width,
      height,
      centerX,
      safeBottom,
      startBtnY,
      energyBtnY,
      waterTopY,
      waterBottomY,
      waterHeight,
      waterCenterY,
      sandY,
      plantBaseY,
      coralBaseY,
    };
  }

  private getTodayBestCatchSafe(): string {
    const rm: any = RecordManager.instance as any;

    if (rm && typeof rm.getTodayBestCatch === 'function') return rm.getTodayBestCatch() || '暂无';
    if (rm && typeof rm.getBestCatch === 'function') return rm.getBestCatch() || '暂无';
    if (rm && typeof rm.getBest === 'function') return rm.getBest() || '暂无';
    if (rm && typeof rm.bestCatch === 'string') return rm.bestCatch || '暂无';

    return '暂无';
  }

  private getTodayWeirdCatchSafe(): string {
    const rm: any = RecordManager.instance as any;

    if (rm && typeof rm.getTodayWeirdCatch === 'function') return rm.getTodayWeirdCatch() || '暂无';
    if (rm && typeof rm.getWeirdCatch === 'function') return rm.getWeirdCatch() || '暂无';
    if (rm && typeof rm.getWeird === 'function') return rm.getWeird() || '暂无';
    if (rm && typeof rm.weirdCatch === 'string') return rm.weirdCatch || '暂无';

    return '暂无';
  }

  create() {
    const L = this.getLayout();

    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    const bestCatch = this.getTodayBestCatchSafe();
    const weirdCatch = this.getTodayWeirdCatchSafe();

    this.cameras.main.setBackgroundColor('#8FD3FF');

    this.add.rectangle(L.centerX, L.height / 2, L.width, L.height, 0x8fd3ff);

    const cloud1 = this.add.text(95, 92, '☁️', { fontSize: '42px' }).setAlpha(0.9);
    const cloud2 = this.add.text(555, 126, '☁️ ☁️', { fontSize: '34px' }).setAlpha(0.82);

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
      x: 150,
      duration: 22000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(L.centerX, 105, '🎣 钓鱼小游戏', {
      fontSize: '54px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(L.centerX, 168, '看准时机，一杆出货', {
      fontSize: '24px',
      color: '#F7FBFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 信息块
    const infoWrapY = 340;
    this.add.rectangle(L.centerX, infoWrapY, 690, 220, 0x78b6dd, 0.35)
      .setStrokeStyle(2, 0xffffff, 0.10);

    const cardW = 315;
    const cardH = 88;
    const leftX = L.centerX - 172;
    const rightX = L.centerX + 172;
    const row1Y = 300;
    const row2Y = 392;

    const drawCard = (x: number, y: number, icon: string, title: string, value: string, valueColor = '#FFFFFF') => {
      this.add.rectangle(x, y, cardW, cardH, 0xffffff, 0.08)
        .setStrokeStyle(1, 0xffffff, 0.08);

      this.add.text(x - 120, y, icon, {
        fontSize: '34px',
      }).setOrigin(0.5);

      this.add.text(x - 52, y - 14, title, {
        fontSize: '20px',
        color: '#EAF6FF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(x + 42, y + 16, value, {
        fontSize: '24px',
        color: valueColor,
        fontStyle: 'bold',
      }).setOrigin(0.5);
    };

    drawCard(leftX, row1Y, '🪙', '金币', String(coins), '#FFE082');
    drawCard(rightX, row1Y, '⚡', '体力值', `${energy}/${maxEnergy}`, '#FFFFFF');
    drawCard(leftX, row2Y, '⭐', '今日最佳渔获', bestCatch, '#FFE082');
    drawCard(rightX, row2Y, '🤯', '今日最离谱战绩', weirdCatch, '#FFD180');

    const comboLabel = DirectorSystem.getComboLabel();
    if (comboLabel) {
      this.add.text(L.centerX, 468, comboLabel, {
        fontSize: '22px',
        color: '#FFE082',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
    }

    // 按钮区：固定在信息块下方
    this.add.rectangle(L.centerX, 620, 540, 220, 0x000000, 0.06)
      .setStrokeStyle(2, 0xffffff, 0.08);

    const startBtn = this.add.rectangle(L.centerX, L.startBtnY, 470, 106, 0xff6b6b)
      .setStrokeStyle(4, 0xffffff, 0.18)
      .setInteractive({ useHandCursor: true });

    this.add.text(L.centerX, L.startBtnY, '开始钓鱼', {
      fontSize: '38px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    startBtn.on('pointerdown', () => {
      SimpleAudio.click();

      if (!EnergyManager.instance.hasEnergy()) {
        this.showToast('体力不足，先补充体力');
        return;
      }

      EnergyManager.instance.costEnergy();
      SaveSync.save();
      this.scene.start('FishingScene', {
        round: DirectorSystem.getRoundNumber(),
      });
    });

    const energyBtn = this.add.rectangle(L.centerX, L.energyBtnY, 470, 98, 0x9b59b6)
      .setStrokeStyle(4, 0xffffff, 0.18)
      .setInteractive({ useHandCursor: true });

    this.add.text(L.centerX, L.energyBtnY - 4, '🎬 补充体力', {
      fontSize: '34px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(L.centerX, L.energyBtnY + 28, '观看广告可恢复 3 点体力', {
      fontSize: '18px',
      color: '#F7EFFF',
    }).setOrigin(0.5);

    energyBtn.on('pointerdown', () => {
      SimpleAudio.click();

      if (EnergyManager.instance.getEnergy() >= EnergyManager.instance.getMaxEnergy()) {
        this.showToast('补充成功，体力已满！');
        return;
      }

      EnergyManager.instance.addEnergy(3);
      SaveSync.save();

      if (EnergyManager.instance.getEnergy() >= EnergyManager.instance.getMaxEnergy()) {
        this.showToast('补充成功，体力已满！');
      } else {
        this.showToast('补充成功，体力+3');
      }

      this.scene.restart();
    });

    // 水域
    this.add.rectangle(L.centerX, L.waterCenterY, L.width, L.waterHeight, 0x1e88e5);

    const wave1 = this.add.ellipse(L.centerX - 120, L.waterTopY + 2, 160, 16, 0xffffff, 0.22);
    const wave2 = this.add.ellipse(L.centerX + 40, L.waterTopY + 2, 210, 18, 0xffffff, 0.18);
    const wave3 = this.add.ellipse(L.centerX + 220, L.waterTopY + 4, 130, 14, 0xffffff, 0.16);

    this.tweens.add({
      targets: [wave1, wave2, wave3],
      scaleX: 1.08,
      alpha: 0.08,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(L.centerX, L.waterTopY + 36, '水下似乎有东西在游动...', {
      fontSize: '20px',
      color: '#EAF6FF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.createSwimmers(L);

    this.add.text(120, L.coralBaseY, '🪸', { fontSize: '58px' }).setOrigin(0.5).setAlpha(0.92);
    this.add.text(610, L.coralBaseY - 8, '🪸', { fontSize: '64px' }).setOrigin(0.5).setAlpha(0.9);
    this.add.text(285, L.plantBaseY, '🌿', { fontSize: '46px' }).setOrigin(0.5).setAlpha(0.88);
    this.add.text(470, L.plantBaseY - 4, '🌱', { fontSize: '42px' }).setOrigin(0.5).setAlpha(0.86);

    const sandColor = 0xd8c28a;
    this.add.ellipse(150, L.sandY, 220, 58, sandColor, 0.95);
    this.add.ellipse(L.centerX, L.sandY + 14, 280, 72, sandColor, 0.95);
    this.add.ellipse(595, L.sandY + 2, 220, 60, sandColor, 0.95);

    const footerWavesY = L.height - 26;
    this.add.text(L.centerX - 120, footerWavesY, '🌊', { fontSize: '36px' }).setOrigin(0.5).setAlpha(0.85);
    this.add.text(L.centerX, footerWavesY, '🌊', { fontSize: '36px' }).setOrigin(0.5).setAlpha(0.85);
    this.add.text(L.centerX + 120, footerWavesY, '🌊', { fontSize: '36px' }).setOrigin(0.5).setAlpha(0.85);
  }

  private createSwimmers(L: ReturnType<MainScene['getLayout']>) {
    const pool: SwimVisual[] = [
      { emoji: '🐟', x: 140, y: L.waterTopY + 120, dirX: 1, dirY: 1, speed: 0.34, scale: 1.25, drift: 18 },
      { emoji: '🐠', x: 560, y: L.waterTopY + 180, dirX: -1, dirY: 1, speed: 0.44, scale: 1.4, drift: 22 },
      { emoji: '🐡', x: 260, y: L.waterTopY + 250, dirX: 1, dirY: -1, speed: 0.28, scale: 1.65, drift: 16 },
      { emoji: '🐢', x: 480, y: L.waterTopY + 300, dirX: -1, dirY: -1, speed: 0.22, scale: 1.7, drift: 12 },
      { emoji: '🦀', x: 160, y: L.waterTopY + 330, dirX: 1, dirY: -1, speed: 0.20, scale: 1.55, drift: 10 },
    ];

    this.swimmerData = pool;

    pool.forEach((item) => {
      const t = this.add.text(item.x, item.y, item.emoji, {
        fontSize: `${Math.round(32 * item.scale)}px`,
      }).setOrigin(0.5);

      this.swimmers.push(t);
    });
  }

  update() {
    if (!this.swimmers.length) return;

    const L = this.getLayout();
    const minX = 60;
    const maxX = L.width - 60;
    const minY = L.waterTopY + 86;
    const maxY = L.sandY - 76;

    for (let i = 0; i < this.swimmers.length; i++) {
      const sprite = this.swimmers[i];
      const data = this.swimmerData[i];

      sprite.x += data.dirX * data.speed;
      sprite.y += data.dirY * (data.speed * 0.35) + Math.sin(this.time.now * 0.001 + i) * 0.08;

      if (sprite.x < minX || sprite.x > maxX) data.dirX *= -1;
      if (sprite.y < minY || sprite.y > maxY) data.dirY *= -1;

      sprite.setScale(data.dirX < 0 ? -1 : 1, 1);
    }

    for (let i = 0; i < this.swimmers.length; i++) {
      for (let j = i + 1; j < this.swimmers.length; j++) {
        const a = this.swimmers[i];
        const b = this.swimmers[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 54) {
          this.swimmerData[i].dirX *= -1;
          this.swimmerData[j].dirX *= -1;
          this.swimmerData[i].dirY *= -1;
          this.swimmerData[j].dirY *= -1;
        }
      }
    }
  }

  private showToast(message: string) {
    const L = this.getLayout();
    const bg = this.add.rectangle(L.centerX, L.actionBaseY - 120, 460, 64, 0x000000, 0.56)
      .setStrokeStyle(2, 0xffffff, 0.14);

    const text = this.add.text(L.centerX, L.actionBaseY - 120, message, {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0, [bg, text]);

    this.tweens.add({
      targets: container,
      alpha: 0,
      y: -14,
      delay: 900,
      duration: 260,
      onComplete: () => container.destroy(),
    });
  }
}
