import { DailyMissionManager } from './DailyMissionManager';
import { GrowthMissionManager } from './GrowthMissionManager';

export class AnalyticsManager {
  private static _instance: AnalyticsManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new AnalyticsManager();
    }
    return this._instance;
  }

  private totalStartRounds: number = 0;
  private totalSuccessRounds: number = 0;
  private totalFailRounds: number = 0;
  private totalAdViews: number = 0;
  private lastDropName: string = '暂无';

  onStartRound() {
    this.totalStartRounds += 1;
    console.log('analytics:start_round', this.totalStartRounds);
  }

  onRoundSuccess(dropName: string) {
    this.totalSuccessRounds += 1;
    this.lastDropName = dropName;
    // 日常任务：成功钓到鱼
    DailyMissionManager.instance.advanceTask('success_3', 1);
    // 成长任务：累计钓到 5 条鱼
    GrowthMissionManager.instance.init();
    GrowthMissionManager.instance.advanceTask('growth_success_5', 1);
    // 成长任务：累计钓到 10 条鱼
    GrowthMissionManager.instance.advanceTask('growth_success_10', 1);
    console.log('analytics:success', this.totalSuccessRounds, dropName);
  }

  onRoundFail() {
    this.totalFailRounds += 1;
    console.log('analytics:fail', this.totalFailRounds);
  }

  onAdView(scene: string) {
    this.totalAdViews += 1;
    console.log('analytics:ad_view', scene, this.totalAdViews);
  }

  getTotalStartRounds() {
    return this.totalStartRounds;
  }

  getTotalSuccessRounds() {
    return this.totalSuccessRounds;
  }

  getTotalFailRounds() {
    return this.totalFailRounds;
  }

  getTotalAdViews() {
    return this.totalAdViews;
  }

  getLastDropName() {
    return this.lastDropName;
  }

  setData(data: {
    totalStartRounds?: number;
    totalSuccessRounds?: number;
    totalFailRounds?: number;
    totalAdViews?: number;
    lastDropName?: string;
  }) {
    this.totalStartRounds = data.totalStartRounds ?? 0;
    this.totalSuccessRounds = data.totalSuccessRounds ?? 0;
    this.totalFailRounds = data.totalFailRounds ?? 0;
    this.totalAdViews = data.totalAdViews ?? 0;
    this.lastDropName = data.lastDropName ?? '暂无';
  }

  reset() {
    this.totalStartRounds = 0;
    this.totalSuccessRounds = 0;
    this.totalFailRounds = 0;
    this.totalAdViews = 0;
    this.lastDropName = '暂无';
  }
}
