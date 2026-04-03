/**
 * 格式化时间戳为易读相对时间字符串
 * @param timestamp Unix毫秒时间戳
 * @returns 如 "刚刚"、"3分钟前"、"2小时前"、"3天前"、"3月15日"
 */
export const formatRelativeTime = (timestamp: number): string => {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / 86400000);

  if (days < 30) {
    // 复用 describeTimeDiff，消除 DRY 重复
    return describeTimeDiff(diff).label;
  }

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
 * 内部辅助函数，避免 formatRelativeTime 和 formatLastSaved 之间的逻辑重复
 */
const describeTimeDiff = (diffMs: number): { label: string; isJustNow: boolean } => {
  if (diffMs < 60000) return { label: '刚刚', isJustNow: true };
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 60) return { label: `${totalMinutes}分钟前`, isJustNow: false };
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return { label: `${totalHours}小时前`, isJustNow: false };
  return { label: '', isJustNow: false }; // 调用方需自行处理超过24h的情况
};

/**
 * 格式化最后保存时间（EditorScreen 字数统计栏使用）
 * @param date Date 对象或 null
 * @returns 如 "刚刚"、"3分钟前"、"2小时前"、"3天前"、"3月15日"
 */
export const formatLastSaved = (date: Date | null): string => {
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const { label } = describeTimeDiff(diffMs);
  if (label) return label;
  // 超过24小时，复用 formatRelativeTime 显示日期上下文
  return formatRelativeTime(date.getTime());
};
