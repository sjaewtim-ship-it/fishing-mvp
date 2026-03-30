/**
 * 成长任务管理器
 *
 * 职责：
 * - 管理成长任务数据（永久累积，不每日重置）
 * - 推进任务进度
 * - 发放任务奖励
 * - 独立存档（不与 DailyMissionManager 共用）
 *
 * 不负责：
 * - 不修改每日任务逻辑
 * - 不接入 SaveSync（第一阶段）
 */

import { CoinManager } from './CoinManager';
import { EnergyManager } from './EnergyManager';
import { CollectionManager } from './managers/CollectionManager';
import { StorageManager } from './StorageManager';

// ==================================================
// 数据类型定义
// ==================================================
export type GrowthTaskReward = {
  type: 'coin' | 'energy';
  amount: number;
};

export type GrowthTask = {
  id: string;
  title: string;
  target: number;
  progress: number;
  claimed: boolean;
  reward: GrowthTaskReward;
  thresholdGrams?: number;  // 大鱼阈值任务的重量阈值（克）
};

export type GrowthMissionState = {
  totalCasts: number;           // 累计钓鱼次数
  tasks: GrowthTask[];          // 任务列表
};

// ==================================================
// 常量定义
// ==================================================
const GROWTH_MISSION_KEY = 'fishing_growth_mission_v1';

const DEFAULT_TASKS: GrowthTask[] = [
  {
    id: 'growth_cast_10',
    title: '累计钓鱼 10 杆',
    target: 10,
    progress: 0,
    claimed: false,
    reward: { type: 'coin', amount: 100 },
  },
  {
    id: 'growth_collection_3',
    title: '解锁 3 个图鉴',
    target: 3,
    progress: 0,
    claimed: false,
    reward: { type: 'energy', amount: 1 },
  },
  {
    id: 'growth_success_5',
    title: '累计钓到 5 条鱼',
    target: 5,
    progress: 0,
    claimed: false,
    reward: { type: 'coin', amount: 150 },
  },
  {
    id: 'growth_success_10',
    title: '累计钓到 10 条鱼',
    target: 10,
    progress: 0,
    claimed: false,
    reward: { type: 'coin', amount: 300 },
  },
  {
    id: 'growth_cast_30',
    title: '累计钓鱼 30 杆',
    target: 30,
    progress: 0,
    claimed: false,
    reward: { type: 'coin', amount: 300 },
  },
  // 重量累计任务
  {
    id: 'growth_weight_10kg',
    title: '累计钓到 10kg 鱼',
    target: 10000,
    progress: 0,
    claimed: false,
    reward: { type: 'coin', amount: 200 },
  },
  {
    id: 'growth_weight_50kg',
    title: '累计钓到 50kg 鱼',
    target: 50000,
    progress: 0,
    claimed: false,
    reward: { type: 'energy', amount: 2 },
  },
  {
    id: 'growth_weight_100kg',
    title: '累计钓到 100kg 鱼',
    target: 100000,
    progress: 0,
    claimed: false,
    reward: { type: 'coin', amount: 500 },
  },
  // 大鱼阈值任务
  {
    id: 'growth_bigfish_1kg',
    title: '钓到 1 条超过 1kg 的鱼',
    target: 1,
    progress: 0,
    claimed: false,
    reward: { type: 'coin', amount: 150 },
    thresholdGrams: 1000,  // 1kg
  },
  {
    id: 'growth_bigfish_3kg',
    title: '钓到 1 条超过 3kg 的鱼',
    target: 1,
    progress: 0,
    claimed: false,
    reward: { type: 'energy', amount: 1 },
    thresholdGrams: 3000,  // 3kg
  },
];

