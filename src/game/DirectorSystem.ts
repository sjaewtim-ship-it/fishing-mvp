export type DirectorBucket =
  | 'safe_fish'
  | 'fun_mix'
  | 'good_shot'
  | 'normal_mix'
  | 'free_random';

export type ComboTier = 'base' | 'warm' | 'hot' | 'streak' | 'jackpot';

export type DropBias = {
  normal: number;
  trash: number;
  interesting: number;
  legend: number;
};

export type TimingAssistConfig = {
  perfectWindowMs: number;
  goodWindowMs: number;
  earlyToleranceMs: number;
  lateToleranceMs: number;
  biteDelayMs: number;
  fakeBiteChance: number;
};

export type VisualType = 'big' | 'normal' | 'small' | 'weird';
export type DirectorSystemState = {
  round: number;
  failStreak: number;
  successStreak: number;
  combo: number;
  pityFail?: boolean; // 连击失败保护标记
};

export class DirectorSystem {
  private static round = 0;
  private static failStreak = 0;
  private static successStreak = 0;
  private static combo = 0;
  private static pityFail = false; // 连击失败后触发保护

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
    this.pityFail = false; // 成功后清除保护
  }

  static recordFail() {
    this.failStreak += 1;
    this.successStreak = 0;
    // 连击 >= 2 时失败，触发保护
    if (this.combo >= 2) {
      this.pityFail = true;
    }
    this.combo = 0;
  }

  static getCombo(): number {
    return this.combo;
  }

  static getState(): DirectorSystemState {
    return {
      round: this.round,
      failStreak: this.failStreak,
      successStreak: this.successStreak,
      combo: this.combo,
      pityFail: this.pityFail,
    };
  }

  static setState(state?: Partial<DirectorSystemState>) {
    this.round = Math.max(0, state?.round ?? 0);
    this.failStreak = Math.max(0, state?.failStreak ?? 0);
    this.successStreak = Math.max(0, state?.successStreak ?? 0);
    this.combo = Math.max(0, state?.combo ?? 0);
    this.pityFail = state?.pityFail ?? false;
  }

  static reset() {
    this.round = 0;
    this.failStreak = 0;
    this.successStreak = 0;
    this.combo = 0;
    this.pityFail = false;
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
    if (this.combo >= 8) return '有点不对劲了，要出大事';
    if (this.combo >= 6) return '这杆可能有大货';
    if (this.combo >= 4) return '下一杆容易出节目效果';
    if (this.combo >= 2) return '手感热起来了';
    return '';
  }

  /**
   * 获取当前连击段位
   */
  static getComboTier(): ComboTier {
    if (this.combo >= 8) return 'jackpot';
    if (this.combo >= 6) return 'streak';
    if (this.combo >= 4) return 'hot';
    if (this.combo >= 2) return 'warm';
    return 'base';
  }

  /**
   * 获取连击掉落概率偏移（基于段位）
   * 正值 = 概率提升，负值 = 概率降低
   * 连击更多提升 interesting/节目效果，legend 上升更克制
   */
  static getComboDropBias(): DropBias {
    const tier = this.getComboTier();
    
    switch (tier) {
      case 'warm':
        return { normal: -0.04, trash: 0.02, interesting: 0.02, legend: 0.00 };
      case 'hot':
        return { normal: -0.08, trash: 0.03, interesting: 0.04, legend: 0.01 };
      case 'streak':
        return { normal: -0.12, trash: 0.04, interesting: 0.05, legend: 0.02 };
      case 'jackpot':
        return { normal: -0.16, trash: 0.05, interesting: 0.07, legend: 0.04 };
      case 'base':
      default:
        return { normal: 0, trash: 0, interesting: 0, legend: 0 };
    }
  }

  /**
   * 带连击偏移的掉落类型抽取
   * @param baseWeights 基础权重
   * @returns 掉落类型
   */
  static rollDropKindWithBias(baseWeights: { normal: number; trash: number; interesting: number; legend: number }): 'normal' | 'trash' | 'legend' | 'interesting' {
    const bias = this.getComboDropBias();
    
    // 应用偏移
    let normal = Math.max(0.01, baseWeights.normal + bias.normal);
    let trash = Math.max(0.01, baseWeights.trash + bias.trash);
    let interesting = Math.max(0.01, baseWeights.interesting + bias.interesting);
    let legend = Math.max(0.01, baseWeights.legend + bias.legend);
    
    // 归一化
    const total = normal + trash + interesting + legend;
    normal /= total;
    trash /= total;
    interesting /= total;
    legend /= total;
    
    // 抽取
    const r = Math.random();
    if (r < legend) return 'legend';
    if (r < legend + trash) return 'trash';
    if (r < legend + trash + interesting) return 'interesting';
    return 'normal';
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

    // 连击失败保护提示
    if (this.pityFail) {
      return '上一杆太可惜了，这一杆帮你稳一下';
    }

    // 连击提示（优先于 bucket 提示）
    const tier = this.getComboTier();
    if (tier === 'jackpot') return '有点不对劲了';
    if (tier === 'streak') return '下一杆容易出节目效果';
    if (tier === 'hot') return '这一杆有点东西';
    if (tier === 'warm') return '手感热起来了';

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

    // 连击失败保护：下一杆窗口更宽松
    if (this.pityFail) {
      return {
        perfectWindowMs: 1100,
        goodWindowMs: 1600,
        earlyToleranceMs: 450,
        lateToleranceMs: 500,
        biteDelayMs: 1800,
        fakeBiteChance: 0.01,
      };
    }

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

    // 连击失败保护：不强制节目效果，先稳一手
    if (this.pityFail) return false;

    if (this.combo >= 3) return Math.random() < 0.72;
    if (this.failStreak >= 2) return true;
    if (bucket === 'fun_mix') return Math.random() < 0.55;
    if (bucket === 'good_shot') return Math.random() < 0.75;
    return false;
  }

  static shouldSoftProtectSuccess(): boolean {
    const bucket = this.getBucket();
    // 连击失败保护：下一杆必出安全鱼
    if (this.pityFail) return true;
    return bucket === 'safe_fish' || bucket === 'good_shot' || this.failStreak >= 2;
  }

  static decideDropKind(): 'normal' | 'trash' | 'legend' | 'interesting' {
    const bucket = this.getBucket();
    const tier = this.getComboTier();
    let result: 'normal' | 'trash' | 'legend' | 'interesting';

    // 【优先级 1】连击失败保护：不强制节目效果，先稳一手
    if (this.pityFail) {
      result = 'normal';
    }
    // 【优先级 2】failStreak >= 2 的强补偿逻辑
    else if (this.failStreak >= 2) {
      result = Math.random() < 0.72 ? 'interesting' : 'legend';
    }
    // 【优先级 3】safe_fish 分支：第一杆稳稳出货
    else if (bucket === 'safe_fish') {
      result = 'normal';
    }
    // 【优先级 4】fun_mix 分支：第二杆节目效果
    else if (bucket === 'fun_mix') {
      const r = Math.random();
      if (r < 0.45) result = 'trash';
      else if (r < 0.55) result = 'legend';
      else result = 'normal';
    }
    // 【优先级 5】good_shot 分支：第三杆更容易出好货
    else if (bucket === 'good_shot') {
      const r = Math.random();
      if (r < 0.35) result = 'legend';
      else if (r < 0.7) result = 'interesting';
      else result = 'normal';
    }
    // 【combo bias 作用范围】normal_mix / free_random 使用中后段自由随机
    else if (tier !== 'base') {
      if (bucket === 'normal_mix') {
        result = this.rollDropKindWithBias({ normal: 0.55, trash: 0.18, interesting: 0.22, legend: 0.05 });
      } else {
        // free_random 使用更激进的 bias
        result = this.rollDropKindWithBias({ normal: 0.50, trash: 0.20, interesting: 0.22, legend: 0.08 });
      }
    }
    // 无连击时使用原有逻辑
    else {
      const r = Math.random();
      if (r < 0.08) result = 'legend';
      else if (r < 0.32) result = 'trash';
      else if (r < 0.45) result = 'interesting';
      else result = 'normal';
    }

    return result;
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
