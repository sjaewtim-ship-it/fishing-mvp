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
};

const SAVE_KEY = 'fishing_mvp_save_v3';
const SHARE_REWARD_KEY_PREFIX = 'fishing_share_reward_';

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
