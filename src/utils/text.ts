/**
 * Precompiled regex patterns (avoids re-creation on every function call)
 */
const WHITESPACE_REGEX = /\s/g;
const MULTI_NEWLINE_REGEX = /\n\s*\n/;
const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf]/g;

/**
 * 统计中文字符数（去除所有空白字符）
 * 安全处理：非字符串输入返回 0，避免上游 reducer 崩溃
 */
export const countChars = (text: string): number =>
  typeof text === 'string' ? text.replace(WHITESPACE_REGEX, '').length : 0;

/**
 * 统计文本中的中文字符数量（CJK Unified Ideographs + CJK Compatibility Ideographs）
 * 适用于精确统计中文写作字数（不含标点和英文）
 */
export const countChineseChars = (text: string): number => {
  const matches = (text || '').match(CJK_REGEX);
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
  return text.split(MULTI_NEWLINE_REGEX).filter(p => p.trim().length > 0).length;
};
