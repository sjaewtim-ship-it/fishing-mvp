/**
 * 任务页 Scene（结构重建版）
 *
 * 职责：
 * - 展示每日任务 / 成长任务列表
 * - 支持任务领取
 * - 支持"去完成"引导返回首页
 *
 * 不负责：
 * - 不修改任务数据逻辑
 * - 不重写 DailyMissionManager / GrowthMissionManager
 */

import Phaser from 'phaser';
import { DailyMissionManager, type DailyTask } from '../DailyMissionManager';
import { GrowthMissionManager, type GrowthTask } from '../GrowthMissionManager';
import { CoinManager } from '../CoinManager';
import { SaveSync } from '../SaveSync';
import { SimpleAudio } from '../SimpleAudio';
import { formatWeight, formatTaskWeightProgress } from '../DropGenerator';

// ==================================================
// 页面内容流 LayoutSpec
// ==================================================
const SPEC = {
  // === 页面边距 ===
  pageInsetX: 24,
  topBarY: 56,
  topBarBottom: 70,

  // === Section 间距 ===
  gapTopToTab: 16,
  gapTabToHero: 20,
  gapHeroToList: 20,
  gapListBottom: 40,

  // === Tab ===
  tabHeight: 36,
  tabW: 120,
  tabGap: 12,

  // === Hero 主卡 ===
  heroWidth: 380,
  heroHeight: 110,
  heroRadius: 16,

  // === 任务卡 ===
  taskCardWidth: 702,       // 750 - 24*2
  taskCardHeight: 80,
  taskCardGap: 10,
  taskCardRadius: 12,
  taskCardPadX: 16,

  // === 进度条 ===
  progressWidth: 140,
  progressHeight: 8,
  progressRadius: 4,

  // === 按钮 ===
  btnWidth: 72,
  btnHeight: 32,
  btnRadius: 8,
};

// 任务卡状态
type TaskState = 'progressing' | 'claimable' | 'claimed';

export class TaskScene extends Phaser.Scene {
  private activeTab: 'daily' | 'growth' = 'daily';
  private taskButtons: Array<{ taskId: string; bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; state: TaskState }> = [];

  // 单实例 section 容器
  private topBarContainer: Phaser.GameObjects.Container | null = null;
  private tabContainer: Phaser.GameObjects.Container | null = null;
  private heroContainer: Phaser.GameObjects.Container | null = null;
  private listContainer: Phaser.GameObjects.Container | null = null;

  // 滚动相关（成长任务）
  private scrollOffset = 0;
  private isDragging = false;
  private dragStartY = 0;
  private lastScrollOffset = 0;

  constructor() {
    super('TaskScene');
  }

  create() {
    const width = this.scale.width as number;
    const height = this.scale.height as number;
    const centerX = width / 2;

    DailyMissionManager.instance.init();

    // 1. 背景
    this.add.rectangle(centerX, height / 2, width, height, 0xF0F4F8);

    // 2. 顶栏
    this.renderTopBar(centerX, width);

    // 3. 页面内容流
    let y = SPEC.topBarBottom + SPEC.gapTopToTab;
    y = this.renderTabSection(centerX, y);
    y = this.renderHeroSection(centerX, y);
    this.renderListSection(centerX, y, width);

    // 4. 滚动支持（成长任务）
    this.setupScrolling(width, height, centerX);
  }

