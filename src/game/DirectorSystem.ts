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
};

export type VisualType = 'big' | 'normal' | 'small' | 'weird';

export class DirectorSystem {
  private static round = 0;
  private static failStreak = 0;
  private static successStreak = 0;
  private static combo = 0;

  static getRoundNumber(): number {
    return this.round + 1;
  }

  static nextRound() {
    this.round += 1;
  }

  static recordSuccess() {
    this.successStreak += 1;
    this.failStreak = 0;
    this.combo += 1;
  }

  static recordFail() {
    this.failStreak += 1;
    this.successStreak = 0;
    this.combo = 0;
  }

  static getCombo(): number {
    return this.combo;
  }

  static hasComboBonus(): boolean {
    return this.combo >= 2;
  }

  static getComboLabel(): string {
    if (this.combo >= 5) return `🔥 ${this.combo}连击，手气爆了`;
    if (this.combo >= 3) return `⚡ ${this.combo}连击，状态火热`;
    if (this.combo >= 2) return `✨ ${this.combo}连击，继续上头`;
    return '';
  }

  static getComboSharePrefix(): string {
    if (this.combo >= 5) return `🔥 ${this.combo}连击暴击`;
    if (this.combo >= 3) return `⚡ ${this.combo}连击上头中`;
    if (this.combo >= 2) return `✨ ${this.combo}连击进行中`;
    return '';
  }

  static getComboEmotionLine(): string {
    if (this.combo >= 5) return '这波真的有点挡不住了';
    if (this.combo >= 3) return '状态起来了，越钓越上头';
    if (this.combo >= 2) return '连着中，手感已经热起来了';
    return '';
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

    if (this.combo >= 3) return '连击状态中，这一杆更容易出节目效果';
    if (this.failStreak >= 2) return '这一杆可能会翻盘，盯紧浮漂';
    if (this.successStreak >= 2) return '手气起来了，下一杆可能更刺激';

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

  static getTimingAssist(): TimingAssistConfig {
    const bucket = this.getBucket();

    if (this.failStreak >= 2) {
      return {
        perfectWindowMs: 980,
        goodWindowMs: 1450,
        earlyToleranceMs: 380,
        lateToleranceMs: 420,
        biteDelayMs: 1500,
        fakeBiteChance: 0.01,
      };
    }

    if (this.combo >= 3) {
      return {
        perfectWindowMs: 900,
        goodWindowMs: 1320,
        earlyToleranceMs: 340,
        lateToleranceMs: 340,
        biteDelayMs: 1500,
        fakeBiteChance: 0.02,
      };
    }

    switch (bucket) {
      case 'safe_fish':
        return {
          perfectWindowMs: 950,
          goodWindowMs: 1400,
          earlyToleranceMs: 420,
          lateToleranceMs: 420,
          biteDelayMs: 1650,
          fakeBiteChance: 0.02,
        };
      case 'fun_mix':
        return {
          perfectWindowMs: 820,
          goodWindowMs: 1250,
          earlyToleranceMs: 340,
          lateToleranceMs: 360,
          biteDelayMs: 1800,
          fakeBiteChance: 0.05,
        };
      case 'good_shot':
        return {
          perfectWindowMs: 980,
          goodWindowMs: 1450,
          earlyToleranceMs: 420,
          lateToleranceMs: 420,
          biteDelayMs: 1600,
          fakeBiteChance: 0.01,
        };
      case 'normal_mix':
        return {
          perfectWindowMs: 700,
          goodWindowMs: 1080,
          earlyToleranceMs: 280,
          lateToleranceMs: 300,
          biteDelayMs: 1950,
          fakeBiteChance: 0.08,
        };
      case 'free_random':
      default:
        return {
          perfectWindowMs: 620,
          goodWindowMs: 980,
          earlyToleranceMs: 240,
          lateToleranceMs: 260,
          biteDelayMs: 2050,
          fakeBiteChance: 0.10,
        };
    }
  }

  static getShadowScaleRange(): { min: number; max: number } {
    const bucket = this.getBucket();

    if (this.combo >= 3) {
      return { min: 0.95, max: 1.48 };
    }

    switch (bucket) {
      case 'safe_fish':
        return { min: 0.9, max: 1.08 };
      case 'fun_mix':
        return { min: 0.85, max: 1.2 };
      case 'good_shot':
        return { min: 1.0, max: 1.35 };
      case 'normal_mix':
        return { min: 0.82, max: 1.32 };
      case 'free_random':
      default:
        return { min: 0.78, max: 1.42 };
    }
  }

  static shouldForceInterestingOutcome(): boolean {
    const bucket = this.getBucket();

    if (this.combo >= 3) return Math.random() < 0.72;
    if (this.failStreak >= 2) return true;
    if (bucket === 'fun_mix') return Math.random() < 0.55;
    if (bucket === 'good_shot') return Math.random() < 0.75;
    return false;
  }

  static shouldSoftProtectSuccess(): boolean {
    const bucket = this.getBucket();
    return bucket === 'safe_fish' || bucket === 'good_shot' || this.failStreak >= 2;
  }

  static decideDropKind(): 'normal' | 'trash' | 'legend' | 'interesting' {
    const bucket = this.getBucket();

    if (this.combo >= 4) {
      const r = Math.random();
      if (r < 0.22) return 'legend';
      if (r < 0.68) return 'interesting';
      if (r < 0.9) return 'trash';
      return 'normal';
    }

    if (this.failStreak >= 2) {
      return Math.random() < 0.72 ? 'interesting' : 'legend';
    }

    if (bucket === 'safe_fish') return 'normal';

    if (bucket === 'fun_mix') {
      const r = Math.random();
      if (r < 0.45) return 'trash';
      if (r < 0.55) return 'legend';
      return 'normal';
    }

    if (bucket === 'good_shot') {
      const r = Math.random();
      if (r < 0.35) return 'legend';
      if (r < 0.7) return 'interesting';
      return 'normal';
    }

    const r = Math.random();
    if (r < 0.08) return 'legend';
    if (r < 0.32) return 'trash';
    if (r < 0.45) return 'interesting';
    return 'normal';
  }

  static decideVisualType(realType: 'fish' | 'trash' | 'legend'): VisualType {
    const r = Math.random();

    if (this.combo >= 3) {
      if (realType === 'legend') return 'big';
      if (realType === 'trash') return r < 0.4 ? 'big' : 'weird';
      return r < 0.3 ? 'small' : 'normal';
    }

    if (r < 0.3) {
      if (realType === 'legend') return 'small';
      if (realType === 'trash') return 'big';
      if (realType === 'fish') return 'weird';
    }

    if (realType === 'legend') return 'big';
    if (realType === 'trash') return 'weird';
    return 'normal';
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
