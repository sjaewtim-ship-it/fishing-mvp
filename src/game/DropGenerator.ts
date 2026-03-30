import { DirectorSystem } from './DirectorSystem';

export type DropItem = {
  name: string;
  type: 'fish' | 'trash' | 'legend';
  reward: number;
  flavor: string;
  isFish?: boolean;  // 是否为鱼类（用于重量统计）
  minWeightGrams?: number;  // 最小重量（克）
  maxWeightGrams?: number;  // 最大重量（克）
  weightGrams?: number;  // 本次掉落实际重量（克，生成时随机）
};

export type DropCategory = 'fish' | 'trash' | 'legend' | 'random';

// --------------------
// 鱼类分层（MVP版）
// --------------------

// 普通鱼：稳定出货
const commonFish: DropItem[] = [
  { name: '小鲫鱼', type: 'fish', reward: 6, flavor: '这一杆挺稳', isFish: true, minWeightGrams: 50, maxWeightGrams: 200 },
  { name: '小鲤鱼', type: 'fish', reward: 7, flavor: '开局还不错', isFish: true, minWeightGrams: 100, maxWeightGrams: 300 },
  { name: '罗非鱼', type: 'fish', reward: 8, flavor: '今天有点手感', isFish: true, minWeightGrams: 200, maxWeightGrams: 500 },
  { name: '草鱼', type: 'fish', reward: 9, flavor: '正常发挥', isFish: true, minWeightGrams: 500, maxWeightGrams: 1500 },
  { name: '鲶鱼', type: 'fish', reward: 10, flavor: '有点分量了', isFish: true, minWeightGrams: 800, maxWeightGrams: 2000 },
];

// 优质鱼：小爽点
const goodFish: DropItem[] = [
  { name: '大鲤鱼', type: 'fish', reward: 16, flavor: '这一杆明显更值钱', isFish: true, minWeightGrams: 1000, maxWeightGrams: 3000 },
  { name: '黑鱼', type: 'fish', reward: 18, flavor: '手气开始起来了', isFish: true, minWeightGrams: 800, maxWeightGrams: 2500 },
  { name: '鲈鱼', type: 'fish', reward: 20, flavor: '这杆不亏', isFish: true, minWeightGrams: 600, maxWeightGrams: 2000 },
  { name: '金鲫鱼', type: 'fish', reward: 24, flavor: '金色的，有点东西', isFish: true, minWeightGrams: 300, maxWeightGrams: 800 },
];

// 稀有鱼：中爽点
const rareFish: DropItem[] = [
  { name: '锦鲤', type: 'fish', reward: 36, flavor: '这条有点稀有', isFish: true, minWeightGrams: 500, maxWeightGrams: 1500 },
  { name: '巨型草鱼', type: 'fish', reward: 42, flavor: '这体型有点夸张', isFish: true, minWeightGrams: 3000, maxWeightGrams: 8000 },
];

// 传说鱼：鱼类里的大爽点
const mythFish: DropItem[] = [
  { name: '龙鱼', type: 'legend', reward: 120, flavor: '这条鱼不一般', isFish: true, minWeightGrams: 2000, maxWeightGrams: 5000 },
  { name: '黄金锦鲤', type: 'legend', reward: 200, flavor: '我直接欧皇了？？？', isFish: true, minWeightGrams: 1000, maxWeightGrams: 3000 },
];

// 离谱物：精简版
const lightTrashItems: DropItem[] = [
  { name: '破袜子', type: 'trash', reward: 15, flavor: '这谁的袜子？？？' },
  { name: '拖鞋', type: 'trash', reward: 16, flavor: '另一只去哪了？' },
  { name: '树枝', type: 'trash', reward: 10, flavor: '这也算收获吗…' },
];

const strongTrashItems: DropItem[] = [
  { name: '内裤', type: 'trash', reward: 18, flavor: '这水里到底发生过什么…' },
  { name: '螃蟹', type: 'trash', reward: 40, flavor: '今晚加餐有了' },
  { name: '乌龟', type: 'trash', reward: 45, flavor: '这也能钓上来？？？' },
];

