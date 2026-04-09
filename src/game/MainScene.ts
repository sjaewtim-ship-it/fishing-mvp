import Phaser from 'phaser';
import { EnergyManager } from './EnergyManager';
import { CoinManager } from './CoinManager';
import { DirectorSystem } from './DirectorSystem';
import { SaveSync } from './SaveSync';
import { SimpleAudio } from './SimpleAudio';
import { AnalyticsManager } from './AnalyticsManager';
import { DailyMissionManager } from './DailyMissionManager';
import { EnergyModal } from './EnergyModal';
import { SettingsModal } from './ui/SettingsModal';
import { CollectionManager } from './managers/CollectionManager';
import { formatWeight } from './DropGenerator';
import { StorageManager } from './StorageManager';

// ==================================================
// 首页统一 layoutSpec - 管理所有 section 的纵向布局
// ==================================================
const LAYOUT_SPEC = {
  // 基础参数（移动端适配）
  safeTop: 26,
  safeBottom: 0,
  pagePadding: 24,                 // 统一页面左右边距（原 16px 增加 50% → 24px）
  contentWidth: 0,                 // 动态计算：width - pagePadding * 2
  sectionGap: 18,
  sectionGapLoose: 24,

  // 固定尺寸
  brandHeight: 112,                // 品牌区高度
  resourceHeight: 54,              // 资源区高度（3 卡组单行）
  actionHeight: 90,                // 开始钓鱼按钮高度
  navBarHeight: 60,                // 底部入口栏高度
  sandHeight: 120,                 // 沙地固定高度

  // 间距参数
  resourceToGoalGap: 28,           // 资源区底部到任务区顶部
  goalToActionGap: 28,             // 任务区底部到开始钓鱼按钮（增加 8px,让主按钮更独立）
  actionToNavBarGap: 20,           // 开始钓鱼按钮到底部入口栏
  navBarToOceanGap: 20,            // 底部入口栏到海洋背景

  // 任务区参数
  goalInnerPadding: 20,            // 任务区内边距
  taskStartY: 40,                  // 任务列表起始 Y（相对任务区顶部）
  taskHeight: 44,                  // 单条任务高度
  taskRowGap: 8,                   // 任务间距
  taskFooterGap: 2,                // 最后一条任务到 footer 间距
  footerHeight: 8,                 // footer 高度
  paddingBottom: 2,                // 底部内边距

  // 动态计算（在 calculateLayout 中计算）
  brandY: 74,                      // 品牌区起始 Y
  resourceY: 196,                  // 资源区起始 Y
  goalY: 0,                        // 动态计算：resourceBottomY + resourceToGoalGap
  goalHeight: 0,                   // 动态计算：基于任务数量
  actionY: 0,                      // 动态计算：goalBottomY + goalToActionGap
  navBarY: 0,                      // 动态计算：actionBottomY + actionToNavBarGap
  oceanY: 0,                       // 动态计算：navBarBottomY + navBarToOceanGap
};

// 资源卡统一规格（移动端适配）
const RESOURCE_CARD = {
  height: 54,              // 卡片高度
  gap: 8,                  // 卡片间距
  rowGap: 10,              // 行间距
  radius: 8,               // 圆角
  paddingX: 10,            // 左右内边距
  paddingTop: 8,           // 顶部内边距
  labelSize: '14px',       // 标签字号
  labelColor: '#F7F3C8',   // 标签颜色（金币卡基准）
  valueSize: '20px',       // 数值字号
  valueColor: '#FFFFFF',   // 数值颜色
  labelStroke: 2,          // 标签描边
  valueStroke: 3,          // 数值描边
};

// 进度条规格（移动端适配）
const PROGRESS_BAR = {
  width: 96,
  height: 12,
  radius: 6,
  labelSize: '11px',
};

export class MainScene extends Phaser.Scene {
  // UI 引用
  private coinText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private energyIconText!: Phaser.GameObjects.Text;
  private weightText!: Phaser.GameObjects.Text;
  private taskPanel: DailyTaskPanel | null = null;

  // 目标奖励金额（V1 局部常量）
  private readonly DAILY_MISSION_REWARD = 100;

  // === 新组件树 Container ===
  private bgLayer!: Phaser.GameObjects.Container;
  private topBar!: Phaser.GameObjects.Container;
  private contentHeader!: Phaser.GameObjects.Container;
  private heroArea!: Phaser.GameObjects.Container;
  private quickEntryGroup!: Phaser.GameObjects.Container;
  private overlayLayer!: Phaser.GameObjects.Container;

