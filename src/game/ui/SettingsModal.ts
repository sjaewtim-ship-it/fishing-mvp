import Phaser from 'phaser';
import { SettingsManager } from '../managers/SettingsManager';

// =====================================================
// ⚠️ STABLE MODULE: SettingsModal（设置弹层）
// 当前状态：已通过人工验证（2026-03）
// 包含：
// - 设置主弹层
// - 音效/震动开关
// - 重置确认二次弹层（Phaser 内部实现）
//
// ⚠️ 约束：
// - 禁止修改重置流程（必须经过确认弹层）
// - 禁止直接调用 resetGameData()
// - 禁止改动弹层层级结构（container / depth）
// - 禁止替换为 window.confirm
//
// 修改此文件前必须验证：
// 1. 重置 → 必须出现确认弹层
// 2. 取消 → 不删档不刷新
// 3. 确认 → 才删档
//
// =====================================================

/**
 * 设置弹层
 * 轻量级设置面板，不做独立 Scene
 */
export class SettingsModal {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private settingsManager: SettingsManager;

  // 防重复弹层标记
  private resetConfirmVisible = false;

  // 布局参数
  private readonly PANEL_WIDTH = 420;
  private readonly PANEL_HEIGHT = 390;
  private readonly MASK_ALPHA = 0.45;
  private readonly PANEL_COLOR = 0x1f3f5b;
  private readonly PANEL_ALPHA = 0.96;
  private readonly CORNER_RADIUS = 20;
  private readonly STROKE_COLOR = 0xffffff;
  private readonly STROKE_ALPHA = 0.14;

  // 开关颜色
  private readonly TOGGLE_ON_COLOR = 0xf6c344;
  private readonly TOGGLE_OFF_COLOR = 0x5b6b7a;

