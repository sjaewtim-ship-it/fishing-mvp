import { StorageManager } from './StorageManager';

export type DailyTask = {
  id: string;
  title: string;
  target: number;
  progress: number;
  claimed: boolean;
};

export type DailyMissionState = {
  date: string;
  tasks: DailyTask[];
  allCompleted: boolean;
  rewardClaimed: boolean;
  streakDays: number;        // 连续完成天数
  lastCompletedDate: string; // 上次完成的日期字符串
  todayFishWeightGrams: number;  // 今日累计鱼重量（克）
};

const DEFAULT_TASKS: DailyTask[] = [
  { id: 'cast_5', title: '钓鱼 5 杆', target: 5, progress: 0, claimed: false },
  { id: 'success_3', title: '钓到 3 条鱼', target: 3, progress: 0, claimed: false },
  { id: 'quality_1', title: '钓到 1 条高品质鱼', target: 1, progress: 0, claimed: false },
  { id: 'weight_1000', title: '今日累计 1000g 鱼', target: 1000, progress: 0, claimed: false },
  { id: 'weight_3000', title: '今日累计 3000g 鱼', target: 3000, progress: 0, claimed: false },
];

const DAILY_MISSION_KEY = 'fishing_daily_mission_v1';

export class DailyMissionManager {
  private static _instance: DailyMissionManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new DailyMissionManager();
    }
    return this._instance;
  }

  private state: DailyMissionState | null = null;

  /** 获取今日日期字符串 */
  private getTodayDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  /** 初始化或重置日常任务（跨天自动重置） */
  init() {
    const today = this.getTodayDate();
    const saved = this.load();

    if (!saved || saved.date !== today) {
      // 新的一天，重置任务
      this.state = {
        date: today,
        tasks: JSON.parse(JSON.stringify(DEFAULT_TASKS)),
        allCompleted: false,
        rewardClaimed: false,
        streakDays: 0,
        lastCompletedDate: '',
        todayFishWeightGrams: 0,
      };
      this.save();
      console.log('daily mission reset for new day:', today);
    } else {
      // 读取旧存档，同步配置
      this.state = saved;
      this.syncStreakConfig();
      this.syncTaskConfig();
      this.syncTodayWeightConfig();
      this.save();
    }
  }

  /** 同步今日重量字段（旧存档兼容） */
  private syncTodayWeightConfig() {
    if (!this.state) return;
    if (this.state.todayFishWeightGrams === undefined) {
      this.state.todayFishWeightGrams = 0;
    }
  }

  /** 同步 streak 相关字段（旧存档兼容） */
  private syncStreakConfig() {
    if (!this.state) return;

    // 补默认值，不修改其他字段
    if (this.state.streakDays === undefined) {
      this.state.streakDays = 0;
    }
    if (this.state.lastCompletedDate === undefined) {
      this.state.lastCompletedDate = '';
    }
  }

  /** 同步任务配置（title/target），不修改 progress/claimed */
  private syncTaskConfig() {
    if (!this.state) return;

    for (const task of this.state.tasks) {
      const config = DEFAULT_TASKS.find(t => t.id === task.id);
      if (config) {
        // 只同步 title 和 target，保留 progress 和 claimed
        if (task.title !== config.title) {
          task.title = config.title;
        }
        if (task.target !== config.target) {
          task.target = config.target;
        }
      }
    }

    // 重算 allCompleted，防止 target 变化后状态不一致
    this.state.allCompleted = this.state.tasks.every(task => task.progress >= task.target);
  }

  /** 从存档加载 */
  private load(): DailyMissionState | null {
    const raw = localStorage.getItem(DAILY_MISSION_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as DailyMissionState;
    } catch (e) {
      console.error('daily mission load failed:', e);
      return null;
    }
  }

  /** 保存到存档 */
  private save() {
    if (!this.state) return;
    try {
      localStorage.setItem(DAILY_MISSION_KEY, JSON.stringify(this.state));
      console.log('daily mission saved:', this.state);
    } catch (e) {
      console.error('daily mission save failed:', e);
    }
  }

  /** 获取当前状态 */
  getState(): DailyMissionState | null {
    return this.state;
  }

  /** 获取任务列表 */
  getTasks(): DailyTask[] {
    return this.state?.tasks ?? [];
  }

  /** 是否全部完成 */
  isAllCompleted(): boolean {
    if (!this.state) return false;
    return this.state.allCompleted;
  }

  /** 奖励是否已领取 */
  isRewardClaimed(): boolean {
    return this.state?.rewardClaimed ?? false;
  }

  /** 获取连续完成天数 */
  getStreakDays(): number {
    return this.state?.streakDays ?? 0;
  }

  /** 推进任务进度 */
  advanceTask(taskId: string, amount: number = 1) {
    if (!this.state) return;

    const task = this.state.tasks.find(t => t.id === taskId);
    if (task && !task.claimed && task.progress < task.target) {
      task.progress = Math.min(task.target, task.progress + amount);
      console.log(`task ${taskId} advanced: ${task.progress}/${task.target}`);

      // 检查是否全部完成
      this.checkAllCompleted();
      this.save();
    }
  }

  /**
   * 同步今日重量任务进度（从 StorageManager 真源全量同步）
   * 只允许基于 StorageManager.instance.getTodayFishWeightGrams() 同步 progress
   * 禁止使用 task.progress += weightGrams 或 task.progress = weightGrams
   */
  syncWeightTasksFromStorage() {
    if (!this.state) return;

    // 从 StorageManager 同步今日累计重量（真源）
    const todayWeight = StorageManager.instance.getTodayFishWeightGrams();

    // 同步重量任务进度（基于 StorageManager 的真源数据）
    const weightTasks = this.state.tasks.filter(t => t.id.startsWith('weight_') && !t.claimed);
    for (const task of weightTasks) {
      task.progress = Math.min(task.target, todayWeight);
      console.log(`weight task ${task.id} synced: ${task.progress}/${task.target} (todayWeight: ${todayWeight}g)`);
    }

    // 检查是否全部完成
    this.checkAllCompleted();
    this.save();
  }

  /** 获取今日累计鱼重量（克）（从 StorageManager 读取真源） */
  getTodayFishWeightGrams(): number {
    return StorageManager.instance.getTodayFishWeightGrams();
  }

  /** 检查是否全部完成 */
  private checkAllCompleted() {
    if (!this.state) return;

    const allDone = this.state.tasks.every(t => t.progress >= t.target);
    if (allDone && !this.state.allCompleted) {
      this.state.allCompleted = true;

      // 更新 streak
      const today = this.getTodayDate();
      const yesterday = this.getYesterdayDate();

      if (this.state.lastCompletedDate === today) {
        // 今天已经更新过 streak，不重复累计
        this.state.lastCompletedDate = today;
        console.log('streak already updated today:', this.state.streakDays);
      } else if (this.state.lastCompletedDate === yesterday) {
        // 昨天完成了，streak +1
        this.state.streakDays = (this.state.streakDays ?? 0) + 1;
        this.state.lastCompletedDate = today;
        console.log('streak continued:', this.state.streakDays);
      } else {
        // 中断了（包括从未完成过），streak = 1
        this.state.streakDays = 1;
        this.state.lastCompletedDate = today;
        console.log('streak reset to 1:', this.state.streakDays);
      }

      console.log('daily mission all completed!');
    }
  }

  /** 获取昨天的日期字符串 */
  private getYesterdayDate(): string {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  /** 领取任务奖励（单个任务） */
  claimTaskReward(taskId: string): boolean {
    if (!this.state) return false;

    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task || task.claimed || task.progress < task.target) {
      return false;
    }

    task.claimed = true;
    this.save();
    console.log(`task reward claimed: ${taskId}`);
    return true;
  }

  /** 领取全部完成奖励 */
  claimAllCompletedReward(): boolean {
    if (!this.state) return false;
    if (!this.state.allCompleted || this.state.rewardClaimed) {
      return false;
    }

    this.state.rewardClaimed = true;
    this.save();
    console.log('all completed reward claimed!');
    return true;
  }

  /** 设置存档数据（用于 SaveSync） */
  setState(state: DailyMissionState) {
    this.state = state;
  }

  /** 获取存档数据（用于 SaveSync） */
  getSaveData(): DailyMissionState | null {
    return this.state;
  }

  /** 重置（用于清档） */
  reset() {
    localStorage.removeItem(DAILY_MISSION_KEY);
    this.state = null;
    console.log('daily mission reset');
  }
}
