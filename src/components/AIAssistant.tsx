import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../constants/colors';
import { callAI } from '../services/api';
import { useApp } from '../context/AppContext';
import { DYNASTIES } from '../data/dynasties';
import { AIAssistantType } from '../types';

interface AIAssistantProps {
  visible: boolean;
  onClose: () => void;
  onInsertText?: (text: string) => void;
  initialType?: AIAssistantType;
}


export const AIAssistant: React.FC<AIAssistantProps> = ({ visible, onClose, onInsertText, initialType }) => {
  const [aiType, setAiType] = useState<AIAssistantType>(initialType || 'polish');
  const [inputText, setInputText] = useState('');
  const [sceneText, setSceneText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loadingHint, setLoadingHint] = useState('');
  const [copied, setCopied] = useState(false);

  // Timeout warning timer ref
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 当 visible 变为 true 时，根据 initialType 更新 aiType
  useEffect(() => {
    if (visible && initialType) {
      setAiType(initialType);
    }
  }, [visible, initialType]);

  // 清除所有定时器
  const clearHintTimer = () => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  };

  // 重置状态
  const resetState = () => {
    clearHintTimer();
    setInputText('');
    setSceneText('');
    setResult('');
    setError('');
    setLoadingHint('');
    setCopied(false);
  };

  // visible 关闭时重置
  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [visible]);

  // 开始加载时启动超时提示
  useEffect(() => {
    if (loading) {
      setLoadingHint('');
      hintTimerRef.current = setTimeout(() => {
        setLoadingHint('模型响应较慢，请稍候...');
      }, 20000);
    } else {
      clearHintTimer();
      setLoadingHint('');
    }
    return clearHintTimer;
  }, [loading]);

  // 切换类型时清除无关输入，防止旧内容残留造成困惑
  useEffect(() => {
    if (aiType === 'poetry' || aiType === 'buddhist' || aiType === 'taoist') {
      setInputText('');
    } else {
      setSceneText('');
    }
  }, [aiType]);

  const { state } = useApp();

  const handleSubmit = async () => {
    if (aiType === 'poetry' || aiType === 'buddhist' || aiType === 'taoist') {
      if (!sceneText.trim()) {
        setError('请输入场景描述');
        return;
      }
    } else {
      if (!inputText.trim()) {
        setError('请输入文本内容');
        return;
      }
    }

    setLoading(true);
    setError('');
    setResult('');
    setCopied(false);

    const response = await callAI({
      type: aiType,
      text: inputText,
      dynasty: state.dynasty,
      scene: (aiType === "poetry" || aiType === "buddhist" || aiType === "taoist") ? sceneText : inputText,
    });

    setLoading(false);
    if (response.success && response.data) {
      setResult(response.data);
    } else {
      setError(response.error || '调用失败');
    }
  };

  const handleInsert = () => {
    if (result && onInsertText) {
      onInsertText(result);
      onClose();
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
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
            <Text style={styles.headerTitle}>AI 助手</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, aiType === 'polish' && styles.typeButtonActive]}
                onPress={() => setAiType('polish')}
              >
                <Text style={[styles.typeButtonText, aiType === 'polish' && styles.typeButtonTextActive]}>
                  润色
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, aiType === 'historical' && styles.typeButtonActive]}
                onPress={() => setAiType('historical')}
              >
                <Text style={[styles.typeButtonText, aiType === 'historical' && styles.typeButtonTextActive]}>
                  历史还原
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, aiType === 'poetry' && styles.typeButtonActive]}
                onPress={() => setAiType('poetry')}
              >
                <Text style={[styles.typeButtonText, aiType === 'poetry' && styles.typeButtonTextActive]}>
                  诗词推荐
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, aiType === 'buddhist' && styles.typeButtonActive]}
                onPress={() => setAiType('buddhist')}
              >
                <Text style={[styles.typeButtonText, aiType === 'buddhist' && styles.typeButtonTextActive]}>
                  佛教引用
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, aiType === 'taoist' && styles.typeButtonActive]}
                onPress={() => setAiType('taoist')}
              >
                <Text style={[styles.typeButtonText, aiType === 'taoist' && styles.typeButtonTextActive]}>
                  道家引用
                </Text>
              </TouchableOpacity>
            </View>

            {aiType === 'poetry' || aiType === 'buddhist' || aiType === 'taoist' ? (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>场景描述</Text>
                <TextInput
                  style={styles.sceneInput}
                  placeholder="请描述当前场景..."
                  placeholderTextColor={Colors.textLight}
                  value={sceneText}
                  onChangeText={setSceneText}
                  multiline
                />
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {aiType === 'historical' ? `时代背景：${DYNASTIES.find(d => d.id === state.dynasty || d.name === state.dynasty)?.name || state.dynasty}` : '输入文本'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="请输入要处理的内容..."
                  placeholderTextColor={Colors.textLight}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                />
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.vermillion} />
                <Text style={styles.loadingText}>AI 思考中...</Text>
                {loadingHint ? (
                  <Text style={styles.loadingHint}>{loadingHint}</Text>
                ) : null}
              </View>
            ) : result ? (
              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>AI 返回结果</Text>
                <Text style={styles.resultText}>{result}</Text>
                <View style={styles.resultActions}>
                  <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                    <Text style={[styles.copyButtonText, copied && styles.copyButtonTextCopied]}>
                      {copyButtonText}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.insertButton} onPress={handleInsert}>
                    <Text style={styles.insertButtonText}>插入文本</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>提交</Text>
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
    maxHeight: '85%',
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
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeButtonActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  typeButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.textOnVermillion,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
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
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
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
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
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
  submitButton: {
    backgroundColor: Colors.vermillion,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.textOnVermillion,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