// ==================================================
// 管理器类
// ==================================================
export class GrowthMissionManager {
  private static _instance: GrowthMissionManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new GrowthMissionManager();
    }
    return this._instance;
  }

  private state: GrowthMissionState | null = null;

  /**
   * 初始化或加载成长任务存档（幂等）
   * - 已有内存 state 时直接返回，不重复初始化
   * - 没有存档则初始化，有存档则加载
   * - 如存档字段缺失，做安全补齐
   */
  init() {
    // 幂等检查：已有 state 时不重复初始化
    if (this.state) {
      return;
    }

    const saved = this.load();

    if (!saved) {
      // 新存档，初始化
      this.state = {
        totalCasts: 0,
        tasks: JSON.parse(JSON.stringify(DEFAULT_TASKS)),
      };
      this.save();
      console.log('growth mission initialized');
    } else {
      // 读取旧存档，同步配置和缺失字段
      this.state = saved;
      this.syncMissingFields();
      this.syncTaskConfig();
      this.save();
    }

    // 同步 growth_cast_10 进度（基于 totalCasts）
    this.syncCastTaskProgress();
  }

  /**
   * 同步缺失字段（旧存档兼容）
   */
  private syncMissingFields() {
    if (!this.state) return;

    // 补 totalCasts 默认值
    if (this.state.totalCasts === undefined) {
      this.state.totalCasts = 0;
    }

    // 补 tasks 默认值
    if (!this.state.tasks) {
      this.state.tasks = JSON.parse(JSON.stringify(DEFAULT_TASKS));
    }

    // 确保 tasks 数组包含所有 DEFAULT_TASKS 中的任务
    const defaultTaskIds = new Set(DEFAULT_TASKS.map(t => t.id));
    const existingTaskIds = new Set(this.state.tasks.map(t => t.id));

    // 补齐缺失的任务
    for (const defaultTask of DEFAULT_TASKS) {
      if (!existingTaskIds.has(defaultTask.id)) {
        this.state.tasks.push(JSON.parse(JSON.stringify(defaultTask)));
      }
    }
  }

  /**
   * 同步任务配置（title/target/reward），保留 progress/claimed
   */
  private syncTaskConfig() {
    if (!this.state) return;

    for (const task of this.state.tasks) {
      const config = DEFAULT_TASKS.find(t => t.id === task.id);
      if (config) {
        // 只同步 title、target 和 reward，保留 progress 和 claimed
        if (task.title !== config.title) {
          task.title = config.title;
        }
        if (task.target !== config.target) {
          task.target = config.target;
        }
        // reward 字段必须显式兜底
        if (!task.reward) {
          task.reward = { ...config.reward };
        } else {
          // 确保 reward 的 type 和 amount 都存在
          if (!task.reward.type) {
            task.reward.type = config.reward.type;
          }
          if (task.reward.amount === undefined || task.reward.amount === null) {
            task.reward.amount = config.reward.amount;
          }
        }
      }
    }
  }

  /**
   * 获取任务列表
   */
  getTasks(): GrowthTask[] {
    return this.state?.tasks ?? [];
  }

  /**
   * 获取累计钓鱼次数
   */
  getTotalCasts(): number {
    return this.state?.totalCasts ?? 0;
  }

  /**
   * 推进累计钓鱼次数（growth_cast_10 的唯一推进入口）
   * - totalCasts += amount
   * - 同步更新 growth_cast_10 的 progress
   * - progress = min(totalCasts, target)
   * @param amount 推进数量（默认 1）
   */
  advanceCast(amount: number = 1) {
    if (!this.state) return;

    // 累计钓鱼次数 +1
    this.state.totalCasts += amount;

    // 同步 growth_cast_10 任务进度
    this.syncCastTaskProgress();

    console.log(`growth cast advanced: totalCasts=${this.state.totalCasts}`);
    this.save();
  }

  /**
   * 同步重量累计任务进度（从 StorageManager 真源全量同步）
   * growth_weight_* 只由 totalFishWeightGrams 决定
   * 禁止使用 task.progress += weightGrams 或 task.progress = weightGrams
   */
  syncWeightTasksFromStorage() {
    if (!this.state) return;

    // 从 StorageManager 读取真源数据
    const totalWeight = StorageManager.instance.getTotalFishWeightGrams();

    for (const task of this.state.tasks) {
      if (task.id.startsWith('growth_weight_') && !task.claimed) {
        task.progress = Math.min(task.target, totalWeight);
        console.log(`growth weight task synced: ${task.id} ${task.progress}/${task.target} (totalWeight: ${totalWeight}g)`);
      }
    }
  }

  /**
   * 同步大鱼阈值任务进度（基于当前这条鱼的 weightGrams）
   * growth_bigfish_* 只由当前这条鱼的 weightGrams 和 thresholdGrams 决定
   * @param weightGrams 本次钓到的鱼重量（克）
   */
  syncBigFishTasksFromCurrentCatch(weightGrams: number) {
    if (!this.state || weightGrams <= 0) return;

    for (const task of this.state.tasks) {
      if (task.id.startsWith('growth_bigfish_') && !task.claimed) {
        // 大鱼阈值任务：使用 thresholdGrams 判断，progress 为 0/1
        const thresholdGrams = task.thresholdGrams ?? 0;
        if (thresholdGrams > 0 && weightGrams >= thresholdGrams) {
          task.progress = 1;
          console.log(`growth big fish task completed: ${task.id} (${weightGrams}g >= ${thresholdGrams}g)`);
        }
      }
    }
  }

  /**
   * 推进任务进度（保留，供未来扩展使用）
   * @param taskId 任务 ID
   * @param amount 推进数量（默认 1）
   */
  advanceTask(taskId: string, amount: number = 1) {
    if (!this.state) return;

    const task = this.state.tasks.find(t => t.id === taskId);
    if (task && !task.claimed && task.progress < task.target) {
      task.progress = Math.min(task.target, task.progress + amount);
      console.log(`growth task ${taskId} advanced: ${task.progress}/${task.target}`);
      this.save();
    }
  }

  /**
   * 同步所有任务进度（用于 Tab 切换时）
   * - 同步 growth_cast_10 的 progress（基于 totalCasts）
   * - 同步 growth_collection_3 的 progress（基于 CollectionManager）
   * - 同步 growth_weight_* 的 progress（基于 StorageManager 真源）
   * - 不改 claimed 状态逻辑
   */
  syncAllTasks() {
    if (!this.state) return;

    // 同步 growth_cast_10（基于 totalCasts）
    this.syncCastTaskProgress();

    // 同步 growth_collection_3（基于 CollectionManager）
    const collectionTask = this.state.tasks.find(t => t.id === 'growth_collection_3');
    if (collectionTask && !collectionTask.claimed) {
      const unlocked = CollectionManager.getSummary().unlocked;
      collectionTask.progress = Math.min(collectionTask.target, unlocked);
      console.log(`growth collection task synced: ${collectionTask.progress}/${collectionTask.target}`);
    }

    // 同步 growth_weight_*（基于 StorageManager 真源）← 新增：修复累计重量被覆盖
    this.syncWeightTasksFromStorage();

    this.save();
  }

  /**
   * 专用同步方法：同步所有 growth_cast_* 任务的进度（基于 totalCasts）
   * - 在 init() 后、advanceCast() 后、syncAllTasks() 中调用
   * - 确保 progress 稳定来源于 totalCasts
   * - 使用前缀匹配，自动覆盖所有 growth_cast_* 任务
   */
  syncCastTaskProgress() {
    if (!this.state) return;

    // 同步所有 growth_cast_* 任务（基于 totalCasts）
    for (const task of this.state.tasks) {
      if (task.id.startsWith('growth_cast_') && !task.claimed) {
        task.progress = Math.min(task.target, this.state.totalCasts);
        console.log(`growth cast task synced: ${task.id} ${task.progress}/${task.target} (totalCasts: ${this.state.totalCasts})`);
      }
    }
  }

  /**
   * 同步图鉴任务进度（保留，供兼容使用）
   * - 在 init() 时调用
   * - 在 TaskScene 切换到成长任务 Tab 时调用
   */
  syncCollectionTask() {
    if (!this.state) return;

    const collectionTask = this.state.tasks.find(t => t.id === 'growth_collection_3');
    if (collectionTask && !collectionTask.claimed) {
      const unlocked = CollectionManager.getSummary().unlocked;
      collectionTask.progress = Math.min(collectionTask.target, unlocked);
      console.log(`growth collection task synced: ${collectionTask.progress}/${collectionTask.target}`);
      this.save();
    }
  }

  /**
   * 从存档加载
   */
  private load(): GrowthMissionState | null {
    const raw = localStorage.getItem(GROWTH_MISSION_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as GrowthMissionState;
    } catch (e) {
      console.error('growth mission load failed:', e);
      return null;
    }
  }

  /**
   * 保存到存档
   */
  private save() {
    if (!this.state) return;
    try {
      localStorage.setItem(GROWTH_MISSION_KEY, JSON.stringify(this.state));
      console.log('growth mission saved:', this.state);
    } catch (e) {
      console.error('growth mission save failed:', e);
    }
  }

  /**
   * 重置（用于测试/清档）
   */
  reset() {
    localStorage.removeItem(GROWTH_MISSION_KEY);
    this.state = null;
    console.log('growth mission reset');
  }

  /**
   * 领取成长任务奖励
   * @param taskId 任务 ID
   * @returns 是否领取成功
   */
  claimTaskReward(taskId: string): boolean {
    if (!this.state) return false;

    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return false;

    // 判断是否可领取：进度达标且未领取
    if (task.progress < task.target || task.claimed) {
      return false;
    }

    // 发放奖励
    if (task.reward) {
      if (task.reward.type === 'coin') {
        CoinManager.instance.addCoins(task.reward.amount);
        console.log(`growth task reward: +${task.reward.amount} coins`);
      } else if (task.reward.type === 'energy') {
        EnergyManager.instance.addEnergy(task.reward.amount);
        console.log(`growth task reward: +${task.reward.amount} energy`);
      }
    }

    // 标记已领取
    task.claimed = true;
    this.save();

    console.log(`growth task ${taskId} claimed`);
    return true;
  }
}
