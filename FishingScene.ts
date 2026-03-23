// 遗留未接线文件：这是旧版场景副本，不参与当前入口和构建主链路。
import Phaser from 'phaser';
import { DirectorSystem } from './DirectorSystem';
import { DropGenerator, type DropItem } from './DropGenerator';
import { RoundManager } from './RoundManager';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';

type Phase =
  | 'waiting'
  | 'casting'
  | 'idle'
  | 'fake_bite'
  | 'bite_window'
  | 'resolved';

export class FishingScene extends Phaser.Scene {
  private phase: Phase = 'waiting';
  private roundNumber = 1;

  private rodTip!: Phaser.GameObjects.Container;
  private floatBobber!: Phaser.GameObjects.Container;
  private fishShadow!: Phaser.GameObjects.Ellipse;
  private fishShadowGlow!: Phaser.GameObjects.Ellipse;

  private titleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private subHintText!: Phaser.GameObjects.Text;
  private pullBtn!: Phaser.GameObjects.Rectangle;
  private pullBtnText!: Phaser.GameObjects.Text;

  private waterLine!: Phaser.GameObjects.Rectangle;
  private ripple1!: Phaser.GameObjects.Ellipse;
  private ripple2!: Phaser.GameObjects.Ellipse;

  private biteStartAt = 0;
  private biteDeadlineAt = 0;
  private currentDrop: DropItem | null = null;
  private fakeBiteTriggered = false;

  private config = DirectorSystem.getTimingAssist();

  constructor() {
    super('FishingScene');
  }

  create() {
    this.roundNumber = RoundManager.instance.getRoundCount() + 1;
    this.config = DirectorSystem.getTimingAssist();

    this.buildScene();
    this.startFlow();
  }

