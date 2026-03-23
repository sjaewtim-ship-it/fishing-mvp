import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { CoinManager } from './CoinManager';
import { RecordManager } from './RecordManager';
import { DirectorSystem } from './DirectorSystem';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';
import { AnalyticsManager } from './AnalyticsManager';
import { DailyMissionManager, type DailyTask } from './DailyMissionManager';

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
  // 基础参数
  topMargin: 20,
  sectionGap: 15,
  horizontalPadding: 35,
  contentWidth: 680, // 750 - 2*35

  // 各 section 高度
  brandHeight: 90,
  resourceHeight: 150,     // 容纳完整 2x2 卡组
  goalHeight: 200,         // 容纳三层任务结构
  actionHeight: 280,       // 大幅增加以确保与 ocean 彻底断开
};

export class MainScene extends Phaser.Scene {
  private swimmers: Phaser.GameObjects.Text[] = [];
  private swimmerData: SwimVisual[] = [];

  // UI 引用
  private coinText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private missionTaskContainers: Phaser.GameObjects.Container[] = [];

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
      fontSize: '46px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // slogan（更清晰）
    this.add.text(x, L.brandY + 78, '看准时机，一杆出货', {
      fontSize: '22px',
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
    const x = L.centerX;
    const y = L.resourceY + LAYOUT_SPEC.resourceHeight / 2;
    const cardW = 330;
    const cardH1 = 65;  // 第一排高度
    const cardH2 = 50;  // 第二排高度
    const gap = 16;
    const rowGap = 10;

    // 计算左对齐位置
    const leftX = LAYOUT_SPEC.horizontalPadding;

    // === 第一排：金币、体力（高优先级）===
    const row1Y = L.resourceY + 30;

    // 金币卡片
    const coinCardX = leftX;
    this.add.rectangle(coinCardX + cardW / 2, row1Y, cardW, cardH1, 0xffd700, 0.45);
    this.add.text(coinCardX + 12, row1Y - cardH1 / 2 + 6, '🪙 金币', { fontSize: '13px' }).setOrigin(0, 0);
    this.add.text(coinCardX + cardW - 12, row1Y + cardH1 / 2 - 6, String(coins), { fontSize: '20px', color: '#FFE082', fontStyle: 'bold' }).setOrigin(1, 1);

    // 体力卡片
    const energyCardX = leftX + cardW + gap;
    this.add.rectangle(energyCardX + cardW / 2, row1Y, cardW, cardH1, 0x90ee90, 0.45);
    this.add.text(energyCardX + 12, row1Y - cardH1 / 2 + 6, '⚡ 体力', { fontSize: '13px' }).setOrigin(0, 0);
    this.add.text(energyCardX + cardW - 12, row1Y + cardH1 / 2 - 6, `${energy}/${maxEnergy}`, { fontSize: '20px', color: '#90EE90', fontStyle: 'bold' }).setOrigin(1, 1);

    // === 第二排：最佳渔获、最离谱战绩（低优先级）===
    const row2Y = row1Y + cardH1 + rowGap;

    // 最佳渔获卡片
    const bestCardX = leftX;
    this.add.rectangle(bestCardX + cardW / 2, row2Y, cardW, cardH2, 0xffffff, 0.25);
    this.add.text(bestCardX + 12, row2Y - cardH2 / 2 + 5, '⭐ 最佳渔获', { fontSize: '12px', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.add.text(bestCardX + cardW - 12, row2Y, bestCatch, { fontSize: '15px', color: '#E0F0FF', fontStyle: 'bold' }).setOrigin(1, 0.5);

    // 最离谱战绩卡片
    const weirdCardX = leftX + cardW + gap;
    this.add.rectangle(weirdCardX + cardW / 2, row2Y, cardW, cardH2, 0xffffff, 0.25);
    this.add.text(weirdCardX + 12, row2Y - cardH2 / 2 + 5, '🤯 最离谱战绩', { fontSize: '12px', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.add.text(weirdCardX + cardW - 12, row2Y, weirdCatch, { fontSize: '15px', color: '#E0F0FF', fontStyle: 'bold' }).setOrigin(1, 0.5);
  }

  // ==================================================
  // 3. goalSection - 今日目标区（正式任务卡样式）
  // ==================================================
  private renderGoalSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    const y = L.goalY + LAYOUT_SPEC.goalHeight / 2;

    // 卡片背景（更深色，增强正式感）
    this.add.rectangle(x, y, LAYOUT_SPEC.contentWidth, LAYOUT_SPEC.goalHeight, 0x1a3a52, 0.65)
      .setStrokeStyle(2, 0xffffff, 0.25);

    // 标题（增强层级）
    this.add.text(LAYOUT_SPEC.horizontalPadding + 15, L.goalY + 18, '📋 今日目标', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0);

    // 3 条任务（每条严格分两层）
    const taskStartY = L.goalY + 52;
    const taskGap = 48;

    const tasks = DailyMissionManager.instance.getTasks();
    tasks.forEach((task, index) => {
      const taskBaseY = taskStartY + index * taskGap;

      // === 第一层：任务名称（左）+ 进度数字（右）===
      // 任务名（增强可读性）
      this.add.text(LAYOUT_SPEC.horizontalPadding + 15, taskBaseY, task.title, {
        fontSize: '15px',
        color: '#F0F8FF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0, 0.5);

      // 进度数字（更清晰）
      this.add.text(LAYOUT_SPEC.horizontalPadding + LAYOUT_SPEC.contentWidth - 15, taskBaseY, `${task.progress}/${task.target}`, {
        fontSize: '14px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(1, 0.5);

      // === 第二层：独立进度条（在任务名下方，间距 28px）===
      const barY = taskBaseY + 28;
      const barW = 140;
      const barH = 14;
      const barX = LAYOUT_SPEC.horizontalPadding + LAYOUT_SPEC.contentWidth - 15 - barW;
      
      // 进度条背景（圆角效果）
      this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x000000, 0.6);
      // 进度条填充
      const progress = Math.min(1, task.progress / task.target);
      this.add.rectangle(barX + barW / 2 * progress, barY, barW * progress, barH, 0x4CAF50);
    });

    // 底部轻提示
    const allCompleted = DailyMissionManager.instance.isAllCompleted();
    const rewardClaimed = DailyMissionManager.instance.isRewardClaimed();

    if (allCompleted && !rewardClaimed) {
      this.add.text(x, L.goalY + LAYOUT_SPEC.goalHeight - 16, '🎁 完成全部目标可领取额外奖励', {
        fontSize: '12px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0);
    } else if (allCompleted && rewardClaimed) {
      this.add.text(x, L.goalY + LAYOUT_SPEC.goalHeight - 16, '✅ 今日目标已全部完成', {
        fontSize: '12px',
        color: '#90EE90',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0);
    }
  }

  // ==================================================
  // 4. actionSection - 主行动区（只保留开始钓鱼一个主按钮）
  // ==================================================
  private renderActionSection(L: ReturnType<typeof this.calculateLayout>, isFullEnergy: boolean) {
    const x = L.centerX;
    const y = L.actionY + LAYOUT_SPEC.actionHeight / 2;

    // 主按钮：开始钓鱼（唯一主 CTA，垂直居中）
    const startBtnW = 480;
    const startBtnH = 110;
    const startBtnY = L.actionY + LAYOUT_SPEC.actionHeight / 2;

    const startBtn = this.add.rectangle(x, startBtnY, startBtnW, startBtnH, 0xff6b6b);
    this.add.text(x, startBtnY, '开始钓鱼', {
      fontSize: '42px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 按钮交互
    startBtn.setInteractive({ useHandCursor: true });
    startBtn.on('pointerdown', () => this.onStartFishing());
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
    this.add.text(x, infoBoxY, '💡 浮漂明显下沉时再拉杆，更容易拿高奖励', {
      fontSize: '12px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

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

    if (!EnergyManager.instance.hasEnergy()) {
      this.showToast('体力不足，先补充体力');
      return;
    }

    AnalyticsManager.instance.onStartRound();
    EnergyManager.instance.costEnergy();
    SaveSync.save();
    this.scene.start('FishingScene', {
      round: DirectorSystem.getRoundNumber(),
    });
  }

  private onAddEnergy(isFullEnergy: boolean) {
    SimpleAudio.unlock();
    SimpleAudio.click();

    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    if (energy >= maxEnergy) {
      this.showToast('体力已满，不需要补充');
      return;
    }

    EnergyManager.instance.addEnergy(3);
    SaveSync.save();

    if (EnergyManager.instance.getEnergy() >= maxEnergy) {
      this.showToast('补充成功，体力已满！');
    } else {
      this.showToast('补充成功，体力 +3');
    }

    this.scene.restart();
  }

  private showToast(message: string) {
    const L = this.calculateLayout();
    const bg = this.add.rectangle(L.centerX, L.actionY - 50, 440, 58, 0x000000, 0.54)
      .setStrokeStyle(2, 0xffffff, 0.12);

    const text = this.add.text(L.centerX, L.actionY - 50, message, {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0, [bg, text]);

    this.tweens.add({
      targets: container,
      alpha: 0,
      y: -12,
      delay: 800,
      duration: 240,
      onComplete: () => container.destroy(),
    });
  }
}
