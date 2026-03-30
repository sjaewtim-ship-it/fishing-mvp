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
import { formatWeight, formatTaskWeightProgress } from '../DropGenerator';

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
  private scrollOffset: number = 0;  // 滚动偏移量（仅成长任务使用）
  private isDragging: boolean = false;  // 是否正在拖拽
  private dragStartY: number = 0;  // 拖拽起始 Y 位置
  private lastScrollOffset: number = 0;  // 上次滚动偏移量

  constructor() {
    super('TaskScene');
  }

  create() {
    const width = this.scale.width as number;
    const height = this.scale.height as number;
    const centerX = width / 2;

    DailyMissionManager.instance.init();

    // 背景（最底层，depth 0）
    const bg = this.add.rectangle(centerX, height / 2, width, height, 0xF5F6F8);
    bg.setDepth(0);

    // 创建任务列表容器（用于管理任务卡对象，depth 10，高于背景）
    this.taskListContainer = this.add.container(0, 0);
    this.taskListContainer.setDepth(10);

    // 创建遮罩区域，限制任务列表滚动范围
    const listMask = this.add.rectangle(centerX, (LAYOUT_SPEC.listTopY + LAYOUT_SPEC.listBottomY) / 2, 750, LAYOUT_SPEC.listBottomY - LAYOUT_SPEC.listTopY, 0x000000, 0);
    listMask.setDepth(100);

    // 将 mask 绑定到任务列表容器（关键：真正限制滚动区域）
    this.taskListContainer.setMask(listMask.createGeometryMask());

    // 创建 Tab 头部容器（用于管理 Tab 按钮）
    this.tabsContainer = this.add.container(0, 0);
    this.tabsContainer.setDepth(11);

    // 渲染各区域
    this.renderHeader(centerX);
    this.renderTabs(centerX);
    this.renderTaskList(centerX);
    this.renderFooter(centerX);

    // 添加全局指针事件用于滚动（仅成长任务）
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.activeTab === 'growth' && this.taskListContainer) {
        this.isDragging = true;
        this.dragStartY = pointer.y;
        this.lastScrollOffset = this.scrollOffset;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.activeTab === 'growth' && this.isDragging && this.taskListContainer) {
        const deltaY = pointer.y - this.dragStartY;

        // 点击/拖拽兼容：小位移视为点击，不滚动
        if (Math.abs(deltaY) < 5) {
          return;
        }

        this.scrollOffset = this.lastScrollOffset + deltaY;

        // scroll clamp：限制滚动范围（基于真实内容总高度）
        const tasks = GrowthMissionManager.instance.getTasks();
        const tasksHeight = tasks.length * (TASK_CARD.height + TASK_CARD.gap);
        const guideHeight = 40;  // 底部提示文案高度估算
        const safeBottomGap = 50;  // 列表底部安全间距
        const contentHeight = tasksHeight + guideHeight + safeBottomGap;
        
        const maxScroll = LAYOUT_SPEC.listTopY;  // 最多滚到顶部
        const minScroll = LAYOUT_SPEC.listBottomY - contentHeight;  // 最多滚到底部
        
        this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, minScroll, maxScroll);

        this.updateTaskListPosition();
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  /**
   * 更新任务列表位置（用于滚动）
   */
  private updateTaskListPosition() {
    if (!this.taskListContainer) return;
    this.taskListContainer.setY(this.scrollOffset);
  }

  // ==================================================
  // 1. 顶部栏
  // ==================================================
  private renderHeader(centerX: number) {
    const headerBg = this.add.rectangle(centerX, LAYOUT_SPEC.headerHeight / 2, 750, LAYOUT_SPEC.headerHeight, 0xFFFFFF);
    headerBg.setDepth(5);  // 高于背景，低于任务卡
    headerBg.setStrokeStyle(1, 0xEEF1F4);

    // 返回按钮
    const backBtn = this.add.rectangle(60, LAYOUT_SPEC.headerHeight / 2, 88, 44, 0xF2F4F7);
    backBtn.setDepth(6);  // 高于 headerBg
    backBtn.setInteractive({ useHandCursor: true });
    const backBtnText = this.add.text(60, LAYOUT_SPEC.headerHeight / 2, '← 返回', {
      fontSize: '16px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    backBtnText.setDepth(6);  // 与 backBtn 同层
    backBtn.on('pointerdown', () => {
      SimpleAudio.click();
      this.scene.start('MainScene');
    });

    // 标题
    const titleText = this.add.text(centerX, LAYOUT_SPEC.headerHeight / 2 - 6, '📋 任务', {
      fontSize: '24px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    titleText.setDepth(6);  // 与 backBtn 同层

    // 副标题
    const subtitleText = this.add.text(centerX, LAYOUT_SPEC.headerHeight / 2 + 22, '完成任务，领取奖励', {
      fontSize: '13px',
      color: '#999999',
    }).setOrigin(0.5);
    subtitleText.setDepth(6);  // 与 backBtn 同层
  }

  // ==================================================
  // 2. Tab 区
  // ==================================================
  private renderTabs(centerX: number) {
    // 清除旧 Tab
    if (this.tabsContainer) {
      this.tabsContainer.removeAll(true);
    }

    // Tab 区白色背景（遮住下方灰色背景，防止遮挡首条任务卡）
    const tabBgHeight = LAYOUT_SPEC.tabHeight + 8;  // tab 高度 + 底部留白
    const tabBgY = LAYOUT_SPEC.tabY + tabBgHeight / 2 - 4;  // tabY 向下偏移 4px
    const tabBg = this.add.rectangle(centerX, tabBgY, 750, tabBgHeight, 0xFFFFFF);
    tabBg.setDepth(5);  // 与 headerBg 同层，高于背景，低于任务卡
    this.tabsContainer?.add(tabBg);

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
      bg.setDepth(6);  // 高于 tabBg
      if (!tab.active) {
        bg.setAlpha(0.5);
      }

      // Tab 文字
      const text = this.add.text(x, y, tab.label, {
        fontSize: '16px',
        color: textColor,
        fontStyle: 'bold',
      }).setOrigin(0.5);
      text.setDepth(6);  // 与 bg 同层

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
    cardBg.setDepth(10);  // 与 taskListContainer 同层，高于背景和 header/tab
    cardBg.setStrokeStyle(1, 0xE0E4E8);
    this.taskListContainer.add(cardBg);

    // ========== 第一层：标题层 ==========
    const iconX = pagePadding + TASK_CARD.iconSize / 2;
    const iconY = y - 8;
    const icon = this.add.text(iconX, iconY, this.getTaskIcon(task.id), {
      fontSize: `${TASK_CARD.iconSize}px`,
    }).setOrigin(0.5);
    icon.setDepth(10);  // 与 cardBg 同层
    this.taskListContainer.add(icon);

    const titleX = iconX + TASK_CARD.iconSize / 2 + 14;
    const titleText = this.add.text(titleX, iconY, task.title, {
      fontSize: '15px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    titleText.setDepth(10);  // 与 cardBg 同层
    this.taskListContainer.add(titleText);

    // 重量任务特殊格式化进度显示（今日任务 + 成长任务）
    const isWeightTask = task.id.startsWith('weight_') || task.id.startsWith('growth_weight_');
    const isBigFishTask = task.id.startsWith('growth_bigfish_');
    let progressDisplay = `${task.progress}/${task.target}`;

    if (isWeightTask) {
      // 累计重量任务：使用专门的任务进度格式化函数
      progressDisplay = formatTaskWeightProgress(task.progress, task.target);
    } else if (isBigFishTask) {
      // 大鱼阈值任务：显示达标状态（target=1 是次数，thresholdGrams 才是重量阈值）
      const thresholdGrams = (task as any).thresholdGrams ?? 0;
      if (task.progress >= task.target) {
        progressDisplay = '✓';  // 已完成
      } else if (thresholdGrams > 0) {
        progressDisplay = `未达标/${formatWeight(thresholdGrams)}`;  // 未完成，显示目标重量
      } else {
        progressDisplay = `${task.progress}/${task.target}`;  // 兜底
      }
    }

    const progressText = this.add.text(titleX, iconY + 16, progressDisplay, {
      fontSize: '12px',
      color: '#999999',
    }).setOrigin(0, 0.5);
    progressText.setDepth(10);  // 与 cardBg 同层
    this.taskListContainer.add(progressText);

    // ========== 第二层：进度层 ==========
    const progressBarY = y + 24;
    const textAreaWidth = 220;
    const progressBarWidth = textAreaWidth;
    const progressBarX = pagePadding + progressBarWidth / 2;
    const progress = Math.min(1, task.progress / task.target);

    // 进度条背景（灰色底板）
    const barBg = this.add.rectangle(progressBarX, progressBarY, progressBarWidth, PROGRESS_BAR.height, 0xF0F2F5);
    barBg.setDepth(10);  // 与 cardBg 同层
    barBg.setStrokeStyle(1, 0xE6E8EB);
    this.taskListContainer.add(barBg);

    // 进度条填充（从左向右增长）
    const fillWidth = progressBarWidth * progress;
    const barFill = this.add.rectangle(pagePadding + fillWidth / 2, progressBarY, fillWidth, PROGRESS_BAR.height, 0x5FA9F9);
    barFill.setDepth(10);  // 与 cardBg 同层
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
    btnBg.setDepth(10);  // 与 cardBg 同层
    btnBg.setStrokeStyle(1, 0xD0D5DB);
    this.taskListContainer.add(btnBg);

    const btnText = this.add.text(btnX, btnY, this.getButtonText(buttonState), {
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    btnText.setDepth(10);  // 与 cardBg 同层
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
      'growth_cast_30': '🎣',
      'growth_collection_3': '⭐',
      'growth_success_5': '🐟',
      'growth_success_10': '🐟',
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
      }
    } else {
      // 成长任务 tab：只显示静态引导文案
      // 计算最后一条任务卡片的位置（基于真实渲染高度）
      const tasks = GrowthMissionManager.instance.getTasks();
      const lastTaskIndex = tasks.length - 1;
      const lastTaskY = LAYOUT_SPEC.listTopY + lastTaskIndex * (TASK_CARD.height + TASK_CARD.gap);
      const lastTaskBottom = lastTaskY + TASK_CARD.height / 2;  // 任务卡片真实底部

      // 引导文案与最后一条任务卡片下边缘保持 25px 距离
      const guideY = lastTaskBottom + 25;

      const guideText = this.add.text(centerX, guideY, '持续钓鱼，完成更多成长目标', {
        fontSize: '14px',
        color: '#8A8F98',
      }).setOrigin(0.5);

      // 添加到任务列表容器，随列表一起滚动
      if (this.taskListContainer) {
        this.taskListContainer.add(guideText);
      }

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

    // 切换 Tab 时重置滚动偏移量
    this.scrollOffset = 0;
    this.updateTaskListPosition();

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
