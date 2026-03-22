import { CoinManager } from './CoinManager';
import { EnergyManager } from './EnergyManager';
import { RecordManager } from './RecordManager';
import { RoundManager } from './RoundManager';
import { StorageManager } from './StorageManager';
import { AnalyticsManager } from './AnalyticsManager';
import { DirectorManager } from './DirectorManager';

export class SaveSync {
  static load() {
    const data = StorageManager.instance.load();
    if (!data) return;

    CoinManager.instance.setCoins(data.coins ?? 0);
    EnergyManager.instance.setEnergy(data.energy ?? 5);
    RoundManager.instance.setRoundCount(data.roundCount ?? 0);
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
  }

  static save() {
    const director = DirectorManager.instance.getDebugInfo();

    StorageManager.instance.save({
      coins: CoinManager.instance.getCoins(),
      energy: EnergyManager.instance.getEnergy(),
      roundCount: RoundManager.instance.getRoundCount(),
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
    });
  }

  static reset() {
    StorageManager.instance.clear();
  }
}
