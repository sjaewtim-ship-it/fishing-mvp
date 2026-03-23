import { Goal, GoalType, GoalStatus, GoalConfig, GoalProgress, GoalSaveData, GoalCompletedData, RedDotState } from './GoalTypes';
import { CoinManager } from './CoinManager';
import { EnergyManager } from './EnergyManager';

/**
 * 目标配置列表 v2.0（11 个目标）
 */
const GOAL_CONFIGS: GoalConfig[] = [
  // ========== 每日目标 ==========
  {
    id: 'daily_catch_3',
    type: 'daily',
    name: '小试牛刀',
    description: '今日累计钓到 3 条鱼',
    icon: '🎯',
    progressType: 'count',
    targetValue: 3,
    rewardCoins: 30,
    rewardEnergy: 1,
    sortOrder: 1,
    groupId: 'fishing',
    priority: 10,
  },
  {
    id: 'daily_catch_10',
    type: 'daily',
    name: '钓鱼达人',
    description: '今日累计钓到 10 条鱼',
    icon: '🏆',
    progressType: 'count',
    targetValue: 10,
    rewardCoins: 80,
    rewardEnergy: 2,
    sortOrder: 2,
    groupId: 'fishing',
    priority: 20,
  },
  {
    id: 'daily_good_fish',
    type: 'daily',
    name: '优质渔获',
    description: '今日钓到 3 条优质鱼（大鲤鱼/黑鱼/鲈鱼）',
    icon: '🐟',
    progressType: 'count',
    targetValue: 3,
    rewardCoins: 50,
    sortOrder: 3,
    groupId: 'fishing',
    priority: 15,
  },
  {
    id: 'daily_perfect',
    type: 'daily',
    name: '完美时机',
    description: '今日完美拉杆 5 次',
    icon: '✨',
    progressType: 'count',
    targetValue: 5,
    rewardCoins: 40,
    sortOrder: 4,
    groupId: 'special',
    priority: 10,
  },

  // ========== 每周目标 ==========
  {
    id: 'weekly_catch_50',
    type: 'weekly',
    name: '周钓鱼王',
    description: '本周累计钓到 50 条鱼',
    icon: '👑',
    progressType: 'count',
    targetValue: 50,
    rewardCoins: 200,
    rewardEnergy: 5,
    sortOrder: 1,
    groupId: 'fishing',
    priority: 30,
  },
  {
    id: 'weekly_rare_fish',
    type: 'weekly',
    name: '稀有收藏家',
    description: '本周钓到 5 条稀有鱼',
    icon: '💎',
    progressType: 'count',
    targetValue: 5,
    rewardCoins: 300,
    sortOrder: 2,
    groupId: 'rare',
    priority: 25,
  },

  // ========== 成就目标（永久） ==========
  {
    id: 'achievement_first_blood',
    type: 'achievement',
    name: '首杆出货',
    description: '首次成功钓到鱼',
    icon: '🎉',
    progressType: 'count',
    targetValue: 1,
    rewardCoins: 100,
    sortOrder: 1,
    isHidden: true,
    groupId: 'fishing',
    visibleCondition: 'always',
  },
  {
    id: 'achievement_legend_catch',
    type: 'achievement',
    name: '传说渔夫',
    description: '首次钓到传说鱼',
    icon: '🐉',
    progressType: 'count',
    targetValue: 1,
    rewardCoins: 500,
    sortOrder: 2,
    isHidden: true,
    groupId: 'legend',
    visibleCondition: 'after_first_catch',
  },
  {
    id: 'achievement_combo_5',
    type: 'achievement',
    name: '连击高手',
    description: '达成 5 连击',
    icon: '🔥',
    progressType: 'count',
    targetValue: 1,
    rewardCoins: 200,
    sortOrder: 3,
    isHidden: true,
    groupId: 'combo',
    visibleCondition: 'after_first_catch',
  },
  {
    id: 'achievement_rich',
    type: 'achievement',
    name: '小富翁',
    description: '累计获得 1000 金币',
    icon: '💰',
    progressType: 'accumulate',
    targetValue: 1000,
    rewardCoins: 300,
    sortOrder: 4,
    isHidden: true,
    groupId: 'coins',
    visibleCondition: 'always',
  },
  {
    id: 'achievement_trash_master',
    type: 'achievement',
    name: '环保卫士',
    description: '钓到 10 次离谱物',
    icon: '🗑️',
    progressType: 'count',
    targetValue: 10,
    rewardCoins: 150,
    sortOrder: 5,
    isHidden: true,
    groupId: 'trash',
    visibleCondition: 'after_first_catch',
  },
];

