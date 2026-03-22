import { DirectorSystem } from './DirectorSystem';

export type DropItem = {
  name: string;
  type: 'fish' | 'trash' | 'legend';
  reward: number;
  flavor: string;
};

export type DropCategory = 'fish' | 'trash' | 'legend' | 'random';

// --------------------
// 鱼类分层（MVP版）
// --------------------

// 普通鱼：稳定出货
const commonFish: DropItem[] = [
  { name: '小鲫鱼', type: 'fish', reward: 6, flavor: '这一杆挺稳' },
  { name: '小鲤鱼', type: 'fish', reward: 7, flavor: '开局还不错' },
  { name: '罗非鱼', type: 'fish', reward: 8, flavor: '今天有点手感' },
  { name: '草鱼', type: 'fish', reward: 9, flavor: '正常发挥' },
  { name: '鲶鱼', type: 'fish', reward: 10, flavor: '有点分量了' },
];

// 优质鱼：小爽点
const goodFish: DropItem[] = [
  { name: '大鲤鱼', type: 'fish', reward: 16, flavor: '这一杆明显更值钱' },
  { name: '黑鱼', type: 'fish', reward: 18, flavor: '手气开始起来了' },
  { name: '鲈鱼', type: 'fish', reward: 20, flavor: '这杆不亏' },
  { name: '金鲫鱼', type: 'fish', reward: 24, flavor: '金色的，有点东西' },
];

// 稀有鱼：中爽点
const rareFish: DropItem[] = [
  { name: '锦鲤', type: 'fish', reward: 36, flavor: '这条有点稀有' },
  { name: '巨型草鱼', type: 'fish', reward: 42, flavor: '这体型有点夸张' },
];

// 传说鱼：鱼类里的大爽点
const mythFish: DropItem[] = [
  { name: '龙鱼', type: 'legend', reward: 120, flavor: '这条鱼不一般' },
  { name: '黄金锦鲤', type: 'legend', reward: 200, flavor: '我直接欧皇了？？？' },
];

// 离谱物：情绪爆点
const lightTrashItems: DropItem[] = [
  { name: '塑料袋', type: 'trash', reward: 12, flavor: '环保警告出现了' },
  { name: '破袜子', type: 'trash', reward: 15, flavor: '这谁的袜子？？？' },
  { name: '拖鞋', type: 'trash', reward: 16, flavor: '另一只去哪了？' },
  { name: '树枝', type: 'trash', reward: 10, flavor: '这也算收获吗…' },
];

const strongTrashItems: DropItem[] = [
  { name: '内裤', type: 'trash', reward: 18, flavor: '这水里到底发生过什么…' },
  { name: '盲盒', type: 'trash', reward: 28, flavor: '这玩意居然从水里出来？' },
  { name: 'iPhone', type: 'trash', reward: 35, flavor: '还能开机就离谱了' },
  { name: '电饭煲', type: 'trash', reward: 26, flavor: '今晚能直接开饭？' },
  { name: '螃蟹', type: 'trash', reward: 40, flavor: '今晚加餐有了' },
  { name: '乌龟', type: 'trash', reward: 45, flavor: '这也能钓上来？？？' },
  { name: '泥鳅', type: 'trash', reward: 14, flavor: '这也算收获吗…' },
];

// 神物：非鱼类大爽点
const legendItems: DropItem[] = [
  { name: '金条', type: 'legend', reward: 260, flavor: '今天手气爆炸' },
  { name: '钻石戒指', type: 'legend', reward: 320, flavor: '我直接欧皇了？？？' },
  { name: '神秘宝箱', type: 'legend', reward: 280, flavor: '命运开始改变了' },
];

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function allFishPool(): DropItem[] {
  return [...commonFish, ...goodFish, ...rareFish];
}

function allLegendPool(): DropItem[] {
  return [...mythFish, ...legendItems];
}

export class DropGenerator {
  // 兼容旧调用
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

