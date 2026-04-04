import Phaser from 'phaser';
import { DirectorSystem, type VisualType } from './DirectorSystem';
import { DropGenerator, type DropItem } from './DropGenerator';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';
import { AnalyticsManager } from './AnalyticsManager';
import { ResultModal } from './ResultModal';
import { EnergyModal } from './EnergyModal';
import { EnergyManager } from './EnergyManager';
import { DailyMissionManager } from './DailyMissionManager';
import { GrowthMissionManager } from './GrowthMissionManager';
import { StorageManager } from './StorageManager';
import { UIConstants } from './UIConstants';
import { buildRoundResult, type RoundResult } from './types/RoundResult';
import { CollectionManager } from './managers/CollectionManager';

// ==================== 浮漂美术资源 Key（资源优先 + 图形兜底）====================
const BOBBER_ASSETS = {
  body: 'fishing-bobber',        // 浮漂主体资源 key
  glow: 'fishing-bobber-glow',    // 浮漂光晕资源 key
  line: 'fishing-line',           // 鱼线资源 key
};

// ==================== CTA 按钮美术资源 Key（资源优先 + 图形兜底）====================
const CTA_ASSETS = {
  base: 'fishing-cta-base',      // 默认态按钮背景
  danger: 'fishing-cta-danger',  // 咬钩/危险态按钮背景
  sweet: 'fishing-cta-sweet',    // 甜区态按钮背景
  shadow: 'fishing-cta-shadow',  // 按钮阴影
};

// ==================== 水下装饰美术资源 Key（资源优先 + 图形兜底）====================
const UNDERWATER_ASSETS = {
  seaweedLeft: 'fishing-seaweed-left',    // 左侧海草
  seaweedRight: 'fishing-seaweed-right',  // 右侧海草
  coralLeft: 'fishing-coral-left',        // 左侧珊瑚
  coralRight: 'fishing-coral-right',      // 右侧珊瑚
  sandLeft: 'fishing-sand-left',          // 左侧沙地
  sandCenter: 'fishing-sand-center',      // 中间沙地
  sandRight: 'fishing-sand-right',        // 右侧沙地
};

// ==================== 水面层美术资源 Key（资源优先 + 图形兜底）====================
const WATER_SURFACE_ASSETS = {
  waterBand: 'fishing-water-band',      // 中部浅层水域带
  waterLine: 'fishing-water-line',      // 水面分界线
  bobberRipple: 'fishing-bobber-ripple',// 浮漂下方浅波纹
  waterOverlay: 'fishing-water-overlay',// 可选浅层覆盖纹理
};

// ==================== 场景背景美术资源 Key（资源优先 + 图形兜底）====================
const SCENE_BG_ASSETS = {
  sky: 'fishing-bg-sky',        // 顶部天空层
  backdrop: 'fishing-bg-backdrop',  // 整体远景背景层（可选）
  deepWater: 'fishing-bg-deep-water',  // 深水区背景层
  overlay: 'fishing-bg-overlay',  // 可选整体背景 overlay
};

// ==================== 固定布局常量（统一三段式结构）====================
const FISHING_LAYOUT = {
  // 画布尺寸
  width: 750,
  height: 1334,
  centerX: 375,

  // 顶部安全区
  safeTop: 24,

  // TopHUD 顶部信息区（整体收紧，层级更清晰）
  titleY: 80,           // 主标题上移 15px，给下方留呼吸空间
  hintY: 140,           // 黄字提示上移 10px，靠近标题
  comboY: 170,          // 连击提示上移 14px，与 hint 保持紧凑
  stateTextY: 210,      // 状态文案上移 14px，与 combo 拉开层次
  subHintY: 245,        // 副状态上移 21px，整体更紧凑
  energyX: 726,         // 体力显示 X（右对齐）
  energyY: 24,          // 体力显示 Y

  // FishingStage 中部钓鱼舞台
  waterLineY: 560,      // 水面线 Y 坐标（不变）
  floatBaseY: 520,      // 浮漂基准 Y 坐标（不变）
  fishShadowY: 680,     // 鱼影上移 80px，回到中部舞台核心区

  // BottomAction 底部操作区（整体下沉，更贴合底部）
  bottomPanelY: 780,    // 承载层下沉 60px，更贴合底部
  bottomPanelHeight: 132,
  actionButtonY: 770,   // 按钮下沉 60px，与承载层同步
  actionButtonOffsetY: -10,

  // 地形装饰（下移 50px，给鱼影让位，远离按钮区）
  sandY: 680,           // 沙地下移 52px
  plantBaseY: 600,      // 水草下移 50px
  coralBaseY: 540,      // 珊瑚下移 50px
};

type Phase = 'idle' | 'bite' | 'resolved';

export class FishingScene extends Phaser.Scene {
  private phase: Phase = 'idle';
  private roundNumber = 1;

  private floatBobber!: Phaser.GameObjects.Container;
  private floatBobberParts: {
    line?: Phaser.GameObjects.GameObject;
    glow?: Phaser.GameObjects.GameObject;
    bodyParts: Phaser.GameObjects.GameObject[];  // 浮漂主体部件数组（资源模式 1 个，fallback 模式 2 个）
  } = { bodyParts: [] };  // 浮漂子元素引用（便于复位）
  private fishShadow!: Phaser.GameObjects.Ellipse;
  private fishGlow!: Phaser.GameObjects.Ellipse;
  private waterGlow!: Phaser.GameObjects.Ellipse;  // 水面光圈效果
  private floatBobberBaseTween!: Phaser.Tweens.Tween;  // 基础浮动 tween（可停止）

