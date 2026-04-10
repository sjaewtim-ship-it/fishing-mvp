/**
 * 图鉴页 Scene（Stitch 结构继承版）
 *
 * 页面结构（Phaser 组件树）：
 *
 * CollectionScene
 * ├─ bgLayer
 * ├─ topBarContainer
 * ├─ heroSectionContainer
 * ├─ tabSectionContainer
 * ├─ gridSectionContainer
 * └─ statsSectionContainer
 *
 * 不负责：
 * - 不存储图鉴数据
 * - 不修改图鉴进度
 * - 不改变 CollectionManager 业务逻辑
 */

import Phaser from 'phaser';
import { CollectionManager } from '../managers/CollectionManager';
import type { CollectionCategory, CollectionRarity } from '../data/collectionCatalog';

// ============================================================
// 色板
// ============================================================
const C = {
  // 背景
  pageBg: 0xF2F5F9,

  // TopBar
  topBarDivider: 0xE8EEF5,
  backBtnBg: 0xEEF4FA,
  backBtnStroke: 0xD7E4F0,
  backBtnArrow: 0x7A8FA6,
  titleText: '#243446',

  // Hero
  heroGradTop: { r: 100, g: 60, b: 190 },
  heroGradBottom: { r: 65, g: 40, b: 160 },
  heroTextWhite: '#FFFFFF',
  heroTextMuted: 'rgba(255,255,255,0.55)',
  heroTrack: 0x2D1B60,
  heroFill: 0xFFE44D,
  heroGlow: 0xFFFFFF,

  // Tab
  tabSelectedBg: 0xF97316,
  tabSelectedText: '#FFFFFF',
  tabUnselectedBg: 0xEBF0F7,
  tabUnselectedText: '#5B6B7E',

  // 卡片
  cardBgTop: { r: 20, g: 55, b: 75 },
  cardBgBottom: { r: 12, g: 35, b: 55 },
  cardLockedBg: 0xE2E6EC,
  cardLockedAlpha: 0.6,
  cardLockedBorder: 0xC8CED6,

  // 稀有度
  rarityN: 0x9AA0A6,
  rarityR: 0x5BA0E8,
  raritySR: 0xA855F7,
  raritySSR: 0xFBBF24,
  ssrGlow: 0xFFD700,

  // 文本
  textCardName: '#FFFFFF',
  textCardEn: 'rgba(255,255,255,0.45)',
  textLocked: '#A0A8B2',
  textStatsLabel: '#8A96A6',
  textStatsValue: '#1A2332',

  // Stats
  statsCardBg: 0xFFFFFF,
  statsCardBorder: 0xE4ECF4,
};

// ============================================================
// 英文名 fallback map（不改 catalog 结构）
// ============================================================
const EN_NAMES: Record<string, string> = {
  'fish_001': 'Crucian Carp',
  'fish_002': 'Common Carp',
  'fish_003': 'Tilapia',
  'fish_004': 'Grass Carp',
  'fish_005': 'Catfish',
  'fish_006': 'Big Carp',
  'fish_007': 'Snakehead',
  'fish_008': 'Bass',
  'fish_009': 'Gold Crucian',
  'rare_001': 'Koi',
  'rare_002': 'Giant Grass Carp',
  'rare_003': 'Arowana',
  'rare_004': 'Golden Koi',
  'weird_001': 'Old Sock',
  'weird_002': 'Sandal',
  'weird_003': 'Branch',
  'weird_004': 'Underwear',
  'weird_005': 'Crab',
  'weird_006': 'Turtle',
  'legend_001': 'Diamond Ring',
  'legend_002': 'Mystery Chest',
};