  // 装饰引用（用于 tween）
  private startFishingBtnContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('MainScene');
  }

  preload() {
    this.load.image('home_bg_scene', '/assets/bg/home_bg_scene.png');
  }

  private calculateLayout(taskCount: number = 3) {
    const width = Number(this.scale.width) || 750;
    const height = Number(this.scale.height) || 1334;
    const centerX = width / 2;

    // 动态计算 contentWidth（基于统一 pagePadding）
    const contentWidth = width - LAYOUT_SPEC.pagePadding * 2;

    // 动态计算 taskPanelHeight（首页不再显示任务模块，goalHeight 固定为 0）
    const goalHeight = 0;

    // 链式计算各 section Y 位置
    const resourceBottomY = LAYOUT_SPEC.resourceY + LAYOUT_SPEC.resourceHeight;
    const goalY = resourceBottomY + LAYOUT_SPEC.resourceToGoalGap;
    const goalBottomY = goalY + goalHeight;  // 使用与 DailyTaskPanel 一致的真实高度
    const actionY = goalBottomY + LAYOUT_SPEC.goalToActionGap;
    const actionBottomY = actionY + LAYOUT_SPEC.actionHeight;
    const navBarY = actionBottomY + LAYOUT_SPEC.actionToNavBarGap;
    const navBarBottomY = navBarY + LAYOUT_SPEC.navBarHeight;
    const oceanY = navBarBottomY + LAYOUT_SPEC.navBarToOceanGap;

    // 动态计算 oceanHeight（沙地固定高度,水域吃满剩余区域）
    const oceanHeight = height - oceanY - LAYOUT_SPEC.sandHeight;
    const sandY = oceanY + oceanHeight;

    return {
      width,
      height,
      centerX,
      contentWidth,
      pagePadding: LAYOUT_SPEC.pagePadding,
      safeTop: LAYOUT_SPEC.safeTop,
      safeBottom: LAYOUT_SPEC.safeBottom,
      brandY: LAYOUT_SPEC.brandY,
      resourceY: LAYOUT_SPEC.resourceY,
      goalY,
      goalHeight,
      goalInnerPadding: LAYOUT_SPEC.goalInnerPadding,
      actionY,
      oceanY,
      oceanHeight,
      sandY,
    };
  }


  create() {
    const coins = CoinManager.instance.getCoins();
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    const totalFishWeight = StorageManager.instance.getTotalFishWeightGrams();

    DailyMissionManager.instance.init();

    // 获取实际任务数量，用于计算真实布局高度
    const tasks = DailyMissionManager.instance.getTasks();
    const taskCount = tasks.length;
    const L = this.calculateLayout(taskCount);

    this.cameras.main.setBackgroundColor('#8FD3FF');

    // === 初始化组件树 Container ===
    this.bgLayer = this.add.container(0, 0);
    this.topBar = this.add.container(0, 0);
    this.contentHeader = this.add.container(0, 0);
    this.heroArea = this.add.container(0, 0);
    this.quickEntryGroup = this.add.container(0, 0);
    this.overlayLayer = this.add.container(0, 0);

    // === 渲染新结构 ===
    this.renderBgLayer(L);
    this.renderTopBar(L, energy, maxEnergy);
    this.renderContentHeader(L);
    this.renderHeroArea(L, energy >= maxEnergy);
    this.renderQuickEntryGroup(L);
  }

  /**
   * wake 事件：从其他场景返回时刷新数据
   */
  wake() {
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    // 刷新体力显示（topBar 中的 energyText）
    if (this.energyText) {
      this.energyText.setText(`${energy}/${maxEnergy}`);
    }
  }


  /** 刷新累计重量显示（保留引用，暂不使用） */
  private refreshWeightUI() {
    const totalFishWeight = StorageManager.instance.getTotalFishWeightGrams();
    if (this.weightText) {
      const weightDisplayText = totalFishWeight > 0 ? formatWeight(totalFishWeight) : '0kg';
      this.weightText.setText(weightDisplayText);
    }
  }
  // ==================================================
  // 1. bgLayer - 背景层（正式背景图 + 极轻装饰）
  // ==================================================
  private renderBgLayer(L: ReturnType<typeof this.calculateLayout>) {
    const { width, height, centerX } = L;

    // === 正式背景图（cover 适配）===
    const bgImage = this.add.image(centerX, height / 2, 'home_bg_scene');
    bgImage.setOrigin(0.5);
    bgImage.setDepth(0);

    // cover 缩放：取宽高比更大的那个，确保铺满不留白
    const bgTexture = this.textures.get('home_bg_scene');
    const bgWidth = bgImage.width;
    const bgHeight = bgImage.height;
    const scaleX = width / bgWidth;
    const scaleY = height / bgHeight;
    const scale = Math.max(scaleX, scaleY);
    bgImage.setScale(scale);

    this.bgLayer.add(bgImage);

    // === 极轻柔光遮罩（可选，确保 UI 可读）===
    const overlayGraphics = this.add.graphics();
    overlayGraphics.fillStyle(0x000022, 0.08);  // 极轻深色罩，不盖脏背景
    overlayGraphics.fillRect(0, 0, width, height);
    this.bgLayer.add(overlayGraphics);

    // === 极弱波纹装饰（湖面区，仅保留水面暗示）===
    const lakeTop = height * 0.55;
    const rippleGraphics = this.add.graphics();
    rippleGraphics.lineStyle(0.8, 0xffffff, 0.02);
    for (let i = 0; i < 3; i++) {
      const ry = lakeTop + 60 + i * 80;
      const rw = 140 + i * 40;
      const rx = centerX - rw / 2 + (i % 2 === 0 ? -30 : 30);
      rippleGraphics.strokeEllipse(rx + rw / 2, ry, rw / 2, 3);
    }
    this.bgLayer.add(rippleGraphics);
  }

  // ==================================================
  // 2. topBar - 顶栏（状态层：左侧占位 + 体力胶囊）
  // ==================================================
  private renderTopBar(L: ReturnType<typeof this.calculateLayout>, energy: number, maxEnergy: number) {
    const { width } = L;
    const topBarY = L.safeTop + 20;

    // 左侧占位 zone
    const leftPlaceholder = this.add.container(60, topBarY);
    this.topBar.add(leftPlaceholder);

    // 体力胶囊（右侧对齐，安全边距）
    const energyCapsule = this.add.container(0, 0);
    const paddingRight = 24;
    const capsuleW = 88;  // 104 → 88 压缩宽度，减少空洞感
    const capsuleH = 34;
    const capsuleX = L.width - paddingRight - capsuleW / 2;  // 右对齐：胶囊右边缘距屏幕 paddingRight
    const capsuleY = topBarY + 14;

    // 胶囊背景（圆角矩形）
    const capsuleBg = this.add.graphics();
    capsuleBg.fillStyle(0x3FA37A, 0.88);
    capsuleBg.fillRoundedRect(capsuleX - capsuleW / 2, capsuleY - capsuleH / 2, capsuleW, capsuleH, 17);
    capsuleBg.lineStyle(1, 0x7ED7B2, 0.5);
    capsuleBg.strokeRoundedRect(capsuleX - capsuleW / 2, capsuleY - capsuleH / 2, capsuleW, capsuleH, 17);
    energyCapsule.add(capsuleBg);

    // 体力图标
    this.energyIconText = this.add.text(capsuleX - capsuleW / 2 + 18, capsuleY, '⚡', {  // 12 → 18 向右收 6px
      fontSize: '16px',
    }).setOrigin(0.5);
    energyCapsule.add(this.energyIconText);

    // 体力数值
    this.energyText = this.add.text(capsuleX + capsuleW / 2 - 18, capsuleY, `${energy}/${maxEnergy}`, {  // 10 → 18 向左收 8px
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0.5);
    energyCapsule.add(this.energyText);

    this.topBar.add(energyCapsule);
  }

  // ==================================================
  // 3. contentHeader - 主题内容区（moodTag + 主标题 + 副标题）
  // ==================================================
  private renderContentHeader(L: ReturnType<typeof this.calculateLayout>) {
    const { width, height, centerX } = L;

    // contentHeader 整体位于页面中上部
    const headerCenterY = height * 0.26;  // 主标题中心 Y

    // === 极轻聚焦光晕（让主题区有整体感）===
    const glowGraphics = this.add.graphics();
    glowGraphics.fillStyle(0xffffff, 0.04);
    glowGraphics.fillEllipse(centerX, headerCenterY - 6, 280, 160);
    this.contentHeader.add(glowGraphics);

    // A. moodTag（小标签，主标题上方，间距收紧）
    const moodTagY = headerCenterY - 44;  // 52 → 44 更紧凑
    const moodTagGraphics = this.add.graphics();
    const moodTagW = 90;
    const moodTagH = 26;
    moodTagGraphics.fillStyle(0xffffff, 0.18);
    moodTagGraphics.fillRoundedRect(centerX - moodTagW / 2, moodTagY - moodTagH / 2, moodTagW, moodTagH, 13);
    this.contentHeader.add(moodTagGraphics);

    const moodTagText = this.add.text(centerX, moodTagY, '轻松摸鱼', {
      fontSize: '13px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.8);
    this.contentHeader.add(moodTagText);

    // B. mainTitleText（首页真正主标题）
    const mainTitleText = this.add.text(centerX, headerCenterY, '治愈钓鱼', {
      fontSize: '48px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#1565C0',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.contentHeader.add(mainTitleText);

    // C. subInfoText（副标题，主标题下方，间距收紧）
    const subInfoY = headerCenterY + 34;  // 40 → 34 更紧凑
    const subInfoText = this.add.text(centerX, subInfoY, '看准时机，一杆出货', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0.7);
    this.contentHeader.add(subInfoText);
  }

  // ==================================================
  // 4. heroArea - 主按钮区（开始钓鱼）
  // ==================================================
  private renderHeroArea(L: ReturnType<typeof this.calculateLayout>, _isFullEnergy: boolean) {
    const x = L.centerX;
    const startBtnY = L.height * 0.70;  // 强制收口：按钮中心落在屏幕 70% 位置
    const startBtnW = 324;  // 310 → 324 略增宽度
    const startBtnH = 90;   // 86 → 90 略增高度

    this.startFishingBtnContainer = this.add.container(0, 0);

    // 按钮阴影层（增强压地感）
    const btnShadow = this.add.graphics();
    btnShadow.fillStyle(0x000000, 0.34);  // 0.30 → 0.34 略加深
    btnShadow.fillRoundedRect(x - startBtnW / 2 + 3, startBtnY - startBtnH / 2 + 6, startBtnW, startBtnH, 22);  // 20 → 22 圆角略增
    this.startFishingBtnContainer.add(btnShadow);

    // 按钮背景（珊瑚橙红渐变）
    const btnBg = this.add.graphics();
    const topC = new Phaser.Display.Color(255, 130, 100);
    const bottomC = new Phaser.Display.Color(230, 60, 50);
    const steps = 10;
    const stepH = startBtnH / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(topC, bottomC, 1, t);
      const color = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
      btnBg.fillStyle(color, 1);
      btnBg.fillRect(x - startBtnW / 2, startBtnY - startBtnH / 2 + i * stepH, startBtnW, stepH + 1);
    }
    btnBg.lineStyle(1, 0xff8a65, 0.6);
    btnBg.strokeRoundedRect(x - startBtnW / 2, startBtnY - startBtnH / 2, startBtnW, startBtnH, 22);  // 20 → 22
    this.startFishingBtnContainer.add(btnBg);

    // 高光层（顶部 30%，更自然）
    const btnHighlight = this.add.graphics();
    const highlightH = startBtnH * 0.3;
    btnHighlight.fillStyle(0xffffff, 0.16);  // 0.14 → 0.16 略增
    btnHighlight.fillRoundedRect(x - startBtnW / 2 + 4, startBtnY - startBtnH / 2 + 3, startBtnW - 8, highlightH, 18);  // 16 → 18
    this.startFishingBtnContainer.add(btnHighlight);

    // 按钮文字（增加 emoji 图标）
    const btnText = this.add.text(x, startBtnY, '🎣 开始钓鱼', {
      fontSize: '34px',  // 36 → 34 给 emoji 留空间
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        color: '#000000',
        offsetX: 0,
        offsetY: 3,
        blur: 4,
        fill: true,
      },
    }).setOrigin(0.5);
    this.startFishingBtnContainer.add(btnText);

    // 点击交互区域
    const hitArea = this.add.rectangle(x, startBtnY, startBtnW, startBtnH, 0x000000, 0);
    hitArea.setOrigin(0.5);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.onStartFishing());
    this.startFishingBtnContainer.add(hitArea);

    // 呼吸 tween（保持轻量）
    this.tweens.add({
      targets: this.startFishingBtnContainer,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.heroArea.add(this.startFishingBtnContainer);
  }

  // ==================================================
  // 5. quickEntryGroup - 次级功能入口（图鉴/任务/设置）
  // ==================================================
  private renderQuickEntryGroup(L: ReturnType<typeof this.calculateLayout>) {
    const x = L.centerX;

    // 位于开始钓鱼按钮下方，强制收口：整体中心落在屏幕 84% 位置
    const y = L.height * 0.84;

    // 3 个入口按钮配置（保留原有回调逻辑）
    const navButtons = [
      { key: 'collection', label: '📖 图鉴', onClick: () => {
        SimpleAudio.click();
        this.scene.start('CollectionScene');
      }},
      { key: 'tasks', label: '📝 任务', onClick: () => {
        SimpleAudio.click();
        this.scene.start('TaskScene');
      }},
      { key: 'settings', label: '⚙️ 设置', onClick: () => {
        SimpleAudio.click();
        new SettingsModal(this).show();
      }},
    ];

    // 计算布局（3 个按钮等间距，整体居中）
    const btnWidth = 100;
    const btnHeight = 36;
    const gap = 12;
    const totalWidth = btnWidth * 3 + gap * 2;
    const startX = x - totalWidth / 2 + btnWidth / 2;

    // === 弱容器底板（增强组感，但仍轻）===
    const groupPaddingX = 24;
    const groupPaddingY = 16;
    const groupW = totalWidth + groupPaddingX * 2;
    const groupH = btnHeight + groupPaddingY * 2;
    const groupX = x;
    const groupY = y;

    const groupBg = this.add.graphics();
    groupBg.fillStyle(0xffffff, 0.10);  // 0.06 → 0.10 更清晰
    groupBg.fillRoundedRect(groupX - groupW / 2, groupY - groupH / 2, groupW, groupH, 14);  // 12 → 14
    groupBg.lineStyle(0.8, 0xffffff, 0.08);  // 0.5/0.04 → 0.8/0.08 更清晰
    groupBg.strokeRoundedRect(groupX - groupW / 2, groupY - groupH / 2, groupW, groupH, 14);
    this.quickEntryGroup.add(groupBg);

    // 三个按钮
    navButtons.forEach((btn, index) => {
      const btnX = startX + index * (btnWidth + gap);
      const btnY = y;

      // 按钮容器
      const entryBtn = this.add.container(0, 0);

      // 按钮背景（增强卡片感）
      const bg = this.add.graphics();
      bg.fillStyle(0x7B6FB8, 0.90);  // 0.85 → 0.90 略增不透明度
      bg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 10);  // 9 → 10
      bg.lineStyle(1, 0x5A4F7F, 0.40);  // 0.35 → 0.40 略增描边
      bg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 10);
      entryBtn.add(bg);

      // 扩大点击区域
      const hitArea = this.add.rectangle(btnX, btnY, btnWidth + 36, btnHeight + 16, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => btn.onClick());
      entryBtn.add(hitArea);

      // 文案（略小）
      const label = this.add.text(btnX, btnY, btn.label, {
        fontSize: '14px',  // 15 → 14
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      entryBtn.add(label);

      this.quickEntryGroup.add(entryBtn);
    });
  }

  /** 刷新金币显示 */
  private refreshCoinsUI() {
    const coins = CoinManager.instance.getCoins();
    if (this.coinText) {
      this.coinText.setText(String(coins));
    }
  }


  // ==================================================
  // 按钮交互逻辑
  // ==================================================
  private onStartFishing() {
    SimpleAudio.unlock();
    SimpleAudio.click();

    const energyBefore = EnergyManager.instance.getEnergy();
    console.log('[MainScene] onStartFishing - energy before:', energyBefore);

    if (!EnergyManager.instance.hasEnergy()) {
      console.log('[MainScene] no energy, show EnergyModal');
      this.showEnergyModal();
      return;
    }

    AnalyticsManager.instance.onStartRound();
    EnergyManager.instance.costEnergy();

    const energyAfter = EnergyManager.instance.getEnergy();
    console.log('[MainScene] energy after costEnergy:', energyAfter);

    SaveSync.save();
    console.log('[MainScene] save called');

    this.scene.start('FishingScene', {
      round: DirectorSystem.getRoundNumber(),
    });
  }

  private showEnergyModal() {
    const currentEnergy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();

    const modal = new EnergyModal(this, {
      currentEnergy,
      maxEnergy,
      onRecharge: () => {
        // 补充体力（本轮模拟,不接真实广告）
        EnergyManager.instance.addEnergy(3);
        SaveSync.save();
        modal.hide();
        // 刷新首页体力显示
        this.refreshEnergyUI();
      },
      onCancel: () => {
        modal.hide();
      },
    });
    modal.show();
  }

  private refreshEnergyUI() {
    const energy = EnergyManager.instance.getEnergy();
    const maxEnergy = EnergyManager.instance.getMaxEnergy();
    if (this.energyText) {
      this.energyText.setText(`${energy}/${maxEnergy}`);
    }
  }
}
