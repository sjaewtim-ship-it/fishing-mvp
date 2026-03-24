/**
 * RoundResult - 钓鱼回合结算数据结构
 * 
 * 用途：
 * - 统一一局钓鱼的结算数据
 * - 为爆点系统、广告触发、ResultScene 重构提供标准数据源
 * 
 * 注意：
 * - 本轮只做数据层定义，不做 UI 改造
 * - 所有字段必须有兜底值
 */

/** 渔获类型 */
export type CatchType = 'fish' | 'junk' | 'none';

/** 稀有度（统一口径） */
export type RarityType = 'common' | 'rare' | 'epic' | 'legendary';

/** 成功类型（拉杆时机判定） */
export type SuccessType = 'perfect' | 'good' | 'early' | 'late' | 'miss';

/**
 * 回合结算结果
 */
export interface RoundResult {
  /** 渔获类型：fish=鱼，junk=垃圾/离谱物，none=失败无渔获 */
  catchType: CatchType;

  /** 物品 ID（本轮用 name 兜底） */
  itemId: string;

  /** 物品名称 */
  itemName: string;

  /** 稀有度（统一口径） */
  rarity: RarityType;

  /** 离谱物标签（内裤/螃蟹/乌龟等） */
  absurdTag?: string | null;

  /** 成功类型（拉杆时机） */
  successType: SuccessType;

  /** 连击数 */
  comboCount: number;

  /** 基础金币（未翻倍） */
  baseCoins: number;

  /** 最终金币（可能含完美加成） */
  finalCoins: number;

  /** 是否可复活（失败时可用） */
  canRevive: boolean;

  /** 是否可翻倍奖励（看广告） */
  canDoubleReward: boolean;

  /** 高亮文案（用于分享/爆点） */
  highlightText: string;
}

/**
 * 根据 DropItem 生成 RoundResult
 * 
 * @param drop - 掉落物品
 * @param perfect - 是否完美命中
 * @param combo - 连击数
 * @param failReason - 失败原因（失败时传入）
 * @returns RoundResult
 */
export function buildRoundResult(
  drop: { name: string; type: string; reward: number; flavor?: string } | null,
  perfect: boolean,
  combo: number,
  failReason?: 'early' | 'too_early' | 'late'
): RoundResult {
  // 失败情况
  if (!drop || failReason) {
    return {
      catchType: 'none',
      itemId: 'none',
      itemName: '无',
      rarity: 'common',
      absurdTag: null,
      successType: failReason ?? 'miss',
      comboCount: combo,
      baseCoins: 0,
      finalCoins: 0,
      canRevive: failReason === 'early' || failReason === 'late',
      canDoubleReward: false,
      highlightText: '',
    };
  }

  // 映射稀有度
  const rarity = mapRarity(drop.type, drop.name);

  // 映射渔获类型
  const catchType: CatchType = drop.type === 'trash' ? 'junk' : 'fish';

  // 离谱物标签
  const absurdTag = getAbsurdTag(drop.type, drop.name);

  // 成功类型
  const successType: SuccessType = perfect ? 'perfect' : 'good';

  // 金币
  const baseCoins = drop.reward;
  const finalCoins = perfect ? Math.round(drop.reward * 1.25) : drop.reward;

  // 高亮文案
  const highlightText = buildHighlightText(rarity, absurdTag, combo);

  return {
    catchType,
    itemId: drop.name,
    itemName: drop.name,
    rarity,
    absurdTag,
    successType,
    comboCount: combo,
    baseCoins,
    finalCoins,
    canRevive: false,
    canDoubleReward: rarity === 'rare' || rarity === 'epic' || rarity === 'legendary',
    highlightText,
  };
}

/**
 * 映射稀有度（统一口径）
 */
function mapRarity(dropType: string, name: string): RarityType {
  // 传说鱼 → legendary
  if (dropType === 'legend') {
    return 'legendary';
  }

  // 离谱物 → epic
  const premiumTrash = ['内裤', '螃蟹', '乌龟'];
  if (dropType === 'trash' && premiumTrash.includes(name)) {
    return 'epic';
  }

  // 普通垃圾 → common
  if (dropType === 'trash') {
    return 'common';
  }

  // 稀有鱼 → rare
  const rareFish = ['锦鲤', '巨型草鱼'];
  if (rareFish.includes(name)) {
    return 'rare';
  }

  // 优质鱼 → common（MVP 版先归为 common）
  return 'common';
}

/**
 * 获取离谱物标签
 */
function getAbsurdTag(dropType: string, name: string): string | null {
  const premiumTrash = ['内裤', '螃蟹', '乌龟'];
  if (dropType === 'trash' && premiumTrash.includes(name)) {
    return 'absurd';
  }
  return null;
}

/**
 * 构建高亮文案
 */
function buildHighlightText(
  rarity: RarityType,
  absurdTag: string | null,
  combo: number
): string {
  if (rarity === 'legendary') {
    return '这也能钓到？！';
  }
  if (rarity === 'epic') {
    return '今天运气爆炸';
  }
  if (absurdTag) {
    return '你钓上来个啥？？';
  }
  if (combo >= 3) {
    return '连着上鱼了！';
  }
  return '';
}
