import Phaser from 'phaser';
import { DirectorSystem } from './DirectorSystem';
import { DropGenerator } from './DropGenerator';
import { RoundManager } from './RoundManager';
import { SaveSync } from './SaveSync';
import { GameAudio } from './GameAudio';

export class FishingScene extends Phaser.Scene {
  private phase = 'waiting';
  private fishShadow!: Phaser.GameObjects.Ellipse;
  private fishGlow!: Phaser.GameObjects.Ellipse;
  private float!: Phaser.GameObjects.Container;

  private biteStart = 0;
  private drop: any;

  create() {
    const cfg = DirectorSystem.getTimingAssist();

    this.add.rectangle(375, 667, 750, 1334, 0x8fd3ff);
    this.add.rectangle(375, 1000, 750, 700, 0x1e88e5);

    // 水面
    this.add.rectangle(375, 560, 750, 6, 0xffffff);

    // 浮漂
    this.float = this.add.container(375, 520, [
      this.add.circle(0, 0, 10, 0xff5f5f),
      this.add.circle(0, 16, 12, 0xffffff),
    ]);

    // 鱼影
    this.fishGlow = this.add.ellipse(375, 750, 120, 50, 0xffffff, 0.05);
    this.fishShadow = this.add.ellipse(375, 750, 100, 40, 0x000000, 0.25);

    this.startFlow(cfg);

    this.input.on('pointerdown', () => this.pull(cfg));
  }

  private startFlow(cfg: any) {
    this.time.delayedCall(cfg.biteDelayMs, () => {
      this.triggerBite(cfg);
    });
  }

  private triggerBite(cfg: any) {
    this.phase = 'bite';
    this.biteStart = this.time.now;

    // 🎯 根据导演系统决定掉落
    if (DirectorSystem.shouldSoftProtectSuccess()) {
      this.drop = DropGenerator.generateSafeFish();
    } else if (DirectorSystem.shouldForceInterestingOutcome()) {
      this.drop = DropGenerator.generateInteresting();
    } else {
      this.drop = DropGenerator.generate();
    }

    // 🎯 鱼影前兆
    if (this.drop.type === 'legend') {
      this.tweens.add({
        targets: [this.fishShadow, this.fishGlow],
        scale: 1.4,
        alpha: 0.5,
        duration: 200,
        yoyo: true,
        repeat: -1,
      });
    } else if (this.drop.type === 'trash') {
      this.tweens.add({
        targets: this.fishShadow,
        x: 420,
        duration: 200,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.tweens.add({
        targets: this.fishShadow,
        y: 770,
        duration: 300,
        yoyo: true,
        repeat: -1,
      });
    }

    // 🎵 咬钩音效
    GameAudio.play('bite');

    // 浮漂抖动
    this.tweens.add({
      targets: this.float,
      y: 550,
      duration: 100,
      yoyo: true,
      repeat: 5,
    });

    // 超时失败
    this.time.delayedCall(cfg.goodWindowMs + 300, () => {
      if (this.phase === 'bite') this.fail();
    });
  }

  private pull(cfg: any) {
    if (this.phase !== 'bite') {
      this.fail();
      return;
    }

    const t = this.time.now - this.biteStart;

    if (t < cfg.earlyToleranceMs) {
      this.fail();
    } else if (t <= cfg.goodWindowMs) {
      this.success();
    } else {
      this.fail();
    }
  }

  private success() {
    this.phase = 'done';
    GameAudio.play('success');

    RoundManager.instance.addRound();
    SaveSync.save();

    this.scene.start('ResultScene', {
      success: true,
      drop: this.drop,
    });
  }

  private fail() {
    this.phase = 'done';
    GameAudio.play('fail');

    RoundManager.instance.addRound();
    SaveSync.save();

    this.scene.start('ResultScene', {
      success: false,
    });
  }
}
