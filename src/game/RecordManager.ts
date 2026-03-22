import type { DropItem } from './DropGenerator';

export class RecordManager {
  private static _instance: RecordManager;

  public static get instance() {
    if (!this._instance) {
      this._instance = new RecordManager();
    }
    return this._instance;
  }

  private bestCatch: string = '暂无';
  private weirdCatch: string = '暂无';

  update(drop?: DropItem) {
    if (!drop) return;

    if (drop.type === 'legend') {
      this.bestCatch = drop.name;
    }

    if (drop.type === 'trash') {
      this.weirdCatch = drop.name;
    }
  }

  getBestCatch() {
    return this.bestCatch;
  }

  getWeirdCatch() {
    return this.weirdCatch;
  }

  setBestCatch(value: string) {
    this.bestCatch = value || '暂无';
  }

  setWeirdCatch(value: string) {
    this.weirdCatch = value || '暂无';
  }

  reset() {
    this.bestCatch = '暂无';
    this.weirdCatch = '暂无';
  }
}
