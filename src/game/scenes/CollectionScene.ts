/**
 * 图鉴页 Scene
 * 
 * 职责：
 * - 渲染图鉴总览
 * - 渲染 4 个分类 Tab
 * - 渲染当前 Tab 的图鉴卡片
 * - 处理 Tab 切换
 * - 返回首页
 * 
 * 不负责：
 * - 不存储图鉴数据
 * - 不修改图鉴进度
 */

import Phaser from 'phaser';
import { CollectionManager } from '../managers/CollectionManager';
import type { CollectionCategory } from '../data/collectionCatalog';

// 布局常量（抽离 magic number）
const L = {
  headerY: 52,
  tabsY: 170,
  containerTop: 192,  // 与 tabBottom 对齐 (tabsY + tabHeight/2)
  containerHeight: 648,  // 减少 44px，补偿上移
  cardsStartY: 281,  // tabBottom + rowGap + cardHeight/2 = 192 + 14 + 75
};

type TabConfig = {
  key: CollectionCategory;
  label: string;
};

type TabButton = {
  key: CollectionCategory;
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
};

const TABS: TabConfig[] = [
  { key: 'fish', label: '普通鱼' },
  { key: 'rare', label: '稀有鱼' },
  { key: 'weird', label: '离谱物' },
  { key: 'legend', label: '传说' },
];

