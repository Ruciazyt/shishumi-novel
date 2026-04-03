import React, { useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Chapter } from '../types';
import { countChars } from '../utils/text';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha } from '../constants/colors';


/** 单个章节项 — memoized，避免列表变化时所有项都重绘 */
interface ChapterItemProps {
  chapter: Chapter;
  index: number;
  onPress: (chapter: Chapter) => void;
  onLongPress?: (chapter: Chapter) => void;
}

const ChapterItem = React.memo<ChapterItemProps>(
  ({ chapter, index, onPress, onLongPress }) => {
    const chars = countChars(chapter.content);
    return (
      <TouchableOpacity
        style={styles.chapterItem}
        onPress={() => onPress(chapter)}
        onLongPress={() => onLongPress?.(chapter)}
        activeOpacity={0.75}
      >
        {/* 章节序号徽章 */}
        <View
          style={styles.chapterNumber}
          accessible={true}
          accessibilityLabel={`第${index + 1}章 ${chapter.title}`}
          accessibilityRole="text"
        >
          <Text style={styles.chapterNumberText} numberOfLines={1}>{index + 1}</Text>
        </View>

        <View style={styles.chapterInfo}>
          <View style={styles.chapterTitleRow}>
            <Text style={styles.chapterTitle} numberOfLines={1}>
              {chapter.title}
            </Text>
            {chars > 0 && (
              <Text style={styles.chapterWordCount}>{chars}字</Text>
            )}
          </View>
          <Text style={styles.chapterContent} numberOfLines={2}>
            {chapter.content || '空白章节'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
  // 自定义比较：只有当 chapter 内容/标题、index 或回调变化时才重绘
  (prev, next) =>
    prev.chapter.content === next.chapter.content &&
    prev.chapter.title === next.chapter.title &&
    prev.index === next.index &&
    prev.onPress === next.onPress &&
    prev.onLongPress === next.onLongPress
);

ChapterItem.displayName = 'ChapterItem';

interface ChapterListProps {
  chapters: Chapter[];
  onChapterPress: (chapter: Chapter) => void;
  onChapterLongPress?: (chapter: Chapter) => void;
}

export const ChapterList: React.FC<ChapterListProps> = React.memo(({
  chapters,
  onChapterPress,
  onChapterLongPress,
}) => {
  const totalChars = useMemo(
    () => chapters.reduce((sum, ch) => sum + countChars(ch.content), 0),
    [chapters]
  );

  // Stable callback refs — avoids stale closures
  const onChapterPressRef = useRef(onChapterPress);
  const onChapterLongPressRef = useRef(onChapterLongPress);
  onChapterPressRef.current = onChapterPress;
  onChapterLongPressRef.current = onChapterLongPress;


  const renderItem = useCallback(({ item, index }: { item: Chapter; index: number }) => (
    <ChapterItem
      chapter={item}
      index={index}
      onPress={onChapterPressRef.current}
      onLongPress={onChapterLongPressRef.current}
    />
  ), []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>章节列表</Text>
        {chapters.length > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalCount}>共 {totalChars.toLocaleString()} 字</Text>
          </View>
        )}
      </View>
      <FlatList
        data={chapters}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty} accessible accessibilityLabel="暂无章节列表，点击右下角按钮新建章节">
            <Text style={styles.emptyIcon}>🖋</Text>
            <Text style={styles.emptyText}>暂无章节</Text>
            <Text style={styles.emptyHint}>点击右下角 + 按钮新建第一章</Text>
          </View>
        }
      />
    </View>
  );
});

ChapterList.displayName = 'ChapterList';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: ColorsAlpha.goldBorder,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  totalBadge: {
    backgroundColor: ColorsAlpha.vermillionBadgeBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  totalCount: {
    fontSize: FontSize.xs,
    color: Colors.vermillion,
    fontWeight: '500',
  },
  list: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  // Chapter Card - 古籍装帧风格
  chapterItem: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chapterNumber: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.vermillion,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  chapterNumberText: {
    color: Colors.textOnVermillion,
    fontSize: FontSize.sm,
    fontWeight: 'bold',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  chapterTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  chapterWordCount: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginLeft: Spacing.sm,
  },
  chapterContent: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
});
