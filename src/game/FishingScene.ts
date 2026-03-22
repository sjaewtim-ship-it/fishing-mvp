import Phaser from 'phaser';
import { DropGenerator, type DropItem } from './DropGenerator';
import { RoundManager } from './RoundManager';
import { AnalyticsManager } from './AnalyticsManager';
import { SaveSync } from './SaveSync';
import { DirectorManager } from './DirectorManager';
import { SimpleAudio } from './SimpleAudio';
import { VisualMap } from './VisualMap';

type FishingPhase = 'waiting' | 'approaching' | 'bite' | 'lifting' | 'resolved';
type FailReason = 'early' | 'too_early' | 'late';
type FishSizeTier = 'small' | 'medium' | 'large';

export class FishingScene extends Phaser.Scene {
  constructor() {
    super('FishingScene');
  }

  private getSizeTier(drop: DropItem): FishSizeTier {
    if (drop.type === 'legend') return 'large';

    const largeNames = ['iPhone', '龙虾', '盲盒', '乌龟'];
    const smallNames = ['泥鳅', '树枝', '旧鞋子', '塑料袋'];

    if (largeNames.includes(drop.name)) return 'large';
    if (smallNames.includes(drop.name)) return 'small';
    return 'medium';
  }

  private getTierConfig(tier: FishSizeTier) {
    if (tier === 'small') {
      return {
        shadowScale: 0.85,
        previewText: '水面很安静，像是小东西在试探',
        successMin: 140,
        successMax: 760,
        biteTimeout: 1100,
        shadowAlpha: 0.26,
        approachDuration: 1200,
      };
    }

    if (tier === 'large') {
      return {
        shadowScale: 1.35,
        previewText: '水下有大东西靠近，稳住别急',
        successMin: 220,
        successMax: 520,
        biteTimeout: 900,
        shadowAlpha: 0.42,
        approachDuration: 1600,
      };
    }

    return {
      shadowScale: 1.05,
      previewText: '有东西在附近游动，注意浮漂',
      successMin: 170,
      successMax: 650,
      biteTimeout: 1000,
      shadowAlpha: 0.34,
      approachDuration: 1400,
    };
  }