  private titleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private subHintText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;  // 体力显示文本

  private pullBtnBg!: Phaser.GameObjects.Rectangle;  // 稳定交互底层（永远是 rectangle）
  private pullBtnOverlay?: Phaser.GameObjects.Image;  // 可选 image overlay 层（资源存在时显示）
  private pullBtnShadow!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;  // 按钮阴影
  private pullBtnText!: Phaser.GameObjects.Text;
  private pullBtnHint!: Phaser.GameObjects.Text;
  private pullBtnState: 'base' | 'danger' | 'sweet' | 'normal' = 'base';  // 按钮当前状态（新增 normal 普通成功区）

  private biteStartAt = 0;
  private currentDrop: DropItem | null = null;
  private config = DirectorSystem.getTimingAssist();

  constructor() {
    super('FishingScene');
  }

  create(data?: { round?: number }) {
    this.roundNumber = data?.round ?? DirectorSystem.getRoundNumber();
    this.config = DirectorSystem.getTimingAssist();

    this.buildScene();
    this.startFishingFlow();
  }

  /** 判断是否为高品质鱼（与 ResultScene 保持一致） */
  private isQualityFish(name?: string): boolean {
    const qualityFishList = [
      '大鲤鱼', '黑鱼', '鲈鱼', '金鲫鱼', // goodFish
      '锦鲤', '巨型草鱼', // rareFish
      '龙鱼', '黄金锦鲤', // mythFish
    ];
    return qualityFishList.includes(name || '');
  }

  // ==================== 渲染结构拆分（三段式布局）====================

  /** 创建浮漂视觉组件（资源优先 + 图形兜底） */
  private createBobberVisual(): Phaser.GameObjects.GameObject[] {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const bodyParts: Phaser.GameObjects.GameObject[] = [];

    // === 1. 鱼线（最底层）===
    if (this.textures.exists(BOBBER_ASSETS.line)) {
      // 使用美术资源
      const lineImg = this.add.image(0, -65, BOBBER_ASSETS.line);
      lineImg.setDisplaySize(4, 130);  // 保持与原矩形一致的尺寸感
      parts.push(lineImg);
    } else {
      // Fallback 到图形
      const lineRect = this.add.rectangle(0, -65, 4, 130, 0xffffff, 0.9);
      parts.push(lineRect);
    }

    // === 2. 浮漂光晕（中间层）===
    if (this.textures.exists(BOBBER_ASSETS.glow)) {
      // 使用美术资源
      const glowImg = this.add.image(0, 8, BOBBER_ASSETS.glow);
      glowImg.setAlpha(0.15);
      parts.push(glowImg);
    } else {
      // Fallback 到图形（保留当前 circle glow）
      const glowCircle = this.add.circle(0, 8, 18, 0xff5f5f, 0.15);
      parts.push(glowCircle);
    }

    // === 3. 浮漂主体（最上层）===
    if (this.textures.exists(BOBBER_ASSETS.body)) {
      // 使用美术资源
      const bobberImg = this.add.image(0, 0, BOBBER_ASSETS.body);
      // 调整锚点，让浮漂顶部红球位置与原 circle 位置一致
      bobberImg.setOrigin(0.5, 0.3);  // 锚点上移，让浮漂主体向下延伸
      parts.push(bobberImg);
      bodyParts.push(bobberImg);  // 资源模式：bodyParts = [bobberImg]
    } else {
      // Fallback 到图形（红白浮漂）
      const bobberTop = this.add.circle(0, 0, 10, 0xff5f5f);  // 顶部红球
      const bobberBottom = this.add.circle(0, 16, 13, 0xffffff);  // 底部白球
      parts.push(bobberTop, bobberBottom);
      bodyParts.push(bobberTop, bobberBottom);  // fallback 模式：bodyParts = [bobberTop, bobberBottom]
    }

    // 保存引用便于后续复位
    this.floatBobberParts = {
      line: parts[0],
      glow: parts[1],
      bodyParts: bodyParts,
    };

    return parts;
  }

  /** 创建按钮视觉组件（资源优先 + 图形兜底） */
  private createPullButtonVisual(state: 'base' | 'danger' | 'sweet' | 'normal'): {
    shadow: Phaser.GameObjects.GameObject;
    bg: Phaser.GameObjects.Rectangle;
  } {
    const buttonY = FISHING_LAYOUT.actionButtonY + FISHING_LAYOUT.actionButtonOffsetY;
    const shadowY = buttonY + 6;

    // === 1. 按钮阴影 ===
    let shadow: Phaser.GameObjects.GameObject;
    if (this.textures.exists(CTA_ASSETS.shadow)) {
      // 使用美术资源
      const shadowImg = this.add.image(FISHING_LAYOUT.centerX, shadowY, CTA_ASSETS.shadow);
      shadowImg.setDisplaySize(450, 104);
      shadow = shadowImg;
    } else {
      // Fallback 到图形
      const shadowRect = this.add.rectangle(FISHING_LAYOUT.centerX, shadowY, 450, 104, 0x000000, 0.25);
      shadow = shadowRect;
    }

    // === 2. 按钮背景（永远是 rectangle，作为稳定交互底层）===
    const fillColor = state === 'base' ? 0xff5f5f  // 红色默认
      : state === 'danger' ? 0xff7a45  // 橙色危险
        : state === 'sweet' ? 0xff3b30  // 鲜红甜区
          : 0xff9f0a;  // 黄色普通成功区
    const bgRect = this.add.rectangle(FISHING_LAYOUT.centerX, buttonY, 450, 104, fillColor)
      .setStrokeStyle(4, 0xffffff, 0.18)
      .setInteractive({ useHandCursor: true });

    // === 3. 不再在此创建 overlay（避免层级问题）===
    // overlay 将在 renderBottomAction() 中统一创建，确保层级正确

    return { shadow, bg: bgRect };
  }

