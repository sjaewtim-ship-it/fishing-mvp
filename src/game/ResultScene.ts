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
  constructor() {
    super('ResultScene');
  }

  private getShareText(drop?: DropItem, round?: number) {
    if (!drop) return '这游戏有点离谱…';

    if (drop.type === 'legend') {
      if (drop.name === '金条') return `第${round}次直接钓到金条！！`;
      if (drop.name === '神秘宝箱') return `第${round}次开出神秘宝箱！`;
      if (drop.name === '黄金锦鲤') return `第${round}次直接出金鱼王！`;
      return `第${round}次出了神物，欧皇附体！`;
    }

    if (drop.type === 'trash') {
      if (drop.name === '内裤') return '我居然钓到了内裤？？？';
      if (drop.name === '比基尼') return '这也太离谱了吧？！';
      if (drop.name === 'iPhone') return '我从水里钓出一台 iPhone…';
      if (drop.name === '龙虾') return '今天这一杆真不亏';
      if (drop.name === '盲盒') return '这盲盒里到底能开出什么？';
      return `我居然钓到了${drop.name}？？？`;
    }

    return `第${round}次，今天手气还行！`;
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
      if (['iPhone', '比基尼', '盲盒', '龙虾', '乌龟'].includes(drop.name)) {
        return 'SR 离谱物';
      }
      return 'R 怪东西';
    }
    return 'N 鱼获';
  }

  private getPosterStyle(drop?: DropItem) {
    if (!drop) return { bgTop: 0x4facfe, bgBottom: 0x00c6ff, accent: 0xeafcff, tagBg: 0x1f6fb2 };
    if (drop.type === 'legend') return { bgTop: 0xf6d365, bgBottom: 0xfda085, accent: 0xfff3b0, tagBg: 0xb9770e };

    if (drop.type === 'trash') {
      if (['iPhone', '比基尼', '盲盒', '龙虾', '乌龟'].includes(drop.name)) {
        return { bgTop: 0x667eea, bgBottom: 0x764ba2, accent: 0xf0e6ff, tagBg: 0x4b3f8f };
      }
      return { bgTop: 0x36d1dc, bgBottom: 0x5b86e5, accent: 0xeafcff, tagBg: 0x2266aa };
    }

    return { bgTop: 0x43e97b, bgBottom: 0x38f9d7, accent: 0xeefff7, tagBg: 0x1f9d74 };
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
      this.add.rectangle(375, 510, 660, 650, 0x000000, 0.12)
        .setStrokeStyle(2, 0xffffff, 0.14);

      this.add.text(375, 180, this.getFailTitle(failReason), {
        fontSize: '58px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(375, 270, this.getFailDesc(failReason), {
        fontSize: '30px',
        color: '#FFFFFF',
        wordWrap: { width: 620 },
        align: 'center',
      }).setOrigin(0.5);

      this.add.text(375, 340, `第 ${round} 次钓鱼失手`, {
        fontSize: '26px',
        color: '#DFF9FB',
      }).setOrigin(0.5);

      this.add.text(375, 398, '别急，再来一杆更容易中', {
        fontSize: '26px',
        color: '#FFF3B0',
      }).setOrigin(0.5);

      const retry = this.add.rectangle(375, 560, 430, 98, 0xff6b6b)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(4, 0xffffff, 0.16);

      this.add.text(375, 560, '再试一次', {
        fontSize: '34px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      retry.on('pointerdown', () => {
        SimpleAudio.click();
        this.scene.start('FishingScene');
      });

      const revive = this.add.rectangle(375, 690, 430, 98, 0x9b59b6)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(4, 0xffffff, 0.16);

      this.add.text(375, 690, '看广告再来一次', {
        fontSize: '30px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      revive.on('pointerdown', () => {
        SimpleAudio.click();
        AnalyticsManager.instance.onAdView('revive');
        SaveSync.save();
        this.scene.start('FishingScene');
      });

      const recover = this.add.rectangle(375, 820, 430, 98, 0xf39c12)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(4, 0xffffff, 0.16);

      this.add.text(375, 820, '看广告恢复体力', {
        fontSize: '30px',
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

      const back = this.add.rectangle(375, 950, 280, 78, 0x34495e)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0xffffff, 0.14);

      this.add.text(375, 950, '返回首页', {
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
    const emoji = VisualMap.getEmoji(drop?.name || '');
    const rarity = this.getRarityText(drop);
    const style = this.getPosterStyle(drop);

    const posterX = 375;
    const posterY = 350;
    const posterW = 620;
    const posterH = 650;

    this.add.rectangle(posterX, posterY, posterW, posterH, style.bgBottom, 0.98)
      .setStrokeStyle(3, 0xffffff, 0.16);

    this.add.rectangle(posterX, posterY - 185, posterW, 210, style.bgTop, 0.82);
    this.add.circle(posterX, posterY - 10, 185, 0xffffff, 0.07);
    this.add.circle(posterX, posterY + 10, 130, 0xffffff, 0.06);

    this.add.rectangle(posterX, 88, 190, 46, style.tagBg, 0.88)
      .setStrokeStyle(2, 0xffffff, 0.18);

    this.add.text(posterX, 88, rarity, {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(posterX, 148, shareText, {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      wordWrap: { width: 500 },
      align: 'center',
    }).setOrigin(0.5);

    const glow = this.add.circle(posterX, 315, 135, style.accent, drop?.type === 'legend' ? 0.17 : 0.10);

    const icon = this.add.text(posterX, 305, emoji, {
      fontSize: '190px',
    }).setOrigin(0.5);

    icon.setScale(0.2);

    this.tweens.add({
      targets: [icon, glow],
      scale: drop?.type === 'legend' ? 1.18 : 1.06,
      duration: 220,
      ease: 'Back.easeOut',
    });

    if (drop?.type === 'legend') {
      this.tweens.add({
        targets: [icon, glow],
        scale: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    this.add.text(posterX, 455, drop?.name || '', {
      fontSize: '50px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(posterX, 520, drop?.flavor || '今天手气不错', {
      fontSize: '26px',
      color: '#F4FBFF',
      wordWrap: { width: 500 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0.95);

    this.add.text(posterX, 625, '🎣 钓鱼小游戏', {
      fontSize: '24px',
      color: '#F4FBFF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.92);

    const doubleBtn = this.add.rectangle(375, 770, 430, 98, 0xf39c12)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.16);

    this.add.text(375, 770, rewarded ? '已领取奖励' : '看广告奖励翻倍', {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
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

    const shareBtn = this.add.rectangle(375, 895, 430, 98, 0x9b59b6)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(4, 0xffffff, 0.16);

    this.add.text(375, 895, '分享战绩', {
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    shareBtn.on('pointerdown', () => {
      SimpleAudio.click();
      AnalyticsManager.instance.onAdView('share');
      SaveSync.save();

      const x = posterX - posterW / 2;
      const y = posterY - posterH / 2;
      const w = posterW;
      const h = posterH;

      this.time.delayedCall(50, () => {
        ShareManager.saveResultPoster(this, x, y, w, h);
      });
    });

    const backBtn = this.add.rectangle(375, 1015, 280, 78, 0x34495e)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffffff, 0.14);

    this.add.text(375, 1015, '返回首页', {
      fontSize: '28px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      SimpleAudio.click();
      this.scene.start('MainScene');
    });
  }
}