  create() {
    this.cameras.main.setBackgroundColor('#8FD3FF');

    const round = RoundManager.instance.nextRound();
    AnalyticsManager.instance.onStartRound();
    SaveSync.save();

    let targetDrop: DropItem;
    if (round <= 3) {
      targetDrop = RoundManager.instance.getNewbieDrop(round);
    } else {
      const category = DirectorManager.instance.getAdjustedCategory();
      targetDrop = DropGenerator.generateByCategory(category);
    }

    const tier = this.getSizeTier(targetDrop);
    const tierConfig = this.getTierConfig(tier);

    this.add.rectangle(375, 667, 750, 1334, 0x8fd3ff);
    this.add.rectangle(375, 995, 750, 510, 0x1e88e5);
    this.add.rectangle(375, 570, 750, 6, 0xeafcff).setAlpha(0.85);

    this.add.rectangle(375, 150, 640, 145, 0x000000, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.12);

    this.add.text(375, 90, `第 ${round} 次钓鱼`, {
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const statusText = this.add.text(375, 138, '抛竿中…', {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const tipText = this.add.text(375, 186, '准备抛竿，把鱼饵扔进水里', {
      fontSize: '24px',
      color: '#EAF6FF',
      wordWrap: { width: 580 },
      align: 'center',
    }).setOrigin(0.5);

    const rod = this.add.text(235, 315, '🎣', {
      fontSize: '116px',
    }).setOrigin(0.5);

    this.add.rectangle(315, 420, 4, 180, 0xffffff).setOrigin(0.5, 0);

    const bobber = this.add.circle(375, 585, 10, 0xff6b6b);
    const ripple1 = this.add.circle(375, 592, 20, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 0.32);
    const ripple2 = this.add.circle(375, 592, 35, 0xffffff, 0).setStrokeStyle(2, 0xffffff, 0.2);

    const fishShadow = this.add.text(160, 670, '🐟', {
      fontSize: `${Math.round(58 * tierConfig.shadowScale)}px`,
    }).setOrigin(0.5).setAlpha(tierConfig.shadowAlpha);

    fishShadow.setTint(0x0f3057);

    const pullBtn = this.add.rectangle(375, 955, 430, 120, 0x7f8c8d)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.14);

    const pullBtnText = this.add.text(375, 955, '等待咬钩…', {
      fontSize: '34px',
      color: '#ECF0F1',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    let phase: FishingPhase = 'waiting';
    let biteStartTime = 0;
    let resolved = false;

    const setPullIdle = () => {
      pullBtn.setFillStyle(0x7f8c8d);
      pullBtnText.setText('等待咬钩…');
      pullBtnText.setColor('#ECF0F1');
      this.tweens.killTweensOf([pullBtn, pullBtnText]);
      pullBtn.setScale(1);
      pullBtnText.setScale(1);
    };

    const setPullActive = () => {
      pullBtn.setFillStyle(0xff6b6b);
      pullBtnText.setText('快拉！！');
      pullBtnText.setColor('#FFFFFF');

      this.tweens.add({
        targets: [pullBtn, pullBtnText],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 120,
        yoyo: true,
        repeat: 6,
      });
    };

    const startLiftReveal = () => {
      phase = 'lifting';

      statusText.setText('🎣 正在收线…');
      tipText.setText('看看钓上来的到底是什么');

      this.tweens.add({
        targets: rod,
        y: 260,
        angle: -12,
        duration: 280,
      });

      this.tweens.killTweensOf(bobber);
      this.tweens.add({
        targets: bobber,
        y: 470,
        duration: 280,
        ease: 'Quad.easeOut',
      });

      const unknown = this.add.text(375, 470, '❔', {
        fontSize: '96px',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: unknown,
        alpha: 1,
        scale: 1.2,
        duration: 180,
      });

      this.time.delayedCall(320, () => {
        unknown.destroy();

        const finalEmoji = this.add.text(375, 470, VisualMap.getEmoji(targetDrop.name), {
          fontSize: '132px',
        }).setOrigin(0.5).setScale(0.2);

        this.tweens.add({
          targets: finalEmoji,
          scale: 1.05,
          duration: 220,
          ease: 'Back.easeOut',
        });

        this.time.delayedCall(420, () => {
          DirectorManager.instance.onDropResult(targetDrop);
          AnalyticsManager.instance.onRoundSuccess(targetDrop.name);
          SaveSync.save();

          this.scene.start('ResultScene', {
            success: true,
            drop: targetDrop,
            round,
            newbie: round <= 3,
          });
        });
      });
    };

    const resolveFail = (reason: FailReason) => {
      if (resolved) return;
      resolved = true;
      phase = 'resolved';
      setPullIdle();
      SimpleAudio.fail();

      const failFlash = this.add.text(375, 320, '💢 跑了！', {
        fontSize: '56px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: failFlash,
        scale: 1.15,
        alpha: 0.18,
        duration: 240,
      });

      this.time.delayedCall(320, () => {
        AnalyticsManager.instance.onRoundFail();
        SaveSync.save();

        this.scene.start('ResultScene', {
          success: false,
          round,
          newbie: false,
          failReason: reason,
        });
      });
    };

    const resolveSuccess = () => {
      if (resolved) return;
      resolved = true;
      phase = 'resolved';
      setPullIdle();
      SimpleAudio.success();

      const successFlash = this.add.text(375, 320, '💥 拉中了！', {
        fontSize: '58px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: successFlash,
        scale: 1.18,
        alpha: 0.2,
        duration: 240,
      });

      this.time.delayedCall(260, () => {
        startLiftReveal();
      });
    };

    SimpleAudio.cast();

    this.tweens.add({
      targets: rod,
      angle: 18,
      x: 260,
      y: 300,
      duration: 260,
      yoyo: true,
    });

    this.tweens.add({
      targets: bobber,
      y: 600,
      duration: 320,
      ease: 'Sine.easeOut',
      onComplete: () => {
        statusText.setText('等待咬钩…');
        tipText.setText('先安静一会儿，等有东西靠近');
      }
    });

    this.tweens.add({
      targets: [ripple1, ripple2],
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 800,
      repeat: 1
    });

    this.tweens.add({
      targets: bobber,
      y: 606,
      duration: 760,
      yoyo: true,
      repeat: -1
    });

    this.time.delayedCall(850, () => {
      if (resolved) return;

      phase = 'approaching';
      tipText.setText(tierConfig.previewText);

      this.tweens.add({
        targets: fishShadow,
        x: 300,
        y: 650,
        duration: tierConfig.approachDuration,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (resolved) return;

          this.tweens.add({
            targets: fishShadow,
            x: 220,
            y: 690,
            duration: 700,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              if (resolved) return;
              statusText.setText('水下有动静…');
              tipText.setText('注意浮漂变化');
            }
          });
        }
      });
    });

    const biteDelay = Phaser.Math.Between(2200, 3000);

    this.time.delayedCall(biteDelay, () => {
      if (resolved) return;

      phase = 'bite';
      biteStartTime = this.time.now;

      statusText.setText(
        tier === 'large' ? '⚠️ 大鱼上钩，快拉！' : '⚠️ 咬钩了，快拉！'
      );
      tipText.setText(
        tier === 'large'
          ? '这条更难，别太急也别太慢'
          : tier === 'small'
          ? '小鱼好拉，抓准时机'
          : '稳住时机，现在拉最好'
      );

      setPullActive();
      SimpleAudio.bite();

      const warning = this.add.text(
        375,
        305,
        tier === 'large' ? '🐟‼️' : '‼️',
        {
          fontSize: tier === 'large' ? '74px' : '84px',
          color: '#FFFFFF',
        }
      ).setOrigin(0.5);

      this.tweens.add({
        targets: warning,
        scale: 1.3,
        alpha: 0.2,
        duration: 120,
        yoyo: true,
        repeat: 3,
        onComplete: () => warning.destroy(),
      });

      this.tweens.killTweensOf(fishShadow);
      this.tweens.add({
        targets: fishShadow,
        x: 375,
        y: 620,
        scale: 1.2 * tierConfig.shadowScale,
        duration: 320,
        ease: 'Power2',
      });

      this.tweens.killTweensOf(bobber);
      this.tweens.add({
        targets: bobber,
        y: 636,
        duration: tier === 'large' ? 90 : 110,
        yoyo: true,
        repeat: tier === 'large' ? 7 : 5
      });

      this.tweens.add({
        targets: rod,
        x: 220,
        duration: tier === 'large' ? 60 : 75,
        yoyo: true,
        repeat: tier === 'large' ? 7 : 5
      });

      this.time.delayedCall(tierConfig.biteTimeout, () => {
        if (!resolved && phase === 'bite') {
          statusText.setText('太晚了！');
          tipText.setText('鱼已经跑了');
          resolveFail('late');
        }
      });
    });

    pullBtn.on('pointerdown', () => {
      SimpleAudio.click();

      if (resolved) return;

      if (phase === 'waiting' || phase === 'approaching') {
        statusText.setText('拉早了！');
        tipText.setText('鱼还没咬稳，你先把它惊跑了');
        resolveFail('early');
        return;
      }

      if (phase === 'bite') {
        const delta = this.time.now - biteStartTime;

        if (delta >= tierConfig.successMin && delta <= tierConfig.successMax) {
          statusText.setText('拉中了！');
          tipText.setText(
            tier === 'large' ? '漂亮，大货没跑' : '漂亮，这一杆有货'
          );
          resolveSuccess();
          return;
        }

        if (delta < tierConfig.successMin) {
          statusText.setText('太急了！');
          tipText.setText('还没咬稳就拉了');
          resolveFail('too_early');
          return;
        }

        statusText.setText('拉晚了！');
        tipText.setText('鱼已经跑了');
        resolveFail('late');
      }
    });

    setPullIdle();
  }
}
