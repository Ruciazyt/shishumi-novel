import type { InspirationCategory } from '../data/inspirations';

/**
 * 史书墨颜色系统
 * - Colors: 主色板（hex）
 * - ColorsAlpha: 透明度变体（预计算 rgba 字符串，避免运行时计算）
 * - rgba(): 动态 rgba 工具函数（供需要动态 alpha 的场景使用）
 * - Spacing / BorderRadius / FontSize: 设计令牌
 */

// ---------------------------------------------------------------------------
// 主色板
// ---------------------------------------------------------------------------

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

  // 金色点缀
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
  steppeGrass: '#6B8060', // 草原苍茫
  warning: '#FF9800',
  error: '#F44336',
} as const;

// ---------------------------------------------------------------------------
// 透明度变体 — 预计算 rgba 字符串，消除运行时 rgba() 计算开销
// ---------------------------------------------------------------------------

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

export const ColorsAlpha = {
  vermillionBadgeBg: 'rgba(199,62,58,0.08)',
  vermillionBadgeBorder: 'rgba(199,62,58,0.25)',
  goldBorder: 'rgba(201,169,98,0.15)',
  inkShadow: 'rgba(44,44,44,0.05)',
  inkShadowMedium: 'rgba(44,44,44,0.1)',
  goldCardBg: 'rgba(201,169,98,0.08)',
  steppeGrassBadgeBg: 'rgba(107,128,96,0.12)',
  steppeGrassBadgeBorder: 'rgba(107,128,96,0.30)',
} as const;

// ---------------------------------------------------------------------------
// 设计令牌
// ---------------------------------------------------------------------------

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 9999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ---------------------------------------------------------------------------
// 朝代主题色 & 分类标签色
// ---------------------------------------------------------------------------

export const DynastyColors: Record<'唐朝' | '宋朝' | '元朝' | '明朝' | '清朝', string> = {
  唐朝: Colors.vermillion,
  宋朝: Colors.gold,
  元朝: Colors.steppeGrass,
  明朝: Colors.ink,
  清朝: Colors.inkDark,
} as const;

export const CategoryColors: Record<InspirationCategory, string> = {
  '野史传说': Colors.goldDark,
  '历史悬案': Colors.textSecondary,
  '帝王之谜': Colors.vermillion,
  '战争秘闻': Colors.error,
  '人物逸事': Colors.inkLight,
} as const;

export const DynastyAlpha = {
  tangBadgeBg: 'rgba(199,62,58,0.12)',
  tangBadgeBorder: 'rgba(199,62,58,0.30)',
  songBadgeBg: 'rgba(201,169,98,0.12)',
  songBadgeBorder: 'rgba(201,169,98,0.30)',
  mingBadgeBg: 'rgba(44,44,44,0.12)',
  mingBadgeBorder: 'rgba(44,44,44,0.30)',
  qingBadgeBg: 'rgba(26,26,26,0.12)',
  qingBadgeBorder: 'rgba(26,26,26,0.30)',
} as const;

export const CategoryAlpha = {
  '野史传说': 'rgba(168,137,62,0.13)',
  '历史悬案': 'rgba(102,102,102,0.13)',
  '帝王之谜': 'rgba(199,62,58,0.13)',
  '战争秘闻': 'rgba(244,67,54,0.13)',
  '人物逸事': 'rgba(74,74,74,0.13)',
} as const;
