import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { CoinManager } from './CoinManager';
import { RecordManager } from './RecordManager';
import { DirectorSystem } from './DirectorSystem';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';
import { AnalyticsManager } from './AnalyticsManager';
import { DailyMissionManager, type DailyTask } from './DailyMissionManager';
import { EnergyModal } from './EnergyModal';
import { CollectionManager } from './managers/CollectionManager';

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

  // 各 section Y 位置（移动端稳态）
  brandY: 74,                      // 品牌区起始 Y（下移 54px，与信息卡同步）
  brandHeight: 112,                // 品牌区高度（增加呼吸感）
  resourceY: 196,                  // 资源区起始 Y（下移 54px，使信息卡底部→今日任务 = 22px）
  resourceHeight: 54,              // 3 卡组高度（单行）
  goalY: 272,                      // 目标区起始 Y（保持不变）
  goalHeight: 160,                 // 目标区高度
  goalInnerPadding: 20,            // 今日任务模块内部左右内边距
  actionY: 454,                    // 按钮区起始 Y（保持不变）
  actionHeight: 90,                // 按钮区高度
  navBarY: 568,                    // 入口栏 Y 位置（开始钓鱼下方）
  navBarHeight: 60,                // 入口栏高度
  oceanY: 650,                     // 水域区起始 Y（下移，承接入口栏）
  sandHeight: 120,                 // 沙地固定高度
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
 * @param highlightAlpha 顶部高光透明度（默认 0.14，0 则无高光）
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
  private goalFooterText!: Phaser.GameObjects.Text;
  private goalFooterHitArea!: Phaser.GameObjects.Rectangle;

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

  private calculateLayout() {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;
    const centerX = width / 2;

    // 动态计算 contentWidth（基于统一 pagePadding）
    const contentWidth = width - LAYOUT_SPEC.pagePadding * 2;

    // 动态计算 oceanHeight（沙地固定高度，水域吃满剩余区域）
    const oceanHeight = height - LAYOUT_SPEC.oceanY - LAYOUT_SPEC.sandHeight;
    const sandY = LAYOUT_SPEC.oceanY + oceanHeight;

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
      goalY: LAYOUT_SPEC.goalY,
      goalInnerPadding: LAYOUT_SPEC.goalInnerPadding,
      actionY: LAYOUT_SPEC.actionY,
      oceanY: LAYOUT_SPEC.oceanY,
      oceanHeight,
      sandY,
    };
  }


  create() {
    const L = this.calculateLayout();
    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    DailyMissionManager.instance.init();

    this.cameras.main.setBackgroundColor('#8FD3FF');

    // === 渲染 5 个 section ===
    this.renderBrandSection(L);
    this.renderResourceSection(L, coins, energy, maxEnergy);
    this.renderGoalSection(L);
    this.renderActionSection(L, energy >= maxEnergy);
    this.renderNavBarSection(L);
    this.renderOceanSection(L);
  }

  // ==================================================
  // 1. brandSection - 顶部品牌区（增加呼吸感）
  // ==================================================
  private renderBrandSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;

    // 云朵装饰（弱化，不抢视觉）
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
    this.add.text(x, L.brandY + 96, '看准时机，一杆出货', {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
  }

  // ==================================================
  // 2. resourceSection - 资源区（3 卡布局：金币/体力/重量，移动端适配）
  // ==================================================
  private renderResourceSection(
    L: ReturnType<typeof this.calculateLayout>,
    coins: number,
    energy: number,
    maxEnergy: number
  ) {
    const cardH = RESOURCE_CARD.height;
    const gap = RESOURCE_CARD.gap;

    // 动态计算卡片宽度（3 卡等分，基于统一 pagePadding）
    const cardW = (L.contentWidth - gap * 2) / 3;

    // 左对齐位置（基于统一 pagePadding）
    const leftX = L.pagePadding;
    const midX = leftX + cardW + gap;
    const rightX = leftX + (cardW + gap) * 2;

    const rowY = L.resourceY + cardH / 2;

    // === 金币卡片（左列，渐变：金色）===
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

    // === 体力卡片（中列，渐变：绿色）===
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

    // === 重量卡片（右列，渐变：蓝色，占位展示）===
    const weightCardX = rightX + cardW / 2;
    drawVerticalGradientRect(this, weightCardX, rowY, cardW, cardH, 0x6EC1FF, 0x3B82C4, 12, 0.15);
    this.add.text(rightX + RESOURCE_CARD.paddingX, rowY - cardH / 2 + RESOURCE_CARD.paddingTop, '⚖️ 重量', {
      fontSize: RESOURCE_CARD.labelSize,
      color: '#EAF6FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.labelStroke,
    }).setOrigin(0, 0);
    this.add.text(rightX + cardW - RESOURCE_CARD.paddingX, rowY + cardH / 2 - 6, '-- kg', {
      fontSize: RESOURCE_CARD.valueSize,
      color: RESOURCE_CARD.valueColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.valueStroke,
    }).setOrigin(1, 1);
  }

  // ==================================================
  // 3. goalSection - 今日目标区（三层结构：标题层/内容层/footer 层，移动端适配）
  // ==================================================
  private renderGoalSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    const y = L.goalY + LAYOUT_SPEC.goalHeight / 2;

    // 卡片外框（基于统一 pagePadding）
    const goalX = L.pagePadding;
    const goalWidth = L.contentWidth;

    // 卡片背景
    const goalBg = this.add.rectangle(x, y, goalWidth, LAYOUT_SPEC.goalHeight, 0x1a3a52, 0.75)
      .setStrokeStyle(1, 0xffffff, 0.3);

    // 内部内容边距（使用 goalInnerPadding）
    const innerPadding = L.goalInnerPadding;
    const contentLeftX = goalX + innerPadding;
    const contentRightX = goalX + goalWidth - innerPadding;

    // ========== 标题层（左中右三段式，统一基线）==========
    const titleY = L.goalY + 18;

    // 左：今日任务
    this.add.text(contentLeftX, titleY, '📋 今日任务', {
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);

    // 中：阶段激励（标题下方，与左右元素同一基线，增强视觉压强）
    const streak = DailyMissionManager.instance.getStreakDays();
    if (streak >= 1 && streak < 7) {
      const milestones = [3, 5, 7];
      const nextMilestone = milestones.find(m => m > streak) ?? 7;
      const diff = nextMilestone - streak;
      this.add.text(x, titleY, `再坚持${diff}天，解锁惊喜奖励`, {
        fontSize: '12px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5);
    }

    // 右：连续天数
    if (streak > 0) {
      this.add.text(contentRightX, titleY, `🔥 连续${streak}天`, {
        fontSize: '12px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(1, 0.5);
    }

    // ========== 内容层（3 条任务）==========
    const taskStartY = L.goalY + 52;
    const taskGap = 36;

    const tasks = DailyMissionManager.instance.getTasks();
    tasks.forEach((task, index) => {
      const taskBaseY = taskStartY + index * taskGap;

      // 任务名称（左对齐，使用 contentLeftX 计算）
      this.add.text(contentLeftX, taskBaseY, task.title, {
        fontSize: '14px',
        color: '#F0F8FF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0, 0.5);

      // 进度条（右侧，进度值放入内部）
      const barY = taskBaseY;
      const barW = PROGRESS_BAR.width;
      const barH = PROGRESS_BAR.height;
      const barX = contentRightX - barW;

      // 进度条背景（暗色槽）
      const barBg = this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x000000, 0.6);
      barBg.setStrokeStyle(1, 0xffffff, 0.2);

      // 进度条填充（绿色）
      const progress = Math.min(1, task.progress / task.target);
      const barFill = this.add.rectangle(barX + barW / 2 * progress, barY, barW * progress, barH, 0x4CAF50);

      // 进度值（放入进度条内部居中）
      this.add.text(barX + barW - 6, barY, `${task.progress}/${task.target}`, {
        fontSize: PROGRESS_BAR.labelSize,
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 1,
      }).setOrigin(1, 0.5);
    });

    // ========== footer 层（独立一层，底部中心）==========
    this.renderGoalFooter(L, DailyMissionManager.instance.isAllCompleted(), DailyMissionManager.instance.isRewardClaimed());
  }

  /** 渲染目标区底部 footer（统一收口方法） */
  private renderGoalFooter(
    L: ReturnType<typeof this.calculateLayout>,
    allCompleted: boolean,
    rewardClaimed: boolean
  ) {
    const x = L.centerX;
    const footerY = L.goalY + LAYOUT_SPEC.goalHeight - 14;

    // 先销毁旧的 footer 元素（如果有）
    this.destroyGoalFooter();

    if (allCompleted && !rewardClaimed) {
      // 可领取状态：显示可点击的领取文案
      this.goalFooterText = this.add.text(x, footerY, '🎁 点击领取 100 金币', {
        fontSize: '12px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0);

      // 添加点击热区
      this.goalFooterHitArea = this.add.rectangle(x, footerY, 220, 32, 0x000000, 0);
      this.goalFooterHitArea.setInteractive({ useHandCursor: true });
      this.goalFooterHitArea.on('pointerdown', () => this.onClaimDailyReward());
    } else if (allCompleted && rewardClaimed) {
      // 已领取状态
      this.goalFooterText = this.add.text(x, footerY, '✅ 今日目标奖励已领取', {
        fontSize: '12px',
        color: '#90EE90',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0);
    }
    // 其他状态（未完成）：不显示 footer 文字
  }

  // ==================================================
  // 入口栏 Section - 图鉴/任务/奖励/设置（4 个入口，放在开始钓鱼下方）
  // ==================================================
  private renderNavBarSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    const y = LAYOUT_SPEC.navBarY + LAYOUT_SPEC.navBarHeight / 2;

    const summary = CollectionManager.getSummary();

    // 4 个入口按钮配置
    const navButtons = [
      { key: 'collection', label: '📖 图鉴', subLabel: `${summary.unlocked}/${summary.total}`, onClick: () => {
        SimpleAudio.click();
        this.scene.start('CollectionScene');
      }},
      { key: 'tasks', label: '📝 任务', subLabel: '', onClick: () => {
        SimpleAudio.click();
        // 预留入口，暂不实现业务逻辑
      }},
      { key: 'rewards', label: '🎁 奖励', subLabel: '', onClick: () => {
        SimpleAudio.click();
        // 预留入口，暂不实现业务逻辑
      }},
      { key: 'settings', label: '⚙️ 设置', subLabel: '', onClick: () => {
        SimpleAudio.click();
        // 预留入口，暂不实现业务逻辑
      }},
    ];

    // 计算布局（缩小至约 80%）
    const btnWidth = 120;                // 原 150 → 120
    const btnHeight = 42;                // 原 50 → 42
    const gap = 12;
    const totalWidth = btnWidth * 4 + gap * 3;
    const startX = x - totalWidth / 2 + btnWidth / 2;

    navButtons.forEach((btn, index) => {
      const btnX = startX + index * (btnWidth + gap);
      const btnY = y;

      // 按钮背景（弱化：浅紫灰，降低饱和度）
      const btnBg = this.add.rectangle(btnX, btnY, btnWidth, btnHeight, 0x9B8FBF);
      btnBg.setInteractive({ useHandCursor: true });

      // 扩大点击区域（保持原点击区域不变）
      const hitArea = this.add.rectangle(btnX, btnY, btnWidth + 38, btnHeight + 18, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => btn.onClick());

      // 主文案（弱化颜色）
      const labelText = this.add.text(btnX, btnY - 4, btn.label, {
        fontSize: '16px',
        color: '#E8E4F0',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // 副文案（仅图鉴显示进度，弱化颜色）
      if (btn.subLabel) {
        this.add.text(btnX, btnY + 12, btn.subLabel, {
          fontSize: '10px',
          color: '#C8C4D0',
        }).setOrigin(0.5);
      }

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

  /** 销毁旧的 footer 元素 */
  private destroyGoalFooter() {
    if (this.goalFooterText) {
      this.goalFooterText.destroy();
      this.goalFooterText = undefined as unknown as Phaser.GameObjects.Text;
    }
    if (this.goalFooterHitArea) {
      this.goalFooterHitArea.destroy();
      this.goalFooterHitArea = undefined as unknown as Phaser.GameObjects.Rectangle;
    }
  }

  /** 领取每日目标奖励 */
  private onClaimDailyReward() {
    SimpleAudio.unlock();
    SimpleAudio.click();

    const claimed = DailyMissionManager.instance.claimAllCompletedReward();
    if (!claimed) {
      // 领取失败（可能已被领取），刷新 UI
      this.refreshGoalSection();
      return;
    }

    // 发放金币
    CoinManager.instance.addCoins(this.DAILY_MISSION_REWARD);
    SaveSync.save();

    // 刷新 UI
    this.refreshCoinsUI();
    this.refreshGoalSection();
  }

  /** 刷新金币显示 */
  private refreshCoinsUI() {
    const coins = CoinManager.instance.getCoins();
    if (this.coinText) {
      this.coinText.setText(String(coins));
    }
  }

  /** 刷新目标区显示 */
  private refreshGoalSection() {
    const allCompleted = DailyMissionManager.instance.isAllCompleted();
    const rewardClaimed = DailyMissionManager.instance.isRewardClaimed();
    const L = this.calculateLayout();
    this.renderGoalFooter(L, allCompleted, rewardClaimed);
  }

  // ==================================================
  // 4. actionSection - 主行动区（最终版 CTA 按钮，移动端适配）
  // ==================================================
  private renderActionSection(L: ReturnType<typeof this.calculateLayout>, isFullEnergy: boolean) {
    const x = L.centerX;
    const startBtnY = L.actionY + LAYOUT_SPEC.actionHeight / 2;
    const startBtnW = 260;
    const startBtnH = 72;

    // 按钮阴影（先绘制，在按钮下方）
    const shadow = this.add.rectangle(x, startBtnY + 6, startBtnW, startBtnH, 0x000000, 0.22);
    shadow.setOrigin(0.5);

    // 按钮背景（渐变：红色系，带顶部高光）
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
  // 5. oceanSection - 简洁背景区（移除海洋装饰，保持页面干净）
  // ==================================================
  private renderOceanSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;

    // 简洁背景（浅蓝渐变，承接上方内容）
    drawVerticalGradientRect(this, x, L.oceanY + L.oceanHeight / 2, L.width, L.oceanHeight, 0xE8F4FF, 0xD0E8FF, 8, 0);
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
        // 补充体力（本轮模拟，不接真实广告）
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
