/**
 * 进度条组件
 *
 * 职责：
 * - 绘制进度条背景槽（track）
 * - 绘制进度条填充（fill）
 * - 提供 setProgress() 方法
 *
 * 不负责：
 * - 不负责进度文字（由外部文本对象负责）
 * - 不依赖外部资源（纯 Graphics 实现）
 */

import Phaser from 'phaser';

export type ProgressBarOptions = {
  trackColor?: number;
  trackAlpha?: number;
  fillColor?: number;
  radius?: number;
};

const DEFAULT_OPTIONS: Required<ProgressBarOptions> = {
  trackColor: 0x000000,
  trackAlpha: 0.6,
  fillColor: 0x4CAF50,
  radius: 7,
};

export class ProgressBar {
  public readonly container: Phaser.GameObjects.Container;
  public readonly track: Phaser.GameObjects.Graphics;
  public readonly fill: Phaser.GameObjects.Graphics;

  private _progress: number = 0;
  private width: number;
  private height: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    options: ProgressBarOptions = {}
  ) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.width = width;
    this.height = height;

    // 创建容器
    this.container = scene.add.container(x, y);
    this.container.setDepth(10);

    // 背景槽（track）
    this.track = scene.add.graphics();
    
    // 背景填充
    this.track.fillStyle(opts.trackColor, opts.trackAlpha);
    this.track.fillRoundedRect(-width / 2, -height / 2, width, height, opts.radius);
    
    // 描边
    this.track.lineStyle(1, 0xffffff, 0.2);
    this.track.strokeRoundedRect(-width / 2, -height / 2, width, height, opts.radius);
    
    this.container.add(this.track);

    // 填充条（fill）
    this.fill = scene.add.graphics();
    this.container.add(this.fill);

    // 初始渲染
    this.setProgress(0);
  }

  /**
   * 设置进度（0~1）
   */
  setProgress(value: number) {
    this._progress = Phaser.Math.Clamp(value, 0, 1);
    this.updateFill();
  }

  /**
   * 获取当前进度
   */
  getProgress(): number {
    return this._progress;
  }

  /**
   * 更新填充条
   */
  private updateFill() {
    this.fill.clear();

    if (this._progress <= 0) {
      return;
    }

    const fillWidth = this.width * this._progress;
    const x = -this.width / 2;
    const y = -this.height / 2;

    this.fill.fillStyle(DEFAULT_OPTIONS.fillColor, 1);
    this.fill.fillRoundedRect(x, y, fillWidth, this.height, DEFAULT_OPTIONS.radius);
  }

  /**
   * 设置容器可见性
   */
  setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  /**
   * 销毁
   */
  destroy() {
    this.container.destroy(true);
  }
}

/**
 * 创建进度条的工厂函数
 */
export function createProgressBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  options?: ProgressBarOptions
): ProgressBar {
  return new ProgressBar(scene, x, y, width, height, options);
}
