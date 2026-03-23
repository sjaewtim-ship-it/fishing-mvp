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

    // 占位背景
    this.add.rectangle(x, y, LAYOUT_SPEC.contentWidth, LAYOUT_SPEC.resourceHeight, 0x5a8fc4, 0.3);
    this.add.text(LAYOUT_SPEC.horizontalPadding, L.resourceY, 'resource', {
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0, 0);

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
  // 3. goalSection - 今日目标区（完全重画内部子占位）
  // ==================================================
  private renderGoalSection(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;
    const y = L.goalY + LAYOUT_SPEC.goalHeight / 2;

    // 占位背景
    this.add.rectangle(x, y, LAYOUT_SPEC.contentWidth, LAYOUT_SPEC.goalHeight, 0x1a3a52, 0.55);
    this.add.text(LAYOUT_SPEC.horizontalPadding, L.goalY, 'goal', {
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0, 0);

    // 标题占位块
    this.add.rectangle(LAYOUT_SPEC.horizontalPadding + 10, L.goalY + 15, 130, 22, 0xffffff, 0.35);

    // 3 条任务（每条严格分两层）
    const taskStartY = L.goalY + 50;
    const taskGap = 50;

    const tasks = DailyMissionManager.instance.getTasks();
    tasks.forEach((task, index) => {
      const taskBaseY = taskStartY + index * taskGap;

      // === 第一层：任务名称占位（左）+ 进度数字占位（右）===
      // 任务名占位块（200x20）
      this.add.rectangle(LAYOUT_SPEC.horizontalPadding + 10, taskBaseY, 200, 20, 0xffffff, 0.40);
      // 进度数字占位块（50x20）
      this.add.rectangle(LAYOUT_SPEC.horizontalPadding + LAYOUT_SPEC.contentWidth - 10, taskBaseY, 50, 20, 0xffffff, 0.40);

      // === 第二层：独立进度条占位（在任务名下方，与任务名间距 30px）===
      const barY = taskBaseY + 32;
      const barW = 150;
      const barH = 16;
      const barX = LAYOUT_SPEC.horizontalPadding + LAYOUT_SPEC.contentWidth - 10 - barW;
      
      // 进度条背景占位（150x16）
      this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x000000, 0.55);
      // 进度条填充占位
      const progress = Math.min(1, task.progress / task.target);
      this.add.rectangle(barX + barW / 2 * progress, barY, barW * progress, barH, 0x4CAF50);
    });

    // 底部轻提示占位
    this.add.rectangle(x, L.goalY + LAYOUT_SPEC.goalHeight - 18, 300, 16, 0xffd700, 0.25);
  }

  // ==================================================
  // 4. actionSection - 主行动区（只保留开始钓鱼一个主按钮）
  // ==================================================
  private renderActionSection(L: ReturnType<typeof this.calculateLayout>, isFullEnergy: boolean) {
    const x = L.centerX;
    const y = L.actionY + LAYOUT_SPEC.actionHeight / 2;

    // 占位背景
    this.add.rectangle(x, y, LAYOUT_SPEC.contentWidth, LAYOUT_SPEC.actionHeight, 0x4a7fb4, 0.35);
    this.add.text(LAYOUT_SPEC.horizontalPadding, L.actionY, 'action', {
      fontSize: '14px',
      color: '#FFFFFF',
    }).setOrigin(0, 0);

    // 主按钮：开始钓鱼（唯一主 CTA，居中放置）
    const startBtnW = 480;
    const startBtnH = 110;
    const startBtnY = L.actionY + LAYOUT_SPEC.actionHeight / 2;  // 垂直居中

    const startBtn = this.add.rectangle(x, startBtnY, startBtnW, startBtnH, 0xff6b6b, 0.9);
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
  // 5. oceanSection - 水下氛围区（顶部弱信息下移 40px）
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

    // === 顶部弱信息容器（下移 40px，从 80 到 120）===
    const infoBoxY = L.oceanY + 120;  // 从 80 增加到 120px
    const infoBoxW = 380;
    const infoBoxH = 32;
    
    // 弱信息背景（更透明）
    this.add.rectangle(x, infoBoxY, infoBoxW, infoBoxH, 0x000000, 0.10);  // alpha 从 0.12 降到 0.10
    
    // 合并后的弱提示文案（更小更淡）
    this.add.text(x, infoBoxY, '💡 浮漂明显下沉时再拉杆 · 水下有东西在游动...', {
      fontSize: '10px',  // 从 11px 降到 10px
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 鱼群占位（下移）
    this.add.text(150, L.oceanY + 150, '🐟', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(300, L.oceanY + 180, '🐠', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(450, L.oceanY + 160, '🐡', { fontSize: '32px' }).setOrigin(0.5);
    this.add.text(600, L.oceanY + 190, '🐢', { fontSize: '32px' }).setOrigin(0.5);

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
