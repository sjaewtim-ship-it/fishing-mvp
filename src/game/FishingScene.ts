import Phaser from 'phaser';
import { DirectorSystem, type VisualType } from './DirectorSystem';
import { DropGenerator, type DropItem } from './DropGenerator';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';
import { AnalyticsManager } from './AnalyticsManager';
import { ResultModal } from './ResultModal';
import { EnergyModal } from './EnergyModal';
import { EnergyManager } from './EnergyManager';
import { DailyMissionManager } from './DailyMissionManager';
import { UIConstants } from './UIConstants';
import { buildRoundResult, type RoundResult } from './types/RoundResult';
import { CollectionManager } from './managers/CollectionManager';

type Phase = 'idle' | 'bite' | 'resolved';

export class FishingScene extends Phaser.Scene {
  private phase: Phase = 'idle';
  private roundNumber = 1;

  private floatBobber!: Phaser.GameObjects.Container;
  private fishShadow!: Phaser.GameObjects.Ellipse;
  private fishGlow!: Phaser.GameObjects.Ellipse;

  private titleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private subHintText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;

  private pullBtnBg!: Phaser.GameObjects.Rectangle;
  private pullBtnText!: Phaser.GameObjects.Text;
  private pullBtnHint!: Phaser.GameObjects.Text;

  private biteStartAt = 0;
  private currentDrop: DropItem | null = null;
  private config = DirectorSystem.getTimingAssist();

  constructor() {
    super('FishingScene');
  }

  create(data?: { round?: number }) {
    this.roundNumber = data?.round ?? DirectorSystem.getRoundNumber();
    this.config = DirectorSystem.getTimingAssist();

    this.buildScene();
    this.startFishingFlow();
  }

  private getLayout() {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;
    const centerX = width / 2;

    const safeBottom = Math.max(150, Math.round(height * 0.12));
    const actionBaseY = height - safeBottom;

    const sandY = actionBaseY - 92;
    const plantBaseY = sandY - 78;
    const coralBaseY = sandY - 138;

    return {
      width,
      height,
      centerX,
      actionBaseY,
      sandY,
      plantBaseY,
      coralBaseY,
    };
  }

  /** 判断是否为高品质鱼（与 ResultScene 保持一致） */
  private isQualityFish(name?: string): boolean {
    const qualityFishList = [
      '大鲤鱼', '黑鱼', '鲈鱼', '金鲫鱼', // goodFish
      '锦鲤', '巨型草鱼', // rareFish
      '龙鱼', '黄金锦鲤', // mythFish
    ];
    return qualityFishList.includes(name || '');
  }