// ============================================================
// 统一布局常量（参考图节奏：顶部轻 / Hero 强 / Tab 清晰 / Grid 最强 / Stats 最弱）
// ============================================================
const L = {
  // --- 页面 ---
  pageInsetX: 24,
  pageBottomSafe: 28,

  // --- TopBar ---
  topBarY: 56,
  topBarBottom: 72,

  // --- Section 间距 ---
  gapTopBarToHero: 18,
  gapHeroToTabs: 18,
  gapTabsToGrid: 18,
  gapGridToStats: 18,

  // --- Hero 主视觉卡 ---
  heroWidth: 702,
  heroHeight: 140,
  heroRadius: 24,
  heroPadX: 22,
  heroPadTop: 18,
  heroPadBottom: 18,

  // --- Tab 胶囊 ---
  tabHeight: 38,
  tabW: 82,
  tabGap: 14,
  tabRadius: 19,

  // --- Grid 卡片 ---
  cardWidth: 160,
  cardHeight: 204,
  cardCols: 2,
  cardColGap: 14,
  cardRowGap: 16,
  cardRadius: 20,

  // --- 卡片内部 ---
  cardEmojiSize: 64,
  cardEmojiY: -28,
  cardNameY: 36,
  cardNameFontSize: 16,
  cardEnY: 56,
  cardEnFontSize: 10,
  cardCatchFontSize: 10,

  // --- 稀有度角标 ---
  rarityBadgeW: 30,
  rarityBadgeH: 16,
  rarityBadgeR: 8,
  rarityFontSize: 9,
  rarityBadgeX: 14,
  rarityBadgeY: 14,

  // --- Stats ---
  statsTotalW: 702,
  statsCardH: 60,
  statsCardGap: 14,
  statsCardR: 16,
};

// ============================================================
// 布局计算：section bottom 推导
// ============================================================
function getSectionY() {
  const heroTop = L.topBarBottom + L.gapTopBarToHero;
  const heroBottom = heroTop + L.heroHeight;
  const tabTop = heroBottom + L.gapHeroToTabs;
  const tabBottom = tabTop + L.tabHeight;
  const gridTop = tabBottom + L.gapTabsToGrid;
  return { heroTop, heroBottom, tabTop, tabBottom, gridTop };
}

// ============================================================
// Tab 配置
// ============================================================
type TabDef = {
  key: CollectionCategory | 'all';
  label: string;
};

const TABS: TabDef[] = [
  { key: 'all', label: '全部' },
  { key: 'fish', label: '普通' },
  { key: 'rare', label: '稀缺' },
  { key: 'weird', label: '离谱' },
];

// ============================================================
// CollectionScene
// ============================================================
export class CollectionScene extends Phaser.Scene {
  private currentTab: CollectionCategory | 'all' = 'all';
  private tabButtons: Array<{ bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }> = [];

