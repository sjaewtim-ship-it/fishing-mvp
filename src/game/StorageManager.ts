import type { GoalSaveData } from './GoalTypes';

type SaveData = {
  coins: number;
  energy: number;
  roundCount: number;
  bestCatch: string;
  weirdCatch: string;
  totalStartRounds: number;
  totalSuccessRounds: number;
  totalFailRounds: number;
  totalAdViews: number;
  lastDropName: string;
  continuousFishCount: number;
  continuousNonLegendCount: number;
  recentLegendCooldown: number;
  // 目标系统数据
  goalData?: GoalSaveData;
  totalCoinsEarned?: number;  // 累计获得金币（用于成就）
};

const SAVE_KEY = 'fishing_mvp_save_v4';
const GOAL_SAVE_KEY = 'fishing_goal_save_v1';

export class StorageManager {
  private static _instance: StorageManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new StorageManager();
    }
    return this._instance;
  }

  save(data: SaveData) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    console.log('save success:', data);
  }

  load(): SaveData | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as SaveData;
    } catch (e) {
      console.error('save parse failed:', e);
      return null;
    }
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(GOAL_SAVE_KEY);
    console.log('save cleared');
  }

  // ========== 目标系统独立存储 ==========
  
  saveGoalData(data: GoalSaveData) {
    localStorage.setItem(GOAL_SAVE_KEY, JSON.stringify(data));
    console.log('goal save success:', data);
  }

  loadGoalData(): GoalSaveData | null {
    const raw = localStorage.getItem(GOAL_SAVE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as GoalSaveData;
    } catch (e) {
      console.error('goal save parse failed:', e);
      return null;
    }
  }

  clearGoalData() {
    localStorage.removeItem(GOAL_SAVE_KEY);
    console.log('goal save cleared');
  }
}
