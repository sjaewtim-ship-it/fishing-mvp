import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { CoinManager } from './CoinManager';
import { RecordManager } from './RecordManager';
import { DirectorSystem } from './DirectorSystem';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';
import { AnalyticsManager } from './AnalyticsManager';
import { DailyMissionManager, type DailyTask } from './DailyMissionManager';
import { GrowthMissionManager } from './GrowthMissionManager';
import { EnergyModal } from './EnergyModal';
import { SettingsModal } from './ui/SettingsModal';
import { CollectionManager } from './managers/CollectionManager';
import { DailyTaskPanel } from './ui/panels/DailyTaskPanel';
import { TaskItem, type TaskItemData } from './ui/components/TaskItem';
import { formatWeight } from './DropGenerator';
import { StorageManager } from './StorageManager';

// ==================================================
// 首页统一 layoutSpec - 管理所有 section 的纵向布局
// ==================================================
const LAYOUT_SPEC = {
  // 基础参数（移动端适配）
  safeTop: 26,
  safeBottom: 0,
  pagePadding: 24,                 // 统一页面左右边距（原 16px 增加 50% → 24px）
  contentWidth: 0,                 // 动态计算：width - pagePadding * 2
  sectionGap: 18,
  sectionGapLoose: 24,

  // 固定尺寸
  brandHeight: 112,                // 品牌区高度
  resourceHeight: 54,              // 资源区高度（3 卡组单行）
  actionHeight: 90,                // 开始钓鱼按钮高度
  navBarHeight: 60,                // 底部入口栏高度
  sandHeight: 120,                 // 沙地固定高度

  // 间距参数
  resourceToGoalGap: 28,           // 资源区底部到任务区顶部
  goalToActionGap: 28,             // 任务区底部到开始钓鱼按钮（增加 8px,让主按钮更独立）
  actionToNavBarGap: 20,           // 开始钓鱼按钮到底部入口栏
  navBarToOceanGap: 20,            // 底部入口栏到海洋背景

  // 任务区参数
  goalInnerPadding: 20,            // 任务区内边距
  taskStartY: 40,                  // 任务列表起始 Y（相对任务区顶部）
  taskHeight: 44,                  // 单条任务高度
  taskRowGap: 8,                   // 任务间距
  taskFooterGap: 2,                // 最后一条任务到 footer 间距
  footerHeight: 8,                 // footer 高度
  paddingBottom: 2,                // 底部内边距

  // 动态计算（在 calculateLayout 中计算）
  brandY: 74,                      // 品牌区起始 Y
  resourceY: 196,                  // 资源区起始 Y
  goalY: 0,                        // 动态计算：resourceBottomY + resourceToGoalGap
  goalHeight: 0,                   // 动态计算：基于任务数量
  actionY: 0,                      // 动态计算：goalBottomY + goalToActionGap
  navBarY: 0,                      // 动态计算：actionBottomY + actionToNavBarGap
  oceanY: 0,                       // 动态计算：navBarBottomY + navBarToOceanGap
};

// 资源卡统一规格（移动端适配）
const RESOURCE_CARD = {
  height: 54,              // 卡片高度
  gap: 8,                  // 卡片间距
  rowGap: 10,              // 行间距
  radius: 8,               // 圆角
  paddingX: 10,            // 左右内边距
  paddingTop: 8,           // 顶部内边距
  labelSize: '14px',       // 标签字号
  labelColor: '#F7F3C8',   // 标签颜色（金币卡基准）
  valueSize: '20px',       // 数值字号
  valueColor: '#FFFFFF',   // 数值颜色
  labelStroke: 2,          // 标签描边
  valueStroke: 3,          // 数值描边
};

// 进度条规格（移动端适配）
const PROGRESS_BAR = {
  width: 96,
  height: 12,
  radius: 6,
  labelSize: '11px',
};

/**
 * 绘制垂直渐变矩形（带顶部高光）
 * @param scene Phaser 场景
 * @param x 中心 X
 * @param y 中心 Y
 * @param w 宽度
 * @param h 高度
 * @param colorTop 顶部颜色
 * @param colorBottom 底部颜色
 * @param steps 渐变步数（默认 12）
 * @param highlightAlpha 顶部高光透明度（默认 0.14,0 则无高光）
 * @returns Graphics 对象
 */
