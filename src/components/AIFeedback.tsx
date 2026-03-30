// AI 反馈展示组件
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';

interface Props {
  type: string;
  content: string;
  onApply?: () => void;
  onClose: () => void;
}

export function AIFeedback({ type, content, onApply, onClose }: Props) {
  const getTypeLabel = () => {
    const labels: Record<string, string> = {
      polish: '润色结果',
      history_detail: '历史细节',
      era_query: '时代背景',
      poetry: '诗词推荐',
      quote: '经典引用',
    };
    return labels[type] || 'AI 回复';
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.typeTag}>
          <Text style={styles.typeText}>{getTypeLabel()}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
            <Text style={styles.actionText}>复制</Text>
          </TouchableOpacity>
          {onApply && (
            <TouchableOpacity style={[styles.actionBtn, styles.applyBtn]} onPress={onApply}>
              <Text style={[styles.actionText, styles.applyText]}>应用</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={onClose}>
            <Text style={styles.actionText}>关闭</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.contentText}>{content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFEF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C4A87C',
    margin: 16,
    maxHeight: 400,
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
  },
  typeTag: {
    backgroundColor: '#8B7355',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C4A87C',
  },
  applyBtn: {
    backgroundColor: '#8B7355',
  },
  actionText: {
    color: '#6B5B4D',
    fontSize: 12,
  },
  applyText: {
    color: '#FFF',
  },
  content: {
    padding: 16,
  },
  contentText: {
    fontSize: 14,
    color: '#3D2914',
    lineHeight: 24,
  },
});
