import Phaser from 'phaser';
import { GoalManager } from './GoalManager';
import { Goal, GoalType } from './GoalTypes';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';

type TabType = 'daily' | 'weekly' | 'achievement';

export class GoalScene extends Phaser.Scene {
  private currentTab: TabType = 'daily';

  // UI 引用
  private tabButtons: Record<TabType, Phaser.GameObjects.Container | null> = {
    daily: null,
    weekly: null,
    achievement: null,
  };

  private redDots: Record<TabType, Phaser.GameObjects.Circle | null> = {
    daily: null,
    weekly: null,
    achievement: null,
  };

  private goalContainer: Phaser.GameObjects.Container | null = null;
  private scrollMask: Phaser.GameObjects.Rectangle | null = null;
  private scrollBounds: { minY: number; maxY: number } = { minY: 0, maxY: 0 };
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private containerStartY: number = 0;
  private claimableGoalIds: string[] = [];

  // 顶部 UI
  private claimableCountText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('GoalScene');
  }

  private getLayout() {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;
    const centerX = width / 2;

    return {
      width,
      height,
      centerX,
      headerY: 70,
      claimableBarY: 115,
      tabY: 165,
      contentTopY: 235,
      contentBottomY: height - 80,
    };
  }

  create() {
    const L = this.getLayout();

    // 背景
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.add.rectangle(L.centerX, L.height / 2, L.width, L.height, 0x1a1a2e);

    // 标题
    this.add.text(L.centerX, L.headerY, '🎯 目标系统', {
      fontSize: '42px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 关闭按钮
    const closeBtn = this.add.text(L.width - 50, 45, '✕', {
      fontSize: '32px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      SimpleAudio.click();
      this.scene.start('MainScene');
    });

    // 可领取奖励提示栏
    this.createClaimableBar(L);

    // 标签页按钮（带红点）
    this.createTabs(L);

    // 滚动遮罩
    this.scrollMask = this.add.rectangle(
      L.centerX,
      (L.contentTopY + L.contentBottomY) / 2,
      L.width - 40,
      L.contentBottomY - L.contentTopY,
      0x000000,
      0
    );
    const mask = this.scrollMask.createGeometryMask();

    // 目标列表容器（应用遮罩）
    this.goalContainer = this.add.container(L.centerX, L.contentTopY + 20);
    this.goalContainer.setMask(mask);

    // 滚动区域边界
    this.scrollBounds = {
      minY: -(L.contentBottomY - L.contentTopY - 100),
      maxY: 20,
    };

    // 滚动交互
    this.setupScrollInteraction(L);

    // 初始加载每日目标
    this.loadGoals('daily');

    // 设置目标完成回调
    GoalManager.instance.setOnGoalCompleted((data) => {
      this.showGoalCompletedToast(data);
      this.updateClaimableBar();
      this.updateRedDots();
    });
  }

  /**
   * 创建可领取奖励提示栏
   */
  private createClaimableBar(L: ReturnType<GoalScene['getLayout']>) {
    const barBg = this.add.rectangle(L.centerX, L.claimableBarY, 600, 56, 0x27ae60, 0.2)
      .setStrokeStyle(1, 0x27ae60, 0.5);

    const iconText = this.add.text(60, L.claimableBarY, '🎁', {
      fontSize: '28px',
    }).setOrigin(0.5);

    const labelText = this.add.text(100, L.claimableBarY, '可领取奖励：', {
      fontSize: '20px',
      color: '#AAAAAA',
    }).setOrigin(0.5);

    this.claimableCountText = this.add.text(230, L.claimableBarY, '0', {
      fontSize: '24px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const unitText = this.add.text(255, L.claimableBarY, '个', {
      fontSize: '18px',
      color: '#AAAAAA',
    }).setOrigin(0.5);

    // 一键领取按钮
    const claimAllBtn = this.add.rectangle(L.width - 120, L.claimableBarY, 140, 44, 0x27ae60)
      .setStrokeStyle(2, 0xffffff, 0.3)
      .setInteractive({ useHandCursor: true });

    const claimAllText = this.add.text(L.width - 120, L.claimableBarY, '一键领取', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    claimAllBtn.on('pointerdown', () => {
      SimpleAudio.click();
      this.claimAllRewards();
    });

    // 添加到场景
    const barContainer = this.add.container(0, 0, [barBg, iconText, labelText, this.claimableCountText, unitText, claimAllBtn, claimAllText]);

    this.updateClaimableBar();
  }

  /**
   * 更新可领取数量显示
   */
  private updateClaimableBar() {
    if (!this.claimableCountText) return;
    const count = GoalManager.instance.getClaimableGoals().length;
    this.claimableCountText.setText(String(count));
  }

  /**
   * 一键领取所有奖励
   */
  private claimAllRewards() {
    const claimableGoals = GoalManager.instance.getClaimableGoals();
    if (claimableGoals.length === 0) {
      this.showToast('暂无可领取奖励');
      return;
    }

    let totalCoins = 0;
    let totalEnergy = 0;

    claimableGoals.forEach((goal) => {
      const success = GoalManager.instance.claimReward(goal.id);
      if (success) {
        totalCoins += goal.rewardCoins;
        if (goal.rewardEnergy) totalEnergy += goal.rewardEnergy;
      }
    });

    SaveSync.save();
    this.loadGoals(this.currentTab);
    this.updateClaimableBar();
    this.updateRedDots();

    // 显示总奖励
    this.showClaimAllResult(totalCoins, totalEnergy);
  }

  /**
   * 显示一键领取结果
   */
  private showClaimAllResult(coins: number, energy: number) {
    const L = this.getLayout();

    const bg = this.add.rectangle(L.centerX, L.height / 2, 500, 140, 0x27ae60, 0.95)
      .setStrokeStyle(3, 0xffd700, 1);

    const titleText = this.add.text(L.centerX, L.height / 2 - 30, '🎉 领取成功！', {
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const rewardText = this.add.text(L.centerX, L.height / 2 + 20, `+${coins}🪙${energy > 0 ? ` +${energy}⚡` : ''}`, {
      fontSize: '32px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0, [bg, titleText, rewardText]);
    container.setScale(0.8);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      delay: 1500,
      onComplete: () => container.destroy(),
    });
  }

  /**
   * 创建标签页按钮（带红点）
   */
  private createTabs(L: ReturnType<GoalScene['getLayout']>) {
    const tabs: { key: TabType; label: string; icon: string }[] = [
      { key: 'daily', label: '每日', icon: '📅' },
      { key: 'weekly', label: '每周', icon: '📆' },
      { key: 'achievement', label: '成就', icon: '🏅' },
    ];

    const tabWidth = 200;
    const tabHeight = 60;
    const gap = 15;
    const totalWidth = tabs.length * tabWidth + (tabs.length - 1) * gap;
    const startX = L.centerX - totalWidth / 2 + tabWidth / 2;

    tabs.forEach((tab, index) => {
      const x = startX + index * (tabWidth + gap);
      const isSelected = tab.key === this.currentTab;

      const container = this.createTabButton(x, L.tabY, tabWidth, tabHeight, tab.icon, tab.label, isSelected);
      this.tabButtons[tab.key] = container;

      // 创建红点
      const redDot = this.add.circle(x + tabWidth / 2 + 50, L.tabY - 25, 10, 0xff4444, 1);
      redDot.setDepth(100);
      this.redDots[tab.key] = redDot;

      container.on('pointerdown', () => {
        SimpleAudio.click();
        this.switchTab(tab.key);
      });
    });

    // 更新红点状态
    this.updateRedDots();
  }

  /**
   * 更新红点显示
   */
  private updateRedDots() {
    const goalsByType: Record<TabType, number> = {
      daily: 0,
      weekly: 0,
      achievement: 0,
    };

    // 统计各类型可领取数量
    GoalManager.instance.getClaimableGoals().forEach((goal) => {
      goalsByType[goal.type as TabType]++;
    });

    // 更新红点
    (Object.keys(this.redDots) as TabType[]).forEach((key) => {
      const dot = this.redDots[key];
      if (!dot) return;

      const hasClaimable = goalsByType[key] > 0;
      dot.setVisible(hasClaimable);
    });
  }

  /**
   * 创建单个标签页按钮
   */
  private createTabButton(
    x: number,
    y: number,
    width: number,
    height: number,
    icon: string,
    label: string,
    isSelected: boolean
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 背景
    const bg = this.add.rectangle(0, 0, width, height, isSelected ? 0x4a90d9 : 0x2d2d44, 0.9)
      .setStrokeStyle(2, isSelected ? 0xffd700 : 0xffffff, 0.3)
      .setInteractive({ useHandCursor: true });

    // 图标
    const iconText = this.add.text(-60, 0, icon, {
      fontSize: '28px',
    }).setOrigin(0.5);

    // 文字
    const labelText = this.add.text(10, 0, label, {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, iconText, labelText]);
    container.setSize(width, height);

    return container;
  }

  /**
   * 切换标签页
   */
  private switchTab(tab: TabType) {
    this.currentTab = tab;

    // 更新按钮状态
    (Object.keys(this.tabButtons) as TabType[]).forEach((key) => {
      const container = this.tabButtons[key];
      if (!container || !container.list[0]) return;

      const bg = container.list[0] as Phaser.GameObjects.Rectangle;
      const isSelected = key === tab;
      bg.setFillStyle(isSelected ? 0x4a90d9 : 0x2d2d44);
      bg.setStrokeStyle(2, isSelected ? 0xffd700 : 0xffffff, 0.3);
    });

    // 加载新标签页的目标
    this.loadGoals(tab);

    // 重置滚动位置
    if (this.goalContainer) {
      this.goalContainer.setY(20);
    }
  }

  /**
   * 加载目标列表（带排序）
   */
  private loadGoals(tab: TabType) {
    if (!this.goalContainer) return;

    // 清空容器
    this.goalContainer.removeAll(true);
    this.claimableGoalIds = [];

    const goals = GoalManager.instance.getGoalsByType(tab);
    const L = this.getLayout();

    if (goals.length === 0) {
      this.goalContainer.add(
        this.add.text(0, 100, '暂无目标', {
          fontSize: '24px',
          color: '#888888',
        }).setOrigin(0.5)
      );
      this.scrollBounds = { minY: 0, maxY: 20 };
      return;
    }

    // 创建目标卡片（已按优先级排序）
    const cardWidth = 640;
    const cardHeight = 110;
    const gap = 16;
    let yOffset = 0;

    goals.forEach((goal) => {
      const card = this.createGoalCard(0, yOffset, cardWidth, cardHeight, goal);
      this.goalContainer?.add(card);
      yOffset += cardHeight + gap;

      if (goal.status === 'completed') {
        this.claimableGoalIds.push(goal.id);
      }
    });

    // 更新滚动边界
    const contentHeight = yOffset;
    const viewHeight = L.contentBottomY - L.contentTopY - 40;
    this.scrollBounds = {
      minY: Math.min(0, viewHeight - contentHeight - 20),
      maxY: 20,
    };
  }

  /**
   * 创建目标卡片
   */
  private createGoalCard(
    x: number,
    y: number,
    width: number,
    height: number,
    goal: Goal
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 卡片背景（可领取时高亮）
    const bgColor = goal.status === 'completed' ? 0x1e4d2f : 0x2d2d44;
    const bg = this.add.rectangle(0, 0, width, height, bgColor, 0.95)
      .setStrokeStyle(2, this.getStatusColor(goal.status), goal.status === 'completed' ? 0.8 : 0.5)
      .setInteractive({ useHandCursor: true });

    // 图标
    const iconText = this.add.text(-260, 0, goal.icon, {
      fontSize: '48px',
    }).setOrigin(0.5);

    // 名称
    const nameText = this.add.text(-170, -20, goal.name, {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // 描述
    const descText = this.add.text(-170, 5, goal.description, {
      fontSize: '16px',
      color: '#AAAAAA',
    }).setOrigin(0, 0.5);

    // 进度条背景
    const progressBarBg = this.add.rectangle(80, 25, 200, 16, 0x1a1a2e, 1);

    // 进度条
    const progressPercent = Math.min(goal.currentValue / goal.targetValue, 1);
    const progressBar = this.add.rectangle(
      80 - (1 - progressPercent) * 100,
      25,
      200 * progressPercent,
      16,
      this.getStatusColor(goal.status),
      1
    );

    // 进度文字
    const progressText = this.add.text(190, 25, `${goal.currentValue}/${goal.targetValue}`, {
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(1, 0.5);

    // 奖励文字
    const rewardText = this.add.text(240, -10, `+${goal.rewardCoins}🪙`, {
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    if (goal.rewardEnergy) {
      const energyText = this.add.text(240, 15, `+${goal.rewardEnergy}⚡`, {
        fontSize: '16px',
        color: '#9b59b6',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(energyText);
    }

    // 领取按钮（仅可领取时显示）
    if (goal.status === 'completed') {
      const claimBtn = this.add.rectangle(280, 0, 100, 44, 0x27ae60)
        .setStrokeStyle(2, 0xffffff, 0.5)
        .setInteractive({ useHandCursor: true });

      const claimText = this.add.text(280, 0, '领取', {
        fontSize: '20px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      container.add([claimBtn, claimText]);

      claimBtn.on('pointerdown', () => {
        SimpleAudio.click();
        this.claimReward(goal.id, container);
      });

      // 可领取时的脉冲动画
      this.tweens.add({
        targets: [claimBtn],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    } else if (goal.status === 'claimed') {
      const claimedText = this.add.text(280, 0, '已领取', {
        fontSize: '18px',
        color: '#666666',
      }).setOrigin(0.5);
      container.add(claimedText);
    }

    // 隐藏目标的锁定标识
    if (goal.isHidden && goal.status === 'locked') {
      const lockText = this.add.text(0, 0, '🔒 未解锁', {
        fontSize: '20px',
        color: '#888888',
      }).setOrigin(0.5);
      container.add(lockText);
    }

    container.add([bg, iconText, nameText, descText, progressBarBg, progressBar, progressText, rewardText]);

    return container;
  }

  /**
   * 获取状态颜色
   */
  private getStatusColor(status: string): number {
    switch (status) {
      case 'completed':
        return 0x27ae60;
      case 'claimed':
        return 0x666666;
      case 'locked':
        return 0x444444;
      default:
        return 0x4a90d9;
    }
  }

  /**
   * 领取奖励
   */
  private claimReward(goalId: string, cardContainer: Phaser.GameObjects.Container) {
    const success = GoalManager.instance.claimReward(goalId);
    if (success) {
      SaveSync.save();

      // 刷新列表
      this.loadGoals(this.currentTab);
      this.updateClaimableBar();
      this.updateRedDots();

      // 显示提示
      this.showToast('奖励已领取！');
    }
  }

  /**
   * 设置滚动交互
   */
  private setupScrollInteraction(L: ReturnType<GoalScene['getLayout']>) {
    const input = this.input;

    // 触摸开始
    input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const pointerX = pointer.x;
      const pointerY = pointer.y;

      // 检查是否在滚动区域内
      if (pointerX >= 20 && pointerX <= L.width - 20 &&
          pointerY >= L.contentTopY && pointerY <= L.contentBottomY) {
        this.isDragging = true;
        this.dragStartY = pointerY;
        this.containerStartY = this.goalContainer?.y || 0;
      }
    });

    // 触摸移动
    input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.goalContainer) return;

      const deltaY = pointer.y - this.dragStartY;
      let newY = this.containerStartY + deltaY;

      // 边界限制
      newY = Math.max(this.scrollBounds.minY, Math.min(this.scrollBounds.maxY, newY));
      this.goalContainer.setY(newY);
    });

    // 触摸结束
    input.on('pointerup', () => {
      this.isDragging = false;
    });

    input.on('pointerupoutside', () => {
      this.isDragging = false;
    });
  }

  /**
   * 显示目标完成提示（增强版）
   */
  private showGoalCompletedToast(data: { goalName: string; rewardCoins: number; rewardEnergy?: number }) {
    const L = this.getLayout();

    const bg = this.add.rectangle(L.centerX, 180, 550, 100, 0x27ae60, 0.98)
      .setStrokeStyle(4, 0xffd700, 1);

    const titleText = this.add.text(L.centerX, 155, `🎉 ${data.goalName} 完成！`, {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const rewardText = this.add.text(L.centerX, 195, `+${data.rewardCoins}🪙${data.rewardEnergy ? ` +${data.rewardEnergy}⚡` : ''}`, {
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0, [bg, titleText, rewardText]);
    container.setScale(0.9);
    container.setAlpha(0);

    // 弹入动画
    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
      delay: 300,
    });

    // 淡出动画
    this.tweens.add({
      targets: container,
      alpha: 0,
      y: -50,
      delay: 3000,
      duration: 500,
      onComplete: () => container.destroy(),
    });
  }

  /**
   * 显示 Toast
   */
  private showToast(message: string) {
    const L = this.getLayout();
    const bg = this.add.rectangle(L.centerX, L.height - 80, 400, 56, 0x000000, 0.8)
      .setStrokeStyle(2, 0xffffff, 0.3);

    const text = this.add.text(L.centerX, L.height - 80, message, {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0, [bg, text]);

    this.tweens.add({
      targets: container,
      alpha: 0,
      y: -20,
      delay: 1500,
      duration: 300,
      onComplete: () => container.destroy(),
    });
  }
}
