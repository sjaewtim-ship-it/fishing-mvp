export type DropItem = {
  name: string;
  type: 'fish' | 'trash' | 'legend';
  reward: number;
  flavor: string;
};

export type DropCategory = 'fish' | 'trash' | 'legend' | 'random';

const fishItems: DropItem[] = [
  { name: '小鲫鱼', type: 'fish', reward: 6, flavor: '这一杆挺稳' },
  { name: '鲤鱼', type: 'fish', reward: 10, flavor: '手气还不错' },
  { name: '鲈鱼', type: 'fish', reward: 14, flavor: '有点意思了' },
  { name: '锦鲤', type: 'fish', reward: 20, flavor: '这一杆不亏' },
];

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

const legendItems: DropItem[] = [
  { name: '黄金锦鲤', type: 'legend', reward: 200, flavor: '我直接欧皇了？？？' },
  { name: '金条', type: 'legend', reward: 260, flavor: '今天手气爆炸' },
  { name: '钻石戒指', type: 'legend', reward: 320, flavor: '我直接欧皇了？？？' },
  { name: '神秘宝箱', type: 'legend', reward: 280, flavor: '命运开始改变了' },
];

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export class DropGenerator {
  static generateByCategory(category: DropCategory = 'random'): DropItem {
    switch (category) {
      case 'fish':
        return randomFrom(fishItems);
      case 'trash':
        return Math.random() < 0.4
          ? randomFrom(lightTrashItems)
          : randomFrom(strongTrashItems);
      case 'legend':
        return randomFrom(legendItems);
      case 'random':
      default:
        return this.generate();
    }
  }

  static generate(): DropItem {
    const rand = Math.random();

    if (rand < 0.06) return randomFrom(legendItems);

    if (rand < 0.38) {
      return Math.random() < 0.45
        ? randomFrom(lightTrashItems)
        : randomFrom(strongTrashItems);
    }

    return randomFrom(fishItems);
  }

  static generateSafeFish(): DropItem {
    return randomFrom(fishItems);
  }

  static generateInteresting(): DropItem {
    return Math.random() < 0.25
      ? randomFrom(legendItems)
      : randomFrom(strongTrashItems);
  }

  static generateGoodShot(): DropItem {
    const pool: DropItem[] = [
      fishItems[2],
      fishItems[3],
      randomFrom(strongTrashItems),
      randomFrom(legendItems),
    ];
    return randomFrom(pool);
  }

  static generateTrash(): DropItem {
    return Math.random() < 0.35
      ? randomFrom(lightTrashItems)
      : randomFrom(strongTrashItems);
  }

  static generateLegend(): DropItem {
    return randomFrom(legendItems);
  }
}
