/**
 * 首页布局常量 - 任务区专用
 *
 * 职责：
 * - 管理今日任务面板的布局常量
 * - 提供任务项内部布局计算规则
 *
 * 不负责：
 * - 不管理其他首页区域（资源卡/主按钮/导航等）
 */

// ==================================================
// 今日任务面板布局
// ==================================================
export const TASK_PANEL = {
  // 卡片整体
  x: 24,                       // 卡片左边缘（= pagePadding）
  width: 702,                  // 卡片宽度（= contentWidth）
  innerPadding: 20,            // 卡片内边距（左右）

  // 标题层
  titleY: 14,                  // 标题相对 Y（从卡片顶部，压缩）
  titleHeight: 20,             // 标题区高度（压缩）
  titleSize: '15px',
  titleColor: '#FFFFFF',

  // 标题到任务列表的间距
  titleToTaskGap: 6,           // 标题底部到第一条任务的间距（压缩）
  taskStartY: 40,              // = titleY + titleHeight + titleToTaskGap

  // 任务列表
  taskHeight: 44,              // 单条任务高度（双行布局）
  taskRowGap: 8,               // 相邻任务间的垂直间距

  // Footer
  taskFooterGap: 2,            // 最后一条任务到底部 footer 的间距（再压缩）
  footerHeight: 8,             // footer 区高度（再压缩，纯文案高度）
  footerSize: '12px',
  footerColor: '#FFD700',
  paddingBottom: 2,            // 卡片底部内边距（再压缩）

  // 连续天数标签
  streakSize: '12px',
  streakColor: '#FFD700',

  // 阶段激励文案
  milestoneSize: '12px',
  milestoneColor: '#FFD700',
};

// ==================================================
// 任务项内部布局（关键：从右向左计算，避免遮挡）
// ==================================================
export const TASK_ITEM = {
  // 左侧内容区
  iconSize: 24,
  titleX: 44,                  // 标题 X（相对卡片左边缘 + 内边距）
  titleSize: '14px',
  titleColor: '#F0F8FF',
  progressTextSize: '11px',
  progressTextColor: '#999999',

  // 任务项高度（与 TASK_PANEL.taskHeight 一致）
  taskHeight: 44,              // 单条任务高度（双行布局）

  // 右侧按钮区（固定）
  buttonWidth: 72,
  buttonHeight: 32,
  buttonRightMargin: 16,       // 按钮右边缘到卡片右边距

  // 进度条区（由剩余空间推导）
  progressBarHeight: 8,
  progressBarMinWidth: 100,    // 最小宽度兜底
  progressBarRightMargin: 16,  // 进度条与按钮之间的安全间距

  // 奖励文字
  rewardSize: '14px',
  rewardColor: '#E6D75A',
  rewardRightMargin: 12,       // 奖励文字与进度条间距

  // 按钮状态颜色
  buttonTodoColor: 0xE8ECF1,       // 进行中（浅灰）
  buttonClaimableColor: 0x4FA6F8,  // 可领取（蓝色）
  buttonClaimedColor: 0x9AA1A6,    // 已领取（深灰）
};

// ==================================================
// 工具函数：计算任务项内部布局
// ==================================================
/**
 * 计算任务项各元素的 X 坐标（从右向左推导）
 * @param cardWidth 卡片宽度
 * @returns 各元素 X 坐标
 */
export function calculateTaskItemLayout(cardWidth: number) {
  const innerPadding = TASK_PANEL.innerPadding;
  const contentRightX = cardWidth - innerPadding;

  // 1. 按钮中心 X（最右侧，固定）
  const buttonX = contentRightX - TASK_ITEM.buttonRightMargin - TASK_ITEM.buttonWidth / 2;

  // 2. 奖励文字右边缘 X（按钮左侧，预留安全间距）
  const rewardRightX = buttonX - TASK_ITEM.buttonWidth / 2 - TASK_ITEM.progressBarRightMargin;

  // 3. 进度条宽度（由剩余空间推导，有最小值兜底）
  // 进度条右边缘到奖励文字左边缘 = rewardRightMargin
  // 进度条左边缘到标题右边缘 = 20px 安全间距
  const titleRightX = innerPadding + 200;  // 标题区最大宽度估算
  const availableWidth = rewardRightX - TASK_ITEM.rewardRightMargin - titleRightX;
  const progressBarWidth = Math.max(TASK_ITEM.progressBarMinWidth, availableWidth);

  // 4. 进度条中心 X
  const progressBarX = rewardRightX - TASK_ITEM.rewardRightMargin - progressBarWidth / 2;

  // 5. 奖励文字 X（右对齐到进度条右边缘）
  const rewardX = rewardRightX - TASK_ITEM.rewardRightMargin;

  return {
    titleX: innerPadding,
    buttonX,
    progressBarX,
    progressBarWidth,
    rewardX,
  };
}
