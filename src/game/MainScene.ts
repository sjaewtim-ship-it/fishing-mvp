import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { CoinManager } from './CoinManager';
import { RecordManager } from './RecordManager';
import { DirectorSystem } from './DirectorSystem';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';
import { AnalyticsManager } from './AnalyticsManager';
import { DailyMissionManager } from './DailyMissionManager';
import { EnergyModal } from './EnergyModal';
import { UIConstants } from './UIConstants';

// ==================================================
// 首页统一 layoutSpec - 管理所有 section 的纵向布局
// ==================================================
const LAYOUT_SPEC = {
  // 基础参数
  topMargin: UIConstants.layout.safeTop,
  sectionGap: UIConstants.layout.sectionGap,
  horizontalPadding: UIConstants.layout.horizontalPadding,
  contentWidth: UIConstants.layout.contentWidth,

  // 各 section 高度
  brandHeight: 90,
  resourceHeight: 150,     // 容纳完整 2x2 卡组
  goalHeight: 200,         // 容纳三层任务结构
  actionHeight: 280,       // 大幅增加以确保与 ocean 彻底断开
};

export class MainScene extends Phaser.Scene {
  // UI 引用
  private energyText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private goalFooterText!: Phaser.GameObjects.Text;
  private goalFooterHitArea!: Phaser.GameObjects.Rectangle;

  // 目标奖励金额（V1 局部常量）
  private readonly DAILY_MISSION_REWARD = 100;

  constructor() {
    super('MainScene');
  }

