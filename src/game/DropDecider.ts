import { DirectorSystem, type VisualType } from './DirectorSystem';
import { DropGenerator, type DropItem } from './DropGenerator';

export type DropResult = {
  item: DropItem;
  visualType: VisualType;
};

/**
 * 掉落决策器（轻量版）
 * 
 * 封装 FishingScene 中所有掉落决策逻辑，减少对 DirectorSystem 和 DropGenerator 的直接调用
 * 
 * 职责：
 * - 统一调用入口：decideDrop()
 * - 封装掉落类型判断 + 具体掉落生成 + 视觉类型决定
 * 
 * 不职责：
 * - 不修改任何掉落算法
 * - 不调整概率
 * - 不改变 DirectorSystem/DropGenerator 的行为
 */
export class DropDecider {
  /**
   * 统一掉落决策入口
   * @returns {DropResult} 包含掉落物品和视觉类型
   */
  static decideDrop(): DropResult {
    const kind = DirectorSystem.decideDropKind();

    let item: DropItem;

    if (kind === 'legend') {
      item = DropGenerator.generateLegend();
    } else if (kind === 'trash') {
      item = DropGenerator.generateTrash();
    } else if (kind === 'interesting') {
      item = DropGenerator.generateInteresting();
    } else if (DirectorSystem.shouldSoftProtectSuccess()) {
      item = DropGenerator.generateSafeFish();
    } else if (DirectorSystem.shouldForceInterestingOutcome()) {
      item = DropGenerator.generateInteresting();
    } else {
      item = DropGenerator.generate();
    }

    const visualType = DirectorSystem.decideVisualType(item.type);

    return {
      item,
      visualType,
    };
  }

  /**
   * Fallback 掉落生成（用于兜底场景）
   * @returns {DropItem} 随机掉落物品
   */
  static generateFallback(): DropItem {
    return DropGenerator.generate();
  }
}
