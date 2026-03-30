import React, { useState } from 'react';
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

interface PoetryRecommendProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (poetry: string) => void;
}

export const PoetryRecommend: React.FC<PoetryRecommendProps> = ({ visible, onClose, onSelect }) => {
  const { state } = useApp();
  const [scene, setScene] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
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
      setResult(response.data);
    } else {
      setError(response.error || '查询失败');
    }
  };

  const handleSelect = () => {
    if (result) {
      onSelect(result);
      onClose();
    }
  };

  const handleClose = () => {
    setScene('');
    setResult('');
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
            ) : result ? (
              <ScrollView style={styles.resultContainer}>
                <Text style={styles.resultText}>{result}</Text>
                <TouchableOpacity style={styles.insertButton} onPress={handleSelect}>
                  <Text style={styles.insertButtonText}>插入诗词</Text>
                </TouchableOpacity>
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
  resultContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  insertButton: {
    backgroundColor: Colors.vermillion,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  insertButtonText: {
    color: Colors.textOnVermillion,
    fontSize: 15,
    fontWeight: '600',
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
