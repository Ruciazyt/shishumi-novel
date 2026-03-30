import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../constants/colors';
import { callAI } from '../services/api';
import { useApp } from '../context/AppContext';

interface Poetry推荐Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (poetry: string) => void;
}

interface PoetryResult {
  name: string;
  author: string;
  content: string;
  reason: string;
}

export const Poetry推荐: React.FC<Poetry推荐Props> = ({ visible, onClose, onSelect }) => {
  const { state } = useApp();
  const [scene, setScene] = useState('');
  const [poetry, setPoetry] = useState<PoetryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!scene.trim()) {
      setError('请输入场景描述');
      return;
    }

    setLoading(true);
    setError('');

    const response = await callAI({
      type: 'poetry',
      scene: scene,
    });

    setLoading(false);
    if (response.success && response.data) {
      // 简单解析AI返回的诗词结果
      const lines = response.data.split('\n').filter((l: string) => l.trim());
      setPoetry([{ name: '推荐诗词', author: '', content: response.data, reason: '' }]);
    } else {
      setError(response.error || '查询失败');
    }
  };

  const handleSelect = (item: PoetryResult) => {
    onSelect(item.content);
    onClose();
  };

  const handleClose = () => {
    setScene('');
    setPoetry([]);
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>诗词推荐</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>场景描述</Text>
              <TextInput
                style={styles.sceneInput}
                placeholder="例如：送别友人、秋夜思乡、宴饮作乐..."
                placeholderTextColor={Colors.textLight}
                value={scene}
                onChangeText={setScene}
                multiline
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>正在搜索...</Text>
              </View>
            ) : poetry.length > 0 ? (
              <ScrollView style={styles.resultList}>
                {poetry.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.poetryCard}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.poetryTitle}>{item.name}</Text>
                    {item.author ? <Text style={styles.poetryAuthor}>{item.author}</Text> : null}
                    <Text style={styles.poetryContent}>{item.content}</Text>
                    {item.reason ? (
                      <Text style={styles.poetryReason}>推荐理由：{item.reason}</Text>
                    ) : null}
                    <Text style={styles.tapHint}>点击插入</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Text style={styles.searchButtonText}>搜索诗词</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    fontSize: 20,
    color: Colors.textSecondary,
    padding: 4,
  },
  body: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  sceneInput: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  resultList: {
    maxHeight: 400,
  },
  poetryCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  poetryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.vermillion,
    marginBottom: 4,
  },
  poetryAuthor: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  poetryContent: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 26,
    marginBottom: 8,
  },
  poetryReason: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  tapHint: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: 8,
  },
  searchButton: {
    backgroundColor: Colors.vermillion,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: Colors.textOnVermillion,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
