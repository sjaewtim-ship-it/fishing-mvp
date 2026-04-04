import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { CoinManager } from './CoinManager';
import { DirectorSystem } from './DirectorSystem';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';
import { AnalyticsManager } from './AnalyticsManager';
import { EnergyModal } from './EnergyModal';
import { SettingsModal } from './ui/SettingsModal';
import { StorageManager } from './StorageManager';

// ==================================================
// 横版首页 Layout 常量
// ==================================================
const LAYOUT = {
  topPadding: 24,
  sidePadding: 32,
  topBarHeight: 52,

  visualCenterYRatio: 0.42,
  bobberOffsetY: -20,

  primaryButtonWidth: 280,
  primaryButtonHeight: 84,
  primaryButtonOffsetY: 110,

  navButtonWidth: 140,
  navButtonHeight: 64,
  navBottomOffset: 56,
  navGap: 36,
};

export class HomeSceneV2 extends Phaser.Scene {
  private coinText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;

  constructor() {
    super('HomeSceneV2');
  }

  create() {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;

    this.cameras.main.setBackgroundColor('#8FD3FF');

    this.createBackground(width, height);
    this.createTopBar(width);
    this.createMainVisual(width, height);
    this.createPrimaryAction(width, height);
    this.createBottomNav(width, height);
  }

  // ==================================================
  // 背景：天空到海面的渐变
  // ==================================================
  private createBackground(width: number, height: number) {
    const g = this.add.graphics();

    // 天空部分（上 60%）
    g.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x4FC3F7, 0x4FC3F7, 1);
    g.fillRect(0, 0, width, height * 0.6);

    // 海面部分（下 40%）
    g.fillGradientStyle(0x4FC3F7, 0x4FC3F7, 0x1E88E5, 0x1E88E5, 1);
    g.fillRect(0, height * 0.6, width, height * 0.4);