  // ==================================================
  // 1. topBar - 轻量产品顶栏
  // ==================================================
  private renderTopBar(centerX: number, width: number) {
    this.topBarContainer = this.add.container(0, 0);

    const y = SPEC.topBarY;
    const backBtnX = SPEC.pageInsetX + 18;

    // 返回按钮
    const backBtn = this.add.graphics();
    backBtn.fillStyle(0xE8ECF0, 1);
    backBtn.fillCircle(backBtnX, y, 16);
    backBtn.lineStyle(1, 0xC8D0D8, 0.5);
    backBtn.strokeCircle(backBtnX, y, 16);
    this.topBarContainer.add(backBtn);

    this.topBarContainer.add(this.add.text(backBtnX, y + 1, '‹', {
      fontSize: '20px',
      color: '#5A6A80',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    const backHit = this.add.rectangle(backBtnX, y, 40, 40, 0x000000, 0);
    backHit.setInteractive({ useHandCursor: true });
    backHit.on('pointerdown', () => {
      SimpleAudio.click();
      this.scene.start('MainScene');
    });
    this.topBarContainer.add(backHit);

    // 标题
    this.topBarContainer.add(this.add.text(centerX, y + 1, '任务', {
      fontSize: '20px',
      color: '#1A1A2E',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // 极轻底部分隔
    const divider = this.add.graphics();
    divider.fillStyle(0xE0E4E8, 0.6);
    divider.fillRect(0, SPEC.topBarBottom, width, 1);
    this.topBarContainer.add(divider);
  }

  // ==================================================
  // 2. tabSection - 分类切换
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
    const totalW = tabW * 2 + gap;
    const startX = centerX - totalW / 2 + tabW / 2;

    const tabs = [
      { key: 'daily' as const, label: '每日任务', active: this.activeTab === 'daily' },
      { key: 'growth' as const, label: '成长任务', active: this.activeTab === 'growth' },
    ];

    tabs.forEach((tab) => {
      const x = startX + (tab.key === 'daily' ? 0 : tabW + gap);

      const bg = this.add.graphics();
      bg.fillStyle(tab.active ? 0x4FA6F8 : 0xE8ECF0, 1);
      bg.fillRoundedRect(x - tabW / 2, y - tabH / 2, tabW, tabH, 18);
      this.tabContainer.add(bg);

      const text = this.add.text(x, y, tab.label, {
        fontSize: '14px',
        color: tab.active ? '#FFFFFF' : '#6B7A8D',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.tabContainer.add(text);

      const hit = this.add.rectangle(x, y, tabW, tabH, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        SimpleAudio.click();
        this.activeTab = tab.key;
        this.updateTabState();
        this.rebuildListSection();
      });
      this.tabContainer.add(hit);
    });

    return topY + tabH;
  }

  // ==================================================
  // 3. heroSection - 任务主题卡
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

    // 卡片背景（蓝紫渐变）
    const cardBg = this.add.graphics();
    const gradTop = new Phaser.Display.Color(100, 80, 200);
    const gradBottom = new Phaser.Display.Color(70, 60, 160);
    const steps = 6;
    const stepH = h / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(gradTop, gradBottom, 1, t);
      cardBg.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      cardBg.fillRect(centerX - w / 2, y - h / 2 + i * stepH, w, stepH + 1);
    }
    cardBg.fillRoundedRect(centerX - w / 2, y - h / 2, w, h, r);
    this.heroContainer.add(cardBg);

    // 根据 tab 切换文案
    const isDaily = this.activeTab === 'daily';
    const eyebrow = isDaily ? "TODAY'S GOAL" : 'GROWTH MISSION';
    const title = isDaily ? '活跃度奖励' : '成长目标';
    const sub = isDaily ? '完成每日任务，领取额外奖励' : '持续推进，解锁更多进度奖励';

    // Eyebrow
    this.heroContainer.add(this.add.text(centerX - w / 2 + 16, y - h / 2 + 12, eyebrow, {
      fontSize: '10px',
      color: 'rgba(255,255,255,0.6)',
      fontStyle: 'bold',
    }).setOrigin(0, 0));

    // 主标题
    this.heroContainer.add(this.add.text(centerX, y - 8, title, {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // 副标题
    this.heroContainer.add(this.add.text(centerX, y + 22, sub, {
      fontSize: '13px',
      color: 'rgba(255,255,255,0.7)',
    }).setOrigin(0.5));

    return topY + h;
  }

  // ==================================================
  // 4. listSection - 任务列表
  // ==================================================
  private renderListSection(centerX: number, topY: number, width: number) {
    if (this.listContainer) {
      this.listContainer.destroy(true);
    }
    this.listContainer = this.add.container(0, 0);
    this.taskButtons = [];
    this.scrollOffset = 0;

    // 遮罩
    const listMaskY = topY;
    const listMaskH = this.scale.height as number - topY - SPEC.gapListBottom;
    const mask = this.add.rectangle(centerX, listMaskY + listMaskH / 2, width, listMaskH, 0x000000, 0);
    this.listContainer.setMask(mask.createGeometryMask());

    const tasks = this.getTabTasks();
    const cardW = SPEC.taskCardWidth;
    const cardH = SPEC.taskCardHeight;
    const gap = SPEC.taskCardGap;

    tasks.forEach((task, index) => {
      const y = topY + index * (cardH + gap) + cardH / 2;
      this.renderTaskCard(centerX, y, cardW, task);
    });
  }

  /**
   * 重建列表 section（tab 切换 / 领取后调用）
   */
  private rebuildListSection() {
    const width = this.scale.width as number;
    const centerX = width / 2;

    // 更新 hero 文案
    const heroBottomY = SPEC.topBarBottom + SPEC.gapTopToTab + SPEC.tabHeight + SPEC.gapTabToHero + SPEC.heroHeight;
    this.renderHeroSection(centerX, SPEC.topBarBottom + SPEC.gapTopToTab + SPEC.tabHeight + SPEC.gapTabToHero);

    // 重建列表
    const listTopY = heroBottomY + SPEC.gapHeroToList;
    this.renderListSection(centerX, listTopY, width);
  }

  /**
   * 渲染单张任务卡（统一模板）
   */
  private renderTaskCard(centerX: number, y: number, cardW: number, task: DailyTask | GrowthTask) {
    if (!this.listContainer) return;

    const cardH = SPEC.taskCardHeight;
    const padX = SPEC.taskCardPadX;
    const isDaily = this.activeTab === 'daily';

    const isCompleted = task.progress >= task.target;
    const isClaimed = task.claimed;
    let state: TaskState = 'progressing';
    if (isClaimed) state = 'claimed';
    else if (isCompleted) state = 'claimable';

    // 卡片背景
    const cardBg = this.add.graphics();
    const bgColor = state === 'claimed' ? 0xF5F6F8 : 0xFFFFFF;
    cardBg.fillStyle(bgColor, 1);
    cardBg.fillRoundedRect(centerX - cardW / 2, y - cardH / 2, cardW, cardH, SPEC.taskCardRadius);
    cardBg.lineStyle(1, state === 'claimed' ? 0xE8ECF0 : 0xE0E4E8);
    cardBg.strokeRoundedRect(centerX - cardW / 2, y - cardH / 2, cardW, cardH, SPEC.taskCardRadius);
    this.listContainer.add(cardBg);

    // 图标
    const iconX = centerX - cardW / 2 + padX + 14;
    this.listContainer.add(this.add.text(iconX, y - 4, this.getTaskIcon(task.id), {
      fontSize: '24px',
    }).setOrigin(0.5));

    // 标题
    const titleX = iconX + 18;
    this.listContainer.add(this.add.text(titleX, y - 16, task.title, {
      fontSize: '14px',
      color: state === 'claimed' ? '#9AA1A6' : '#333333',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5));

    // 进度文字
    const progressText = this.getProgressText(task);
    this.listContainer.add(this.add.text(titleX, y + 4, progressText, {
      fontSize: '11px',
      color: '#999999',
    }).setOrigin(0, 0.5));

    // 进度条
    const progress = Math.min(1, task.progress / task.target);
    const barW = SPEC.progressWidth;
    const barX = centerX + 20;
    const barY = y + 4;

    this.listContainer.add(this.add.graphics()
      .fillStyle(0xF0F2F5, 1)
      .fillRoundedRect(barX - barW / 2, barY - SPEC.progressHeight / 2, barW, SPEC.progressHeight, SPEC.progressRadius)
      .lineStyle(1, 0xE6E8EB)
      .strokeRoundedRect(barX - barW / 2, barY - SPEC.progressHeight / 2, barW, SPEC.progressHeight, SPEC.progressRadius));

    const fillW = barW * progress;
    if (fillW > 0) {
      const fillColor = state === 'claimable' ? 0x5FA9F9 : 0x4FA6F8;
      this.listContainer.add(this.add.graphics()
        .fillStyle(fillColor, 1)
        .fillRoundedRect(barX - barW / 2, barY - SPEC.progressHeight / 2, fillW, SPEC.progressHeight, SPEC.progressRadius));
    }

    // 奖励标签
    const rewardText = isDaily ? '🪙 +50' : this.getGrowthRewardText(task as GrowthTask);
    this.listContainer.add(this.add.text(barX + barW / 2 + 12, barY, rewardText, {
      fontSize: '12px',
      color: '#D4A017',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5));

    // 按钮
    const btnX = centerX + cardW / 2 - SPEC.btnWidth / 2 - 16;
    const btnY = y;
    const btnColor = this.getBtnColor(state);
    const btnText = this.getBtnText(state);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(btnColor, 1);
    btnBg.fillRoundedRect(btnX - SPEC.btnWidth / 2, btnY - SPEC.btnHeight / 2, SPEC.btnWidth, SPEC.btnHeight, SPEC.btnRadius);
    this.listContainer.add(btnBg);

    const btnTextObj = this.add.text(btnX, btnY, btnText, {
      fontSize: '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.listContainer.add(btnTextObj);

    // 点击事件
    this.taskButtons.push({ taskId: task.id, bg: btnBg as any, text: btnTextObj, state });

    if (state === 'claimable') {
      const hit = this.add.rectangle(btnX, btnY, SPEC.btnWidth, SPEC.btnHeight, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (isDaily) {
          this.onClaimTaskReward(task.id);
        } else {
          this.onClaimGrowthReward(task.id);
        }
      });
      this.listContainer.add(hit);
    } else if (state === 'progressing') {
      const hit = this.add.rectangle(btnX, btnY, SPEC.btnWidth, SPEC.btnHeight, 0x000000, 0);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        SimpleAudio.click();
        this.scene.start('MainScene');
      });
      this.listContainer.add(hit);
    }
  }

  // ==================================================
  // 滚动支持（成长任务）
  // ==================================================
  private setupScrolling(width: number, height: number, centerX: number) {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activeTab === 'growth' && this.listContainer) {
        this.isDragging = true;
        this.dragStartY = pointer.y;
        this.lastScrollOffset = this.scrollOffset;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.activeTab === 'growth' && this.isDragging && this.listContainer) {
        const deltaY = pointer.y - this.dragStartY;
        if (Math.abs(deltaY) < 5) return;

        this.scrollOffset = this.lastScrollOffset + deltaY;

        const tasks = this.getTabTasks();
        const contentHeight = tasks.length * (SPEC.taskCardHeight + SPEC.taskCardGap);
        const listMaskH = height - (SPEC.topBarBottom + SPEC.gapTopToTab + SPEC.tabHeight + SPEC.gapTabToHero + SPEC.heroHeight + SPEC.gapHeroToList) - SPEC.gapListBottom;
        const maxScroll = 0;
        const minScroll = Math.min(0, listMaskH - contentHeight - 40);

        this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, minScroll, maxScroll);
        this.listContainer.setY(this.scrollOffset);
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  // ==================================================
  // Tab 状态更新（只更新选中态，不重建容器）
  // ==================================================
  private updateTabState() {
    if (!this.tabContainer) return;
    // 简单重建 tab 即可
    const width = this.scale.width as number;
    const centerX = width / 2;
    const tabTopY = SPEC.topBarBottom + SPEC.gapTopToTab;
    this.renderTabSection(centerX, tabTopY);
  }

  // ==================================================
  // 数据方法
  // ==================================================
  private getTabTasks(): Array<DailyTask | GrowthTask> {
    if (this.activeTab === 'daily') {
      return DailyMissionManager.instance.getTasks();
    }
    GrowthMissionManager.instance.init();
    GrowthMissionManager.instance.syncAllTasks();
    return GrowthMissionManager.instance.getTasks();
  }

  private getTaskIcon(taskId: string): string {
    const map: Record<string, string> = {
      'cast_5': '🎣', 'cast_3': '🎣',
      'success_3': '🐟', 'success_2': '🐟',
      'quality_1': '⭐',
      'growth_cast_10': '🎣', 'growth_cast_30': '🎣',
      'growth_collection_3': '📖',
      'growth_success_5': '🐟', 'growth_success_10': '🐟',
      'growth_weight_10kg': '⚖️', 'growth_weight_50kg': '⚖️', 'growth_weight_100kg': '⚖️',
      'growth_bigfish_1kg': '🐠', 'growth_bigfish_3kg': '🐠',
      'weight_1000': '⚖️', 'weight_3000': '⚖️',
    };
    return map[taskId] || '📋';
  }

  private getProgressText(task: DailyTask | GrowthTask): string {
    const isWeightTask = task.id.startsWith('weight_') || task.id.startsWith('growth_weight_');
    const isBigFishTask = task.id.startsWith('growth_bigfish_');

    if (isWeightTask) {
      return formatTaskWeightProgress(task.progress, task.target);
    }
    if (isBigFishTask) {
      const thresholdGrams = (task as any).thresholdGrams ?? 0;
      if (task.progress >= task.target) return '✓';
      if (thresholdGrams > 0) return `未达标/${formatWeight(thresholdGrams)}`;
    }
    return `${task.progress}/${task.target}`;
  }

  private getGrowthRewardText(task: GrowthTask): string {
    const type = task.reward?.type ?? 'coin';
    const amount = task.reward?.amount ?? 0;
    return type === 'coin' ? `🪙 +${amount}` : `⚡ +${amount}`;
  }

  private getBtnColor(state: TaskState): number {
    switch (state) {
      case 'claimable': return 0x4FA6F8;
      case 'claimed': return 0xC8CCD2;
      default: return 0x6BA3F8;
    }
  }

  private getBtnText(state: TaskState): string {
    switch (state) {
      case 'claimable': return '领取';
      case 'claimed': return '已领';
      default: return '去完成';
    }
  }

  // ==================================================
  // 领取逻辑
  // ==================================================
  private onClaimTaskReward(taskId: string) {
    SimpleAudio.unlock();
    SimpleAudio.click();

    const claimed = DailyMissionManager.instance.claimTaskReward(taskId);
    if (claimed) {
      CoinManager.instance.addCoins(50);
      SaveSync.save();
      this.rebuildListSection();
    }
  }

  private onClaimGrowthReward(taskId: string) {
    SimpleAudio.unlock();
    SimpleAudio.click();

    const claimed = GrowthMissionManager.instance.claimTaskReward(taskId);
    if (claimed) {
      this.rebuildListSection();
    }
  }
}
