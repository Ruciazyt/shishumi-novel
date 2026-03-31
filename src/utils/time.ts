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
  return `${month}月${day}日`;
};
