/**
 * 任务页 Scene
 *
 * 职责：
 * - 展示完整"今日任务"列表
 * - 展示任务进度和奖励
 * - 支持一键领取奖励
 * - 支持"去完成"引导
 * - 返回首页
 *
 * 不负责：
 * - 不修改任务数据逻辑
 * - 不重写 DailyMissionManager
 */

import Phaser from 'phaser';
import { DailyMissionManager, type DailyTask } from '../DailyMissionManager';
import { GrowthMissionManager, type GrowthTask } from '../GrowthMissionManager';
import { CoinManager } from '../CoinManager';
import { SaveSync } from '../SaveSync';
import { SimpleAudio } from '../SimpleAudio';

// ==================================================
// 布局常量
// ==================================================
const LAYOUT_SPEC = {
  pagePadding: 24,
  headerHeight: 88,
  tabHeight: 54,
  tabY: 112,
  listTopY: 200,              // 任务列表起始 Y（略向上移，给底部留更多空间）
  listBottomY: 1100,
  footerHeight: 100,
};

const TASK_CARD = {
  height: 120,
  gap: 12,
  radius: 12,
  paddingX: 20,
  iconSize: 36,
};

const PROGRESS_BAR = {
  width: 140,
  height: 12,                  // 略减高度，更精致
  radius: 6,
};

type TaskButton = {
  taskId: string;
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  state: 'todo' | 'claimable' | 'claimed';
};

export class TaskScene extends Phaser.Scene {
  private taskButtons: TaskButton[] = [];
  private taskListContainer: Phaser.GameObjects.Container | null = null;  // 任务列表容器
  private tabsContainer: Phaser.GameObjects.Container | null = null;      // Tab 头部容器
  private claimAllButton: Phaser.GameObjects.Container | null = null;
  private claimAllText: Phaser.GameObjects.Text | null = null;
  private activeTab: 'daily' | 'growth' = 'daily';  // 当前激活的 Tab

  constructor() {
    super('TaskScene');
  }

  create() {
    const width = this.scale.width as number;
    const height = this.scale.height as number;
    const centerX = width / 2;

    DailyMissionManager.instance.init();

    // 背景
    this.add.rectangle(centerX, height / 2, width, height, 0xF5F6F8);

    // 创建任务列表容器（用于管理任务卡对象）
    this.taskListContainer = this.add.container(0, 0);
    this.taskListContainer.setDepth(10);

    // 创建 Tab 头部容器（用于管理 Tab 按钮）
    this.tabsContainer = this.add.container(0, 0);
    this.tabsContainer.setDepth(11);

    // 渲染各区域
    this.renderHeader(centerX);
    this.renderTabs(centerX);
    this.renderTaskList(centerX);
    this.renderFooter(centerX);
  }