  // 重置按钮颜色
  private readonly RESET_BUTTON_COLOR = 0xb63a3a;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.settingsManager = SettingsManager.instance;
  }

  /**
   * 显示设置弹层
   */
  public show(): void {
    if (this.container) {
      return; // 防止重复打开
    }

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const centerX = width / 2;
    const centerY = height / 2 - 20; // 轻微上移

    // 计算面板边界
    const panelLeft = centerX - this.PANEL_WIDTH / 2;
    const panelRight = centerX + this.PANEL_WIDTH / 2;
    const panelTop = centerY - this.PANEL_HEIGHT / 2;
    const panelBottom = centerY + this.PANEL_HEIGHT / 2;

    // 创建容器（高层级）
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(9999);

    // === 遮罩层 ===
    const mask = this.scene.add.rectangle(centerX, centerY, width, height, 0x000000, this.MASK_ALPHA);
    this.container.add(mask);

    // === 弹窗面板 ===
    const panelBg = this.scene.add.rectangle(centerX, centerY, this.PANEL_WIDTH, this.PANEL_HEIGHT, this.PANEL_COLOR, this.PANEL_ALPHA);
    panelBg.setStrokeStyle(2, this.STROKE_COLOR, this.STROKE_ALPHA);
    this.container.add(panelBg);

    // === 标题 ===
    const titleText = this.scene.add.text(centerX, panelTop + 36, '设置', {
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(titleText);

    // === 关闭按钮 ===
    const closeX = panelRight - 26;
    const closeY = panelTop + 26;
    const closeBtn = this.scene.add.text(closeX, closeY, '✕', {
      fontSize: '24px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    this.container.add(closeBtn);

    // 关闭按钮点击热区
    const closeHitArea = this.scene.add.rectangle(closeX, closeY, 36, 36, 0x000000, 0);
    closeHitArea.setInteractive({ useHandCursor: true });
    this.container.add(closeHitArea);

    closeHitArea.on('pointerdown', () => {
      this.hide();
    });

    // === 内容区 ===
    const contentStartY = panelTop + 90;
    const horizontalPadding = 28;
    const rowHeight = 56;
    const rowGap = 14;

    // 音效开关行
    const soundRowY = contentStartY + rowHeight / 2;
    this.createToggleRow(
      panelLeft + horizontalPadding,
      soundRowY,
      this.PANEL_WIDTH - horizontalPadding * 2,
      '音效',
      this.settingsManager.isSoundEnabled(),
      (enabled) => {
        this.settingsManager.update({ soundEnabled: enabled });
      }
    );

    // 震动开关行
    const vibrationRowY = soundRowY + rowHeight + rowGap;
    this.createToggleRow(
      panelLeft + horizontalPadding,
      vibrationRowY,
      this.PANEL_WIDTH - horizontalPadding * 2,
      '震动',
      this.settingsManager.isVibrationEnabled(),
      (enabled) => {
        this.settingsManager.update({ vibrationEnabled: enabled });
      }
    );

    // === 重置游戏数据按钮 ===
    // 按钮上边缘距离震动行下边缘 20px
    const vibrationRowBottom = vibrationRowY + rowHeight / 2;
    const resetBtnY = vibrationRowBottom + 20 + 25; // 20px 间距 + 按钮半高
    const resetBtnWidth = 260;
    const resetBtnHeight = 50;

    // 背景矩形（只负责显示，不绑定点击）
    const resetBtnBg = this.scene.add.rectangle(centerX, resetBtnY, resetBtnWidth, resetBtnHeight, this.RESET_BUTTON_COLOR);
    resetBtnBg.setStrokeStyle(2, this.STROKE_COLOR, this.STROKE_ALPHA);
    this.container.add(resetBtnBg);

    // 文字（只负责显示，不绑定点击，不要 interactive）
    const resetBtnText = this.scene.add.text(centerX, resetBtnY, '重置游戏数据', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(resetBtnText);

    // 透明点击热区（唯一 clickable object，放在最上层）
    const resetBtnHitArea = this.scene.add.rectangle(centerX, resetBtnY, resetBtnWidth, resetBtnHeight, 0xffffff, 0.001);
    resetBtnHitArea.setInteractive({ useHandCursor: true });
    this.container.add(resetBtnHitArea);

    // 统一点击处理函数（只绑定一次）
    const handleResetClick = () => {
      console.log('[SettingsModal] reset button clicked');
      this.showResetConfirmDialog();
    };

    // 只给 hitArea 绑定点击事件（使用 pointerup）
    resetBtnHitArea.on('pointerup', handleResetClick);

    // === 版本号 ===
    const versionY = panelBottom - 34;
    const versionText = this.scene.add.text(centerX, versionY, `Version ${this.settingsManager.getVersion()}`, {
      fontSize: '16px',
      color: '#B8C7D9',
    }).setOrigin(0.5);
    this.container.add(versionText);

    // === 淡入动画 ===
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 150,
      ease: 'Power2',
    });
  }

  /**
   * 创建开关行
   */
  private createToggleRow(
    x: number,
    y: number,
    width: number,
    label: string,
    enabled: boolean,
    onChange: (enabled: boolean) => void
  ): void {
    // 行背景（可选）
    const rowBg = this.scene.add.rectangle(x + width / 2, y, width, 56, 0xffffff, 0.06);
    rowBg.setStrokeStyle(1, 0xffffff, 0.08);
    this.container!.add(rowBg);

    // 左侧标题
    const labelText = this.scene.add.text(x, y, label, {
      fontSize: '22px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    this.container!.add(labelText);

    // 右侧开关
    const toggleWidth = 88;
    const toggleHeight = 40;
    const toggleX = x + width - toggleWidth / 2;
    const toggleY = y;

    // 使用局部变量追踪当前开关状态（修复闭包问题）
    let currentEnabled = enabled;

    const toggleBg = this.scene.add.rectangle(toggleX, toggleY, toggleWidth, toggleHeight, currentEnabled ? this.TOGGLE_ON_COLOR : this.TOGGLE_OFF_COLOR);
    toggleBg.setStrokeStyle(1, 0xffffff, 0.12);
    toggleBg.setInteractive({ useHandCursor: true });
    this.container!.add(toggleBg);

    // 开关圆点
    const dotRadius = 14;
    const getDotX = () => currentEnabled ? toggleX + toggleWidth / 2 - dotRadius - 4 : toggleX - toggleWidth / 2 + dotRadius + 4;
    const dot = this.scene.add.circle(getDotX(), toggleY, dotRadius, 0xffffff);
    this.container!.add(dot);

    // 点击事件
    const onToggle = () => {
      // 切换状态
      currentEnabled = !currentEnabled;

      // 写入 localStorage
      onChange(currentEnabled);

      // 更新视觉状态
      toggleBg.setFillStyle(currentEnabled ? this.TOGGLE_ON_COLOR : this.TOGGLE_OFF_COLOR);
      this.scene.tweens.add({
        targets: dot,
        x: getDotX(),
        duration: 150,
        ease: 'Power2',
      });
    };

    toggleBg.on('pointerdown', onToggle);
  }

  /**
   * ⚠️ 二次确认弹层（关键交互模块）
   *
   * 结构：
   * - confirmContainer（顶层容器）
   * - 遮罩层（mask）
   * - 中央面板（panel）
   * - 取消按钮
   * - 确认按钮
   *
   * ⚠️ 修改风险：
   * - 改错会导致误删档（P0 级事故）
   * - 禁止删除"取消路径"
   * - 禁止绕过确认直接调用 resetGameData()
   */
  private showResetConfirmDialog(): void {
    // 防重复弹层
    if (this.resetConfirmVisible) {
      return;
    }
    this.resetConfirmVisible = true;

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const centerX = width / 2;
    const centerY = height / 2 - 20;

    // 确认弹层容器（更高层级，压在 SettingsModal 之上）
    const confirmContainer = this.scene.add.container(0, 0);
    confirmContainer.setDepth(10000);

    // 遮罩层（半透明黑色）
    const confirmMask = this.scene.add.rectangle(centerX, centerY, width, height, 0x000000, 0.40);
    confirmContainer.add(confirmMask);

    // 小面板
    const panelWidth = 320;
    const panelHeight = 180;
    const panelBg = this.scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, this.PANEL_COLOR, this.PANEL_ALPHA);
    panelBg.setStrokeStyle(2, this.STROKE_COLOR, this.STROKE_ALPHA);
    confirmContainer.add(panelBg);

    // 标题
    const titleText = this.scene.add.text(centerX, centerY - 30, '确定要重置游戏数据吗？', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      wordWrap: { width: panelWidth - 40 },
      align: 'center',
    }).setOrigin(0.5);
    confirmContainer.add(titleText);

    // 副文案
    const subtitleText = this.scene.add.text(centerX, centerY + 5, '此操作不可恢复', {
      fontSize: '16px',
      color: '#B8C7D9',
      wordWrap: { width: panelWidth - 40 },
      align: 'center',
    }).setOrigin(0.5);
    confirmContainer.add(subtitleText);

    // 按钮区
    const btnY = centerY + 50;
    const btnWidth = 110;
    const btnHeight = 42;
    const btnGap = 20;

    // 取消按钮（左侧，灰蓝色）
    const cancelBtnX = centerX - btnGap / 2 - btnWidth;
    const cancelBtn = this.scene.add.rectangle(cancelBtnX, btnY, btnWidth, btnHeight, 0x5b6b7a);
    cancelBtn.setStrokeStyle(2, 0xffffff, 0.12);
    cancelBtn.setInteractive({ useHandCursor: true });
    confirmContainer.add(cancelBtn);

    const cancelBtnText = this.scene.add.text(cancelBtnX, btnY, '取消', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    confirmContainer.add(cancelBtnText);

    // 确认重置按钮（右侧，红色）
    const confirmBtnX = centerX + btnGap / 2 + btnWidth;
    const confirmBtn = this.scene.add.rectangle(confirmBtnX, btnY, btnWidth, btnHeight, this.RESET_BUTTON_COLOR);
    confirmBtn.setStrokeStyle(2, 0xffffff, 0.12);
    confirmBtn.setInteractive({ useHandCursor: true });
    confirmContainer.add(confirmBtn);

    const confirmBtnText = this.scene.add.text(confirmBtnX, btnY, '确认重置', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    confirmContainer.add(confirmBtnText);

    // 取消按钮点击：只关闭确认弹层
    cancelBtn.on('pointerup', () => {
      this.hideResetConfirmDialog(confirmContainer);
    });

    // 确认重置按钮点击：才执行删档
    confirmBtn.on('pointerup', () => {
      this.hideResetConfirmDialog(confirmContainer);
      console.log('[SettingsModal] resetGameData start');
      this.resetGameData();
    });

    // 淡入动画
    confirmContainer.setAlpha(0);
    this.scene.tweens.add({
      targets: confirmContainer,
      alpha: 1,
      duration: 150,
      ease: 'Power2',
    });
  }

  /**
   * 隐藏重置确认弹层
   */
  private hideResetConfirmDialog(container: Phaser.GameObjects.Container): void {
    if (!container) {
      return;
    }

    this.scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        container.destroy(true);
        this.resetConfirmVisible = false;
      },
    });
  }

  /**
   * 隐藏设置弹层
   */
  public hide(): void {
    if (!this.container) {
      return;
    }

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.container?.destroy(true);
        this.container = null;
      },
    });
  }

  /**
   * ⚠️ 危险操作：清空所有游戏数据
   * 只能通过「确认重置按钮」触发
   * 禁止在其他地方直接调用
   */
  private resetGameData(): void {
    // 删除真实存在的 localStorage key
    const keysToRemove = [
      'fishing_mvp_save_v3',
      'fishing_daily_mission_v1',
      'fishing_growth_mission_v1',
    ];

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log('removed key:', key);
    });

    // 删除分享奖励前缀 key
    const shareRewardPrefix = 'fishing_share_reward_';
    const keysToRemove2: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(shareRewardPrefix)) {
        keysToRemove2.push(key);
      }
    }
    keysToRemove2.forEach((key) => {
      localStorage.removeItem(key);
      console.log('removed share reward key:', key);
    });

    // 重置设置管理器为默认值
    this.settingsManager.resetSettings();

    console.log('game data reset complete');

    // 关闭弹层
    this.hide();

    // 最稳方案：刷新页面
    window.location.reload();
  }
}
