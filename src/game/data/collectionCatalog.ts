/**
 * 图鉴静态数据源
 * 
 * 与 DropGenerator 分离，独立管理图鉴展示数据
 */

export type CollectionCategory = 'fish' | 'rare' | 'weird' | 'legend';
export type CollectionRarity = 'N' | 'R' | 'SR' | 'SSR';

export interface CollectionCatalogItem {
  id: string;
  name: string;
  category: CollectionCategory;
  rarity: CollectionRarity;
  emoji: string;
  reward: number;
  flavor: string;
}

/**
 * 图鉴静态数据（21 种）
 * 基于 DropGenerator 现有物品整理，但独立维护
 */
export const collectionCatalog: CollectionCatalogItem[] = [
  // ==================== 普通鱼 (9 种) ====================
  { id: 'fish_001', name: '小鲫鱼', category: 'fish', rarity: 'N', emoji: '🐟', reward: 6, flavor: '这一杆挺稳' },
  { id: 'fish_002', name: '小鲤鱼', category: 'fish', rarity: 'N', emoji: '🐟', reward: 7, flavor: '开局还不错' },
  { id: 'fish_003', name: '罗非鱼', category: 'fish', rarity: 'N', emoji: '🐠', reward: 8, flavor: '今天有点手感' },
  { id: 'fish_004', name: '草鱼', category: 'fish', rarity: 'N', emoji: '🐟', reward: 9, flavor: '正常发挥' },
  { id: 'fish_005', name: '鲶鱼', category: 'fish', rarity: 'N', emoji: '🐟', reward: 10, flavor: '有点分量了' },
  { id: 'fish_006', name: '大鲤鱼', category: 'fish', rarity: 'R', emoji: '🐠', reward: 16, flavor: '这一杆明显更值钱' },
  { id: 'fish_007', name: '黑鱼', category: 'fish', rarity: 'R', emoji: '🐟', reward: 18, flavor: '手气开始起来了' },
  { id: 'fish_008', name: '鲈鱼', category: 'fish', rarity: 'R', emoji: '🐠', reward: 20, flavor: '这杆不亏' },
  { id: 'fish_009', name: '金鲫鱼', category: 'fish', rarity: 'R', emoji: '🐡', reward: 24, flavor: '金色的，有点东西' },

  // ==================== 稀有鱼 (4 种) ====================
  { id: 'rare_001', name: '锦鲤', category: 'rare', rarity: 'SR', emoji: '🐠', reward: 36, flavor: '这条有点稀有' },
  { id: 'rare_002', name: '巨型草鱼', category: 'rare', rarity: 'SR', emoji: '🐟', reward: 42, flavor: '这体型有点夸张' },
  { id: 'rare_003', name: '龙鱼', category: 'rare', rarity: 'SR', emoji: '🐉', reward: 120, flavor: '这条鱼不一般' },
  { id: 'rare_004', name: '黄金锦鲤', category: 'rare', rarity: 'SR', emoji: '🐠', reward: 200, flavor: '我直接欧皇了？？？' },

  // ==================== 离谱物 (6 种) ====================
  { id: 'weird_001', name: '破袜子', category: 'weird', rarity: 'N', emoji: '🧦', reward: 15, flavor: '这谁的袜子？？？' },
  { id: 'weird_002', name: '拖鞋', category: 'weird', rarity: 'N', emoji: '🩴', reward: 16, flavor: '另一只去哪了？' },
  { id: 'weird_003', name: '树枝', category: 'weird', rarity: 'N', emoji: '🪵', reward: 10, flavor: '这也算收获吗…' },
  { id: 'weird_004', name: '内裤', category: 'weird', rarity: 'SR', emoji: '🩲', reward: 18, flavor: '这水里到底发生过什么…' },
  { id: 'weird_005', name: '螃蟹', category: 'weird', rarity: 'SR', emoji: '🦀', reward: 40, flavor: '今晚加餐有了' },
  { id: 'weird_006', name: '乌龟', category: 'weird', rarity: 'SR', emoji: '🐢', reward: 45, flavor: '这也能钓上来？？？' },

  // ==================== 传说 (2 种) ====================
  { id: 'legend_001', name: '钻石戒指', category: 'legend', rarity: 'SSR', emoji: '💍', reward: 320, flavor: '我直接欧皇了？？？' },
  { id: 'legend_002', name: '神秘宝箱', category: 'legend', rarity: 'SSR', emoji: '📦', reward: 280, flavor: '命运开始改变了' },
];

/**
 * 按分类获取物品
 */
export function getCatalogByCategory(category: CollectionCategory): CollectionCatalogItem[] {
  return collectionCatalog.filter(item => item.category === category);
}

/**
 * 根据名称查找物品
 */
export function getCatalogItemByName(name: string): CollectionCatalogItem | undefined {
  return collectionCatalog.find(item => item.name === name);
}

/**
 * 图鉴总数
 */
export const TOTAL_COLLECTION_COUNT = collectionCatalog.length;