  // 鱼类专用随机
  static generateFishOnly(): DropItem {
    const combo = DirectorSystem.getCombo();

    if (combo >= 5) {
      return DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(goodFish), weight: 38 },
        { item: randomFrom(rareFish), weight: 36 },
        { item: randomFrom(mythFish), weight: 26 },
      ]);
    }

    if (combo >= 3) {
      return DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(commonFish), weight: 28 },
        { item: randomFrom(goodFish), weight: 42 },
        { item: randomFrom(rareFish), weight: 22 },
        { item: randomFrom(mythFish), weight: 8 },
      ]);
    }

    return DirectorSystem.pickWeighted<DropItem>([
      { item: randomFrom(commonFish), weight: 56 },
      { item: randomFrom(goodFish), weight: 28 },
      { item: randomFrom(rareFish), weight: 12 },
      { item: randomFrom(mythFish), weight: 4 },
    ]);
  }

  static generateTrash(): DropItem {
    return Math.random() < 0.35
      ? randomFrom(lightTrashItems)
      : randomFrom(strongTrashItems);
  }

  static generateLegend(): DropItem {
    return randomFrom(allLegendPool());
  }

  // 前期保护：稳稳给鱼
  static generateSafeFish(): DropItem {
    return DirectorSystem.pickWeighted<DropItem>([
      { item: randomFrom(commonFish), weight: 72 },
      { item: randomFrom(goodFish), weight: 24 },
      { item: randomFrom(rareFish), weight: 4 },
    ]);
  }

  // 有趣结果：离谱物 / 稀有鱼 / 神物
  static generateInteresting(): DropItem {
    const combo = DirectorSystem.getCombo();

    if (combo >= 4) {
      return DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(goodFish), weight: 16 },
        { item: randomFrom(rareFish), weight: 22 },
        { item: randomFrom(strongTrashItems), weight: 36 },
        { item: randomFrom(allLegendPool()), weight: 26 },
      ]);
    }

    return DirectorSystem.pickWeighted<DropItem>([
      { item: randomFrom(goodFish), weight: 18 },
      { item: randomFrom(rareFish), weight: 12 },
      { item: randomFrom(strongTrashItems), weight: 50 },
      { item: randomFrom(allLegendPool()), weight: 20 },
    ]);
  }

  // 好货杆：更容易出优质鱼 / 稀有鱼 / 传说鱼
  static generateGoodShot(): DropItem {
    const combo = DirectorSystem.getCombo();

    if (combo >= 3) {
      return DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(goodFish), weight: 34 },
        { item: randomFrom(rareFish), weight: 28 },
        { item: randomFrom(mythFish), weight: 18 },
        { item: randomFrom(strongTrashItems), weight: 12 },
        { item: randomFrom(legendItems), weight: 8 },
      ]);
    }

    return DirectorSystem.pickWeighted<DropItem>([
      { item: randomFrom(goodFish), weight: 40 },
      { item: randomFrom(rareFish), weight: 24 },
      { item: randomFrom(mythFish), weight: 10 },
      { item: randomFrom(strongTrashItems), weight: 18 },
      { item: randomFrom(legendItems), weight: 8 },
    ]);
  }

  // 总随机池：重新平衡鱼类比重，避免“垃圾比鱼更像主角”
  static generate(): DropItem {
    const combo = DirectorSystem.getCombo();

    if (combo >= 5) {
      return DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(commonFish), weight: 20 },
        { item: randomFrom(goodFish), weight: 26 },
        { item: randomFrom(rareFish), weight: 18 },
        { item: randomFrom(lightTrashItems), weight: 10 },
        { item: randomFrom(strongTrashItems), weight: 16 },
        { item: randomFrom(allLegendPool()), weight: 10 },
      ]);
    }

    if (combo >= 3) {
      return DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(commonFish), weight: 28 },
        { item: randomFrom(goodFish), weight: 24 },
        { item: randomFrom(rareFish), weight: 14 },
        { item: randomFrom(lightTrashItems), weight: 10 },
        { item: randomFrom(strongTrashItems), weight: 16 },
        { item: randomFrom(allLegendPool()), weight: 8 },
      ]);
    }

    return DirectorSystem.pickWeighted<DropItem>([
      { item: randomFrom(commonFish), weight: 40 },
      { item: randomFrom(goodFish), weight: 18 },
      { item: randomFrom(rareFish), weight: 8 },
      { item: randomFrom(lightTrashItems), weight: 10 },
      { item: randomFrom(strongTrashItems), weight: 18 },
      { item: randomFrom(allLegendPool()), weight: 6 },
    ]);
  }
}
