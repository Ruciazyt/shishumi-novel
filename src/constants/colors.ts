export const Colors = {
  // 主色调
  ink: '#2C2C2C', // 墨色
  paper: '#F5F0E8', // 宣纸白
  vermillion: '#C73E3A', // 朱砂红

  // 辅助色
  inkLight: '#4A4A4A',
  inkDark: '#1A1A1A',
  paperDark: '#E8E0D0',
  vermillionLight: '#E05A57',
  vermillionDark: '#A62E2A',

  // 金色点缀 - 用于 premium feel 和装饰元素
  gold: '#C9A962',
  goldLight: '#D4BC7D',
  goldDark: '#A8893E',

  // 文字色
  textPrimary: '#2C2C2C',
  textSecondary: '#666666',
  textLight: '#999999',
  textOnVermillion: '#FFFFFF',

  // 背景色
  background: '#F5F0E8',
  backgroundCard: '#FFFFFF',
  backgroundDark: '#1A1A1A',

  // 边框色
  border: '#D4CFC5',
  borderLight: '#E8E0D0',

  // 状态色
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
} as const;

/**
 * 工具函数：hex 颜色 + alpha → rgba 字符串（用于 backgroundColor/borderColor 等）
 */
const rgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const ColorsAlpha = {
  /** 朱砂红 8% 透明度 — 用于朝代徽章背景 */
  vermillionBadgeBg: rgba(Colors.vermillion, 0.08),
  /** 朱砂红 25% 透明度 — 用于朝代徽章边框 */
  vermillionBadgeBorder: rgba(Colors.vermillion, 0.25),
  /** 金色 15% 透明度 — 用于装饰边框 */
  goldBorder: rgba(Colors.gold, 0.15),
  /** 墨色 5% 透明度 — 用于轻柔阴影 */
  inkShadow: rgba(Colors.ink, 0.05),
  /** 墨色 10% 透明度 — 用于卡片阴影 */
  inkShadowMedium: rgba(Colors.ink, 0.1),
} as const;

/**
 * 设计间距 - 8px 网格系统
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * 圆角系统
 */
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 9999,
} as const;

/**
 * 字体大小系统
 */
export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Theme = {
  dark: false,
  colors: {
    primary: Colors.vermillion,
    background: Colors.background,
    card: Colors.backgroundCard,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.vermillion,
  },
};