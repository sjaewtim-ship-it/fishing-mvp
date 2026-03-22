import Phaser from 'phaser';
import { DirectorSystem, type VisualType } from './DirectorSystem';
import { DropGenerator, type DropItem } from './DropGenerator';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';

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

  private buildScene() {
    this.cameras.main.setBackgroundColor('#8FD3FF');

    this.add.rectangle(375, 667, 750, 1334, 0x8fd3ff);
    this.add.rectangle(375, 1015, 750, 640, 0x1e88e5);

    this.titleText = this.add.text(375, 95, '🎣 正在钓鱼', {
      fontSize: '46px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.hintText = this.add.text(375, 150, DirectorSystem.getRoundHint(), {
      fontSize: '24px',
      color: '#FFF3B0',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      wordWrap: { width: 620 },
      align: 'center',
    }).setOrigin(0.5);

    this.comboText = this.add.text(375, 184, DirectorSystem.getComboLabel(), {
      fontSize: '22px',
      color: '#FFE082',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(DirectorSystem.getCombo() >= 2 ? 1 : 0);

    this.stateText = this.add.text(375, 224, '等待鱼咬钩...', {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.subHintText = this.add.text(375, 266, '看到明显动静时再拉杆，别太早也别太晚', {
      fontSize: '20px',
      color: '#EAF6FF',
      wordWrap: { width: 620 },
      align: 'center',
    }).setOrigin(0.5);

    this.add.rectangle(375, 560, 750, 6, 0xeafcff).setAlpha(0.9);

    const ripple1 = this.add.ellipse(375, 585, 90, 20, 0xffffff, 0.16);
    const ripple2 = this.add.ellipse(375, 600, 130, 24, 0xffffff, 0.10);

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

    this.floatBobber = this.add.container(375, 520, [line, bobberTop, bobberBottom]);

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

    this.fishGlow = this.add.ellipse(390, 760, shadowW + 22, shadowH + 10, 0x000000, 0.08);
    this.fishShadow = this.add.ellipse(390, 760, shadowW, shadowH, 0x000000, 0.22);

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      x: 470,
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

    // 水底装饰稍微上移一点，给按钮留空间
    this.add.text(135, 1085, '🌿', { fontSize: '54px' }).setOrigin(0.5).setAlpha(0.90);
    this.add.text(610, 1075, '🌱', { fontSize: '48px' }).setOrigin(0.5).setAlpha(0.88);
    this.add.text(178, 1000, '🪸', { fontSize: '56px' }).setOrigin(0.5).setAlpha(0.92);
    this.add.text(565, 990, '🪸', { fontSize: '62px' }).setOrigin(0.5).setAlpha(0.90);

    const sandColor = 0xd8c28a;
    this.add.ellipse(200, 1170, 220, 58, sandColor, 0.95);
    this.add.ellipse(392, 1185, 260, 72, sandColor, 0.95);
    this.add.ellipse(575, 1172, 220, 60, sandColor, 0.95);

    // ===== 安全按钮区：整体上移 =====
    const actionBaseY = 1140;

    this.add.rectangle(375, actionBaseY, 520, 132, 0x000000, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.10);

    this.pullBtnBg = this.add.rectangle(375, actionBaseY - 10, 450, 104, 0xff5f5f)
      .setStrokeStyle(4, 0xffffff, 0.18)
      .setInteractive({ useHandCursor: true });

    this.pullBtnText = this.add.text(375, actionBaseY - 22, '立刻拉杆', {
      fontSize: '36px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.pullBtnHint = this.add.text(375, actionBaseY + 18, '看到明显动静再拉', {
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
    this.subHintText.setText('现在是最佳时机，慢了就跑鱼');
    this.pullBtnBg.setFillStyle(0xff7a45, 1);
    this.pullBtnText.setText('现在拉！');
    this.pullBtnHint.setText('太早或太晚都会跑鱼');

    const visual = DirectorSystem.decideVisualType(this.currentDrop.type);
    this.playVisualSignal(visual);

    this.tweens.add({
      targets: this.floatBobber,
      y: 560,
      duration: 100,
      yoyo: true,
      repeat: 5,
    });

    this.tweens.add({
      targets: this.pullBtnBg,
      scaleX: DirectorSystem.hasComboBonus() ? 1.06 : 1.03,
      scaleY: DirectorSystem.hasComboBonus() ? 1.06 : 1.03,
      duration: 180,
      yoyo: true,
      repeat: 5,
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
        x: 420,
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

    if (elapsed <= this.config.goodWindowMs) {
      this.successAndGo();
      return;
    }

    this.failAndGo('late');
  }

  private successAndGo() {
    this.phase = 'resolved';
    DirectorSystem.recordSuccess();
    DirectorSystem.nextRound();
    SaveSync.save();

    this.stateText.setText(DirectorSystem.getCombo() >= 2 ? `命中！${DirectorSystem.getCombo()}连击` : '上钩了！');
    this.subHintText.setText(
      DirectorSystem.getCombo() >= 3
        ? '状态火热，下一杆更有机会出节目效果'
        : '看看这一杆到底捞到了什么'
    );

    this.tweens.add({
      targets: this.floatBobber,
      y: 450,
      duration: 260,
      ease: 'Back.easeIn',
    });

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      alpha: 0,
      duration: 180,
    });

    if (DirectorSystem.getCombo() >= 2) {
      this.tweens.add({
        targets: [this.titleText, this.stateText],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 160,
        yoyo: true,
      });
    }

    this.time.delayedCall(380, () => {
      this.scene.start('ResultScene', {
        success: true,
        drop: this.currentDrop ?? DropGenerator.generate(),
        round: this.roundNumber,
      });
    });
  }

  private failAndGo(reason: 'early' | 'too_early' | 'late') {
    this.phase = 'resolved';
    DirectorSystem.recordFail();
    DirectorSystem.nextRound();
    SaveSync.save();

    this.stateText.setText(reason === 'late' ? '慢了半拍…' : '这一杆失手了');
    this.subHintText.setText('别急，再来一杆更容易中');

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      x: 610,
      alpha: 0,
      duration: 260,
      ease: 'Sine.easeIn',
    });

    this.time.delayedCall(320, () => {
      this.scene.start('ResultScene', {
        success: false,
        round: this.roundNumber,
        failReason: reason,
      });
    });
  }
}