function drawVerticalGradientRect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  colorTop: number,
  colorBottom: number,
  steps = 12,
  highlightAlpha = 0.14
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();

  const topColor = Phaser.Display.Color.ValueToColor(colorTop);
  const bottomColor = Phaser.Display.Color.ValueToColor(colorBottom);

  for (let i = 0; i < steps; i++) {
    const interpolated = Phaser.Display.Color.Interpolate.ColorWithColor(
      topColor,
      bottomColor,
      steps - 1,
      i
    );

    const fillColor = Phaser.Display.Color.GetColor(
      interpolated.r,
      interpolated.g,
      interpolated.b
    );

    g.fillStyle(fillColor, 1);
    g.fillRect(x - w / 2, y - h / 2 + (h / steps) * i, w, h / steps + 1);
  }

  // 顶部高光层（覆盖顶部 32% 区域）
  if (highlightAlpha > 0) {
    const highlightHeight = h * 0.32;
    g.fillStyle(0xffffff, highlightAlpha);
    g.fillRect(x - w / 2, y - h / 2, w, highlightHeight);
  }

  return g;
}

export class MainScene extends Phaser.Scene {
  // UI 引用
  private coinText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private weightText!: Phaser.GameObjects.Text;  // 累计重量文本
  private taskPanel: DailyTaskPanel | null = null;

  // 目标奖励金额（V1 局部常量）
  private readonly DAILY_MISSION_REWARD = 100;

  // Section 容器
  private brandSection!: Phaser.GameObjects.Container;
  private resourceSection!: Phaser.GameObjects.Container;
  private goalSection!: Phaser.GameObjects.Container;
  private actionSection!: Phaser.GameObjects.Container;
  private navBarSection!: Phaser.GameObjects.Container;
  private oceanSection!: Phaser.GameObjects.Container;

  constructor() {
    super('MainScene');
  }

  private calculateLayout(taskCount: number = 3) {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;
    const centerX = width / 2;

    // 动态计算 contentWidth（基于统一 pagePadding）
    const contentWidth = width - LAYOUT_SPEC.pagePadding * 2;

    // 动态计算 taskPanelHeight（基于实际任务数量，与 DailyTaskPanel.calculatePanelHeight 逻辑一致）
    const tasksHeight = taskCount * LAYOUT_SPEC.taskHeight;
    const gapsHeight = (taskCount - 1) * LAYOUT_SPEC.taskRowGap;
    const taskContentHeight = LAYOUT_SPEC.taskStartY + tasksHeight + gapsHeight;
    const footerTop = taskContentHeight + LAYOUT_SPEC.taskFooterGap;
    const goalHeight = footerTop + LAYOUT_SPEC.footerHeight + LAYOUT_SPEC.paddingBottom;

    // 链式计算各 section Y 位置
    const resourceBottomY = LAYOUT_SPEC.resourceY + LAYOUT_SPEC.resourceHeight;
    const goalY = resourceBottomY + LAYOUT_SPEC.resourceToGoalGap;
    const goalBottomY = goalY + goalHeight;  // 使用与 DailyTaskPanel 一致的真实高度
    const actionY = goalBottomY + LAYOUT_SPEC.goalToActionGap;
    const actionBottomY = actionY + LAYOUT_SPEC.actionHeight;
    const navBarY = actionBottomY + LAYOUT_SPEC.actionToNavBarGap;
    const navBarBottomY = navBarY + LAYOUT_SPEC.navBarHeight;
    const oceanY = navBarBottomY + LAYOUT_SPEC.navBarToOceanGap;

    // 动态计算 oceanHeight（沙地固定高度,水域吃满剩余区域）
    const oceanHeight = height - oceanY - LAYOUT_SPEC.sandHeight;
    const sandY = oceanY + oceanHeight;

    return {
      width,
      height,
      centerX,
      contentWidth,
      pagePadding: LAYOUT_SPEC.pagePadding,
      safeTop: LAYOUT_SPEC.safeTop,
      safeBottom: LAYOUT_SPEC.safeBottom,
      brandY: LAYOUT_SPEC.brandY,
      resourceY: LAYOUT_SPEC.resourceY,
      goalY,
      goalHeight,
      goalInnerPadding: LAYOUT_SPEC.goalInnerPadding,
      actionY,
      oceanY,
      oceanHeight,
      sandY,
    };
  }


  create() {
    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    const totalFishWeight = StorageManager.instance.getTotalFishWeightGrams();

    DailyMissionManager.instance.init();

    // 获取实际任务数量，用于计算真实布局高度
    const tasks = DailyMissionManager.instance.getTasks();
    const taskCount = tasks.length;
    const L = this.calculateLayout(taskCount);

    this.cameras.main.setBackgroundColor('#8FD3FF');

    // === 渲染 5 个 section ===
    this.renderBrandSection(L);
    this.renderResourceSection(L, coins, energy, maxEnergy, totalFishWeight);
    this.renderGoalSection(L);
    this.renderActionSection(L, energy >= maxEnergy);
    this.renderNavBarSection(L);
    this.renderOceanSection(L);
  }

