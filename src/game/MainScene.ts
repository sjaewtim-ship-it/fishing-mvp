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
  resourceHeight: 140,
  goalHeight: 180,
  actionHeight: 200,
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

    // === 创建 5 个 section 容器 ===
    this.brandSection = this.add.container(0, 0);
    this.resourceSection = this.add.container(0, 0);
    this.goalSection = this.add.container(0, 0);
    this.actionSection = this.add.container(0, 0);
    this.oceanSection = this.add.container(0, 0);

    // === 渲染各 section ===
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
    const y = L.brandY + LAYOUT_SPEC.brandHeight / 2;

    // 占位背景
    this.add.rectangle(x, y, LAYOUT_SPEC.contentWidth, LAYOUT_SPEC.brandHeight, 0x6fa3d4, 0.3);
    this.add.text(LAYOUT_SPEC.horizontalPadding, L.brandY, 'brand', {
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0, 0);

    // 标题占位
    this.add.rectangle(x, L.brandY + 30, 200, 30, 0xffffff, 0.5);
    // slogan 占位
    this.add.rectangle(x, L.brandY + 65, 150, 18, 0xffffff, 0.3);
  }

  // ==================================================
  // 2. resourceSection - 资源区（两排两列）
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

    // 占位背景
    this.add.rectangle(x, y, LAYOUT_SPEC.contentWidth, LAYOUT_SPEC.resourceHeight, 0x5a8fc4, 0.3);
    this.add.text(LAYOUT_SPEC.horizontalPadding, L.resourceY, 'resource', {
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0, 0);

    // 第一排：金币、体力（高优先级）
    const cardW = 330;
    const cardH = 60;
    const gap = 16;
    const leftX = x - (cardW * 2 + gap) / 2;
    const row1Y = L.resourceY + 35;

    // 金币占位
    this.add.rectangle(leftX, row1Y, cardW, cardH, 0xffd700, 0.4);
    this.add.text(leftX + 10, row1Y - cardH / 2 + 5, '🪙 金币', { fontSize: '12px' }).setOrigin(0, 0);
    this.add.text(leftX + cardW - 10, row1Y + cardH / 2 - 5, String(coins), { fontSize: '18px', color: '#FFE082' }).setOrigin(1, 1);

    // 体力占位
    this.add.rectangle(leftX + cardW + gap, row1Y, cardW, cardH, 0x90ee90, 0.4);
    this.add.text(leftX + cardW + gap + 10, row1Y - cardH / 2 + 5, '⚡ 体力', { fontSize: '12px' }).setOrigin(0, 0);
    this.add.text(leftX + cardW + gap + cardW - 10, row1Y + cardH / 2 - 5, `${energy}/${maxEnergy}`, { fontSize: '18px', color: '#90EE90' }).setOrigin(1, 1);

    // 第二排：最佳渔获、最离谱战绩（低优先级）
    const row2Y = row1Y + cardH + 12;

    // 最佳渔获占位
    this.add.rectangle(leftX, row2Y, cardW, 40, 0xffffff, 0.2);
    this.add.text(leftX + 10, row2Y - 20 + 5, '⭐ 最佳渔获', { fontSize: '11px' }).setOrigin(0, 0);
    this.add.text(leftX + cardW - 10, row2Y + 20 / 2 - 5, bestCatch, { fontSize: '14px', color: '#E0F0FF' }).setOrigin(1, 0.5);

    // 最离谱战绩占位
    this.add.rectangle(leftX + cardW + gap, row2Y, cardW, 40, 0xffffff, 0.2);
    this.add.text(leftX + cardW + gap + 10, row2Y - 20 + 5, '🤯 最离谱战绩', { fontSize: '11px' }).setOrigin(0, 0);
    this.add.text(leftX + cardW + gap + cardW - 10, row2Y + 20 / 2 - 5, weirdCatch, { fontSize: '14px', color: '#E0F0FF' }).setOrigin(1, 0.5);
  }

  // ==================================================
  // 3. goalSection - 今日目标区（独立任务卡）
  // ==================================================
  private renderGoalSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    const y = L.goalY + LAYOUT_SPEC.goalHeight / 2;

    // 占位背景
    this.add.rectangle(x, y, LAYOUT_SPEC.contentWidth, LAYOUT_SPEC.goalHeight, 0x1a3a52, 0.5);
    this.add.text(LAYOUT_SPEC.horizontalPadding, L.goalY, 'goal', {
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0, 0);

    // 标题占位
    this.add.text(LAYOUT_SPEC.horizontalPadding + 10, L.goalY + 15, '📋 今日目标', {
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    // 3 条任务占位（每条分两层：任务名 + 进度数字 / 进度条）
    const taskStartY = L.goalY + 45;
    const taskGap = 36;
    const barW = 120;
    const barH = 12;

    const tasks = DailyMissionManager.instance.getTasks();
    tasks.forEach((task, index) => {
      const taskY = taskStartY + index * taskGap;

      // 第一层：任务名称（左）+ 进度数字（右）
      this.add.text(LAYOUT_SPEC.horizontalPadding + 10, taskY, task.title, {
        fontSize: '14px',
        color: '#F0F8FF',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);

      this.add.text(LAYOUT_SPEC.horizontalPadding + LAYOUT_SPEC.contentWidth - 10, taskY, `${task.progress}/${task.target}`, {
        fontSize: '12px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);

      // 第二层：独立进度条
      const barY = taskY + 20;
      const barX = LAYOUT_SPEC.horizontalPadding + LAYOUT_SPEC.contentWidth - 10 - barW;
      this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x000000, 0.4);
      const progress = Math.min(1, task.progress / task.target);
      this.add.rectangle(barX + barW / 2 * progress, barY, barW * progress, barH, 0x4CAF50);
    });

    // 底部轻提示占位
    this.add.text(x, L.goalY + LAYOUT_SPEC.goalHeight - 20, '完成全部今日目标可领取额外奖励', {
      fontSize: '11px',
      color: '#FFD700',
    }).setOrigin(0.5, 0);
  }

  // ==================================================
  // 4. actionSection - 主行动区
  // ==================================================
  private renderActionSection(L: ReturnType<typeof this.calculateLayout>, isFullEnergy: boolean) {
    const x = L.centerX;
    const y = L.actionY + LAYOUT_SPEC.actionHeight / 2;

    // 占位背景
    this.add.rectangle(x, y, LAYOUT_SPEC.contentWidth, LAYOUT_SPEC.actionHeight, 0x4a7fb4, 0.3);
    this.add.text(LAYOUT_SPEC.horizontalPadding, L.actionY, 'action', {
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0, 0);

    // 主按钮：开始钓鱼（占位）
    const startBtnW = 480;
    const startBtnH = 110;
    const startBtnY = L.actionY + 55;

    const startBtn = this.add.rectangle(x, startBtnY, startBtnW, startBtnH, 0xff6b6b, 0.9);
    this.add.text(x, startBtnY, '开始钓鱼', {
      fontSize: '42px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 次按钮：补充体力（占位）
    const energyBtnW = 360;
    const energyBtnH = 80;
    const energyBtnY = startBtnY + startBtnH / 2 + 50 + energyBtnH / 2;

    const energyBtn = this.add.rectangle(x, energyBtnY, energyBtnW, energyBtnH, 0x9b59b6, isFullEnergy ? 0.4 : 0.8);
    this.add.text(x, energyBtnY - 8, '🎬 补充体力', {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(x, energyBtnY + 22, '观看广告可恢复 3 点体力', {
      fontSize: '13px',
      color: '#F0E8FF',
    }).setOrigin(0.5);

    // 按钮交互
    startBtn.setInteractive({ useHandCursor: true });
    startBtn.on('pointerdown', () => this.onStartFishing());

    energyBtn.setInteractive({ useHandCursor: true });
    energyBtn.on('pointerdown', () => this.onAddEnergy(isFullEnergy));
  }

  // ==================================================
  // 5. oceanSection - 水下氛围区
  // ==================================================
  private renderOceanSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    const y = L.oceanY + L.oceanHeight / 2;

    // 占位背景
    this.add.rectangle(x, y, L.width, L.oceanHeight, 0x1e88e5, 0.6);
    this.add.text(LAYOUT_SPEC.horizontalPadding, L.oceanY, 'ocean', {
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0, 0);

    // 顶部弱提示（与水下文案合并）
    const tipY = L.oceanY + 25;
    this.add.rectangle(x, tipY + 15, 350, 32, 0xffffff, 0.1);
    this.add.text(x, tipY, '💡 小技巧：浮漂明显下沉时再拉杆，更容易拿高奖励', {
      fontSize: '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // 水下文案占位
    this.add.text(x, L.oceanY + 60, '水下似乎有东西在游动...', {
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // 鱼群占位
    this.add.text(150, L.oceanY + 110, '🐟', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(300, L.oceanY + 140, '🐠', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(450, L.oceanY + 120, '🐡', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(600, L.oceanY + 150, '🐢', { fontSize: '32px' }).setOrigin(0.5);

    // 底部装饰占位
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
