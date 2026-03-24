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

type SwimVisual = {
  emoji: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  scale: number;
  drift: number;
};

// ==================================================
// 首页统一 layoutSpec - 管理所有 section 的纵向布局
// ==================================================
const LAYOUT_SPEC = {
  // 基础参数（移动端适配）
  safeTop: 26,
  safeBottom: 0,
  horizontalPadding: 16,           // 左右内边距（适配手机）
  contentWidth: 0,                 // 动态计算：width - 32
  sectionGap: 18,
  sectionGapLoose: 24,

  // 各 section Y 位置（移动端稳态）
  brandY: 20,                      // 品牌区起始 Y
  brandHeight: 112,                // 品牌区高度（增加呼吸感）
  resourceY: 142,                  // 资源区起始 Y（下移）
  resourceHeight: 126,             // 2x2 卡组高度（54+10+54+8）
  goalY: 272,                      // 目标区起始 Y
  goalHeight: 160,                 // 目标区高度
  actionY: 454,                    // 按钮区起始 Y
  actionHeight: 90,                // 按钮区高度
  oceanY: 560,                     // 水域区起始 Y
  sandHeight: 160,                 // 沙地固定高度（压缩沙地，增加水域）
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
  private swimmers: Phaser.GameObjects.Text[] = [];
  private swimmerData: SwimVisual[] = [];

  // UI 引用
  private coinText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private goalFooterText!: Phaser.GameObjects.Text;
  private goalFooterHitArea!: Phaser.GameObjects.Rectangle;
  private missionTaskContainers: Phaser.GameObjects.Container[] = [];

  // 目标奖励金额（V1 局部常量）
  private readonly DAILY_MISSION_REWARD = 100;

  // Section 容器
  private brandSection!: Phaser.GameObjects.Container;
  private resourceSection!: Phaser.GameObjects.Container;
  private goalSection!: Phaser.GameObjects.Container;
  private actionSection!: Phaser.GameObjects.Container;
  private oceanSection!: Phaser.GameObjects.Container;

  constructor() {
    super('MainScene');
  }

  private calculateLayout() {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;
    const centerX = width / 2;

    // 动态计算 contentWidth（移动端适配）
    const contentWidth = width - 32;  // horizontalPadding * 2

    // 动态计算 oceanHeight（沙地固定高度，水域吃满剩余区域）
    const oceanHeight = height - LAYOUT_SPEC.oceanY - LAYOUT_SPEC.sandHeight;
    const sandY = LAYOUT_SPEC.oceanY + oceanHeight;

    return {
      width,
      height,
      centerX,
      contentWidth,
      safeTop: LAYOUT_SPEC.safeTop,
      safeBottom: LAYOUT_SPEC.safeBottom,
      brandY: LAYOUT_SPEC.brandY,
      resourceY: LAYOUT_SPEC.resourceY,
      goalY: LAYOUT_SPEC.goalY,
      actionY: LAYOUT_SPEC.actionY,
      oceanY: LAYOUT_SPEC.oceanY,
      oceanHeight,
      sandY,
    };
  }

  private getTodayBestCatchSafe(): string {
    const rm: any = RecordManager.instance as any;
    if (rm && typeof rm.getTodayBestCatch === 'function') return rm.getTodayBestCatch() || '暂无';
    if (rm && typeof rm.getBestCatch === 'function') return rm.getBestCatch() || '暂无';
    if (rm && typeof rm.getBest === 'function') return rm.getBest() || '暂无';
    if (rm && typeof rm.bestCatch === 'string') return rm.bestCatch || '暂无';
    return '暂无';
  }

  private getTodayWeirdCatchSafe(): string {
    const rm: any = RecordManager.instance as any;
    if (rm && typeof rm.getTodayWeirdCatch === 'function') return rm.getTodayWeirdCatch() || '暂无';
    if (rm && typeof rm.getWeirdCatch === 'function') return rm.getWeirdCatch() || '暂无';
    if (rm && typeof rm.getWeird === 'function') return rm.getWeird() || '暂无';
    if (rm && typeof rm.weirdCatch === 'string') return rm.weirdCatch || '暂无';
    return '暂无';
  }

  create() {
    this.swimmers = [];
    this.swimmerData = [];
    this.missionTaskContainers = [];

    const L = this.calculateLayout();
    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    const bestCatch = this.getTodayBestCatchSafe();
    const weirdCatch = this.getTodayWeirdCatchSafe();

    DailyMissionManager.instance.init();

    this.cameras.main.setBackgroundColor('#8FD3FF');

    // === 渲染 5 个 section ===
    this.renderBrandSection(L);
    this.renderResourceSection(L, coins, energy, maxEnergy, bestCatch, weirdCatch);
    this.renderGoalSection(L);
    this.renderActionSection(L, energy >= maxEnergy);
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
  // 2. resourceSection - 资源区（2x2 统一卡组，移动端适配）
  // ==================================================
  private renderResourceSection(
    L: ReturnType<typeof this.calculateLayout>,
    coins: number,
    energy: number,
    maxEnergy: number,
    bestCatch: string,
    weirdCatch: string
  ) {
    const cardH = RESOURCE_CARD.height;
    const gap = RESOURCE_CARD.gap;
    const rowGap = RESOURCE_CARD.rowGap;

    // 动态计算卡片宽度（与今日目标卡右边界严格对齐）
    const cardW = (L.contentWidth - gap) / 2;

    // 左对齐位置
    const leftX = LAYOUT_SPEC.horizontalPadding;
    // 右列 X = 左边界 + 卡片宽度 + 间距
    const rightX = leftX + cardW + gap;

    const row1Y = L.resourceY + cardH / 2;
    const row2Y = row1Y + cardH + rowGap;

    // === 第一排：金币、体力（高优先级）===
    // 金币卡片（左列，渐变：金色）
    const coinCardX = leftX + cardW / 2;
    drawVerticalGradientRect(this, coinCardX, row1Y, cardW, cardH, 0xE6D75A, 0xA89F2E, 12, 0.16);
    this.add.text(leftX + RESOURCE_CARD.paddingX, row1Y - cardH / 2 + RESOURCE_CARD.paddingTop, '🪙 金币', {
      fontSize: RESOURCE_CARD.labelSize,
      color: '#F7F3C8',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.labelStroke,
    }).setOrigin(0, 0);
    this.coinText = this.add.text(leftX + cardW - RESOURCE_CARD.paddingX, row1Y + cardH / 2 - 6, String(coins), {
      fontSize: RESOURCE_CARD.valueSize,
      color: RESOURCE_CARD.valueColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.valueStroke,
    }).setOrigin(1, 1);

    // 体力卡片（右列，渐变：绿色）
    const energyCardX = rightX + cardW / 2;
    drawVerticalGradientRect(this, energyCardX, row1Y, cardW, cardH, 0x7ED7B2, 0x3FA37A, 12, 0.14);
    this.add.text(rightX + RESOURCE_CARD.paddingX, row1Y - cardH / 2 + RESOURCE_CARD.paddingTop, '⚡ 体力', {
      fontSize: RESOURCE_CARD.labelSize,
      color: '#E9FFF5',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.labelStroke,
    }).setOrigin(0, 0);
    this.energyText = this.add.text(rightX + cardW - RESOURCE_CARD.paddingX, row1Y + cardH / 2 - 6, `${energy}/${maxEnergy}`, {
      fontSize: RESOURCE_CARD.valueSize,
      color: RESOURCE_CARD.valueColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.valueStroke,
    }).setOrigin(1, 1);

    // === 第二排：最佳渔获、最离谱战绩（低优先级）===
    // 最佳渔获卡片（左列，渐变：蓝色）
    const bestCardX = leftX + cardW / 2;
    drawVerticalGradientRect(this, bestCardX, row2Y, cardW, cardH, 0x6EC1FF, 0x3B82C4, 12, 0.15);
    this.add.text(leftX + RESOURCE_CARD.paddingX, row2Y - cardH / 2 + RESOURCE_CARD.paddingTop, '⭐ 最佳渔获', {
      fontSize: RESOURCE_CARD.labelSize,
      color: '#EAF6FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.labelStroke,
    }).setOrigin(0, 0);
    this.add.text(leftX + cardW - RESOURCE_CARD.paddingX, row2Y + cardH / 2 - 6, bestCatch, {
      fontSize: RESOURCE_CARD.valueSize,
      color: RESOURCE_CARD.valueColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.valueStroke,
    }).setOrigin(1, 1);

    // 最离谱战绩卡片（右列，渐变：紫色）
    const weirdCardX = rightX + cardW / 2;
    drawVerticalGradientRect(this, weirdCardX, row2Y, cardW, cardH, 0xC6A9FF, 0x7B5AC8, 12, 0.15);
    this.add.text(rightX + RESOURCE_CARD.paddingX, row2Y - cardH / 2 + RESOURCE_CARD.paddingTop, '🤯 最离谱战绩', {
      fontSize: RESOURCE_CARD.labelSize,
      color: '#FFF0FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: RESOURCE_CARD.labelStroke,
    }).setOrigin(0, 0);
    this.add.text(rightX + cardW - RESOURCE_CARD.paddingX, row2Y + cardH / 2 - 6, weirdCatch, {
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

    // 卡片外框（使用动态 contentWidth）
    const goalX = LAYOUT_SPEC.horizontalPadding;
    const goalWidth = L.contentWidth;

    // 卡片背景
    const goalBg = this.add.rectangle(x, y, goalWidth, LAYOUT_SPEC.goalHeight, 0x1a3a52, 0.75)
      .setStrokeStyle(1, 0xffffff, 0.3);

    // ========== 标题层（左中右三段式，统一基线）==========
    const titleY = L.goalY + 18;

    // 左：今日目标
    this.add.text(goalX + 12, titleY, '📋 今日目标', {
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
      this.add.text(goalX + goalWidth - 12, titleY, `🔥 连续${streak}天`, {
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

      // 任务名称（左对齐，使用 goalX 计算）
      this.add.text(goalX + 12, taskBaseY, task.title, {
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
      const barX = goalX + goalWidth - 12 - barW;

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
  // 5. oceanSection - 水下氛围区（最终版可投流场景，沙地贴底）
  // ==================================================
  private renderOceanSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;

    // 水下背景（深蓝色）
    this.add.rectangle(x, L.oceanY + L.oceanHeight / 2, L.width, L.oceanHeight, 0x1e88e5);

    // 水面提示文案（靠近水面，清晰可读，层级最高）
    const infoY = L.oceanY + 18;
    const tipText = this.add.text(x, infoY, '💡 浮漂明显下沉时再拉杆，更容易拿高奖励', {
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);
    tipText.setDepth(1000);

    // ========== 鱼群（三层生态，分层游动）==========
    // 上层（3-4 条小鱼，靠近水面）
    this.addSwimmer('🐟', 120, L.oceanY + 35, 0.75, 0.5);
    this.addSwimmer('🐠', 280, L.oceanY + 50, 0.7, 0.45);
    this.addSwimmer('🐡', 450, L.oceanY + 40, 0.8, 0.55);
    this.addSwimmer('🐟', 620, L.oceanY + 55, 0.65, 0.4);

    // 中层（5-6 条主体鱼类）
    this.addSwimmer('🐠', 100, L.oceanY + 90, 0.9, 0.6);
    this.addSwimmer('🐟', 240, L.oceanY + 105, 0.95, 0.65);
    this.addSwimmer('🦀', 380, L.oceanY + 95, 0.65, 0.45);
    this.addSwimmer('🦐', 500, L.oceanY + 110, 0.55, 0.4);
    this.addSwimmer('🐠', 600, L.oceanY + 100, 0.85, 0.55);

    // 下层（3-4 条慢速生物/乌龟，靠近沙地）
    this.addSwimmer('🐢', 160, L.oceanY + 155, 1.05, 0.35);
    this.addSwimmer('🐡', 320, L.oceanY + 170, 1.1, 0.4);
    this.addSwimmer('🐟', 480, L.oceanY + 160, 0.95, 0.45);
    this.addSwimmer('🐢', 640, L.oceanY + 175, 1.15, 0.3);

    // ========== 珊瑚礁（固定装饰，左右收边）==========
    this.add.text(90, L.sandY - 18, '🪸', { fontSize: '40px' }).setOrigin(0.5);
    this.add.text(240, L.sandY - 22, '🪸', { fontSize: '36px' }).setOrigin(0.5);
    this.add.text(510, L.sandY - 20, '🪸', { fontSize: '38px' }).setOrigin(0.5);
    this.add.text(670, L.sandY - 18, '🪸', { fontSize: '40px' }).setOrigin(0.5);

    // ========== 水生植物（固定装饰，中间呼吸感）==========
    this.add.text(160, L.sandY - 12, '🌿', { fontSize: '34px' }).setOrigin(0.5);
    this.add.text(340, L.sandY - 14, '🌱', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(580, L.sandY - 12, '🌿', { fontSize: '34px' }).setOrigin(0.5);

    // ========== 沙地区（底部完整场景，固定高度）==========
    const sandHeight = LAYOUT_SPEC.sandHeight;
    const sandCenterY = L.sandY - sandHeight / 2;
    this.add.rectangle(x, sandCenterY, L.width, sandHeight, 0xd8c28a, 0.95);

    // 沙地石头（点缀，不压住鱼）
    this.add.text(70, sandCenterY, '🪨', { fontSize: '28px' }).setOrigin(0.5);
    this.add.text(375, sandCenterY, '🪨', { fontSize: '26px' }).setOrigin(0.5);
    this.add.text(710, sandCenterY, '🪨', { fontSize: '28px' }).setOrigin(0.5);
  }

  /** 添加游动生物 */
  private addSwimmer(emoji: string, x: number, y: number, scale: number, speed: number) {
    const swimmer = this.add.text(x, y, emoji, { fontSize: `${32 * scale}px` }).setOrigin(0.5);
    this.swimmers.push(swimmer);
    this.swimmerData.push({
      emoji,
      x,
      y,
      dirX: Math.random() > 0.5 ? 1 : -1,
      dirY: Math.random() > 0.5 ? 1 : -1,
      speed: 0.3 + speed * 0.3,
      scale,
      drift: Math.random() * Math.PI * 2,
    });

    // 游动动画
    this.tweens.add({
      targets: swimmer,
      x: x + (Math.random() > 0.5 ? 60 : -60),
      duration: 3000 + Math.random() * 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: swimmer,
      y: y + (Math.random() > 0.5 ? 20 : -20),
      duration: 2000 + Math.random() * 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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
