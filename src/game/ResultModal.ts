import Phaser from 'phaser';
import { SimpleAudio } from './SimpleAudio';
import { VisualMap } from './VisualMap';
import type { DropItem } from './DropGenerator';
import type { RoundResult } from './types/RoundResult';
import { formatWeight } from './DropGenerator';
import { ShareManager } from './ShareManager';
import { SaveSync } from './SaveSync';
import { CoinManager } from './CoinManager';
import { AnalyticsManager } from './AnalyticsManager';

type FailReason = 'early' | 'too_early' | 'late';

// 离谱物爆点文案库（轻量版）
const WEIRD_COPY_MAP: Record<string, string[]> = {
  underwear: [
    '这谁的',
    '不太对劲',
    '别解释',
  ],
  crab: [
    '别碰它',
    '它在骂你',
    '反了它了',
  ],
  turtle: [
    '它更稳',
    '你俩差不多',
    '看不起你',
  ],
  shoe: [
    '另一只呢',
    '刚掉的',
    '你踩过吧',
  ],
  branch: [
    '这也算',
    '你在种树',
    '离谱了',
  ],
  mystery_box: [
    '别打开',
    '不太安全',
    '要出事了',
  ]
};

const WEIRD_FALLBACK = [
  '这合理吗',
  '我人傻了',
  '这也行啊',
  '离谱了',
];

// 根据 drop.name 获取离谱物 key
function getWeirdKey(name: string): string {
  if (name === '内裤') return 'underwear';
  if (name === '螃蟹') return 'crab';
  if (name === '乌龟') return 'turtle';
  if (name === '拖鞋' || name === '破袜子') return 'shoe';
  if (name === '树枝') return 'branch';
  if (name === '神秘宝箱') return 'mystery_box';
  return '';
}