    // 地平线
    g.lineStyle(2, 0xEAF6FF, 0.6);
    g.lineBetween(0, height * 0.6, width, height * 0.6);
  }

  // ==================================================
  // 顶部资源栏：金币 + 体力
  // ==================================================
  private createTopBar(width: number) {
    const y = LAYOUT.topPadding + LAYOUT.topBarHeight / 2;

    // 左侧标题
    this.add.text(LAYOUT.sidePadding, y, '🎣 钓鱼大师', {
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 3,
    }).setOrigin(0, 0.5);

    // 右侧资源胶囊
    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    // 金币胶囊
    const coinCapsuleX = width - LAYOUT.sidePadding - 120;
    this.add.rectangle(coinCapsuleX, y, 110, 36, 0x000000, 0.35)
      .setStrokeStyle(1, 0xFFD700, 0.5);
    this.coinText = this.add.text(coinCapsuleX, y, `💰 ${coins}`, {
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 体力胶囊
    const energyCapsuleX = width - LAYOUT.sidePadding - 10;
    this.add.rectangle(energyCapsuleX, y, 80, 36, 0x000000, 0.35)
      .setStrokeStyle(1, 0x4CAF50, 0.5);
    this.energyText = this.add.text(energyCapsuleX, y, `⚡ ${energy}/${maxEnergy}`, {
      fontSize: '16px',
      color: '#4CAF50',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ==================================================
  // 中部主视觉区：浮漂
  // ==================================================
  private createMainVisual(width: number, height: number) {
    const centerX = width / 2;
    const centerY = height * LAYOUT.visualCenterYRatio + LAYOUT.bobberOffsetY;

    // 浮漂容器
    const bobber = this.add.container(centerX, centerY);

    // 浮漂主体（红白相间）
    const body = this.add.graphics();
    body.fillStyle(0xFFFFFF, 1);
    body.fillCircle(0, 0, 12);
    body.fillStyle(0xFF4444, 1);
    body.fillCircle(0, -14, 10);
    body.fillStyle(0xFFFFFF, 0.3);
    body.fillCircle(0, 0, 18); // 微光

    // 鱼线
    const line = this.add.graphics();
    line.lineStyle(2, 0xFFFFFF, 0.6);
    line.lineBetween(0, -24, 0, -80);

    bobber.add([line, body]);

    // 浮漂轻微上下浮动
    this.tweens.add({
      targets: bobber,
      y: centerY + 8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ==================================================
  // 主按钮：开始钓鱼
  // ==================================================
  private createPrimaryAction(width: number, height: number) {
    const centerX = width / 2;
    const centerY = height * LAYOUT.visualCenterYRatio + LAYOUT.primaryButtonOffsetY;
    const btnW = LAYOUT.primaryButtonWidth;
    const btnH = LAYOUT.primaryButtonHeight;

    // 阴影
    this.add.rectangle(centerX, centerY + 4, btnW, btnH, 0x000000, 0.2);

    // 按钮背景
    const btnBg = this.add.rectangle(centerX, centerY, btnW, btnH, 0xFF5F5F)
      .setStrokeStyle(3, 0xFFFFFF, 0.3);
    btnBg.setInteractive({ useHandCursor: true });

    // 按钮文字
    const btnText = this.add.text(centerX, centerY, '开始钓鱼', {
      fontSize: '36px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // 呼吸动画
    this.tweens.add({
      targets: [btnBg, btnText],
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 点击事件
    btnBg.on('pointerdown', () => this.handleStartFishing());
  }

  // ==================================================
  // 底部次级入口：图鉴 / 任务 / 设置
  // ==================================================
  private createBottomNav(width: number, height: number) {
    const y = height - LAYOUT.navBottomOffset;
    const btnW = LAYOUT.navButtonWidth;
    const btnH = LAYOUT.navButtonHeight;
    const gap = LAYOUT.navGap;
    const totalWidth = btnW * 3 + gap * 2;
    const startX = (width - totalWidth) / 2 + btnW / 2;

    const navItems = [
      { label: '📖 图鉴', onClick: () => this.scene.start('CollectionScene') },
      { label: '📝 任务', onClick: () => this.scene.start('TaskScene') },
      { label: '⚙️ 设置', onClick: () => new SettingsModal(this).show() },
    ];

    navItems.forEach((item, index) => {
      const x = startX + index * (btnW + gap);

      // 按钮背景（低饱和色，弱于主按钮）
      const btnBg = this.add.rectangle(x, y, btnW, btnH, 0x6C5CE7, 0.85)
        .setStrokeStyle(1, 0x5A4F7F, 0.5);
      btnBg.setInteractive({ useHandCursor: true });

      // 按钮文字
      this.add.text(x, y, item.label, {
        fontSize: '18px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      btnBg.on('pointerdown', () => {
        SimpleAudio.click();
        item.onClick();
      });
    });
  }

  // ==================================================
  // 业务逻辑：开始钓鱼（复用 MainScene 已验证逻辑）
  // ==================================================
  private handleStartFishing() {
    SimpleAudio.unlock();
    SimpleAudio.click();

    // 体力检查
    if (!EnergyManager.instance.hasEnergy()) {
      this.showEnergyModal();
      return;
    }

    // 埋点 + 扣体力 + 存档
    AnalyticsManager.instance.onStartRound();
    EnergyManager.instance.costEnergy();
    SaveSync.save();

    // 跳转钓鱼页
    this.scene.start('FishingScene', {
      round: DirectorSystem.getRoundNumber(),
    });
  }

  // ==================================================
  // 体力弹窗（复用 MainScene 逻辑）
  // ==================================================
  private showEnergyModal() {
    const currentEnergy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    const modal = new EnergyModal(this, {
      currentEnergy,
      maxEnergy,
      onRecharge: () => {
        EnergyManager.instance.addEnergy(3);
        SaveSync.save();
        this.refreshEnergyUI();
        modal.hide();
      },
      onCancel: () => {
        modal.hide();
      },
    });
    modal.show();
  }

  // ==================================================
  // 刷新顶部资源显示
  // ==================================================
  private refreshEnergyUI() {
    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    if (this.coinText) {
      this.coinText.setText(`💰 ${coins}`);
    }
    if (this.energyText) {
      this.energyText.setText(`⚡ ${energy}/${maxEnergy}`);
    }
  }
}