  // 单实例 section 容器
  private bgLayer: Phaser.GameObjects.Container | null = null;
  private topBarContainer: Phaser.GameObjects.Container | null = null;
  private heroSectionContainer: Phaser.GameObjects.Container | null = null;
  private tabSectionContainer: Phaser.GameObjects.Container | null = null;
  private gridSectionContainer: Phaser.GameObjects.Container | null = null;
  private statsSectionContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('CollectionScene');
  }

  create() {
    const width = this.scale.width as number;
    const height = this.scale.height as number;
    const cx = width / 2;

    const sy = getSectionY();

    // === 1. bgLayer ===
    this.renderBgLayer(cx, height / 2, width, height);

    // === 2. topBarContainer ===
    this.renderTopBar(cx, width);

    // === 3. heroSectionContainer ===
    this.renderHeroSection(cx, sy.heroTop);

    // === 4. tabSectionContainer ===
    this.renderTabSection(cx, sy.tabTop);

    // === 5. gridSectionContainer ===
    this.renderGridSection(cx, sy.gridTop);

    // === 6. statsSectionContainer ===
    this.renderStatsSection(cx, sy.gridTop);
  }

  // ============================================================
  // 1. bgLayer
  // ============================================================
  private renderBgLayer(cx: number, cy: number, w: number, h: number) {
    this.bgLayer = this.add.container(0, 0);
    this.bgLayer.add(this.add.rectangle(cx, cy, w, h, C.pageBg));
  }

  // ============================================================
  // 2. topBarContainer（轻量产品导航）
  // ============================================================
  private renderTopBar(cx: number, width: number) {
    this.topBarContainer = this.add.container(0, 0);

    const y = L.topBarY;
    const btnX = L.pageInsetX + 20;
    const btnR = 20;

    // 返回按钮（浅蓝圆形，轻填充）
    const backBg = this.add.graphics();
    backBg.fillStyle(C.backBtnBg, 1);
    backBg.fillCircle(btnX, y, btnR);
    backBg.lineStyle(1, C.backBtnStroke, 0.5);
    backBg.strokeCircle(btnX, y, btnR);
    this.topBarContainer.add(backBg);

    this.topBarContainer.add(this.add.text(btnX, y + 1, '‹', {
      fontSize: '22px',
      color: '#' + C.backBtnArrow.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
    }).setOrigin(0.5));

    const backHit = this.add.rectangle(btnX, y, 44, 44, 0x000000, 0);
    backHit.setInteractive({ useHandCursor: true });
    backHit.on('pointerdown', () => {
      this.scene.start('MainScene');
    });
    this.topBarContainer.add(backHit);

    // 标题（居中，深蓝灰）
    this.topBarContainer.add(this.add.text(cx, y + 1, '图鉴', {
      fontSize: '20px',
      color: C.titleText,
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // 右侧占位（保证标题真居中）
    const rightPlaceholder = this.add.rectangle(width - L.pageInsetX - 20, y, 40, 40, 0x000000, 0);
    this.topBarContainer.add(rightPlaceholder);

    // 极轻分隔线
    const divider = this.add.graphics();
    divider.fillStyle(C.topBarDivider, 0.4);
    divider.fillRect(0, L.topBarBottom, width, 1);
    this.topBarContainer.add(divider);
  }

  // ============================================================
  // 3. heroSectionContainer（紫色大圆角主视觉卡）
  // ============================================================
  private renderHeroSection(cx: number, heroTopY: number) {
    if (this.heroSectionContainer) {
      this.heroSectionContainer.destroy(true);
    }
    this.heroSectionContainer = this.add.container(0, 0);

    const w = L.heroWidth;
    const h = L.heroHeight;
    const y = heroTopY + h / 2;
    const r = L.heroRadius;
    const cardLeft = cx - w / 2;
    const padX = L.heroPadX;

    // 卡片背景（紫色渐变，更大圆角）
    const cardBg = this.add.graphics();
    const gradTop = new Phaser.Display.Color(C.heroGradTop.r, C.heroGradTop.g, C.heroGradTop.b);
    const gradBot = new Phaser.Display.Color(C.heroGradBottom.r, C.heroGradBottom.g, C.heroGradBottom.b);
    const steps = 10;
    const stepH = h / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(gradTop, gradBot, 1, t);
      const color = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
      cardBg.fillStyle(color, 1);
      cardBg.fillRoundedRect(cardLeft, y - h / 2 + i * stepH, w, stepH + 1, r);
    }
    cardBg.fillRoundedRect(cardLeft, y - h / 2, w, h, r);
    this.heroSectionContainer.add(cardBg);

    // 装饰 orb（右上柔光，轻量不抢）
    const orb = this.add.graphics();
    orb.fillStyle(C.heroGlow, 0.05);
    orb.fillCircle(cardLeft + w - 40, y - h * 0.22, 95);
    this.heroSectionContainer.add(orb);

    const orb2 = this.add.graphics();
    orb2.fillStyle(C.heroFill, 0.03);
    orb2.fillCircle(cardLeft + w - 60, y - h * 0.12, 65);
    this.heroSectionContainer.add(orb2);

    const summary = CollectionManager.getSummary();

    // Progress 小字（左上）
    this.heroSectionContainer.add(this.add.text(cardLeft + padX, y - h / 2 + L.heroPadTop, `Progress ${summary.unlocked}/${summary.total}`, {
      fontSize: '11px',
      color: C.heroTextMuted,
      fontStyle: 'bold',
      letterSpacing: '0.5px',
    }).setOrigin(0, 0));

    // 主标题（更大更粗，居中偏上）
    this.heroSectionContainer.add(this.add.text(cx, y - 18, '揭开水底世界的秘密', {
      fontSize: '26px',
      color: C.heroTextWhite,
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // 进度条（加厚，更饱满）
    const barW = w - padX * 2;
    const barH = 12;
    const barY = y + 20;
    const barX = cardLeft + padX;

    this.heroSectionContainer.add(this.add.graphics()
      .fillStyle(C.heroTrack, 1)
      .fillRoundedRect(barX, barY - barH / 2, barW, barH, 6));

    const fillW = barW * (summary.percentage / 100);
    if (fillW > 0) {
      this.heroSectionContainer.add(this.add.graphics()
        .fillStyle(C.heroFill, 1)
        .fillRoundedRect(barX, barY - barH / 2, fillW, barH, 6));
    }

    // 底部左右说明（统一内边距）
    const bottomY = barY + barH / 2 + L.heroPadBottom - 4;
    this.heroSectionContainer.add(this.add.text(barX, bottomY, `收集进度 ${summary.percentage}%`, {
      fontSize: '11px',
      color: C.heroTextMuted,
    }).setOrigin(0, 0));

    this.heroSectionContainer.add(this.add.text(barX + barW, bottomY, '🏆 成就徽章', {
      fontSize: '11px',
      color: C.heroTextMuted,
    }).setOrigin(1, 0));
  }

  // ============================================================
  // 4. tabSectionContainer（圆润胶囊筛选器）
  // ============================================================
  private renderTabSection(cx: number, tabTopY: number) {
    if (this.tabSectionContainer) {
      this.tabSectionContainer.destroy(true);
    }
    this.tabSectionContainer = this.add.container(0, 0);

    const tabH = L.tabHeight;
    const tabW = L.tabW;
    const gap = L.tabGap;
    const y = tabTopY + tabH / 2;
    const totalW = tabW * TABS.length + gap * (TABS.length - 1);
    const startX = cx - totalW / 2 + tabW / 2;

    this.tabButtons = [];

    TABS.forEach((tab, idx) => {
      const x = startX + idx * (tabW + gap);
      const isSelected = tab.key === this.currentTab;

      const bg = this.add.graphics();
      bg.fillStyle(isSelected ? C.tabSelectedBg : C.tabUnselectedBg, 1);
      bg.fillRoundedRect(x - tabW / 2, y - tabH / 2, tabW, tabH, L.tabRadius);
      this.tabSectionContainer.add(bg);

      const text = this.add.text(x, y, tab.label, {
        fontSize: '14px',
        color: isSelected ? C.tabSelectedText : C.tabUnselectedText,
        fontStyle: isSelected ? 'bold' : 'normal',
      }).setOrigin(0.5);
      this.tabSectionContainer.add(text);

      const hit = this.add.rectangle(x, y, tabW + 6, tabH + 4, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.switchTab(tab.key));
      this.tabSectionContainer.add(hit);

      this.tabButtons.push({ bg, text });
    });
  }

  // ============================================================
  // 5. gridSectionContainer（双列图鉴卡片网格）
  // ============================================================
  private renderGridSection(cx: number, gridTopY: number) {
    if (this.gridSectionContainer) {
      this.gridSectionContainer.destroy(true);
    }
    this.gridSectionContainer = this.add.container(0, 0);

    const items = this.getTabItems();
    const cardW = L.cardWidth;
    const cardH = L.cardHeight;
    const colGap = L.cardColGap;
    const rowGap = L.cardRowGap;
    const cols = L.cardCols;
    const totalW = cardW * cols + colGap * (cols - 1);
    const startX = cx - totalW / 2 + cardW / 2;
    const startY = gridTopY + cardH / 2;

    items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + colGap);
      const y = startY + row * (cardH + rowGap);
      this.gridSectionContainer!.add(this.createCollectionCard(x, y, item));
    });
  }

  // ============================================================
  // 6. statsSectionContainer（底部统计卡）
  // ============================================================
  private renderStatsSection(cx: number, gridTopY: number) {
    if (this.statsSectionContainer) {
      this.statsSectionContainer.destroy(true);
    }
    this.statsSectionContainer = this.add.container(0, 0);

    // 计算 grid 底部 Y
    const items = this.getTabItems();
    const rowCount = Math.ceil(items.length / L.cardCols);
    const gridBottomY = gridTopY + rowCount * (L.cardHeight + L.cardRowGap);

    const topY = gridBottomY + L.gapGridToStats;
    const y = topY + L.statsCardH / 2;
    const totalW = L.statsTotalW;
    const cardGap = L.statsCardGap;
    const cardW = (totalW - cardGap) / 2;
    const cardH = L.statsCardH;

    const summary = CollectionManager.getSummary();
    const allItems = CollectionManager.getItemsByCategory('fish')
      .concat(CollectionManager.getItemsByCategory('rare'))
      .concat(CollectionManager.getItemsByCategory('weird'))
      .concat(CollectionManager.getItemsByCategory('legend'));
    const rareUnlocked = allItems.filter(item =>
      item.progress?.unlocked && (item.rarity === 'SR' || item.rarity === 'SSR')
    ).length;
    const rareTotal = allItems.filter(item =>
      item.rarity === 'SR' || item.rarity === 'SSR'
    ).length;

    // 左卡：已解锁品种
    this.statsSectionContainer.add(this.createStatsCard(
      cx - cardW / 2 - cardGap / 2, y, cardW, cardH,
      '🐟', '已解锁品种', `${summary.unlocked}/${summary.total}`,
    ));

    // 右卡：稀有收集度
    this.statsSectionContainer.add(this.createStatsCard(
      cx + cardW / 2 + cardGap / 2, y, cardW, cardH,
      '⭐', '稀有收集度', `${rareUnlocked}/${rareTotal}`,
    ));
  }

  /** 创建统计卡（轻量融入整页） */
  private createStatsCard(x: number, y: number, w: number, h: number, icon: string, label: string, value: string): Phaser.GameObjects.Container {
    const card = this.add.container(x, y);

    // 卡片背景（更轻的蓝白底，弱化存在感）
    const cardBg = this.add.graphics();
    cardBg.fillStyle(C.statsCardBg, 0.85);
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, L.statsCardR);
    cardBg.lineStyle(0.5, C.statsCardBorder, 0.4);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, L.statsCardR);
    card.add(cardBg);

    // 图标
    card.add(this.add.text(-w / 2 + 16, y, icon, {
      fontSize: '20px',
    }).setOrigin(0, 0.5));

    // 标签
    card.add(this.add.text(-w / 2 + 42, y - 10, label, {
      fontSize: '10px',
      color: C.textStatsLabel,
    }).setOrigin(0, 0.5));

    // 数值
    card.add(this.add.text(-w / 2 + 42, y + 12, value, {
      fontSize: '20px',
      color: C.textStatsValue,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5));

    return card;
  }

  // ============================================================
  // Tab 切换（只重建 grid + stats）
  // ============================================================
  private switchTab(category: CollectionCategory | 'all') {
    if (category === this.currentTab) return;
    this.currentTab = category;

    // 更新 Tab 选中态
    this.tabButtons.forEach((tab, index) => {
      const isSelected = TABS[index].key === this.currentTab;
      tab.bg.clear();
      tab.bg.fillStyle(isSelected ? C.tabSelectedBg : C.tabUnselectedBg, 1);
      tab.bg.fillRoundedRect(-L.tabW / 2, -L.tabHeight / 2, L.tabW, L.tabHeight, L.tabRadius);
      tab.text.setColor(isSelected ? C.tabSelectedText : C.tabUnselectedText);
      tab.text.setFontStyle(isSelected ? 'bold' : 'normal');
      tab.text.setFontSize('14px');
    });

    // 重建 grid + stats
    const cx = this.scale.width as number / 2;
    const sy = getSectionY();
    this.renderGridSection(cx, sy.gridTop);
    this.renderStatsSection(cx, sy.gridTop);
  }

  // ============================================================
  // 数据方法（不动业务逻辑）
  // ============================================================
  private getTabItems() {
    if (this.currentTab === 'all') {
      return CollectionManager.getItemsByCategory('fish')
        .concat(CollectionManager.getItemsByCategory('rare'))
        .concat(CollectionManager.getItemsByCategory('weird'))
        .concat(CollectionManager.getItemsByCategory('legend'));
    }
    return CollectionManager.getItemsByCategory(this.currentTab as CollectionCategory);
  }

  // ============================================================
  // 统一卡片模板
  // ============================================================
  private createCollectionCard(
    x: number,
    y: number,
    item: ReturnType<typeof CollectionManager.getItemsByCategory>[number],
  ): Phaser.GameObjects.Container {
    const card = this.add.container(x, y);
    const isUnlocked = item.progress?.unlocked ?? false;

    if (isUnlocked) {
      this.populateUnlockedCard(card, item);
    } else {
      this.populateLockedCard(card, item);
    }
    return card;
  }

  /** 已解锁卡（深海收藏卡） */
  private populateUnlockedCard(
    card: Phaser.GameObjects.Container,
    item: ReturnType<typeof CollectionManager.getItemsByCategory>[number],
  ): void {
    const w = L.cardWidth;
    const h = L.cardHeight;

    // cardBg（深海蓝绿渐变，更大圆角）
    const cardBg = this.add.graphics();
    const topC = new Phaser.Display.Color(C.cardBgTop.r, C.cardBgTop.g, C.cardBgTop.b);
    const bottomC = new Phaser.Display.Color(C.cardBgBottom.r, C.cardBgBottom.g, C.cardBgBottom.b);
    const steps = 8;
    const stepH = h / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(topC, bottomC, 1, t);
      cardBg.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
      cardBg.fillRoundedRect(-w / 2, -h / 2 + i * stepH, w, stepH + 1, L.cardRadius);
    }
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, L.cardRadius);
    cardBg.lineStyle(1.5, this.getRarityColor(item.rarity), 0.7);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, L.cardRadius);
    card.add(cardBg);

    // SSR/SR 额外发光
    if (item.rarity === 'SSR') {
      const glow = this.add.graphics();
      glow.fillStyle(C.ssrGlow, 0.12);
      glow.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, L.cardRadius + 2);
      card.addAt(glow, 0);
    } else if (item.rarity === 'SR') {
      const glow = this.add.graphics();
      glow.fillStyle(C.raritySR, 0.07);
      glow.fillRoundedRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2, L.cardRadius + 1);
      card.addAt(glow, 0);
    }

    // rarityStarGroup（精致角标，右上）
    const rx = w / 2 - L.rarityBadgeX;
    const ry = -h / 2 + L.rarityBadgeY;
    const rarityBg = this.add.graphics();
    rarityBg.fillStyle(this.getRarityColor(item.rarity), 0.95);
    rarityBg.fillRoundedRect(rx - L.rarityBadgeW / 2, ry - L.rarityBadgeH / 2, L.rarityBadgeW, L.rarityBadgeH, L.rarityBadgeR);
    card.add(rarityBg);
    card.add(this.add.text(rx, ry, item.rarity, {
      fontSize: `${L.rarityFontSize}px`,
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // contentFrame（emoji 主体，更大更聚焦）
    card.add(this.add.text(0, L.cardEmojiY, item.emoji, {
      fontSize: `${L.cardEmojiSize}px`,
    }).setOrigin(0.5));

    // nameCn（中文名，更醒目）
    card.add(this.add.text(0, L.cardNameY, item.name, {
      fontSize: `${L.cardNameFontSize}px`,
      color: C.textCardName,
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // nameEn（英文名，副标题感，更弱）
    const enName = EN_NAMES[item.id] ?? 'UNKNOWN SPECIES';
    card.add(this.add.text(0, L.cardEnY, enName, {
      fontSize: `${L.cardEnFontSize}px`,
      color: C.textCardEn,
    }).setOrigin(0.5));

    // 捕获次数
    if (item.progress && item.progress.catchCount > 1) {
      card.add(this.add.text(0, h / 2 - 14, `×${item.progress.catchCount}`, {
        fontSize: `${L.cardCatchFontSize}px`,
        color: 'rgba(255,255,255,0.4)',
      }).setOrigin(0.5));
    }
  }

  /** 未解锁卡（封存中的收藏位） */
  private populateLockedCard(
    card: Phaser.GameObjects.Container,
    item: ReturnType<typeof CollectionManager.getItemsByCategory>[number],
  ): void {
    const w = L.cardWidth;
    const h = L.cardHeight;

    // cardBg（雾灰底，像待解锁收藏位）
    const cardBg = this.add.graphics();
    cardBg.fillStyle(C.cardLockedBg, C.cardLockedAlpha);
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, L.cardRadius);
    cardBg.lineStyle(1, C.cardLockedBorder, 0.4);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, L.cardRadius);
    card.add(cardBg);

    // rarityStarGroup（灰化角标，与已解锁卡同位置）
    const rx = w / 2 - L.rarityBadgeX;
    const ry = -h / 2 + L.rarityBadgeY;
    const rarityBg = this.add.graphics();
    rarityBg.fillStyle(C.rarityN, 0.3);
    rarityBg.fillRoundedRect(rx - L.rarityBadgeW / 2, ry - L.rarityBadgeH / 2, L.rarityBadgeW, L.rarityBadgeH, L.rarityBadgeR);
    card.add(rarityBg);
    card.add(this.add.text(rx, ry, item.rarity, {
      fontSize: `${L.rarityFontSize}px`,
      color: 'rgba(255,255,255,0.3)',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // lock icon（柔和，不抢眼）
    card.add(this.add.text(0, L.cardEmojiY, '🔒', {
      fontSize: '40px',
    }).setOrigin(0.5).setAlpha(0.28));

    // ???（轻量）
    card.add(this.add.text(0, L.cardNameY, '???', {
      fontSize: `${L.cardNameFontSize}px`,
      color: C.textLocked,
    }).setOrigin(0.5).setAlpha(0.5));

    // 英文占位（更淡）
    card.add(this.add.text(0, L.cardEnY, 'UNKNOWN SPECIES', {
      fontSize: `${L.cardEnFontSize}px`,
      color: 'rgba(154,161,170,0.35)',
    }).setOrigin(0.5));
  }

  private getRarityColor(rarity: CollectionRarity): number {
    switch (rarity) {
      case 'SSR': return C.raritySSR;
      case 'SR': return C.raritySR;
      case 'R': return C.rarityR;
      default: return C.rarityN;
    }
  }
}
