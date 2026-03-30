// 诗词推荐卡片组件
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';

interface Props {
  title: string;
  author?: string;
  content: string;
  onUse?: () => void;
}

export function PoetryCard({ title, author, content, onUse }: Props) {
  const handleCopy = async () => {
    const text = `${title}${author ? ` - ${author}` : ''}\n${content}`;
    await Clipboard.setStringAsync(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {author && <Text style={styles.author}>{author}</Text>}
      </View>
      <Text style={styles.content}>{content}</Text>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleCopy}>
          <Text style={styles.btnText}>复制</Text>
        </TouchableOpacity>
        {onUse && (
          <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={onUse}>
            <Text style={[styles.btnText, styles.primaryBtnText]}>引用</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFEF8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4C4A8',
    padding: 12,
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#3D2914',
    fontStyle: 'italic',
  },
  author: {
    fontSize: 12,
    color: '#8B7355',
  },
  content: {
    fontSize: 14,
    color: '#5D4E3A',
    lineHeight: 22,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C4A87C',
    marginLeft: 8,
  },
  primaryBtn: {
    backgroundColor: '#8B7355',
  },
  btnText: {
    fontSize: 12,
    color: '#6B5B4D',
  },
  primaryBtnText: {
    color: '#FFF',
  },
});
