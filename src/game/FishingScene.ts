import Phaser from 'phaser';
import { DirectorSystem, type VisualType } from './DirectorSystem';
import { type DropItem } from './DropGenerator';
import { DropDecider, type DropResult } from './DropDecider';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';
import { CoinManager } from './CoinManager';
import { EnergyManager } from './EnergyManager';
import { AnalyticsManager } from './AnalyticsManager';
import { ShareManager } from './ShareManager';
import { VisualMap } from './VisualMap';

type Phase = 'idle' | 'bite' | 'resolved';

interface PendingResult {
  success: boolean;
  drop?: DropItem;
  round?: number;
  failReason?: 'early' | 'too_early' | 'late';
  baseReward: number;
  perfect: boolean;
}

export class FishingScene extends Phaser.Scene {
  private phase: Phase = 'idle';
  private roundNumber = 1;

  private floatBobber!: Phaser.GameObjects.Container;
  private fishShadow!: Phaser.GameObjects.Ellipse;
  private fishGlow!: Phaser.GameObjects.Ellipse;

  private titleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private subHintText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;

  private pullBtnBg!: Phaser.GameObjects.Rectangle;
  private pullBtnText!: Phaser.GameObjects.Text;
  private pullBtnHint!: Phaser.GameObjects.Text;

  private biteStartAt = 0;
  private currentDrop: DropItem | null = null;
  private config = DirectorSystem.getTimingAssist();

  // ========== 弹窗相关 ==========
  private resultModal: Phaser.Container | null = null;
  private modalOverlay: Phaser.GameObjects.Rectangle | null = null;
  private modalCard: Phaser.GameObjects.Container | null = null;
  private isModalShowing: boolean = false;
  private modalActionLocked: boolean = false;  // 防重入锁

  // ========== 结果缓存 ==========
  private pendingResult: PendingResult | null = null;

  // ========== 奖励状态 ==========
  private baseRewardClaimed: boolean = false;
  private doubleRewardClaimed: boolean = false;
  private shareRewardClaimed: boolean = false;

  // ========== 分享首奖状态（全局持久化）==========
  private hasClaimedFirstShareReward: boolean = false;

  // ========== 弹窗 UI 引用 ==========
  private modalTitleText!: Phaser.GameObjects.Text;
  private modalIconText!: Phaser.GameObjects.Text;
  private modalNameText!: Phaser.GameObjects.Text;
  private modalHeadlineText!: Phaser.GameObjects.Text;
  private modalEmotionText!: Phaser.GameObjects.Text;
  private modalRewardText!: Phaser.GameObjects.Text;

  // ========== 按钮容器 ==========
  private doubleBtn!: Phaser.GameObjects.Container;
  private shareBtn!: Phaser.GameObjects.Container;
  private againBtn!: Phaser.GameObjects.Container;

  constructor() {
    super('FishingScene');
  }

  create(data?: { round?: number }) {
    this.roundNumber = data?.round ?? DirectorSystem.getRoundNumber();
    this.config = DirectorSystem.getTimingAssist();

    // 读取全局分享首奖状态
    this.hasClaimedFirstShareReward = localStorage.getItem('fishing_has_claimed_first_share_reward') === '1';

    this.buildScene();
    this.startFishingFlow();
  }

  private getLayout() {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;
    const centerX = width / 2;

    const safeBottom = Math.max(150, Math.round(height * 0.12));
    const actionBaseY = height - safeBottom;

    const sandY = actionBaseY - 92;
    const plantBaseY = sandY - 78;
    const coralBaseY = sandY - 138;

    return {
      width,
      height,
      centerX,
      actionBaseY,
      sandY,
      plantBaseY,
      coralBaseY,
    };
  }

  private buildScene() {
    const L = this.getLayout();

    this.cameras.main.setBackgroundColor('#8FD3FF');

    this.buildBackground(L);
    this.buildUI(L);
    this.buildWaterAndRipple(L);
    this.buildFloatBobber(L);
    this.buildFishShadow(L);
    this.buildDecoration(L);
    this.buildPullButton(L);
    this.buildResultModal();
  }

  private buildBackground(L: ReturnType<FishingScene['getLayout']>) {
    this.add.rectangle(L.centerX, L.height / 2, L.width, L.height, 0x8fd3ff);
    this.add.rectangle(L.centerX, 1015, L.width, 640, 0x1e88e5);
  }

