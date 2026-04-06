// Precomputed RGBA values for ColorsAlpha — eliminates runtime rgba() calls.
// Conversion: hex '#RRGGBB' → parseInt(RR,16), parseInt(GG,16), parseInt(BB,16)
// Colors used: vermillion=#C73E3A, gold=#C9A962, ink=#2C2C2C

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
  steppeGrass: '#6B8060',  // 草原苍茫 —  muted olive green
  warning: '#FF9800',
  error: '#F44336',
} as const;

/**
 * 工具函数：hex 颜色 + alpha → rgba 字符串
 * 保留供外部使用（如 InspirationCard.tsx 动态标签色）
 */
export const rgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * Precomputed alpha variants — avoids runtime rgba() computation.
 * Format: 'rgba(R,G,B,A)' with all values explicitly stated.
 */
export const ColorsAlpha = {
  /** 朱砂红 8% 透明度 — 用于朝代徽章背景 */
  vermillionBadgeBg: 'rgba(199,62,58,0.08)',
  /** 朱砂红 25% 透明度 — 用于朝代徽章边框 */
  vermillionBadgeBorder: 'rgba(199,62,58,0.25)',
  /** 金色 15% 透明度 — 用于装饰边框 */
  goldBorder: 'rgba(201,169,98,0.15)',
  /** 墨色 5% 透明度 — 用于轻柔阴影 */
  inkShadow: 'rgba(44,44,44,0.05)',
  /** 墨色 10% 透明度 — 用于卡片阴影 */
  inkShadowMedium: 'rgba(44,44,44,0.1)',
  /** 金色 8% 透明度 — 用于灵感卡片背景 */
  goldCardBg: 'rgba(201,169,98,0.08)',
  /** 草原苍茫 12% 透明度 — 用于元朝徽章背景（与 DynastyBadge dynasty 变体一致） */
  steppeGrassBadgeBg: 'rgba(107,128,96,0.12)',
  /** 草原苍茫 30% 透明度 — 用于元朝徽章边框 */
  steppeGrassBadgeBorder: 'rgba(107,128,96,0.30)',
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

/**
 * 朝代主题色 — 用于灵感探秘等功能的朝代标识色彩
 * 优先复用已有设计系统颜色，确保整体视觉一致性
 */
export const DynastyColors: Record<string, string> = {
  唐朝: Colors.vermillion,   // 朱砂红 — 盛世华彩
  宋朝: Colors.gold,          // 金色 — 风雅精致
  元朝: Colors.steppeGrass,   // 草原苍茫 — muted olive green
  明朝: Colors.ink,            // 墨色 — 典雅厚重（明色厚重）
  清朝: Colors.inkDark,       // 墨色 — 末世苍凉（更厚重的晚近感）
} as const;

/**
 * 灵感探秘分类标签色 — 集中管理，与 DynastyColors 保持同一层级
 * 灵感卡片、过滤器均引用此常量，确保分类色彩全局一致
 */
export const CategoryColors: Record<string, string> = {
  '野史传说': Colors.goldDark,
  '历史悬案': Colors.textSecondary,
  '帝王之谜': Colors.vermillion,
  '战争秘闻': Colors.error,
  '人物逸事': Colors.inkLight,
} as const;