  // ==================================================
  // 1. 顶部栏
  // ==================================================
  private renderHeader(centerX: number) {
    const headerBg = this.add.rectangle(centerX, LAYOUT_SPEC.headerHeight / 2, 750, LAYOUT_SPEC.headerHeight, 0xFFFFFF);
    headerBg.setStrokeStyle(1, 0xEEF1F4);

    // 返回按钮
    const backBtn = this.add.rectangle(60, LAYOUT_SPEC.headerHeight / 2, 88, 44, 0xF2F4F7);
    backBtn.setInteractive({ useHandCursor: true });
    this.add.text(60, LAYOUT_SPEC.headerHeight / 2, '← 返回', {
      fontSize: '16px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    backBtn.on('pointerdown', () => {
      SimpleAudio.click();
      this.scene.start('MainScene');
    });

    // 标题
    this.add.text(centerX, LAYOUT_SPEC.headerHeight / 2 - 6, '📋 任务', {
      fontSize: '24px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 副标题
    this.add.text(centerX, LAYOUT_SPEC.headerHeight / 2 + 22, '完成任务，领取奖励', {
      fontSize: '13px',
      color: '#999999',
    }).setOrigin(0.5);
  }

  // ==================================================
  // 2. Tab 区
  // ==================================================
  private renderTabs(centerX: number) {
    // 清除旧 Tab
    if (this.tabsContainer) {
      this.tabsContainer.removeAll(true);
    }

    const tabWidth = 150;
    const tabHeight = 44;
    const gap = 12;
    const totalWidth = tabWidth * 2 + gap;
    const startX = centerX - totalWidth / 2 + tabWidth / 2;

    const tabs = [
      { key: 'daily', label: '今日任务', active: this.activeTab === 'daily' },
      { key: 'growth', label: '成长任务', active: this.activeTab === 'growth' },
    ];

    tabs.forEach((tab, index) => {
      const x = startX + index * (tabWidth + gap);
      const y = LAYOUT_SPEC.tabY + tabHeight / 2;

      // Tab 背景
      const bgColor = tab.active ? 0x4FA6F8 : 0xF2F4F7;
      const textColor = tab.active ? '#FFFFFF' : '#666666';

      const bg = this.add.rectangle(x, y, tabWidth, tabHeight, bgColor);
      if (!tab.active) {
        bg.setAlpha(0.5);
      }

      // Tab 文字
      const text = this.add.text(x, y, tab.label, {
        fontSize: '16px',
        color: textColor,
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // 将 Tab 元素添加到 tabsContainer
      this.tabsContainer?.add([bg, text]);

      // Tab 点击事件
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        SimpleAudio.click();
        this.activeTab = tab.key as 'daily' | 'growth';
        this.refreshTabs();
        this.refreshTaskList();
        this.refreshFooter();
      });
    });
  }

  // ==================================================
  // 3. 任务列表区
  // ==================================================
  private renderTaskList(centerX: number) {
    // 清除旧列表容器
    if (this.taskListContainer) {
      this.taskListContainer.removeAll(true);
    }
    this.taskButtons = [];

    const pagePadding = LAYOUT_SPEC.pagePadding;
    const cardWidth = 750 - pagePadding * 2;

    // 根据 activeTab 选择数据源
    let tasks: DailyTask[] | GrowthTask[];
    if (this.activeTab === 'daily') {
      tasks = DailyMissionManager.instance.getTasks();
    } else {
      // 成长任务：先初始化，再同步所有任务进度
      GrowthMissionManager.instance.init();
      GrowthMissionManager.instance.syncAllTasks();
      tasks = GrowthMissionManager.instance.getTasks();
    }

    tasks.forEach((task, index) => {
      const y = LAYOUT_SPEC.listTopY + index * (TASK_CARD.height + TASK_CARD.gap);
      this.renderTaskCardToContainer(centerX, y, cardWidth, task);
    });
  }

  /**
   * 渲染任务卡到 container（用于 taskListContainer 管理）
   */
  private renderTaskCardToContainer(centerX: number, y: number, cardWidth: number, task: DailyTask | GrowthTask) {
    if (!this.taskListContainer) return;

    const pagePadding = LAYOUT_SPEC.pagePadding;
    const isCompleted = task.progress >= task.target;
    const isClaimed = task.claimed;

    // ========== 卡片背景（轻增强底板层级）==========
    const cardBg = this.add.rectangle(centerX, y, cardWidth, TASK_CARD.height, 0xFAFBFC);
    cardBg.setStrokeStyle(1, 0xE0E4E8);
    this.taskListContainer.add(cardBg);

    // ========== 第一层：标题层 ==========
    const iconX = pagePadding + TASK_CARD.iconSize / 2;
    const iconY = y - 8;
    const icon = this.add.text(iconX, iconY, this.getTaskIcon(task.id), {
      fontSize: `${TASK_CARD.iconSize}px`,
    }).setOrigin(0.5);
    this.taskListContainer.add(icon);

    const titleX = iconX + TASK_CARD.iconSize / 2 + 14;
    const titleText = this.add.text(titleX, iconY, task.title, {
      fontSize: '15px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.taskListContainer.add(titleText);

    const progressText = this.add.text(titleX, iconY + 16, `${task.progress}/${task.target}`, {
      fontSize: '12px',
      color: '#999999',
    }).setOrigin(0, 0.5);
    this.taskListContainer.add(progressText);

    // ========== 第二层：进度层 ==========
    const progressBarY = y + 24;
    const textAreaWidth = 220;
    const progressBarWidth = textAreaWidth;
    const progressBarX = pagePadding + progressBarWidth / 2;
    const progress = Math.min(1, task.progress / task.target);

    // 进度条背景（灰色底板）
    const barBg = this.add.rectangle(progressBarX, progressBarY, progressBarWidth, PROGRESS_BAR.height, 0xF0F2F5);
    barBg.setStrokeStyle(1, 0xE6E8EB);
    this.taskListContainer.add(barBg);

    // 进度条填充（从左向右增长）
    const fillWidth = progressBarWidth * progress;
    const barFill = this.add.rectangle(pagePadding + fillWidth / 2, progressBarY, fillWidth, PROGRESS_BAR.height, 0x5FA9F9);
    this.taskListContainer.add(barFill);

    // ========== 第三层：操作层 ==========
    const btnWidth = 76;
    const btnHeight = 34;
    const btnX = 750 - pagePadding - btnWidth / 2;
    const btnY = y + TASK_CARD.height / 2 - 6;

    let buttonState: 'todo' | 'claimable' | 'claimed' = 'todo';
    if (isClaimed) {
      buttonState = 'claimed';
    } else if (isCompleted) {
      buttonState = 'claimable';
    }

    const btnBg = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, this.getButtonColor(buttonState));
    btnBg.setStrokeStyle(1, 0xD0D5DB);
    this.taskListContainer.add(btnBg);

    const btnText = this.add.text(btnX, btnY, this.getButtonText(buttonState), {
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.taskListContainer.add(btnText);

    // 保存按钮引用
    this.taskButtons.push({
      taskId: task.id,
      bg: btnBg,
      text: btnText,
      state: buttonState,
    });

    // 点击事件
    if (this.activeTab === 'daily') {
      if (buttonState === 'claimable') {
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerdown', () => this.onClaimTaskReward(task.id));
      } else if (buttonState === 'todo') {
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerdown', () => {
          SimpleAudio.click();
          this.scene.start('MainScene');
        });
      }
    } else {
      // 成长任务分支
      if (buttonState === 'claimable') {
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerdown', () => this.onClaimGrowthReward(task.id));
      } else if (buttonState === 'todo') {
        // 未完成时，点击"去完成"返回首页
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.on('pointerdown', () => {
          SimpleAudio.click();
          this.scene.start('MainScene');
        });
      }
    }

    // 奖励标签（弱化前缀，强化奖励值）
    const rewardLabelX = pagePadding;
    const rewardLabelY = btnY;

    // 前缀弱化表达
    const rewardLabelPrefix = this.add.text(rewardLabelX, rewardLabelY, '奖励：', {
      fontSize: '12px',
      color: '#999999',
    }).setOrigin(0, 0.5);
    this.taskListContainer.add(rewardLabelPrefix);

    // 奖励值强化展示
    const rewardText = this.activeTab === 'daily'
      ? '🪙 +50'
      : this.getGrowthRewardText(task as GrowthTask);
    const rewardTextLabel = this.add.text(rewardLabelX + 38, rewardLabelY, rewardText, {
      fontSize: '14px',
      color: '#D4A017',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.taskListContainer.add(rewardTextLabel);
  }

  /**
   * 渲染任务卡（保留，供兼容使用）
   */
  private renderTaskCard(centerX: number, y: number, cardWidth: number, task: DailyTask | GrowthTask) {
    // 调用 renderTaskCardToContainer 实现
    this.renderTaskCardToContainer(centerX, y, cardWidth, task);
  }

  private getTaskIcon(taskId: string): string {
    // 今日任务图标
    const dailyIconMap: Record<string, string> = {
      'cast_3': '🎣',
      'success_2': '🐟',
      'quality_1': '⭐',
    };

    // 成长任务图标
    const growthIconMap: Record<string, string> = {
      'growth_cast_10': '🎣',
      'growth_collection_3': '⭐',
    };

    return dailyIconMap[taskId] || growthIconMap[taskId] || '📋';
  }

  /**
   * 获取成长任务奖励文字
   */
  private getGrowthRewardText(task: GrowthTask): string {
    // 防御性兜底：即使 reward 缺失也不报错
    const rewardType = task.reward?.type ?? 'coin';
    const rewardAmount = task.reward?.amount ?? 0;

    if (rewardType === 'coin') {
      return `🪙 +${rewardAmount}`;
    } else {
      return `⚡ +${rewardAmount}`;
    }
  }

  private getButtonColor(state: 'todo' | 'claimable' | 'claimed'): number {
    switch (state) {
      case 'claimable': return 0x5FA9F9;  // 蓝色可领取（亮蓝）
      case 'claimed': return 0xB0B5BD;    // 灰色已领取（柔和灰）
      default: return 0x6BA3F8;            // 浅蓝去完成（柔和蓝）
    }
  }

  private getButtonText(state: 'todo' | 'claimable' | 'claimed'): string {
    switch (state) {
      case 'claimable': return '领取';
      case 'claimed': return '已领';
      default: return '去完成';
    }
  }

  // ==================================================
  // 4. 底部操作区
  // ==================================================
  private renderFooter(centerX: number) {
    const footerY = 1200;

    // 根据 activeTab 区分显示
    if (this.activeTab === 'daily') {
      // 今日任务 tab：保留一键领取逻辑
      const tasks = DailyMissionManager.instance.getTasks();
      const hasClaimable = tasks.some(t => t.progress >= t.target && !t.claimed);

      if (hasClaimable) {
        // 一键领取按钮
        const btnWidth = 280;
        const btnHeight = 50;

        const btnBg = this.add.rectangle(centerX, footerY, btnWidth, btnHeight, 0x4FA6F8);
        btnBg.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(centerX, footerY, '🎁 一键领取全部奖励', {
          fontSize: '18px',
          color: '#FFFFFF',
          fontStyle: 'bold',
        }).setOrigin(0.5);

        this.claimAllButton = this.add.container(0, 0);
        this.claimAllButton.add([btnBg, btnText]);
        this.claimAllText = btnText;

        btnBg.on('pointerdown', () => this.onClaimAllRewards());
      } else {
        // 引导文案
        const guideText = this.add.text(centerX, footerY, '继续钓鱼，完成更多任务', {
          fontSize: '14px',
          color: '#999999',
          fontStyle: 'italic',
        }).setOrigin(0.5);

        // 点击引导文案返回首页
        guideText.setInteractive({ useHandCursor: true });
        guideText.on('pointerdown', () => {
          SimpleAudio.click();
          this.scene.start('MainScene');
        });
      }
    } else {
      // 成长任务 tab：只显示静态引导文案
      const guideText = this.add.text(centerX, footerY - 8, '持续钓鱼，完成更多成长目标', {
        fontSize: '14px',
        color: '#8A8F98',
      }).setOrigin(0.5);

      // 点击引导文案返回首页
      guideText.setInteractive({ useHandCursor: true });
      guideText.on('pointerdown', () => {
        SimpleAudio.click();
        this.scene.start('MainScene');
      });
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
      // 发放金币（每个任务 50 金币）
      CoinManager.instance.addCoins(50);
      SaveSync.save();

      // 刷新 UI
      this.refreshTaskList();
      this.refreshFooter();
    }
  }

  /**
   * 领取成长任务奖励
   */
  private onClaimGrowthReward(taskId: string) {
    SimpleAudio.unlock();
    SimpleAudio.click();

    const claimed = GrowthMissionManager.instance.claimTaskReward(taskId);
    if (claimed) {
      // 刷新 UI
      this.refreshTaskList();
      this.refreshFooter();
    }
  }

  private onClaimAllRewards() {
    SimpleAudio.unlock();
    SimpleAudio.click();

    const tasks = DailyMissionManager.instance.getTasks();
    let claimedCount = 0;

    tasks.forEach(task => {
      if (task.progress >= task.target && !task.claimed) {
        const claimed = DailyMissionManager.instance.claimTaskReward(task.id);
        if (claimed) {
          claimedCount++;
        }
      }
    });

    if (claimedCount > 0) {
      // 发放金币（每个任务 50 金币）
      CoinManager.instance.addCoins(50 * claimedCount);
      SaveSync.save();

      // 刷新 UI
      this.refreshTaskList();
      this.refreshFooter();
    }
  }

  /**
   * 刷新任务列表（根据 activeTab 切换数据源）
   */
  private refreshTaskList() {
    // 清除旧列表容器
    if (this.taskListContainer) {
      this.taskListContainer.removeAll(true);
    }
    this.taskButtons = [];

    const centerX = (this.scale.width as number) / 2;
    const pagePadding = LAYOUT_SPEC.pagePadding;
    const cardWidth = 750 - pagePadding * 2;

    // 根据 activeTab 选择数据源
    let tasks: DailyTask[] | GrowthTask[];
    if (this.activeTab === 'daily') {
      tasks = DailyMissionManager.instance.getTasks();
    } else {
      // 成长任务：先初始化，再同步所有任务进度
      GrowthMissionManager.instance.init();
      GrowthMissionManager.instance.syncAllTasks();
      tasks = GrowthMissionManager.instance.getTasks();
    }

    tasks.forEach((task, index) => {
      const y = LAYOUT_SPEC.listTopY + index * (TASK_CARD.height + TASK_CARD.gap);
      this.renderTaskCardToContainer(centerX, y, cardWidth, task);
    });
  }

  /**
   * 刷新底部操作区（根据 activeTab 显示不同内容）
   */
  private refreshFooter() {
    // 清除旧 footer
    if (this.claimAllButton) {
      this.claimAllButton.destroy(true);
      this.claimAllButton = null;
      this.claimAllText = null;
    }

    const centerX = (this.scale.width as number) / 2;
    this.renderFooter(centerX);
  }

  /**
   * 刷新 Tab 头部选中态（根据 activeTab 重新渲染 Tab 样式）
   */
  private refreshTabs() {
    const centerX = (this.scale.width as number) / 2;
    this.renderTabs(centerX);
  }
}