// 神物：去掉金条
const legendItems: DropItem[] = [
  { name: '钻石戒指', type: 'legend', reward: 320, flavor: '我直接欧皇了？？？' },
  { name: '神秘宝箱', type: 'legend', reward: 280, flavor: '命运开始改变了' },
];

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * 在鱼类重量区间内随机生成重量（克）
 */
function generateWeight(item: DropItem): number | undefined {
  if (!item.isFish || item.minWeightGrams == null || item.maxWeightGrams == null) {
    return undefined;
  }
  const min = item.minWeightGrams;
  const max = item.maxWeightGrams;
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * 格式化重量显示
 * @param weightGrams 重量（克）
 * @returns 格式化后的字符串，如 "368g" 或 "1.24kg"
 */
export function formatWeight(weightGrams: number | undefined): string {
  if (weightGrams == null || weightGrams <= 0) {
    return '';
  }
  if (weightGrams < 1000) {
    return `${weightGrams}g`;
  }
  return `${(weightGrams / 1000).toFixed(2)}kg`;
}

/**
 * 格式化任务重量进度文案
 * @param progressGrams 当前进度（克）
 * @param targetGrams 目标值（克）
 * @returns 格式化后的字符串，如 "200g/1000g" 或 "0.2kg/1kg"
 */
export function formatTaskWeightProgress(progressGrams: number | undefined, targetGrams: number | undefined): string {
  const progress = progressGrams ?? 0;
  const target = targetGrams ?? 0;
  
  if (target <= 0) {
    return '0/0';
  }
  
  // 如果目标值 >= 1000g，使用 kg 单位显示
  if (target >= 1000) {
    const progressKg = progress / 1000;
    const targetKg = target / 1000;
    // 去掉多余的小数位，但保留至少一位小数
    const progressStr = progressKg % 1 === 0 ? progressKg.toFixed(0) : progressKg.toFixed(1);
    const targetStr = targetKg % 1 === 0 ? targetKg.toFixed(0) : targetKg.toFixed(1);
    return `${progressStr}kg/${targetStr}kg`;
  }
  
  // 否则使用 g 单位显示
  return `${progress}g/${target}g`;
}

function allLegendPool(): DropItem[] {
  return [...mythFish, ...legendItems];
}

export class DropGenerator {
  static generateByCategory(category: DropCategory = 'random'): DropItem {
    switch (category) {
      case 'fish':
        return this.generateFishOnly();
      case 'trash':
        return this.generateTrash();
      case 'legend':
        return this.generateLegend();
      case 'random':
      default:
        return this.generate();
    }
  }

  static generateFishOnly(): DropItem {
    const combo = DirectorSystem.getCombo();
    let result: DropItem;

    if (combo >= 5) {
      result = DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(goodFish), weight: 38 },
        { item: randomFrom(rareFish), weight: 36 },
        { item: randomFrom(mythFish), weight: 26 },
      ]);
    } else if (combo >= 3) {
      result = DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(commonFish), weight: 28 },
        { item: randomFrom(goodFish), weight: 42 },
        { item: randomFrom(rareFish), weight: 22 },
        { item: randomFrom(mythFish), weight: 8 },
      ]);
    } else {
      result = DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(commonFish), weight: 56 },
        { item: randomFrom(goodFish), weight: 28 },
        { item: randomFrom(rareFish), weight: 12 },
        { item: randomFrom(mythFish), weight: 4 },
      ]);
    }

    // 生成重量
    result.weightGrams = generateWeight(result);
    return result;
  }

  static generateTrash(): DropItem {
    return Math.random() < 0.45
      ? randomFrom(lightTrashItems)
      : randomFrom(strongTrashItems);
  }

  static generateLegend(): DropItem {
    return randomFrom(allLegendPool());
  }

  static generateSafeFish(): DropItem {
    const result = DirectorSystem.pickWeighted<DropItem>([
      { item: randomFrom(commonFish), weight: 72 },
      { item: randomFrom(goodFish), weight: 24 },
      { item: randomFrom(rareFish), weight: 4 },
    ]);
    result.weightGrams = generateWeight(result);
    return result;
  }

  static generateInteresting(): DropItem {
    const combo = DirectorSystem.getCombo();
    let result: DropItem;

    if (combo >= 4) {
      result = DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(goodFish), weight: 18 },
        { item: randomFrom(rareFish), weight: 24 },
        { item: randomFrom(strongTrashItems), weight: 36 },
        { item: randomFrom(allLegendPool()), weight: 22 },
      ]);
    } else {
      result = DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(goodFish), weight: 20 },
        { item: randomFrom(rareFish), weight: 14 },
        { item: randomFrom(strongTrashItems), weight: 46 },
        { item: randomFrom(allLegendPool()), weight: 20 },
      ]);
    }

    // 生成重量（如果是鱼）
    result.weightGrams = generateWeight(result);
    return result;
  }

  static generateGoodShot(): DropItem {
    const combo = DirectorSystem.getCombo();
    let result: DropItem;

    if (combo >= 3) {
      result = DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(goodFish), weight: 36 },
        { item: randomFrom(rareFish), weight: 28 },
        { item: randomFrom(mythFish), weight: 18 },
        { item: randomFrom(strongTrashItems), weight: 12 },
        { item: randomFrom(legendItems), weight: 6 },
      ]);
    } else {
      result = DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(goodFish), weight: 42 },
        { item: randomFrom(rareFish), weight: 24 },
        { item: randomFrom(mythFish), weight: 10 },
        { item: randomFrom(strongTrashItems), weight: 18 },
        { item: randomFrom(legendItems), weight: 6 },
      ]);
    }

    // 生成重量（如果是鱼）
    result.weightGrams = generateWeight(result);
    return result;
  }

  static generate(): DropItem {
    const combo = DirectorSystem.getCombo();
    let result: DropItem;

    // normal 桶高连击收口：只允许 mythFish（龙鱼/黄金锦鲤），不允许 legendItems（钻石戒指/神秘宝箱）
    // legend 应该主要通过 kind=legend 或 kind=interesting 产出，而不是 normal 桶直接爆
    if (combo >= 5) {
      result = DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(commonFish), weight: 28 },
        { item: randomFrom(goodFish), weight: 30 },
        { item: randomFrom(rareFish), weight: 20 },
        { item: randomFrom(lightTrashItems), weight: 8 },
        { item: randomFrom(strongTrashItems), weight: 10 },
        { item: randomFrom(mythFish), weight: 4 },  // 仅 mythFish，权重很低
      ]);
    } else if (combo >= 3) {
      result = DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(commonFish), weight: 36 },
        { item: randomFrom(goodFish), weight: 26 },
        { item: randomFrom(rareFish), weight: 16 },
        { item: randomFrom(lightTrashItems), weight: 8 },
        { item: randomFrom(strongTrashItems), weight: 12 },
        { item: randomFrom(mythFish), weight: 2 },  // 仅 mythFish，权重极低
      ]);
    } else {
      // base normal 桶（combo 0-2）：彻底收口，不使用 allLegendPool，仅 mythFish 2%
      // 保留"偶尔有惊喜"体感，但不破坏 normal 桶定义
      result = DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(commonFish), weight: 46 },
        { item: randomFrom(goodFish), weight: 22 },
        { item: randomFrom(rareFish), weight: 10 },
        { item: randomFrom(lightTrashItems), weight: 8 },
        { item: randomFrom(strongTrashItems), weight: 12 },
        { item: randomFrom(mythFish), weight: 2 },  // 仅 mythFish，权重极低
      ]);
    }

    // 生成重量（如果是鱼）
    result.weightGrams = generateWeight(result);
    return result;
  }
}

/**
 * 统一稀有度映射（供 RoundResult 使用）
 * 
 * @param dropType - 掉落类型
 * @param name - 物品名称
 * @returns 稀有度
 */
export function getRarity(dropType: string, name: string): 'common' | 'rare' | 'epic' | 'legendary' {
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

  // 优质鱼/普通鱼 → common
  return 'common';
}
