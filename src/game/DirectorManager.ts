// ===== 兼容保留文件：非当前主玩法状态源 =====
// 当前主玩法节奏以 DirectorSystem 为准，本文件仅保留给旧存档兼容层使用。
import type { DropItem } from './DropGenerator';

export class DirectorManager {
  private static _instance: DirectorManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new DirectorManager();
    }
    return this._instance;
  }

  private continuousFishCount: number = 0;
  private continuousNonLegendCount: number = 0;
  private recentLegendCooldown: number = 0;

  onDropResult(drop: DropItem) {
    if (drop.type === 'fish') {
      this.continuousFishCount += 1;
    } else {
      this.continuousFishCount = 0;
    }

    if (drop.type === 'legend') {
      this.continuousNonLegendCount = 0;
      this.recentLegendCooldown = 2;
    } else {
      this.continuousNonLegendCount += 1;
      if (this.recentLegendCooldown > 0) {
        this.recentLegendCooldown -= 1;
      }
    }
  }

  getAdjustedCategory(): 'fish' | 'trash' | 'viralTrash' | 'legend' {
    let fishWeight = 50;
    let trashWeight = 25;
    let viralWeight = 18;
    let legendWeight = 7;

    // 连续普通鱼太多，抬高离谱物
    if (this.continuousFishCount >= 3) {
      fishWeight -= 15;
      trashWeight += 8;
      viralWeight += 7;
    }

    // 很久没出神物，小幅提升神物
    if (this.continuousNonLegendCount >= 4) {
      legendWeight += 5;
      fishWeight -= 2;
      trashWeight -= 1;
      viralWeight -= 2;
    }

    // 刚出过神物，短期压低神物
    if (this.recentLegendCooldown > 0) {
      legendWeight = Math.max(2, legendWeight - 4);
      fishWeight += 2;
      trashWeight += 1;
      viralWeight += 1;
    }

    const total = fishWeight + trashWeight + viralWeight + legendWeight;
    let rand = Math.random() * total;

    if (rand < fishWeight) return 'fish';
    rand -= fishWeight;

    if (rand < trashWeight) return 'trash';
    rand -= trashWeight;

    if (rand < viralWeight) return 'viralTrash';
    return 'legend';
  }

  getDebugInfo() {
    return {
      continuousFishCount: this.continuousFishCount,
      continuousNonLegendCount: this.continuousNonLegendCount,
      recentLegendCooldown: this.recentLegendCooldown,
    };
  }

  setData(data: {
    continuousFishCount?: number;
    continuousNonLegendCount?: number;
    recentLegendCooldown?: number;
  }) {
    this.continuousFishCount = data.continuousFishCount ?? 0;
    this.continuousNonLegendCount = data.continuousNonLegendCount ?? 0;
    this.recentLegendCooldown = data.recentLegendCooldown ?? 0;
  }

  reset() {
    this.continuousFishCount = 0;
    this.continuousNonLegendCount = 0;
    this.recentLegendCooldown = 0;
  }
}
