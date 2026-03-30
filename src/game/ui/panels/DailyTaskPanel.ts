/**
 * 每日任务面板组件
 *
 * 职责：
 * - 任务卡片背景
 * - 标题层（「今日任务」+ 连续天数）
 * - 任务列表容器
 * - Footer 管理
 * - 自动计算面板高度
 *
 * 不负责：
 * - 不负责任务数据计算
 * - 不负责任务进度更新
 */

import Phaser from 'phaser';
import { TASK_PANEL, TASK_ITEM } from '../layout/HomeLayout';
import { TaskItem, type TaskItemData } from '../components/TaskItem';

export class DailyTaskPanel {
  public readonly container: Phaser.GameObjects.Container;

  private titleText: Phaser.GameObjects.Text;
  private streakText: Phaser.GameObjects.Text | null = null;
  private taskItems: TaskItem[] = [];
  private footerContainer: Phaser.GameObjects.Container | null = null;
  private footerText: Phaser.GameObjects.Text | null = null;
  private footerHitArea: Phaser.GameObjects.Rectangle | null = null;

  private cardWidth: number;
  private cardHeight: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    taskCount: number = 3
  ) {
    this.cardWidth = TASK_PANEL.width;
    this.cardHeight = this.calculatePanelHeight(taskCount);

    // 创建容器
    this.container = scene.add.container(x, y);
    this.container.setDepth(10);

    // 卡片背景（左上角原点）
    const cardBg = scene.add.rectangle(0, 0, this.cardWidth, this.cardHeight, 0x1a3a52, 0.75);
    cardBg.setStrokeStyle(1, 0xffffff, 0.3);
    cardBg.setOrigin(0, 0);
    this.container.add(cardBg);

    // 白色内容区背景（从任务列表延伸到 footer 下方，覆盖深色背景）
    const footerY = this.calculateFooterY(taskCount);
    const contentBgHeight = (footerY - TASK_PANEL.taskStartY) + TASK_PANEL.footerHeight + TASK_PANEL.paddingBottom;
    const contentBgX = TASK_PANEL.innerPadding;
    const contentBgWidth = this.cardWidth - TASK_PANEL.innerPadding * 2;
    const contentBg = scene.add.rectangle(contentBgX, TASK_PANEL.taskStartY, contentBgWidth, contentBgHeight, 0xFFFFFF);
    contentBg.setOrigin(0, 0);
    this.container.add(contentBg);

    // 标题层（居中显示）
    this.titleText = scene.add.text(this.cardWidth / 2, TASK_PANEL.titleY, '📋 今日任务', {
      fontSize: TASK_PANEL.titleSize,
      color: TASK_PANEL.titleColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);
    this.container.add(this.titleText);

    // 任务列表容器（用于后续添加 TaskItem）
    // TaskItem 会直接添加到主容器中，这里只记录起始位置
  }

  /**
   * 计算面板高度（根据任务数量动态推导）
   */
  private calculatePanelHeight(taskCount: number): number {
    if (taskCount === 0) {
      return TASK_PANEL.taskStartY + TASK_PANEL.taskFooterGap + TASK_PANEL.footerHeight + TASK_PANEL.paddingBottom;
    }

    // 任务列表总高度
    const tasksHeight = taskCount * TASK_PANEL.taskHeight;
    const gapsHeight = (taskCount - 1) * TASK_PANEL.taskRowGap;
    const contentHeight = TASK_PANEL.taskStartY + tasksHeight + gapsHeight;

    // Footer 位置（最后一条任务下方）
    const footerTop = contentHeight + TASK_PANEL.taskFooterGap;

    // 总高度 = footer 位置 + footer 高度 + 底部内边距
    return footerTop + TASK_PANEL.footerHeight + TASK_PANEL.paddingBottom;
  }

  /**
   * 计算 Footer Y 位置（动态推导）
   */
  private calculateFooterY(taskCount: number): number {
    if (taskCount === 0) {
      return TASK_PANEL.taskStartY + TASK_PANEL.taskFooterGap;
    }

    const tasksHeight = taskCount * TASK_PANEL.taskHeight;
    const gapsHeight = (taskCount - 1) * TASK_PANEL.taskRowGap;
    const contentHeight = TASK_PANEL.taskStartY + tasksHeight + gapsHeight;

    return contentHeight + TASK_PANEL.taskFooterGap;
  }

  /**
   * 设置标题
   */
  setTitle(title: string) {
    this.titleText.setText(title);
  }

  /**
   * 设置连续天数文字（可选）
   */
  setStreakText(text: string | null) {
    if (text === null) {
      if (this.streakText) {
        this.streakText.destroy();
        this.streakText = null;
      }
      return;
    }

    if (!this.streakText) {
      const cardRightX = this.cardWidth - TASK_PANEL.innerPadding;
      this.streakText = this.container.scene.add.text(cardRightX, TASK_PANEL.titleY, text, {
        fontSize: TASK_PANEL.streakSize,
        color: TASK_PANEL.streakColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(1, 0.5);
      this.container.add(this.streakText);
    } else {
      this.streakText.setText(text);
    }
  }

  /**
   * 设置阶段激励文案（可选，居中显示）
   */
  setMilestoneText(text: string | null) {
    // 如果已有 milestone 文字，先销毁
    const existingMilestone = this.container.list.find(
      obj => obj instanceof Phaser.GameObjects.Text &&
      (obj as Phaser.GameObjects.Text).originX === 0.5 &&
      (obj as Phaser.GameObjects.Text).y === TASK_PANEL.titleY
    );
    if (existingMilestone) {
      existingMilestone.destroy();
    }

    if (text === null) {
      return;
    }

    const milestoneText = this.container.scene.add.text(this.cardWidth / 2, TASK_PANEL.titleY, text, {
      fontSize: TASK_PANEL.milestoneSize,
      color: TASK_PANEL.milestoneColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5);
    this.container.add(milestoneText);
  }

  /**
   * 添加任务项（使用局部坐标）
   */
  addTaskItem(scene: Phaser.Scene, data: TaskItemData, index: number): TaskItem {
    const taskY = TASK_PANEL.taskStartY + index * (TASK_PANEL.taskHeight + TASK_PANEL.taskRowGap);
    const taskItem = new TaskItem(scene, 0, taskY, this.cardWidth, data);
    this.container.add(taskItem.container);
    this.taskItems.push(taskItem);
    return taskItem;
  }

  /**
   * 清除所有任务项
   */
  clearTaskItems() {
    this.taskItems.forEach(item => item.destroy());
    this.taskItems = [];
  }

  /**
   * 获取任务项列表
   */
  getTaskItems(): TaskItem[] {
    return this.taskItems;
  }

  /**
   * 设置 Footer 文字和点击事件（使用局部坐标）
   */
  setFooter(text: string | null, onClick: (() => void) | null) {
    // 销毁旧 footer
    this.destroyFooter();

    if (text === null) {
      return;
    }

    // 动态计算 footerY（根据当前任务数量）
    const taskCount = this.taskItems.length;
    const footerY = this.calculateFooterY(taskCount);

    // Footer 文字（居中显示）
    this.footerText = this.container.scene.add.text(this.cardWidth / 2, footerY, text, {
      fontSize: TASK_PANEL.footerSize,
      color: TASK_PANEL.footerColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
    this.container.add(this.footerText);

    // 点击热区（如果有点击事件）
    if (onClick) {
      this.footerHitArea = this.container.scene.add.rectangle(this.cardWidth / 2, footerY, 220, 32, 0x000000, 0);
      this.footerHitArea.setInteractive({ useHandCursor: true });
      this.footerHitArea.on('pointerdown', onClick);
      this.container.add(this.footerHitArea);
    }
  }

  /**
   * 销毁 Footer
   */
  private destroyFooter() {
    if (this.footerText) {
      this.footerText.destroy();
      this.footerText = null;
    }
    if (this.footerHitArea) {
      this.footerHitArea.destroy();
      this.footerHitArea = null;
    }
    if (this.footerContainer) {
      this.footerContainer.destroy(true);
      this.footerContainer = null;
    }
  }

  /**
   * 设置容器可见性
   */
  setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  /**
   * 销毁
   */
  destroy() {
    this.destroyFooter();
    this.clearTaskItems();
    if (this.streakText) {
      this.streakText.destroy();
      this.streakText = null;
    }
    this.container.destroy(true);
  }
}