/**
 * 目标管理器 v2.0
 *
 * 修复和优化：
 * 1. 防止重复初始化
 * 2. 奖励金币不计入"累计获得金币"成就
 * 3. 更精确的每日/每周重置逻辑
 * 4. 状态恢复增强
 */
export class GoalManager {
  private static _instance: GoalManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new GoalManager();
    }
    return this._instance;
  }

  // 目标进度存储
  private goals: Record<string, GoalProgress> = {};

  // 重置时间戳
  private lastDailyReset: number = 0;
  private lastWeeklyReset: number = 0;

  // 解锁标记
  private unlockFlags: Record<string, boolean> = {};

  // 回调函数
  private onGoalCompletedCallback?: (data: GoalCompletedData) => void;

  // 初始化标记（防止重复初始化）
  private isInitialized: boolean = false;

  /**
   * 初始化（从存档加载后调用）
   * @param saveData 存档数据
   * @param force 是否强制重新初始化
   */
  init(saveData?: GoalSaveData, force: boolean = false) {
    // 防止重复初始化（除非强制）
    if (this.isInitialized && !force) {
      console.log('GoalManager: 已初始化，跳过');
      return;
    }

    if (saveData) {
      this.goals = saveData.goals || {};
      this.lastDailyReset = saveData.lastDailyReset || 0;
      this.lastWeeklyReset = saveData.lastWeeklyReset || 0;
      this.unlockFlags = saveData.unlockFlags || {};
    }

    // 初始化所有配置目标
    this.ensureAllGoalsInitialized();

    // 检查是否需要重置
    this.checkAndReset();

    this.isInitialized = true;
    console.log('GoalManager: 初始化完成，共', GOAL_CONFIGS.length, '个目标');
  }

  /**
   * 确保所有配置的目标都已初始化
   */
  private ensureAllGoalsInitialized() {
    for (const config of GOAL_CONFIGS) {
      if (!this.goals[config.id]) {
        this.goals[config.id] = {
          currentValue: 0,
          status: 'active',
          unlockedAt: Date.now(),
        };
      }

      // 检查可见性条件，更新解锁状态
      this.checkVisibilityCondition(config);
    }
  }

  /**
   * 检查可见性条件
   */
  private checkVisibilityCondition(config: GoalConfig) {
    if (!config.visibleCondition || config.visibleCondition === 'always') {
      this.unlockFlags[config.id] = true;
      return;
    }

    // 根据条件解锁
    switch (config.visibleCondition) {
      case 'after_first_catch':
        // 首次钓鱼后解锁（通过首次钓到鱼成就判断）
        const firstBlood = this.goals['achievement_first_blood'];
        if (firstBlood && (firstBlood.currentValue > 0 || firstBlood.status !== 'active')) {
          this.unlockFlags[config.id] = true;
        }
        break;
    }
  }

  /**
   * 检查并执行重置（使用自然日边界）
   */
  private checkAndReset() {
    const now = Date.now();

    // 每日重置：使用自然日（凌晨 0 点）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    if (this.lastDailyReset < todayStart) {
      this.resetDailyGoals();
      this.lastDailyReset = todayStart;
    }

    // 每周重置：使用周一 0 点
    const thisWeek = new Date();
    const dayOfWeek = thisWeek.getDay();  // 0=周日，1=周一...
    const daysToMonday = dayOfWeek === 0 ? 6 : (dayOfWeek - 1);
    thisWeek.setDate(thisWeek.getDate() - daysToMonday);
    thisWeek.setHours(0, 0, 0, 0);
    const weekStart = thisWeek.getTime();

    if (this.lastWeeklyReset < weekStart) {
      this.resetWeeklyGoals();
      this.lastWeeklyReset = weekStart;
    }
  }

  /**
   * 重置每日目标
   */
  private resetDailyGoals() {
    let resetCount = 0;
    for (const config of GOAL_CONFIGS) {
      if (config.type === 'daily') {
        const progress = this.goals[config.id];
        if (progress && progress.status !== 'locked') {
          // 已完成但未领取的保持完成状态
          if (progress.status !== 'completed') {
            progress.currentValue = 0;
            progress.status = 'active';
            resetCount++;
          }
          delete progress.claimedAt;
        }
      }
    }
    if (resetCount > 0) {
      console.log('GoalManager: 每日目标已重置，重置了', resetCount, '个');
    }
  }

  /**
   * 重置每周目标
   */
  private resetWeeklyGoals() {
    let resetCount = 0;
    for (const config of GOAL_CONFIGS) {
      if (config.type === 'weekly') {
        const progress = this.goals[config.id];
        if (progress && progress.status !== 'locked') {
          if (progress.status !== 'completed') {
            progress.currentValue = 0;
            progress.status = 'active';
            resetCount++;
          }
          delete progress.claimedAt;
        }
      }
    }
    if (resetCount > 0) {
      console.log('GoalManager: 每周目标已重置，重置了', resetCount, '个');
    }
  }

  /**
   * 获取所有目标（按优先级排序）
   */
  getAllGoals(): Goal[] {
    const goals = GOAL_CONFIGS.map((config) => {
      const progress = this.goals[config.id] || { currentValue: 0, status: 'active' };
      const isUnlocked = this.unlockFlags[config.id] !== false;

      return {
        ...config,
        currentValue: progress.currentValue,
        status: isUnlocked ? progress.status : 'locked',
        startTime: this.lastDailyReset,
        endTime: config.type === 'daily'
          ? this.lastDailyReset + 24 * 60 * 60 * 1000
          : config.type === 'weekly'
            ? this.lastWeeklyReset + 7 * 24 * 60 * 60 * 1000
            : undefined,
        resetCycle: config.type === 'daily' || config.type === 'weekly' ? config.type : undefined,
        priority: config.priority || 0,
      };
    });

    // 排序：可领取 > 进行中 > 已领取 > 锁定
    return goals.sort((a, b) => {
      // 优先级排序（可领取置顶）
      const statusPriority: Record<GoalStatus, number> = {
        'completed': 3,
        'active': 2,
        'claimed': 1,
        'locked': 0,
      };

      const aPriority = statusPriority[a.status] * 100 + (a.priority || 0);
      const bPriority = statusPriority[b.status] * 100 + (b.priority || 0);

      return bPriority - aPriority;
    });
  }

  /**
   * 按类型获取目标
   */
  getGoalsByType(type: GoalType): Goal[] {
    return this.getAllGoals().filter((goal) => goal.type === type);
  }

  /**
   * 获取活跃目标
   */
  getActiveGoals(): Goal[] {
    return this.getAllGoals().filter((goal) =>
      goal.status === 'active' || goal.status === 'completed'
    );
  }

  /**
   * 获取可领取奖励的目标
   */
  getClaimableGoals(): Goal[] {
    return this.getAllGoals().filter((goal) => goal.status === 'completed');
  }

  /**
   * 获取红点状态
   */
  getRedDotState(): RedDotState {
    const claimableGoals = this.getClaimableGoals();
    return {
      hasClaimableGoal: claimableGoals.length > 0,
      claimableCount: claimableGoals.length,
      hasNewUnlock: this.checkNewUnlock(),
    };
  }

  /**
   * 检查是否有新解锁
   */
  private checkNewUnlock(): boolean {
    // 简化实现：检查是否有成就从未解锁变为解锁
    for (const config of GOAL_CONFIGS) {
      if (config.isHidden && this.unlockFlags[config.id]) {
        const progress = this.goals[config.id];
        if (progress && progress.unlockedAt && Date.now() - progress.unlockedAt < 60000) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 更新目标进度
   * @param goalId 目标 ID
   * @param delta 进度增量
   * @param isRewardCoins 是否为奖励金币（true 时不计入成就）
   */
  updateProgress(goalId: string, delta: number = 1, isRewardCoins: boolean = false) {
    const config = GOAL_CONFIGS.find((g) => g.id === goalId);
    if (!config) return;

    const progress = this.goals[goalId];
    if (!progress) return;

    // 已完成或已领取的目标不再更新
    if (progress.status === 'completed' || progress.status === 'claimed') return;

    // 解锁检查
    if (!this.unlockFlags[config.id]) {
      this.checkVisibilityCondition(config);
      if (!this.unlockFlags[config.id]) return;
    }

    // 更新进度
    if (config.progressType === 'accumulate') {
      // 累计类型：奖励金币不计入（防止膨胀）
      if (isRewardCoins) return;
      progress.currentValue += delta;
    } else {
      progress.currentValue = Math.min(progress.currentValue + delta, config.targetValue);
    }

    // 检查是否完成
    if (progress.currentValue >= config.targetValue) {
      progress.status = 'completed';
      this.onGoalCompleted({
        goalId: config.id,
        goalName: config.name,
        rewardCoins: config.rewardCoins,
        rewardEnergy: config.rewardEnergy,
        isClaimable: true,
      });
    }

    console.log(`GoalManager: ${config.name} 进度 ${progress.currentValue}/${config.targetValue}`);
  }

  /**
   * 按条件更新目标进度
   * @param condition 条件标识
   * @param delta 进度增量
   * @param isRewardCoins 是否为奖励金币
   */
  updateProgressByCondition(condition: string, delta: number = 1, isRewardCoins: boolean = false) {
    for (const config of GOAL_CONFIGS) {
      if (this.matchesCondition(config, condition)) {
        this.updateProgress(config.id, delta, isRewardCoins);
      }
    }
  }

  /**
   * 判断配置是否匹配条件
   */
  private matchesCondition(config: GoalConfig, condition: string): boolean {
    const conditionMap: Record<string, string[]> = {
      'catch_fish': ['daily_catch_3', 'daily_catch_10', 'weekly_catch_50'],
      'catch_good_fish': ['daily_good_fish'],
      'catch_perfect': ['daily_perfect'],
      'catch_rare': ['weekly_rare_fish'],
      'catch_legend': ['achievement_legend_catch'],
      'catch_trash': ['achievement_trash_master'],
      'combo_5': ['achievement_combo_5'],
      'earn_coins': ['achievement_rich'],
      'first_catch': ['achievement_first_blood'],
    };

    const goalIds = conditionMap[condition] || [];
    return goalIds.includes(config.id);
  }

  /**
   * 目标完成回调
   */
  private onGoalCompleted(data: GoalCompletedData) {
    console.log(`GoalManager: 目标完成！${data.goalName}`);
    this.onGoalCompletedCallback?.(data);
  }

  /**
   * 设置目标完成回调
   */
  setOnGoalCompleted(callback: (data: GoalCompletedData) => void) {
    this.onGoalCompletedCallback = callback;
  }

  /**
   * 领取目标奖励
   * @param goalId 目标 ID
   * @returns 是否领取成功
   */
  claimReward(goalId: string): boolean {
    const config = GOAL_CONFIGS.find((g) => g.id === goalId);
    if (!config) return false;

    const progress = this.goals[goalId];
    if (!progress || progress.status !== 'completed') return false;

    // 发放奖励（标记为奖励金币，不计入成就）
    CoinManager.instance.addCoins(config.rewardCoins, true);
    if (config.rewardEnergy) {
      EnergyManager.instance.addEnergy(config.rewardEnergy);
    }

    // 标记为已领取
    progress.status = 'claimed';
    progress.claimedAt = Date.now();

    console.log(`GoalManager: 已领取奖励 ${config.name}: ${config.rewardCoins}金币${config.rewardEnergy ? ` +${config.rewardEnergy}体力` : ''}`);
    return true;
  }

  /**
   * 获取存档数据
   */
  getSaveData(): GoalSaveData {
    return {
      goals: { ...this.goals },
      lastDailyReset: this.lastDailyReset,
      lastWeeklyReset: this.lastWeeklyReset,
      unlockFlags: { ...this.unlockFlags },
    };
  }

  /**
   * 获取调试信息
   */
  getDebugInfo() {
    return {
      totalGoals: GOAL_CONFIGS.length,
      activeGoals: this.getActiveGoals().length,
      claimableGoals: this.getClaimableGoals().length,
      lastDailyReset: new Date(this.lastDailyReset).toLocaleDateString(),
      lastWeeklyReset: new Date(this.lastWeeklyReset).toLocaleDateString(),
      isInitialized: this.isInitialized,
    };
  }

  /**
   * 重置所有目标（调试用）
   */
  resetAll() {
    this.goals = {};
    this.lastDailyReset = 0;
    this.lastWeeklyReset = 0;
    this.unlockFlags = {};
    this.isInitialized = false;
    this.ensureAllGoalsInitialized();
    console.log('GoalManager: 所有目标已重置');
  }

  /**
   * 强制刷新解锁状态（用于调试）
   */
  refreshUnlocks() {
    for (const config of GOAL_CONFIGS) {
      this.checkVisibilityCondition(config);
    }
  }
}
