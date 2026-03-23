import Phaser from 'phaser';
import { SimpleAudio } from './SimpleAudio';

type EnergyModalOptions = {
  currentEnergy: number;
  maxEnergy: number;
  onRecharge: () => void;
  onCancel: () => void;
  underlyingContainer?: Phaser.GameObjects.Container;  // 底层弹窗容器引用
};

export class EnergyModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private options: EnergyModalOptions;
  private underlyingOriginalAlpha: number = 1;

  constructor(scene: Phaser.Scene, options: EnergyModalOptions) {
    this.scene = scene;
    this.options = options;
  }

  private getLayout() {
    const width = Number(this.scene.scale.width) || 750;
    const height = Number(this.scene.scale.height) || 1334;
    const centerX = width / 2;
    const centerY = height / 2;

    return {
      width,
      height,
      centerX,
      centerY,
    };
  }

  show() {
    const L = this.getLayout();
    const { currentEnergy, maxEnergy, onRecharge, onCancel, underlyingContainer } = this.options;

    // 降低底层弹窗 alpha（如果有）
    if (underlyingContainer) {
      this.underlyingOriginalAlpha = underlyingContainer.alpha;
      underlyingContainer.setAlpha(this.underlyingOriginalAlpha * 0.3);
    }

    // 创建主容器
    this.container = this.scene.add.container(0, 0);

    // === 遮罩层 ===
    const mask = this.scene.add.rectangle(L.centerX, L.centerY, L.width, L.height, 0x000000, 0.65);
    mask.setInteractive();
    this.container.add(mask);

    // === 弹窗主卡 ===
    const cardWidth = 560;
    const cardHeight = 480;
    const cardX = L.centerX;
    const cardY = L.centerY;

    const cardBg = this.scene.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0xFFFFFF);
    cardBg.setStrokeStyle(2, 0xE0E0E0);
    this.container.add(cardBg);

    // === 标题区 ===
    const titleY = cardY - cardHeight / 2 + 80;
    const titleText = this.scene.add.text(cardX, titleY, '体力不足', {
      fontSize: '48px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(titleText);

    // === 主视觉区 ===
    const visualY = titleY + 60;
    const emoji = this.scene.add.text(cardX, visualY, '⚡', {
      fontSize: '72px',
    }).setOrigin(0.5);
    this.container.add(emoji);

    // 体力数值
    const energyY = visualY + 70;
    const energyText = this.scene.add.text(cardX, energyY, `${currentEnergy}/${maxEnergy}`, {
      fontSize: '36px',
      color: '#666666',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(energyText);

    // === 说明区 ===
    const descY = energyY + 50;
    const descText = this.scene.add.text(cardX, descY, '补充体力后可继续钓鱼', {
      fontSize: '22px',
      color: '#888888',
    }).setOrigin(0.5);
    this.container.add(descText);

    // === 按钮区 ===
    // 主按钮：中心线下方 80px
    const primaryBtnY = cardY + 80;
    const rechargeBtn = this.scene.add.rectangle(cardX, primaryBtnY, 360, 80, 0x4CAF50)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xFFFFFF);
    this.container.add(rechargeBtn);

    const rechargeBtnText = this.scene.add.text(cardX, primaryBtnY, '补充体力', {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(rechargeBtnText);

    rechargeBtn.on('pointerdown', () => {
      SimpleAudio.click();
      onRecharge();
    });

    // 次按钮：轻文字按钮（带透明点击热区），主按钮下方 60px
    const cancelBtnY = primaryBtnY + 60;
    const cancelBtnClickArea = this.scene.add.rectangle(cardX, cancelBtnY, 120, 44, 0xFFFFFF, 0);
    cancelBtnClickArea.setInteractive({ useHandCursor: true });
    this.container.add(cancelBtnClickArea);

    const cancelBtnText = this.scene.add.text(cardX, cancelBtnY, '取消', {
      fontSize: '22px',
      color: '#999999',
    }).setOrigin(0.5);
    this.container.add(cancelBtnText);

    cancelBtnClickArea.on('pointerdown', () => {
      SimpleAudio.click();
      onCancel();
    });

    // 淡入动画
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });
  }

  hide() {
    // 恢复底层弹窗 alpha（如果有）
    if (this.options.underlyingContainer && this.options.underlyingContainer.active) {
      this.options.underlyingContainer.setAlpha(this.underlyingOriginalAlpha);
    }

    if (this.container) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: 150,
        ease: 'Power2',
        onComplete: () => {
          this.container?.destroy(true);
          this.container = null;
        },
      });
    }
  }
}
