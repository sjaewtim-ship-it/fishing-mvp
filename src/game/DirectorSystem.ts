import { RoundManager } from './RoundManager';

export type DirectorBucket =
  | 'safe_fish'
  | 'fun_mix'
  | 'good_shot'
  | 'normal_mix'
  | 'free_random';

export type TimingAssistConfig = {
  perfectWindowMs: number;
  goodWindowMs: number;
  earlyToleranceMs: number;
  lateToleranceMs: number;
  biteDelayMs: number;
  fakeBiteChance: number;
  failBias: 'low' | 'medium' | 'normal';
};

export type DropBiasConfig = {
  fishWeight: number;
  lightTrashWeight: number;
  strongTrashWeight: number;
  legendWeight: number;
};

export class DirectorSystem {
  static getRoundNumber(): number {
    return RoundManager.instance.getRoundCount() + 1;
  }

  static getBucket(): DirectorBucket {
    const round = this.getRoundNumber();

    if (round === 1) return 'safe_fish';
    if (round === 2) return 'fun_mix';
    if (round === 3) return 'good_shot';
    if (round >= 4 && round <= 6) return 'normal_mix';
    return 'free_random';
  }

  static getRoundHint(): string {
    const bucket = this.getBucket();

    switch (bucket) {
      case 'safe_fish':
        return '第一杆，先让你稳稳出货';
      case 'fun_mix':
        return '第二杆，开始给你一点节目效果';
      case 'good_shot':
        return '第三杆，更容易出好货';
      case 'normal_mix':
        return '节奏开始正常，离谱和惊喜都会来';
      case 'free_random':
      default:
        return '进入自由随机池，拼运气的时候到了';
    }
  }

  // 1.1 新增：拉杆窗口导演
  static getTimingAssist(): TimingAssistConfig {
    const bucket = this.getBucket();

    switch (bucket) {
      case 'safe_fish':
        return {
          perfectWindowMs: 950,
          goodWindowMs: 1400,
          earlyToleranceMs: 420,
          lateToleranceMs: 420,
          biteDelayMs: 1700,
          fakeBiteChance: 0.02,
          failBias: 'low',
        };
      case 'fun_mix':
        return {
          perfectWindowMs: 820,
          goodWindowMs: 1250,
          earlyToleranceMs: 360,
          lateToleranceMs: 360,
          biteDelayMs: 1850,
          fakeBiteChance: 0.05,
          failBias: 'low',
        };
      case 'good_shot':
        return {
          perfectWindowMs: 980,
          goodWindowMs: 1450,
          earlyToleranceMs: 420,
          lateToleranceMs: 420,
          biteDelayMs: 1650,
          fakeBiteChance: 0.01,
          failBias: 'low',
        };
      case 'normal_mix':
        return {
          perfectWindowMs: 700,
          goodWindowMs: 1080,
          earlyToleranceMs: 300,
          lateToleranceMs: 300,
          biteDelayMs: 1950,
          fakeBiteChance: 0.08,
          failBias: 'medium',
        };
      case 'free_random':
      default:
        return {
          perfectWindowMs: 620,
          goodWindowMs: 980,
          earlyToleranceMs: 260,
          lateToleranceMs: 260,
          biteDelayMs: 2050,
          fakeBiteChance: 0.10,
          failBias: 'normal',
        };
    }
  }

  // 1.1 新增：掉落权重导演
  static getDropBias(): DropBiasConfig {
    const bucket = this.getBucket();

    switch (bucket) {
      case 'safe_fish':
        return {
          fishWeight: 78,
          lightTrashWeight: 14,
          strongTrashWeight: 7,
          legendWeight: 1,
        };
      case 'fun_mix':
        return {
          fishWeight: 52,
          lightTrashWeight: 24,
          strongTrashWeight: 20,
          legendWeight: 4,
        };
      case 'good_shot':
        return {
          fishWeight: 38,
          lightTrashWeight: 16,
          strongTrashWeight: 26,
          legendWeight: 20,
        };
      case 'normal_mix':
        return {
          fishWeight: 50,
          lightTrashWeight: 18,
          strongTrashWeight: 24,
          legendWeight: 8,
        };
      case 'free_random':
      default:
        return {
          fishWeight: 58,
          lightTrashWeight: 16,
          strongTrashWeight: 20,
          legendWeight: 6,
        };
    }
  }

  // 1.1 新增：成功率导演
  static shouldSoftProtectSuccess(): boolean {
    const bucket = this.getBucket();
    return bucket === 'safe_fish' || bucket === 'good_shot';
  }

  static shouldInjectNearMiss(): boolean {
    const bucket = this.getBucket();

    if (bucket === 'normal_mix') return Math.random() < 0.20;
    if (bucket === 'free_random') return Math.random() < 0.28;

    return false;
  }

  static shouldForceInterestingOutcome(): boolean {
    const bucket = this.getBucket();
    if (bucket === 'fun_mix') return Math.random() < 0.55;
    if (bucket === 'good_shot') return Math.random() < 0.75;
    return false;
  }

  static getShadowScaleRange(): { min: number; max: number } {
    const bucket = this.getBucket();

    switch (bucket) {
      case 'safe_fish':
        return { min: 0.9, max: 1.1 };
      case 'fun_mix':
        return { min: 0.9, max: 1.25 };
      case 'good_shot':
        return { min: 1.0, max: 1.45 };
      case 'normal_mix':
        return { min: 0.85, max: 1.35 };
      case 'free_random':
      default:
        return { min: 0.8, max: 1.5 };
    }
  }

  static pickWeighted<T>(items: Array<{ item: T; weight: number }>): T {
    const total = items.reduce((sum, entry) => sum + entry.weight, 0);
    let rand = Math.random() * total;

    for (const entry of items) {
      rand -= entry.weight;
      if (rand <= 0) return entry.item;
    }

    return items[items.length - 1].item;
  }
}
