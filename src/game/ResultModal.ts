import Phaser from 'phaser';
import { SimpleAudio } from './SimpleAudio';
import { VisualMap } from './VisualMap';
import type { DropItem } from './DropGenerator';
import type { RoundResult } from './types/RoundResult';

type FailReason = 'early' | 'too_early' | 'late';

type ResultModalOptions = {
  resultType: 'success' | 'fail';
  // 成功态数据
  drop?: DropItem;
  round?: number;
  perfect?: boolean;
  combo?: number;
  // 失败态数据
  failReason?: FailReason;
  // 新增：RoundResult 数据结构（本轮兼容读取，不做 UI 改造）
  roundResult?: RoundResult;
  // 回调
  onContinue: () => void;
  onBack: () => void;
};

export class ResultModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private options: ResultModalOptions;

  constructor(scene: Phaser.Scene, options: ResultModalOptions) {
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

  private getSuccessTitle(perfect: boolean, combo: number): string {
    if (perfect) return '完美命中！';
    if (combo >= 2) return `命中！${combo}连击`;
    return '上钩了！';
  }

  private getRarityText(drop: DropItem): string {
    const goodFish = ['大鲤鱼', '黑鱼', '鲈鱼', '金鲫鱼'];
    const rareFish = ['锦鲤', '巨型草鱼'];
    const legendFish = ['龙鱼', '黄金锦鲤'];
    const premiumTrash = ['内裤', '螃蟹', '乌龟'];

    if (drop.type === 'legend') {
      if (legendFish.includes(drop.name)) return 'SSR 传说鱼';
      return 'SSR 神物';
    }

    if (drop.type === 'trash') {
      if (premiumTrash.includes(drop.name)) return 'SR 离谱物';
      return 'R 怪东西';
    }

    if (rareFish.includes(drop.name)) return 'SR 稀有鱼';
    if (goodFish.includes(drop.name)) return 'R 优质鱼';
    return 'N 鱼获';
  }

  private getRarityColor(rarity: string): number {
    if (rarity.includes('SSR')) return 0xFFD700;
    if (rarity.includes('SR')) return 0xBA55D3;
    if (rarity.includes('R')) return 0x4CAF50;
    return 0x888888;
  }

  /**
   * 映射 RoundResult.rarity 到展示文本（兼容式，结合 drop 保持产品语义）
   * 优先使用 RoundResult 的统一稀有度，保留旧逻辑兜底
   */
  private mapRarityToText(rarity: string, drop: DropItem): string {
    if (rarity === 'legendary') {
      // 传说鱼区分：龙鱼/黄金锦鲤 → SSR 传说鱼，其他 → SSR 神物
      const legendFish = ['龙鱼', '黄金锦鲤'];
      if (legendFish.includes(drop.name)) {
        return 'SSR 传说鱼';
      }
      return 'SSR 神物';
    }
    if (rarity === 'epic') {
      return 'SR 离谱物';
    }
    if (rarity === 'rare') {
      return 'SR 稀有鱼';
    }
    if (rarity === 'common') {
      // 普通鱼中区分：大鲤鱼/黑鱼/鲈鱼/金鲫鱼 → R 优质鱼，其他 → N 鱼获
      const goodFish = ['大鲤鱼', '黑鱼', '鲈鱼', '金鲫鱼'];
      if (goodFish.includes(drop.name)) {
        return 'R 优质鱼';
      }
      return 'N 鱼获';
    }
    return 'N 鱼获';
  }

  /**
   * 映射 RoundResult.rarity 到颜色（兼容式，结合 drop 保持产品语义）
   * 优先使用 RoundResult 的统一稀有度，保留旧逻辑兜底
   */
  private mapRarityToColor(rarity: string, drop: DropItem): number {
    if (rarity === 'legendary') {
      return 0xFFD700;  // SSR 金色
    }
    if (rarity === 'epic') {
      return 0xBA55D3;  // SR 紫色
    }
    if (rarity === 'rare') {
      return 0xBA55D3;  // SR 紫色
    }
    if (rarity === 'common') {
      // 普通鱼中区分：大鲤鱼/黑鱼/鲈鱼/金鲫鱼 → 绿色，其他 → 灰色
      const goodFish = ['大鲤鱼', '黑鱼', '鲈鱼', '金鲫鱼'];
      if (goodFish.includes(drop.name)) {
        return 0x4CAF50;  // R 绿色
      }
      return 0x888888;  // N 灰色
    }
    return 0x888888;
  }

  private getFailEmoji(reason: FailReason): string {
    if (reason === 'early') return '😅';
    if (reason === 'too_early') return '😖';
    return '😵';
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
    const { resultType, onContinue, onBack } = this.options;

    // 创建主容器
    this.container = this.scene.add.container(0, 0);

    // === 遮罩层 ===
    const mask = this.scene.add.rectangle(L.centerX, L.centerY, L.width, L.height, 0x000000, 0.65);
    mask.setInteractive();
    this.container.add(mask);

    // === 弹窗主卡 ===
    // 成功态和失败态统一高度
    const cardWidth = 600;
    const cardHeight = 560;
    const cardX = L.centerX;
    const cardY = L.centerY;

    const cardBg = this.scene.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0xFFFFFF);
    cardBg.setStrokeStyle(2, 0xE0E0E0);
    this.container.add(cardBg);

    if (resultType === 'fail') {
      this.renderFailContent(cardX, cardY, cardHeight);
    } else {
      this.renderSuccessContent(cardX, cardY, cardHeight);
    }

    // === 按钮区（统一）===
    // 主按钮：中心线下方 80px
    const primaryBtnY = cardY + 80;
    const primaryBtnWidth = 400;
    const primaryBtnHeight = 84;
    const primaryBtnText = resultType === 'fail' ? '再来一杆' : '继续钓鱼';
    const primaryBtnColor = resultType === 'fail' ? 0xFF6B6B : 0x4CAF50;

    const primaryBtn = this.scene.add.rectangle(cardX, primaryBtnY, primaryBtnWidth, primaryBtnHeight, primaryBtnColor)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xFFFFFF);
    this.container.add(primaryBtn);

    const primaryBtnTextObj = this.scene.add.text(cardX, primaryBtnY, primaryBtnText, {
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(primaryBtnTextObj);

    primaryBtn.on('pointerdown', () => {
      SimpleAudio.click();
      onContinue();
    });

    // 次按钮：轻文字按钮（带透明点击热区），主按钮下方 60px
    const backBtnY = primaryBtnY + 60;
    const backBtnClickArea = this.scene.add.rectangle(cardX, backBtnY, 200, 44, 0xFFFFFF, 0);
    backBtnClickArea.setInteractive({ useHandCursor: true });
    this.container.add(backBtnClickArea);

    const backBtnTextObj = this.scene.add.text(cardX, backBtnY, '返回首页', {
      fontSize: '22px',
      color: '#999999',
    }).setOrigin(0.5);
    this.container.add(backBtnTextObj);

    backBtnClickArea.on('pointerdown', () => {
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

  getContainer(): Phaser.GameObjects.Container | null {
    return this.container;
  }

  private renderFailContent(cardX: number, cardY: number, cardHeight: number) {
    const { failReason, round } = this.options;
    if (!failReason) return;

    // === 标题区 ===
    const titleY = cardY - cardHeight / 2 + 100;
    const titleText = this.scene.add.text(cardX, titleY, this.getFailTitle(failReason), {
      fontSize: '50px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container!.add(titleText);

    // === 主视觉区（表情 emoji）===
    const visualY = titleY + 70;
    const emoji = this.scene.add.text(cardX, visualY, this.getFailEmoji(failReason), {
      fontSize: '76px',
    }).setOrigin(0.5);
    this.container!.add(emoji);

    // === 说明区 ===
    // 失败解释文案
    const descY = visualY + 70;
    const descText = this.scene.add.text(cardX, descY, this.getFailDesc(failReason), {
      fontSize: '22px',
      color: '#666666',
      wordWrap: { width: 480 },
      align: 'center',
    }).setOrigin(0.5);
    this.container!.add(descText);

    // 失手次数
    const roundY = descY + 40;
    const roundText = this.scene.add.text(cardX, roundY, `第 ${round} 次钓鱼失手`, {
      fontSize: '19px',
      color: '#888888',
    }).setOrigin(0.5);
    this.container!.add(roundText);

    // 鼓励文案
    const encourageY = roundY + 30;
    const encourageText = this.scene.add.text(cardX, encourageY, '别急，再来一杆更容易中', {
      fontSize: '19px',
      color: '#FF9800',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container!.add(encourageText);
  }

  private renderSuccessContent(cardX: number, cardY: number, cardHeight: number) {
    const { drop, perfect, combo, roundResult } = this.options;
    if (!drop) return;

    const actualCombo = combo ?? 0;

    // === 标题区 ===
    const titleY = cardY - cardHeight / 2 + 90;
    const titleText = this.scene.add.text(cardX, titleY, this.getSuccessTitle(perfect ?? false, actualCombo), {
      fontSize: '46px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container!.add(titleText);

    // === 主视觉区（鱼/物品 emoji）===
    const visualY = titleY + 70;
    const emoji = VisualMap.getEmoji(drop.name);
    const visual = this.scene.add.text(cardX, visualY, emoji, {
      fontSize: '96px',
    }).setOrigin(0.5);
    this.container!.add(visual);

    // === 说明区 ===
    // 稀有度标签（优先使用 roundResult.rarity，保留旧逻辑兜底）
    const rarityY = visualY + 90;
    const roundResultRarity = roundResult?.rarity;
    const rarity = roundResultRarity
      ? this.mapRarityToText(roundResultRarity, drop)
      : this.getRarityText(drop);
    const rarityColor = roundResultRarity
      ? this.mapRarityToColor(roundResultRarity, drop)
      : this.getRarityColor(rarity);

    const rarityBg = this.scene.add.rectangle(cardX, rarityY, 170, 38, rarityColor, 0.9)
      .setStrokeStyle(2, 0xFFFFFF);
    this.container!.add(rarityBg);

    const rarityText = this.scene.add.text(cardX, rarityY, rarity, {
      fontSize: '19px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container!.add(rarityText);

    // 名称
    const nameY = rarityY + 50;
    const nameText = this.scene.add.text(cardX, nameY, drop.name, {
      fontSize: '34px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container!.add(nameText);

    // 奖励金币（优先使用 roundResult.finalCoins，保留旧逻辑兜底）
    const rewardY = nameY + 45;
    const coins = roundResult?.finalCoins ?? drop.reward;
    const rewardText = this.scene.add.text(cardX, rewardY, `+${coins} 金币`, {
      fontSize: '26px',
      color: '#F39C12',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container!.add(rewardText);

    // 说明文案（优先使用 roundResult.highlightText，否则使用 drop.flavor，都没有则不显示）
    const highlightText = roundResult?.highlightText;
    const flavorText = drop.flavor;
    const displayText = highlightText || flavorText;
    
    if (displayText) {
      const textY = rewardY + 35;
      const textObj = this.scene.add.text(cardX, textY, displayText, {
        fontSize: '17px',
        color: '#888888',
        wordWrap: { width: 460 },
        align: 'center',
      }).setOrigin(0.5);
      this.container!.add(textObj);
    }
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