  /**
   * wake 事件：从其他场景返回时刷新数据
   */
  wake() {
    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    const totalFishWeight = StorageManager.instance.getTotalFishWeightGrams();

    // 刷新资源区显示
    this.refreshWeightUI();
    
    // 刷新金币和体力显示（如果需要）
    if (this.coinText) {
      this.coinText.setText(String(coins));
    }
    if (this.energyText) {
      this.energyText.setText(`${energy}/${maxEnergy}`);
    }
  }


  /** 刷新累计重量显示 */
  private refreshWeightUI() {
    const totalFishWeight = StorageManager.instance.getTotalFishWeightGrams();
    if (this.weightText) {
      // 首页累计重量卡单独兜底：0 时显示 0kg，不显示空白
      const weightDisplayText = totalFishWeight > 0 ? formatWeight(totalFishWeight) : '0kg';
      this.weightText.setText(weightDisplayText);
    }
  }
  // ==================================================
  // 1. brandSection - 顶部品牌区（增加呼吸感）
  // ==================================================
  private renderBrandSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;

    // 云朵装饰（弱化,不抢视觉）
    const cloud1 = this.add.text(80, L.brandY + 10, '☁️', { fontSize: '26px' }).setAlpha(0.4);
    const cloud2 = this.add.text(540, L.brandY + 20, '☁️', { fontSize: '22px' }).setAlpha(0.4);