// 获取随机离谱物文案
function getRandomWeirdCopy(name: string): string {
  const key = getWeirdKey(name);
  const pool = key ? WEIRD_COPY_MAP[key] : WEIRD_FALLBACK;
  return pool[Math.floor(Math.random() * pool.length)];
}

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

  // 截图区域内容对象引用（供 calculateScreenshotArea 使用）
  private titleText?: Phaser.GameObjects.Text;
  private visual?: Phaser.GameObjects.Text;
  private rarityText?: Phaser.GameObjects.Text;
  private nameText?: Phaser.GameObjects.Text;
  private rewardText?: Phaser.GameObjects.Text;
  private textObj?: Phaser.GameObjects.Text;
  private hookText?: Phaser.GameObjects.Text;

  // 按钮区 Y 坐标（供 toast 使用）
  private primaryBtnY: number = 0;
  private shareBtnY: number = 0;

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
    if (perfect) return '🔥 完美命中！';
    if (combo >= 2) return `✨ 命中！${combo}连击`;
    return '上钩了！';
  }

  /**
   * 获取情绪文案（轻量兜底）
   * 优先级：roundResult.highlightText > drop.flavor > 此函数
   */
  private getEmotionCopy(drop: DropItem): string {
    const name = drop.name;
    const type = drop.type;

    // 传说/神物
    if (type === 'legend') {
      return '这也能钓到？';
    }

    // 离谱物
    if (type === 'trash') {
      const premiumTrash = ['内裤', '螃蟹', '乌龟'];
      if (premiumTrash.includes(name)) {
        return '这玩意谁丢海里的？？';
      }
      return '这也算渔获？';
    }

    // 稀有鱼
    const rareFish = ['锦鲤', '巨型草鱼'];
    if (rareFish.includes(name)) {
      return '有点东西啊…';
    }

    // 普通鱼
    return '还行，不至于空军';
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
   * 获取稀有度对应的背景光晕颜色（用于成功态卡片氛围）
   */
  private getRarityGlowColor(rarity: string): number {
    if (rarity.includes('SSR')) return 0xFFD700;  // 金色
    if (rarity.includes('SR')) return 0xBA55D3;   // 紫色
    if (rarity.includes('R')) return 0x4CAF50;    // 绿色
    return 0x64B5F6;  // 普通蓝色
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

  /**
   * 轻量 toast 提示
   */
  private showToast(message: string) {
    const width = this.scene.scale.width;
    const centerX = width / 2;
    
    // toast 位置：分享按钮上方
    const toastY = this.shareBtnY - 50;
    
    const bg = this.scene.add.rectangle(centerX, toastY, 440, 58, 0x000000, 0.54)
      .setStrokeStyle(2, 0xffffff, 0.12);
    const text = this.scene.add.text(centerX, toastY, message, {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    
    const container = this.scene.add.container(0, 0, [bg, text]);
    
    this.scene.tweens.add({
      targets: container,
      alpha: 0,
      y: toastY - 12,
      delay: 800,
      duration: 240,
      onComplete: () => container.destroy(),
    });
  }

  /**
   * 计算截图区域（动态高度，基于内容对象）
   */
  private calculateScreenshotArea(cardX: number, cardY: number, cardWidth: number): { x: number; y: number; width: number; height: number } {
    // 左边界
    const screenshotX = cardX - cardWidth / 2;

    // 顶部：标题上方 padding
    const titleBounds = this.titleText?.getBounds();
    const screenshotY = (titleBounds?.top ?? cardY - 200) - 10;

    // 宽度
    const screenshotWidth = cardWidth;

    // 底部：动态计算，基于最后一个有效内容对象（优先 hookText）
    let screenshotBottom: number;

    if (this.hookText) {
      // 优先级 1：传播文案
      const hookBounds = this.hookText.getBounds();
      screenshotBottom = hookBounds.bottom + 20;
    } else if (this.textObj) {
      // 优先级 2：情绪文案
      const textBounds = this.textObj.getBounds();
      screenshotBottom = textBounds.bottom + 20;
    } else if (this.rewardText) {
      // 优先级 3：金币
      const rewardBounds = this.rewardText.getBounds();
      screenshotBottom = rewardBounds.bottom + 20;
    } else if (this.nameText) {
      // 优先级 4：渔获名称
      const nameBounds = this.nameText.getBounds();
      screenshotBottom = nameBounds.bottom + 28;
    } else {
      // 兜底
      screenshotBottom = cardY + 120;
    }

    const screenshotHeight = screenshotBottom - screenshotY;

    return {
      x: screenshotX,
      y: screenshotY,
      width: screenshotWidth,
      height: screenshotHeight,
    };
  }

  /**
   * 处理分享按钮点击
   */
  private handleShareClick(cardX: number, cardY: number, cardWidth: number) {
    SimpleAudio.click();
    
    // 记录分享行为
    AnalyticsManager.instance.onAdView('share');
    
    // 计算截图区域
    const screenshotArea = this.calculateScreenshotArea(cardX, cardY, cardWidth);
    
    // 生成分享奖励 Key
    const round = this.options.round ?? 0;
    const dropName = this.options.drop?.name ?? 'none';
    const shareRewardKey = `fishing_share_reward_${round}_${dropName}`;
    
    // 检查是否已领取
    const shareRewardClaimed = SaveSync.hasShareRewardClaimed(shareRewardKey);
    
    // 保存截图
    this.scene.time.delayedCall(50, () => {
      ShareManager.saveResultPoster(
        this.scene,
        screenshotArea.x,
        screenshotArea.y,
        screenshotArea.width,
        screenshotArea.height
      );
    });
    
    // 发放奖励或提示
    if (!shareRewardClaimed) {
      // 首次分享：发放奖励
      CoinManager.instance.addCoins(50);
      SaveSync.markShareRewardClaimed(shareRewardKey);
      SaveSync.save();
      this.showToast('首次分享奖励 +50 金币');
    } else {
      // 已领取：仅提示
      this.showToast('本次战绩奖励已领取');
    }
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
    // 成功态和失败态统一高度（增加高度以容纳内容区）
    const cardWidth = 600;
    const cardHeight = 680;  // 从 560 增加到 680，容纳 4 个 section
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

    // === 按钮区（统一，仅失败态需要，成功态在 renderSuccessContent 内处理）===
    if (resultType === 'fail') {
      // 失败态按钮区：中心线下方
      this.primaryBtnY = cardY + 80;
      const primaryBtnWidth = 400;
      const primaryBtnHeight = 84;
      const primaryBtnText = '再来一杆';
      const primaryBtnColor = 0xFF6B6B;

      const primaryBtn = this.scene.add.rectangle(cardX, this.primaryBtnY, primaryBtnWidth, primaryBtnHeight, primaryBtnColor)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0xFFFFFF);

      const primaryBtnShadow = this.scene.add.rectangle(cardX, this.primaryBtnY + 4, primaryBtnWidth, primaryBtnHeight, 0x000000, 0.15);
      this.container.add(primaryBtnShadow);
      this.container.add(primaryBtn);

      const primaryBtnTextObj = this.scene.add.text(cardX, this.primaryBtnY, primaryBtnText, {
        fontSize: '32px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);
      this.container.add(primaryBtnTextObj);

      primaryBtn.on('pointerdown', () => {
        SimpleAudio.click();
        onContinue();
      });

      // 返回按钮
      const backBtnY = this.primaryBtnY + 70;
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
    }

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

    // 判断是否为 SSR（传说鱼/神物）
    const isSSR = roundResult?.rarity === 'legendary' ||
                  this.getRarityText(drop).includes('SSR');

    // 判断是否为离谱物（weird 类型）
    const isWeird = drop.type === 'trash' && ['内裤', '螃蟹', '乌龟', '拖鞋', '破袜子', '树枝', '神秘宝箱'].includes(drop.name);

    // 获取稀有度文本和颜色
    const roundResultRarity = roundResult?.rarity;
    let rarity = roundResultRarity
      ? this.mapRarityToText(roundResultRarity, drop)
      : this.getRarityText(drop);
    let rarityColor = roundResultRarity
      ? this.mapRarityToColor(roundResultRarity, drop)
      : this.getRarityColor(rarity);

    // 离谱物显示兜底：避免显示为"N 鱼获"
    if (isWeird && (rarity === 'N 鱼获' || rarity === 'common')) {
      rarity = 'SR 离谱物';
      rarityColor = 0xBA55D3;  // SR 紫色
    }

    // === 背景氛围层（成功态专属，淡彩色渐变感）===
    const glowColor = this.getRarityGlowColor(rarity);
    const bgGlow = this.scene.add.graphics();
    bgGlow.fillGradientStyle(cardX - 280, cardY - 260, cardX + 280, cardY - 200,
      glowColor, glowColor, 0xFFFFFF, 0xFFFFFF);
    bgGlow.fillRoundedRect(cardX - 280, cardY - 260, 560, 60, 20);
    bgGlow.setAlpha(0.04);
    this.container!.add(bgGlow);

    // ==================================================
    // Section 1: Header - 标题区
    // ==================================================
    // 标题上移 7px，为 SSR 大体积掉落物让出空间
    const headerTopY = cardY - cardHeight / 2 + 48;
    const titleTextValue = isWeird ? getRandomWeirdCopy(drop.name) : this.getSuccessTitle(perfect ?? false, actualCombo);
    const titleColor = isWeird ? '#FF6B6B' : '#333333';

    this.titleText = this.scene.add.text(cardX, headerTopY, titleTextValue, {
      fontSize: '42px',
      color: titleColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.container!.add(this.titleText);

    // ==================================================
    // Section 2: Visual - 主视觉区（渔获 emoji）===
    // ==================================================
    // 主物体整体再下移 15px（累计 90px），为成功态内容信息流让出充足空间
    const visualY = headerTopY + 180;
    const emoji = VisualMap.getEmoji(drop.name);
    // 主掉落物主角化：SSR 145px，普通 125px
    const visualSize = isSSR ? 145 : 125;
    this.visual = this.scene.add.text(cardX, visualY, emoji, {
      fontSize: `${visualSize}px`,
    }).setOrigin(0.5);

    // SSR 高光层（跟随主物体同步下移）
    if (isSSR) {
      const glowY = visualY + 12;
      const glow = this.scene.add.circle(cardX, glowY, 110, 0xFFD700, 0.18);
      this.container!.add(glow);
    }

    this.container!.add(this.visual);

    // ==================================================
    // Section 3: Info - 信息区（稀有度 + 名称 + 奖励 + 说明）===
    // ==================================================
    // 收紧主物体→稀有度间距，从 65px 改为 50px
    const infoStartY = visualY + 50;

    // 稀有度标签
    const rarityBg = this.scene.add.rectangle(cardX, infoStartY, 180, 40, rarityColor, 0.95)
      .setStrokeStyle(2, 0xFFFFFF);
    this.container!.add(rarityBg);

    this.rarityText = this.scene.add.text(cardX, infoStartY, rarity, {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.container!.add(this.rarityText);

    // 渔获名称
    const nameY = infoStartY + 46;
    this.nameText = this.scene.add.text(cardX, nameY, drop.name, {
      fontSize: '38px',
      color: '#333333',
      fontStyle: 'bold',
      stroke: '#666666',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.container!.add(this.nameText);

    // 鱼的重量（仅鱼类显示）
    const weightGrams = roundResult?.weightGrams ?? drop.weightGrams;
    let weightText: Phaser.GameObjects.Text | undefined;
    if (weightGrams && weightGrams > 0) {
      const weightY = nameY + 42;
      weightText = this.scene.add.text(cardX, weightY, formatWeight(weightGrams), {
        fontSize: '18px',
        color: '#8B9DC3',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.container!.add(weightText);
    }

    // 奖励金币
    const rewardY = weightText ? (weightText.getBounds().bottom + 10) : (nameY + 42);
    const coins = roundResult?.finalCoins ?? drop.reward;
    this.rewardText = this.scene.add.text(cardX, rewardY, `+${coins} 金币`, {
      fontSize: '20px',
      color: '#FFA726',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.container!.add(this.rewardText);

    // 说明文案（优先级：highlightText > flavor > getEmotionCopy 兜底）
    const highlightText = roundResult?.highlightText;
    const flavorText = drop.flavor;
    let displayText = highlightText || flavorText;

    if (!displayText) {
      displayText = this.getEmotionCopy(drop);
    }

    if (displayText) {
      const textY = rewardY + 32;
      this.textObj = this.scene.add.text(cardX, textY, displayText, {
        fontSize: '17px',
        color: '#666666',
        wordWrap: { width: 440 },
        align: 'center',
      }).setOrigin(0.5);
      this.container!.add(this.textObj);
    }

    // 传播文案
    const hookBaseY = this.textObj
      ? this.textObj.getBounds().bottom
      : this.rewardText
        ? this.rewardText.getBounds().bottom
        : this.nameText
          ? this.nameText.getBounds().bottom
          : rewardY;

    const hookTextY = hookBaseY + 16;
    const isSSRorWeird = isSSR || isWeird;
    const hookTextValue = isSSRorWeird ? '这也能钓到？？？' : '这杆不亏';

    this.hookText = this.scene.add.text(cardX, hookTextY, hookTextValue, {
      fontSize: '18px',
      color: '#333333',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5);
    this.container!.add(this.hookText);

    // ==================================================
    // Section 4: Actions - 按钮区（固定在底部）===
    // ==================================================
    // 按钮区基于卡片底部定位，不再使用绝对坐标
    const actionsBottomY = cardY + cardHeight / 2 - 50;

    // 主按钮：按钮区顶部（整体上移 30px）
    this.primaryBtnY = actionsBottomY - 105;
    const primaryBtnWidth = 380;
    const primaryBtnHeight = 76;
    const primaryBtnText = '继续钓鱼';
    const primaryBtnColor = 0x4CAF50;

    const primaryBtn = this.scene.add.rectangle(cardX, this.primaryBtnY, primaryBtnWidth, primaryBtnHeight, primaryBtnColor)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xFFFFFF);

    // 主按钮阴影
    const primaryBtnShadow = this.scene.add.rectangle(cardX, this.primaryBtnY + 3, primaryBtnWidth, primaryBtnHeight, 0x000000, 0.12);
    this.container!.add(primaryBtnShadow);
    this.container!.add(primaryBtn);

    const primaryBtnTextObj = this.scene.add.text(cardX, this.primaryBtnY, primaryBtnText, {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.container!.add(primaryBtnTextObj);

    primaryBtn.on('pointerdown', () => {
      SimpleAudio.click();
      this.options.onContinue();
    });

    // 分享按钮：主按钮下方（终版间距 70px）
    this.shareBtnY = this.primaryBtnY + 70;
    const shareBtnWidth = 260;
    const shareBtnHeight = 56;

    const shareBtn = this.scene.add.rectangle(cardX, this.shareBtnY, shareBtnWidth, shareBtnHeight, 0x7D6BA8)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.container!.add(shareBtn);

    const shareBtnText = this.scene.add.text(cardX, this.shareBtnY, '分享战绩 🎁', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container!.add(shareBtnText);

    shareBtn.on('pointerdown', () => {
      this.handleShareClick(cardX, cardY, 600);
    });

    // 返回按钮：分享按钮下方（终版间距 54px）
    const backBtnY = this.shareBtnY + 54;
    const backBtnClickArea = this.scene.add.rectangle(cardX, backBtnY, 180, 40, 0xFFFFFF, 0);
    backBtnClickArea.setInteractive({ useHandCursor: true });
    this.container!.add(backBtnClickArea);

    const backBtnTextObj = this.scene.add.text(cardX, backBtnY, '返回首页', {
      fontSize: '22px',
      color: '#777777',
    }).setOrigin(0.5);
    this.container!.add(backBtnTextObj);

    backBtnClickArea.on('pointerdown', () => {
      SimpleAudio.click();
      this.options.onBack();
    });

    // SSR 主视觉 emoji 轻量弹出动画
    if (isSSR) {
      this.visual.setScale(0.2);
      this.scene.tweens.add({
        targets: this.visual,
        scale: 1,
        alpha: 1,
        duration: 350,
        delay: 100,
        ease: 'Back.easeOut',
      });

      // SSR 增加轻微浮动动画
      this.scene.tweens.add({
        targets: this.visual,
        y: visualY - 6,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // 非 SSR 也增加轻微浮动
      this.scene.tweens.add({
        targets: this.visual,
        y: visualY - 4,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // SSR 增加粒子闪烁效果（5 个✨）
    if (isSSR) {
      const shinePositions = [
        { x: 60, y: -40, size: '50px' },
        { x: 95, y: -5, size: '70px' },
        { x: -65, y: -15, size: '44px' },
        { x: 85, y: 50, size: '56px' },
        { x: -50, y: 40, size: '48px' },
      ];

      const shines: Phaser.GameObjects.Text[] = [];
      shinePositions.forEach((pos) => {
        const shine = this.scene.add.text(cardX + pos.x, visualY + pos.y, '✨', { fontSize: pos.size })
          .setOrigin(0.5)
          .setAlpha(0.90);
        shines.push(shine);
        this.container!.add(shine);
      });

      // 闪烁动画（delay 函数签名：(target, index, total) => number）
      this.scene.tweens.add({
        targets: shines,
        alpha: 0.45,
        scale: 1.08,
        duration: 550,
        yoyo: true,
        repeat: -1,
        delay: (_target: unknown, index: number): number => index * 90,
      });
    }
  }

  hide() {
    if (this.container) {
      // 停止与 visual 相关的无限循环 tween（防止 tween 残留）
      if (this.visual) {
        this.scene.tweens.killTweensOf(this.visual);
      }
      
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