  private buildScene() {
    this.cameras.main.setBackgroundColor('#8FD3FF');

    // 背景
    this.add.rectangle(375, 667, 750, 1334, 0x8fd3ff);
    this.add.rectangle(375, 1015, 750, 640, 0x1e88e5);

    // 云
    const cloud1 = this.add.text(110, 86, '☁️', { fontSize: '42px' }).setAlpha(0.88);
    const cloud2 = this.add.text(520, 120, '☁️ ☁️', { fontSize: '34px' }).setAlpha(0.82);

    this.tweens.add({
      targets: cloud1,
      x: 560,
      duration: 18000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: cloud2,
      x: 140,
      duration: 22000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 标题
    this.titleText = this.add.text(375, 90, '🎣 开始钓鱼', {
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

    this.stateText = this.add.text(375, 205, '抛竿后等待鱼咬钩', {
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.subHintText = this.add.text(375, 245, '鱼有动静时立刻拉杆，但别太早也别太晚', {
      fontSize: '20px',
      color: '#EAF6FF',
      wordWrap: { width: 620 },
      align: 'center',
    }).setOrigin(0.5);

    // 竿子
    const rod = this.add.rectangle(185, 435, 12, 250, 0x7a4f2b);
    rod.setAngle(-16);

    this.rodTip = this.add.container(270, 345, [
      this.add.circle(0, 0, 6, 0xffffff),
    ]);

    // 水面
    this.waterLine = this.add.rectangle(375, 560, 750, 6, 0xeafcff).setAlpha(0.9);

    this.ripple1 = this.add.ellipse(375, 585, 90, 20, 0xffffff, 0.16);
    this.ripple2 = this.add.ellipse(375, 600, 130, 24, 0xffffff, 0.10);

    this.tweens.add({
      targets: [this.ripple1, this.ripple2],
      scaleX: 1.12,
      alpha: 0.06,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 浮漂
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

    // 鱼影
    const shadowScale = DirectorSystem.getShadowScaleRange();
    const initialW = Phaser.Math.Between(
      Math.floor(95 * shadowScale.min),
      Math.floor(95 * shadowScale.max)
    );
    const initialH = Phaser.Math.Between(
      Math.floor(34 * shadowScale.min),
      Math.floor(34 * shadowScale.max)
    );

    this.fishShadowGlow = this.add.ellipse(390, 760, initialW + 22, initialH + 10, 0x000000, 0.08);
    this.fishShadow = this.add.ellipse(390, 760, initialW, initialH, 0x000000, 0.22);

    this.tweens.add({
      targets: [this.fishShadow, this.fishShadowGlow],
      x: 470,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: [this.fishShadow, this.fishShadowGlow],
      y: 778,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 水草/装饰
    this.add.text(135, 1125, '🌿', { fontSize: '54px' }).setOrigin(0.5).setAlpha(0.90);
    this.add.text(610, 1115, '🌱', { fontSize: '48px' }).setOrigin(0.5).setAlpha(0.88);
    this.add.text(178, 1040, '🪸', { fontSize: '56px' }).setOrigin(0.5).setAlpha(0.92);
    this.add.text(565, 1030, '🪸', { fontSize: '62px' }).setOrigin(0.5).setAlpha(0.90);

    const sandColor = 0xd8c28a;
    this.add.ellipse(200, 1210, 220, 58, sandColor, 0.95);
    this.add.ellipse(392, 1225, 260, 72, sandColor, 0.95);
    this.add.ellipse(575, 1212, 220, 60, sandColor, 0.95);

    // 拉杆按钮
    this.pullBtn = this.add.rectangle(375, 1290, 450, 108, 0xff5f5f)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.18);

    this.pullBtnText = this.add.text(375, 1290, '立刻拉杆', {
      fontSize: '36px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.pullBtn.on('pointerdown', () => {
      this.handlePull();
    });
  }

  private startFlow() {
    this.phase = 'casting';
    this.currentDrop = null;
    this.fakeBiteTriggered = false;

    this.stateText.setText('正在等待鱼靠近...');
    this.subHintText.setText('盯住浮漂和鱼影的变化');

    this.time.delayedCall(this.config.biteDelayMs, () => {
      if (this.phase !== 'casting') return;

      // 假咬钩：制造紧张感
      if (Math.random() < this.config.fakeBiteChance) {
        this.triggerFakeBite();
        return;
      }

      this.triggerRealBite();
    });
  }

  private triggerFakeBite() {
    this.phase = 'fake_bite';
    this.fakeBiteTriggered = true;

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
        if (this.phase !== 'fake_bite') return;
        this.phase = 'casting';
        this.stateText.setText('鱼还没咬稳，再等等');
        this.subHintText.setText('真正咬钩时动静会更明显');

        this.time.delayedCall(700, () => {
          if (this.phase === 'casting') this.triggerRealBite();
        });
      },
    });
  }

  private triggerRealBite() {
    this.phase = 'bite_window';
    this.biteStartAt = this.time.now;
    this.biteDeadlineAt = this.biteStartAt + this.config.goodWindowMs + this.config.lateToleranceMs;

    this.stateText.setText('咬钩了！快拉杆');
    this.subHintText.setText('现在拉最稳，太早或太晚都会跑鱼');

    // 根据导演系统决定掉落倾向
    if (DirectorSystem.shouldSoftProtectSuccess()) {
      this.currentDrop = DropGenerator.generateSafeFish();
    } else if (DirectorSystem.shouldForceInterestingOutcome()) {
      this.currentDrop = DropGenerator.generateInteresting();
    } else if (DirectorSystem.getBucket() === 'good_shot') {
      this.currentDrop = DropGenerator.generateGoodShot();
    } else {
      this.currentDrop = DropGenerator.generate();
    }

    // 真咬钩表现：浮漂下沉 + 鱼影冲刺
    this.tweens.add({
      targets: this.floatBobber,
      y: 562,
      duration: 120,
      yoyo: true,
      repeat: 6,
    });

    this.tweens.add({
      targets: [this.fishShadow, this.fishShadowGlow],
      x: 375,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 180,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
    });

    // 自动过期：拉晚
    this.time.delayedCall(this.config.goodWindowMs + this.config.lateToleranceMs, () => {
      if (this.phase !== 'bite_window') return;
      this.failAndGo('late');
    });
  }

  private handlePull() {
    if (this.phase === 'resolved') return;

    SimpleAudio.click();

    this.pullBtn.setScale(0.95);
    this.time.delayedCall(80, () => {
      if (this.pullBtn.active) this.pullBtn.setScale(1);
    });

    // 太早
    if (this.phase === 'casting' || this.phase === 'waiting') {
      this.failAndGo('too_early');
      return;
    }

    // 假咬钩阶段拉杆，也判早
    if (this.phase === 'fake_bite') {
      this.failAndGo('early');
      return;
    }

    if (this.phase !== 'bite_window') return;

    const elapsed = this.time.now - this.biteStartAt;

    const perfectWindow = this.config.perfectWindowMs;
    const goodWindow = this.config.goodWindowMs;
    const earlyTolerance = this.config.earlyToleranceMs;

    // 过早
    if (elapsed < earlyTolerance) {
      this.failAndGo('early');
      return;
    }

    // 成功：perfect/good 都进结果
    if (elapsed <= goodWindow) {
      this.successAndGo();
      return;
    }

    // 过晚
    this.failAndGo('late');
  }

  private successAndGo() {
    this.phase = 'resolved';
    RoundManager.instance.addRound();
    SaveSync.save();

    this.stateText.setText('上钩了！');
    this.subHintText.setText('这一杆看看你捞上来了什么');

    this.tweens.add({
      targets: this.floatBobber,
      y: 450,
      duration: 260,
      ease: 'Back.easeIn',
    });

    this.tweens.add({
      targets: [this.fishShadow, this.fishShadowGlow],
      alpha: 0,
      duration: 180,
    });

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
    RoundManager.instance.addRound();
    SaveSync.save();

    this.stateText.setText(reason === 'late' ? '慢了半拍…' : '这一杆失手了');
    this.subHintText.setText('别急，再来一杆更容易中');

    this.tweens.add({
      targets: [this.fishShadow, this.fishShadowGlow],
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
