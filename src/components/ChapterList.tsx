import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Chapter } from '../types';
import { Colors } from '../constants/colors';

// 提到模块层，避免每次渲染重新创建函数
const countChars = (text: string): number => {
  return text.replace(/\s/g, '').length;
};

interface ChapterListProps {
  chapters: Chapter[];
  onChapterPress: (chapter: Chapter) => void;
  onChapterLongPress?: (chapter: Chapter) => void;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  onChapterPress,
  onChapterLongPress,
}) => {
  const totalChars = chapters.reduce((sum, ch) => sum + countChars(ch.content), 0);

  // 用 useCallback 包裹 renderChapter，稳定函数引用，减少 FlatList 不必要的重渲染
  const renderChapter = useCallback(({ item, index }: { item: Chapter; index: number }) => {
    const chars = countChars(item.content);
    return (
      <TouchableOpacity
        style={styles.chapterItem}
        onPress={() => onChapterPress(item)}
        onLongPress={() => onChapterLongPress?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.chapterNumber}>
          <Text style={styles.chapterNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.chapterInfo}>
          <View style={styles.chapterTitleRow}>
            <Text style={styles.chapterTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.chapterWordCount}>{chars > 0 ? `${chars}字` : ''}</Text>
          </View>
          <Text style={styles.chapterContent} numberOfLines={2}>
            {item.content || '空白章节'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [onChapterPress, onChapterLongPress]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>章节列表</Text>
        {chapters.length > 0 && (
          <Text style={styles.totalCount}>共 {totalChars} 字</Text>
        )}
      </View>
      <FlatList
        data={chapters}
        renderItem={renderChapter}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>暂无章节</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  totalCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  list: {
    padding: 16,
  },
  chapterItem: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chapterNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.vermillion,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chapterNumberText: {
    color: Colors.textOnVermillion,
    fontSize: 14,
    fontWeight: 'bold',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  chapterWordCount: {
    fontSize: 11,
    color: Colors.textLight,
    marginLeft: 8,
  },
  chapterContent: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
  },
});
