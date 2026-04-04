import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors, Spacing, BorderRadius, FontSize, ColorsAlpha } from '../constants/colors';
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
  // useApp() 必须放在所有 useState/useRef 之前，但在 props 解构之后
  const { state } = useApp();

  const [aiType, setAiType] = useState<AIAssistantType>(initialType || 'polish');
  const [inputText, setInputText] = useState('');
  const [sceneText, setSceneText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loadingHint, setLoadingHint] = useState('');
  const [copied, setCopied] = useState(false);
  // 插入确认状态：点击"插入文本"后短暂显示"已插入"提示，再关闭 modal
  const [inserted, setInserted] = useState(false);

  // Timeout warning timer ref
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 防止组件卸载后仍更新 state（仅在组件真正卸载时设为 false）
  const isMountedRef = useRef(true);
  // 始终读取最新的 aiType，避免 handleSubmit 因频繁变化的值而不必要地 re-create
  const aiTypeRef = useRef<AIAssistantType>(initialType || 'polish');
  // 追踪当前是否处于有效请求周期：modal 关闭时应拒绝响应
  const requestActiveRef = useRef(false);
  // 追踪当前请求是否已被用户取消
  const cancelledRef = useRef(false);
  // AbortController ref：支持取消进行中的 HTTP 请求，避免响应 race
  const abortControllerRef = useRef<AbortController | null>(null);

  // 始终读取最新的 inputText/sceneText，避免 handleSubmit 中的 stale closure
  const inputTextRef = useRef('');
  const sceneTextRef = useRef('');
  inputTextRef.current = inputText;
  sceneTextRef.current = sceneText;
  // dynastyRef: 保证 handleSubmit（[]依赖）始终读取最新朝代
  const dynastyRef = useRef(state.dynasty);
  dynastyRef.current = state.dynasty;

  // 当 initialType 变化时同步 aiType（modal 关闭/重新打开时也生效）
  useEffect(() => {
    if (initialType) {
      setAiType(initialType);
    }
  }, [initialType]);

  // 清除 hint 定时器（稳定引用，供 useCallback 依赖使用）
  const clearHintTimer = useCallback(() => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }, []);

  // 重置状态（useCallback 避免 useEffect 中不必要的依赖触发）
  const resetState = useCallback(() => {
    clearHintTimer();
    setInputText('');
    setSceneText('');
    setResult('');
    setError('');
    setLoadingHint('');
    setCopied(false);
    cancelledRef.current = false;
  }, [clearHintTimer]);

  /** 清空输入框（保留结果区域） */
  const handleClearInput = useCallback(() => {
    if (aiType === 'poetry' || aiType === 'buddhist' || aiType === 'taoist') {
      setSceneText('');
    } else {
      setInputText('');
    }
  }, [aiType]);

  // visible 关闭时重置（但保持 isMountedRef = true，因为组件未卸载）
  // 只有组件真正卸载时 isMountedRef 才变为 false
  useEffect(() => {
    if (!visible) {
      requestActiveRef.current = false;
      cancelledRef.current = false;
      resetState();
    }
  }, [visible, resetState]);

  // 组件卸载时标记
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 同步 aiTypeRef 到当前选中的 aiType（用户切换类型标签页后也能正确提交）
  useLayoutEffect(() => {
    aiTypeRef.current = aiType;
  }, [aiType]);

  // 开始加载时启动超时提示
  useEffect(() => {
    if (loading) {
      setLoadingHint('');
      hintTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && requestActiveRef.current) {
          setLoadingHint('模型响应较慢，请稍候...');
        }
      }, 5000);
    } else {
      clearHintTimer();
      if (isMountedRef.current) {
        setLoadingHint('');
      }
    }
    return () => clearHintTimer();
  }, [loading]);

  // 切换类型时清除无关输入，防止旧内容残留
  // 同时重置请求状态，防止旧请求结果在切换后仍显示
  useEffect(() => {
    if (aiType === 'poetry' || aiType === 'buddhist' || aiType === 'taoist') {
      setInputText('');
    } else {
      setSceneText('');
    }
    requestActiveRef.current = false;
  }, [aiType]);

  const dynastyDisplayName = useMemo(
    () => DYNASTIES.find(d => d.id === state.dynasty || d.name === state.dynasty)?.name || state.dynasty,
    [state.dynasty]
  );

  const canSubmit = !loading && (
    (aiType === 'poetry' || aiType === 'buddhist' || aiType === 'taoist')
      ? sceneText.trim().length > 0
      : inputText.trim().length > 0
  );

  const handleSubmit = useCallback(async () => {
    // inputText/sceneText 从 ref 读取（避免频繁 re-create）
    // aiType 从 ref 读取（initialType 同步后不常变化）
    // dynasty 直接从 state 读取（modal 生命周期内稳定）
    const currentInputText = inputTextRef.current;
    const currentSceneText = sceneTextRef.current;
    const currentAiType = aiTypeRef.current;
    const currentDynasty = dynastyRef.current;

    const isSceneType = currentAiType === 'poetry' || currentAiType === 'buddhist' || currentAiType === 'taoist';

    if (isSceneType) {
      if (!currentSceneText.trim()) {
        setError('请输入场景描述');
        return;
      }
    } else {
      if (!currentInputText.trim()) {
        setError('请输入文本内容');
        return;
      }
    }

    // 中止上一请求（如果存在）
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    Keyboard.dismiss();
    setLoading(true);
    setError('');
    setResult('');
    setCopied(false);
    cancelledRef.current = false;
    // 标记当前请求处于活跃状态，modal 关闭后此标记为 false 可阻断旧响应
    requestActiveRef.current = true;

    const response = await callAI({
      type: currentAiType,
      text: currentInputText,
      dynasty: currentDynasty,
      scene: isSceneType ? currentSceneText : undefined,
    }, 1, controller.signal);

    // 只有在组件仍挂载且当前请求未被 modal 关闭阻断时才更新状态
    // cancelledRef 也会阻断响应处理
    if (!isMountedRef.current || !requestActiveRef.current || cancelledRef.current) return;
    setLoading(false);
    if (response.success && response.data) {
      setResult(response.data);
    } else {
      setError(response.error || '调用失败');
    }
  }, []); // 无外部依赖：inputText/sceneText/aiType 从 ref 读取（由各 setXxx 同步），dynasty 直接读 state

  // 取消当前请求：标记为已取消，loading 立即重置，阻断响应处理
  // 直接操作 hintTimerRef 而非调用 clearHintTimer，避免 handleCancel 每次渲染重建
  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    requestActiveRef.current = false;
    setLoading(false);
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    setLoadingHint('');
    // 真正中止进行中的 HTTP 请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const handleInsert = () => {
    if (!result || !onInsertText) return;
    setInserted(true);
    onInsertText(result);
    // 延迟关闭 modal，让用户看到"已插入"提示
    setTimeout(() => {
      if (isMountedRef.current) onClose();
    }, 1200);
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
    Keyboard.dismiss();
    requestActiveRef.current = false;
    cancelledRef.current = true; // 取消任何进行中的请求
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

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, aiType === 'polish' && styles.typeButtonActive]}
                onPress={() => { Keyboard.dismiss(); setAiType('polish'); }}
              >
                <Text style={[styles.typeButtonText, aiType === 'polish' && styles.typeButtonTextActive]}>
                  润色
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, aiType === 'historical' && styles.typeButtonActive]}
                onPress={() => { Keyboard.dismiss(); setAiType('historical'); }}
              >
                <Text style={[styles.typeButtonText, aiType === 'historical' && styles.typeButtonTextActive]}>
                  历史细节
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, aiType === 'poetry' && styles.typeButtonActive]}
                onPress={() => { Keyboard.dismiss(); setAiType('poetry'); }}
              >
                <Text style={[styles.typeButtonText, aiType === 'poetry' && styles.typeButtonTextActive]}>
                  诗词
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, aiType === 'buddhist' && styles.typeButtonActive]}
                onPress={() => { Keyboard.dismiss(); setAiType('buddhist'); }}
              >
                <Text style={[styles.typeButtonText, aiType === 'buddhist' && styles.typeButtonTextActive]}>
                  佛教
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, aiType === 'taoist' && styles.typeButtonActive]}
                onPress={() => { Keyboard.dismiss(); setAiType('taoist'); }}
              >
                <Text style={[styles.typeButtonText, aiType === 'taoist' && styles.typeButtonTextActive]}>
                  道家
                </Text>
              </TouchableOpacity>
            </View>

            {/* 收起键盘按钮 */}
            <TouchableOpacity
              style={styles.keyboardDismiss}
              onPress={Keyboard.dismiss}
              accessibilityLabel="收起键盘"
              accessibilityRole="button"
            >
              <Text style={styles.keyboardDismissText}>⌨️ 收起</Text>
            </TouchableOpacity>

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
                  autoFocus
                />
                <View style={styles.charCountRow}>
                  <Text style={styles.charCount}>{sceneText.length} 字</Text>
                  {sceneText.length > 0 && (
                    <TouchableOpacity onPress={handleClearInput} style={styles.clearInputBtn} accessibilityLabel="清空场景描述">
                      <Text style={styles.clearInputBtnText}>清空</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {aiType === 'historical' ? `时代背景：${dynastyDisplayName}` : '输入文本'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="请输入要处理的内容..."
                  placeholderTextColor={Colors.textLight}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  autoFocus
                />
                <View style={styles.charCountRow}>
                  <Text style={styles.charCount}>{inputText.length} 字</Text>
                  {inputText.length > 0 && (
                    <TouchableOpacity onPress={handleClearInput} style={styles.clearInputBtn} accessibilityLabel="清空输入文本">
                      <Text style={styles.clearInputBtnText}>清空</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <View style={styles.errorActions}>
                  <TouchableOpacity style={styles.resetButton} onPress={resetState}>
                    <Text style={styles.resetButtonText}>重新输入</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.retryButton} onPress={handleSubmit}>
                    <Text style={styles.retryButtonText}>重试</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.vermillion} />
                <Text style={styles.loadingText}>AI 思考中...</Text>
                {loadingHint ? (
                  <Text style={styles.loadingHint}>{loadingHint}</Text>
                ) : null}
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  accessibilityLabel="取消请求"
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelButtonText}>取消</Text>
                </TouchableOpacity>
              </View>
            ) : result ? (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultLabel}>AI 返回结果</Text>
                  <Text style={styles.resultCount}>{result.length} 字</Text>
                </View>
                <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.resultText}>{result}</Text>
                </ScrollView>
                <View style={styles.resultActions}>
                  {inserted ? (
                    <View style={styles.insertedConfirm}>
                      <Text style={styles.insertedConfirmText}>✓ 已插入 {result.length} 字</Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.resetButton} onPress={resetState}>
                        <Text style={styles.resetButtonText}>重新输入</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                        <Text style={[styles.copyButtonText, copied && styles.copyButtonTextCopied]}>
                          {copyButtonText}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.insertButton, !result && styles.insertButtonDisabled]}
                        onPress={handleInsert}
                        disabled={!result}
                      >
                        <Text style={[styles.insertButtonText, !result && styles.insertButtonTextDisabled]}>插入文本</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={[styles.submitButtonText, !canSubmit && styles.submitButtonTextDisabled]}>提交</Text>
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
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ColorsAlpha.goldBorder,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  closeButton: {
    fontSize: 20,
    color: Colors.textSecondary,
    padding: Spacing.xs,
  },
  keyboardDismiss: {
    alignSelf: 'flex-end',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  keyboardDismissText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  body: {
    padding: Spacing.lg,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  typeButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeButtonActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  typeButtonText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.textOnVermillion,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  sceneInput: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  clearInputBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.paperDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearInputBtnText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  errorContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
    marginBottom: Spacing.md,
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  retryButton: {
    backgroundColor: Colors.vermillion,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.textOnVermillion,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  loadingHint: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.warning,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  cancelButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.paperDark,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: ColorsAlpha.goldBorder,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  resultLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  resultCount: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  resultScroll: {
    maxHeight: 400,
  },
  resultText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  resultActions: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  resetButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.paperDark,
  },
  resetButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  copyButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.paperDark,
  },
  copyButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  copyButtonTextCopied: {
    color: Colors.success,
  },
  insertButton: {
    backgroundColor: Colors.vermillion,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  insertButtonDisabled: {
    opacity: 0.4,
  },
  insertButtonText: {
    color: Colors.textOnVermillion,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  insertButtonTextDisabled: {
    color: Colors.textLight,
  },
  submitButton: {
    backgroundColor: Colors.vermillion,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.textOnVermillion,
    fontSize: FontSize.md,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  submitButtonTextDisabled: {
    color: Colors.textLight,
  },
  // 插入确认提示
  insertedConfirm: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  insertedConfirmText: {
    fontSize: FontSize.md,
    color: Colors.success,
    fontWeight: '600',
  },
});
