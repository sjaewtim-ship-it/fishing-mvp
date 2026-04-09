/**
 * 图鉴页 Scene（页面内容流重建版）
 *
 * 职责：
 * - 渲染产品化图鉴页面
 * - 渲染分类 Tab（全部/普通/稀缺/离谱）
 * - 渲染双列图鉴卡片网格
 * - 处理 Tab 切换
 * - 返回首页
 *
 * 不负责：
 * - 不存储图鉴数据
 * - 不修改图鉴进度
 * - 不改变业务逻辑
 */

import Phaser from 'phaser';
import { CollectionManager } from '../managers/CollectionManager';
import type { CollectionCategory } from '../data/collectionCatalog';

// ==================================================
// 页面内容流 LayoutSpec
// 所有 section 的 Y 都从上一个 section 的 bottom 推出
// ==================================================
const SPEC = {
  // === 页面边距 ===
  pageInsetX: 24,            // 页面左右安全边距
  topBarY: 56,               // 顶栏中心 Y
  topBarBottom: 70,          // 顶栏底部 Y（固定值）

  // === Section 间距 ===
  gapTopToHero: 20,          // topBar 底 → hero 顶
  gapHeroToTab: 20,          // hero 底 → tab 顶
  gapTabToGrid: 24,          // tab 底 → grid 顶
  gapGridToStats: 28,        // grid 底 → stats 顶
  gapBottomSafe: 40,         // stats 底 → 页面底

  // === Hero 主卡 ===
  heroWidth: 380,
  heroHeight: 130,
  heroRadius: 20,
  heroPadX: 20,              // hero 内部水平内边距

  // === Tab 组 ===
  tabHeight: 32,
  tabW: 72,
  tabGap: 10,

  // === Grid 卡片 ===
  cardWidth: 156,
  cardHeight: 180,
  cardCols: 2,
  cardColGap: 14,
  cardRowGap: 16,

  // === Stats 卡 ===
  statsWidth: 336,           // 两张 stats 卡总宽度
  statsCardHeight: 64,
  statsCardGap: 16,
};

// Tab 配置
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

// 卡片配置（引用 SPEC）
const CARD = {
  width: SPEC.cardWidth,
  height: SPEC.cardHeight,
  cols: SPEC.cardCols,
  colGap: SPEC.cardColGap,
  rowGap: SPEC.cardRowGap,
};

export class CollectionScene extends Phaser.Scene {
  private currentTab: CollectionCategory | 'all' = 'all';
  private tabButtons: Array<{ bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }> = [];

