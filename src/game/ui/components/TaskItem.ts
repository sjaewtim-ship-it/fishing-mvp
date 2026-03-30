/**
 * 任务项组件
 *
 * 职责：
 * - 展示单条任务的完整信息
 * - 按钮区与进度条区彻底分离（关键：从右向左布局）
 * - 提供状态更新方法
 *
 * 布局顺序（从右向左推导）：
 * 1. 按钮（最右侧，固定位置）
 * 2. 进度条（按钮左侧，宽度由剩余空间推导）
 * 3. 奖励文字（进度条右侧）
 * 4. 任务名称（最左侧）
 *
 * 不负责：
 * - 不负责任务数据计算
 * - 不负责任务列表布局
 */

import Phaser from 'phaser';
import { TASK_PANEL, TASK_ITEM } from '../layout/HomeLayout';
import { ProgressBar } from './ProgressBar';

export type TaskItemState = 'todo' | 'claimable' | 'claimed';

export interface TaskItemData {
  title: string;
  progress: number;
  target: number;
  rewardText: string;
  state: TaskItemState;
}

export class TaskItem {
  public readonly container: Phaser.GameObjects.Container;

  private icon: Phaser.GameObjects.Text;
  private titleText: Phaser.GameObjects.Text;
  private progressText: Phaser.GameObjects.Text;
  private progressBar: ProgressBar;
  private rewardTextObj: Phaser.GameObjects.Text;
  private buttonBg: Phaser.GameObjects.Rectangle;
  private buttonText: Phaser.GameObjects.Text;

