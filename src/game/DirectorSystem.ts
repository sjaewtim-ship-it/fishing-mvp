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

  // ======================
  // 基础状态
  // ======================
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

  // ======================
  // 🔥 连击系统（核心）
  // ======================
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

  // ✅ 本次修复核心函数（ResultScene依赖）
  static getComboEmotionLine(): string {
    if (this.combo >= 5) return '这波真的有点挡不住了';
    if (this.combo >= 3) return '状态起来了，越钓越上头';
    if (this.combo >= 2) return '连着中，手感已经热起来了';
    return '';
  }

  // ======================
  // 掉落控制（简化稳定版）
  // ======================
  static decideDropKind(): 'normal' | 'trash' | 'legend' | 'interesting' {
    if (this.combo >= 4) {
      const r = Math.random();
      if (r < 0.25) return 'legend';
      if (r < 0.65) return 'interesting';
      return 'normal';
    }

    if (this.failStreak >= 2) {
      return Math.random() < 0.7 ? 'interesting' : 'legend';
    }

    const r = Math.random();
    if (r < 0.1) return 'legend';
    if (r < 0.35) return 'trash';
    if (r < 0.5) return 'interesting';
    return 'normal';
  }

  // ======================
  // 工具函数
  // ======================
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