  // 单实例 section 容器
  private heroContainer: Phaser.GameObjects.Container | null = null;
  private tabContainer: Phaser.GameObjects.Container | null = null;
  private gridContainer: Phaser.GameObjects.Container | null = null;
  private statsContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('CollectionScene');
  }

  create() {
    const width = this.scale.width as number;
    const height = this.scale.height as number;
    const centerX = width / 2;

    // 1. 背景层
    this.renderBgLayer(width, height, centerX);

    // 2. 顶栏
    this.renderTopBar(centerX, width);

    // 3. 页面内容流：从 topBarBottom 开始流式下推
    let y = SPEC.topBarBottom + SPEC.gapTopToHero;
    y = this.renderHeroSection(centerX, y);
    y = this.renderTabSection(centerX, y);
    y = this.renderGridSection(centerX, y);
    this.renderStatsSection(centerX, y);
  }

  // ==================================================
  // 1. bgLayer - 页面底色
  // ==================================================
  private renderBgLayer(width: number, height: number, centerX: number) {
    this.add.rectangle(centerX, height / 2, width, height, 0xEEF8FF);
  }

  // ==================================================
  // 2. topBar - 返回 + 标题
  // ==================================================
  private renderTopBar(centerX: number, width: number) {
    const y = SPEC.topBarY;
    const backBtnX = SPEC.pageInsetX + 18;

    // 返回按钮
    const backBtn = this.add.graphics();
    backBtn.fillStyle(0xF0F4F8, 1);
    backBtn.fillCircle(backBtnX, y, 16);
    backBtn.lineStyle(1, 0xC8D0D8, 0.6);
    backBtn.strokeCircle(backBtnX, y, 16);

    this.add.text(backBtnX, y + 1, '‹', {
      fontSize: '20px',
      color: '#5A6A80',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const backHit = this.add.rectangle(backBtnX, y, 40, 40, 0x000000, 0);
    backHit.setInteractive({ useHandCursor: true });
    backHit.on('pointerdown', () => {
      this.scene.start('MainScene');
    });

    // 标题
    this.add.text(centerX, y + 1, '图鉴', {
      fontSize: '20px',
      color: '#1A1A2E',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 极轻底部分隔
    const divider = this.add.graphics();
    divider.fillStyle(0xE8ECF0, 0.5);
    divider.fillRect(0, SPEC.topBarBottom, width, 1);
  }

  // ==================================================
  // 3. heroSection - 进度主卡（topBar 下第一主块）
  // 返回 heroBottomY
  // ==================================================
  private renderHeroSection(centerX: number, topY: number): number {
    if (this.heroContainer) {
      this.heroContainer.destroy(true);
    }
    this.heroContainer = this.add.container(0, 0);

    const w = SPEC.heroWidth;
    const h = SPEC.heroHeight;
    const y = topY + h / 2;
    const r = SPEC.heroRadius;
    const padX = SPEC.heroPadX;

    // 卡片背景（紫色渐变）
    const cardBg = this.add.graphics();
    const gradTop = new Phaser.Display.Color(120, 80, 220);
    const gradBottom = new Phaser.Display.Color(80, 60, 180);
    const steps = 8;
    const stepH = h / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(gradTop, gradBottom, 1, t);
      const color = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
      cardBg.fillStyle(color, 1);
      cardBg.fillRect(centerX - w / 2, y - h / 2 + i * stepH, w, stepH + 1);
    }
    cardBg.fillRoundedRect(centerX - w / 2, y - h / 2, w, h, r);
    this.heroContainer.add(cardBg);

    const summary = CollectionManager.getSummary();

    // Progress 小字
    this.heroContainer.add(this.add.text(centerX - w / 2 + padX, y - h / 2 + 14, `Progress ${summary.unlocked}/${summary.total}`, {
      fontSize: '12px',
      color: 'rgba(255,255,255,0.65)',
    }).setOrigin(0, 0));

    // 主标题
    this.heroContainer.add(this.add.text(centerX, y - 14, '揭开水底世界的秘密', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // 进度条
    const barW = w - padX * 2;
    const barH = 8;
    const barY = y + 18;
    const barX = centerX - barW / 2;
    this.heroContainer.add(this.add.rectangle(centerX, barY, barW, barH, 0x3A2870).setOrigin(0.5));

    const fillW = barW * (summary.percentage / 100);
    if (fillW > 0) {
      this.heroContainer.add(this.add.rectangle(barX + fillW / 2, barY, fillW, barH, 0xFFD700).setOrigin(0.5));
    }

    // 底部辅助文字
    this.heroContainer.add(this.add.text(centerX - barW / 2, barY + 18, `收集进度 ${summary.percentage}%`, {
      fontSize: '11px',
      color: 'rgba(255,255,255,0.55)',
    }).setOrigin(0, 0));

    this.heroContainer.add(this.add.text(centerX + barW / 2, barY + 18, '🏆 成就徽章', {
      fontSize: '11px',
      color: 'rgba(255,255,255,0.55)',
    }).setOrigin(1, 0));

    return topY + h;
  }

  // ==================================================
  // 4. tabSection - 分类切换（独立 section）
  // 返回 tabBottomY
  // ==================================================
  private renderTabSection(centerX: number, topY: number): number {
    if (this.tabContainer) {
      this.tabContainer.destroy(true);
    }
    this.tabContainer = this.add.container(0, 0);

    const tabH = SPEC.tabHeight;
    const tabW = SPEC.tabW;
    const gap = SPEC.tabGap;
    const y = topY + tabH / 2;
    const totalW = tabW * TABS.length + gap * (TABS.length - 1);
    const startX = centerX - totalW / 2 + tabW / 2;

    this.tabButtons = [];

    TABS.forEach((tab, idx) => {
      const x = startX + idx * (tabW + gap);
      const isSelected = tab.key === this.currentTab;

      const bg = this.add.graphics();
      bg.fillStyle(isSelected ? 0xFF6B6B : 0xE8F0FE, 1);
      bg.fillRoundedRect(x - tabW / 2, y - tabH / 2, tabW, tabH, 16);
      this.tabContainer.add(bg);

      const text = this.add.text(x, y, tab.label, {
        fontSize: '14px',
        color: isSelected ? '#FFFFFF' : '#5A6A80',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.tabContainer.add(text);

      const hit = this.add.rectangle(x, y, tabW, tabH, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.switchTab(tab.key));
      this.tabContainer.add(hit);

      this.tabButtons.push({ bg, text });
    });

    return topY + tabH;
  }

  // ==================================================
  // 5. gridSection - 双列图鉴卡片网格
  // 返回 gridBottomY
  // ==================================================
  private renderGridSection(centerX: number, topY: number): number {
    if (this.gridContainer) {
      this.gridContainer.destroy(true);
    }
    this.gridContainer = this.add.container(0, 0);

    const items = this.getTabItems();
    const { width: cardW, height: cardH, colGap, rowGap, cols } = CARD;
    const totalW = cardW * cols + colGap * (cols - 1);
    const startX = centerX - totalW / 2 + cardW / 2;
    const startY = topY + cardH / 2;

    items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + colGap);
      const y = startY + row * (cardH + rowGap);
      this.gridContainer!.add(this.createCollectionCard(x, y, item));
    });

    const rowCount = Math.ceil(items.length / cols);
    return topY + rowCount * (cardH + rowGap);
  }

  // ==================================================
  // 6. statsSection - 底部统计（pageContent 最后一层）
  // ==================================================
  private renderStatsSection(centerX: number, gridBottomY: number) {
    if (this.statsContainer) {
      this.statsContainer.destroy(true);
    }
    this.statsContainer = this.add.container(0, 0);

    const topY = gridBottomY + SPEC.gapGridToStats;
    const y = topY + SPEC.statsCardHeight / 2;
    const cardH = SPEC.statsCardHeight;
    const totalW = SPEC.statsWidth;
    const cardW = (totalW - SPEC.statsCardGap) / 2;
    const gap = SPEC.statsCardGap;

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

    // 左卡
    const leftX = centerX - cardW / 2 - gap / 2;
    const leftCard = this.add.graphics();
    leftCard.fillStyle(0xffffff, 0.85);
    leftCard.fillRoundedRect(leftX - cardW / 2, y - cardH / 2, cardW, cardH, 14);
    leftCard.lineStyle(0.5, 0xE0E8F0, 0.5);
    leftCard.strokeRoundedRect(leftX - cardW / 2, y - cardH / 2, cardW, cardH, 14);
    this.statsContainer.add(leftCard);

    this.statsContainer.add(this.add.text(leftX, y - 10, '🐟 已解锁品种', {
      fontSize: '12px',
      color: '#8A96A6',
    }).setOrigin(0.5));

    this.statsContainer.add(this.add.text(leftX, y + 14, `${summary.unlocked}`, {
      fontSize: '24px',
      color: '#1A1A2E',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // 右卡
    const rightX = centerX + cardW / 2 + gap / 2;
    const rightCard = this.add.graphics();
    rightCard.fillStyle(0xffffff, 0.85);
    rightCard.fillRoundedRect(rightX - cardW / 2, y - cardH / 2, cardW, cardH, 14);
    rightCard.lineStyle(0.5, 0xE0E8F0, 0.5);
    rightCard.strokeRoundedRect(rightX - cardW / 2, y - cardH / 2, cardW, cardH, 14);
    this.statsContainer.add(rightCard);

    this.statsContainer.add(this.add.text(rightX, y - 10, '⭐ 稀有收集度', {
      fontSize: '12px',
      color: '#8A96A6',
    }).setOrigin(0.5));

    this.statsContainer.add(this.add.text(rightX, y + 14, `${rareUnlocked}/${rareTotal}`, {
      fontSize: '24px',
      color: '#1A1A2E',
      fontStyle: 'bold',
    }).setOrigin(0.5));
  }

  // ==================================================
  // Tab 切换（只重建 grid + stats）
  // ==================================================
  private switchTab(category: CollectionCategory | 'all') {
    if (category === this.currentTab) return;
    this.currentTab = category;

    // 更新 Tab 选中态（不重建容器）
    this.tabButtons.forEach((tab, index) => {
      const isSelected = TABS[index].key === this.currentTab;
      tab.bg.clear();
      tab.bg.fillStyle(isSelected ? 0xFF6B6B : 0xE8F0FE, 1);
      tab.bg.fillRoundedRect(-SPEC.tabW / 2, -SPEC.tabHeight / 2, SPEC.tabW, SPEC.tabHeight, 16);
      tab.text.setColor(isSelected ? '#FFFFFF' : '#5A6A80');
    });

    // 只重建 grid + stats（使用与 create 相同的流式推导）
    const width = this.scale.width as number;
    const centerX = width / 2;

    const tabBottomY = SPEC.topBarBottom + SPEC.gapTopToHero + SPEC.heroHeight + SPEC.gapHeroToTab + SPEC.tabHeight;
    const gridBottomY = this.renderGridSection(centerX, tabBottomY + SPEC.gapTabToGrid);
    this.renderStatsSection(centerX, gridBottomY);
  }

  // ==================================================
  // 数据方法（不碰业务逻辑）
  // ==================================================
  private getTabItems() {
    if (this.currentTab === 'all') {
      return CollectionManager.getItemsByCategory('fish')
        .concat(CollectionManager.getItemsByCategory('rare'))
        .concat(CollectionManager.getItemsByCategory('weird'))
        .concat(CollectionManager.getItemsByCategory('legend'));
    }
    return CollectionManager.getItemsByCategory(this.currentTab as CollectionCategory);
  }

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
      this.populateLockedCard(card);
    }
    return card;
  }

  private populateUnlockedCard(
    card: Phaser.GameObjects.Container,
    item: ReturnType<typeof CollectionManager.getItemsByCategory>[number],
  ): void {
    const { width: w, height: h } = CARD;

    // 卡片背景
    const cardBg = this.add.graphics();
    const topC = new Phaser.Display.Color(30, 50, 80);
    const bottomC = new Phaser.Display.Color(20, 35, 60);
    const steps = 6;
    const stepH = h / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(topC, bottomC, 1, t);
      cardBg.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      cardBg.fillRect(-w / 2, -h / 2 + i * stepH, w, stepH + 1);
    }
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    cardBg.lineStyle(1.5, this.getRarityColor(item.rarity), 0.6);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    card.add(cardBg);

    // SSR 发光
    if (item.rarity === 'SSR') {
      const glow = this.add.graphics();
      glow.fillStyle(0xFFD700, 0.08);
      glow.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 16);
      card.addAt(glow, 0);
    }

    // 稀有度角标
    const rx = w / 2 - 22;
    const ry = -h / 2 + 16;
    const rarityBg = this.add.graphics();
    rarityBg.fillStyle(this.getRarityColor(item.rarity), 0.9);
    rarityBg.fillRoundedRect(rx - 16, ry - 8, 32, 16, 8);
    card.add(rarityBg);
    card.add(this.add.text(rx, ry, item.rarity, {
      fontSize: '10px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // Emoji
    card.add(this.add.text(0, -16, item.emoji, { fontSize: '52px' }).setOrigin(0.5));

    // 中文名
    card.add(this.add.text(0, 36, item.name, {
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // 捕获次数
    if (item.progress && item.progress.catchCount > 1) {
      card.add(this.add.text(0, 56, `x${item.progress.catchCount}`, {
        fontSize: '11px',
        color: 'rgba(255,255,255,0.5)',
      }).setOrigin(0.5));
    }
  }

  private populateLockedCard(card: Phaser.GameObjects.Container): void {
    const { width: w, height: h } = CARD;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0xD8DCE2, 0.5);
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    cardBg.lineStyle(1, 0xC0C4CC, 0.3);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    card.add(cardBg);

    card.add(this.add.text(0, -10, '🔒', { fontSize: '40px' }).setOrigin(0.5).setAlpha(0.4));
    card.add(this.add.text(0, 36, '???', {
      fontSize: '14px',
      color: '#9AA1AA',
    }).setOrigin(0.5));
  }

  private getRarityColor(rarity: string): number {
    switch (rarity) {
      case 'SSR': return 0xFFD700;
      case 'SR': return 0xB47CFF;
      case 'R': return 0x4FA6F8;
      default: return 0x9AA0A6;
    }
  }
}