  private currentState: TaskItemState = 'todo';
  private onClickCallback: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cardWidth: number,
    data: TaskItemData
  ) {
    // 创建容器（局部坐标）
    this.container = scene.add.container(x, y);
    this.container.setDepth(11);

    // 卡片背景（透明背景 + 浅描边，与 DailyTaskPanel 白色内容区配合）
    const cardBg = scene.add.rectangle(0, 0, cardWidth, TASK_ITEM.taskHeight, 0xFFFFFF, 0);
    cardBg.setStrokeStyle(1, 0xE8ECF1);
    cardBg.setOrigin(0, 0);
    this.container.add(cardBg);

    // 内容宽度（扣除左右内边距）
    const contentWidth = cardWidth - TASK_PANEL.innerPadding * 2;
    const contentLeftX = TASK_PANEL.innerPadding;

    // 计算布局（从右向左推导，基于内容区）
    const contentRightX = cardWidth - TASK_PANEL.innerPadding;

    // 1. 按钮（最右侧，固定位置）
    const buttonX = contentRightX - TASK_ITEM.buttonRightMargin - TASK_ITEM.buttonWidth / 2;

    // 2. 奖励文字右边缘（按钮左侧）
    const rewardRightX = buttonX - TASK_ITEM.buttonWidth / 2 - TASK_ITEM.progressBarRightMargin;

    // 3. 进度条宽度（由剩余空间推导，有最小值兜底）
    // 进度条左边缘与标题左边缘对齐，右边缘与奖励文字右边缘对齐
    const progressBarWidth = Math.max(TASK_ITEM.progressBarMinWidth, rewardRightX - contentLeftX - TASK_ITEM.rewardRightMargin);

    // 4. 进度条中心 X（左边缘与标题对齐）
    const progressBarX = contentLeftX + progressBarWidth / 2;

    // 5. 奖励文字 X（右对齐）
    const rewardX = rewardRightX - TASK_ITEM.rewardRightMargin;

    // ========== 第一行：任务名 + 进度数字 ==========
    const titleY = 6;
    const progressValueY = 6;

    // 任务图标（左侧，垂直居中于第一行）
    const iconX = contentLeftX + TASK_ITEM.iconSize / 2;
    const iconY = titleY + 8;  // 第一行中心
    this.icon = scene.add.text(iconX, iconY, '🎣', {
      fontSize: `${TASK_ITEM.iconSize}px`,
    }).setOrigin(0.5, 0.5);
    this.container.add(this.icon);

    // 任务标题（第一行，左上角 origin）
    const textStartX = contentLeftX + TASK_ITEM.iconSize + 8;  // 图标右侧固定间距
    this.titleText = scene.add.text(textStartX, titleY, data.title, {
      fontSize: TASK_ITEM.titleSize,
      color: TASK_ITEM.titleColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0);
    this.container.add(this.titleText);

    // 进度数字（第一行，右上角 origin，与标题同一行）
    const progressValueText = scene.add.text(rewardX, progressValueY, `${data.progress}/${data.target}`, {
      fontSize: '11px',
      color: '#999999',
      fontStyle: 'normal',
    }).setOrigin(1, 0);
    this.container.add(progressValueText);

    // ========== 第二行：独立进度条 ==========
    const progressBarY = 26;
    this.progressBar = new ProgressBar(
      scene,
      progressBarX,
      progressBarY,
      progressBarWidth,
      8,  // progressBarHeight
      { trackColor: 0xE8ECF1, fillColor: 0x4FA6F8, radius: 4 }
    );
    this.container.add(this.progressBar.container);
    this.progressBar.setProgress(data.progress / data.target);

    // 奖励文字（进度条右侧，与进度条同一行）- 已隐藏，降低右侧信息密度
    // this.rewardTextObj = scene.add.text(rewardX, progressBarY, data.rewardText, {
    //   fontSize: TASK_ITEM.rewardSize,
    //   color: TASK_ITEM.rewardColor,
    //   fontStyle: 'bold',
    //   stroke: '#000000',
    //   strokeThickness: 2,
    // }).setOrigin(1, 0);
    // this.container.add(this.rewardTextObj);

    // ========== 按钮：对齐"文本行 + 进度条行"整体内容块的中心 ==========
    const contentTop = titleY;
    const contentBottom = progressBarY + 8;  // progressBarHeight
    const contentCenterY = (contentTop + contentBottom) / 2;
    const buttonY = contentCenterY;

    this.buttonBg = scene.add.rectangle(buttonX, buttonY, TASK_ITEM.buttonWidth, TASK_ITEM.buttonHeight, 0xE8ECF1);
    this.buttonBg.setStrokeStyle(1, 0xD8DCE2);
    this.container.add(this.buttonBg);

    this.buttonText = scene.add.text(buttonX, buttonY, '进行中', {
      fontSize: '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    this.container.add(this.buttonText);

    // 初始化状态
    this.updateState(data.state);

    // 点击事件（仅可领取状态可点击）
    this.buttonBg.setInteractive({ useHandCursor: true });
    this.buttonBg.on('pointerdown', () => this.handleClick());
  }

  /**
   * 更新任务状态
   */
  updateState(state: TaskItemState) {
    this.currentState = state;

    let buttonColor: number;
    let buttonTextStr: string;

    switch (state) {
      case 'claimable':
        buttonColor = TASK_ITEM.buttonClaimableColor;
        buttonTextStr = '领取';
        break;
      case 'claimed':
        buttonColor = TASK_ITEM.buttonClaimedColor;
        buttonTextStr = '已领';
        break;
      default: // 'todo'
        buttonColor = TASK_ITEM.buttonTodoColor;
        buttonTextStr = '进行中';
        break;
    }

    this.buttonBg.setFillStyle(buttonColor);
    this.buttonText.setText(buttonTextStr);

    // 更新按钮文字颜色（已领取状态用白色，其他用白色）
    this.buttonText.setColor('#FFFFFF');
  }

  /**
   * 更新进度
   */
  updateProgress(current: number, target: number) {
    this.progressText.setText(`${current}/${target}`);
    this.progressBar.setProgress(current / target);
  }

  /**
   * 设置点击回调
   */
  setOnClick(callback: () => void) {
    this.onClickCallback = callback;
  }

  /**
   * 处理点击事件
   */
  private handleClick() {
    if (this.currentState === 'claimable' && this.onClickCallback) {
      this.onClickCallback();
    }
  }

  /**
   * 获取当前状态
   */
  getState(): TaskItemState {
    return this.currentState;
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
    this.progressBar.destroy();
    this.container.destroy(true);
  }
}
