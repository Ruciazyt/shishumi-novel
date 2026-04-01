import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { AIAssistant } from '../components/AIAssistant';
import { Colors } from '../constants/colors';
import { DYNASTIES, getDynastyById, DYNASTY_WRITING_TIPS, DYNASTY_PLACEHOLDERS } from '../data/dynasties';
import { updateChapter } from '../services/storage';
import { formatLastSaved } from '../utils/time';
import { countChars } from '../utils/text';

import { RootStackParamList, AIAssistantType } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditorScreenRouteProp = RouteProp<RootStackParamList, 'Editor'>;

export const EditorScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditorScreenRouteProp>();
  const { state, dispatch } = useApp();
  const { chapterId } = route.params;

  const project = state.currentProject;
  const chapter = project?.chapters.find(c => c.id === chapterId);

  const [content, setContent] = useState(chapter?.content || '');
  const [aiVisible, setAiVisible] = useState(false);
  const [aiType, setAiType] = useState<AIAssistantType>('polish');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [writingTipVisible, setWritingTipVisible] = useState(false);

  // Undo/Redo 历史记录
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 用于防抖自动保存 - 用 ref 记录上次保存的内容，避免依赖数组陷阱
  const lastSavedContentRef = useRef<string>('');
  const pendingContentRef = useRef<string>('');
  const projectRef = useRef(project);
  const chapterRef = useRef(chapter);
  pendingContentRef.current = content;
  projectRef.current = project;
  chapterRef.current = chapter;

  // 用于撤销/重做的稳定引用，避免 stale closure
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  // 防抖历史记录 timer ref
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 记录上一次推入历史的文本，避免重复记录相同内容
  const lastRecordedRef = useRef<string>('');

  // 清除历史记录防抖 timer
  const clearHistoryTimer = () => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }
  };

  // 初始化历史记录
  useEffect(() => {
    if (chapter) {
      const initial = chapter.content;
      setContent(initial);
      lastSavedContentRef.current = initial;
      pendingContentRef.current = initial;
      lastRecordedRef.current = initial;
      setHistory([initial]);
      setHistoryIndex(0);
      historyRef.current = [initial];
      historyIndexRef.current = 0;
      setHasUnsavedChanges(false);
      // 从章节的 updatedAt 初始化最后保存时间
      if (chapter.updatedAt) {
        setLastSavedAt(new Date(chapter.updatedAt));
      }
    }
    clearHistoryTimer(); // 切换章节时清除旧历史 timer
    return () => clearHistoryTimer();
  }, [chapter?.id]);

  // 记录历史（防抖 500ms）
  const recordHistory = useCallback((text: string) => {
    // 内容无变化则跳过
    if (text === lastRecordedRef.current) return;
    clearHistoryTimer();
    historyTimerRef.current = setTimeout(() => {
      lastRecordedRef.current = text;
      setHistory(prev => [...prev.slice(0, historyIndexRef.current + 1), text].slice(-20));
      setHistoryIndex(prev => Math.min(prev + 1, 19));
      historyIndexRef.current = Math.min(historyIndexRef.current + 1, 19);
    }, 500);
  }, []); // 空依赖，靠 ref 访问最新 state

  // 撤销
  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    const newIndex = idx - 1;
    const newContent = historyRef.current[newIndex];
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    setContent(newContent);
    pendingContentRef.current = newContent;
  }, []);

  // 重做
  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    const hist = historyRef.current;
    if (idx >= hist.length - 1) return;
    const newIndex = idx + 1;
    const newContent = hist[newIndex];
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    setContent(newContent);
    pendingContentRef.current = newContent;
  }, []);

  // 用户输入时记录历史（防抖）
  const handleContentChange = (text: string) => {
    setContent(text);
    pendingContentRef.current = text;
    recordHistory(text);
  };

  // 10秒防抖自动保存：timer 只在 mount 时创建，不依赖 content
  // content 变化只更新 ref，不重启 timer
  useEffect(() => {
    const timer = setTimeout(async () => {
      const latestContent = pendingContentRef.current;
      const currentChapter = chapterRef.current;
      const currentProject = projectRef.current;
      if (!currentProject || !currentChapter) return;
      if (latestContent === lastSavedContentRef.current) return; // 无变化则跳过
      setIsSaving(true);
      const updated = await updateChapter(currentProject.id, currentChapter.id, { content: latestContent });
      if (updated) {
        lastSavedContentRef.current = latestContent;
        const updatedProject = {
          ...currentProject,
          chapters: currentProject.chapters.map(c =>
            c.id === currentChapter.id ? updated : c
          ),
        };
        dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
        setJustSaved(true);
      }
      setIsSaving(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [chapterId]); // chapterId 变化时重置 timer，防止切章节后旧 timer 仍触发

  // 自动保存成功后短暂显示"已保存"提示
  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const handleAIPress = (type: AIAssistantType) => {
    setAiType(type);
    setAiVisible(true);
  };

  useEffect(() => {
    if (chapter) {
      if (content !== chapter.content) {
        setHasUnsavedChanges(true);
      } else {
        setHasUnsavedChanges(false);
      }
    }
  }, [content, chapter?.content]);

  const handleSave = async () => {
    if (!project || !chapter) return;
    setIsSaving(true);
    const updated = await updateChapter(project.id, chapter.id, { content });
    if (updated) {
      lastSavedContentRef.current = content;
      const updatedProject = {
        ...project,
        chapters: project.chapters.map(c =>
          c.id === chapter.id ? updated : c
        ),
      };
      dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
      setJustSaved(true);
      // 更新历史记录为已保存状态
      setHistory(prev => {
        const newHistory = [...prev.slice(0, historyIndexRef.current + 1)];
        newHistory[newHistory.length - 1] = updated.content;
        return newHistory;
      });
    }
    setIsSaving(false);
  };

  const handleBack = async () => {
    if (hasUnsavedChanges) {
      await handleSave();
    }
    navigation.goBack();
  };

  const handleInsertContent = (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    // 去除内容末尾的换行，避免与前缀的 \n\n 重复积累产生多余空行
    const baseContent = content.replace(/\n+$/, '');
    const prefix = baseContent ? '\n\n' : '';
    const newContent = baseContent + prefix + trimmedText;
    setContent(newContent);
    pendingContentRef.current = newContent;
    recordHistory(newContent);
  };

  if (!project || !chapter) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>章节不存在</Text>
      </View>
    );
  }

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 统计字数
  const charCount = countChars(content);
  const trimmed = content.trim();
  const wordCount = trimmed
    ? trimmed.split(/\s+/).length
    : 0;

  // 简短占位符（用于 TextInput placeholder）
  const dynastyPlaceholder = React.useMemo(() => {
    const dynastyData = project?.dynasty
      ? DYNASTIES.find(d => d.id === project.dynasty || d.name === project.dynasty)
      : getDynastyById(state.dynasty);
    if (!dynastyData) return '开始写作...';
    return DYNASTY_PLACEHOLDERS[dynastyData.name] || '开始写作...';
  }, [project?.dynasty, state.dynasty]);

  // 完整写作提示（用于弹窗）
  const dynastyWritingTip = React.useMemo(() => {
    const dynastyData = project?.dynasty
      ? DYNASTIES.find(d => d.id === project.dynasty || d.name === project.dynasty)
      : getDynastyById(state.dynasty);
    if (!dynastyData) return '';
    return DYNASTY_WRITING_TIPS[dynastyData.name] || '';
  }, [project?.dynasty, state.dynasty]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {chapter.title}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={undo} disabled={!canUndo} style={[styles.undoRedoBtn, !canUndo && styles.undoRedoBtnDisabled]}
            accessibilityLabel="撤销" accessibilityRole="button">
            <Text style={[styles.undoRedoText, !canUndo && styles.undoRedoTextDisabled]}>↩</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={redo} disabled={!canRedo} style={[styles.undoRedoBtn, !canRedo && styles.undoRedoBtnDisabled]}
            accessibilityLabel="重做" accessibilityRole="button">
            <Text style={[styles.undoRedoText, !canRedo && styles.undoRedoTextDisabled]}>↪</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWritingTipVisible(true)}
            style={styles.tipBtn}
            accessibilityLabel="写作提示" accessibilityRole="button">
            <Text style={styles.tipBtnText}>📜</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}
            accessibilityLabel="保存" accessibilityRole="button">
            <Text style={[styles.saveButton, (!hasUnsavedChanges || isSaving) && styles.saveButtonDisabled]}>
              {isSaving ? '保存中' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 字数统计栏 */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {charCount} 字{wordCount > 0 ? ` / ${wordCount} 词` : ''}
          {lastSavedAt ? ` · ${formatLastSaved(lastSavedAt)}` : ''}
        </Text>
        {isSaving ? (
          <Text style={styles.savingIndicator}>● 保存中</Text>
        ) : justSaved ? (
          <Text style={styles.savedIndicator}>✓ 已保存</Text>
        ) : hasUnsavedChanges ? (
          <Text style={styles.unsavedIndicator}>● 未保存</Text>
        ) : null}
      </View>

      <ScrollView style={styles.editorContainer}>
        <TextInput
          style={styles.editor}
          placeholder={dynastyPlaceholder}
          placeholderTextColor={Colors.textLight}
          value={content}
          onChangeText={handleContentChange}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolButton, aiVisible && aiType === 'polish' && styles.toolButtonActive]}
          onPress={() => handleAIPress('polish')}
          accessibilityLabel="润色当前文本" accessibilityRole="button"
        >
          <Text style={[styles.toolButtonText, aiVisible && aiType === 'polish' && styles.toolButtonTextActive]}>润色</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiVisible && aiType === 'historical' && styles.toolButtonActive]}
          onPress={() => handleAIPress('historical')}
          accessibilityLabel="添加历史细节" accessibilityRole="button"
        >
          <Text style={[styles.toolButtonText, aiVisible && aiType === 'historical' && styles.toolButtonTextActive]}>历史细节</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiVisible && aiType === 'poetry' && styles.toolButtonActive]}
          onPress={() => handleAIPress('poetry')}
          accessibilityLabel="推荐相关诗词" accessibilityRole="button"
        >
          <Text style={[styles.toolButtonText, aiVisible && aiType === 'poetry' && styles.toolButtonTextActive]}>诗词</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiVisible && aiType === 'buddhist' && styles.toolButtonActive]}
          onPress={() => handleAIPress('buddhist')}
          accessibilityLabel="推荐佛教经典引用" accessibilityRole="button"
        >
          <Text style={[styles.toolButtonText, aiVisible && aiType === 'buddhist' && styles.toolButtonTextActive]}>佛教</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, aiVisible && aiType === 'taoist' && styles.toolButtonActive]}
          onPress={() => handleAIPress('taoist')}
          accessibilityLabel="推荐道家经典引用" accessibilityRole="button"
        >
          <Text style={[styles.toolButtonText, aiVisible && aiType === 'taoist' && styles.toolButtonTextActive]}>道家</Text>
        </TouchableOpacity>
      </View>

      <AIAssistant
        visible={aiVisible}
        onClose={() => setAiVisible(false)}
        onInsertText={handleInsertContent}
        initialType={aiType}
      />

      {/* 写作提示弹窗 */}
      <Modal visible={writingTipVisible} animationType="slide" transparent>
        <View style={styles.tipModalOverlay}>
          <TouchableOpacity
            style={styles.tipModalBackdrop}
            activeOpacity={1}
            onPress={() => setWritingTipVisible(false)}
          />
          <View style={styles.tipModalContent}>
            <View style={styles.tipModalHeader}>
              <Text style={styles.tipModalTitle}>📜 写作提示</Text>
              <TouchableOpacity onPress={() => setWritingTipVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.tipModalScroll}>
              <Text style={styles.tipModalText}>{dynastyWritingTip}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    fontSize: 16,
    color: Colors.vermillion,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoRedoBtn: {
    padding: 4,
  },
  undoRedoBtnDisabled: {
    padding: 4,
    backgroundColor: Colors.paperDark,
    borderRadius: 4,
  },
  undoRedoText: {
    fontSize: 18,
    color: Colors.vermillion,
  },
  undoRedoTextDisabled: {
    opacity: 0.35,
  },
  tipBtn: {
    padding: 4,
  },
  tipBtnText: {
    fontSize: 18,
  },
  saveButton: {
    fontSize: 16,
    color: Colors.vermillion,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.35,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.paperDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statsText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  savingIndicator: {
    fontSize: 12,
    color: Colors.vermillion,
  },
  unsavedIndicator: {
    fontSize: 12,
    color: Colors.warning,
  },
  savedIndicator: {
    fontSize: 12,
    color: Colors.success,
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  editor: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 28,
    minHeight: 400,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: Colors.backgroundCard,
    gap: 4,
  },
  toolButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: Colors.paperDark,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toolButtonActive: {
    backgroundColor: Colors.vermillion,
    borderColor: Colors.vermillion,
  },
  toolButtonText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  toolButtonTextActive: {
    color: Colors.textOnVermillion,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 60,
  },
  // 写作提示弹窗样式
  tipModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tipModalBackdrop: {
    flex: 1,
  },
  tipModalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  tipModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tipModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    fontSize: 20,
    color: Colors.textSecondary,
    padding: 4,
  },
  tipModalScroll: {
    padding: 20,
  },
  tipModalText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
});
