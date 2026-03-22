import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { RecordManager } from './RecordManager';
import { CoinManager } from './CoinManager';
import { SaveSync } from './SaveSync';
import { AnalyticsManager } from './AnalyticsManager';
import { ShareManager } from './ShareManager';
import { SimpleAudio } from './SimpleAudio';
import { VisualMap } from './VisualMap';
import type { DropItem } from './DropGenerator';

type ResultData = {
  success: boolean;
  drop?: DropItem;
  round?: number;
  newbie?: boolean;
  rewarded?: boolean;
  failReason?: 'early' | 'too_early' | 'late';
};

export class ResultScene extends Phaser.Scene {
  private shareRewardClaimed = false;

  constructor() {
    super('ResultScene');
  }

  private showToast(message: string) {
    const bg = this.add.rectangle(375, 1120, 470, 68, 0x000000, 0.58)
      .setStrokeStyle(2, 0xffffff, 0.14);
    const text = this.add.text(375, 1120, message, {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0, [bg, text]);

    this.tweens.add({
      targets: container,
      alpha: 0,
      y: -16,
      delay: 900,
      duration: 260,
      onComplete: () => container.destroy(),
    });
  }

  private getShareText(drop?: DropItem, round?: number) {
    if (!drop) return '这游戏有点离谱…';

    if (drop.type === 'legend') {
      if (drop.name === '金条') return `第${round}杆直接钓到金条！`;
      if (drop.name === '神秘宝箱') return `第${round}杆开出神秘宝箱！`;
      if (drop.name === '黄金锦鲤') return `第${round}杆钓到黄金锦鲤！`;
      return `第${round}杆出了神物！`;
    }

    if (drop.type === 'trash') {
      if (drop.name === '内裤') return '我刚刚钓到内裤？？？';
      if (drop.name === '破袜子') return '我刚刚钓到一只破袜子？？？';
      if (drop.name === 'iPhone') return '我从水里钓出一台 iPhone…';
      if (drop.name === '盲盒') return '这盲盒居然是从水里捞出来的';
      if (drop.name === '螃蟹') return '我刚刚钓到了螃蟹？？？';
      if (drop.name === '比基尼') return '我刚刚钓到了比基尼？？？';
      return `我刚刚钓到了${drop.name}？？？`;
    }

    return `第${round}杆有收获，手气还不错`;
  }

  private getPosterSubline(drop?: DropItem) {
    if (!drop) return '你也来试试这一杆会是什么';
    if (drop.type === 'legend') return '我直接欧皇了？？？';
    if (drop.type === 'trash') return '这图我必须发群了';
    return '这杆不亏，下一杆可能更大';
  }

  private getChallengeLine(drop?: DropItem) {
    if (!drop) return '你也来试试';
    if (drop.type === 'legend') return '你能比我更欧吗？';
    if (drop.type === 'trash') return '你敢比我更离谱吗？';
    return '你下一杆会是什么？';
  }

  private getFailTitle(reason?: 'early' | 'too_early' | 'late') {
    if (reason === 'early') return '拉早了！';
    if (reason === 'too_early') return '太急了！';
    return '拉晚了！';
  }

  private getFailDesc(reason?: 'early' | 'too_early' | 'late') {
    if (reason === 'early') return '鱼还没咬钩，你先把它吓跑了';
    if (reason === 'too_early') return '鱼刚有动静，还没咬稳就拉了';
    return '你出手太慢，鱼已经挣脱了';
  }

  private getRarityText(drop?: DropItem) {
    if (!drop) return '普通';
    if (drop.type === 'legend') return 'SSR 神物';
    if (drop.type === 'trash') {
      if (['iPhone', '盲盒', '螃蟹', '乌龟'].includes(drop.name)) {
        return 'SR 离谱物';
      }
      return 'R 怪东西';
    }
    return 'N 鱼获';
  }

  private getPosterStyle(drop?: DropItem) {
    if (!drop) {
      return { bgTop: 0x4facfe, bgBottom: 0x00c6ff, accent: 0xeafcff, tagBg: 0x1f6fb2 };
    }

    if (drop.type === 'legend') {
      return { bgTop: 0xf7d774, bgBottom: 0xf2a48f, accent: 0xffefb0, tagBg: 0xb9770e };
    }

    if (drop.type === 'trash') {
      if (['iPhone', '盲盒', '螃蟹', '乌龟'].includes(drop.name)) {
        return { bgTop: 0x667eea, bgBottom: 0x764ba2, accent: 0xf0e6ff, tagBg: 0x4b3f8f };
      }
      return { bgTop: 0x36d1dc, bgBottom: 0x5b86e5, accent: 0xeafcff, tagBg: 0x2266aa };
    }

    return { bgTop: 0x43e97b, bgBottom: 0x38f9d7, accent: 0xeefff7, tagBg: 0x1f9d74 };
  }

  private getShareRewardKey(round: number, drop?: DropItem) {
    return `fishing_share_reward_${round}_${drop?.name ?? 'none'}`;
  }

  create(data: ResultData) {
    const success = data.success;
    const drop = data.drop;
    const round = data.round ?? 0;
    const rewarded = data.rewarded ?? false;
    const failReason = data.failReason;

    this.cameras.main.setBackgroundColor(success ? '#8FD3FF' : '#34495E');
    this.add.rectangle(375, 667, 750, 1334, success ? 0x8fd3ff : 0x34495e);

    if (!success) {
      const hasEnergy = EnergyManager.instance.hasEnergy();

      this.add.rectangle(375, 510, 660, 650, 0x000000, 0.12)
        .setStrokeStyle(2, 0xffffff, 0.14);

      this.add.text(375, 180, this.getFailTitle(failReason), {
        fontSize: '56px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(375, 268, this.getFailDesc(failReason), {
        fontSize: '28px',
        color: '#FFFFFF',
        wordWrap: { width: 600 },
        align: 'center',
      }).setOrigin(0.5);

      this.add.text(375, 336, `第 ${round} 次钓鱼失手`, {
        fontSize: '24px',
        color: '#DFF9FB',
      }).setOrigin(0.5);

      this.add.text(375, 392, '别急，再来一杆更容易中', {
        fontSize: '24px',
        color: '#FFF3B0',
      }).setOrigin(0.5);

      if (hasEnergy) {
        const retry = this.add.rectangle(375, 575, 430, 98, 0xff6b6b)
          .setInteractive({ useHandCursor: true })
          .setStrokeStyle(4, 0xffffff, 0.16);

        this.add.text(375, 575, '再来一次', {
          fontSize: '34px',
          color: '#FFFFFF',
          fontStyle: 'bold',
        }).setOrigin(0.5);

        retry.on('pointerdown', () => {
          SimpleAudio.click();
          EnergyManager.instance.costEnergy();
          SaveSync.save();
          this.scene.start('FishingScene');
        });
      } else {
        const revive = this.add.rectangle(375, 575, 430, 98, 0x9b59b6)
          .setInteractive({ useHandCursor: true })
          .setStrokeStyle(4, 0xffffff, 0.16);

        this.add.text(375, 575, '再来一次 🎬', {
          fontSize: '32px',
          color: '#FFFFFF',
          fontStyle: 'bold',
        }).setOrigin(0.5);

        revive.on('pointerdown', () => {
          SimpleAudio.click();
          AnalyticsManager.instance.onAdView('revive');
          SaveSync.save();
          this.scene.start('FishingScene');
        });

        const recover = this.add.rectangle(375, 710, 430, 98, 0xf39c12)
          .setInteractive({ useHandCursor: true })
          .setStrokeStyle(4, 0xffffff, 0.16);

        this.add.text(375, 710, '恢复体力 🎬', {
          fontSize: '32px',
          color: '#FFFFFF',
          fontStyle: 'bold',
        }).setOrigin(0.5);

        recover.on('pointerdown', () => {
          SimpleAudio.click();
          AnalyticsManager.instance.onAdView('recover_energy');
          EnergyManager.instance.addEnergy(3);
          SaveSync.save();
          this.scene.start('MainScene');
        });
      }

      const back = this.add.rectangle(375, 930, 280, 78, 0x34495e)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0xffffff, 0.14);

      this.add.text(375, 930, '返回首页', {
        fontSize: '28px',
        color: '#FFFFFF',
      }).setOrigin(0.5);

      back.on('pointerdown', () => {
        SimpleAudio.click();
        this.scene.start('MainScene');
      });

      return;
    }

    RecordManager.instance.update(drop);

    if (!rewarded && drop) {
      CoinManager.instance.addCoins(drop.reward);
      SaveSync.save();
    }

    const shareText = this.getShareText(drop, round);
    const posterSubline = this.getPosterSubline(drop);
    const challengeLine = this.getChallengeLine(drop);
    const emoji = VisualMap.getEmoji(drop?.name || '');
    const rarity = this.getRarityText(drop);
    const style = this.getPosterStyle(drop);

    // 海报区域：只服务于截图传播
    const posterX = 375;
    const posterY = 325;
    const posterW = 640;
    const posterH = 700;

    this.add.rectangle(posterX, posterY, posterW, posterH, style.bgBottom, 0.99)
      .setStrokeStyle(3, 0xffffff, 0.16);

    this.add.rectangle(posterX, posterY - 235, posterW, 210, style.bgTop, 0.88);

    this.add.circle(posterX, posterY - 20, 185, 0xffffff, 0.06);
    this.add.circle(posterX, posterY + 45, 145, 0xffffff, 0.05);

    this.add.rectangle(posterX, 88, 220, 50, style.tagBg, 0.92)
      .setStrokeStyle(2, 0xffffff, 0.18);

    this.add.text(posterX, 88, rarity, {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(posterX, 155, shareText, {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      wordWrap: { width: 540 },
      align: 'center',
    }).setOrigin(0.5);

    if (drop?.type === 'legend') {
      this.add.text(posterX, 210, '💥 欧皇暴击', {
        fontSize: '28px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#9c640c',
        strokeThickness: 2,
      }).setOrigin(0.5);
    } else if (drop?.type === 'trash') {
      this.add.text(posterX, 210, '🤣 离谱到离谱', {
        fontSize: '28px',
        color: '#FFF3B0',
        fontStyle: 'bold',
        stroke: '#3b4cca',
        strokeThickness: 2,
      }).setOrigin(0.5);
    }

    const glow = this.add.circle(posterX, 335, 155, style.accent, drop?.type === 'legend' ? 0.18 : 0.10);

    const icon = this.add.text(
      posterX - (drop?.type === 'legend' ? 38 : 0),
      320,
      emoji,
      {
        fontSize: drop?.type === 'legend' ? '230px' : '210px',
      }
    ).setOrigin(0.5);

    icon.setScale(0.2);

    this.tweens.add({
      targets: [icon, glow],
      scale: drop?.type === 'legend' ? 1.2 : 1.08,
      duration: 220,
      ease: 'Back.easeOut',
    });

    if (drop?.type === 'legend') {
      const shine1 = this.add.text(posterX + 48, 292, '✨', {
        fontSize: '52px',
      }).setOrigin(0.5).setAlpha(0.96);

      const shine2 = this.add.text(posterX + 98, 330, '✨', {
        fontSize: '78px',
      }).setOrigin(0.5).setAlpha(0.92);

      const shine3 = this.add.text(posterX + 18, 350, '✨', {
        fontSize: '42px',
      }).setOrigin(0.5).setAlpha(0.90);

      this.tweens.add({
        targets: [shine1, shine2, shine3],
        alpha: 0.45,
        scale: 1.08,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    this.add.text(posterX, 500, drop?.name || '', {
      fontSize: '50px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      wordWrap: { width: 540 },
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(posterX, 565, drop?.flavor || '今天手气不错', {
      fontSize: '28px',
      color: '#F4FBFF',
      wordWrap: { width: 540 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0.96);

    this.add.text(posterX, 630, posterSubline, {
      fontSize: '24px',
      color: '#FFF3B0',
      fontStyle: 'bold',
      wordWrap: { width: 540 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0.97);

    this.add.text(posterX, 680, challengeLine, {
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.94);

    // 海报外：只保留功能区
    const doubleBtn = this.add.rectangle(375, 840, 470, 98, 0xf39c12)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.16);

    this.add.text(345, 840, rewarded ? '已领取翻倍奖励' : '奖励翻倍', {
      fontSize: rewarded ? '28px' : '34px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(520, 840, '🎬', {
      fontSize: '34px',
    }).setOrigin(0.5);

    if (!rewarded && drop) {
      doubleBtn.on('pointerdown', () => {
        SimpleAudio.click();
        AnalyticsManager.instance.onAdView('double_reward');
        CoinManager.instance.addCoins(drop.reward);
        SaveSync.save();

        this.scene.start('ResultScene', {
          success: true,
          round,
          rewarded: true,
          drop: {
            ...drop,
            reward: drop.reward * 2,
          },
        });
      });
    }

    const shareRewardKey = this.getShareRewardKey(round, drop);
    this.shareRewardClaimed = localStorage.getItem(shareRewardKey) === '1';

    const shareBtn = this.add.rectangle(375, 955, 470, 110, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.16);

    this.add.text(330, 939, this.shareRewardClaimed ? '已领取分享奖励' : '分享战绩', {
      fontSize: this.shareRewardClaimed ? '28px' : '36px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(516, 939, '🎁', {
      fontSize: '34px',
    }).setOrigin(0.5);

    this.add.text(375, 977, this.shareRewardClaimed ? '本次结果已领过奖励' : '首次分享直接送 50 金币', {
      fontSize: '22px',
      color: '#F4FBFF',
      alpha: 0.94,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    shareBtn.on('pointerdown', () => {
      SimpleAudio.click();
      AnalyticsManager.instance.onAdView('share');

      const x = posterX - posterW / 2;
      const y = posterY - posterH / 2;
      const w = posterW;
      const h = posterH;

      this.time.delayedCall(50, () => {
        ShareManager.saveResultPoster(this, x, y, w, h);
      });

      if (!this.shareRewardClaimed) {
        CoinManager.instance.addCoins(50);
        localStorage.setItem(shareRewardKey, '1');
        this.shareRewardClaimed = true;
        SaveSync.save();
        this.showToast('首次分享奖励 +50 金币');
        this.scene.restart({
          ...data,
          success: true,
          drop,
          round,
          rewarded,
        });
      } else {
        this.showToast('本次结果的分享奖励已领取');
      }
    });

    const backBtn = this.add.rectangle(375, 1088, 300, 82, 0x34495e)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff, 0.14);

    this.add.text(375, 1088, '返回首页', {
      fontSize: '30px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      SimpleAudio.click();
      this.scene.start('MainScene');
    });
  }
}
