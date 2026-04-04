/**
 * Precompiled constant: milliseconds in one day
 */
const MS_PER_DAY = 86400000;

/**
 * 格式化时间戳为易读相对时间字符串
 * @param timestamp Unix毫秒时间戳
 * @returns 如 "刚刚"、"3分钟前"、"2小时前"、"3天前"、"3月15日"
 */
export const formatRelativeTime = (timestamp: number): string => {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;

  // 30天内使用相对时间描述
  if (diff < 30 * MS_PER_DAY) {
    return describeTimeDiff(diff);
  }

  // 超过30天显示日期
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();
  return year === currentYear
    ? `${month}月${day}日`
    : `${year}年${month}月${day}日`;
};

/**
 * 计算时间差（毫秒）对应的相对时间描述
 * @returns 相对时间文案
 */
const describeTimeDiff = (diffMs: number): string => {
  if (diffMs < 60000) return '刚刚';
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 60) return `${totalMinutes}分钟前`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours}小时前`;
  const totalDays = Math.floor(diffMs / MS_PER_DAY);
  return `${totalDays}天前`;
};

/**
 * 格式化最后保存时间（EditorScreen 字数统计栏使用）
 * @param date Date 对象或 null
 * @returns 如 "刚刚"、"3分钟前"、"2小时前"、"3天前"
 */
export const formatLastSaved = (date: Date | null): string => {
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  return describeTimeDiff(diffMs);
};
