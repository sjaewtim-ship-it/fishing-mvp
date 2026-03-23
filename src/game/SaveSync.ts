import { CoinManager } from './CoinManager';
import { EnergyManager } from './EnergyManager';
import { RecordManager } from './RecordManager';
import { RoundManager } from './RoundManager';
import { StorageManager } from './StorageManager';
import { AnalyticsManager } from './AnalyticsManager';
import { DirectorManager } from './DirectorManager';
import { DirectorSystem } from './DirectorSystem';

export class SaveSync {
  private static getDirectorSystemStateFromSave(data: ReturnType<typeof StorageManager.instance.load>) {
    if (!data) {
      return {
        round: 0,
        failStreak: 0,
        successStreak: 0,
        combo: 0,
      };
    }

    // 优先使用当前活跃系统自己的存档字段；旧存档再回退到历史字段。
    if (
      typeof data.directorRound === 'number'
      || typeof data.directorFailStreak === 'number'
      || typeof data.directorSuccessStreak === 'number'
      || typeof data.directorCombo === 'number'
    ) {
      return {
        round: data.directorRound ?? 0,
        failStreak: data.directorFailStreak ?? 0,
        successStreak: data.directorSuccessStreak ?? 0,
        combo: data.directorCombo ?? 0,
      };
    }

    return {
      round: data.roundCount ?? 0,
      failStreak: 0,
      successStreak: 0,
      combo: 0,
    };
  }

  private static syncCompatibilityRound(round: number) {
    RoundManager.instance.setRoundCount(round);
  }

  static load() {
    const data = StorageManager.instance.load();
    if (!data) return;

    const directorSystemState = this.getDirectorSystemStateFromSave(data);

    CoinManager.instance.setCoins(data.coins ?? 0);
    EnergyManager.instance.setEnergy(data.energy ?? 5);
    this.syncCompatibilityRound(directorSystemState.round);
    RecordManager.instance.setBestCatch(data.bestCatch ?? '暂无');
    RecordManager.instance.setWeirdCatch(data.weirdCatch ?? '暂无');
    AnalyticsManager.instance.setData({
      totalStartRounds: data.totalStartRounds ?? 0,
      totalSuccessRounds: data.totalSuccessRounds ?? 0,
      totalFailRounds: data.totalFailRounds ?? 0,
      totalAdViews: data.totalAdViews ?? 0,
      lastDropName: data.lastDropName ?? '暂无',
    });
    DirectorManager.instance.setData({
      continuousFishCount: data.continuousFishCount ?? 0,
      continuousNonLegendCount: data.continuousNonLegendCount ?? 0,
      recentLegendCooldown: data.recentLegendCooldown ?? 0,
    });
    DirectorSystem.setState(directorSystemState);
  }

  static save() {
    const director = DirectorManager.instance.getDebugInfo();
    const directorSystem = DirectorSystem.getState();
    this.syncCompatibilityRound(directorSystem.round);

    StorageManager.instance.save({
      coins: CoinManager.instance.getCoins(),
      energy: EnergyManager.instance.getEnergy(),
      roundCount: directorSystem.round,
      bestCatch: RecordManager.instance.getBestCatch(),
      weirdCatch: RecordManager.instance.getWeirdCatch(),
      totalStartRounds: AnalyticsManager.instance.getTotalStartRounds(),
      totalSuccessRounds: AnalyticsManager.instance.getTotalSuccessRounds(),
      totalFailRounds: AnalyticsManager.instance.getTotalFailRounds(),
      totalAdViews: AnalyticsManager.instance.getTotalAdViews(),
      lastDropName: AnalyticsManager.instance.getLastDropName(),
      continuousFishCount: director.continuousFishCount,
      continuousNonLegendCount: director.continuousNonLegendCount,
      recentLegendCooldown: director.recentLegendCooldown,
      directorRound: directorSystem.round,
      directorFailStreak: directorSystem.failStreak,
      directorSuccessStreak: directorSystem.successStreak,
      directorCombo: directorSystem.combo,
    });
  }

  static hasShareRewardClaimed(key: string) {
    return StorageManager.instance.hasShareRewardClaimed(key);
  }

  static markShareRewardClaimed(key: string) {
    StorageManager.instance.markShareRewardClaimed(key);
  }

  static reset() {
    StorageManager.instance.clear();
    CoinManager.instance.reset();
    EnergyManager.instance.reset();
    RecordManager.instance.reset();
    AnalyticsManager.instance.reset();
    RoundManager.instance.reset();
    DirectorManager.instance.reset();
    DirectorSystem.reset();
  }
}
