import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { CoinManager } from './CoinManager';
import { DirectorSystem } from './DirectorSystem';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';
import { AnalyticsManager } from './AnalyticsManager';
import { EnergyModal } from './EnergyModal';
import { SettingsModal } from './ui/SettingsModal';

// ==================================================
// 首页 Layout 常量
// ==================================================
const HOME_LAYOUT = {
  safePadding: 24,

  topBarHeight: 80,
  mainHeight: 420,
  ctaHeight: 100,
  bottomNavHeight: 100,

  sectionGap: 20,
};

export class HomeSceneV2 extends Phaser.Scene {
  private coinText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;

  constructor() {
    super('HomeSceneV2');
  }

  // ==================================================
  // 布局计算
  // ==================================================
  private calculateLayout() {
    const { width, height } = this.scale;
    const L = HOME_LAYOUT;

    const topBarY = L.safePadding + L.topBarHeight / 2;

    const mainY =
      topBarY +
      L.topBarHeight / 2 +
      L.sectionGap +
      L.mainHeight / 2;

    const ctaY =
      mainY +
      L.mainHeight / 2 +
      L.sectionGap +
      L.ctaHeight / 2;

    const bottomNavY =
      height - L.bottomNavHeight / 2 - L.safePadding;

    return {
      width,
      height,
      centerX: width / 2,
      topBarY,
      mainY,
      ctaY,
      bottomNavY,
    };
  }

  // ==================================================
  // 入口
  // ==================================================
  create() {
    const layout = this.calculateLayout();

    this.cameras.main.setBackgroundColor('#8FD3FF');

    this.renderTopBar(layout);
    this.renderMain(layout);
    this.renderCTA(layout);
    this.renderBottomNav(layout);

    this.refreshEnergyUI();
  }

  // ==================================================
  // TopBar：金币 + 体力
  // ==================================================
  private renderTopBar(layout: ReturnType<typeof this.calculateLayout>) {
    const { centerX, topBarY } = layout;

    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    this.coinText = this.add.text(centerX - 200, topBarY, `💰 ${coins}`, {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.energyText = this.add.text(centerX + 200, topBarY, `⚡ ${energy}/${maxEnergy}`, {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ==================================================
  // Main：主视觉区（占位）
  // ==================================================
  private renderMain(layout: ReturnType<typeof this.calculateLayout>) {
    const { centerX, mainY } = layout;

    this.add.rectangle(centerX, mainY, 600, 300, 0x2d9cdb, 0.2)
      .setStrokeStyle(2, 0x2d9cdb);

    this.add.text(centerX, mainY, '主视觉区（占位）', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  // ==================================================
  // CTA：开始钓鱼（复用 handleStartFishing）
  // ==================================================
  private renderCTA(layout: ReturnType<typeof this.calculateLayout>) {
    const { centerX, ctaY } = layout;

    const btn = this.add.rectangle(centerX, ctaY, 300, 80, 0xff6b6b)
      .setInteractive({ useHandCursor: true });

    this.add.text(centerX, ctaY, '开始钓鱼', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerdown', () => {
      this.handleStartFishing();
    });
  }

  // ==================================================
  // BottomNav：图鉴 / 任务 / 福利 / 设置
  // ==================================================
  private renderBottomNav(layout: ReturnType<typeof this.calculateLayout>) {
    const { centerX, bottomNavY } = layout;

    const items = [
      { label: '图鉴', onClick: () => this.scene.start('CollectionScene') },
      { label: '任务', onClick: () => this.scene.start('TaskScene') },
      { label: '福利', onClick: () => {} },
      { label: '设置', onClick: () => new SettingsModal(this).show() },
    ];

    const gap = 140;
    const startX = centerX - ((items.length - 1) * gap) / 2;

    items.forEach((item, i) => {
      const x = startX + i * gap;

      const btn = this.add.rectangle(x, bottomNavY, 120, 60, 0x6c5ce7, 0.8)
        .setInteractive({ useHandCursor: true });

      this.add.text(x, bottomNavY, item.label, {
        fontSize: '20px',
        color: '#ffffff',
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        SimpleAudio.click();
        item.onClick();
      });
    });
  }

  // ==================================================
  // 业务逻辑：开始钓鱼（不改）
  // ==================================================
  private handleStartFishing() {
    SimpleAudio.unlock();
    SimpleAudio.click();

    if (!EnergyManager.instance.hasEnergy()) {
      this.showEnergyModal();
      return;
    }

    AnalyticsManager.instance.onStartRound();
    EnergyManager.instance.costEnergy();
    SaveSync.save();

    this.scene.start('FishingScene', {
      round: DirectorSystem.getRoundNumber(),
    });
  }

  // ==================================================
  // 体力弹窗（不改）
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
  // 刷新资源显示（保留）
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
