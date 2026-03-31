import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
  const [loadingHint, setLoadingHint] = useState('');
  const [copied, setCopied] = useState(false);

  // Timeout warning timer ref
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 防止组件卸载后仍更新 state（仅在组件真正卸载时设为 false）
  const isMountedRef = useRef(true);
  // 追踪当前是否处于有效请求周期：modal 关闭时应拒绝响应
  const requestActiveRef = useRef(false);

  // 清除 hint 定时器
  const clearHintTimer = () => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  };

  // 重置状态
  const resetState = () => {
    clearHintTimer();
    setScene('');
    setResult('');
    setError('');
    setLoadingHint('');
    setCopied(false);
  };

  // visible 关闭时重置（但保持 isMountedRef = true，因为组件未卸载）
  useEffect(() => {
    if (!visible) {
      requestActiveRef.current = false;
      resetState();
    }
  }, [visible]);

  // 组件卸载时标记
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 开始加载时启动超时提示
  useEffect(() => {
    if (loading) {
      setLoadingHint('');
      hintTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && requestActiveRef.current) {
          setLoadingHint('模型响应较慢，请稍候...');
        }
      }, 25000);
    } else {
      clearHintTimer();
      if (isMountedRef.current) {
        setLoadingHint('');
      }
    }
    return clearHintTimer;
  }, [loading]);

  const handleSearch = async () => {
    if (!scene.trim()) {
      setError('请输入场景描述');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');
    requestActiveRef.current = true;

    const response = await callAI({
      type: 'poetry',
      scene: scene,
      dynasty: state.dynasty,
    });

    // 只有在组件仍挂载且当前请求未被 modal 关闭阻断时才更新状态
    if (!isMountedRef.current || !requestActiveRef.current) return;
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

  const handleCopy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    setCopied(true);
    setTimeout(() => {
      if (isMountedRef.current) setCopied(false);
    }, 2000);
  };

  const handleClose = () => {
    requestActiveRef.current = false;
    resetState();
    onClose();
  };

  // 复制按钮文字（显示 2 秒后恢复）
  const copyButtonText = copied ? '已复制' : '复制';

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

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
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
                <ActivityIndicator size="large" color={Colors.vermillion} />
                <Text style={styles.loadingText}>正在搜索...</Text>
                {loadingHint ? (
                  <Text style={styles.loadingHint}>{loadingHint}</Text>
                ) : null}
              </View>
            ) : result ? (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultLabel}>推荐结果</Text>
                  <Text style={styles.resultCount}>{result.length} 字</Text>
                </View>
                <Text style={styles.resultText}>{result}</Text>
                <View style={styles.resultActions}>
                  <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                    <Text style={[styles.copyButtonText, copied && styles.copyButtonTextCopied]}>
                      {copyButtonText}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.insertButton} onPress={handleSelect}>
                    <Text style={styles.insertButtonText}>插入诗词</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.searchButton, loading && styles.searchButtonDisabled]}
                onPress={handleSearch}
                disabled={loading}
              >
                <Text style={[styles.searchButtonText, loading && styles.searchButtonTextDisabled]}>搜索诗词</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
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
    marginTop: 12,
  },
  loadingHint: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.warning,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  resultContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  resultCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  resultText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  resultActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.paperDark,
  },
  copyButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  copyButtonTextCopied: {
    color: Colors.success,
  },
  insertButton: {
    backgroundColor: Colors.vermillion,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
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
  searchButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  searchButtonTextDisabled: {
    color: Colors.backgroundCard,
  },
});
