import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { RecordManager } from './RecordManager';
import { CoinManager } from './CoinManager';
import { SaveSync } from './SaveSync';
import { AnalyticsManager } from './AnalyticsManager';
import { ShareManager } from './ShareManager';
import type { DropItem } from './DropGenerator';

type ResultData = {
  success: boolean;
  drop?: DropItem;
  round?: number;
  newbie?: boolean;
  rewarded?: boolean;
};

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  private getShareText(drop?: DropItem, round?: number) {
    if (!drop) return '这游戏有点离谱…';

    if (drop.type === 'legend') {
      return `第${round}次直接出金！欧皇附体！`;
    }

    if (drop.type === 'trash') {
      return `我居然钓到了${drop.name}？？？`;
    }

    return `第${round}次，手气还行！`;
  }

  create(data: ResultData) {
    const success = data.success;
    const drop = data.drop;
    const round = data.round ?? 0;
    const rewarded = data.rewarded ?? false;

    this.cameras.main.setBackgroundColor(success ? '#2ecc71' : '#34495e');

    if (!success) {
      this.add.text(375, 300, '💥 鱼跑了！', {
        fontSize: '58px',
        color: '#ffffff',
      }).setOrigin(0.5);

      const retry = this.add.rectangle(375, 650, 360, 100, 0x9b59b6)
        .setInteractive({ useHandCursor: true });

      this.add.text(375, 650, '再试一次', {
        fontSize: '30px',
        color: '#ffffff',
      }).setOrigin(0.5);

      retry.on('pointerdown', () => {
        this.scene.start('FishingScene');
      });

      return;
    }

    RecordManager.instance.update(drop);

    if (!rewarded && drop) {
      CoinManager.instance.addCoins(drop.reward);
      SaveSync.save();
    }

    const shareText = this.getShareText(drop, round);

    // ⭐ 标题
    this.add.text(375, 120, shareText, {
      fontSize: '34px',
      color: '#ffffff',
      wordWrap: { width: 650 },
      align: 'center',
    }).setOrigin(0.5);

    // ⭐ 掉落
    const dropText = this.add.text(375, 300, drop?.name ?? '', {
      fontSize: '64px',
      color: '#ffffff',
    }).setOrigin(0.5);

    if (drop?.type === 'legend') {
      this.tweens.add({
        targets: dropText,
        scale: 1.2,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }

    // ⭐ 信息区
    this.add.text(375, 420, `第 ${round} 次钓鱼`, {
      fontSize: '26px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(375, 460, `+${drop?.reward ?? 0} 金币`, {
      fontSize: '36px',
      color: '#fff6a9',
    }).setOrigin(0.5);

    this.add.text(375, 510, `当前金币：${CoinManager.instance.getCoins()}`, {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // ⭐ 底部品牌
    this.add.text(375, 580, '🎣 钓鱼小游戏', {
      fontSize: '22px',
      color: '#dff9fb',
    }).setOrigin(0.5);

    // ⭐ 分享按钮
    const shareBtn = this.add.rectangle(375, 720, 360, 90, 0x3498db)
      .setInteractive({ useHandCursor: true });

    this.add.text(375, 720, '保存战绩截图', {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    shareBtn.on('pointerdown', () => {
      AnalyticsManager.instance.onAdView('share');
      SaveSync.save();

      // ⚠️ 延迟一帧截图（避免黑图/未渲染）
      this.time.delayedCall(50, () => {
        ShareManager.saveFromScene(this);
      });
    });

    // ⭐ 返回
    const backBtn = this.add.rectangle(375, 860, 260, 80, 0xe74c3c)
      .setInteractive({ useHandCursor: true });

    this.add.text(375, 860, '返回', {
      fontSize: '26px',
      color: '#ffffff',
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      this.scene.start('MainScene');
    });
  }
}