export class CollectionScene extends Phaser.Scene {
  private currentTab: CollectionCategory = 'fish';
  private tabButtons: TabButton[] = [];
  private cardContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('CollectionScene');
  }

  create() {
    const width = this.scale.width as number;
    const height = this.scale.height as number;
    const centerX = width / 2;

    // 背景
    this.add.rectangle(centerX, height / 2, width, height, 0xF5F6F8);

    // 渲染各区域（注意顺序：ContentContainer 先画，Tabs/Cards 后画）
    this.renderHeader(centerX);
    this.renderEmptyHint(centerX);
    this.renderContentContainer(centerX);
    this.renderTabs(centerX, L.tabsY);
    this.renderCards(centerX, L.cardsStartY);
    this.renderBackButton(centerX, height - 80);
  }

  /**
   * 渲染头部总览
   */
  private renderHeader(centerX: number) {
    const summary = CollectionManager.getSummary();

    // Header 背景（白底 + 圆角）
    const headerBg = this.add.rectangle(centerX, L.headerY, 700, 88, 0xffffff);
    headerBg.setOrigin(0.5);

    // 标题
    this.add.text(centerX, L.headerY - 20, '📖 钓鱼图鉴', {
      fontSize: '26px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 收集进度文字
    this.add.text(centerX, L.headerY + 10, `已收集 ${summary.unlocked} / ${summary.total}`, {
      fontSize: '16px',
      color: '#666666',
    }).setOrigin(0.5);

    // 进度条（符合 UI Design System：宽度 702，左对齐增长）
    const progressBarWidth = 702;
    const progressBarHeight = 8;
    const progressBarY = L.headerY + 38;
    const startX = centerX - progressBarWidth / 2;

    // 进度条轨道（浅灰）
    this.add.rectangle(centerX, progressBarY, progressBarWidth, progressBarHeight, 0xE8ECF1);

    // 进度条填充（主色，按百分比从左侧增长）
    const fillWidth = progressBarWidth * (summary.percentage / 100);
    this.add.rectangle(startX + fillWidth / 2, progressBarY, fillWidth, progressBarHeight, 0x4FA6F8);
  }

  /**
   * 渲染空进度提示
   */
  private renderEmptyHint(centerX: number) {
    const summary = CollectionManager.getSummary();
    
    if (summary.unlocked === 0) {
      this.add.text(centerX, 110, '先去钓一条鱼，图鉴就会开始解锁', {
        fontSize: '14px',
        color: '#999999',
        fontStyle: 'italic',
      }).setOrigin(0.5);
    }
  }

  /**
   * 渲染内容容器（白色主容器）
   */
  private renderContentContainer(centerX: number) {
    const containerY = L.containerTop + L.containerHeight / 2;
    const containerBg = this.add.rectangle(centerX, containerY, 702, L.containerHeight, 0xFFFFFF);
    containerBg.setOrigin(0.5);
    containerBg.setStrokeStyle(1, 0xEEF1F4);
  }

  /**
   * 渲染 Tab
   */
  private renderTabs(centerX: number, y: number) {
    const tabWidth = 150;
    const tabHeight = 44;
    const gap = 12;
    const totalWidth = tabWidth * 4 + gap * 3;
    const startX = centerX - totalWidth / 2 + tabWidth / 2;

    TABS.forEach((tab, index) => {
      const x = startX + index * (tabWidth + gap);
      const isSelected = tab.key === this.currentTab;

      // Tab 背景
      const bgColor = isSelected ? 0x4FA6F8 : 0xF2F4F7;
      const textColor = isSelected ? '#FFFFFF' : '#505866';

      const bg = this.add.rectangle(x, y, tabWidth, tabHeight, bgColor);
      bg.setInteractive({ useHandCursor: true });
      bg.setDepth(100);  // 确保 Tab 在最上层

      // Tab 文字
      const text = this.add.text(x, y, tab.label, {
        fontSize: '16px',
        color: textColor,
        fontStyle: 'bold',
      }).setOrigin(0.5);
      text.setDepth(100);  // 确保 Tab 文字在最上层

      // 保存到 tabButtons 数组
      this.tabButtons.push({
        key: tab.key,
        bg,
        text,
      });

      // 点击事件
      bg.on('pointerdown', () => {
        this.switchTab(tab.key);
      });
    });
  }

  /**
   * 切换 Tab
   */
  private switchTab(category: CollectionCategory) {
    if (category === this.currentTab) return;

    this.currentTab = category;

    // 更新 Tab 样式
    this.tabButtons.forEach((tab) => {
      // 防御性检查
      if (!tab.bg || !tab.text) return;

      const isSelected = tab.key === this.currentTab;
      const bgColor = isSelected ? 0x4FA6F8 : 0xF2F4F7;
      const textColor = isSelected ? '#FFFFFF' : '#505866';

      tab.bg.setFillStyle(bgColor);
      tab.text.setColor(textColor);
    });

    // 重新渲染卡片
    this.renderCards(this.scale.width as number / 2, L.cardsStartY);
  }

  /**
   * 渲染卡片网格
   */
  private renderCards(centerX: number, startY: number) {
    // 清除旧卡片（true = 递归销毁子元素）
    if (this.cardContainer) {
      this.cardContainer.destroy(true);
    }

    this.cardContainer = this.add.container(0, 0);

    const items = CollectionManager.getItemsByCategory(this.currentTab);

    const cardWidth = 150;
    const cardHeight = 150;
    const cols = 4;
    const colGap = 12;
    const rowGap = 14;
    const totalWidth = cardWidth * cols + colGap * (cols - 1);
    const startX = centerX - totalWidth / 2 + cardWidth / 2;

    items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardWidth + colGap);
      const y = startY + row * (cardHeight + rowGap);

      const isUnlocked = item.progress?.unlocked ?? false;

      // ========== 创建卡片容器（每张卡独立 container） ==========
      const card = this.add.container(x, y);

      // ========== 卡片背景 ==========
      const bgColor = isUnlocked ? 0xFFFFFF : 0xE8EAEF;
      const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, bgColor);
      if (isUnlocked) {
        bg.setStrokeStyle(2, this.getRarityStrokeColor(item.rarity));
      } else {
        bg.setStrokeStyle(1, 0xD8DCE2);
      }

      // ========== Emoji（视觉中心） ==========
      const emojiText = isUnlocked ? item.emoji : '?';
      const emoji = this.add.text(0, -34, emojiText, {
        fontSize: '56px',
      }).setOrigin(0.5);
      if (!isUnlocked) {
        emoji.setColor('#B0B4BC');
      }

      // ========== 名称 ==========
      const nameText = isUnlocked ? item.name : '???';
      const name = this.add.text(0, 8, nameText, {
        fontSize: '13px',
        color: isUnlocked ? '#2F3440' : '#9AA1AA',
        fontStyle: isUnlocked ? 'bold' : 'normal',
      }).setOrigin(0.5);

      // ========== Rarity Badge ==========
      const rarityText = isUnlocked ? item.rarity : '???';
      const rarityBgColor = isUnlocked ? this.getRarityBgColor(item.rarity) : 0xC8CCD2;
      const rarityBg = this.add.rectangle(0, 34, 48, 20, rarityBgColor);
      const rarity = this.add.text(0, 34, rarityText, {
        fontSize: '11px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // ========== 将所有元素加入卡片容器 ==========
      card.add([bg, emoji, name, rarityBg, rarity]);

      // ========== CatchCount（仅已解锁，必须加入卡片容器） ==========
      if (isUnlocked && item.progress && item.progress.catchCount > 0) {
        const count = this.add.text(0, 56, `x${item.progress.catchCount}`, {
          fontSize: '11px',
          color: '#9AA1AA',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        card.add(count);
      }

      // ========== 将卡片容器加入总容器 ==========
      this.cardContainer.add(card);
    });

    this.add.existing(this.cardContainer);
  }

  /**
   * 获取稀有度背景色
   */
  private getRarityBgColor(rarity: string): number {
    switch (rarity) {
      case 'SSR': return 0xF5B800;  // 金色
      case 'SR': return 0xB47CFF;   // 紫色
      case 'R': return 0x4FA6F8;    // 蓝色
      default: return 0x9AA0A6;     // 灰色
    }
  }

  /**
   * 获取稀有度描边颜色
   */
  private getRarityStrokeColor(rarity: string): number {
    switch (rarity) {
      case 'SSR': return 0xF5B800;  // 金色
      case 'SR': return 0xB47CFF;   // 紫色
      case 'R': return 0x4FA6F8;    // 蓝色
      default: return 0x9AA0A6;     // 灰色
    }
  }

  /**
   * 渲染返回按钮
   */
  private renderBackButton(centerX: number, y: number) {
    const btnWidth = 180;
    const btnHeight = 44;

    const bg = this.add.rectangle(centerX, y, btnWidth, btnHeight, 0xE5E7EB);
    bg.setInteractive({ useHandCursor: true });

    this.add.text(centerX, y, '返回首页', {
      fontSize: '20px',
      color: '#374151',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      this.scene.start('MainScene');
    });
  }
}
