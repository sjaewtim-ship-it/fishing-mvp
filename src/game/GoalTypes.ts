/**
 * 目标系统类型定义 v2.0
 */

// 目标类型
export type GoalType = 'daily' | 'weekly' | 'achievement' | 'event' | 'season';

// 目标进度类型
export type ProgressType = 'count' | 'accumulate';

// 目标状态
export type GoalStatus = 'locked' | 'active' | 'completed' | 'claimed';

// 目标分组
export type GoalGroupId = 'fishing' | 'rare' | 'legend' | 'trash' | 'combo' | 'coins' | 'special';

// 可见性条件
export type VisibleCondition = 'always' | 'after_first_catch' | 'after_rare_catch' | 'after_legend_catch';

// 跳转动作
export type JumpAction = 'none' | 'fishing_scene' | 'shop' | 'goal_detail';

/**
 * 目标定义
 */
export interface Goal {
  id: string;
  type: GoalType;
  name: string;
  description: string;
  icon: string;

  // 进度目标
  progressType: ProgressType;
  targetValue: number;
  currentValue: number;

  // 奖励
  rewardCoins: number;
  rewardEnergy?: number;

  // 状态
  status: GoalStatus;

  // 时间相关
  startTime?: number;
  endTime?: number;
  resetCycle?: 'daily' | 'weekly';

  // 元数据
  sortOrder: number;
  isHidden: boolean;
  unlockCondition?: string;

  // v2.0 扩展字段
  groupId?: GoalGroupId;           // 分组 ID（用于分类展示）
  priority?: number;                // 优先级（数字越大越优先，用于可领取置顶）
  visibleCondition?: VisibleCondition;  // 可见性条件
  jumpAction?: JumpAction;          // 点击跳转动作
  isTimeLimited?: boolean;          // 是否限时
  eventId?: string;                 // 关联活动 ID（活动任务用）
  seasonId?: string;                // 关联赛季 ID（赛季任务用）
}

/**
 * 目标完成回调数据
 */
export interface GoalCompletedData {
  goalId: string;
  goalName: string;
  rewardCoins: number;
  rewardEnergy?: number;
  isClaimable: boolean;
}

/**
 * 存档中的目标数据
 */
export interface GoalSaveData {
  goals: Record<string, GoalProgress>;
  lastDailyReset: number;
  lastWeeklyReset: number;
  unlockFlags: Record<string, boolean>;  // 解锁标记
}

/**
 * 单个目标的进度数据（存档用）
 */
export interface GoalProgress {
  currentValue: number;
  status: GoalStatus;
  claimedAt?: number;
  unlockedAt?: number;
}

/**
 * 目标配置（静态定义）
 */
export interface GoalConfig {
  id: string;
  type: GoalType;
  name: string;
  description: string;
  icon: string;
  progressType: ProgressType;
  targetValue: number;
  rewardCoins: number;
  rewardEnergy?: number;
  sortOrder: number;
  isHidden?: boolean;
  unlockCondition?: string;

  // v2.0 扩展字段
  groupId?: GoalGroupId;
  priority?: number;
  visibleCondition?: VisibleCondition;
  jumpAction?: JumpAction;
  isTimeLimited?: boolean;
  eventId?: string;
  seasonId?: string;
}

/**
 * 红点状态
 */
export interface RedDotState {
  hasClaimableGoal: boolean;
  claimableCount: number;
  hasNewUnlock: boolean;
}