  private buildUI(L: ReturnType<FishingScene['getLayout']>) {
    this.titleText = this.add.text(L.centerX, 95, '🎣 正在钓鱼', {
      fontSize: '46px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.hintText = this.add.text(L.centerX, 150, DirectorSystem.getRoundHint(), {
      fontSize: '24px',
      color: '#FFF3B0',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      wordWrap: { width: 620 },
      align: 'center',
    }).setOrigin(0.5);

    this.comboText = this.add.text(L.centerX, 184, DirectorSystem.getComboLabel(), {
      fontSize: '22px',
      color: '#FFE082',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(DirectorSystem.getCombo() >= 2 ? 1 : 0);

    this.stateText = this.add.text(L.centerX, 224, '等待鱼咬钩...', {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.subHintText = this.add.text(L.centerX, 266, '看到明显动静时再拉杆，别太早也别太晚', {
      fontSize: '20px',
      color: '#EAF6FF',
      wordWrap: { width: 620 },
      align: 'center',
    }).setOrigin(0.5);
  }

  private buildWaterAndRipple(L: ReturnType<FishingScene['getLayout']>) {
    this.add.rectangle(L.centerX, 560, L.width, 6, 0xeafcff).setAlpha(0.9);

    const ripple1 = this.add.ellipse(L.centerX, 585, 90, 20, 0xffffff, 0.16);
    const ripple2 = this.add.ellipse(L.centerX, 600, 130, 24, 0xffffff, 0.10);

    this.tweens.add({
      targets: [ripple1, ripple2],
      scaleX: 1.12,
      alpha: 0.06,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildFloatBobber(L: ReturnType<FishingScene['getLayout']>) {
    const line = this.add.rectangle(0, -65, 4, 130, 0xffffff, 0.9);
    const bobberTop = this.add.circle(0, 0, 10, 0xff5f5f);
    const bobberBottom = this.add.circle(0, 16, 13, 0xffffff);

    this.floatBobber = this.add.container(L.centerX, 520, [line, bobberTop, bobberBottom]);

    this.tweens.add({
      targets: this.floatBobber,
      y: 526,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildFishShadow(L: ReturnType<FishingScene['getLayout']>) {
    const shadowRange = DirectorSystem.getShadowScaleRange();
    const shadowW = Phaser.Math.Between(
      Math.floor(95 * shadowRange.min),
      Math.floor(95 * shadowRange.max)
    );
    const shadowH = Phaser.Math.Between(
      Math.floor(34 * shadowRange.min),
      Math.floor(34 * shadowRange.max)
    );

    this.fishGlow = this.add.ellipse(L.centerX + 15, 760, shadowW + 22, shadowH + 10, 0x000000, 0.08);
    this.fishShadow = this.add.ellipse(L.centerX + 15, 760, shadowW, shadowH, 0x000000, 0.22);

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      x: L.centerX + 95,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      y: 778,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildDecoration(L: ReturnType<FishingScene['getLayout']>) {
    this.add.text(135, L.plantBaseY, '🌿', { fontSize: '54px' }).setOrigin(0.5).setAlpha(0.90);
    this.add.text(610, L.plantBaseY - 10, '🌱', { fontSize: '48px' }).setOrigin(0.5).setAlpha(0.88);
    this.add.text(178, L.coralBaseY, '🪸', { fontSize: '56px' }).setOrigin(0.5).setAlpha(0.92);
    this.add.text(565, L.coralBaseY - 10, '🪸', { fontSize: '62px' }).setOrigin(0.5).setAlpha(0.90);

    const sandColor = 0xd8c28a;
    this.add.ellipse(200, L.sandY, 220, 58, sandColor, 0.95);
    this.add.ellipse(392, L.sandY + 15, 260, 72, sandColor, 0.95);
    this.add.ellipse(575, L.sandY + 2, 220, 60, sandColor, 0.95);
  }

  private buildPullButton(L: ReturnType<FishingScene['getLayout']>) {
    this.add.rectangle(L.centerX, L.actionBaseY, 520, 132, 0x000000, 0.10)
      .setStrokeStyle(2, 0xffffff, 0.10);

    this.pullBtnBg = this.add.rectangle(L.centerX, L.actionBaseY - 10, 450, 104, 0xff5f5f)
      .setStrokeStyle(4, 0xffffff, 0.18)
      .setInteractive({ useHandCursor: true });

    this.pullBtnText = this.add.text(L.centerX, L.actionBaseY - 22, '立刻拉杆', {
      fontSize: '36px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.pullBtnHint = this.add.text(L.centerX, L.actionBaseY + 18, '看到明显动静再拉', {
      fontSize: '18px',
      color: '#FFEFEF',
    }).setOrigin(0.5);

    this.pullBtnText.setInteractive({ useHandCursor: true });
    this.pullBtnHint.setInteractive({ useHandCursor: true });

    const onPull = () => this.handlePull();
    this.pullBtnBg.on('pointerdown', onPull);
    this.pullBtnText.on('pointerdown', onPull);
    this.pullBtnHint.on('pointerdown', onPull);
  }

  // ========== 弹窗系统方法 ==========

  /**
   * 创建按钮容器（背景 + 文字）
   * @returns Container，可通过 container.getData('label') 获取文字引用
   */
  private createButton(
    x: number, y: number, width: number, height: number,
    color: number, text: string, fontSize: string = '28px',
    onClick?: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height, color)
      .setStrokeStyle(2, 0xffffff, 0.16)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 0, text, {
      fontSize,
      color: '#FFFFFF',
      fontStyle: fontSize === '38px' ? 'bold' : 'normal',  // 主按钮加粗
    }).setOrigin(0.5);

    container.add([bg, btnText]);
    container.setData('label', btnText);  // 保存文字引用

    // 事件绑定到背景 Rectangle（有天然 hitArea）
    bg.on('pointerdown', () => {
      container.setScale(0.96);
    });

    bg.on('pointerup', () => {
      container.setScale(1);
      onClick?.();  // pointerup 时执行业务回调
    });

    bg.on('pointerout', () => {
      container.setScale(1);
      // pointerout 时不触发业务回调
    });

    return container;
  }

  /**
   * 构建结果弹窗
   */
  private buildResultModal() {
    const L = this.getLayout();

    // 1. 创建遮罩层（全屏黑色半透明，强化 modal 感）
    //    使用 scale.width/height 确保覆盖整个屏幕，不使用 L.width/L.height
    //    depth = 9999，确保在所有游戏 UI 之上
    this.modalOverlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0
    ).setDepth(9999);

    // 2. 创建卡片容器
    this.modalCard = this.add.container(L.centerX, L.height / 2);
    this.modalCard.setDepth(10000);
    this.modalCard.setVisible(false);
    this.modalCard.setScale(0.9);
    this.modalCard.setAlpha(0);

    // 3. 卡片背景（增加高度容纳按钮）
    const cardBg = this.add.rectangle(0, 0, 600, 880, 0xffffff, 0.98)
      .setStrokeStyle(4, 0xff6b6b, 0.16);

    // 4. 标题文本
    this.modalTitleText = this.add.text(0, -380, '第 X 杆收获', {
      fontSize: '32px',
      color: '#666666',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 5. 图标 + 名称
    this.modalIconText = this.add.text(0, -280, '🐟', {
      fontSize: '120px',
    }).setOrigin(0.5);

    this.modalNameText = this.add.text(0, -160, '物品名称', {
      fontSize: '48px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 6. 主文案 + 情绪文案
    this.modalHeadlineText = this.add.text(0, -80, '主文案', {
      fontSize: '24px',
      color: '#666666',
      wordWrap: { width: 520 },
      align: 'center',
    }).setOrigin(0.5);

    this.modalEmotionText = this.add.text(0, -30, '情绪文案', {
      fontSize: '20px',
      color: '#999999',
      wordWrap: { width: 520 },
      align: 'center',
    }).setOrigin(0.5);

    // 7. 奖励显示
    this.modalRewardText = this.add.text(0, 30, '+0 金币', {
      fontSize: '28px',
      color: '#f39c12',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 8. 按钮组（从上到下：翻倍 > 分享 > 再来一杆）
    // 按钮间距调整为 100，确保在卡片内
    // 次级按钮：30px / 28px
    this.doubleBtn = this.createButton(0, 140, 450, 80, 0xf39c12, '🎬 看视频 ×2 奖励', '30px', () => this.onDoubleReward());
    this.shareBtn = this.createButton(0, 250, 450, 80, 0x9b59b6, '🎁 分享送 50 金币（首次）', '28px', () => this.onShare());
    // 主按钮：38px bold，最突出
    this.againBtn = this.createButton(0, 360, 500, 100, 0x27ae60, '👉 再来一杆', '38px', () => this.onAgain());

    // 9. 添加到卡片容器
    this.modalCard.add([
      cardBg,
      this.modalTitleText,
      this.modalIconText,
      this.modalNameText,
      this.modalHeadlineText,
      this.modalEmotionText,
      this.modalRewardText,
      this.doubleBtn,
      this.shareBtn,
      this.againBtn
    ]);

    // 10. 存储引用
    this.resultModal = this.modalCard;
  }

  /**
   * 显示结果弹窗
   */
  private showResultModal(data: {
    success: boolean;
    drop?: DropItem;
    round?: number;
    failReason?: 'early' | 'too_early' | 'late';
    baseReward?: number;
    perfect?: boolean;
  }) {
    // 如果弹窗未构建，现场创建
    if (!this.resultModal || !this.modalOverlay || !this.modalCard) {
      this.buildResultModal();
    }
    
    // 再次检查（兜底）
    if (!this.resultModal || !this.modalOverlay || !this.modalCard) {
      this.scene.start('ResultScene', {
        success: data.success,
        drop: data.drop,
        round: data.round,
        failReason: data.failReason,
      });
      return;
    }
    
    this.isModalShowing = true;
    
    // 1. 禁用拉杆按钮
    this.pullBtnBg.disableInteractive();
    this.pullBtnText.disableInteractive();
    this.pullBtnHint.disableInteractive();
    
    // 2. 缓存结果
    this.pendingResult = {
      success: data.success,
      drop: data.drop,
      round: data.round,
      failReason: data.failReason,
      baseReward: data.baseReward ?? 0,
      perfect: data.perfect ?? false,
    };
    
    // 3. 重置领取状态
    this.doubleRewardClaimed = false;

    // 4. 每次打开弹窗时重新同步全局分享首奖状态
    this.hasClaimedFirstShareReward = localStorage.getItem('fishing_has_claimed_first_share_reward') === '1';

    // 5. 检查分享是否已领过（持久化）
    const shareKey = `fishing_share_reward_${data.round}_${data.drop?.name ?? 'none'}`;
    this.shareRewardClaimed = localStorage.getItem(shareKey) === '1';

    // 6. 【关键】立即发放基础奖励（仅成功时）
    if (data.success && data.baseReward && data.baseReward > 0) {
      CoinManager.instance.addCoins(data.baseReward);
      this.baseRewardClaimed = true;
    }

    // 7. 更新 UI
    this.updateModalUI(data);

    // 8. 更新按钮状态
    this.updateButtonStates();

    // 9. 显示弹窗动画
    this.showModalAnimation();
  }

  /**
   * 更新弹窗 UI 文本
   */
  private updateModalUI(data: {
    success: boolean;
    drop?: DropItem;
    round?: number;
    failReason?: 'early' | 'too_early' | 'late';
  }) {
    if (data.success && data.drop) {
      this.modalTitleText.setText(`第 ${data.round} 杆收获`);
      this.modalIconText.setText(VisualMap.getEmoji(data.drop.name));
      this.modalNameText.setText(data.drop.name);
      this.modalHeadlineText.setText(this.getPosterHeadline(data.drop, data.round));
      this.modalEmotionText.setText(this.getPosterEmotionLine(data.drop));
      this.modalRewardText.setText(`+${data.drop.reward} 金币`);
    } else {
      this.modalTitleText.setText('失手了');
      this.modalIconText.setText('😢');
      this.modalNameText.setText('');
      this.modalHeadlineText.setText(this.getFailTitle(data.failReason));
      this.modalEmotionText.setText(this.getFailDesc(data.failReason));
      this.modalRewardText.setText('+0 金币');
    }
  }

  /**
   * 更新按钮状态（显示/隐藏 + 布局重排）
   */
  private updateButtonStates() {
    const result = this.pendingResult;

    // 1. 奖励翻倍按钮：仅当 成功 + 基础奖励 > 0 + 未领取翻倍
    const showDoubleReward = result?.success && (result.baseReward ?? 0) > 0 && !this.doubleRewardClaimed;
    this.doubleBtn.setVisible(showDoubleReward);

    // 2. 分享首奖按钮：仅当 用户从未领取过全局首奖
    const showFirstShare = !this.hasClaimedFirstShareReward;
    this.shareBtn.setVisible(showFirstShare);

    // 3. 再来一杆：永远显示
    this.againBtn.setVisible(true);

    // 4. 布局重排
    this.layoutModalButtons();
  }

  /**
   * 根据可见按钮数量动态布局
   */
  private layoutModalButtons() {
    const baseY = 200;       // 最上方按钮基准 y 坐标
    const buttonHeight = 80;
    const gap = 18;          // 按钮间距

    const visibleButtons: Phaser.GameObjects.Container[] = [];

    // 收集可见按钮（按从上到下顺序：翻倍 > 分享 > 再来一杆）
    if (this.doubleBtn.visible) visibleButtons.push(this.doubleBtn);
    if (this.shareBtn.visible) visibleButtons.push(this.shareBtn);
    // 再来一杆永远可见，放最下方
    if (this.againBtn.visible) visibleButtons.push(this.againBtn);

    // 计算总高度，让按钮组整体居中
    const totalHeight = visibleButtons.length * buttonHeight + (visibleButtons.length - 1) * gap;
    let currentY = baseY - Math.floor((totalHeight - buttonHeight) / 2);

    // 依次布局
    visibleButtons.forEach((btn) => {
      btn.setY(currentY);
      currentY += buttonHeight + gap;
    });
  }

  /**
   * 显示弹窗动画
   */
  private showModalAnimation() {
    // 显示遮罩层：先重置 alpha，再淡入到 0.55
    this.modalOverlay?.setAlpha(0);
    this.modalOverlay?.setVisible(true);
    this.tweens.add({
      targets: this.modalOverlay,
      alpha: 0.55,
      duration: 150,
    });

    // 显示卡片（缩放 + 淡入）
    this.modalCard?.setVisible(true);
    this.tweens.add({
      targets: this.modalCard,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  /**
   * 隐藏结果弹窗
   * @param onComplete - 动画完成后的回调
   */
  private hideResultModal(onComplete?: () => void) {
    // 兜底：对象缺失时直接重置状态并执行回调
    if (!this.modalOverlay || !this.modalCard) {
      this.isModalShowing = false;
      this.modalActionLocked = false;
      onComplete?.();
      return;
    }
    
    // 淡出遮罩
    this.tweens.add({
      targets: this.modalOverlay,
      alpha: 0,
      duration: 150,
    });
    
    // 淡出卡片
    this.tweens.add({
      targets: this.modalCard,
      scale: 0.9,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        // 1. 隐藏卡片
        this.modalCard?.setVisible(false);
        
        // 2. 重置状态
        this.isModalShowing = false;
        
        // 3. 先执行回调（启动下一杆）
        onComplete?.();
        
        // 4. 再恢复底层拉杆按钮交互
        if (!this.pullBtnBg.willDestroy) {
          this.pullBtnBg.setInteractive({ useHandCursor: true });
          this.pullBtnText.setInteractive({ useHandCursor: true });
          this.pullBtnHint.setInteractive({ useHandCursor: true });
        }
        
        // 5. 最后解锁
        this.modalActionLocked = false;
      },
    });
  }

  /**
   * 再来一杆（主按钮）
   */
  private onAgain() {
    // 防重入
    if (this.modalActionLocked) return;
    this.modalActionLocked = true;
    
    // 1. 检查体力
    if (!EnergyManager.instance.hasEnergy()) {
      this.showToast('体力不足，请返回首页补充');
      // 体力不足：关闭弹窗 → 跳转 MainScene
      this.hideResultModal(() => {
        this.time.delayedCall(300, () => this.scene.start('MainScene'));
      });
      return;
    }

    // 2. 扣除体力
    EnergyManager.instance.costEnergy();
    SaveSync.save();

    // 3. 关闭弹窗 → 动画完成后开始下一杆
    this.hideResultModal(() => {
      this.resetAndStartNextRound();
    });
  }

  /**
   * 奖励翻倍（补发差额）
   */
  private onDoubleReward() {
    // 防重入
    if (this.modalActionLocked) return;
    this.modalActionLocked = true;
    
    // 检查条件
    if (!this.pendingResult || this.doubleRewardClaimed) {
      this.modalActionLocked = false;
      return;
    }

    // 补发一份 baseReward
    const doubleAmount = this.pendingResult.baseReward;
    CoinManager.instance.addCoins(doubleAmount);
    this.doubleRewardClaimed = true;

    AnalyticsManager.instance.onAdView('double_reward');
    SaveSync.save();

    this.showToast('奖励已翻倍！');
    
    // 关闭弹窗 → 动画完成后开始下一杆
    this.hideResultModal(() => {
      this.resetAndStartNextRound();
    });
  }

  /**
   * 分享战绩（固定 50 金币）
   */
  private onShare() {
    // 防重入
    if (this.modalActionLocked) return;
    this.modalActionLocked = true;

    try {
      // 检查条件
      if (!this.pendingResult || this.shareRewardClaimed) return;

      // Mock 分享（截图下载）
      ShareManager.saveResultPoster(this, 0, 0, 750, 1334);

      // 发放分享奖励
      CoinManager.instance.addCoins(50);
      this.shareRewardClaimed = true;

      // 持久化标记：当前结果的分享奖励已领取
      const shareKey = `fishing_share_reward_${this.pendingResult.round}_${this.pendingResult.drop?.name ?? 'none'}`;
      localStorage.setItem(shareKey, '1');

      // 持久化标记：全局分享首奖已领取
      localStorage.setItem('fishing_has_claimed_first_share_reward', '1');
      this.hasClaimedFirstShareReward = true;

      AnalyticsManager.instance.onAdView('share');
      SaveSync.save();

      this.showToast('分享成功！+50 金币');

      // 更新按钮状态（隐藏分享首奖按钮）
      this.updateButtonStates();
    } finally {
      // 分享后不关闭弹窗，直接解锁
      this.modalActionLocked = false;
    }
  }

  /**
   * 重置状态并开始下一杆
   */
  private resetAndStartNextRound() {
    // 重置状态
    this.phase = 'idle';
    this.currentDrop = null;
    this.biteStartAt = 0;
    this.pendingResult = null;
    
    // 恢复 UI
    this.stateText.setText('等待鱼咬钩...');
    this.subHintText.setText('鱼影和浮漂有明显变化时再拉杆');
    this.pullBtnBg.setFillStyle(0xff5f5f, 1);
    this.pullBtnText.setText('立刻拉杆');
    this.pullBtnHint.setText('看到明显动静再拉');
    
    // 恢复浮漂和鱼影
    this.floatBobber.setY(520);
    this.floatBobber.setAlpha(1);
    this.fishShadow.setAlpha(0.22);
    this.fishGlow.setAlpha(0.08);
    
    // 刷新提示 UI
    this.refreshHintUI();
    
    // 开始钓鱼流程
    this.startFishingFlow();
  }

  /**
   * 获取结果页主文案（复用 ResultScene 逻辑）
   */
  private getPosterHeadline(drop: DropItem, round?: number): string {
    if (drop.type === 'legend') {
      if (drop.name === '神秘宝箱') return `第${round}杆开出神秘宝箱！`;
      if (drop.name === '钻石戒指') return `第${round}杆捞出钻石戒指！`;
      if (drop.name === '黄金锦鲤') return `第${round}杆钓到黄金锦鲤！`;
      if (drop.name === '龙鱼') return `第${round}杆钓到龙鱼！`;
      return `第${round}杆出了传说级收获！`;
    }

    if (drop.type === 'trash') {
      if (drop.name === '手机') return '我从水里钓出一台手机…';
      if (drop.name === '内裤') return '我居然钓到内裤？？？';
      if (drop.name === '破袜子') return '我刚刚钓到一只破袜子？？？';
      if (drop.name === '螃蟹') return '我刚刚钓到了螃蟹？？？';
      if (drop.name === '乌龟') return '我居然把乌龟钓上来了？？？';
      return `我刚刚钓到了${drop.name}？？？`;
    }

    if (['锦鲤', '巨型草鱼'].includes(drop.name)) {
      return `第${round}杆钓到稀有鱼：${drop.name}`;
    }
    if (['大鲤鱼', '黑鱼', '鲈鱼'].includes(drop.name)) {
      return `第${round}杆出好鱼了：${drop.name}`;
    }
    return `第${round}杆收获一条${drop.name}`;
  }

  /**
   * 获取结果页情绪文案（复用 ResultScene 逻辑）
   */
  private getPosterEmotionLine(drop: DropItem): string {
    const comboLine = DirectorSystem.getComboEmotionLine();

    if (drop.type === 'legend') {
      if (drop.name === '神秘宝箱') {
        return '打开之前我手心在出汗…里面居然真有东西！';
      }
      if (['龙鱼', '黄金锦鲤'].includes(drop.name)) {
        return comboLine || '这条鱼已经够拿出来炫耀了';
      }
      return comboLine || '我直接欧皇了？？？';
    }

    if (drop.type === 'trash') {
      if (drop.name === '手机') {
        return '屏幕还亮着，未接来电：妈妈 (3 次)';
      }
      if (drop.name === '破袜子' || drop.name === '拖鞋' || drop.name === '内裤') {
        return '这片水域不太对劲…';
      }
      if (drop.name === '螃蟹') return '今晚加餐有了';
      if (drop.name === '乌龟') return '这水里到底生活着什么？';
      return drop.flavor || '这也太离谱了吧？！';
    }

    if (['锦鲤', '巨型草鱼'].includes(drop.name)) {
      return comboLine || '这条鱼已经有点稀有了';
    }
    if (['大鲤鱼', '黑鱼', '鲈鱼'].includes(drop.name)) {
      return comboLine || '这一杆明显比普通鱼更值';
    }
    return drop.flavor || '这一杆还挺稳';
  }

  /**
   * 获取失败标题
   */
  private getFailTitle(reason?: 'early' | 'too_early' | 'late'): string {
    if (reason === 'early') return '拉早了！';
    if (reason === 'too_early') return '太急了！';
    return '拉晚了！';
  }

  /**
   * 获取失败描述
   */
  private getFailDesc(reason?: 'early' | 'too_early' | 'late'): string {
    if (reason === 'early') return '鱼还没咬钩，你先把它吓跑了';
    if (reason === 'too_early') return '鱼刚有动静，还没咬稳就拉了';
    return '你出手太慢，鱼已经挣脱了';
  }

  /**
   * 显示提示 Toast
   */
  private showToast(message: string) {
    const L = this.getLayout();
    const bg = this.add.rectangle(L.centerX, L.actionBaseY - 120, 460, 64, 0x000000, 0.56)
      .setStrokeStyle(2, 0xffffff, 0.14);

    const text = this.add.text(L.centerX, L.actionBaseY - 120, message, {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0, [bg, text]);

    this.tweens.add({
      targets: container,
      alpha: 0,
      y: -14,
      delay: 900,
      duration: 260,
      onComplete: () => container.destroy(),
    });
  }

  private refreshHintUI() {
    this.hintText.setText(DirectorSystem.getRoundHint());

    const comboLabel = DirectorSystem.getComboLabel();
    this.comboText.setText(comboLabel);
    this.comboText.setAlpha(comboLabel ? 1 : 0);

    if (comboLabel) {
      this.tweens.add({
        targets: this.comboText,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 220,
        yoyo: true,
      });
    }
  }

  private startFishingFlow() {
    this.phase = 'idle';
    this.currentDrop = null;
    this.biteStartAt = 0;
    this.refreshHintUI();

    this.stateText.setText('等待鱼咬钩...');
    this.subHintText.setText('鱼影和浮漂有明显变化时再拉杆');

    this.time.delayedCall(this.config.biteDelayMs, () => {
      if (!this.scene.isActive()) return;
      if (this.phase !== 'idle') return;

      if (Math.random() < this.config.fakeBiteChance) {
        this.triggerFakeBite();
        return;
      }

      this.triggerBite();
    });
  }

  private triggerFakeBite() {
    this.stateText.setText('好像有动静了…');
    this.subHintText.setText('别急，先观察一下');

    this.tweens.add({
      targets: this.floatBobber,
      y: 548,
      duration: 90,
      yoyo: true,
      repeat: 2,
      onStart: () => SimpleAudio.click(),
      onComplete: () => {
        if (!this.scene.isActive()) return;
        if (this.phase !== 'idle') return;
        this.stateText.setText('鱼还没咬稳，再等等');
        this.subHintText.setText('真正咬钩时动静会更明显');

        this.time.delayedCall(650, () => {
          if (!this.scene.isActive()) return;
          if (this.phase === 'idle') this.triggerBite();
        });
      },
    });
  }

  private triggerBite() {
    this.phase = 'bite';
    this.biteStartAt = this.time.now;

    const dropResult = DropDecider.decideDrop();
    this.currentDrop = dropResult.item;

    this.stateText.setText('咬钩了！快拉杆');
    this.subHintText.setText('红色甜区命中最爽，太早或太晚都会跑鱼');
    this.pullBtnBg.setFillStyle(0xff7a45, 1);
    this.pullBtnText.setText('现在拉！');
    this.pullBtnHint.setText('甜区更赚，拖太久会跑鱼');

    this.playVisualSignal(dropResult.visualType);

    this.tweens.add({
      targets: this.floatBobber,
      y: 560,
      duration: 90,
      yoyo: true,
      repeat: 6,
    });

    // 甜区提示：按钮先橙再红，形成节奏
    this.time.delayedCall(Math.max(60, this.config.earlyToleranceMs), () => {
      if (!this.scene.isActive()) return;
      if (this.phase !== 'bite') return;
      this.pullBtnBg.setFillStyle(0xff3b30, 1);
      this.pullBtnText.setText('甜区！');
      this.pullBtnHint.setText('现在拉最稳');
      this.tweens.add({
        targets: [this.pullBtnBg, this.pullBtnText],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 120,
        yoyo: true,
        repeat: 2,
      });
    });

    // 甜区结束，进入普通成功区
    this.time.delayedCall(this.config.perfectWindowMs, () => {
      if (!this.scene.isActive()) return;
      if (this.phase !== 'bite') return;
      this.pullBtnBg.setFillStyle(0xff9f0a, 1);
      this.pullBtnText.setText('快拉！');
      this.pullBtnHint.setText('再慢就危险了');
    });

    this.time.delayedCall(this.config.goodWindowMs + this.config.lateToleranceMs, () => {
      if (!this.scene.isActive()) return;
      if (this.phase !== 'bite') return;
      this.failAndGo('late');
    });
  }

  private playVisualSignal(visual: VisualType) {
    if (!this.fishShadow || !this.fishGlow) return;

    if (visual === 'big') {
      this.tweens.add({
        targets: [this.fishShadow, this.fishGlow],
        scaleX: DirectorSystem.hasComboBonus() ? 1.34 : 1.26,
        scaleY: DirectorSystem.hasComboBonus() ? 1.34 : 1.26,
        alpha: 0.45,
        duration: 180,
        yoyo: true,
        repeat: 5,
      });
      return;
    }

    if (visual === 'weird') {
      this.tweens.add({
        targets: this.fishShadow,
        x: this.getLayout().centerX + 45,
        duration: 120,
        yoyo: true,
        repeat: 6,
      });
      return;
    }

    if (visual === 'small') {
      this.fishShadow.setScale(0.76);
      this.fishGlow.setScale(0.76);
      this.tweens.add({
        targets: [this.fishShadow, this.fishGlow],
        scaleX: 0.86,
        scaleY: 0.86,
        duration: 140,
        yoyo: true,
        repeat: 5,
      });
      return;
    }

    this.tweens.add({
      targets: this.fishShadow,
      y: 792,
      duration: 180,
      yoyo: true,
      repeat: 4,
    });
  }

  private handlePull() {
    // 弹窗显示时禁止拉杆
    if (this.isModalShowing) return;
    if (this.phase === 'resolved') return;

    SimpleAudio.click();

    this.pullBtnBg.setScale(0.96);
    this.pullBtnText.setScale(0.96);
    this.pullBtnHint.setScale(0.96);

    this.time.delayedCall(90, () => {
      if (this.pullBtnBg.active) this.pullBtnBg.setScale(1);
      if (this.pullBtnText.active) this.pullBtnText.setScale(1);
      if (this.pullBtnHint.active) this.pullBtnHint.setScale(1);
    });

    if (this.phase === 'idle') {
      this.failAndGo('too_early');
      return;
    }

    if (this.phase !== 'bite') return;

    const elapsed = this.time.now - this.biteStartAt;

    if (elapsed < this.config.earlyToleranceMs) {
      this.failAndGo('early');
      return;
    }

    if (elapsed <= this.config.perfectWindowMs) {
      this.successAndGo(true);
      return;
    }

    if (elapsed <= this.config.goodWindowMs) {
      this.successAndGo(false);
      return;
    }

    this.failAndGo('late');
  }

  private successAndGo(perfect: boolean) {
    this.phase = 'resolved';
    DirectorSystem.recordSuccess();
    DirectorSystem.nextRound();
    SaveSync.save();

    this.stateText.setText(perfect ? '完美命中！' : (DirectorSystem.getCombo() >= 2 ? `命中！${DirectorSystem.getCombo()}连击` : '上钩了！'));
    this.subHintText.setText(
      perfect
        ? '这一下拉得很准，奖励感更强'
        : DirectorSystem.getCombo() >= 3
          ? '状态火热，下一杆更有机会出节目效果'
          : '看看这一杆到底捞到了什么'
    );

    this.tweens.add({
      targets: this.floatBobber,
      y: 450,
      duration: 240,
      ease: 'Back.easeIn',
    });

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      alpha: 0,
      duration: 180,
    });

    if (perfect) {
      this.tweens.add({
        targets: [this.titleText, this.stateText, this.pullBtnBg],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 140,
        yoyo: true,
        repeat: 1,
      });
    } else if (DirectorSystem.getCombo() >= 2) {
      this.tweens.add({
        targets: [this.titleText, this.stateText],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 160,
        yoyo: true,
      });
    }

    const rewardBoost = perfect && this.currentDrop
      ? { ...this.currentDrop, reward: Math.round(this.currentDrop.reward * 1.25) }
      : this.currentDrop ?? DropDecider.generateFallback();

    this.time.delayedCall(380, () => {
      if (!this.scene.isActive()) return;
      this.showResultModal({
        success: true,
        drop: rewardBoost,
        round: this.roundNumber,
        baseReward: rewardBoost.reward,
        perfect,
      });
    });
  }

  private failAndGo(reason: 'early' | 'too_early' | 'late') {
    this.phase = 'resolved';
    DirectorSystem.recordFail();
    DirectorSystem.nextRound();
    SaveSync.save();

    this.stateText.setText(
      reason === 'late'
        ? '慢了半拍…'
        : reason === 'early'
          ? '拉早了一点…'
          : '这一杆失手了'
    );

    this.subHintText.setText(
      reason === 'too_early'
        ? '鱼还没咬钩就出手了'
        : reason === 'early'
          ? '鱼刚咬钩，你出手太急了'
          : '咬钩后拖太久，鱼跑了'
    );

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      x: this.getLayout().width - 140,
      alpha: 0,
      duration: 220,
      ease: 'Sine.easeIn',
    });

    this.tweens.add({
      targets: this.floatBobber,
      y: 535,
      duration: 120,
      yoyo: true,
      repeat: 1,
    });

    this.time.delayedCall(320, () => {
      if (!this.scene.isActive()) return;
      this.showResultModal({
        success: false,
        round: this.roundNumber,
        failReason: reason,
      });
    });
  }
}
