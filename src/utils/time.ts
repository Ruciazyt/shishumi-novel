/**
 * 格式化时间戳为易读相对时间字符串
 * @param timestamp Unix毫秒时间戳
 * @returns 如 "2小时前"、"3天前"、"刚刚"
 */
export const formatRelativeTime = (timestamp: number): string => {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;

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
 * 格式化最后保存时间（EditorScreen 字数统计栏使用）
 * @param date Date 对象或 null
 * @returns 如 "刚刚"、"3分钟前"、"2小时前"、"14:05"
 */
export const formatLastSaved = (date: Date | null): string => {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60000) return '刚刚';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`;
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 24) return `${hours}小时前`;
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};
