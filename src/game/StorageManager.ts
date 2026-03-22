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
};

const SAVE_KEY = 'fishing_mvp_save_v3';

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
    console.log('save cleared');
  }
}
