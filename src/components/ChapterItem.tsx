// 章节项组件
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Chapter } from '../types';

interface Props {
  chapter: Chapter;
  index: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export function ChapterItem({ chapter, index, onPress, onLongPress }: Props) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <View style={styles.indexContainer}>
        <Text style={styles.index}>{index + 1}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{chapter.title || '无标题'}</Text>
        <Text style={styles.preview} numberOfLines={1}>
          {chapter.content || '空章节'}
        </Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.versionCount}>{chapter.versions.length} 版本</Text>
        <Text style={styles.date}>{formatDate(chapter.updatedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF7',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  indexContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B7355',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  index: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D2914',
    marginBottom: 2,
  },
  preview: {
    fontSize: 12,
    color: '#8B7355',
  },
  meta: {
    alignItems: 'flex-end',
  },
  versionCount: {
    fontSize: 10,
    color: '#A09080',
  },
  date: {
    fontSize: 10,
    color: '#A09080',
    marginTop: 2,
  },
});