  /** 创建水下装饰组件（资源优先 + 图形兜底） */
  private createUnderwaterDecor(): void {
    // === 1. 海草（资源优先）===
    if (this.textures.exists(UNDERWATER_ASSETS.seaweedLeft)) {
      const seaweedLeft = this.add.image(135, FISHING_LAYOUT.plantBaseY, UNDERWATER_ASSETS.seaweedLeft);
      seaweedLeft.setDisplaySize(60, 80);
      seaweedLeft.setAlpha(0.90);
    } else {
      // Fallback 到 emoji
      this.add.text(135, FISHING_LAYOUT.plantBaseY, '🌿', { fontSize: '54px' })
        .setOrigin(0.5).setAlpha(0.90);
    }

    if (this.textures.exists(UNDERWATER_ASSETS.seaweedRight)) {
      const seaweedRight = this.add.image(610, FISHING_LAYOUT.plantBaseY - 10, UNDERWATER_ASSETS.seaweedRight);
      seaweedRight.setDisplaySize(54, 72);
      seaweedRight.setAlpha(0.88);
    } else {
      // Fallback 到 emoji
      this.add.text(610, FISHING_LAYOUT.plantBaseY - 10, '🌱', { fontSize: '48px' })
        .setOrigin(0.5).setAlpha(0.88);
    }

    // === 2. 珊瑚（资源优先）===
    if (this.textures.exists(UNDERWATER_ASSETS.coralLeft)) {
      const coralLeft = this.add.image(178, FISHING_LAYOUT.coralBaseY, UNDERWATER_ASSETS.coralLeft);
      coralLeft.setDisplaySize(64, 80);
      coralLeft.setAlpha(0.92);
    } else {
      // Fallback 到 emoji
      this.add.text(178, FISHING_LAYOUT.coralBaseY, '🪸', { fontSize: '56px' })
        .setOrigin(0.5).setAlpha(0.92);
    }

    if (this.textures.exists(UNDERWATER_ASSETS.coralRight)) {
      const coralRight = this.add.image(565, FISHING_LAYOUT.coralBaseY - 10, UNDERWATER_ASSETS.coralRight);
      coralRight.setDisplaySize(70, 88);
      coralRight.setAlpha(0.90);
    } else {
      // Fallback 到 emoji
      this.add.text(565, FISHING_LAYOUT.coralBaseY - 10, '🪸', { fontSize: '62px' })
        .setOrigin(0.5).setAlpha(0.90);
    }

    // === 3. 沙地（资源优先）===
    if (this.textures.exists(UNDERWATER_ASSETS.sandLeft) &&
        this.textures.exists(UNDERWATER_ASSETS.sandCenter) &&
        this.textures.exists(UNDERWATER_ASSETS.sandRight)) {
      // 三个沙地资源都存在，使用资源
      const sandLeft = this.add.image(200, FISHING_LAYOUT.sandY, UNDERWATER_ASSETS.sandLeft);
      sandLeft.setDisplaySize(220, 58);
      sandLeft.setAlpha(0.7);  // 从 0.75 降到 0.7，降低色块感

      const sandCenter = this.add.image(392, FISHING_LAYOUT.sandY + 15, UNDERWATER_ASSETS.sandCenter);
      sandCenter.setDisplaySize(260, 72);
      sandCenter.setAlpha(0.7);  // 从 0.75 降到 0.7

      const sandRight = this.add.image(575, FISHING_LAYOUT.sandY + 2, UNDERWATER_ASSETS.sandRight);
      sandRight.setDisplaySize(220, 60);
      sandRight.setAlpha(0.7);  // 从 0.75 降到 0.7
    } else {
      // Fallback 到 ellipse（只要有一个资源不存在就用 ellipse）
      const sandColor = 0xd8c28a;
      this.add.ellipse(200, FISHING_LAYOUT.sandY, 220, 58, sandColor, 0.7);  // 从 0.75 降到 0.7
      this.add.ellipse(392, FISHING_LAYOUT.sandY + 15, 260, 72, sandColor, 0.7);  // 从 0.75 降到 0.7
      this.add.ellipse(575, FISHING_LAYOUT.sandY + 2, 220, 60, sandColor, 0.7);  // 从 0.75 降到 0.7
    }
  }