  private calculateLayout() {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;
    const centerX = width / 2;
    const safeBottom = Math.max(130, Math.round(height * 0.1));

    // 从上到下计算各 section Y 位置
    const brandY = LAYOUT_SPEC.topMargin;
    const resourceY = brandY + LAYOUT_SPEC.brandHeight + LAYOUT_SPEC.sectionGap;
    const goalY = resourceY + LAYOUT_SPEC.resourceHeight + LAYOUT_SPEC.sectionGap;
    const actionY = goalY + LAYOUT_SPEC.goalHeight + LAYOUT_SPEC.sectionGap;
    const oceanY = actionY + LAYOUT_SPEC.actionHeight + LAYOUT_SPEC.sectionGap;
    const oceanHeight = height - oceanY - safeBottom;

    return {
      width,
      height,
      centerX,
      safeBottom,
      brandY,
      resourceY,
      goalY,
      actionY,
      oceanY,
      oceanHeight,
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
    this.renderActionSection(L);
    this.renderOceanSection(L);
  }

  // ==================================================
  // 1. brandSection - 顶部轻品牌区
  // ==================================================
  private renderBrandSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;

    // 云朵装饰（更弱化）
    const cloud1 = this.add.text(90, L.brandY + 15, '☁️', { fontSize: '32px' }).setAlpha(0.5);
    const cloud2 = this.add.text(530, L.brandY + 35, '☁️', { fontSize: '28px' }).setAlpha(0.5);

    this.tweens.add({
      targets: cloud1,
      x: 500,
      duration: 20000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: cloud2,
      x: 200,
      duration: 24000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 主标题（更稳）
    this.add.text(x, L.brandY + 40, '🎣 钓鱼小游戏', {
      fontSize: UIConstants.fonts.title,
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // slogan（更清晰）
    this.add.text(x, L.brandY + 78, '看准时机，一杆出货', {
      fontSize: UIConstants.fonts.md,
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ==================================================
  // 2. resourceSection - 资源区（两排两列完整卡组）
  // ==================================================
  private renderResourceSection(
    L: ReturnType<typeof this.calculateLayout>,
    coins: number,
    energy: number,
    maxEnergy: number,
    bestCatch: string,
    weirdCatch: string
  ) {
    const cardW = UIConstants.cards.resource.width;
    const cardH1 = 65;  // 第一排高度
    const cardH2 = 50;  // 第二排高度
    const gap = 16;
    const rowGap = 10;
    const radius = UIConstants.radius.md;

    // 计算左对齐位置
    const leftX = LAYOUT_SPEC.horizontalPadding;

    // === 第一排：金币、体力（高优先级）===
    const row1Y = L.resourceY + 30;

    // 金币卡片
    const coinCardX = leftX;
    const coinCardGraphics = this.add.graphics();
    coinCardGraphics.fillStyle(0xffd700, 0.45);
    coinCardGraphics.lineStyle(1, 0xffffff, 0.3);
    coinCardGraphics.fillRoundedRect(coinCardX, row1Y - cardH1 / 2, cardW, cardH1, radius);
    coinCardGraphics.strokeRoundedRect(coinCardX, row1Y - cardH1 / 2, cardW, cardH1, radius);
    this.add.text(coinCardX + 12, row1Y - cardH1 / 2 + 6, '🪙 金币', { fontSize: UIConstants.fonts.sm }).setOrigin(0, 0);
    this.coinsText = this.add.text(coinCardX + cardW - 12, row1Y + cardH1 / 2 - 6, String(coins), { fontSize: UIConstants.fonts.lg, color: '#FFE082', fontStyle: 'bold' }).setOrigin(1, 1);

    // 体力卡片
    const energyCardX = leftX + cardW + gap;
    const energyCardGraphics = this.add.graphics();
    energyCardGraphics.fillStyle(0x90ee90, 0.45);
    energyCardGraphics.lineStyle(1, 0xffffff, 0.3);
    energyCardGraphics.fillRoundedRect(energyCardX, row1Y - cardH1 / 2, cardW, cardH1, radius);
    energyCardGraphics.strokeRoundedRect(energyCardX, row1Y - cardH1 / 2, cardW, cardH1, radius);
    this.add.text(energyCardX + 12, row1Y - cardH1 / 2 + 6, '⚡ 体力', { fontSize: UIConstants.fonts.sm }).setOrigin(0, 0);
    this.energyText = this.add.text(energyCardX + cardW - 12, row1Y + cardH1 / 2 - 6, `${energy}/${maxEnergy}`, { fontSize: UIConstants.fonts.lg, color: '#90EE90', fontStyle: 'bold' }).setOrigin(1, 1);

    // === 第二排：最佳渔获、最离谱战绩（低优先级）===
    const row2Y = row1Y + cardH1 + rowGap;

    // 最佳渔获卡片
    const bestCardX = leftX;
    const bestCardGraphics = this.add.graphics();
    bestCardGraphics.fillStyle(0xffffff, 0.25);
    bestCardGraphics.lineStyle(1, 0xffffff, 0.2);
    bestCardGraphics.fillRoundedRect(bestCardX, row2Y - cardH2 / 2, cardW, cardH2, radius);
    bestCardGraphics.strokeRoundedRect(bestCardX, row2Y - cardH2 / 2, cardW, cardH2, radius);
    this.add.text(bestCardX + 12, row2Y - cardH2 / 2 + 6, '⭐ 最佳渔获', { fontSize: UIConstants.fonts.xs, fontStyle: 'bold' }).setOrigin(0, 0);
    this.add.text(bestCardX + cardW - 12, row2Y, bestCatch, { fontSize: UIConstants.fonts.md, color: '#E0F0FF', fontStyle: 'bold' }).setOrigin(1, 0.5);

    // 最离谱战绩卡片
    const weirdCardX = leftX + cardW + gap;
    const weirdCardGraphics = this.add.graphics();
    weirdCardGraphics.fillStyle(0xffffff, 0.25);
    weirdCardGraphics.lineStyle(1, 0xffffff, 0.2);
    weirdCardGraphics.fillRoundedRect(weirdCardX, row2Y - cardH2 / 2, cardW, cardH2, radius);
    weirdCardGraphics.strokeRoundedRect(weirdCardX, row2Y - cardH2 / 2, cardW, cardH2, radius);
    this.add.text(weirdCardX + 12, row2Y - cardH2 / 2 + 6, '🤯 最离谱战绩', { fontSize: UIConstants.fonts.xs, fontStyle: 'bold' }).setOrigin(0, 0);
    this.add.text(weirdCardX + cardW - 12, row2Y, weirdCatch, { fontSize: UIConstants.fonts.md, color: '#E0F0FF', fontStyle: 'bold' }).setOrigin(1, 0.5);
  }

  // ==================================================
  // 3. goalSection - 今日目标区（正式任务卡样式）
  // ==================================================
  private renderGoalSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    const radius = UIConstants.radius.lg;

    // 卡片背景（更深色，增强正式感）
    const goalCardGraphics = this.add.graphics();
    goalCardGraphics.fillStyle(0x1a3a52, 0.65);
    goalCardGraphics.lineStyle(2, 0xffffff, 0.25);
    goalCardGraphics.fillRoundedRect(LAYOUT_SPEC.horizontalPadding, L.goalY, LAYOUT_SPEC.contentWidth, LAYOUT_SPEC.goalHeight, radius);
    goalCardGraphics.strokeRoundedRect(LAYOUT_SPEC.horizontalPadding, L.goalY, LAYOUT_SPEC.contentWidth, LAYOUT_SPEC.goalHeight, radius);

    // 标题（增强层级）
    this.add.text(LAYOUT_SPEC.horizontalPadding + 15, L.goalY + 18, '📋 今日目标', {
      fontSize: UIConstants.fonts.lg,
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0);

    // 连续天数（标题右侧）
    const streak = DailyMissionManager.instance.getStreakDays();
    if (streak > 0) {
      this.add.text(LAYOUT_SPEC.horizontalPadding + LAYOUT_SPEC.contentWidth - 15, L.goalY + 18, `🔥 连续${streak}天`, {
        fontSize: UIConstants.fonts.sm,
        color: '#FFD700',
        fontStyle: 'bold',
      }).setOrigin(1, 0);
    }

    // 阶段激励提示（标题下方）
    if (streak >= 1 && streak < 7) {
      const milestones = [3, 5, 7];
      const nextMilestone = milestones.find(m => m > streak) ?? 7;
      const diff = nextMilestone - streak;
      this.add.text(L.centerX, L.goalY + 40, `再坚持${diff}天，解锁惊喜奖励`, {
        fontSize: UIConstants.fonts.xs,
        color: '#FFD580',
      }).setOrigin(0.5, 0);
    }

    // 3 条任务（每条严格分两层）
    const taskStartY = L.goalY + 52;
    const taskGap = 48;

    const tasks = DailyMissionManager.instance.getTasks();
    tasks.forEach((task, index) => {
      const taskBaseY = taskStartY + index * taskGap;

      // === 第一层：任务名称（左）+ 进度数字（右）===
      // 任务名（增强可读性）
      this.add.text(LAYOUT_SPEC.horizontalPadding + 15, taskBaseY, task.title, {
        fontSize: UIConstants.fonts.md,
        color: '#F0F8FF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0, 0.5);

      // 进度数字（更清晰）
      this.add.text(LAYOUT_SPEC.horizontalPadding + LAYOUT_SPEC.contentWidth - 15, taskBaseY, `${task.progress}/${task.target}`, {
        fontSize: UIConstants.fonts.sm,
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(1, 0.5);

      // === 第二层：独立进度条（在任务名下方，间距 28px）===
      const barY = taskBaseY + 28;
      const barW = UIConstants.progressBar.width;
      const barH = UIConstants.progressBar.height;
      const barX = LAYOUT_SPEC.horizontalPadding + LAYOUT_SPEC.contentWidth - 15 - barW;

      // 进度条背景（圆角效果）
      const barBgGraphics = this.add.graphics();
      barBgGraphics.fillStyle(0x000000, 0.6);
      barBgGraphics.fillRoundedRect(barX, barY - barH / 2, barW, barH, UIConstants.radius.sm);

      // 进度条填充
      const progress = Math.min(1, task.progress / task.target);
      const barFillGraphics = this.add.graphics();
      barFillGraphics.fillStyle(0x4CAF50);
      barFillGraphics.fillRoundedRect(barX, barY - barH / 2, barW * progress, barH, UIConstants.radius.sm);
    });

    // 底部轻提示：统一收口到 renderGoalFooter
    const allCompleted = DailyMissionManager.instance.isAllCompleted();
    const rewardClaimed = DailyMissionManager.instance.isRewardClaimed();
    this.renderGoalFooter(L, allCompleted, rewardClaimed);
  }

  /** 渲染目标区底部 footer（统一收口方法） */
  private renderGoalFooter(
    L: ReturnType<typeof this.calculateLayout>,
    allCompleted: boolean,
    rewardClaimed: boolean
  ) {
    const x = L.centerX;
    const footerY = L.goalY + LAYOUT_SPEC.goalHeight - 16;

    // 先销毁旧的 footer 元素（如果有）
    this.destroyGoalFooter();

    if (allCompleted && !rewardClaimed) {
      // 可领取状态：显示可点击的领取文案
      this.goalFooterText = this.add.text(x, footerY, '🎁 点击领取 100 金币', {
        fontSize: UIConstants.fonts.xs,
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
        fontSize: UIConstants.fonts.xs,
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
    if (this.coinsText) {
      this.coinsText.setText(String(coins));
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
  // 4. actionSection - 主行动区（只保留开始钓鱼一个主按钮）
  // ==================================================
  private renderActionSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    const btnCfg = UIConstants.buttons.primary;
    const startBtnY = L.actionY + LAYOUT_SPEC.actionHeight / 2;

    // 主按钮背景（圆角）
    const startBtnGraphics = this.add.graphics();
    startBtnGraphics.fillStyle(btnCfg.bgColor);
    startBtnGraphics.lineStyle(4, 0xffffff, 0.3);
    startBtnGraphics.fillRoundedRect(x - btnCfg.width / 2, startBtnY - btnCfg.height / 2, btnCfg.width, btnCfg.height, btnCfg.cornerRadius);
    startBtnGraphics.strokeRoundedRect(x - btnCfg.width / 2, startBtnY - btnCfg.height / 2, btnCfg.width, btnCfg.height, btnCfg.cornerRadius);
    
    const startBtnText = this.add.text(x, startBtnY, '开始钓鱼', {
      fontSize: btnCfg.fontSize,
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 扩大点击热区（透明矩形）
    const hitArea = this.add.rectangle(x, startBtnY, btnCfg.width + 60, btnCfg.height + 30, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });

    // 按压反馈
    hitArea.on('pointerdown', () => {
      this.add.tween({
        targets: [startBtnGraphics, startBtnText],
        scaleX: btnCfg.pressScale,
        scaleY: btnCfg.pressScale,
        duration: btnCfg.pressDuration,
        yoyo: true,
      });
      this.onStartFishing();
    });
  }

  // ==================================================
  // 5. oceanSection - 水下氛围区
  // ==================================================
  private renderOceanSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    const y = L.oceanY + L.oceanHeight / 2;

    // 水下背景
    this.add.rectangle(x, y, L.width, L.oceanHeight, 0x1e88e5);

    // === 顶部弱提示（只保留一条，简化）===
    const infoBoxY = L.oceanY + 100;
    const infoGraphics = this.add.graphics();
    infoGraphics.fillStyle(0x000000, 0.35);
    infoGraphics.fillRoundedRect(x - 260, infoBoxY - 18, 520, 36, UIConstants.radius.md);
    const infoText = this.add.text(x, infoBoxY, '💡 浮漂明显下沉时再拉杆，更容易拿高奖励', {
      fontSize: UIConstants.fonts.xs,
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    infoGraphics.setDepth(10);
    infoText.setDepth(11);

    // 鱼群
    this.add.text(150, L.oceanY + 150, '🐟', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(300, L.oceanY + 180, '🐠', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(450, L.oceanY + 160, '🐡', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(600, L.oceanY + 190, '🐢', { fontSize: '32px' }).setOrigin(0.5);

    // 底部装饰
    const sandY = L.oceanY + L.oceanHeight - 30;
    this.add.text(120, sandY, '🪸', { fontSize: '42px' }).setOrigin(0.5);
    this.add.text(300, sandY - 10, '🌿', { fontSize: '36px' }).setOrigin(0.5);
    this.add.text(450, sandY - 10, '🌱', { fontSize: '36px' }).setOrigin(0.5);
    this.add.text(620, sandY, '🪸', { fontSize: '42px' }).setOrigin(0.5);
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
