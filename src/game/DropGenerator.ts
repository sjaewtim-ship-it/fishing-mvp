export type DropType = 'fish' | 'trash' | 'legend';

export type DropItem = {
  name: string;
  type: DropType;
  reward: number;
  weight: number;
  flavor?: string;
};

export class DropGenerator {
  static generateByCategory(category: 'fish' | 'trash' | 'viralTrash' | 'legend'): DropItem {
    if (category === 'fish') return this.pickByWeight(this.getFishList());
    if (category === 'trash') return this.pickByWeight(this.getTrashList());
    if (category === 'viralTrash') return this.pickByWeight(this.getViralTrashList());
    return this.pickByWeight(this.getLegendList());
  }

  static generate(): DropItem {
    const categoryRand = Math.random() * 100;

    if (categoryRand < 50) {
      return this.pickByWeight(this.getFishList());
    }

    if (categoryRand < 75) {
      return this.pickByWeight(this.getTrashList());
    }

    if (categoryRand < 93) {
      return this.pickByWeight(this.getViralTrashList());
    }

    return this.pickByWeight(this.getLegendList());
  }

  static getFishList(): DropItem[] {
    return [
      { name: '小鲫鱼', type: 'fish', reward: 30, weight: 30, flavor: '今天手气不错' },
      { name: '鲤鱼', type: 'fish', reward: 50, weight: 25, flavor: '这一杆还挺稳' },
      { name: '大黑鱼', type: 'fish', reward: 80, weight: 15, flavor: '这条鱼有点分量' },
      { name: '银鱼', type: 'fish', reward: 40, weight: 20, flavor: '看起来还挺漂亮' },
      { name: '河鲈', type: 'fish', reward: 60, weight: 10, flavor: '今晚加餐有了' },
    ];
  }

  static getTrashList(): DropItem[] {
    return [
      { name: '泥鳅', type: 'trash', reward: 12, weight: 25, flavor: '这也算收获吗…' },
      { name: '树枝', type: 'trash', reward: 8, weight: 22, flavor: '钓了个寂寞' },
      { name: '旧鞋子', type: 'trash', reward: 10, weight: 18, flavor: '谁把鞋扔水里了？' },
      { name: '塑料袋', type: 'trash', reward: 6, weight: 20, flavor: '环保警告出现了' },
      { name: '破水桶', type: 'trash', reward: 14, weight: 15, flavor: '这也能钓上来？' },
    ];
  }

  static getViralTrashList(): DropItem[] {
    return [
      { name: '螃蟹', type: 'trash', reward: 40, weight: 16, flavor: '今晚加餐有了' },
      { name: '乌龟', type: 'trash', reward: 50, weight: 14, flavor: '这玩意怎么钓上来的？' },
      { name: '内裤', type: 'trash', reward: 15, weight: 20, flavor: '这水里到底发生过什么？？' },
      { name: '比基尼', type: 'trash', reward: 25, weight: 16, flavor: '这也太离谱了吧？！' },
      { name: 'iPhone', type: 'trash', reward: 90, weight: 10, flavor: '这波直接血赚' },
      { name: '龙虾', type: 'trash', reward: 60, weight: 12, flavor: '今天这一杆真不亏' },
      { name: '盲盒', type: 'trash', reward: 70, weight: 12, flavor: '里面到底是什么？' },
    ];
  }

  static getLegendList(): DropItem[] {
    return [
      { name: '黄金锦鲤', type: 'legend', reward: 200, weight: 35, flavor: '欧皇附体了' },
      { name: '神秘宝箱', type: 'legend', reward: 300, weight: 28, flavor: '今天运气爆炸' },
      { name: '金条', type: 'legend', reward: 500, weight: 15, flavor: '这一杆直接发财' },
      { name: '钻石戒指', type: 'legend', reward: 450, weight: 12, flavor: '这是什么逆天运气' },
      { name: '远古宝箱', type: 'legend', reward: 600, weight: 10, flavor: '像是从海底捞上来的' },
    ];
  }

  static pickByWeight(list: DropItem[]): DropItem {
    const totalWeight = list.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const item of list) {
      rand -= item.weight;
      if (rand <= 0) {
        return item;
      }
    }

    return list[list.length - 1];
  }
}
