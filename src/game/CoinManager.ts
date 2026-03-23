import { AnalyticsManager } from './AnalyticsManager';
import { GoalManager } from './GoalManager';

export class CoinManager {
  private static _instance: CoinManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new CoinManager();
    }
    return this._instance;
  }

  private coins: number = 0;

  getCoins() {
    return this.coins;
  }

  /**
   * 添加金币
   * @param value 金币数量
   * @param isReward 是否为奖励金币（true 时不计入"累计获得金币"成就）
   */
  addCoins(value: number, isReward: boolean = false) {
    this.coins += value;

    // 记录累计金币（用于成就系统）
    // 奖励金币不计入，防止"任务奖励金币"错误推进"累计获得金币成就"
    if (value > 0 && !isReward) {
      AnalyticsManager.instance.onCoinsEarned(value);
      GoalManager.instance.updateProgressByCondition('earn_coins', value, true);
    }

    console.log('coins add:', value, isReward ? '(reward)' : '', 'total:', this.coins);
  }

  setCoins(value: number) {
    this.coins = value;
    console.log('coins set:', this.coins);
  }

  reset() {
    this.coins = 0;
    console.log('coins reset:', this.coins);
  }
}