    this.tweens.add({
      targets: cloud1,
      x: 520,
      duration: 22000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: cloud2,
      x: 180,
      duration: 26000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 主标题（视觉重心）
    this.add.text(x, L.brandY + 34, '🎣 钓鱼小游戏', {
      fontSize: '46px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // slogan（与标题拉开间距）
    this.add.text(x, L.brandY + 96, '看准时机,一杆出货', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
  }

  // ==================================================
  // 2. resourceSection - 资源区（3 卡布局：金币/体力/重量,移动端适配）
  // ==================================================
  private renderResourceSection(
    L: ReturnType<typeof this.calculateLayout>,
    coins: number,
    energy: number,
    maxEnergy: number,
    totalFishWeight: number
  ) {
    const cardH = RESOURCE_CARD.height;
    const gap = RESOURCE_CARD.gap;

    // 动态计算卡片宽度（3 卡等分,基于统一 pagePadding）
    const cardW = (L.contentWidth - gap * 2) / 3;

    // 左对齐位置（基于统一 pagePadding）
    const leftX = L.pagePadding;
    const midX = leftX + cardW + gap;
    const rightX = leftX + (cardW + gap) * 2;

    const rowY = L.resourceY + cardH / 2;

    // === 金币卡片（左列,渐变：金色）===
    const coinCardX = leftX + cardW / 2;
    drawVerticalGradientRect(this, coinCardX, rowY, cardW, cardH, 0xE6D75A, 0xA89F2E, 12, 0.16);
    this.add.text(leftX + RESOURCE_CARD.paddingX, rowY - cardH / 2 + RESOURCE_CARD.paddingTop, '🪙 金币', {
      fontSize: RESOURCE_CARD.labelSize,
      color: '#F7F3C8',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.labelStroke,
    }).setOrigin(0, 0);
    this.coinText = this.add.text(leftX + cardW - RESOURCE_CARD.paddingX, rowY + cardH / 2 - 6, String(coins), {
      fontSize: RESOURCE_CARD.valueSize,
      color: RESOURCE_CARD.valueColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.valueStroke,
    }).setOrigin(1, 1);

    // === 体力卡片（中列,渐变：绿色）===
    const energyCardX = midX + cardW / 2;
    drawVerticalGradientRect(this, energyCardX, rowY, cardW, cardH, 0x7ED7B2, 0x3FA37A, 12, 0.14);
    this.add.text(midX + RESOURCE_CARD.paddingX, rowY - cardH / 2 + RESOURCE_CARD.paddingTop, '⚡ 体力', {
      fontSize: RESOURCE_CARD.labelSize,
      color: '#E9FFF5',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.labelStroke,
    }).setOrigin(0, 0);
    this.energyText = this.add.text(midX + cardW - RESOURCE_CARD.paddingX, rowY + cardH / 2 - 6, `${energy}/${maxEnergy}`, {
      fontSize: RESOURCE_CARD.valueSize,
      color: RESOURCE_CARD.valueColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.valueStroke,
    }).setOrigin(1, 1);

    // === 重量卡片（右列,渐变：蓝色,显示累计重量）===
    const weightCardX = rightX + cardW / 2;
    drawVerticalGradientRect(this, weightCardX, rowY, cardW, cardH, 0x6EC1FF, 0x3B82C4, 12, 0.15);
    this.add.text(rightX + RESOURCE_CARD.paddingX, rowY - cardH / 2 + RESOURCE_CARD.paddingTop, '⚖️ 累计重量', {
      fontSize: RESOURCE_CARD.labelSize,
      color: '#EAF6FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.labelStroke,
    }).setOrigin(0, 0);
    // 首页累计重量卡单独兜底：0 时显示 0kg，不显示空白
    const weightDisplayText = totalFishWeight > 0 ? formatWeight(totalFishWeight) : '0kg';
    this.weightText = this.add.text(rightX + cardW - RESOURCE_CARD.paddingX, rowY + cardH / 2 - 6, weightDisplayText, {
      fontSize: RESOURCE_CARD.valueSize,
      color: RESOURCE_CARD.valueColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.valueStroke,
    }).setOrigin(1, 1);
  }

  // ==================================================
  // 3. goalSection - 今日任务区（使用 DailyTaskPanel 组件）
  // ==================================================
  private renderGoalSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    const y = L.goalY + LAYOUT_SPEC.goalHeight / 2;
    const tasks = DailyMissionManager.instance.getTasks();

    // 创建任务面板（container 放在任务区左上角）
    const panelX = L.pagePadding;  // 任务区左边缘
    const panelY = L.goalY;         // 任务区上边缘
    this.taskPanel = new DailyTaskPanel(this, panelX, panelY, tasks.length);

    // 设置标题
    this.taskPanel.setTitle('📋 今日任务');

    // 添加任务项
    tasks.forEach((task, index) => {
      const taskData: TaskItemData = {
        title: task.title,
        progress: task.progress,
        target: task.target,
        rewardText: '🪙 +50',
        state: this.getTaskState(task),
      };

      const taskItem = this.taskPanel!.addTaskItem(this, taskData, index);

      // 设置点击事件（仅可领取状态）
      if (taskData.state === 'claimable') {
        taskItem.setOnClick(() => this.onClaimTaskReward(task.id, taskItem));
      }
    });
  }

  /**
   * 获取任务状态
   */
  private getTaskState(task: DailyTask): 'todo' | 'claimable' | 'claimed' {
    if (task.claimed) return 'claimed';
    if (task.progress >= task.target) return 'claimable';
    return 'todo';
  }

  /**
   * 领取单个任务奖励
   */
  private onClaimTaskReward(taskId: string, taskItem: TaskItem) {
    SimpleAudio.unlock();
    SimpleAudio.click();

    const claimed = DailyMissionManager.instance.claimTaskReward(taskId);
    if (claimed) {
      // 发放金币（每个任务 50 金币）
      CoinManager.instance.addCoins(50);
      SaveSync.save();

      // 更新任务项状态
      taskItem.updateState('claimed');
    }
  }

  // ==================================================
  // 入口栏 Section - 图鉴/任务/设置（3 个入口,放在开始钓鱼下方）
  // ==================================================
  private renderNavBarSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    
    // 临时硬定位验证：强制放在"开始钓鱼"按钮正下方 30px
    const actionBottomY = L.actionY + LAYOUT_SPEC.actionHeight;  // 506 + 90 = 596
    const y = actionBottomY + 30 + LAYOUT_SPEC.navBarHeight / 2;  // 596 + 30 + 30 = 656

    const summary = CollectionManager.getSummary();

    // 3 个入口按钮配置（统一结构：图标 + 文案，无副文案）
    const navButtons = [
      { key: 'collection', label: '📖 图鉴', onClick: () => {
        SimpleAudio.click();
        this.scene.start('CollectionScene');
      }},
      { key: 'tasks', label: '📝 任务', onClick: () => {
        SimpleAudio.click();
        this.scene.start('TaskScene');
      }},
      { key: 'settings', label: '⚙️ 设置', onClick: () => {
        SimpleAudio.click();
        new SettingsModal(this).show();
      }},
    ];



    // 计算布局（3 个按钮，保持等间距，整体居中）
    const btnWidth = 120;                // 原 150 → 120
    const btnHeight = 42;                // 原 50 → 42
    const gap = 12;
    const totalWidth = btnWidth * 3 + gap * 2;  // 3 个按钮，2 个间距
    const startX = x - totalWidth / 2 + btnWidth / 2;  // 整体居中


    navButtons.forEach((btn, index) => {
      const btnX = startX + index * (btnWidth + gap);
      const btnY = y;

      // 按钮背景（正式视觉：深紫色 + 轻描边）
      const btnBg = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0x6c5ce7);
      btnBg.setStrokeStyle(1, 0x5A4F7F);
      btnBg.setInteractive({ useHandCursor: true });

      // 扩大点击区域（保持原点击区域不变）
      const hitArea = this.add.rectangle(btnX, btnY, btnWidth + 38, btnHeight + 18, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => btn.onClick());

      // 主文案（正式视觉：白色文字,垂直居中）
      const labelText = this.add.text(btnX, btnY, btn.label, {
        fontSize: '16px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // 图鉴按钮呼吸动效（减弱幅度）
      if (btn.key === 'collection') {
        this.tweens.add({
          targets: btnBg,
          scaleX: 1.03,
          scaleY: 1.03,
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        // 文字也跟随缩放
        this.tweens.add({
          targets: labelText,
          scaleX: 1.03,
          scaleY: 1.03,
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  /** 刷新金币显示 */
  private refreshCoinsUI() {
    const coins = CoinManager.instance.getCoins();
    if (this.coinText) {
      this.coinText.setText(String(coins));
    }
  }

  // ==================================================
  // 4. actionSection - 主行动区（最终版 CTA 按钮,移动端适配）
  // ==================================================
  private renderActionSection(L: ReturnType<typeof this.calculateLayout>, isFullEnergy: boolean) {
    const x = L.centerX;
    const startBtnY = L.actionY + LAYOUT_SPEC.actionHeight / 2;
    const startBtnW = 260;
    const startBtnH = 72;

    // 按钮阴影（先绘制,在按钮下方）
    const shadow = this.add.rectangle(x, startBtnY + 6, startBtnW, startBtnH, 0x000000, 0.22);
    shadow.setOrigin(0.5);

    // 按钮背景（渐变：红色系,带顶部高光）
    drawVerticalGradientRect(this, x, startBtnY, startBtnW, startBtnH, 0xFF7A7A, 0xFF4D4D, 12, 0.18);

    // 按钮文字（增强压强：描边 + 阴影）
    this.add.text(x, startBtnY, '开始钓鱼', {
      fontSize: '36px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        color: '#000000',
        offsetX: 0,
        offsetY: 3,
        blur: 4,
        fill: true,
      },
    }).setOrigin(0.5);

    // 按钮交互（使用透明矩形作为点击区域）
    const hitArea = this.add.rectangle(x, startBtnY, startBtnW, startBtnH, 0x000000, 0);
    hitArea.setOrigin(0.5);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.onStartFishing());
  }

  // ==================================================
  // 5. oceanSection - 简洁背景区（统一为浅蓝色,与主背景一致）
  // ==================================================
  private renderOceanSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;

    // 简洁背景（浅蓝色,与主背景 #8FD3FF 一致）
    this.add.rectangle(x, L.oceanY + L.oceanHeight / 2, L.width, L.oceanHeight, 0x8FD3FF);
  }


  // ==================================================
  // 按钮交互逻辑
  // ==================================================
  private onStartFishing() {
    SimpleAudio.unlock();
    SimpleAudio.click();

    const energyBefore = EnergyManager.instance.getEnergy();
    console.log('[MainScene] onStartFishing - energy before:', energyBefore);

    if (!EnergyManager.instance.hasEnergy()) {
      console.log('[MainScene] no energy, show EnergyModal');
      this.showEnergyModal();
      return;
    }

    AnalyticsManager.instance.onStartRound();
    EnergyManager.instance.costEnergy();

    const energyAfter = EnergyManager.instance.getEnergy();
    console.log('[MainScene] energy after costEnergy:', energyAfter);

    SaveSync.save();
    console.log('[MainScene] save called');

    this.scene.start('FishingScene', {
      round: DirectorSystem.getRoundNumber(),
    });
  }

  private showEnergyModal() {
    const currentEnergy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    const modal = new EnergyModal(this, {
      currentEnergy,
      maxEnergy,
      onRecharge: () => {
        // 补充体力（本轮模拟,不接真实广告）
        EnergyManager.instance.addEnergy(3);
        SaveSync.save();
        modal.hide();
        // 刷新首页体力显示
        this.refreshEnergyUI();
      },
      onCancel: () => {
        modal.hide();
      },
    });
    modal.show();
  }

  private refreshEnergyUI() {
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    if (this.energyText) {
      this.energyText.setText(`${energy}/${maxEnergy}`);
    }
  }
}
