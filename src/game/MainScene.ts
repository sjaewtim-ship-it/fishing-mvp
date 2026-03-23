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

export class MainScene extends Phaser.Scene {
  private swimmers: Phaser.GameObjects.Text[] = [];
  private swimmerData: SwimVisual[] = [];

  // UI 引用
  private coinText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private missionTaskContainers: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('MainScene');
  }

  private getLayout() {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;
    const centerX = width / 2;

    const safeBottom = Math.max(130, Math.round(height * 0.1));

    // === 1. 顶部轻品牌区（高度约 100px）===
    const titleY = 70;
    const sloganY = 110;

    // === 2. 资源区（两排两列，高度约 140px）===
    const resourceY = 160;
    const resourceRowGap = 12;

    // === 3. 今日目标区（高度约 180px）===
    const missionY = 315;

    // === 4. 小技巧提示区（高度约 45px）===
    const hintY = 510;

    // === 5. 主行动区（高度约 230px）===
    const startBtnY = 580;
    const energyBtnY = 710;

    // === 6. 水下氛围区（剩余高度）===
    const waterTopY = 810;
    const waterBottomY = height - safeBottom - 20;
    const waterHeight = Math.max(150, waterBottomY - waterTopY);
    const waterCenterY = waterTopY + waterHeight / 2;

    const sandY = waterBottomY - 18;
    const plantBaseY = sandY - 42;
    const coralBaseY = sandY - 88;

    return {
      width,
      height,
      centerX,
      safeBottom,
      titleY,
      sloganY,
      resourceY,
      resourceRowGap,
      missionY,
      hintY,
      startBtnY,
      energyBtnY,
      actionBaseY: height - safeBottom - 10,
      waterTopY,
      waterBottomY,
      waterHeight,
      waterCenterY,
      sandY,
      plantBaseY,
      coralBaseY,
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
    // 关键修复：每次进入场景先清空，避免重启后数组残留不同步
    this.swimmers = [];
    this.swimmerData = [];
    this.missionTaskContainers = [];

    const L = this.getLayout();

    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    const bestCatch = this.getTodayBestCatchSafe();
    const weirdCatch = this.getTodayWeirdCatchSafe();

    // 初始化日常任务
    DailyMissionManager.instance.init();

    this.cameras.main.setBackgroundColor('#8FD3FF');
    this.add.rectangle(L.centerX, L.height / 2, L.width, L.height, 0x8fd3ff);

    // === 顶部轻品牌区 ===
    const cloud1 = this.add.text(80, 65, '☁️', { fontSize: '36px' }).setAlpha(0.7);
    const cloud2 = this.add.text(540, 95, '☁️', { fontSize: '30px' }).setAlpha(0.7);

    this.tweens.add({
      targets: cloud1,
      x: 520,
      duration: 18000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: cloud2,
      x: 180,
      duration: 22000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(L.centerX, L.titleY, '🎣 钓鱼小游戏', {
      fontSize: '44px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(L.centerX, L.sloganY, '看准时机，一杆出货', {
      fontSize: '20px',
      color: '#E0F0FF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // === 2. 资源区（两排两列）===
    const resCardW = 330;
    const resCardH = 72;
    const resGap = 16;
    const resTotalW = resCardW * 2 + resGap;
    const resLeftX = L.centerX - resTotalW / 2;

    // 第一排（高优先级）：金币、体力
    this.createResourceCard(
      resLeftX, L.resourceY, resCardW, resCardH,
      '🪙', '金币', String(coins), '#FFE082',
      (text) => { this.coinText = text; },
      0.20, 0.30
    );
    this.createResourceCard(
      resLeftX + resCardW + resGap, L.resourceY, resCardW, resCardH,
      '⚡', '体力', `${energy}/${maxEnergy}`, '#90EE90',
      (text) => { this.energyText = text; },
      0.20, 0.30
    );

    // 第二排（低优先级）：最佳渔获、最离谱战绩
    const subCardW = 330;
    const subCardH = 48;
    const subY = L.resourceY + resCardH + L.resourceRowGap;

    this.createSubResourceCard(
      resLeftX, subY, subCardW, subCardH,
      '⭐', '最佳渔获', bestCatch
    );
    this.createSubResourceCard(
      resLeftX + subCardW + resGap, subY, subCardW, subCardH,
      '🤯', '最离谱战绩', weirdCatch
    );

    // === 今日目标模块 ===
    this.createDailyMissionPanel(L.centerX, L.missionY);

    // === 玩法轻提示 ===
    this.createHintBox(L.centerX, L.hintY);

    // === 主按钮区 ===
    this.createStartButton(L.centerX, L.startBtnY);
    this.createEnergyButton(L.centerX, L.energyBtnY, energy >= maxEnergy);

    // === 6. 水下氛围区 ===
    this.add.rectangle(L.centerX, L.waterCenterY, L.width, L.waterHeight, 0x1e88e5);

    const wave1 = this.add.ellipse(L.centerX - 100, L.waterTopY + 2, 140, 14, 0xffffff, 0.25);
    const wave2 = this.add.ellipse(L.centerX + 50, L.waterTopY + 2, 180, 16, 0xffffff, 0.20);
    const wave3 = this.add.ellipse(L.centerX + 200, L.waterTopY + 4, 110, 12, 0xffffff, 0.18);

    this.tweens.add({
      targets: [wave1, wave2, wave3],
      scaleX: 1.06,
      alpha: 0.08,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(L.centerX, L.waterTopY + 28, '水下似乎有东西在游动...', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.createSwimmers(L);

    this.add.text(120, L.coralBaseY, '🪸', { fontSize: '52px' }).setOrigin(0.5).setAlpha(0.82);
    this.add.text(600, L.coralBaseY - 8, '🪸', { fontSize: '58px' }).setOrigin(0.5).setAlpha(0.78);
    this.add.text(290, L.plantBaseY, '🌿', { fontSize: '42px' }).setOrigin(0.5).setAlpha(0.75);
    this.add.text(460, L.plantBaseY - 4, '🌱', { fontSize: '38px' }).setOrigin(0.5).setAlpha(0.72);

    const sandColor = 0xd8c28a;
    this.add.ellipse(160, L.sandY, 200, 52, sandColor, 0.85);
    this.add.ellipse(L.centerX, L.sandY + 12, 260, 66, sandColor, 0.85);
    this.add.ellipse(585, L.sandY + 2, 200, 54, sandColor, 0.85);

    const footerWavesY = L.height - 24;
    this.add.text(L.centerX - 100, footerWavesY, '🌊', { fontSize: '32px' }).setOrigin(0.5).setAlpha(0.70);
    this.add.text(L.centerX, footerWavesY, '🌊', { fontSize: '32px' }).setOrigin(0.5).setAlpha(0.70);
    this.add.text(L.centerX + 100, footerWavesY, '🌊', { fontSize: '32px' }).setOrigin(0.5).setAlpha(0.70);
  }

  private createResourceCard(
    x: number, y: number, w: number, h: number,
    icon: string, label: string, value: string, valueColor: string,
    registerText?: (text: Phaser.GameObjects.Text) => void,
    bgAlpha: number = 0.20,
    borderAlpha: number = 0.30
  ) {
    const card = this.add.rectangle(x, y, w, h, 0xffffff, bgAlpha)
      .setStrokeStyle(1, 0xffffff, borderAlpha);

    const iconText = this.add.text(x - w / 2 + 32, y, icon, {
      fontSize: '28px',
    }).setOrigin(0.5);

    const labelText = this.add.text(x - w / 2 + 68, y - 8, label, {
      fontSize: '16px',
      color: '#D0E8F0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const valueText = this.add.text(x + w / 2 - 20, y + 4, value, {
      fontSize: '26px',
      color: valueColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    if (registerText) {
      registerText(valueText);
    }

    return card;
  }

  private createSubResourceCard(
    x: number, y: number, w: number, h: number,
    icon: string, label: string, value: string
  ) {
    const card = this.add.rectangle(x, y, w, h, 0xffffff, 0.10)
      .setStrokeStyle(1, 0xffffff, 0.15);

    const iconText = this.add.text(x - w / 2 + 24, y, icon, {
      fontSize: '22px',
    }).setOrigin(0.5);

    const labelText = this.add.text(x - w / 2 + 54, y - 4, label, {
      fontSize: '14px',
      color: '#B8D8E8',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const valueText = this.add.text(x + w / 2 - 16, y + 2, value, {
      fontSize: '18px',
      color: '#E0F0FF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    return card;
  }

  private createDailyMissionPanel(centerX: number, centerY: number) {
    const panelW = 680;
    const panelH = 170;

    // 背景卡片：正式任务卡
    const panelBg = this.add.rectangle(centerX, centerY, panelW, panelH, 0x1a3a52, 0.40)
      .setStrokeStyle(2, 0xffffff, 0.30);

    // 标题行
    const titleText = this.add.text(centerX - panelW / 2 + 24, centerY - panelH / 2 + 20, '📋 今日目标', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    // 任务列表：每条任务分两层（任务名 + 进度数字 / 进度条）
    const tasks = DailyMissionManager.instance.getTasks();
    const taskStartY = centerY - panelH / 2 + 55;
    const taskGap = 34;

    tasks.forEach((task, index) => {
      this.createTaskRow(
        centerX - panelW / 2 + 24,
        taskStartY + index * taskGap,
        panelW - 48,
        task
      );
    });

    // 底部轻提示
    const allCompleted = DailyMissionManager.instance.isAllCompleted();
    const rewardClaimed = DailyMissionManager.instance.isRewardClaimed();

    if (allCompleted && !rewardClaimed) {
      const rewardText = this.add.text(centerX, centerY + panelH / 2 - 18, '完成全部今日目标可领取额外奖励', {
        fontSize: '13px',
        color: '#FFD700',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    } else if (allCompleted && rewardClaimed) {
      const doneText = this.add.text(centerX, centerY + panelH / 2 - 18, '✅ 今日目标已全部完成', {
        fontSize: '13px',
        color: '#90EE90',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }
  }

  private createTaskRow(
    x: number, y: number, w: number,
    task: DailyTask
  ) {
    const container = this.add.container(x, y);

    // 第一层：任务名称（左）+ 进度数字（右）
    const taskName = this.add.text(0, 0, task.title, {
      fontSize: '15px',
      color: task.claimed ? '#888888' : '#F0F8FF',
      fontStyle: task.claimed ? 'normal' : 'bold',
    }).setOrigin(0, 0.5);

    const progressText = this.add.text(w, 0, `${task.progress}/${task.target}`, {
      fontSize: '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    // 第二层：单独进度条
    const barY = 22;
    const barW = 120;
    const barH = 14;
    const barX = w - barW;

    const barBg = this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x000000, 0.50)
      .setStrokeStyle(1, 0xffffff, 0.20);

    const progress = Math.min(1, task.progress / task.target);
    const barFill = this.add.rectangle(barX + barW / 2 * progress, barY, barW * progress, barH, 0x4CAF50)
      .setOrigin(0.5, 0.5);

    // 完成标记
    let checkMark: Phaser.GameObjects.Text | null = null;
    if (task.claimed) {
      checkMark = this.add.text(barX + barW + 18, barY, '✓', {
        fontSize: '14px',
        color: '#90EE90',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    container.add([taskName, progressText, barBg, barFill]);
    if (checkMark) {
      container.add(checkMark);
    }

    // 可领取状态：添加点击交互
    if (!task.claimed && task.progress >= task.target) {
      container.setSize(w, barY + 10);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => this.onTaskClaim(task.id, container));

      // 闪烁提示
      this.tweens.add({
        targets: [barFill],
        alpha: 0.6,
        duration: 400,
        yoyo: true,
        repeat: -1,
      });
    }

    this.missionTaskContainers.push(container);
  }

  private onTaskClaim(taskId: string, container: Phaser.GameObjects.Container) {
    SimpleAudio.click();
    
    const claimed = DailyMissionManager.instance.claimTaskReward(taskId);
    if (claimed) {
      SaveSync.save();
      // 刷新任务显示
      this.scene.restart();
    } else {
      this.showToast('该任务已完成或不可领取');
    }
  }

  // === 4. 小技巧提示区 ===
  private createHintBox(centerX: number, y: number) {
    const hintW = 400;
    const hintH = 44;

    const hintBg = this.add.rectangle(centerX, y, hintW, hintH, 0xffffff, 0.12)
      .setStrokeStyle(1, 0xffffff, 0.20);

    const hintText = this.add.text(centerX, y, '小技巧：浮漂明显下沉时再拉杆，更容易拿高奖励', {
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    return hintBg;
  }

  // === 5. 主行动区 ===
  private createStartButton(centerX: number, y: number) {
    const btnW = 480;
    const btnH = 110;

    const startBtn = this.add.rectangle(centerX, y, btnW, btnH, 0xff6b6b)
      .setStrokeStyle(4, 0xffffff, 0.35)
      .setInteractive({ useHandCursor: true });

    // 按钮光晕（保持最强 CTA）
    const glow = this.add.rectangle(centerX, y, btnW, btnH, 0xff8888, 0.30);
    this.tweens.add({
      targets: glow,
      scaleX: 1.02,
      scaleY: 1.02,
      alpha: 0.20,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(centerX, y, '开始钓鱼', {
      fontSize: '42px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    startBtn.on('pointerdown', () => {
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
    });
  }

  private createEnergyButton(centerX: number, y: number, isFullEnergy: boolean) {
    const btnW = 360;
    const btnH = 80;
    const alpha = isFullEnergy ? 0.5 : 1.0;

    const energyBtn = this.add.rectangle(centerX, y, btnW, btnH, 0x9b59b6, alpha)
      .setStrokeStyle(2, 0xffffff, 0.15)
      .setInteractive({ useHandCursor: true });

    this.add.text(centerX, y - 8, '🎬 补充体力', {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(centerX, y + 20, '观看广告可恢复 3 点体力', {
      fontSize: '13px',
      color: '#F0E8FF',
    }).setOrigin(0.5);

    energyBtn.on('pointerdown', () => {
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
    });
  }

  private createSwimmers(L: ReturnType<MainScene['getLayout']>) {
    const pool: SwimVisual[] = [
      { emoji: '🐟', x: 140, y: L.waterTopY + 100, dirX: 1, dirY: 1, speed: 0.32, scale: 1.2, drift: 16 },
      { emoji: '🐠', x: 560, y: L.waterTopY + 150, dirX: -1, dirY: 1, speed: 0.4, scale: 1.35, drift: 20 },
      { emoji: '🐡', x: 260, y: L.waterTopY + 200, dirX: 1, dirY: -1, speed: 0.26, scale: 1.55, drift: 14 },
      { emoji: '🐢', x: 480, y: L.waterTopY + 240, dirX: -1, dirY: -1, speed: 0.2, scale: 1.6, drift: 10 },
      { emoji: '🦀', x: 160, y: L.waterTopY + 270, dirX: 1, dirY: -1, speed: 0.18, scale: 1.45, drift: 8 },
    ];

    this.swimmerData = [...pool];

    pool.forEach((item) => {
      const t = this.add.text(item.x, item.y, item.emoji, {
        fontSize: `${Math.round(30 * item.scale)}px`,
      }).setOrigin(0.5);

      this.swimmers.push(t);
    });
  }

  update() {
    if (!this.swimmers.length || !this.swimmerData.length) return;

    const L = this.getLayout();
    const minX = 60;
    const maxX = L.width - 60;
    const minY = L.waterTopY + 76;
    const maxY = L.sandY - 66;

    for (let i = 0; i < this.swimmers.length; i++) {
      const sprite = this.swimmers[i];
      const data = this.swimmerData[i];

      if (!sprite || !data) continue;

      sprite.x += data.dirX * data.speed;
      sprite.y += data.dirY * (data.speed * 0.32) + Math.sin(this.time.now * 0.001 + i) * 0.06;

      if (sprite.x < minX || sprite.x > maxX) data.dirX *= -1;
      if (sprite.y < minY || sprite.y > maxY) data.dirY *= -1;

      sprite.setScale(data.dirX < 0 ? -1 : 1, 1);
    }

    for (let i = 0; i < this.swimmers.length; i++) {
      const a = this.swimmers[i];
      const da = this.swimmerData[i];
      if (!a || !da) continue;

      for (let j = i + 1; j < this.swimmers.length; j++) {
        const b = this.swimmers[j];
        const db = this.swimmerData[j];
        if (!b || !db) continue;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 50) {
          da.dirX *= -1;
          db.dirX *= -1;
          da.dirY *= -1;
          db.dirY *= -1;
        }
      }
    }
  }

  private showToast(message: string) {
    const L = this.getLayout();
    const bg = this.add.rectangle(L.centerX, L.actionBaseY - 100, 440, 58, 0x000000, 0.54)
      .setStrokeStyle(2, 0xffffff, 0.12);

    const text = this.add.text(L.centerX, L.actionBaseY - 100, message, {
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
