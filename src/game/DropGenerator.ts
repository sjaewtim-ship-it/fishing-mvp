import { DirectorSystem } from './DirectorSystem';

export type DropItem = {
  name: string;
  type: 'fish' | 'trash' | 'legend';
  reward: number;
  flavor: string;
};

export type DropCategory = 'fish' | 'trash' | 'legend' | 'random';

// --------------------
// 掉落池（MVP 精简版 · 吐槽风）
// 总计 13 个物品，每一杆都有情绪波动
// --------------------

// 普通鱼：稳但也要有情绪
const commonFish: DropItem[] = [
  { name: '小鲫鱼', type: 'fish', reward: 6, flavor: '行吧，至少不是空气' },
  { name: '小鲤鱼', type: 'fish', reward: 7, flavor: '开局就这样，能忍' },
  { name: '罗非鱼', type: 'fish', reward: 8, flavor: '今天手感就这？' },
  { name: '草鱼', type: 'fish', reward: 9, flavor: '菜市场见多了' },
];

// 优质鱼：小爽点，带点惊喜
const goodFish: DropItem[] = [
  { name: '大鲤鱼', type: 'fish', reward: 16, flavor: '这货能卖个好价钱' },
  { name: '黑鱼', type: 'fish', reward: 18, flavor: '有点凶相，我喜欢' },
  { name: '鲈鱼', type: 'fish', reward: 20, flavor: '今晚加个硬菜' },
];

// 稀有鱼：中爽点，值得截图
const rareFish: DropItem[] = [
  { name: '锦鲤', type: 'fish', reward: 36, flavor: '转发这条能转运吗' },
  { name: '巨型草鱼', type: 'fish', reward: 42, flavor: '这体型是吃激素长大的？' },
];

// 传说鱼：大爽点，必须发朋友圈
const mythFish: DropItem[] = [
  { name: '龙鱼', type: 'legend', reward: 120, flavor: '这鱼鳞能吹一年' },
  { name: '黄金锦鲤', type: 'legend', reward: 200, flavor: '我宣布今天是我的幸运日' },
];

// 离谱物：情绪爆点，传播担当
const trashItems: DropItem[] = [
  { name: '破袜子', type: 'trash', reward: 15, flavor: '谁把脚伸过来了？？' },
  { name: '拖鞋', type: 'trash', reward: 16, flavor: '另一只还在等我' },
  { name: '内裤', type: 'trash', reward: 18, flavor: '这水里有变态吧？？' },
  { name: '手机', type: 'trash', reward: 50, flavor: '等等，这屏幕还亮着？？' },
  { name: '螃蟹', type: 'trash', reward: 40, flavor: '夹住了，是真的夹住了' },
  { name: '乌龟', type: 'trash', reward: 45, flavor: '它看我的眼神充满嘲讽' },
];

// 神物：事件型文案，制造话题
const legendItems: DropItem[] = [
  { name: '钻石戒指', type: 'legend', reward: 320, flavor: '我是不是该去失物招领处问问' },
  { name: '神秘宝箱', type: 'legend', reward: 280, flavor: '打开之前我手心在出汗' },
];

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
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
    return randomFrom(trashItems);
  }

  static generateLegend(): DropItem {
    return randomFrom(allLegendPool());
  }

  static generateSafeFish(): DropItem {
    return DirectorSystem.pickWeighted<DropItem>([
      { item: randomFrom(commonFish), weight: 72 },
      { item: randomFrom(goodFish), weight: 24 },
      { item: randomFrom(rareFish), weight: 4 },
    ]);
  }

  static generateInteresting(): DropItem {
    const combo = DirectorSystem.getCombo();

    if (combo >= 4) {
      return DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(goodFish), weight: 18 },
        { item: randomFrom(rareFish), weight: 24 },
        { item: randomFrom(trashItems), weight: 36 },
        { item: randomFrom(allLegendPool()), weight: 22 },
      ]);
    }

    return DirectorSystem.pickWeighted<DropItem>([
      { item: randomFrom(goodFish), weight: 20 },
      { item: randomFrom(rareFish), weight: 14 },
      { item: randomFrom(trashItems), weight: 46 },
      { item: randomFrom(allLegendPool()), weight: 20 },
    ]);
  }

  static generateGoodShot(): DropItem {
    const combo = DirectorSystem.getCombo();

    if (combo >= 3) {
      return DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(goodFish), weight: 36 },
        { item: randomFrom(rareFish), weight: 28 },
        { item: randomFrom(mythFish), weight: 18 },
        { item: randomFrom(trashItems), weight: 12 },
        { item: randomFrom(legendItems), weight: 6 },
      ]);
    }

    return DirectorSystem.pickWeighted<DropItem>([
      { item: randomFrom(goodFish), weight: 42 },
      { item: randomFrom(rareFish), weight: 24 },
      { item: randomFrom(mythFish), weight: 10 },
      { item: randomFrom(trashItems), weight: 18 },
      { item: randomFrom(legendItems), weight: 6 },
    ]);
  }

  static generate(): DropItem {
    const combo = DirectorSystem.getCombo();

    if (combo >= 5) {
      return DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(commonFish), weight: 24 },
        { item: randomFrom(goodFish), weight: 28 },
        { item: randomFrom(rareFish), weight: 18 },
        { item: randomFrom(trashItems), weight: 22 },
        { item: randomFrom(allLegendPool()), weight: 8 },
      ]);
    }

    if (combo >= 3) {
      return DirectorSystem.pickWeighted<DropItem>([
        { item: randomFrom(commonFish), weight: 32 },
        { item: randomFrom(goodFish), weight: 24 },
        { item: randomFrom(rareFish), weight: 14 },
        { item: randomFrom(trashItems), weight: 24 },
        { item: randomFrom(allLegendPool()), weight: 6 },
      ]);
    }

    return DirectorSystem.pickWeighted<DropItem>([
      { item: randomFrom(commonFish), weight: 44 },
      { item: randomFrom(goodFish), weight: 18 },
      { item: randomFrom(rareFish), weight: 8 },
      { item: randomFrom(trashItems), weight: 24 },
      { item: randomFrom(allLegendPool()), weight: 6 },
    ]);
  }
}
