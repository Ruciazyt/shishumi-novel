/**
 * 统计中文字符数（去除所有空白字符）
 */
export const countChars = (text: string): number => text.replace(/\s/g, '').length;