  /** 创建水面层视觉组件（资源优先 + 图形兜底） */
  private createWaterSurfaceVisual(): void {
    // === 1. 中部浅层水域带（资源优先）===
    if (this.textures.exists(WATER_SURFACE_ASSETS.waterBand)) {
      const waterBand = this.add.image(FISHING_LAYOUT.centerX, FISHING_LAYOUT.waterLineY + 100, WATER_SURFACE_ASSETS.waterBand);
      waterBand.setDisplaySize(FISHING_LAYOUT.width, 400);
      waterBand.setAlpha(0.12);  // 从 0.15 降到 0.12，进一步降低色块感
    } else {
      // Fallback 到 rectangle
      const waterGradientTop = this.add.rectangle(FISHING_LAYOUT.centerX, FISHING_LAYOUT.waterLineY + 100, FISHING_LAYOUT.width, 400, 0x4fc3f7);
      waterGradientTop.setAlpha(0.12);  // 从 0.15 降到 0.12
    }

    // === 2. 水面分界线（资源优先）===
    if (this.textures.exists(WATER_SURFACE_ASSETS.waterLine)) {
      const waterLine = this.add.image(FISHING_LAYOUT.centerX, FISHING_LAYOUT.waterLineY, WATER_SURFACE_ASSETS.waterLine);
      waterLine.setDisplaySize(FISHING_LAYOUT.width, 6);
      waterLine.setAlpha(0.85);  // 从 0.9 降到 0.85，更柔和
    } else {
      // Fallback 到 rectangle
      this.add.rectangle(FISHING_LAYOUT.centerX, FISHING_LAYOUT.waterLineY, FISHING_LAYOUT.width, 6, 0xeafcff).setAlpha(0.85);  // 从 0.9 降到 0.85
    }

    // === 3. 浮漂下方浅波纹（资源优先，保留作为唯一浅波纹表达）===
    if (this.textures.exists(WATER_SURFACE_ASSETS.bobberRipple)) {
      const bobberRipple = this.add.image(FISHING_LAYOUT.centerX, FISHING_LAYOUT.waterLineY + 10, WATER_SURFACE_ASSETS.bobberRipple);
      bobberRipple.setDisplaySize(120, 30);
      bobberRipple.setAlpha(0.05);  // 从 0.06 降到 0.05，更低调
      // 保存引用用于后续动画
      this.waterGlow = bobberRipple;
    } else {
      // Fallback 到 ellipse
      this.waterGlow = this.add.ellipse(FISHING_LAYOUT.centerX, FISHING_LAYOUT.waterLineY + 10, 120, 30, 0xffffff, 0.05);  // 从 0.06 降到 0.05
    }

    // 浮漂光圈动画（保留，但降低幅度）
    this.tweens.add({
      targets: this.waterGlow,
      scaleX: 1.12,
      scaleY: 1.08,
      alpha: 0.025,   // 从 0.03 降到 0.025，更微弱
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // === 4. 可选浅层覆盖纹理 overlay（仅资源存在时启用，进一步弱化）===
    if (this.textures.exists(WATER_SURFACE_ASSETS.waterOverlay)) {
      const waterOverlay = this.add.image(FISHING_LAYOUT.centerX, FISHING_LAYOUT.waterLineY + 50, WATER_SURFACE_ASSETS.waterOverlay);
      waterOverlay.setDisplaySize(FISHING_LAYOUT.width, 300);
      waterOverlay.setAlpha(0.03);  // 从 0.04 降到 0.03，更轻的存在感
    }
    // 注意：不再创建额外的水面涟漪装饰（ripple1 / ripple2），避免中层水域过重
  }

  /** 切换按钮状态视觉（不 destroy，轻量切换） */
  private setPullButtonState(state: 'base' | 'danger' | 'sweet' | 'normal'): void {
    this.pullBtnState = state;

    // === 1. 切换 rectangle 背景颜色（fallback 永远有效）===
    const fillColor = state === 'base' ? 0xff5f5f  // 红色默认
      : state === 'danger' ? 0xff7a45  // 橙色危险
        : state === 'sweet' ? 0xff3b30  // 鲜红甜区
          : 0xff9f0a;  // 黄色普通成功区
    this.pullBtnBg.setFillStyle(fillColor);

    // === 2. 处理 overlay 层（资源存在时显示，不存在时隐藏）===
    const textureKey = state === 'base' ? CTA_ASSETS.base
      : state === 'danger' ? CTA_ASSETS.danger
        : state === 'sweet' ? CTA_ASSETS.sweet
          : undefined;  // normal 态暂无独立资源

    if (textureKey && this.textures.exists(textureKey)) {
      // 资源存在：显示 overlay 并切换 texture
      if (this.pullBtnOverlay) {
        // overlay 已存在，切换 texture
        this.pullBtnOverlay.setTexture(textureKey);
        this.pullBtnOverlay.setVisible(true);
      }
      // 如果 overlay 不存在（base 资源不存在），则只显示 rectangle 背景
    } else {
      // 资源不存在：隐藏 overlay，只显示 rectangle 背景
      if (this.pullBtnOverlay) {
        this.pullBtnOverlay.setVisible(false);
      }
    }
  }

  private buildScene(): void {
    this.cameras.main.setBackgroundColor('#8FD3FF');

    // === 整页背景层视觉组件（资源优先 + 图形兜底）===
    this.createSceneBackground();

    // 三段式渲染
    this.renderTopHUD();
    this.renderFishingStage();
    this.renderBottomAction();
  }

  /** 创建整页背景层视觉组件（资源优先 + 图形兜底） */
  private createSceneBackground(): void {
    // === 1. 顶部天空层（资源优先）===
    if (this.textures.exists(SCENE_BG_ASSETS.sky)) {
      // 天空层占据顶部约 1/3 区域
      const skyY = FISHING_LAYOUT.height * 0.25;
      const skyHeight = FISHING_LAYOUT.height * 0.5;
      const sky = this.add.image(FISHING_LAYOUT.centerX, skyY, SCENE_BG_ASSETS.sky);
      sky.setDisplaySize(FISHING_LAYOUT.width, skyHeight);
      sky.setAlpha(0.85);  // 从 0.9 降到 0.85，降低色块感
    } else {
      // Fallback：顶部浅蓝背景（当前方案）
      this.add.rectangle(FISHING_LAYOUT.centerX, FISHING_LAYOUT.height / 2, FISHING_LAYOUT.width, FISHING_LAYOUT.height, 0x8fd3ff);
    }

    // === 2. 整体远景背景层（可选，仅资源存在时创建）===
    if (this.textures.exists(SCENE_BG_ASSETS.backdrop)) {
      const backdrop = this.add.image(FISHING_LAYOUT.centerX, FISHING_LAYOUT.height / 2, SCENE_BG_ASSETS.backdrop);
      backdrop.setDisplaySize(FISHING_LAYOUT.width, FISHING_LAYOUT.height);
      backdrop.setAlpha(0.06);  // 从 0.08 降到 0.06，进一步弱化
    }

    // === 3. 深水区背景层（资源优先）===
    if (this.textures.exists(SCENE_BG_ASSETS.deepWater)) {
      const deepWater = this.add.image(FISHING_LAYOUT.centerX, 1015, SCENE_BG_ASSETS.deepWater);
      deepWater.setDisplaySize(FISHING_LAYOUT.width, 640);
      deepWater.setAlpha(0.8);  // 从 0.85 降到 0.8，保持通透感
    } else {
      // Fallback：深蓝背景 rectangle（当前方案）
      this.add.rectangle(FISHING_LAYOUT.centerX, 1015, FISHING_LAYOUT.width, 640, 0x1e88e5);
    }

    // === 4. 可选整体背景 overlay（仅资源存在时启用）===
    if (this.textures.exists(SCENE_BG_ASSETS.overlay)) {
      const overlay = this.add.image(FISHING_LAYOUT.centerX, FISHING_LAYOUT.height / 2, SCENE_BG_ASSETS.overlay);
      overlay.setDisplaySize(FISHING_LAYOUT.width, FISHING_LAYOUT.height);
      overlay.setAlpha(0.03);  // 从 0.04 降到 0.03，极低存在感
    }
  }

  /** 渲染顶部信息区（TopHUD） */
  private renderTopHUD(): void {
    // 主标题
    this.titleText = this.add.text(FISHING_LAYOUT.centerX, FISHING_LAYOUT.titleY, '🎣 正在钓鱼', {
      fontSize: '46px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // 导演提示
    this.hintText = this.add.text(FISHING_LAYOUT.centerX, FISHING_LAYOUT.hintY, DirectorSystem.getRoundHint(), {
      fontSize: '24px',
      color: '#FFF3B0',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      wordWrap: { width: 620 },
      align: 'center',
    }).setOrigin(0.5);

    // 连击提示
    this.comboText = this.add.text(FISHING_LAYOUT.centerX, FISHING_LAYOUT.comboY, DirectorSystem.getComboLabel(), {
      fontSize: '22px',
      color: '#FFE082',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(DirectorSystem.getCombo() >= 2 ? 1 : 0);

    // 体力显示（右上角 HUD 区）
    this.energyText = this.add.text(FISHING_LAYOUT.energyX, FISHING_LAYOUT.energyY, '⚡ 3/5', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0);
    this.refreshEnergyText();

    // 操作状态文案
    this.stateText = this.add.text(FISHING_LAYOUT.centerX, FISHING_LAYOUT.stateTextY, '等待鱼咬钩...', {
      fontSize: '30px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 副状态文案
    this.subHintText = this.add.text(FISHING_LAYOUT.centerX, FISHING_LAYOUT.subHintY, '看到明显动静时再拉杆，别太早也别太晚', {
      fontSize: '20px',
      color: '#EAF6FF',
      wordWrap: { width: 620 },
      align: 'center',
    }).setOrigin(0.5);
  }

  /** 渲染中部钓鱼舞台（FishingStage） */
  private renderFishingStage(): void {
    // === 水面层视觉组件（资源优先 + 图形兜底）===
    this.createWaterSurfaceVisual();

    // === 浮漂 + 鱼线（视觉中心轴，资源优先 + 图形兜底）===
    const bobberVisualParts = this.createBobberVisual();
    this.floatBobber = this.add.container(FISHING_LAYOUT.centerX, FISHING_LAYOUT.floatBaseY, bobberVisualParts);

    // 浮漂基础浮动动画（保存引用，便于咬钩时暂停）
    this.floatBobberBaseTween = this.tweens.add({
      targets: this.floatBobber,
      y: FISHING_LAYOUT.floatBaseY + 6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // === 鱼影（水下中段，更低调）===
    const shadowRange = DirectorSystem.getShadowScaleRange();
    const shadowW = Phaser.Math.Between(
      Math.floor(95 * shadowRange.min),
      Math.floor(95 * shadowRange.max)
    );
    const shadowH = Phaser.Math.Between(
      Math.floor(34 * shadowRange.min),
      Math.floor(34 * shadowRange.max)
    );

    this.fishGlow = this.add.ellipse(FISHING_LAYOUT.centerX + 15, FISHING_LAYOUT.fishShadowY, shadowW + 22, shadowH + 10, 0x000000, 0.04);  // 从 0.06 降到 0.04
    this.fishShadow = this.add.ellipse(FISHING_LAYOUT.centerX + 15, FISHING_LAYOUT.fishShadowY, shadowW, shadowH, 0x000000, 0.14);  // 从 0.18 降到 0.14

    // 鱼影基础移动（左右游动 + 上下浮动，幅度减小）
    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      x: FISHING_LAYOUT.centerX + 65,  // 从 +95 减小到 +65，幅度减小
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      y: FISHING_LAYOUT.fishShadowY + 12,  // 从 +18 减小到 +12，上下幅度减小
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // === 鱼影呼吸效果（alpha 更微弱，不抢主视觉）===
    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      alpha: 0.22,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // === 水下装饰组件（资源优先 + 图形兜底）===
    this.createUnderwaterDecor();
  }

  /** 渲染底部操作区（BottomAction） */
  private renderBottomAction(): void {
    const buttonY = FISHING_LAYOUT.actionButtonY + FISHING_LAYOUT.actionButtonOffsetY;

    // === 轻量承载层（更弱，更像托底）===
    this.add.rectangle(FISHING_LAYOUT.centerX, FISHING_LAYOUT.bottomPanelY, 520, FISHING_LAYOUT.bottomPanelHeight, 0x000000, 0.06)
      .setStrokeStyle(2, 0xffffff, 0.06);

    // === CTA 按钮视觉组件（资源优先 + 图形兜底）===
    const buttonVisuals = this.createPullButtonVisual('base');
    this.pullBtnShadow = buttonVisuals.shadow;
    this.pullBtnBg = buttonVisuals.bg;  // 永远是 rectangle，稳定交互底层

    // === 创建 overlay 层（如果 base 资源存在就创建，确保层级在 bg 和 text 之间）===
    if (this.textures.exists(CTA_ASSETS.base)) {
      const overlayImg = this.add.image(FISHING_LAYOUT.centerX, buttonY, CTA_ASSETS.base);
      overlayImg.setDisplaySize(450, 104);
      this.pullBtnOverlay = overlayImg;
    } else {
      this.pullBtnOverlay = undefined;
    }

    // === 按钮文字（在 overlay 之后创建，确保层级在 overlay 上方）===
    this.pullBtnText = this.add.text(FISHING_LAYOUT.centerX, buttonY - 12, '立刻拉杆', {
      fontSize: '36px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 按钮说明文案（弱化视觉权重）
    this.pullBtnHint = this.add.text(FISHING_LAYOUT.centerX, buttonY + 28, '看到明显动静再拉', {
      fontSize: '18px',
      color: '#FFEFEF',
    }).setOrigin(0.5);

    // === 交互绑定（只绑定 rectangle 背景层）===
    this.pullBtnText.setInteractive({ useHandCursor: true });
    this.pullBtnHint.setInteractive({ useHandCursor: true });

    const onPull = () => this.handlePull();
    this.pullBtnBg.on('pointerdown', onPull);
    this.pullBtnText.on('pointerdown', onPull);
    this.pullBtnHint.on('pointerdown', onPull);

    // === 按钮点击反馈（只缩放背景，文本不缩放）===
    this.pullBtnBg.on('pointerdown', () => {
      this.tweens.add({
        targets: this.pullBtnBg,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 80,
        yoyo: true,
        ease: 'Back.easeOut',
      });
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

  /** 刷新体力显示 */
  private refreshEnergyText() {
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    this.energyText.setText(`⚡ ${energy}/${maxEnergy}`);
  }

  private startFishingFlow() {
    this.phase = 'idle';
    this.currentDrop = null;
    this.refreshHintUI();

    this.stateText.setText('等待鱼咬钩...');
    this.subHintText.setText('鱼影和浮漂有明显变化时再拉杆');

    // 日常任务：完成钓鱼次数（每次新杆开始）
    DailyMissionManager.instance.advanceTask('cast_5', 1);

    // 成长任务：累计钓鱼次数（每次真实下杆）
    GrowthMissionManager.instance.init();
    GrowthMissionManager.instance.advanceCast(1);

    this.time.delayedCall(this.config.biteDelayMs, () => {
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
        if (this.phase !== 'idle') return;
        this.stateText.setText('鱼还没咬稳，再等等');
        this.subHintText.setText('真正咬钩时动静会更明显');

        this.time.delayedCall(650, () => {
          if (this.phase === 'idle') this.triggerBite();
        });
      },
    });
  }

  private triggerBite() {
    this.phase = 'bite';
    this.biteStartAt = this.time.now;

    const kind = DirectorSystem.decideDropKind();

    if (kind === 'legend') {
      this.currentDrop = DropGenerator.generateLegend();
    } else if (kind === 'trash') {
      this.currentDrop = DropGenerator.generateTrash();
    } else if (kind === 'interesting') {
      this.currentDrop = DropGenerator.generateInteresting();
    } else if (DirectorSystem.shouldSoftProtectSuccess()) {
      this.currentDrop = DropGenerator.generateSafeFish();
    } else if (DirectorSystem.shouldForceInterestingOutcome()) {
      this.currentDrop = DropGenerator.generateInteresting();
    } else {
      this.currentDrop = DropGenerator.generate();
    }

    this.stateText.setText('咬钩了！快拉杆');
    this.subHintText.setText('红色甜区命中最爽，太早或太晚都会跑鱼');
    this.setPullButtonState('danger');  // 切换按钮到危险态
    this.pullBtnText.setText('现在拉！');
    this.pullBtnHint.setText('甜区更赚，拖太久会跑鱼');

    const visual = DirectorSystem.decideVisualType(this.currentDrop.type);
    this.playVisualSignal(visual);

    // === 咬钩时暂停基础浮动 tween，避免冲突 ===
    this.floatBobberBaseTween.pause();

    // === 咬钩信号增强：浮漂先快速下沉再上浮，形成明显节奏 ===
    this.tweens.add({
      targets: this.floatBobber,
      y: 575,
      duration: 120,
      ease: 'Back.easeIn',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        // 进入持续抖动
        this.tweens.add({
          targets: this.floatBobber,
          y: 560,
          duration: 90,
          yoyo: true,
          repeat: 6,
        });
      },
    });

    // === 浮漂强化：咬钩瞬间 scale 1 → 1.15 → 1 ===
    this.tweens.add({
      targets: this.floatBobber,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 100,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // === 鱼影也增加对应动作 ===
    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      y: FISHING_LAYOUT.fishShadowY + 20,
      duration: 100,
      ease: 'Sine.easeOut',
      yoyo: true,
      repeat: 1,
    });

    // === 鱼影咬钩时 alpha 提高（微弱增强）===
    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      alpha: 0.45,
      duration: 100,
      yoyo: false,
    });

    // 甜区提示：按钮先橙再红，形成节奏
    this.time.delayedCall(Math.max(60, this.config.earlyToleranceMs), () => {
      if (this.phase !== 'bite') return;
      this.setPullButtonState('sweet');  // 切换按钮到甜区态
      this.pullBtnText.setText('甜区！');
      this.pullBtnHint.setText('现在拉最稳');

      // === 甜区阶段：浮漂轻微呼吸动画（scale 1 ↔ 1.05）===
      this.tweens.add({
        targets: this.floatBobber,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
      });

      // === 甜区提示强化：按钮增加 glow 效果 ===
      this.tweens.add({
        targets: [this.pullBtnBg, this.pullBtnText],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 120,
        yoyo: true,
        repeat: 2,
      });
    });

    // 甜区结束，进入普通成功区（黄色，独立状态）
    this.time.delayedCall(this.config.perfectWindowMs, () => {
      if (this.phase !== 'bite') return;
      // 普通成功区使用 normal 态（黄色 0xff9f0a）
      this.setPullButtonState('normal');
      this.pullBtnText.setText('快拉！');
      this.pullBtnHint.setText('再慢就危险了');
    });

    this.time.delayedCall(this.config.goodWindowMs + this.config.lateToleranceMs, () => {
      if (this.phase !== 'bite') return;
      this.failAndGo('late');
    });
  }

  private playVisualSignal(visual: VisualType) {
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
        x: FISHING_LAYOUT.centerX + 45,
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
    if (this.phase === 'resolved') return;

    SimpleAudio.click();

    // 按钮点击反馈（只缩放背景）
    this.pullBtnBg.setScale(0.96);

    this.time.delayedCall(90, () => {
      if (this.pullBtnBg.active) this.pullBtnBg.setScale(1);
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
    // === 1. 先完成成功结算逻辑（导演系统、埋点、存档、奖励）===
    this.phase = 'resolved';
    const finalDrop = perfect && this.currentDrop
      ? { ...this.currentDrop, reward: Math.round(this.currentDrop.reward * 1.25) }
      : this.currentDrop ?? DropGenerator.generate();

    DirectorSystem.recordSuccess();
    AnalyticsManager.instance.onRoundSuccess(finalDrop.name);
    DirectorSystem.nextRound();

    // 图鉴解锁
    CollectionManager.unlockByDrop(finalDrop);

    SaveSync.save();

    // 日常任务：高品质鱼
    if (this.isQualityFish(finalDrop.name)) {
      DailyMissionManager.instance.advanceTask('quality_1', 1);
    }

    // 重量统计：统一更新 StorageManager（真源）+ 同步任务进度（合并为一个 if 块，按正确顺序）
    if (finalDrop.isFish && finalDrop.weightGrams && finalDrop.weightGrams > 0) {
      // 1. StorageManager（真源）
      StorageManager.instance.addFishWeight(finalDrop.weightGrams);
      // 2. DailyMissionManager（今日任务，从真源同步）
      DailyMissionManager.instance.syncWeightTasksFromStorage();
      // 3. GrowthMissionManager（成长任务，从真源同步）
      GrowthMissionManager.instance.syncWeightTasksFromStorage();
      // 4. GrowthMissionManager（大鱼阈值，基于当前鱼重量）
      GrowthMissionManager.instance.syncBigFishTasksFromCurrentCatch(finalDrop.weightGrams);
    }

    // 生成 RoundResult 数据结构（用于后续爆点系统/广告优化）
    const combo = DirectorSystem.getCombo();
    const roundResult: RoundResult = buildRoundResult(finalDrop, perfect, combo);

    this.stateText.setText(perfect ? '完美命中！' : (DirectorSystem.getCombo() >= 2 ? `命中！${DirectorSystem.getCombo()}连击` : '上钩了！'));
    this.subHintText.setText(
      perfect
        ? '这一下拉得很准，奖励感更强'
        : DirectorSystem.getCombo() >= 3
          ? '状态火热，下一杆更有机会出节目效果'
          : '看看这一杆到底捞到了什么'
    );

    // === 2. 播放成功动画 ===
    // 浮漂快速上浮（鱼上钩）
    this.tweens.add({
      targets: this.floatBobber,
      y: 450,
      duration: 240,
      ease: 'Back.easeIn',
    });

    // === 命中时浮漂快速放大 + 回弹（爽感强化）===
    this.tweens.add({
      targets: this.floatBobber,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 100,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: [this.fishShadow, this.fishGlow],
      alpha: 0,
      duration: 180,
    });

    if (perfect) {
      // === 完美命中：增加 glow 闪烁效果 ===
      this.tweens.add({
        targets: [this.titleText, this.stateText, this.pullBtnBg],
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 140,
        yoyo: true,
        repeat: 1,
      });

      // 水面光圈增强
      this.tweens.add({
        targets: this.waterGlow,
        scaleX: 1.5,
        scaleY: 1.3,
        alpha: 0.2,
        duration: 200,
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

    // === 3. 动画结束后显示成功弹窗（不再跳转 ResultScene）===
    this.time.delayedCall(380, () => {
      this.showResultModal('success', finalDrop, perfect, undefined, roundResult);
    });
  }

  private failAndGo(reason: 'early' | 'too_early' | 'late') {
    // === 1. 先完成失败结算逻辑（导演系统、埋点、存档）===
    this.phase = 'resolved';
    DirectorSystem.recordFail();
    AnalyticsManager.instance.onRoundFail();
    DirectorSystem.nextRound();
    SaveSync.save();

    // 生成 RoundResult 数据结构（用于后续爆点系统/广告优化）
    const combo = DirectorSystem.getCombo();
    const roundResult: RoundResult = buildRoundResult(null, false, combo, reason);

    // === 2. 播放失败动画 ===
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
      x: FISHING_LAYOUT.width - 140,
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

    // === 3. 动画结束后显示失败弹窗（不再跳转 ResultScene）===
    this.time.delayedCall(320, () => {
      this.showResultModal('fail', undefined, undefined, reason, roundResult);
    });
  }

  private currentResultModal: ResultModal | null = null;

  private showResultModal(
    resultType: 'success' | 'fail',
    drop?: DropItem,
    perfect?: boolean,
    failReason?: 'early' | 'too_early' | 'late',
    roundResult?: RoundResult
  ) {
    const combo = DirectorSystem.getCombo();

    this.currentResultModal = new ResultModal(this, {
      resultType,
      drop,
      round: this.roundNumber,
      perfect,
      combo,
      failReason,
      roundResult,
      onContinue: () => {
        // 先判断体力
        if (!EnergyManager.instance.hasEnergy()) {
          this.showEnergyModalFromFishingScene();
          return;
        }

        // 体力充足，扣体力并重启
        EnergyManager.instance.costEnergy();
        SaveSync.save();
        this.refreshEnergyText();  // 刷新体力显示
        this.currentResultModal?.hide();
        this.restartFlow();
      },
      onBack: () => {
        this.currentResultModal?.hide();
        this.scene.start('MainScene');
      },
    });
    this.currentResultModal.show();
  }

  private showEnergyModalFromFishingScene() {
    const currentEnergy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    const modal = new EnergyModal(this, {
      currentEnergy,
      maxEnergy,
      underlyingContainer: this.currentResultModal?.getContainer() ?? undefined,
      onRecharge: () => {
        EnergyManager.instance.addEnergy(3);
        SaveSync.save();
        this.refreshEnergyText();  // 刷新体力显示
        modal.hide();
      },
      onCancel: () => {
        modal.hide();
      },
    });
    modal.show();
  }

  private restartFlow() {
    // 重置状态到初始钓鱼流程
    this.phase = 'idle';
    this.currentDrop = null;
    this.biteStartAt = 0;

    // === 重置浮漂位置和 scale，恢复基础浮动 ===
    this.floatBobber.setPosition(FISHING_LAYOUT.centerX, FISHING_LAYOUT.floatBaseY);
    this.floatBobber.setScale(1);
    // 重置浮漂子元素 scale（统一遍历 bodyParts，语义更准确）
    if (this.floatBobberParts.bodyParts) {
      this.floatBobberParts.bodyParts.forEach(part => part.setScale(1));
    }
    if (this.floatBobberParts.glow) {
      this.floatBobberParts.glow.setScale(1);
    }
    if (this.floatBobberParts.line) {
      this.floatBobberParts.line.setScale(1);
    }
    this.floatBobberBaseTween.restart();  // 恢复基础浮动

    // === 重置鱼影位置和状态（包括 alpha）===
    const shadowRange = DirectorSystem.getShadowScaleRange();
    const shadowW = Phaser.Math.Between(
      Math.floor(95 * shadowRange.min),
      Math.floor(95 * shadowRange.max)
    );
    const shadowH = Phaser.Math.Between(
      Math.floor(34 * shadowRange.min),
      Math.floor(34 * shadowRange.max)
    );

    this.fishShadow.setPosition(FISHING_LAYOUT.centerX + 15, FISHING_LAYOUT.fishShadowY);
    this.fishShadow.setSize(shadowW, shadowH);
    this.fishShadow.setAlpha(0.14);  // 与初始值一致
    this.fishShadow.setScale(1);

    this.fishGlow.setPosition(FISHING_LAYOUT.centerX + 15, FISHING_LAYOUT.fishShadowY);
    this.fishGlow.setSize(shadowW + 22, shadowH + 10);
    this.fishGlow.setAlpha(0.04);  // 与初始值一致
    this.fishGlow.setScale(1);

    // === 重置水面光圈 ===
    this.waterGlow.setScale(1);
    this.waterGlow.setAlpha(0.08);

    // 重置按钮状态
    this.setPullButtonState('base');  // 切换按钮到默认态
    this.pullBtnBg.setScale(1);
    this.pullBtnText.setText('立刻拉杆');
    this.pullBtnText.setScale(1);
    this.pullBtnHint.setText('看到明显动静再拉');
    this.pullBtnHint.setScale(1);

    // 重置 UI 文案
    this.refreshHintUI();
    this.stateText.setText('等待鱼咬钩...');
    this.subHintText.setText('鱼影和浮漂有明显变化时再拉杆');

    // 重新开始钓鱼流程
    this.startFishingFlow();
  }
}
