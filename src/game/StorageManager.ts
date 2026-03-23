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
  directorRound?: number;
  directorFailStreak?: number;
  directorSuccessStreak?: number;
  directorCombo?: number;
  dailyMission?: {
    date: string;
    tasks: Array<{ id: string; title: string; target: number; progress: number; claimed: boolean }>;
    allCompleted: boolean;
    rewardClaimed: boolean;
  };
  _version?: number;
};

const SAVE_KEY = 'fishing_mvp_save_v3';
const SHARE_REWARD_KEY_PREFIX = 'fishing_share_reward_';
const SAVE_VERSION = 3;

// 默认存档数据，用于损坏恢复
const DEFAULT_SAVE: SaveData = {
  coins: 0,
  energy: 5,
  roundCount: 0,
  bestCatch: '暂无',
  weirdCatch: '暂无',
  totalStartRounds: 0,
  totalSuccessRounds: 0,
  totalFailRounds: 0,
  totalAdViews: 0,
  lastDropName: '暂无',
  continuousFishCount: 0,
  continuousNonLegendCount: 0,
  recentLegendCooldown: 0,
  _version: SAVE_VERSION,
};

export class StorageManager {
  private static _instance: StorageManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new StorageManager();
    }
    return this._instance;
  }

  save(data: SaveData) {
    const saveData = { ...data, _version: SAVE_VERSION };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      console.log('save success:', saveData);
    } catch (e) {
      console.error('save failed:', e);
    }
  }

  load(): SaveData | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as SaveData;
      // 版本检查，未来可用于存档迁移
      if (parsed._version && parsed._version < SAVE_VERSION) {
        console.log('save version migration:', parsed._version, '->', SAVE_VERSION);
      }
      return this.validateAndRecover(parsed);
    } catch (e) {
      console.error('save parse failed, using default:', e);
      return this.createDefaultRecover();
    }
  }

  // 验证存档数据完整性，损坏时恢复
  private validateAndRecover(data: SaveData): SaveData {
    const recovered: SaveData = { ...DEFAULT_SAVE };

    // 逐项验证并恢复
    if (typeof data.coins === 'number' && data.coins >= 0) recovered.coins = data.coins;
    if (typeof data.energy === 'number' && data.energy >= 0) recovered.energy = data.energy;
    if (typeof data.roundCount === 'number' && data.roundCount >= 0) recovered.roundCount = data.roundCount;
    if (typeof data.bestCatch === 'string') recovered.bestCatch = data.bestCatch;
    if (typeof data.weirdCatch === 'string') recovered.weirdCatch = data.weirdCatch;
    if (typeof data.totalStartRounds === 'number' && data.totalStartRounds >= 0) recovered.totalStartRounds = data.totalStartRounds;
    if (typeof data.totalSuccessRounds === 'number' && data.totalSuccessRounds >= 0) recovered.totalSuccessRounds = data.totalSuccessRounds;
    if (typeof data.totalFailRounds === 'number' && data.totalFailRounds >= 0) recovered.totalFailRounds = data.totalFailRounds;
    if (typeof data.totalAdViews === 'number' && data.totalAdViews >= 0) recovered.totalAdViews = data.totalAdViews;
    if (typeof data.lastDropName === 'string') recovered.lastDropName = data.lastDropName;
    if (typeof data.continuousFishCount === 'number' && data.continuousFishCount >= 0) recovered.continuousFishCount = data.continuousFishCount;
    if (typeof data.continuousNonLegendCount === 'number' && data.continuousNonLegendCount >= 0) recovered.continuousNonLegendCount = data.continuousNonLegendCount;
    if (typeof data.recentLegendCooldown === 'number' && data.recentLegendCooldown >= 0) recovered.recentLegendCooldown = data.recentLegendCooldown;
    if (typeof data.directorRound === 'number' && data.directorRound >= 0) recovered.directorRound = data.directorRound;
    if (typeof data.directorFailStreak === 'number' && data.directorFailStreak >= 0) recovered.directorFailStreak = data.directorFailStreak;
    if (typeof data.directorSuccessStreak === 'number' && data.directorSuccessStreak >= 0) recovered.directorSuccessStreak = data.directorSuccessStreak;
    if (typeof data.directorCombo === 'number' && data.directorCombo >= 0) recovered.directorCombo = data.directorCombo;
    if (data.dailyMission && typeof data.dailyMission === 'object') {
      recovered.dailyMission = data.dailyMission;
    }
    if (typeof data._version === 'number') recovered._version = data._version;

    return recovered;
  }

  // 创建默认恢复存档
  private createDefaultRecover(): SaveData {
    console.warn('存档损坏，已恢复到初始状态');
    return { ...DEFAULT_SAVE };
  }

  hasShareRewardClaimed(key: string) {
    return localStorage.getItem(key) === '1';
  }

  markShareRewardClaimed(key: string) {
    localStorage.setItem(key, '1');
    console.log('share reward claimed:', key);
  }

  clearShareRewardClaims() {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SHARE_REWARD_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.log('share reward claims cleared:', keysToRemove.length);
    }
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
    this.clearShareRewardClaims();
    console.log('save cleared');
  }
}
