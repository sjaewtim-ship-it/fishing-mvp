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

  private readonly waterLeft = 125;
  private readonly waterRight = 625;
  private readonly waterTop = 905;
  private readonly waterBottom = 1115;

  constructor() {
    super('MainScene');
  }

  private createSwimmer(
    emoji: string,
    fontSize: number,
    kind: CreatureKind,
    speedX: number,
    speedY: number
  ) {
    const x = Phaser.Math.Between(this.waterLeft, this.waterRight);
    const y = Phaser.Math.Between(this.waterTop, this.waterBottom);

    const sprite = this.add.text(x, y, emoji, {
      fontSize: `${fontSize}px`,
    }).setOrigin(0.5);

    this.swimmers.push({
      sprite,
      vx: (Math.random() > 0.5 ? 1 : -1) * speedX,
      vy: (Math.random() > 0.5 ? 1 : -1) * speedY,
      radius: fontSize * 0.4,
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

    // ⭐ 信息块（放大+居中）
    this.add.rectangle(375, 360, 830, 280, 0x000000, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.14);

    const leftX = 235;
    const rightX = 515;
    const topY = 310;
    const bottomY = 430;

    const boxW = 304;
    const boxH1 = 82;
    const boxH2 = 102;

    // 子块
    this.add.rectangle(leftX, topY, boxW, boxH1, 0xffffff, 0.09);
    this.add.rectangle(rightX, topY, boxW, boxH1, 0xffffff, 0.09);
    this.add.rectangle(leftX, bottomY, boxW, boxH2, 0xffffff, 0.08);
    this.add.rectangle(rightX, bottomY, boxW, boxH2, 0xffffff, 0.08);

    // 金币
    this.add.text(leftX, topY - 18, '金币', { fontSize: '20px', color: '#DFF6FF' }).setOrigin(0.5);
    this.add.text(leftX, topY + 16, `${coins}`, { fontSize: '30px', color: '#FFE082' }).setOrigin(0.5);

    // 体力
    this.add.text(rightX, topY - 18, '体力值', { fontSize: '20px', color: '#DFF6FF' }).setOrigin(0.5);
    this.add.text(rightX, topY + 16, `${energy}/${maxEnergy}`, { fontSize: '30px', color: '#FFF' }).setOrigin(0.5);

    // 最佳
    this.add.text(leftX, bottomY - 24, '今日最佳渔获', { fontSize: '18px', color: '#DFF6FF' }).setOrigin(0.5);
    this.add.text(leftX, bottomY + 18, bestCatch, { fontSize: '26px', color: '#FFE082' }).setOrigin(0.5);

    // 离谱
    this.add.text(rightX, bottomY - 24, '今日最离谱战绩', { fontSize: '18px', color: '#DFF6FF' }).setOrigin(0.5);
    this.add.text(rightX, bottomY + 18, weirdCatch, { fontSize: '26px', color: '#FFD180' }).setOrigin(0.5);

    // 按钮
    const startBtn = this.add.rectangle(375, 592, 460, 110, 0xff5f5f)
      .setInteractive();

    this.add.text(375, 592, '开始钓鱼', {
      fontSize: '36px',
      color: '#FFF',
    }).setOrigin(0.5);

    startBtn.on('pointerdown', () => {
      if (!EnergyManager.instance.hasEnergy()) return;
      EnergyManager.instance.costEnergy();
      SaveSync.save();
      this.scene.start('FishingScene');
    });

    const adBtn = this.add.rectangle(375, 712, 460, 96, 0x9b59b6)
      .setInteractive();

    this.add.text(375, 712, '🎬 补充体力', {
      fontSize: '30px',
      color: '#FFF',
    }).setOrigin(0.5);

    adBtn.on('pointerdown', () => {
      EnergyManager.instance.addEnergy(3);
      SaveSync.save();
      this.scene.restart();
    });

    // ⭐ 文案 → 放到水面“上方”
    this.add.text(375, 860, '水下似乎有东西在游动…', {
      fontSize: '22px',
      color: '#EAF6FF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setShadow(0,2,'#000',2,true,true);

    // 水下环境
    this.add.ellipse(375, 1200, 600, 120, 0xd8c28a);

    // 生物
    this.createSwimmer('🐟', 40, 'fish', 0.8, 0.1);
    this.createSwimmer('🐠', 36, 'fish', 0.7, 0.1);
    this.createSwimmer('🐡', 48, 'fish', 0.5, 0.1);
    this.createSwimmer('🦀', 40, 'crab', 0.4, 0.05);
    this.createSwimmer('🐢', 56, 'turtle', 0.2, 0.05);
  }

  update() {
    this.swimmers.forEach(s => {
      s.sprite.x += s.vx;
      s.sprite.y += s.vy;

      if (s.sprite.x < this.waterLeft || s.sprite.x > this.waterRight) s.vx *= -1;
      if (s.sprite.y < this.waterTop || s.sprite.y > this.waterBottom) s.vy *= -1;
    });
  }
}
