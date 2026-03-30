import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Chapter } from '../types';
import { Colors } from '../constants/colors';

interface ChapterListProps {
  chapters: Chapter[];
  onChapterPress: (chapter: Chapter) => void;
  onChapterLongPress?: (chapter: Chapter) => void;
  onAddChapter?: () => void;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  onChapterPress,
  onChapterLongPress,
  onAddChapter,
}) => {
  const renderChapter = ({ item, index }: { item: Chapter; index: number }) => (
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
        <Text style={styles.chapterTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.chapterContent} numberOfLines={2}>
          {item.content || '空白章节'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>章节列表</Text>
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
  addButton: {
    backgroundColor: Colors.vermillion,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: Colors.textOnVermillion,
    fontSize: 14,
    fontWeight: '600',
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
  chapterTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
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
