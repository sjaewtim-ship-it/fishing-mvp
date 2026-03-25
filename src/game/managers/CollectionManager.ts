/**
 * 图鉴数据管理器
 * 
 * 职责：
 * - 管理 catalog（只读）
 * - 管理 progress（内存态）
 * - 解锁物品
 * - 提供查询接口
 * 
 * 不负责：
 * - 不直接操作 localStorage
 * - 不负责存档持久化
 */

import { collectionCatalog, getCatalogItemByName, TOTAL_COLLECTION_COUNT } from '../data/collectionCatalog';
import type { CollectionCatalogItem, CollectionCategory } from '../data/collectionCatalog';

/**
 * 单个物品的收集进度
 */
export interface CollectionProgress {
  unlocked: boolean;
  catchCount: number;
}

/**
 * 图鉴总览
 */
export interface CollectionSummary {
  unlocked: number;
  total: number;
  percentage: number;
}

class CollectionManagerClass {
  // 图鉴进度（内存态）
  private progress: Record<string, CollectionProgress> = {};

  /**
   * 初始化（从存档导入进度）
   */
  importProgress(savedProgress?: Record<string, CollectionProgress>): void {
    if (savedProgress) {
      this.progress = { ...savedProgress };
    } else {
      this.progress = {};
    }
  }

  /**
   * 导出进度（供 SaveSync 使用）
   */
  exportProgress(): Record<string, CollectionProgress> {
    return { ...this.progress };
  }

  /**
   * 根据掉落解锁图鉴
   * @param drop 掉落物品（包含 name 等字段）
   */
  unlockByDrop(drop: { name: string }): void {
    const catalogItem = getCatalogItemByName(drop.name);
    if (!catalogItem) {
      console.warn(`[CollectionManager] 未找到物品：${drop.name}`);
      return;
    }

    const itemId = catalogItem.id;

    // 如果已解锁，只增加捕获次数
    if (this.progress[itemId]) {
      this.progress[itemId].catchCount += 1;
      return;
    }

    // 首次解锁
    this.progress[itemId] = {
      unlocked: true,
      catchCount: 1,
    };

    console.log(`[CollectionManager] 解锁新物品：${drop.name} (${itemId})`);
  }

  /**
   * 获取图鉴总览
   */
  getSummary(): CollectionSummary {
    const unlocked = Object.values(this.progress).filter(p => p.unlocked).length;
    return {
      unlocked,
      total: TOTAL_COLLECTION_COUNT,
      percentage: Math.round((unlocked / TOTAL_COLLECTION_COUNT) * 100),
    };
  }

  /**
   * 按分类获取物品列表（带进度）
   */
  getItemsByCategory(category: CollectionCategory): Array<CollectionCatalogItem & { progress?: CollectionProgress }> {
    const items = collectionCatalog.filter(item => item.category === category);
    return items.map(item => ({
      ...item,
      progress: this.progress[item.id],
    }));
  }

  /**
   * 获取单个物品进度
   */
  getItemProgress(itemId: string): CollectionProgress | undefined {
    return this.progress[itemId];
  }

  /**
   * 重置（用于测试/清档）
   */
  reset(): void {
    this.progress = {};
  }
}

// 单例模式
export const CollectionManager = new CollectionManagerClass();
