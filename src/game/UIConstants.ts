// ==================================================
// UI 设计系统常量 - 统一所有页面的视觉风格
// ==================================================

export const UIConstants = {
  // === 颜色系统 ===
  colors: {
    // 主色调 - 海洋蓝
    primary: 0x4facfe,
    primaryDark: 0x00c6ff,
    
    // 强调色 - 珊瑚红（主按钮）
    accent: 0xff6b6b,
    accentHover: 0xff5252,
    accentPress: 0xff3b30,
    
    // 成功色 - 金币/体力
    success: 0x4CAF50,
    gold: 0xffd700,
    energy: 0x90ee90,
    
    // 警告色
    warning: 0xffa726,
    
    // 背景色
    bgLight: 0x8fd3ff,
    bgOcean: 0x1e88e5,
    bgDark: 0x1a3a52,
    
    // 文本色
    textWhite: 0xffffff,
    textLight: 0xeaf6ff,
    textMuted: 0xb0bec5,
    
    // 卡片背景
    cardBg: 0xffffff,
    cardBgDark: 0x2c3e50,
  },

  // === 圆角系统 ===
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999,
  },

  // === 阴影系统 ===
  shadows: {
    // 轻阴影（卡片）
    card: {
      color: 0x000000,
      alpha: 0.15,
      blur: 8,
      offsetX: 0,
      offsetY: 4,
    },
    // 中阴影（按钮）
    button: {
      color: 0x000000,
      alpha: 0.25,
      blur: 12,
      offsetX: 0,
      offsetY: 6,
    },
    // 重阴影（弹窗）
    modal: {
      color: 0x000000,
      alpha: 0.35,
      blur: 20,
      offsetX: 0,
      offsetY: 10,
    },
  },

  // === 布局系统 ===
  layout: {
    // 设计稿基准尺寸
    designWidth: 750,
    designHeight: 1334,
    
    // 安全边距
    safeTop: 20,
    safeBottom: 130,
    horizontalPadding: 35,
    
    // Section 间距
    sectionGap: 16,
    
    // 内容区宽度
    contentWidth: 680, // 750 - 2*35
  },

  // === 字体系统 ===
  fonts: {
    // 字号
    xs: '11px',
    sm: '13px',
    md: '15px',
    lg: '18px',
    xl: '22px',
    xxl: '28px',
    xxxl: '36px',
    title: '46px',
    
    // 字重
    normal: 'normal',
    bold: 'bold',
  },

  // === 按钮系统 ===
  buttons: {
    // 主按钮（CTA）
    primary: {
      width: 480,
      height: 110,
      bgColor: 0xff6b6b,
      textColor: 0xffffff,
      fontSize: '42px',
      cornerRadius: 16,
      pressScale: 0.95,
      pressDuration: 80,
    },
    // 次按钮
    secondary: {
      width: 320,
      height: 88,
      bgColor: 0x4facfe,
      textColor: 0xffffff,
      fontSize: '32px',
      cornerRadius: 12,
      pressScale: 0.95,
      pressDuration: 80,
    },
    // 小按钮
    small: {
      width: 200,
      height: 64,
      bgColor: 0xffffff,
      textColor: 0x1a3a52,
      fontSize: '24px',
      cornerRadius: 10,
      pressScale: 0.95,
      pressDuration: 80,
    },
  },

  // === 卡片系统 ===
  cards: {
    // 资源卡片
    resource: {
      width: 330,
      height: 65,
      bgColor: 0xffffff,
      bgAlpha: 0.25,
      cornerRadius: 12,
    },
    // 任务卡片
    mission: {
      width: 680,
      height: 72,
      bgColor: 0xffffff,
      bgAlpha: 0.15,
      cornerRadius: 10,
    },
    // 收集卡片
    collection: {
      width: 160,
      height: 180,
      bgColor: 0xffffff,
      bgAlpha: 0.2,
      cornerRadius: 12,
    },
  },

  // === 进度条系统 ===
  progressBar: {
    width: 140,
    height: 14,
    bgColor: 0x000000,
    bgAlpha: 0.6,
    fillColor: 0x4CAF50,
    cornerRadius: 7,
  },

  // === 动画系统 ===
  animations: {
    // 按钮按压
    buttonPress: {
      scale: 0.95,
      duration: 80,
    },
    // 卡片弹入
    cardEnter: {
      fromScale: 0.9,
      toScale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    },
    // 数字滚动
    numberRoll: {
      duration: 500,
      ease: 'Power2.easeOut',
    },
    // Toast 显示
    toast: {
      showDuration: 200,
      stayDuration: 800,
      hideDuration: 240,
    },
  },
};

// ==================================================
// 快捷样式生成器
// ==================================================

export function createButtonStyle(type: 'primary' | 'secondary' | 'small'): Phaser.Types.GameObjects.Text.TextStyle {
  const cfg = UIConstants.buttons[type];
  return {
    fontSize: cfg.fontSize,
    color: '#' + cfg.textColor.toString(16).padStart(6, '0'),
    fontStyle: 'bold',
  };
}