  private buildScene() {
    const L = this.getLayout();

    this.cameras.main.setBackgroundColor('#8FD3FF');

    this.add.rectangle(L.centerX, L.height / 2, L.width, L.height, 0x8fd3ff);
    this.add.rectangle(L.centerX, 1015, L.width, 640, 0x1e88e5);

    this.titleText = this.add.text(L.centerX, 95, '🎣 正在钓鱼', {
      fontSize: '46px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.hintText = this.add.text(L.centerX, 150, DirectorSystem.getRoundHint(), {
      fontSize: '24px',
      color: '#FFF3B0',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      wordWrap: { width: 620 },
      align: 'center',
    }).setOrigin(0.5);

    this.comboText = this.add.text(L.centerX, 184, DirectorSystem.getComboLabel(), {
      fontSize: '22px',
      color: '#FFE082',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(DirectorSystem.getCombo() >= 2 ? 1 : 0);

    this.stateText = this.add.text(L.centerX, 224, '等待鱼咬钩...', {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.subHintText = this.add.text(L.centerX, 266, '看到明显动静时再拉杆，别太早也别太晚', {
      fontSize: '20px',
      color: '#EAF6FF',
      wordWrap: { width: 620 },
      align: 'center',
    }).setOrigin(0.5);

    this.add.rectangle(L.centerX, 560, L.width, 6, 0xeafcff).setAlpha(0.9);

    const ripple1 = this.add.ellipse(L.centerX, 585, 90, 20, 0xffffff, 0.16);
    const ripple2 = this.add.ellipse(L.centerX, 600, 130, 24, 0xffffff, 0.10);

    this.tweens.add({
      targets: [ripple1, ripple2],
      scaleX: 1.12,
      alpha: 0.06,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const line = this.add.rectangle(0, -65, 4, 130, 0xffffff, 0.9);
    const bobberTop = this.add.circle(0, 0, 10, 0xff5f5f);
    const bobberBottom = this.add.circle(0, 16, 13, 0xffffff);

    this.floatBobber = this.add.container(L.centerX, 520, [line, bobberTop, bobberBottom]);

    this.tweens.add({
      targets: this.floatBobber,
      y: 526,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const shadowRange = DirectorSystem.getShadowScaleRange();
    const shadowW = Phaser.Math.Between(
      Math.floor(95 * shadowRange.min),
      Math.floor(95 * shadowRange.max)
    );
    const shadowH = Phaser.Math.Between(
      Math.floor(34 * shadowRange.min),
      Math.floor(34 * shadowRange.max)
    );

    this.fishGlow = this.add.ellipse(L.centerX + 15, 760, shadowW + 22, shadowH + 10, 0x000000, 0.08);
    this.fishShadow = this.add.ellipse(L.centerX + 15, 760, shadowW, shadowH, 0x000000, 0.22);

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      x: L.centerX + 95,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      y: 778,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(135, L.plantBaseY, '🌿', { fontSize: '54px' }).setOrigin(0.5).setAlpha(0.90);
    this.add.text(610, L.plantBaseY - 10, '🌱', { fontSize: '48px' }).setOrigin(0.5).setAlpha(0.88);
    this.add.text(178, L.coralBaseY, '🪸', { fontSize: '56px' }).setOrigin(0.5).setAlpha(0.92);
    this.add.text(565, L.coralBaseY - 10, '🪸', { fontSize: '62px' }).setOrigin(0.5).setAlpha(0.90);

    const sandColor = 0xd8c28a;
    this.add.ellipse(200, L.sandY, 220, 58, sandColor, 0.95);
    this.add.ellipse(392, L.sandY + 15, 260, 72, sandColor, 0.95);
    this.add.ellipse(575, L.sandY + 2, 220, 60, sandColor, 0.95);

    this.add.rectangle(L.centerX, L.actionBaseY, 520, 132, 0x000000, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.10);

    this.pullBtnBg = this.add.rectangle(L.centerX, L.actionBaseY - 10, 450, 104, 0xff5f5f)
      .setStrokeStyle(4, 0xffffff, 0.18)
      .setInteractive({ useHandCursor: true });

    this.pullBtnText = this.add.text(L.centerX, L.actionBaseY - 22, '立刻拉杆', {
      fontSize: '36px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.pullBtnHint = this.add.text(L.centerX, L.actionBaseY + 18, '看到明显动静再拉', {
      fontSize: '18px',
      color: '#FFEFEF',
    }).setOrigin(0.5);

    this.pullBtnText.setInteractive({ useHandCursor: true });
    this.pullBtnHint.setInteractive({ useHandCursor: true });

    const onPull = () => this.handlePull();
    this.pullBtnBg.on('pointerdown', onPull);
    this.pullBtnText.on('pointerdown', onPull);
    this.pullBtnHint.on('pointerdown', onPull);
  }

  private refreshHintUI() {
    this.hintText.setText(DirectorSystem.getRoundHint());

    const comboLabel = DirectorSystem.getComboLabel();
    this.comboText.setText(comboLabel);
    this.comboText.setAlpha(comboLabel ? 1 : 0);

    if (comboLabel) {
      this.tweens.add({
        targets: this.comboText,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 220,
        yoyo: true,
      });
    }
  }

  private startFishingFlow() {
    this.phase = 'idle';
    this.currentDrop = null;
    this.refreshHintUI();

    this.stateText.setText('等待鱼咬钩...');
    this.subHintText.setText('鱼影和浮漂有明显变化时再拉杆');

    // 日常任务：完成钓鱼次数（每次新杆开始）
    DailyMissionManager.instance.advanceTask('cast_3', 1);

    this.time.delayedCall(this.config.biteDelayMs, () => {
      if (this.phase !== 'idle') return;

      if (Math.random() < this.config.fakeBiteChance) {
        this.triggerFakeBite();
        return;
      }

      this.triggerBite();
    });
  }

  private triggerFakeBite() {
    this.stateText.setText('好像有动静了…');
    this.subHintText.setText('别急，先观察一下');

    this.tweens.add({
      targets: this.floatBobber,
      y: 548,
      duration: 90,
      yoyo: true,
      repeat: 2,
      onStart: () => SimpleAudio.click(),
      onComplete: () => {
        if (this.phase !== 'idle') return;
        this.stateText.setText('鱼还没咬稳，再等等');
        this.subHintText.setText('真正咬钩时动静会更明显');

        this.time.delayedCall(650, () => {
          if (this.phase === 'idle') this.triggerBite();
        });
      },
    });
  }

  private triggerBite() {
    this.phase = 'bite';
    this.biteStartAt = this.time.now;

    const kind = DirectorSystem.decideDropKind();

    if (kind === 'legend') {
      this.currentDrop = DropGenerator.generateLegend();
    } else if (kind === 'trash') {
      this.currentDrop = DropGenerator.generateTrash();
    } else if (kind === 'interesting') {
      this.currentDrop = DropGenerator.generateInteresting();
    } else if (DirectorSystem.shouldSoftProtectSuccess()) {
      this.currentDrop = DropGenerator.generateSafeFish();
    } else if (DirectorSystem.shouldForceInterestingOutcome()) {
      this.currentDrop = DropGenerator.generateInteresting();
    } else {
      this.currentDrop = DropGenerator.generate();
    }

    this.stateText.setText('咬钩了！快拉杆');
    this.subHintText.setText('红色甜区命中最爽，太早或太晚都会跑鱼');
    this.pullBtnBg.setFillStyle(0xff7a45, 1);
    this.pullBtnText.setText('现在拉！');
    this.pullBtnHint.setText('甜区更赚，拖太久会跑鱼');

    const visual = DirectorSystem.decideVisualType(this.currentDrop.type);
    this.playVisualSignal(visual);

    // 咬钩信号增强：浮漂先快速下沉再上浮，形成明显节奏
    this.tweens.add({
      targets: this.floatBobber,
      y: 575,
      duration: 120,
      ease: 'Back.easeIn',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        // 进入持续抖动
        this.tweens.add({
          targets: this.floatBobber,
          y: 560,
          duration: 90,
          yoyo: true,
          repeat: 6,
        });
      },
    });

    // 鱼影也增加对应动作
    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      y: 780,
      duration: 100,
      ease: 'Sine.easeOut',
      yoyo: true,
      repeat: 1,
    });

    // 甜区提示：按钮先橙再红，形成节奏
    this.time.delayedCall(Math.max(60, this.config.earlyToleranceMs), () => {
      if (this.phase !== 'bite') return;
      this.pullBtnBg.setFillStyle(0xff3b30, 1);
      this.pullBtnText.setText('甜区！');
      this.pullBtnHint.setText('现在拉最稳');
      this.tweens.add({
        targets: [this.pullBtnBg, this.pullBtnText],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 120,
        yoyo: true,
        repeat: 2,
      });
    });

    // 甜区结束，进入普通成功区
    this.time.delayedCall(this.config.perfectWindowMs, () => {
      if (this.phase !== 'bite') return;
      this.pullBtnBg.setFillStyle(0xff9f0a, 1);
      this.pullBtnText.setText('快拉！');
      this.pullBtnHint.setText('再慢就危险了');
    });

    this.time.delayedCall(this.config.goodWindowMs + this.config.lateToleranceMs, () => {
      if (this.phase !== 'bite') return;
      this.failAndGo('late');
    });
  }

  private playVisualSignal(visual: VisualType) {
    if (visual === 'big') {
      this.tweens.add({
        targets: [this.fishShadow, this.fishGlow],
        scaleX: DirectorSystem.hasComboBonus() ? 1.34 : 1.26,
        scaleY: DirectorSystem.hasComboBonus() ? 1.34 : 1.26,
        alpha: 0.45,
        duration: 180,
        yoyo: true,
        repeat: 5,
      });
      return;
    }

    if (visual === 'weird') {
      this.tweens.add({
        targets: this.fishShadow,
        x: this.getLayout().centerX + 45,
        duration: 120,
        yoyo: true,
        repeat: 6,
      });
      return;
    }

    if (visual === 'small') {
      this.fishShadow.setScale(0.76);
      this.fishGlow.setScale(0.76);
      this.tweens.add({
        targets: [this.fishShadow, this.fishGlow],
        scaleX: 0.86,
        scaleY: 0.86,
        duration: 140,
        yoyo: true,
        repeat: 5,
      });
      return;
    }

    this.tweens.add({
      targets: this.fishShadow,
      y: 792,
      duration: 180,
      yoyo: true,
      repeat: 4,
    });
  }

  private handlePull() {
    if (this.phase === 'resolved') return;

    SimpleAudio.click();

    this.pullBtnBg.setScale(0.96);
    this.pullBtnText.setScale(0.96);
    this.pullBtnHint.setScale(0.96);

    this.time.delayedCall(90, () => {
      if (this.pullBtnBg.active) this.pullBtnBg.setScale(1);
      if (this.pullBtnText.active) this.pullBtnText.setScale(1);
      if (this.pullBtnHint.active) this.pullBtnHint.setScale(1);
    });

    if (this.phase === 'idle') {
      this.failAndGo('too_early');
      return;
    }

    if (this.phase !== 'bite') return;

    const elapsed = this.time.now - this.biteStartAt;

    if (elapsed < this.config.earlyToleranceMs) {
      this.failAndGo('early');
      return;
    }

    if (elapsed <= this.config.perfectWindowMs) {
      this.successAndGo(true);
      return;
    }

    if (elapsed <= this.config.goodWindowMs) {
      this.successAndGo(false);
      return;
    }

    this.failAndGo('late');
  }

  private successAndGo(perfect: boolean) {
    // === 1. 先完成成功结算逻辑（导演系统、埋点、存档、奖励）===
    this.phase = 'resolved';
    const finalDrop = perfect && this.currentDrop
      ? { ...this.currentDrop, reward: Math.round(this.currentDrop.reward * 1.25) }
      : this.currentDrop ?? DropGenerator.generate();

    DirectorSystem.recordSuccess();
    AnalyticsManager.instance.onRoundSuccess(finalDrop.name);
    DirectorSystem.nextRound();

    // 图鉴解锁
    CollectionManager.unlockByDrop(finalDrop);

    SaveSync.save();

    // 日常任务：高品质鱼
    if (this.isQualityFish(finalDrop.name)) {
      DailyMissionManager.instance.advanceTask('quality_1', 1);
    }

    // 生成 RoundResult 数据结构（用于后续爆点系统/广告优化）
    const combo = DirectorSystem.getCombo();
    const roundResult: RoundResult = buildRoundResult(finalDrop, perfect, combo);

    this.stateText.setText(perfect ? '完美命中！' : (DirectorSystem.getCombo() >= 2 ? `命中！${DirectorSystem.getCombo()}连击` : '上钩了！'));
    this.subHintText.setText(
      perfect
        ? '这一下拉得很准，奖励感更强'
        : DirectorSystem.getCombo() >= 3
          ? '状态火热，下一杆更有机会出节目效果'
          : '看看这一杆到底捞到了什么'
    );

    // === 2. 播放成功动画 ===
    this.tweens.add({
      targets: this.floatBobber,
      y: 450,
      duration: 240,
      ease: 'Back.easeIn',
    });

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      alpha: 0,
      duration: 180,
    });

    if (perfect) {
      this.tweens.add({
        targets: [this.titleText, this.stateText, this.pullBtnBg],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 140,
        yoyo: true,
        repeat: 1,
      });
    } else if (DirectorSystem.getCombo() >= 2) {
      this.tweens.add({
        targets: [this.titleText, this.stateText],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 160,
        yoyo: true,
      });
    }

    // === 3. 动画结束后显示成功弹窗（不再跳转 ResultScene）===
    this.time.delayedCall(380, () => {
      this.showResultModal('success', finalDrop, perfect, undefined, roundResult);
    });
  }

  private failAndGo(reason: 'early' | 'too_early' | 'late') {
    // === 1. 先完成失败结算逻辑（导演系统、埋点、存档）===
    this.phase = 'resolved';
    DirectorSystem.recordFail();
    AnalyticsManager.instance.onRoundFail();
    DirectorSystem.nextRound();
    SaveSync.save();

    // 生成 RoundResult 数据结构（用于后续爆点系统/广告优化）
    const combo = DirectorSystem.getCombo();
    const roundResult: RoundResult = buildRoundResult(null, false, combo, reason);

    // === 2. 播放失败动画 ===
    this.stateText.setText(
      reason === 'late'
        ? '慢了半拍…'
        : reason === 'early'
          ? '拉早了一点…'
          : '这一杆失手了'
    );

    this.subHintText.setText(
      reason === 'too_early'
        ? '鱼还没咬钩就出手了'
        : reason === 'early'
          ? '鱼刚咬钩，你出手太急了'
          : '咬钩后拖太久，鱼跑了'
    );

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      x: this.getLayout().width - 140,
      alpha: 0,
      duration: 220,
      ease: 'Sine.easeIn',
    });

    this.tweens.add({
      targets: this.floatBobber,
      y: 535,
      duration: 120,
      yoyo: true,
      repeat: 1,
    });

    // === 3. 动画结束后显示失败弹窗（不再跳转 ResultScene）===
    this.time.delayedCall(320, () => {
      this.showResultModal('fail', undefined, undefined, reason, roundResult);
    });
  }

  private currentResultModal: ResultModal | null = null;

  private showResultModal(
    resultType: 'success' | 'fail',
    drop?: DropItem,
    perfect?: boolean,
    failReason?: 'early' | 'too_early' | 'late',
    roundResult?: RoundResult
  ) {
    const combo = DirectorSystem.getCombo();

    this.currentResultModal = new ResultModal(this, {
      resultType,
      drop,
      round: this.roundNumber,
      perfect,
      combo,
      failReason,
      roundResult,
      onContinue: () => {
        // 先判断体力
        if (!EnergyManager.instance.hasEnergy()) {
          this.showEnergyModalFromFishingScene();
          return;
        }

        // 体力充足，扣体力并重启
        EnergyManager.instance.costEnergy();
        SaveSync.save();
        this.currentResultModal?.hide();
        this.restartFlow();
      },
      onBack: () => {
        this.currentResultModal?.hide();
        this.scene.start('MainScene');
      },
    });
    this.currentResultModal.show();
  }

  private showEnergyModalFromFishingScene() {
    const currentEnergy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    const modal = new EnergyModal(this, {
      currentEnergy,
      maxEnergy,
      underlyingContainer: this.currentResultModal?.getContainer() ?? undefined,
      onRecharge: () => {
        EnergyManager.instance.addEnergy(3);
        SaveSync.save();
        modal.hide();
      },
      onCancel: () => {
        modal.hide();
      },
    });
    modal.show();
  }

  private restartFlow() {
    // 重置状态到初始钓鱼流程
    this.phase = 'idle';
    this.currentDrop = null;
    this.biteStartAt = 0;

    // 重置浮漂位置
    this.floatBobber.setPosition(this.getLayout().centerX, 520);
    this.floatBobber.setScale(1);

    // 重置鱼影位置和状态
    const L = this.getLayout();
    const shadowRange = DirectorSystem.getShadowScaleRange();
    const shadowW = Phaser.Math.Between(
      Math.floor(95 * shadowRange.min),
      Math.floor(95 * shadowRange.max)
    );
    const shadowH = Phaser.Math.Between(
      Math.floor(34 * shadowRange.min),
      Math.floor(34 * shadowRange.max)
    );

    this.fishShadow.setPosition(L.centerX + 15, 760);
    this.fishShadow.setSize(shadowW, shadowH);
    this.fishShadow.setAlpha(0.22);
    this.fishShadow.setScale(1);

    this.fishGlow.setPosition(L.centerX + 15, 760);
    this.fishGlow.setSize(shadowW + 22, shadowH + 10);
    this.fishGlow.setAlpha(0.08);
    this.fishGlow.setScale(1);

    // 重置按钮状态
    this.pullBtnBg.setFillStyle(0xff5f5f, 1);
    this.pullBtnBg.setScale(1);
    this.pullBtnText.setText('立刻拉杆');
    this.pullBtnText.setScale(1);
    this.pullBtnHint.setText('看到明显动静再拉');
    this.pullBtnHint.setScale(1);

    // 重置 UI 文案
    this.refreshHintUI();
    this.stateText.setText('等待鱼咬钩...');
    this.subHintText.setText('鱼影和浮漂有明显变化时再拉杆');

    // 重新开始钓鱼流程
    this.startFishingFlow();
  }
}
