import { RoundManager } from './RoundManager';

export type DirectorBucket = 'safe_fish' | 'fun_mix' | 'good_shot' | 'normal_mix' | 'free_random';

export class DirectorSystem {
  static getBucket(): DirectorBucket {
    const round = RoundManager.instance.getRoundCount() + 1;

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
