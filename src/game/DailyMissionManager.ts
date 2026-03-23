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
};

const DEFAULT_TASKS: DailyTask[] = [
  { id: 'cast_3', title: '完成钓鱼 3 次', target: 3, progress: 0, claimed: false },
  { id: 'success_2', title: '成功钓到 2 条鱼', target: 2, progress: 0, claimed: false },
  { id: 'quality_1', title: '钓到 1 条高品质鱼', target: 1, progress: 0, claimed: false },
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
      };
      this.save();
      console.log('daily mission reset for new day:', today);
    } else {
      this.state = saved;
    }
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

  /** 检查是否全部完成 */
  private checkAllCompleted() {
    if (!this.state) return;

    const allDone = this.state.tasks.every(t => t.progress >= t.target);
    if (allDone && !this.state.allCompleted) {
      this.state.allCompleted = true;
      console.log('daily mission all completed!');
    }
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
