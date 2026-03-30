import { GAME_VERSION } from '../config/version';

/**
 * 游戏设置数据结构
 */
export type GameSettings = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
};

/**
 * 设置管理器
 * 负责游戏设置的存储和读取
 */
export class SettingsManager {
  private static _instance: SettingsManager;

  private static readonly STORAGE_KEY = 'fishing_settings_v1';

  private static readonly DEFAULT_SETTINGS: GameSettings = {
    soundEnabled: true,
    vibrationEnabled: true,
  };

  private settings: GameSettings;

  private constructor() {
    this.settings = this.load();
  }

  public static get instance(): SettingsManager {
    if (!this._instance) {
      this._instance = new SettingsManager();
    }
    return this._instance;
  }

  /**
   * 获取完整设置对象
   */
  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  /**
   * 保存完整设置对象
   */
  public saveSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    this.persist();
  }

  /**
   * 部分更新设置
   */
  public update(partial: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.persist();
  }

  /**
   * 是否启用音效
   */
  public isSoundEnabled(): boolean {
    return this.settings.soundEnabled;
  }

  /**
   * 是否启用震动
   */
  public isVibrationEnabled(): boolean {
    return this.settings.vibrationEnabled;
  }

  /**
   * 重置设置为默认值
   */
  public resetSettings(): void {
    this.settings = { ...SettingsManager.DEFAULT_SETTINGS };
    this.persist();
  }

  /**
   * 获取版本号
   */
  public getVersion(): string {
    return GAME_VERSION;
  }

  /**
   * 持久化到 localStorage
   */
  private persist(): void {
    try {
      localStorage.setItem(SettingsManager.STORAGE_KEY, JSON.stringify(this.settings));
      console.log('settings saved:', this.settings);
    } catch (e) {
      console.error('settings save failed:', e);
    }
  }

  /**
   * 从 localStorage 加载
   */
  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(SettingsManager.STORAGE_KEY);
      if (!raw) {
        return { ...SettingsManager.DEFAULT_SETTINGS };
      }

      const parsed = JSON.parse(raw) as GameSettings;

      // 验证数据结构
      return {
        soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : SettingsManager.DEFAULT_SETTINGS.soundEnabled,
        vibrationEnabled: typeof parsed.vibrationEnabled === 'boolean' ? parsed.vibrationEnabled : SettingsManager.DEFAULT_SETTINGS.vibrationEnabled,
      };
    } catch (e) {
      console.error('settings load failed, using default:', e);
      return { ...SettingsManager.DEFAULT_SETTINGS };
    }
  }
}
