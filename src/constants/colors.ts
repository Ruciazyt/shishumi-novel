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

export type ColorKey = keyof typeof Colors;

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
