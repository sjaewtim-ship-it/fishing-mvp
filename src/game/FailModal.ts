import Phaser from 'phaser';
import { SimpleAudio } from './SimpleAudio';

type FailReason = 'early' | 'too_early' | 'late';

type FailModalOptions = {
  failReason: FailReason;
  round: number;
  onRetry: () => void;
  onBack: () => void;
};

export class FailModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private options: FailModalOptions;

  constructor(scene: Phaser.Scene, options: FailModalOptions) {
    this.scene = scene;
    this.options = options;
  }

  private getFailTitle(reason: FailReason): string {
    if (reason === 'early') return '拉早了！';
    if (reason === 'too_early') return '太急了！';
    return '拉晚了！';
  }

  private getFailDesc(reason: FailReason): string {
    if (reason === 'early') return '鱼还没咬钩，你先把它吓跑了';
    if (reason === 'too_early') return '鱼刚有动静，还没咬稳就拉了';
    return '你出手太慢，鱼已经挣脱了';
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
    const { failReason, round, onRetry, onBack } = this.options;

    // 创建主容器
    this.container = this.scene.add.container(0, 0);

    // === 遮罩层 ===
    const mask = this.scene.add.rectangle(L.centerX, L.centerY, L.width, L.height, 0x000000, 0.65);
    mask.setInteractive(); // 阻止穿透点击
    this.container.add(mask);

    // === 弹窗主卡 ===
    const cardWidth = 600;
    const cardHeight = 520;
    const cardX = L.centerX;
    const cardY = L.centerY;

    const cardBg = this.scene.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0xFFFFFF);
    cardBg.setStrokeStyle(2, 0xE0E0E0);
    this.container.add(cardBg);

    // === 标题区 ===
    const titleY = cardY - 180;
    const titleText = this.scene.add.text(cardX, titleY, this.getFailTitle(failReason), {
      fontSize: '52px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(titleText);

    // === 内容区 ===
    // 失败解释文案
    const descY = cardY - 90;
    const descText = this.scene.add.text(cardX, descY, this.getFailDesc(failReason), {
      fontSize: '26px',
      color: '#666666',
      wordWrap: { width: 520 },
      align: 'center',
    }).setOrigin(0.5);
    this.container.add(descText);

    // 失手次数
    const roundY = cardY - 30;
    const roundText = this.scene.add.text(cardX, roundY, `第 ${round} 次钓鱼失手`, {
      fontSize: '22px',
      color: '#888888',
    }).setOrigin(0.5);
    this.container.add(roundText);

    // 鼓励文案
    const encourageY = cardY + 20;
    const encourageText = this.scene.add.text(cardX, encourageY, '别急，再来一杆更容易中', {
      fontSize: '22px',
      color: '#FF9800',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(encourageText);

    // === 按钮区 ===
    // 主按钮：再来一次
    const retryBtnY = cardY + 130;
    const retryBtn = this.scene.add.rectangle(cardX, retryBtnY, 400, 88, 0xFF6B6B)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xFFFFFF);
    this.container.add(retryBtn);

    const retryBtnText = this.scene.add.text(cardX, retryBtnY, '再来一次', {
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(retryBtnText);

    retryBtn.on('pointerdown', () => {
      SimpleAudio.click();
      onRetry();
    });

    // 次按钮：返回首页
    const backBtnY = cardY + 210;
    const backBtn = this.scene.add.rectangle(cardX, backBtnY, 260, 72, 0xE0E0E0)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xC0C0C0);
    this.container.add(backBtn);

    const backBtnText = this.scene.add.text(cardX, backBtnY, '返回首页', {
      fontSize: '26px',
      color: '#666666',
    }).setOrigin(0.5);
    this.container.add(backBtnText);

    backBtn.on('pointerdown', () => {
      SimpleAudio.click();
      onBack();
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
