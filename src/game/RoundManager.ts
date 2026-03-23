// 兼容保留：当前主玩法回合节奏以 DirectorSystem 为准，本文件仍用于存档兼容。
import type { DropItem } from './DropGenerator';

export class RoundManager {
  private static _instance: RoundManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new RoundManager();
    }
    return this._instance;
  }

  private roundCount: number = 0;

  nextRound() {
    this.roundCount += 1;
    return this.roundCount;
  }

  getRoundCount() {
    return this.roundCount;
  }

  setRoundCount(value: number) {
    this.roundCount = Math.max(0, value);
  }

  isNewbiePhase() {
    return this.roundCount <= 3;
  }

  getNewbieDrop(round: number): DropItem {
    if (round === 1) {
      return {
        name: '小鲫鱼',
        type: 'fish',
        reward: 30,
        weight: 0,
        flavor: '先给你来条正经鱼',
      };
    }

    if (round === 2) {
      return {
        name: '内裤',
        type: 'trash',
        reward: 15,
        weight: 0,
        flavor: '这水里到底发生过什么？？',
      };
    }

    return {
      name: '黄金锦鲤',
      type: 'legend',
      reward: 200,
      weight: 0,
      flavor: '第三杆直接出金',
    };
  }

  reset() {
    this.roundCount = 0;
  }
}
