/**
 * 统计中文字符数（去除所有空白字符）
 */
export const countChars = (text: string): number => text.replace(/\s/g, '').length;

/**
 * 统计文本中的中文字符数量（CJK Unified Ideographs + CJK Compatibility Ideographs）
 * 适用于精确统计中文写作字数（不含标点和英文）
 */
export const countChineseChars = (text: string): number => {
  const matches = text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  return matches ? matches.length : 0;
};

/**
 * 截断文本到指定长度，超出部分用省略号替代
 * 安全处理：确保不会在 surrogate pair（如 emoji）中间截断
 * @param text 原始文本
 * @param maxLen 最大长度（默认30）
 * @param suffix 省略符（默认"…"）
 */
export const truncateText = (text: string, maxLen: number = 30, suffix: string = '…'): string => {
  if (!text) return '';
  // 使用 Array.from 按 Unicode code point 分割，避免截断 emoji/surrogate pair
  const chars = Array.from(text);
  if (chars.length <= maxLen) return text;
  return chars.slice(0, maxLen).join('').trimEnd() + suffix;
};

/**
 * 统计文本段落数量（以连续换行符分隔）
 */
export const countParagraphs = (text: string): number => {
  if (!text.trim()) return 0;
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
};
